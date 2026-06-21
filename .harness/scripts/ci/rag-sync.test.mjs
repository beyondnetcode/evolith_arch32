import assert from 'node:assert/strict';
import test from 'node:test';
import { createRagAdapter, registerRagAdapter, RagPortError, availableRagProviders } from './rag-port.mjs';
import { chunkMarkdown, chunkIds, syncIndex, RECEIPT_SCHEMA_VERSION } from './rag-sync.mjs';

const DOC = `# Title

intro line

## Alpha

alpha body

## Beta

beta body
`;

test('createRagAdapter returns memory by default and is non-durable', () => {
  const a = createRagAdapter();
  assert.equal(a.name, 'memory');
  assert.equal(a.durable, false);
  assert.ok(availableRagProviders().includes('memory'));
});

test('createRagAdapter fails closed on unknown provider', () => {
  assert.throws(() => createRagAdapter({ provider: 'pinecone-x' }), RagPortError);
});

test('createRagAdapter rejects an incomplete adapter', () => {
  registerRagAdapter('partial', () => ({ name: 'partial', embed: async () => [] }));
  assert.throws(() => createRagAdapter({ provider: 'partial' }), /missing upsert/);
});

test('memory adapter embeds deterministically', async () => {
  const a = createRagAdapter();
  const [v1] = await a.embed(['hello']);
  const [v2] = await a.embed(['hello']);
  assert.deepEqual(v1, v2);
  assert.equal(v1.length, 16);
});

test('chunkMarkdown is deterministic and splits at H2', () => {
  const ids1 = chunkIds(DOC, 'reference/x.md', 'v1');
  const ids2 = chunkIds(DOC, 'reference/x.md', 'v1');
  assert.deepEqual(ids1, ids2);
  const chunks = chunkMarkdown(DOC, 'reference/x.md', 'v1');
  const headings = chunks.map((c) => c.section_heading);
  assert.ok(headings.includes('Alpha') && headings.includes('Beta'));
});

test('syncIndex upserts every chunk into the adapter and reports a receipt', async () => {
  const a = createRagAdapter();
  const receipt = await syncIndex({
    adapter: a,
    changed: [{ sourceFile: 'reference/x.md', content: DOC }],
    corpusVersion: 'v1',
  });
  assert.equal(receipt.schemaVersion, RECEIPT_SCHEMA_VERSION);
  assert.equal(receipt.durable, false);
  assert.equal(receipt.counts.upserted, a.size());
  assert.ok(a.size() >= 2);
  for (const id of receipt.upserted) assert.ok(a.has(id), `chunk ${id} not persisted`);
  assert.ok(receipt.telemetry.estTokens > 0 && receipt.telemetry.embedCalls >= 1);
});

test('re-indexing a changed file prunes stale chunks (no orphans)', async () => {
  const a = createRagAdapter();
  const orphan = 'deadbeefdeadbeef';
  await a.upsert([{ id: orphan, vector: [], metadata: {} }]);
  const priorChunkIds = [...chunkIds(DOC, 'reference/x.md', 'v1'), orphan];
  const receipt = await syncIndex({
    adapter: a,
    changed: [{ sourceFile: 'reference/x.md', content: DOC, priorChunkIds }],
    corpusVersion: 'v1',
  });
  assert.ok(receipt.deleted.includes(orphan), 'stale chunk not pruned');
  assert.equal(a.has(orphan), false);
});

test('deleted source files remove their chunks', async () => {
  const a = createRagAdapter();
  await syncIndex({ adapter: a, changed: [{ sourceFile: 'reference/x.md', content: DOC }], corpusVersion: 'v1' });
  const ids = chunkIds(DOC, 'reference/x.md', 'v1');
  const receipt = await syncIndex({ adapter: a, deleted: [{ sourceFile: 'reference/x.md', chunkIds: ids }] });
  assert.equal(receipt.counts.deleted, ids.length);
  for (const id of ids) assert.equal(a.has(id), false);
});

test('syncIndex fails closed when embeddings do not match the batch', async () => {
  const bad = { name: 'bad', durable: true, embed: async () => [], upsert: async () => ({}), delete: async () => ({}) };
  await assert.rejects(
    () => syncIndex({ adapter: bad, changed: [{ sourceFile: 'reference/x.md', content: DOC }] }),
    /unexpected vector count/,
  );
});
