/**
 * GT-592 — `ILexicalIndexPort`: the lexical half of hybrid retrieval.
 *
 * Deliberately separate from {@link IKnowledgePort}. `IKnowledgePort` is the
 * agent-facing read side and answers "give me relevant chunks"; this port is an
 * infrastructure seam that answers the much smaller question "which chunks even
 * contain these terms, and what are the corpus statistics BM25 needs". Keeping
 * them apart is what lets the SAME BM25 implementation rank a Postgres-backed
 * corpus and an in-memory one — the store varies, the ranking never does.
 *
 * The port returns candidates and statistics, NOT a ranking. Ranking is domain
 * logic (`domain/retrieval/bm25.ts`); if an adapter ranked, every store would
 * own a private copy of the scoring function and the CI eval would measure
 * something other than what production runs.
 */

import type { Bm25CorpusStats } from '../retrieval/bm25';
import type { TermFrequencies } from '../retrieval/tokenize';
import type { KnowledgeChunk } from './knowledge.port';

/** Metadata filters, mirroring the `IKnowledgePort` filter fields (ADR-0090 §2). */
export interface LexicalFilters {
  readonly language?: string;
  readonly adrPrefix?: string;
  readonly sourcePrefix?: string;
}

export interface LexicalCandidateRequest {
  /** Distinct query terms produced by the shared tokenizer. */
  readonly terms: readonly string[];
  /** Upper bound on candidates to materialize. */
  readonly limit: number;
  readonly filters?: LexicalFilters;
}

/** One candidate: the chunk itself plus its counted terms. */
export interface LexicalCandidate {
  readonly chunk: KnowledgeChunk;
  readonly terms: TermFrequencies;
}

export interface LexicalCandidateSet {
  /** Documents that contain at least one query term, with term counts. */
  readonly candidates: readonly LexicalCandidate[];
  /** Corpus statistics measured over the WHOLE corpus, not the candidate set. */
  readonly stats: Bm25CorpusStats;
}

/**
 * Read-side lexical seam.
 *
 * Implementations MUST compute `stats` over the entire corpus. Deriving IDF
 * from the candidate set instead would make every retrieved term look rare and
 * silently destroy the identifier advantage this port exists to provide.
 */
export interface ILexicalIndexPort {
  candidates(request: LexicalCandidateRequest): Promise<LexicalCandidateSet>;
  /** Total indexed chunks — used for diagnostics and for the hybrid result. */
  corpusSize(): Promise<number>;
}
