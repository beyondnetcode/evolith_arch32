/**
 * GT-592 — Recorder for the retrieval-eval fixtures.
 *
 * NOT a CI script. This is the infrastructure-bound half of the eval: it needs a
 * live embedding sidecar (GT-539 · ADR-0112 §4) and, optionally, a live pgvector
 * instance. It runs on a workstation or a provisioned environment, and what it
 * produces — a frozen corpus, the real model's dense ranking over it, and the
 * thresholds measured from that ranking — is what `rag-eval.mjs` replays in CI.
 *
 * The split exists because of an honesty constraint. The dense baseline has to
 * be the REAL model; substituting the deterministic `hashEmbed` fallback would
 * make hybrid win against a cartoon and the comparison would mean nothing. But a
 * CI runner cannot host a 0.6B-parameter model. Recording the real model's
 * output once, fingerprinting the corpus it was recorded against, and refusing
 * to compare when the fingerprint moves, gives CI a real baseline without
 * pretending CI can compute one.
 *
 * ## One caveat, stated up front
 *
 * Queries are embedded as PLAIN TEXT, with no instruction prefix. Qwen3-Embedding
 * is trained to accept an "Instruct: … Query: …" prefix on the query side and
 * scores somewhat better with it, so this is not the strongest possible dense
 * baseline. It is deliberately the baseline THIS PRODUCT SHIPS: GT-539's
 * `rag-embed-qwen3.mjs` posts raw text, and GT-540's adapter embeds
 * `request.query` unmodified. Measuring against an optimally-prompted Qwen3 the
 * repository does not run would flatter neither side honestly. If the write side
 * ever adopts the prefix, this recorder must adopt it too and the baseline must
 * be re-recorded.
 *
 * What it writes into `.harness/fixtures/rag-eval/`:
 *   corpus.json.gz      — the chunked ADR corpus, frozen so the benchmark is stable
 *   dense-baseline.json — recorded dense top-K per query + corpus fingerprint +
 *                         the thresholds the CI gate compares against
 *
 * Usage:
 *   EVOLITH_RAG_EMBED_URL=http://localhost:8085 \
 *     node .harness/scripts/ci/rag-eval-record.mjs
 *
 * Flags:
 *   --corpus-only   re-chunk and re-freeze the corpus, skip embedding
 *   --keep-corpus   embed against the corpus already on disk (no re-chunk)
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { chunkMarkdown } from './rag-sync.mjs';
import { makeQwen3Embedder } from './rag-embed-qwen3.mjs';
import {
  FIXTURE_DIR,
  CORPUS_PATH,
  DENSE_PATH,
  loadCorpus,
  loadQueries,
  corpusFingerprint,
  evaluateRetriever,
  K,
} from './rag-eval.mjs';

/**
 * The eval corpus. The core ADR set: it is the corpus agents actually query by
 * identifier, it is large enough (1000+ chunks) that ranking is a real problem,
 * and it is one directory so its membership is not a judgement call.
 */
const CORPUS_DIR = 'reference/core/architecture/adrs/core';

/** Depth of dense ranking to record — enough to feed the hybrid dense pool. */
const RECORD_DEPTH = 50;

/** Batch size for sidecar calls. Small enough to stay well inside any body limit. */
const EMBED_BATCH = 16;

function buildCorpus() {
  const files = readdirSync(CORPUS_DIR)
    .filter((f) => f.endsWith('.md') && !f.endsWith('.es.md'))
    .sort();

  const chunks = [];
  for (const file of files) {
    const sourceFile = `${CORPUS_DIR}/${file}`;
    const raw = readFileSync(join(CORPUS_DIR, file), 'utf8');
    for (const c of chunkMarkdown(raw, sourceFile, 'rag-eval')) {
      // Normalize the write-side chunk shape into the KnowledgeChunk contract the
      // read-side adapters consume, so the eval seeds exactly what production reads.
      chunks.push({
        chunkId: c.chunk_id,
        sourceFile: c.source_file,
        sectionHeading: c.section_heading,
        adrId: c.adr_id ?? null,
        language: c.language,
        tokenEstimate: c.token_estimate,
        textPreview: c.text_preview,
        text: c.text,
        corpusVersion: c.corpus_version,
      });
    }
  }
  return { sourceDir: CORPUS_DIR, files: files.length, chunks };
}

