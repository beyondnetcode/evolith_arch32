/**
 * GT-592 / GT-539 · ADR-0112 §4 — `EmbedQuery` over an on-perimeter inference
 * sidecar.
 *
 * The write side already had this (`.harness/scripts/ci/rag-embed-qwen3.mjs`),
 * but that lives in the CI harness and is not importable from the published
 * package, so the READ side had no way to embed a query and the production
 * `IKnowledgePort` could not actually be wired to anything. This is that missing
 * seam, and it is the reason a knowledge MCP tool can exist at all.
 *
 * Per ADR-0112 §4 the model runs in a sidecar, never in this process: embeddings
 * are computed on-perimeter and no corpus text leaves the deployment. The
 * endpoint, model id and dimension are configuration, so switching model is a
 * re-embed rather than a code change (ADR-0090 §3 — the port stays
 * model-agnostic).
 *
 * `fetch` is an injected seam so unit tests never touch the network, and the
 * module imports no network library at load time.
 *
 * Fails closed on: missing endpoint, transport error, non-OK response,
 * unparseable body, or a vector whose dimension is not the configured one.
 * A wrong-dimension vector is not cosine-comparable with the store, so returning
 * it would produce a confidently-ordered, meaningless ranking.
 */

import type { EmbedQuery } from './pgvector-knowledge.adapter';

/** ADR-0112 §1 — default self-hosted OSS model. */
export const DEFAULT_EMBED_MODEL = 'qwen3-embedding-0.6b';
/** ADR-0112 §2 — Qwen3 Matryoshka maximum; the pgvector column is vector(1024). */
export const DEFAULT_EMBED_DIM = 1024;

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export interface HttpEmbeddingConfig {
  /** Sidecar endpoint. Falls back to `EVOLITH_RAG_EMBED_URL`. */
  readonly url?: string;
  readonly model?: string;
  readonly dim?: number;
  readonly fetch?: FetchLike;
}

/** Accept OpenAI-style `{data:[{embedding}]}`, TEI-style `[[…]]`, or `{embeddings}`. */
function extractVectors(body: unknown): number[][] | null {
  const pick = (entry: unknown): number[] | undefined =>
    Array.isArray(entry)
      ? (entry as number[])
      : (entry as { embedding?: number[] } | null)?.embedding;
  const collect = (list: unknown[]): number[][] | null => {
    const out: number[][] = [];
    for (const entry of list) {
      const vec = pick(entry);
      if (!Array.isArray(vec)) return null;
      out.push(vec);
    }
    return out;
  };
  if (Array.isArray(body)) return collect(body);
  const obj = body as { data?: unknown[]; embeddings?: unknown[] } | null;
  if (obj && Array.isArray(obj.data)) return collect(obj.data);
  if (obj && Array.isArray(obj.embeddings)) return collect(obj.embeddings);
  return null;
}

export class HttpEmbeddingAdapter {
  readonly modelId: string;
  readonly dim: number;
  private readonly url: string;
  private readonly doFetch: FetchLike;

  constructor(config: HttpEmbeddingConfig = {}) {
    const url = config.url ?? process.env.EVOLITH_RAG_EMBED_URL;
    if (!url) {
      throw new Error(
        '[http-embedding] an embedding sidecar URL is required (config.url or EVOLITH_RAG_EMBED_URL).',
      );
    }
    this.url = url;
    this.modelId = config.model ?? process.env.EVOLITH_RAG_EMBED_MODEL ?? DEFAULT_EMBED_MODEL;
    this.dim = Number(config.dim ?? process.env.EVOLITH_RAG_EMBED_DIM ?? DEFAULT_EMBED_DIM);
    const fetchImpl = config.fetch ?? (globalThis.fetch as unknown as FetchLike | undefined);
    if (typeof fetchImpl !== 'function') {
      throw new Error('[http-embedding] requires a fetch implementation (config.fetch or a global fetch).');
    }
    this.doFetch = fetchImpl;
  }

  async embed(texts: readonly string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await this.doFetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.modelId, input: [...texts] }),
      });
    } catch (error) {
      throw new Error(
        `[http-embedding] transport error calling ${this.url}: ${(error as Error).message}`,
      );
    }
    if (!response.ok) {
      throw new Error(`[http-embedding] sidecar responded ${response.status} for ${this.url}`);
    }

    let parsed: unknown;
    const raw = await response.text();
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`[http-embedding] sidecar returned a non-JSON body (${raw.slice(0, 120)}…)`);
    }

    const vectors = extractVectors(parsed);
    if (!vectors) {
      throw new Error('[http-embedding] could not find embeddings in the sidecar response body.');
    }
    if (vectors.length !== texts.length) {
      throw new Error(
        `[http-embedding] asked for ${texts.length} embeddings, received ${vectors.length}.`,
      );
    }
    for (const vec of vectors) {
      if (vec.length !== this.dim) {
        throw new Error(
          `[http-embedding] vector dimension ${vec.length} != configured ${this.dim} — ` +
            `not cosine-comparable with the store (ADR-0112 §2, fail closed).`,
        );
      }
    }
    return vectors;
  }

  /** The single-text `EmbedQuery` seam the knowledge adapters consume. */
  asEmbedQuery(): EmbedQuery {
    return async (text: string) => (await this.embed([text]))[0];
  }
}
