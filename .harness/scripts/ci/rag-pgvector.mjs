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
 *  - `embed()` uses the REAL Qwen3-Embedding model (via the on-perimeter
 *    inference sidecar) WHEN configured (GT-539 · `rag-embed-qwen3.mjs`), and
 *    falls back to the deterministic `hashEmbed(t, 1024)` offline default when
 *    no sidecar is configured (dry-run / tests). The port stays model-agnostic:
 *    the concrete model is never hard-coded, only defaulted (ADR-0090 §3). The
 *    effective model id is exposed as `embeddingModelId` so the sync can fold it
 *    into `corpus_version` for cache invalidation (ADR-0090 §3 / ADR-0112 §1).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { registerRagAdapter, hashEmbed, RagPortError } from './rag-port.mjs';
import { makeQwen3Embedder, isQwen3Configured } from './rag-embed-qwen3.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** ADR-0112 §2 — Qwen3 Matryoshka maximum; the pgvector column is vector(1024). */
export const RAG_EMBEDDING_DIM = 1024;

/** Offline/test default model id — deterministic sha256 pseudo-embedding at the store dim. */
export const HASH_EMBED_MODEL_ID = `hash-sha256@${RAG_EMBEDDING_DIM}`;

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
 * Resolve the embedding function behind the port. When an on-perimeter inference
 * sidecar is configured (GT-539) — or an explicit `config.embedder` is injected —
 * use the REAL model; otherwise fall back to the deterministic offline default.
 * Asserts the model's output dimension equals the store dimension (fail closed:
 * a mismatched dimension is not cosine-comparable — ADR-0112 §2/§5).
 */
function resolveEmbedder(config) {
  if (config.embedder || isQwen3Configured(config)) {
    const embedder = config.embedder || makeQwen3Embedder({ ...config, dim: RAG_EMBEDDING_DIM });
    if (embedder.dim !== RAG_EMBEDDING_DIM) {
      throw new RagPortError(
        `configured embedding model dim ${embedder.dim} != store dim ${RAG_EMBEDDING_DIM} ` +
          `(ADR-0112 §2 — fail closed)`,
      );
    }
    return embedder;
  }
  // Offline default: deterministic hashEmbed at the store dimension. Non-semantic
  // but stable — used for dry-run and tests when no sidecar is on-perimeter.
  return {
    modelId: HASH_EMBED_MODEL_ID,
    dim: RAG_EMBEDDING_DIM,
    async embed(texts) {
      return texts.map((t) => hashEmbed(t, RAG_EMBEDDING_DIM));
    },
  };
}

/** Factory: `config -> durable pgvector adapter`. */
export function pgvectorAdapter(config = {}) {
  let clientPromise = null;
  const getClient = () => {
    if (!clientPromise) clientPromise = resolveClient(config);
    return clientPromise;
  };
  const embedder = resolveEmbedder(config);

  return {
    name: 'pgvector',
    durable: true,
    dim: RAG_EMBEDDING_DIM,
    ddl: PGVECTOR_DDL,
    // Effective embedding model id — the sync folds this into corpus_version so
    // a model swap invalidates the cache (ADR-0090 §3 / ADR-0112 §1).
    embeddingModelId: embedder.modelId,

    async embed(texts) {
      const vectors = await embedder.embed(texts);
      // Defense in depth: the store column is vector(1024) — refuse anything else,
      // even from an injected embedder (fail closed on dimension drift).
      for (const v of vectors) {
        if (!Array.isArray(v) || v.length !== RAG_EMBEDDING_DIM) {
          throw new RagPortError(
            `embedding dimension ${Array.isArray(v) ? v.length : typeof v} != ` +
              `store dim ${RAG_EMBEDDING_DIM} (ADR-0112 §2 — fail closed)`,
          );
        }
      }
      return vectors;
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

// Register on import so `createRagAdapter({ provider: 'pgvector' })` resolves it.
registerRagAdapter('pgvector', pgvectorAdapter);
