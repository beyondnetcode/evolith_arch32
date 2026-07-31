import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { PgLexicalIndexAdapter } from './pg-lexical-index.adapter';
import { InMemoryLexicalIndexAdapter } from './in-memory-lexical-index.adapter';
import { HybridKnowledgeAdapter } from './hybrid-knowledge.adapter';
import { tokenize } from '../../domain/retrieval/tokenize';
import type { KnowledgeChunk } from '../../domain/ports/knowledge.port';

/**
 * GT-592 — live Postgres/pgvector integration for the lexical index.
 *
 * INFRASTRUCTURE-GATED. Skipped unless `EVOLITH_RAG_TEST_PG_URL` points at a
 * pgvector database, because the assertions here are precisely the ones a fake
 * client cannot make: that PostgreSQL's `simple` parser and the domain tokenizer
 * produce the SAME term set. That agreement is load-bearing — document
 * frequencies come from SQL while term frequencies are counted in TypeScript, so
 * if the two tokenizations diverged, IDF would describe terms BM25 never scores
 * and every ranking would be quietly wrong. An injected fake client would let
 * that divergence pass, which is why this test insists on the real parser.
 *
 * Run it with:
 *   docker run -d --name pg -e POSTGRES_PASSWORD=x -p 5432:5432 pgvector/pgvector:pg16
 *   EVOLITH_RAG_TEST_PG_URL=postgres://postgres:x@localhost:5432/postgres \
 *     npx jest pg-lexical-index.adapter.integration
 */

const PG_URL = process.env.EVOLITH_RAG_TEST_PG_URL;
const describeIfPg = PG_URL ? describe : describe.skip;

const SCHEMA_PATH = resolve(
  __dirname,
  '../../../../../../.harness/scripts/ci/rag-pgvector.schema.sql',
);

const CORPUS: KnowledgeChunk[] = [
  {
    chunkId: 'k1',
    sourceFile: 'reference/adrs/0111-port-seam.md',
    sectionHeading: 'ADR-0111: Port Seam',
    adrId: '0111',
    language: 'en',
    tokenEstimate: 20,
    textPreview: '',
    text: 'ADR-0111 defines the port seam. SCHEMA_VERSION is pinned here, see kind-evaluators.ts.',
  },
  {
    chunkId: 'k2',
    sourceFile: 'reference/adrs/0112-embeddings.md',
    sectionHeading: 'ADR-0112: Embeddings',
    adrId: '0112',
    language: 'en',
    tokenEstimate: 20,
    textPreview: '',
    text: 'ADR-0112 pins the embedding model at dimension 1024 under reference/core.',
  },
  {
    chunkId: 'k3',
    sourceFile: 'reference/adrs/0090-knowledge.md',
    sectionHeading: 'ADR-0090: Knowledge',
    adrId: '0090',
    language: 'en',
    tokenEstimate: 20,
    textPreview: '',
    text: 'Governed corpus access. Mentions ADR-0111 and ADR-0112 only in passing.',
  },
  {
    chunkId: 'k4',
    sourceFile: 'reference/guides/caching.md',
    sectionHeading: 'Caching',
    adrId: null,
    language: 'en',
    tokenEstimate: 20,
    textPreview: '',
    text: 'Multi-layer distributed memoisation across the request path, with EVD-01 evidence.',
  },
];

