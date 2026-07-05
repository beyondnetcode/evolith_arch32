import type {
  IKnowledgePort,
  KnowledgeQuery,
  KnowledgeResult,
  KnowledgeDocument,
  KnowledgeChunk,
} from '../../domain/ports/knowledge.port';

/**
 * GT-408: In-memory stub adapter for the knowledge corpus.
 *
 * Used for tests and offline mode (design rule #5). Stores chunks in a
 * simple array and performs token-based matching for queries. No vector
 * embeddings — just substring + heading matching.
 *
 * Production deployments should use a vector-store-backed adapter.
 */
export class InMemoryKnowledgeAdapter implements IKnowledgePort {
  private readonly chunks: KnowledgeChunk[] = [];

  /**
   * Seed the adapter with chunks (for testing or offline corpus).
   */
  seed(chunks: KnowledgeChunk[]): void {
    this.chunks.push(...chunks);
  }

  /**
   * Clear all chunks (for test isolation).
   */
  clear(): void {
    this.chunks.length = 0;
  }

  async query(request: KnowledgeQuery): Promise<KnowledgeResult> {
    const maxResults = request.maxResults ?? 10;
    const queryLower = request.query.toLowerCase();

    let filtered = [...this.chunks];

    // Apply filters
    if (request.language) {
      filtered = filtered.filter(c => c.language === request.language);
    }
    if (request.adrPrefix) {
      filtered = filtered.filter(c => c.adrId?.startsWith(request.adrPrefix!));
    }
    if (request.sourcePrefix) {
      filtered = filtered.filter(c => c.sourceFile.startsWith(request.sourcePrefix!));
    }

    // Score by simple token overlap
    const scored = filtered.map(chunk => {
      const textLower = (chunk.text + ' ' + chunk.sectionHeading).toLowerCase();
      const queryTokens = queryLower.split(/\s+/);
      const matches = queryTokens.filter(t => textLower.includes(t)).length;
      const score = matches / queryTokens.length;
      return { chunk, score };
    });

    // Sort by score descending, take top N
    const results = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(s => ({ ...s.chunk, score: s.score }));

    return {
      chunks: results,
      totalChunks: this.chunks.length,
      query: request.query,
    };
  }

  async getDocument(sourceFile: string): Promise<KnowledgeDocument | undefined> {
    const docChunks = this.chunks.filter(c => c.sourceFile === sourceFile);
    if (docChunks.length === 0) return undefined;

    return {
      sourceFile,
      chunks: docChunks,
      metadata: {
        adrId: docChunks[0].adrId ?? undefined,
        language: docChunks[0].language,
      },
    };
  }

  async corpusSize(): Promise<number> {
    return this.chunks.length;
  }
}