async function embedAll(embedder, texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const vectors = await embedder.embed(batch);
    out.push(...vectors);
    process.stdout.write(`\r   embedding ${Math.min(i + EMBED_BATCH, texts.length)}/${texts.length}   `);
  }
  process.stdout.write('\n');
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  mkdirSync(FIXTURE_DIR, { recursive: true });

  let corpus;
  if (args.includes('--keep-corpus')) {
    corpus = loadCorpus();
    console.log(`📚 reusing frozen corpus: ${corpus.chunks.length} chunks`);
  } else {
    corpus = buildCorpus();
    writeFileSync(CORPUS_PATH, gzipSync(Buffer.from(JSON.stringify(corpus)), { level: 9 }));
    console.log(
      `📚 froze corpus: ${corpus.files} files → ${corpus.chunks.length} chunks ` +
        `(${(readFileSync(CORPUS_PATH).length / 1024).toFixed(0)} KB gzipped)`,
    );
  }

  if (args.includes('--corpus-only')) return;

  const { queries } = loadQueries();
  console.log(`❓ query set: ${queries.length} queries`);

  const embedder = makeQwen3Embedder();
  console.log(`🧠 embedder: ${embedder.modelId} @ dim ${embedder.dim}`);

  // Embed the corpus and the queries with the SAME model — that is what makes
  // the cosine comparable at all.
  console.log('   corpus…');
  const corpusVectors = await embedAll(
    embedder,
    corpus.chunks.map((c) => `${c.sectionHeading}\n${c.text}`),
  );
  console.log('   queries…');
  const queryVectors = await embedAll(embedder, queries.map((q) => q.query));

  // Rank with the SHIPPED adapter, so the recorded baseline is the output of
  // production code rather than of a cosine loop written for this script.
  const { VectorMemoryKnowledgeAdapter } = await import('@beyondnet/evolith-agent-runtime/adapters');
  const queryVectorByText = new Map(queries.map((q, i) => [q.query, queryVectors[i]]));
  const dense = new VectorMemoryKnowledgeAdapter({
    embed: async (text) => {
      const v = queryVectorByText.get(text);
      if (!v) throw new Error(`no recorded query vector for ${JSON.stringify(text)}`);
      return v;
    },
  });
  dense.seed(corpus.chunks.map((chunk, i) => ({ chunk, embedding: corpusVectors[i] })));

  const rankings = {};
  for (const q of queries) {
    const result = await dense.query({ query: q.query, maxResults: RECORD_DEPTH });
    rankings[q.query] = result.chunks.map((c) => ({ chunkId: c.chunkId, score: c.score }));
  }

  // Measure the thresholds from the run we just recorded, so the CI gate compares
  // against a measured value rather than a round number somebody picked.
  const chunksById = new Map(corpus.chunks.map((c) => [c.chunkId, c]));
  const goldChunkCounts = new Map();
  for (const chunk of corpus.chunks) {
    goldChunkCounts.set(chunk.sourceFile, (goldChunkCounts.get(chunk.sourceFile) ?? 0) + 1);
  }

  const { HybridKnowledgeAdapter, InMemoryLexicalIndexAdapter } = await import(
    '@beyondnet/evolith-agent-runtime/adapters'
  );
  const { ReplayDenseKnowledgePort } = await import('./rag-eval.mjs');
  const replay = new ReplayDenseKnowledgePort(rankings, chunksById);
  const lexical = new InMemoryLexicalIndexAdapter();
  lexical.seed(corpus.chunks);
  const hybrid = new HybridKnowledgeAdapter({ lexical, dense: replay });

  const hybridReport = await evaluateRetriever(
    'hybrid',
    async (query) => (await hybrid.query({ query, maxResults: K })).chunks,
    queries,
    goldChunkCounts,
  );

  const byGroup = {};
  for (const [group, stats] of Object.entries(hybridReport.byGroup)) {
    byGroup[group] = { ndcg10: stats.ndcg10, mrr10: stats.mrr10, success1: stats.success1 };
  }

  const baseline = {
    schemaVersion: '1.0',
    recordedAt: new Date().toISOString(),
    model: { id: embedder.modelId, dim: embedder.dim },
    corpusFingerprint: corpusFingerprint(corpus.chunks),
    recordDepth: RECORD_DEPTH,
    thresholds: {
      byGroup,
      // The identifier regimes are the claim GT-592 makes; the gate holds hybrid
      // to actually winning them, not merely to not regressing.
      hybridMustBeatDenseOn: ['identifier', 'identifier-in-context'],
    },
    rankings,
  };

  writeFileSync(DENSE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`💾 wrote ${DENSE_PATH}`);
  console.log(`   fingerprint ${baseline.corpusFingerprint.slice(0, 16)}…`);
}

main().catch((error) => {
  console.error(`[rag-eval-record] ${error.message}`);
  process.exitCode = 1;
});