describeIfPg('PgLexicalIndexAdapter against live pgvector (GT-592)', () => {
  let pool: any;
  let adapter: PgLexicalIndexAdapter;

  beforeAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pg = require('pg');
    const Pool = pg.Pool;
    pool = new Pool({ connectionString: PG_URL });

    await pool.query('DROP TABLE IF EXISTS rag_chunks');
    await pool.query(readFileSync(SCHEMA_PATH, 'utf8'));

    const zero = `[${new Array(1024).fill(0).join(',')}]`;
    for (const c of CORPUS) {
      await pool.query(
        `INSERT INTO rag_chunks (id, content, section_heading, char_start, char_end, source_file, adr_id, language, corpus_version, embedding)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::vector)`,
        [c.chunkId, c.text, c.sectionHeading, 0, c.text.length, c.sourceFile, c.adrId, c.language, 'test', zero],
      );
    }
    adapter = new PgLexicalIndexAdapter({ client: pool, corpusVersion: 'test' });
  }, 60000);

  afterAll(async () => {
    await pool?.end();
  });

  it("PostgreSQL's tsvector contains every term the domain tokenizer emits", async () => {
    // The parity assertion this whole file exists for.
    for (const c of CORPUS) {
      const indexed = `${c.sectionHeading} ${c.text}`;
      const { rows } = await pool.query(
        'SELECT content_tsv::text AS tsv FROM rag_chunks WHERE id = $1',
        [c.chunkId],
      );
      const lexemes = new Set(
        String(rows[0].tsv)
          .split(' ')
          .map((entry: string) => entry.split(':')[0].replace(/^'|'$/g, '')),
      );
      const missing = [...new Set(tokenize(indexed))].filter((t) => !lexemes.has(t));
      expect({ chunk: c.chunkId, missing }).toEqual({ chunk: c.chunkId, missing: [] });
    }
  });

  it('keeps identifiers as single discriminating terms', async () => {
    const { rows } = await pool.query(
      "SELECT id FROM rag_chunks WHERE content_tsv @@ quote_literal('adr0111')::tsquery ORDER BY id",
    );
    expect(rows.map((r: any) => r.id)).toEqual(['k1', 'k3']);
  });

  it('reads document frequency over the whole corpus, not the candidate set', async () => {
    const { stats } = await adapter.candidates({ terms: ['adr0111', 'adr', 'schemaversion'], limit: 100 });
    expect(stats.corpusSize).toBe(4);
    expect(stats.documentFrequency.get('adr0111')).toBe(2);
    expect(stats.documentFrequency.get('adr')).toBe(3);
    expect(stats.documentFrequency.get('schemaversion')).toBe(1);
  });

  it('agrees with the in-memory index on corpus statistics', async () => {
    // Same corpus, two stores, identical BM25 inputs — the property that lets the
    // CI eval measure the in-memory path and still describe the Postgres one.
    const memory = new InMemoryLexicalIndexAdapter();
    memory.seed(CORPUS);
    const terms = ['adr0111', 'adr', '0111', 'schemaversion', 'memoisation'];
    const pgStats = (await adapter.candidates({ terms, limit: 100 })).stats;
    const memStats = (await memory.candidates({ terms, limit: 100 })).stats;

    expect(pgStats.corpusSize).toBe(memStats.corpusSize);
    expect(pgStats.averageDocumentLength).toBeCloseTo(memStats.averageDocumentLength, 6);
    for (const term of terms) {
      expect([term, pgStats.documentFrequency.get(term)]).toEqual([
        term,
        memStats.documentFrequency.get(term),
      ]);
    }
  });

  it('produces the same BM25 ranking as the in-memory index', async () => {
    const memory = new InMemoryLexicalIndexAdapter();
    memory.seed(CORPUS);
    const pgHybrid = new HybridKnowledgeAdapter({ lexical: adapter });
    const memHybrid = new HybridKnowledgeAdapter({ lexical: memory });

    for (const query of ['ADR-0111', 'SCHEMA_VERSION', 'what does ADR-0112 pin', 'EVD-01']) {
      const fromPg = (await pgHybrid.query({ query })).chunks.map((c) => c.chunkId);
      const fromMemory = (await memHybrid.query({ query })).chunks.map((c) => c.chunkId);
      expect([query, fromPg]).toEqual([query, fromMemory]);
    }
  });

  it('ranks the owning document first for an exact identifier query', async () => {
    const hybrid = new HybridKnowledgeAdapter({ lexical: adapter });
    const result = await hybrid.query({ query: 'ADR-0111' });
    expect(result.chunks[0].chunkId).toBe('k1');
    expect(result.chunks[0].corpusVersion).toBe('test');
  });

  it('applies metadata filters as plain WHERE clauses', async () => {
    const hybrid = new HybridKnowledgeAdapter({ lexical: adapter });
    const result = await hybrid.query({ query: 'ADR-0111', adrPrefix: '0090' });
    expect(result.chunks.map((c) => c.chunkId)).toEqual(['k3']);
  });
});


/**
 * The prefilter at REAL scale.
 *
 * A term as common as `adr` matches most of this corpus, so the store must cap
 * what it materializes — and that cap lands BEFORE BM25 scores anything. On a
 * four-row fixture the cap never bites and the bug hides; on the real 1000-chunk
 * corpus, truncating in `id` order would drop the very chunk that owns the
 * queried identifier. These tests are the reason `ORDER BY ts_rank_cd` exists.
 */
