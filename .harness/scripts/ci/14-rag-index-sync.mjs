/**
 * @file 14-rag-index-sync.mjs
 * @description CI Step: RAG Knowledge Index Synchronization (ADR-0090 / GT-145)
 *
 * Truthful, provider-neutral delta-sync. DISABLED by default; set
 * EVOLITH_RAG_SYNC=true for live mode.
 *
 *   1. Detects changed AND deleted reference/ files (git diff --name-status).
 *   2. Chunks each file at H2 boundaries (deterministic chunk ids).
 *   3. Embeds + upserts changed chunks and prunes stale/deleted ones (no
 *      orphans) through the configured adapter port (rag-port.mjs).
 *   4. Emits a machine-readable receipt and fails closed on any error.
 *
 * Dry-run uses the truthful, non-durable in-memory adapter. Live, durable
 * persistence requires a registered `durable: true` adapter selected via
 * EVOLITH_RAG_PROVIDER — otherwise the run fails closed (it never pretends).
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRagAdapter } from './rag-port.mjs';
import { syncIndex, chunkIds } from './rag-sync.mjs';
// Side-effect import: registers the durable `pgvector` adapter (GT-538 / ADR-0112)
// so EVOLITH_RAG_PROVIDER=pgvector resolves instead of failing closed. The port
// itself stays vendor-neutral; the vendor is wired only here, at the CI seam.
import './rag-pgvector.mjs';

const RAG_SYNC_ENABLED = process.env.EVOLITH_RAG_SYNC === 'true';

function getCorpusVersion() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().slice(0, 12);
  } catch {
    return 'unknown';
  }
}

/** Changed (A/M) and deleted (D) EN reference markdown files since the last commit. */
function getChangedAndDeleted() {
  let out = '';
  try {
    out = execSync('git diff --name-status HEAD~1 HEAD', { encoding: 'utf8' });
  } catch {
    return { changed: [], deleted: [] };
  }
  const changed = [];
  const deleted = [];
  for (const line of out.split('\n')) {
    const m = line.match(/^([AMD])\t(reference\/.+\.md)$/);
    if (!m) continue;
    const [, status, file] = m;
    if (file.endsWith('.es.md')) continue; // EN corpus is the indexed source
    if (status === 'D') deleted.push(file);
    else changed.push(file);
  }
  return { changed, deleted };
}

/** Content of a file at the parent commit (for pruning stale/deleted chunks). */
function contentAtParent(file) {
  try {
    return execSync(`git show HEAD~1:${file}`, { encoding: 'utf8' });
  } catch {
    return null;
  }
}

function failClosed(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

async function main() {
  console.log('📚 RAG Knowledge Index Sync (ADR-0090 / GT-145)');
  console.log(`   Mode: ${RAG_SYNC_ENABLED ? '🔴 LIVE SYNC' : '🟡 DRY-RUN (set EVOLITH_RAG_SYNC=true to activate)'}`);

  const corpusVersion = getCorpusVersion();
  const { changed, deleted } = getChangedAndDeleted();

  if (changed.length === 0 && deleted.length === 0) {
    console.log('   ✅ No reference/ files changed in this commit. Index is up to date.');
    process.exit(0);
  }

  let adapter;
  try {
    adapter = createRagAdapter({ provider: process.env.EVOLITH_RAG_PROVIDER });
  } catch (err) {
    return failClosed(`RAG adapter unavailable — failing closed: ${err.message}`);
  }

  // Truthful contract: a live run must use a durable adapter; never pretend.
  if (RAG_SYNC_ENABLED && !adapter.durable) {
    return failClosed(
      `Live sync requested but adapter "${adapter.name}" is not durable. ` +
        `Configure EVOLITH_RAG_PROVIDER with a durable vector-store adapter. Failing closed.`,
    );
  }

  const changedPayloads = changed.map((file) => {
    const content = readFileSync(resolve(process.cwd(), file), 'utf8');
    const prior = contentAtParent(file);
    return { sourceFile: file, content, priorChunkIds: prior ? chunkIds(prior, file, corpusVersion) : undefined };
  });
  const deletedPayloads = deleted.map((file) => {
    const prior = contentAtParent(file);
    return { sourceFile: file, chunkIds: prior ? chunkIds(prior, file, corpusVersion) : [] };
  });

  let receipt;
  try {
    receipt = await syncIndex({ adapter, changed: changedPayloads, deleted: deletedPayloads, corpusVersion });
  } catch (err) {
    return failClosed(`RAG synchronization failed — failing closed: ${err.message}`);
  }

  console.log(
    `\n   📊 ${receipt.counts.files} file(s) · ${receipt.counts.upserted} chunk(s) upserted · ` +
      `${receipt.counts.deleted} pruned · provider [${receipt.provider}] durable=${receipt.durable}`,
  );
  console.log(`   📈 Telemetry: ${receipt.telemetry.embedCalls} embed call(s), ~${receipt.telemetry.estTokens} tokens`);
  console.log(`   🔖 Corpus version: ${corpusVersion}`);
  // Machine-readable receipt (single line, easy to capture in CI).
  console.log(`RECEIPT ${JSON.stringify(receipt)}`);

  const receiptPath = process.env.EVOLITH_RAG_RECEIPT_PATH;
  if (receiptPath) {
    writeFileSync(resolve(process.cwd(), receiptPath), JSON.stringify(receipt, null, 2));
    console.log(`   💾 Receipt written to ${receiptPath}`);
  }

  if (!RAG_SYNC_ENABLED) {
    console.log('\n   ℹ️  Dry-run via the in-memory adapter (non-durable). Set EVOLITH_RAG_SYNC=true with a durable provider for live sync.');
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ RAG sync failed:', err.message);
  process.exit(1);
});
