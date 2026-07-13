/**
 * GT-539 — Unit tests for the Qwen3 sidecar embedder (rag-embed-qwen3.mjs).
 *
 * Every case uses a STUBBED fetch — the network is never touched. The live
 * sidecar (an actually-running Qwen3 model) is deploy-gated and NOT exercised
 * here (ADR-0112 §4).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  makeQwen3Embedder,
  isQwen3Configured,
  DEFAULT_EMBED_MODEL,
  DEFAULT_EMBED_DIM,
} from './rag-embed-qwen3.mjs';
import { RagPortError } from './rag-port.mjs';

const URL = 'http://localhost:8085/embed';
const vec = (n, fill = 0.1) => Array.from({ length: n }, () => fill);

/** Build an injectable fetch stub that records calls and shapes its response. */
function fetchStub({ vectors = [], ok = true, status = 200, shape = 'openai', throwErr = null, badJson = false } = {}) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts, body: opts && JSON.parse(opts.body) });
    if (throwErr) throw new Error(throwErr);
    return {
      ok,
      status,
      async json() {
        if (badJson) throw new Error('invalid json');
        if (shape === 'openai') return { data: vectors.map((v) => ({ embedding: v })) };
        if (shape === 'tei') return vectors; // bare array of vectors
        if (shape === 'embeddings') return { embeddings: vectors };
        return {};
      },
    };
  };
  fn.calls = calls;
  return fn;
}

test('isQwen3Configured reflects config.url', () => {
  assert.equal(isQwen3Configured({}), false);
  assert.equal(isQwen3Configured({ url: URL }), true);
});

test('defaults: model qwen3-embedding-0.6b, dim 1024 (ADR-0112 §1/§2)', () => {
  const e = makeQwen3Embedder({ url: URL, fetch: fetchStub() });
  assert.equal(e.modelId, DEFAULT_EMBED_MODEL);
  assert.equal(e.modelId, 'qwen3-embedding-0.6b');
  assert.equal(e.dim, 1024);
  assert.equal(DEFAULT_EMBED_DIM, 1024);
});

test('embed posts {model,input} and returns dim-1024 vectors (openai shape)', async () => {
  const stub = fetchStub({ vectors: [vec(1024), vec(1024, 0.2)] });
  const e = makeQwen3Embedder({ url: URL, fetch: stub });
  const out = await e.embed(['a', 'b']);
  assert.equal(out.length, 2);
  assert.equal(out[0].length, 1024);
  assert.equal(stub.calls.length, 1);
  assert.equal(stub.calls[0].url, URL);
  assert.equal(stub.calls[0].opts.method, 'POST');
  assert.deepEqual(stub.calls[0].body, { model: 'qwen3-embedding-0.6b', input: ['a', 'b'] });
});

test('embed accepts TEI bare-array and {embeddings} response shapes', async () => {
  const e1 = makeQwen3Embedder({ url: URL, fetch: fetchStub({ vectors: [vec(1024)], shape: 'tei' }) });
  assert.equal((await e1.embed(['x']))[0].length, 1024);
  const e2 = makeQwen3Embedder({ url: URL, fetch: fetchStub({ vectors: [vec(1024)], shape: 'embeddings' }) });
  assert.equal((await e2.embed(['x']))[0].length, 1024);
});

test('empty input short-circuits without a network call (no egress)', async () => {
  const stub = fetchStub();
  const e = makeQwen3Embedder({ url: URL, fetch: stub });
  assert.deepEqual(await e.embed([]), []);
  assert.equal(stub.calls.length, 0);
});

test('custom model + Matryoshka dim are honoured', async () => {
  const e = makeQwen3Embedder({ url: URL, model: 'qwen3-embedding-4b', dim: 512, fetch: fetchStub({ vectors: [vec(512)] }) });
  assert.equal(e.modelId, 'qwen3-embedding-4b');
  assert.equal(e.dim, 512);
  assert.equal((await e.embed(['x']))[0].length, 512);
});

test('wrong-dimension response fails closed (768 != 1024)', async () => {
  const e = makeQwen3Embedder({ url: URL, fetch: fetchStub({ vectors: [vec(768)] }) });
  await assert.rejects(() => e.embed(['x']), RagPortError);
});

test('vector-count mismatch fails closed', async () => {
  const e = makeQwen3Embedder({ url: URL, fetch: fetchStub({ vectors: [vec(1024)] }) });
  await assert.rejects(() => e.embed(['x', 'y']), RagPortError);
});

test('non-OK sidecar response fails closed', async () => {
  const e = makeQwen3Embedder({ url: URL, fetch: fetchStub({ ok: false, status: 503 }) });
  await assert.rejects(() => e.embed(['x']), RagPortError);
});

test('transport error fails closed (never silently degrades)', async () => {
  const e = makeQwen3Embedder({ url: URL, fetch: fetchStub({ throwErr: 'ECONNREFUSED' }) });
  await assert.rejects(() => e.embed(['x']), RagPortError);
});

test('unparseable body fails closed', async () => {
  const e = makeQwen3Embedder({ url: URL, fetch: fetchStub({ badJson: true }) });
  await assert.rejects(() => e.embed(['x']), RagPortError);
});

test('missing url throws (fail closed at construction)', () => {
  const saved = process.env.EVOLITH_RAG_EMBED_URL;
  delete process.env.EVOLITH_RAG_EMBED_URL;
  try {
    assert.throws(() => makeQwen3Embedder({ fetch: fetchStub() }), RagPortError);
  } finally {
    if (saved !== undefined) process.env.EVOLITH_RAG_EMBED_URL = saved;
  }
});
