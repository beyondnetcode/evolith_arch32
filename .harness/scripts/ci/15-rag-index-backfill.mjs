#!/usr/bin/env node
/**
 * 15-rag-index-backfill — full corpus indexer (ADR-0090 section 3, "full re-index trigger").
 *
 * 14-rag-index-sync.mjs only ever indexes what a commit touched
 * (git diff HEAD~1 HEAD). That is correct for steady state, but it means a
 * freshly provisioned vector store stays empty until every file happens to be
 * edited — the corpus never reaches the index, so retrieval returns nothing and
 * the `ground` step silently produces zero citations.
 *
 * This closes that hole: it walks the whole EN corpus and pushes it through the
 * SAME chunker, adapter and receipt contract as the delta path, so there is
 * exactly one indexing implementation. Run it once after provisioning, and again
 * whenever the chunking strategy or embedding model changes (ADR-0090 section 3 /
 * ADR-0112 section 1 — a model swap changes corpus_version, which invalidates
 * every chunk and mandates a full re-embed).
 *
 * Scope: reference/ markdown, excluding *.es.md (ADR-0090 section 3 is EN-only).
 *
 * Usage:
 *   node .harness/scripts/ci/15-rag-index-backfill.mjs            # dry-run
 *   EVOLITH_RAG_SYNC=true EVOLITH_RAG_PROVIDER=pgvector \
 *     node .harness/scripts/ci/15-rag-index-backfill.mjs          # live
 *
 * Fail-closed exactly like the delta path: an unavailable adapter, a non-durable
 * provider in live mode, or a sync error aborts non-zero rather than reporting a
 * success that did not happen.
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createRagAdapter } from './rag-port.mjs';
import { syncIndex } from './rag-sync.mjs';
// Side-effect import: registers the durable pgvector adapter (GT-538 / ADR-0112).
import './rag-pgvector.mjs';

const ROOT = process.cwd();
const CORPUS_DIR = 'reference';
const RAG_SYNC_ENABLED = process.env.EVOLITH_RAG_SYNC === 'true';
const RECEIPT_PATH = 'rag-backfill-receipt.json';

function getCorpusVersion() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().slice(0, 12);
  } catch {
    return 'unknown';
  }
}

/** Every EN markdown file in the corpus. `.es.md` is excluded per ADR-0090 section 3. */
export function collectCorpusFiles(root = ROOT, dir = CORPUS_DIR) {
  const out = [];
  const walk = (abs) => {
    let entries;
    try {
      entries = readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(abs, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.md') && !entry.name.endsWith('.es.md')) {
        out.push(relative(root, full).split(sep).join('/'));
      }
    }
  };
  walk(join(root, dir));
  return out.sort();
}

function failClosed(message) {
  console.error(`\n   ERROR: ${message}`);
  process.exit(1);
}

async function run() {
  console.log('\nRAG Corpus Backfill (full re-index)');
  console.log(`   Mode: ${RAG_SYNC_ENABLED ? 'LIVE SYNC' : 'DRY-RUN (set EVOLITH_RAG_SYNC=true to activate)'}`);

  const corpusVersion = getCorpusVersion();
  const files = collectCorpusFiles();

  if (files.length === 0) {
    return failClosed(`No EN markdown found under ${CORPUS_DIR}/ — refusing to report an empty backfill as success.`);
  }
  console.log(`   Corpus: ${files.length} EN file(s) under ${CORPUS_DIR}/ · corpusVersion ${corpusVersion}`);

  let adapter;
  try {
    adapter = createRagAdapter({ provider: process.env.EVOLITH_RAG_PROVIDER });
  } catch (err) {
    return failClosed(`RAG adapter unavailable — failing closed: ${err.message}`);
  }

  if (RAG_SYNC_ENABLED && !adapter.durable) {
    return failClosed(
      `EVOLITH_RAG_SYNC=true but provider [${adapter.name}] is not durable. ` +
        'A live backfill into a non-durable store would be discarded — failing closed.',
    );
  }

  // A backfill re-indexes every file, so there are no priorChunkIds to prune: a
  // fresh store has none, and a re-embed after a model swap changes
  // corpus_version, which the adapter treats as a distinct chunk identity.
  const changed = files.map((sourceFile) => ({
    sourceFile,
    content: readFileSync(join(ROOT, sourceFile), 'utf8'),
  }));

  let receipt;
  try {
    receipt = await syncIndex({ adapter, changed, deleted: [], corpusVersion });
  } catch (err) {
    return failClosed(`RAG backfill failed — failing closed: ${err.message}`);
  }

  console.log(
    `\n   ${receipt.counts.files} file(s) · ${receipt.counts.upserted} chunk(s) upserted · ` +
      `provider [${receipt.provider}] durable=${receipt.durable}`,
  );
  console.log(`   Telemetry: ${receipt.telemetry.batches} batch(es) · ~${receipt.telemetry.estTokens} tokens`);

  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(`   Receipt: ${RECEIPT_PATH}`);

  if (!RAG_SYNC_ENABLED) {
    console.log('\n   Dry-run: nothing was persisted. Re-run with EVOLITH_RAG_SYNC=true and a durable provider.');
  }
  console.log('\nBackfill complete.\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => failClosed(err.message));
}
