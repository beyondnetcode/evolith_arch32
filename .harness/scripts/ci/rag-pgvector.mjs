/**
 * GT-538 / ADR-0112 — Durable pgvector adapter behind the RAG port.
 *
 * Registers a `durable: true` adapter with the provider-neutral port
 * (`rag-port.mjs`) so `createRagAdapter({ provider: 'pgvector' })` returns a
 * real vector-store writer and a live `14-rag-index-sync.mjs` run persists
 * embeddings instead of failing closed (GT-145 contract).
 *
 * Design constraints honoured here:
 *  - `pg` (node-postgres) is NOT a build dependency. This module never imports
 *    it at load time. Tests inject a minimal `{ query(text, params) }` client;
 *    only a real run with no injected client lazy-imports `pg` and builds a Pool
 *    from `config.connectionString` / env. If neither is available at run time
 *    the adapter fails closed.
 *  - Dimension is fixed at 1024 and distance is cosine (ADR-0112 §2/§3); the DDL
 *    lives in `rag-pgvector.schema.sql` and is re-exported here as PGVECTOR_DDL.
 *  - `embed()` is a PLACEHOLDER delegating to `hashEmbed(t, 1024)`. The real
 *    Qwen3-Embedding model is GT-539's job and MUST NOT be hard-coded here.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { registerRagAdapter, hashEmbed, RagPortError } from './rag-port.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** ADR-0112 §2 — Qwen3 Matryoshka maximum; the pgvector column is vector(1024). */
export const RAG_EMBEDDING_DIM = 1024;

/** Chunk table name (matches the DDL). */
export const RAG_PGVECTOR_TABLE = 'rag_chunks';

/** Path to the canonical DDL file (single source of truth). */
export const PGVECTOR_SCHEMA_PATH = resolve(__dirname, 'rag-pgvector.schema.sql');

/**
 * The DDL, read from the canonical .sql file so the exported constant and the
 * file can never drift. A unit test asserts they agree.
 */
export const PGVECTOR_DDL = readFileSync(PGVECTOR_SCHEMA_PATH, 'utf8');

/** Parameterized upsert — id, metadata columns, and the vector (cast ::vector). */
export const UPSERT_SQL = `INSERT INTO ${RAG_PGVECTOR_TABLE}
  (id, content, section_heading, char_start, char_end, source_file, adr_id, language, corpus_version, embedding)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector)
ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  section_heading = EXCLUDED.section_heading,
  char_start = EXCLUDED.char_start,
  char_end = EXCLUDED.char_end,
  source_file = EXCLUDED.source_file,
  adr_id = EXCLUDED.adr_id,
  language = EXCLUDED.language,
  corpus_version = EXCLUDED.corpus_version,
  embedding = EXCLUDED.embedding`;

/** Parameterized bulk delete by id. */
export const DELETE_SQL = `DELETE FROM ${RAG_PGVECTOR_TABLE} WHERE id = ANY($1)`;

/** pgvector text literal for a numeric vector: [0.1,0.2,...]. */
function toVectorLiteral(vec) {
  return `[${vec.join(',')}]`;
}

/**
 * Resolve a DB client. Prefers the injected `config.client` seam. Only when
 * none is injected does it lazy-import `pg` and build a Pool — so module load
 * never requires the package. Fails closed if neither is available.
 */
async function resolveClient(config) {
  if (config.client && typeof config.client.query === 'function') return config.client;

  const connectionString =
    config.connectionString || process.env.EVOLITH_RAG_PG_URL || process.env.DATABASE_URL;

  let pg;
  try {
    pg = await import('pg');
  } catch {
    throw new RagPortError(
      'pgvector adapter requires an injected client (config.client) or the optional "pg" package at run time',
    );
  }
  const Pool = pg.default?.Pool || pg.Pool;
  if (typeof Pool !== 'function') {
    throw new RagPortError('pgvector adapter could not resolve a pg Pool constructor');
  }
  return new Pool(connectionString ? { connectionString } : {});
}

/** Factory: `config -> durable pgvector adapter`. */
export function pgvectorAdapter(config = {}) {
  let clientPromise = null;
  const getClient = () => {
    if (!clientPromise) clientPromise = resolveClient(config);
    return clientPromise;
  };

  return {
    name: 'pgvector',
    durable: true,
    dim: RAG_EMBEDDING_DIM,
    ddl: PGVECTOR_DDL,

    async embed(texts) {
      // PLACEHOLDER embedding — deterministic hashEmbed at the ADR-0112 dimension.
      // The real Qwen3-Embedding model / inference sidecar is GT-539's job and
      // must NOT be hard-coded here; the port stays model-agnostic.
      return texts.map((t) => hashEmbed(t, RAG_EMBEDDING_DIM));
    },

    async upsert(records) {
      const client = await getClient();
      let upserted = 0;
      for (const r of records) {
        if (!r || typeof r.id !== 'string') {
          throw new RagPortError('pgvector upsert record requires a string id');
        }
        const vec = r.vector;
        if (!Array.isArray(vec) || vec.length !== RAG_EMBEDDING_DIM) {
          throw new RagPortError(
            `pgvector upsert expects a ${RAG_EMBEDDING_DIM}-dim vector for id "${r.id}" ` +
              `(got ${Array.isArray(vec) ? vec.length : typeof vec})`,
          );
        }
        const m = r.metadata || {};
        await client.query(UPSERT_SQL, [
          r.id,
          m.text_preview ?? null,
          m.section_heading ?? null,
          m.char_start ?? null,
          m.char_end ?? null,
          m.source_file ?? null,
          m.adr_id ?? null,
          m.language ?? null,
          m.corpus_version ?? null,
          toVectorLiteral(vec),
        ]);
        upserted += 1;
      }
      return { upserted };
    },

    async delete(ids) {
      if (!Array.isArray(ids) || ids.length === 0) return { deleted: 0 };
      const client = await getClient();
      const res = await client.query(DELETE_SQL, [ids]);
      return { deleted: typeof res?.rowCount === 'number' ? res.rowCount : ids.length };
    },
  };
}

// Register on import so `createRagAdapter({ provider: 'pgvector' })` resolves it.
registerRagAdapter('pgvector', pgvectorAdapter);
