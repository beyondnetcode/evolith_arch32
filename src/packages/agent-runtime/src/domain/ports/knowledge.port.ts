/**
 * IKnowledgePort — read-side port for querying the architectural knowledge corpus.
 *
 * GT-408: Agents need to consult ADRs, blueprints, standards, and rulesets
 * before acting. This port provides governed access to the indexed corpus
 * with citation/tracing of artifacts used.
 *
 * The port is provider-neutral: in-memory for tests, vector store for
 * production. The CI-layer rag-sync.mjs handles indexing (write-side);
 * this port handles querying (read-side).
 */

/**
 * A chunk of knowledge from the corpus with citation metadata.
 */
export interface KnowledgeChunk {
  /** Unique chunk identifier (deterministic: sha256(source::heading)::index). */
  readonly chunkId: string;
  /** Source file path relative to repo root. */
  readonly sourceFile: string;
  /** Section heading within the source file. */
  readonly sectionHeading: string;
  /** ADR ID if the chunk is from an ADR document, null otherwise. */
  readonly adrId: string | null;
  /** Language of the chunk (en, es). */
  readonly language: string;
  /** Estimated token count. */
  readonly tokenEstimate: number;
  /** Preview of the chunk content (first 120 chars). */
  readonly textPreview: string;
  /** Full text content of the chunk. */
  readonly text: string;
  /** Similarity score (0-1) if returned from a semantic search. */
  readonly score?: number;
  /**
   * Start character offset of the chunk within its source file, when the
   * write-side store records it (GT-538 `rag_chunks.char_start`). Optional so
   * offline/token adapters that don't track offsets stay contract-compliant.
   */
  readonly charStart?: number;
  /** End character offset within the source file (GT-538 `rag_chunks.char_end`). */
  readonly charEnd?: number;
  /**
   * Corpus release the chunk was embedded under (GT-541 · `rag_chunks.corpus_version`).
   * Agents cite it so a recommendation is traceable to the exact indexed corpus. Optional
   * so offline/token adapters that don't track a release stay contract-compliant.
   */
  readonly corpusVersion?: string;
  /**
   * GT-592 — which retrievers surfaced this chunk (`'bm25'`, `'dense'`, or both)
   * under hybrid retrieval. An agent that has to justify a recommendation needs
   * to know whether a citation came from an exact term match or from semantic
   * proximity; those two carry very different confidence. Optional so single-mode
   * adapters stay contract-compliant.
   */
  readonly retrievedBy?: readonly string[];
  /** GT-592 — 1-based rank in the BM25 list, when BM25 returned it. */
  readonly lexicalRank?: number;
  /** GT-592 — 1-based rank in the dense list, when dense returned it. */
  readonly denseRank?: number;
}

/**
 * Query parameters for knowledge corpus search.
 */
export interface KnowledgeQuery {
  /** Natural language query text. */
  readonly query: string;
  /** Maximum number of results to return. */
  readonly maxResults?: number;
  /** Filter by language. */
  readonly language?: string;
  /** Filter by ADR ID prefix (e.g., 'ADR-0073'). */
  readonly adrPrefix?: string;
  /** Filter by source file path prefix. */
  readonly sourcePrefix?: string;
}

/**
 * Result of a knowledge query with citation metadata.
 */
export interface KnowledgeResult {
  /** Matching chunks sorted by relevance. */
  readonly chunks: KnowledgeChunk[];
  /** Total number of chunks in the corpus (for context). */
  readonly totalChunks: number;
  /** Query that was executed. */
  readonly query: string;
}

/**
 * Direct document lookup result.
 */
export interface KnowledgeDocument {
  /** Source file path. */
  readonly sourceFile: string;
  /** All chunks from this document in order. */
  readonly chunks: KnowledgeChunk[];
  /** Document metadata. */
  readonly metadata: {
    readonly title?: string;
    readonly adrId?: string;
    readonly language: string;
  };
}

/**
 * Read-side port for querying the architectural knowledge corpus.
 *
 * Provider-neutral: in-memory for tests, vector store for production.
 * Agents use this to ground their recommendations in the corporate
 * reference corpus before acting.
 */
export interface IKnowledgePort {
  /**
   * Semantic search over the corpus. Returns chunks ranked by relevance.
   */
  query(request: KnowledgeQuery): Promise<KnowledgeResult>;

  /**
   * Direct document lookup by source file path.
   */
  getDocument(sourceFile: string): Promise<KnowledgeDocument | undefined>;

  /**
   * Returns the total number of indexed chunks (for diagnostics).
   */
  corpusSize(): Promise<number>;
}
