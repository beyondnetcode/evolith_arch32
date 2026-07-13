import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { createRagAdapter, availableRagProviders, RagPortError } from './rag-port.mjs';
import {
  pgvectorAdapter,
  PGVECTOR_DDL,
  PGVECTOR_SCHEMA_PATH,
  UPSERT_SQL,
  DELETE_SQL,
  RAG_EMBEDDING_DIM,
  RAG_PGVECTOR_TABLE,
} from './rag-pgvector.mjs';

/** Minimal `{ query(text, params) }` stub that records every call. */
function makeStub() {
  const calls = [];
  return {
    calls,
    async query(text, params) {
      calls.push({ text, params });
      return { rowCount: Array.isArray(params?.[0]) ? params[0].length : 1 };
    },
  };
}

const META = {
  chunk_id: 'abc123',
  source_file: 'reference/core/architecture/adrs/core/0090-rag-knowledge-governance.md',
  section_heading: 'Decision',
  adr_id: '0090',
  language: 'en',
  corpus_version: 'deadbeefcafe',
  text_preview: 'a preview of the chunk body',
};

test('pgvector adapter registers as a durable provider', () => {
  assert.ok(availableRagProviders().includes('pgvector'));
  const a = createRagAdapter({ provider: 'pgvector', client: makeStub() });
  assert.equal(a.name, 'pgvector');
  assert.equal(a.durable, true);
  assert.equal(a.dim, 1024);
});

test('createRagAdapter({provider:"pgvector", client}) works with an injected stub', () => {
  const a = createRagAdapter({ provider: 'pgvector', client: makeStub() });
  for (const m of ['embed', 'upsert', 'delete']) assert.equal(typeof a[m], 'function');
});

test('embed returns dimension-1024 vectors', async () => {
  const a = pgvectorAdapter({ client: makeStub() });
  const vectors = await a.embed(['hello', 'world']);
  assert.equal(vectors.length, 2);
  assert.equal(vectors[0].length, RAG_EMBEDDING_DIM);
  assert.equal(vectors[1].length, 1024);
});

test('upsert issues parameterized SQL with id, vector, and all four metadata columns', async () => {
  const stub = makeStub();
  const a = pgvectorAdapter({ client: stub });
  const vector = await a.embed(['x']).then((v) => v[0]);
  const res = await a.upsert([{ id: 'chunk-1', vector, metadata: META }]);

  assert.equal(res.upserted, 1);
  assert.equal(stub.calls.length, 1);

  const { text, params } = stub.calls[0];
  // parameterized (no interpolated values), targets the chunk table, upserts on conflict
  assert.match(text, /INSERT INTO rag_chunks/);
  assert.match(text, /ON CONFLICT \(id\) DO UPDATE/);
  assert.match(text, /\$10::vector/);
  assert.equal(text, UPSERT_SQL);

  // id first, vector last (as a pgvector literal), all four filter columns present
  assert.equal(params[0], 'chunk-1');
  assert.equal(params[5], META.source_file);
  assert.equal(params[6], META.adr_id);
  assert.equal(params[7], META.language);
  assert.equal(params[8], META.corpus_version);
  assert.equal(params[9], `[${vector.join(',')}]`);
  assert.equal(params.length, 10);
});

test('upsert rejects a wrong-dimension vector (fail closed)', async () => {
  const a = pgvectorAdapter({ client: makeStub() });
  await assert.rejects(
    () => a.upsert([{ id: 'bad', vector: [0.1, 0.2, 0.3], metadata: META }]),
    RagPortError,
  );
});

test('upsert rejects a record without a string id', async () => {
  const a = pgvectorAdapter({ client: makeStub() });
  const vector = await a.embed(['x']).then((v) => v[0]);
  await assert.rejects(() => a.upsert([{ vector, metadata: META }]), RagPortError);
});

test('delete issues DELETE ... WHERE id = ANY($1) with an id array', async () => {
  const stub = makeStub();
  const a = pgvectorAdapter({ client: stub });
  const res = await a.delete(['id-a', 'id-b']);

  assert.equal(stub.calls.length, 1);
  const { text, params } = stub.calls[0];
  assert.equal(text, DELETE_SQL);
  assert.match(text, /DELETE FROM rag_chunks WHERE id = ANY\(\$1\)/);
  assert.deepEqual(params, [['id-a', 'id-b']]);
  assert.equal(res.deleted, 2);
});

test('delete on an empty id list is a no-op (no query)', async () => {
  const stub = makeStub();
  const a = pgvectorAdapter({ client: stub });
  const res = await a.delete([]);
  assert.equal(stub.calls.length, 0);
  assert.equal(res.deleted, 0);
});

test('DDL: exported constant matches the on-disk schema file (no drift)', () => {
  assert.ok(existsSync(PGVECTOR_SCHEMA_PATH), 'rag-pgvector.schema.sql must exist');
  const onDisk = readFileSync(PGVECTOR_SCHEMA_PATH, 'utf8');
  assert.equal(PGVECTOR_DDL, onDisk);
});

test('DDL: dimension 1024, cosine HNSW, vector extension, and metadata columns (ADR-0112)', () => {
  assert.match(PGVECTOR_DDL, /CREATE EXTENSION IF NOT EXISTS vector/);
  assert.match(PGVECTOR_DDL, /embedding\s+vector\(1024\)/);
  assert.match(PGVECTOR_DDL, /USING hnsw \(embedding vector_cosine_ops\)/);
  for (const col of ['source_file', 'adr_id', 'language', 'corpus_version']) {
    assert.match(PGVECTOR_DDL, new RegExp(`${col}`), `DDL missing metadata column ${col}`);
  }
  assert.equal(RAG_PGVECTOR_TABLE, 'rag_chunks');
});
