/**
 * GT-145 — Provider-neutral embedding / vector-store port for RAG sync.
 *
 * The sync logic depends on this port, not on any vendor. An adapter implements
 * `embed`, `upsert` and `delete`, declares whether it is `durable`, and is
 * selected by config (`EVOLITH_RAG_PROVIDER`). Unknown providers and incomplete
 * adapters throw (fail-closed) so a "live" run can never silently pretend.
 *
 * The built-in `memory` adapter is a truthful, deterministic, NON-durable
 * stand-in: it is the default for dry-run and the fixture for tests. Live,
 * durable persistence requires a registered `durable: true` adapter.
 */

import { createHash } from 'node:crypto';

export class RagPortError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RagPortError';
  }
}

/** Deterministic, provider-neutral pseudo-embedding (stable across runs). */
export function hashEmbed(text, dim = 16) {
  const digest = createHash('sha256').update(String(text)).digest();
  const vector = [];
  for (let i = 0; i < dim; i++) vector.push((digest[i % digest.length] / 255) * 2 - 1);
  return vector;
}

/** In-process, non-durable adapter — truthful stand-in for dry-run and tests. */
function memoryAdapter(config = {}) {
  const dim = config.dim || 16;
  const store = new Map(); // id -> { id, vector, metadata }
  return {
    name: 'memory',
    durable: false,
    async embed(texts) {
      return texts.map((t) => hashEmbed(t, dim));
    },
    async upsert(records) {
      for (const r of records) {
        if (!r || typeof r.id !== 'string') throw new RagPortError('upsert record requires a string id');
        store.set(r.id, { id: r.id, vector: r.vector, metadata: r.metadata });
      }
      return { upserted: records.length };
    },
    async delete(ids) {
      let deleted = 0;
      for (const id of ids) if (store.delete(id)) deleted += 1;
      return { deleted };
    },
    // inspection helpers (tests / receipts)
    has(id) {
      return store.has(id);
    },
    size() {
      return store.size;
    },
    ids() {
      return [...store.keys()];
    },
  };
}

const ADAPTERS = new Map([['memory', memoryAdapter]]);

/** Register an adapter factory (`config -> adapter`). Used for real vendors / tests. */
export function registerRagAdapter(name, factory) {
  if (typeof factory !== 'function') throw new RagPortError(`adapter factory for "${name}" must be a function`);
  ADAPTERS.set(name, factory);
}

export function availableRagProviders() {
  return [...ADAPTERS.keys()];
}

/** Build the configured RAG adapter. Fail-closed on unknown/incomplete adapters. */
export function createRagAdapter(config = {}) {
  const name = config.provider || 'memory';
  const factory = ADAPTERS.get(name);
  if (!factory) {
    throw new RagPortError(`unknown RAG provider: "${name}" (available: ${availableRagProviders().join(', ')})`);
  }
  const adapter = factory(config);
  for (const method of ['embed', 'upsert', 'delete']) {
    if (typeof adapter?.[method] !== 'function') {
      throw new RagPortError(`RAG adapter "${name}" is missing ${method}()`);
    }
  }
  return adapter;
}