const CORPUS_FIXTURE = resolve(
  __dirname,
  '../../../../../../.harness/fixtures/rag-eval/corpus.json.gz',
);
const describeIfCorpus = PG_URL && existsSync(CORPUS_FIXTURE) ? describe : describe.skip;

describeIfCorpus('PgLexicalIndexAdapter at corpus scale (GT-592)', () => {
  let pool: any;
  let adapter: PgLexicalIndexAdapter;
  let memory: InMemoryLexicalIndexAdapter;
  let chunks: KnowledgeChunk[];

  beforeAll(async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: PG_URL });
    chunks = JSON.parse(gunzipSync(readFileSync(CORPUS_FIXTURE)).toString('utf8')).chunks;

    await pool.query('DROP TABLE IF EXISTS rag_chunks');
    await pool.query(readFileSync(SCHEMA_PATH, 'utf8'));

    // Lexical retrieval never reads `embedding`; a constant vector satisfies the
    // NOT NULL column without pretending these rows carry real semantics.
    const zero = `[${new Array(1024).fill(0).join(',')}]`;
    for (const c of chunks) {
      await pool.query(
        `INSERT INTO rag_chunks (id, content, section_heading, char_start, char_end, source_file, adr_id, language, corpus_version, embedding)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::vector) ON CONFLICT (id) DO NOTHING`,
        [c.chunkId, c.text, c.sectionHeading, c.charStart ?? 0, c.charEnd ?? 0, c.sourceFile, c.adrId, c.language, 'rag-eval', zero],
      );
    }
    adapter = new PgLexicalIndexAdapter({ client: pool, corpusVersion: 'rag-eval' });
    memory = new InMemoryLexicalIndexAdapter();
    memory.seed(chunks);
  }, 300000);

  afterAll(async () => {
    await pool?.end();
  });

  it('indexed the whole corpus', async () => {
    expect(await adapter.corpusSize()).toBe(chunks.length);
    expect(chunks.length).toBeGreaterThan(500);
  });

  it('matches the in-memory index on corpus-wide statistics at scale', async () => {
    const terms = ['adr0034', 'adr', '0034', 'topology', 'cqrs'];
    const pgStats = (await adapter.candidates({ terms, limit: 500 })).stats;
    const memStats = (await memory.candidates({ terms, limit: 500 })).stats;
    expect(pgStats.corpusSize).toBe(memStats.corpusSize);
    expect(pgStats.averageDocumentLength).toBeCloseTo(memStats.averageDocumentLength, 6);
    for (const term of terms) {
      expect([term, pgStats.documentFrequency.get(term)]).toEqual([
        term,
        memStats.documentFrequency.get(term),
      ]);
    }
  });

  it('still reaches the owning document when the prefilter truncates', async () => {
    // RECALL is what the prefilter can destroy, so recall is what this asserts.
    // Rank-1 would be the wrong bar and would fail for an honest reason: an ADR
    // names its own identifier exactly once, in its header chunk, while another
    // ADR that cites it may name it twice in a chunk of similar length — so BM25
    // can legitimately rank a citing chunk first. Whether that is good enough is
    // a question for the eval harness, which measures it over a fixed query set;
    // here the only claim is that truncation did not drop the document.
    const pgHybrid = new HybridKnowledgeAdapter({ lexical: adapter });
    for (const id of ['0001', '0034', '0087', '0101', '0116']) {
      const result = await pgHybrid.query({ query: `ADR-${id}`, maxResults: 10 });
      const sources = result.chunks.map((c) => c.sourceFile);
      expect([id, sources.some((f) => f.includes(`/${id}-`))]).toEqual([id, true]);
    }
  });

  it('produces the same top-10 as the in-memory index on the real corpus', async () => {
    // The property that lets the CI eval measure the in-memory path and still be
    // describing what a Postgres-backed deployment does.
    const pgHybrid = new HybridKnowledgeAdapter({ lexical: adapter });
    const memHybrid = new HybridKnowledgeAdapter({ lexical: memory });
    for (const query of ['ADR-0034', 'what does ADR-0101 decide', 'dual engine policy evaluation']) {
      const fromPg = (await pgHybrid.query({ query })).chunks.map((c) => c.chunkId);
      const fromMemory = (await memHybrid.query({ query })).chunks.map((c) => c.chunkId);
      expect([query, fromPg]).toEqual([query, fromMemory]);
    }
  });
});
