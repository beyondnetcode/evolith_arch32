/**
 * GT-592 — `VectorMemoryKnowledgeAdapter`: exact cosine top-k over vectors held
 * in process.
 *
 * This is NOT a stand-in for the dense retriever. It is the same retrieval
 * function the pgvector adapter computes — cosine similarity against the query
 * embedding — differing only in where the vectors live and in doing an exact
 * scan instead of an HNSW approximation. Given the SAME embeddings it produces
 * the same ranking, and being exact it produces a ranking pgvector's ANN index
 * can only approximate.
 *
 * That is precisely what the CI retrieval eval needs. The eval replays real
 * Qwen3-Embedding-0.6B vectors frozen into a fixture, so a CI runner with no
 * Postgres and no inference sidecar still measures the real dense baseline
 * rather than a hash-embedding cartoon of it. The embeddings are the expensive,
 * infrastructure-bound part; the cosine is arithmetic.
 *
 * The `embed` seam is injected exactly as in the pgvector adapter, so the model
 * is never chosen here.
 */

import type {
  IKnowledgePort,
  KnowledgeQuery,
  KnowledgeResult,
  KnowledgeDocument,
  KnowledgeChunk,
} from '../../domain/ports/knowledge.port';
import type { EmbedQuery } from './pgvector-knowledge.adapter';

export interface VectorMemoryEntry {
  readonly chunk: KnowledgeChunk;
  readonly embedding: readonly number[];
}

export interface VectorMemoryKnowledgeConfig {
  readonly embed: EmbedQuery;
  readonly defaultMaxResults?: number;
  /**
   * Require every stored and query vector to have this dimension. Defaults to
   * the dimension of the first seeded vector — the store's own dimension is the
   * contract, and a vector of another dimension is not cosine-comparable with it.
   */
  readonly expectedDim?: number;
}

function dot(a: readonly number[], b: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function norm(a: readonly number[]): number {
  return Math.sqrt(dot(a, a));
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

export class VectorMemoryKnowledgeAdapter implements IKnowledgePort {
  private readonly entries: VectorMemoryEntry[] = [];
  private readonly embed: EmbedQuery;
  private readonly defaultMaxResults: number;
  private expectedDim?: number;

  constructor(config: VectorMemoryKnowledgeConfig) {
    if (typeof config.embed !== 'function') {
      throw new Error('[vector-memory-knowledge] an `embed` seam is required.');
    }
    this.embed = config.embed;
    this.defaultMaxResults = config.defaultMaxResults ?? 10;
    this.expectedDim = config.expectedDim;
  }

  seed(entries: readonly VectorMemoryEntry[]): void {
    for (const entry of entries) {
      if (this.expectedDim === undefined) this.expectedDim = entry.embedding.length;
      if (entry.embedding.length !== this.expectedDim) {
        throw new Error(
          `[vector-memory-knowledge] chunk ${entry.chunk.chunkId} has dimension ` +
            `${entry.embedding.length}, store dimension is ${this.expectedDim} — not cosine-comparable.`,
        );
      }
      this.entries.push(entry);
    }
  }

  clear(): void {
    this.entries.length = 0;
  }

  async corpusSize(): Promise<number> {
    return this.entries.length;
  }

  async query(request: KnowledgeQuery): Promise<KnowledgeResult> {
    const maxResults = request.maxResults ?? this.defaultMaxResults;
    const vector = await this.embed(request.query);
    if (this.expectedDim !== undefined && vector.length !== this.expectedDim) {
      throw new Error(
        `[vector-memory-knowledge] query embedding dimension ${vector.length} != store dim ` +
          `${this.expectedDim} — fail closed rather than rank on meaningless distances.`,
      );
    }

    const filtered = this.entries.filter((entry) => {
      const c = entry.chunk;
      if (request.language && c.language !== request.language) return false;
      if (request.adrPrefix && !(c.adrId ?? '').startsWith(request.adrPrefix)) return false;
      if (request.sourcePrefix && !c.sourceFile.startsWith(request.sourcePrefix)) return false;
      return true;
    });

    const chunks = filtered
      .map((entry) => ({
        chunk: entry.chunk,
        score: cosineSimilarity(vector, entry.embedding),
      }))
      // Ties break on chunkId so the ranking is deterministic across runs.
      .sort((a, b) => b.score - a.score || a.chunk.chunkId.localeCompare(b.chunk.chunkId, 'en'))
      .slice(0, maxResults)
      .map(({ chunk, score }) => ({ ...chunk, score }));

    return { chunks, totalChunks: this.entries.length, query: request.query };
  }

  async getDocument(sourceFile: string): Promise<KnowledgeDocument | undefined> {
    const chunks = this.entries
      .filter((e) => e.chunk.sourceFile === sourceFile)
      .map((e) => e.chunk)
      .sort((a, b) => (a.charStart ?? 0) - (b.charStart ?? 0));
    if (chunks.length === 0) return undefined;
    return {
      sourceFile,
      chunks,
      metadata: { adrId: chunks[0].adrId ?? undefined, language: chunks[0].language },
    };
  }
}
