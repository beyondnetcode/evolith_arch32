/**
 * GT-539 / ADR-0112 §1,§2,§4,§5 — Real embedding model behind the RAG port.
 *
 * A model-agnostic embedder that computes vectors by calling a LOCAL inference
 * SIDECAR over HTTP. Per ADR-0112 §4 the Node process never runs the model
 * in-process — the sidecar is the platform boundary and embeddings are computed
 * on-perimeter, so there is NO corpus egress. The default model is
 * `Qwen3-Embedding-0.6B` at dimension 1024 (ADR-0112 §1/§2), but the endpoint,
 * model id and dimension are all env/config-driven so switching model is a
 * re-embed, not a code change (the port stays model-agnostic — ADR-0090 §3).
 *
 * The network client is an INJECTED seam (`config.fetch`) so unit tests never
 * touch the network. This module NEVER imports a network library at load time.
 *
 * Fails closed on: a missing endpoint, a transport error, a non-OK response, an
 * unparseable body, a wrong vector count, or ANY vector whose length != the
 * expected dimension. Dimension consistency is load-bearing — vectors of a
 * different dimension are not cosine-comparable with the store (ADR-0112 §2/§5).
 */

import { RagPortError } from './rag-port.mjs';

/** ADR-0112 §1 — default self-hosted OSS model (Apache-2.0), lean footprint. */
export const DEFAULT_EMBED_MODEL = 'qwen3-embedding-0.6b';

/** ADR-0112 §2 — Qwen3 Matryoshka maximum; the pgvector column is vector(1024). */
export const DEFAULT_EMBED_DIM = 1024;

/** Resolve the configured sidecar URL (injected config wins over env). */
function resolveUrl(config = {}) {
  return config.url || config.embedUrl || process.env.EVOLITH_RAG_EMBED_URL || null;
}

/**
 * True when an on-perimeter inference sidecar is configured (injected config or
 * env). When false, callers keep the offline `hashEmbed` default — the sidecar
 * is opt-in so dry-run/tests never require it.
 */
export function isQwen3Configured(config = {}) {
  return Boolean(resolveUrl(config));
}

/** Accept OpenAI-style {data:[{embedding}]}, TEI-style [[...]], or {embeddings}. */
function extractVectors(body) {
  const pick = (e) => (Array.isArray(e) ? e : e && e.embedding);
  if (Array.isArray(body)) return body.map(pick);
  if (body && Array.isArray(body.data)) return body.data.map(pick);
  if (body && Array.isArray(body.embeddings)) return body.embeddings.map(pick);
  return null;
}

/**
 * Build a Qwen3 sidecar embedder.
 *
 * @param {object}   [config]
 * @param {string}   [config.url]    sidecar endpoint (else EVOLITH_RAG_EMBED_URL)
 * @param {string}   [config.model]  model id (else EVOLITH_RAG_EMBED_MODEL / default)
 * @param {number}   [config.dim]    expected output dimension (default 1024)
 * @param {Function} [config.fetch]  injected fetch seam (else global fetch)
 * @returns {{ modelId: string, dim: number, embed(texts: string[]): Promise<number[][]> }}
 */
export function makeQwen3Embedder(config = {}) {
  const url = resolveUrl(config);
  if (!url) {
    throw new RagPortError(
      'Qwen3 embedder requires a sidecar URL (config.url or EVOLITH_RAG_EMBED_URL)',
    );
  }
  const modelId = config.model || process.env.EVOLITH_RAG_EMBED_MODEL || DEFAULT_EMBED_MODEL;
  const dim = Number(config.dim || DEFAULT_EMBED_DIM);
  // Injected client seam — tests pass a stub; real runs use global fetch.
  const doFetch = config.fetch || globalThis.fetch;
  if (typeof doFetch !== 'function') {
    throw new RagPortError(
      'Qwen3 embedder requires a fetch implementation (config.fetch or a global fetch)',
    );
  }

  return {
    modelId,
    dim,
    async embed(texts) {
      if (!Array.isArray(texts)) throw new RagPortError('embed() expects an array of texts');
      if (texts.length === 0) return [];

      let res;
      try {
        res = await doFetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model: modelId, input: texts }),
        });
      } catch (err) {
        // Fail closed — never silently fall back to a non-semantic embedding.
        throw new RagPortError(`Qwen3 sidecar request failed (${url}): ${err.message}`);
      }

      if (!res || res.ok === false) {
        const status = res && res.status != null ? res.status : 'no-response';
        throw new RagPortError(`Qwen3 sidecar returned a non-OK response (status ${status})`);
      }

      let body;
      try {
        body = await res.json();
      } catch (err) {
        throw new RagPortError(`Qwen3 sidecar returned an unparseable body: ${err.message}`);
      }

      const vectors = extractVectors(body);
      if (!Array.isArray(vectors) || vectors.length !== texts.length) {
        throw new RagPortError(
          `Qwen3 sidecar returned ${Array.isArray(vectors) ? vectors.length : typeof vectors} ` +
            `vector(s) for ${texts.length} input(s)`,
        );
      }
      for (let i = 0; i < vectors.length; i++) {
        const v = vectors[i];
        if (!Array.isArray(v) || v.length !== dim) {
          // Fail closed — a mismatched dimension is not cosine-comparable.
          throw new RagPortError(
            `Qwen3 sidecar vector ${i} has dimension ` +
              `${Array.isArray(v) ? v.length : typeof v}, expected ${dim} (ADR-0112 §2/§5)`,
          );
        }
      }
      return vectors;
    },
  };
}
