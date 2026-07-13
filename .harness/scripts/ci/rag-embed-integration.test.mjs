/**
 * GT-539 — Integration of the real embedding model into the durable pgvector
 * adapter and the write-side sync. STUBBED DB client + STUBBED sidecar fetch;
 * the live sidecar (running Qwen3) is deploy-gated and NOT exercised here.
 *
 * Covers: configured ⇒ real-model path (dim 1024 + model id in corpus_version);
 * unconfigured ⇒ hashEmbed offline default; wrong-dim sidecar ⇒ fail closed.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { syncIndex } from './rag-sync.mjs';
import { pgvectorAdapter, RAG_EMBEDDING_DIM, HASH_EMBED_MODEL_ID } from './rag-pgvector.mjs';
import { RagPortError } from './rag-port.mjs';

const DOC = `# Title\n\nintro\n\n## Alpha\n\nalpha body\n\n## Beta\n\nbeta body\n`;
const URL = 'http://localhost:8085/embed';
const vec = (n, f = 0.1) => Array.from({ length: n }, () => f);

function dbStub() {
  const calls = [];
  return {
    calls,
    async query(text, params) {
      calls.push({ text, params });
      return { rowCount: Array.isArray(params?.[0]) ? params[0].length : 1 };
    },
  };
}

/** A sidecar fetch stub returning `dim`-length vectors for every input. */
function sidecarStub(dim = RAG_EMBEDDING_DIM) {
  const calls = [];
  const fn = async (url, opts) => {
    const { input } = JSON.parse(opts.body);
    calls.push({ url, input });
    return { ok: true, status: 200, async json() { return { data: input.map(() => ({ embedding: vec(dim) })) }; } };
  };
  fn.calls = calls;
  return fn;
}

/** Run a block with EVOLITH_RAG_EMBED_URL unset (isolated offline default). */
async function withoutSidecarEnv(fn) {
  const saved = process.env.EVOLITH_RAG_EMBED_URL;
  delete process.env.EVOLITH_RAG_EMBED_URL;
  try {
    return await fn();
  } finally {
    if (saved !== undefined) process.env.EVOLITH_RAG_EMBED_URL = saved;
  }
}

test('unconfigured adapter uses the hashEmbed offline default (model id = hash-sha256@1024)', async () => {
  await withoutSidecarEnv(async () => {
    const a = pgvectorAdapter({ client: dbStub() });
    assert.equal(a.embeddingModelId, HASH_EMBED_MODEL_ID);
    const [v] = await a.embed(['hello']);
    assert.equal(v.length, RAG_EMBEDDING_DIM);
  });
});

test('configured adapter uses the real model path (sidecar called, dim 1024)', async () => {
  const sidecar = sidecarStub();
  const a = pgvectorAdapter({ client: dbStub(), url: URL, fetch: sidecar });
  assert.equal(a.embeddingModelId, 'qwen3-embedding-0.6b');
  const out = await a.embed(['x', 'y']);
  assert.equal(out.length, 2);
  assert.equal(out[0].length, RAG_EMBEDDING_DIM);
  assert.ok(sidecar.calls.length >= 1, 'the sidecar must be called on the real-model path');
});

test('configured sync records the model id in each chunk corpus_version (ADR-0090 §3)', async () => {
  const db = dbStub();
  const a = pgvectorAdapter({ client: db, url: URL, fetch: sidecarStub() });
  const receipt = await syncIndex({
    adapter: a,
    changed: [{ sourceFile: 'reference/x.md', content: DOC }],
    corpusVersion: 'gitsha123',
  });
  assert.equal(receipt.corpusVersion, 'gitsha123+qwen3-embedding-0.6b');

  const upsertCalls = db.calls.filter((c) => /INSERT INTO rag_chunks/.test(c.text));
  assert.ok(upsertCalls.length >= 2, 'expected multiple chunks upserted');
  for (const c of upsertCalls) {
    // param[8] is the corpus_version column; param[9] is the 1024-dim vector literal.
    assert.equal(c.params[8], 'gitsha123+qwen3-embedding-0.6b');
    assert.match(c.params[9], /^\[/);
  }
});

test('offline sync still declares the (hash) model id in corpus_version', async () => {
  await withoutSidecarEnv(async () => {
    const a = pgvectorAdapter({ client: dbStub() });
    const receipt = await syncIndex({
      adapter: a,
      changed: [{ sourceFile: 'reference/x.md', content: DOC }],
      corpusVersion: 'gitsha123',
    });
    assert.equal(receipt.corpusVersion, `gitsha123+${HASH_EMBED_MODEL_ID}`);
  });
});

test('configured adapter fails closed on a wrong-dimension sidecar response', async () => {
  const a = pgvectorAdapter({ client: dbStub(), url: URL, fetch: sidecarStub(768) });
  await assert.rejects(() => a.embed(['x']), RagPortError);
});

test('an injected embedder with the wrong dim is rejected at construction (fail closed)', () => {
  assert.throws(
    () => pgvectorAdapter({ client: dbStub(), embedder: { modelId: 'x', dim: 512, embed: async () => [] } }),
    RagPortError,
  );
});

test('adapter embed() re-checks vector dimension even from an injected embedder', async () => {
  const a = pgvectorAdapter({
    client: dbStub(),
    embedder: { modelId: 'liar', dim: RAG_EMBEDDING_DIM, embed: async (t) => t.map(() => vec(999)) },
  });
  await assert.rejects(() => a.embed(['x']), RagPortError);
});
