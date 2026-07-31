/**
 * GT-592 — Okapi BM25 ranking. Pure domain, no store, no vendor.
 *
 * The lexical half of hybrid retrieval. BM25 is the right instrument for a
 * corpus queried by exact identifiers: a rare term such as `adr-0111` gets a
 * high IDF and dominates the score, which is precisely the behaviour dense
 * cosine similarity cannot reproduce — an embedding of `ADR-0111` sits near the
 * embeddings of every other ADR heading, because the model encodes "this is an
 * ADR reference", not "this is ADR number one hundred and eleven".
 *
 * Parameters are the literature defaults (k1 = 1.2, b = 0.75). They are fixed
 * BEFORE any evaluation in this repository, and the CI eval harness reports the
 * values it ran with, so a tuned number can never be presented as a measured one.
 */

import { termFrequencies, type TermFrequencies } from './tokenize';

/** Okapi BM25 free parameters. */
export interface Bm25Params {
  /** Term-frequency saturation. Literature default 1.2. */
  readonly k1: number;
  /** Document-length normalization, 0 = none, 1 = full. Literature default 0.75. */
  readonly b: number;
}

export const DEFAULT_BM25_PARAMS: Bm25Params = { k1: 1.2, b: 0.75 };

/**
 * Corpus-level statistics BM25 needs. Supplied by whichever adapter owns the
 * index — an in-memory one computes them directly, the Postgres one reads them
 * with `count(*)` and a per-term document-frequency query.
 */
export interface Bm25CorpusStats {
  /** Total number of documents (chunks) in the corpus. */
  readonly corpusSize: number;
  /**
   * Mean document length, in the SAME unit as `TermFrequencies.length`
   * (characters of the indexed text — see the note there for why).
   */
  readonly averageDocumentLength: number;
  /** Per-term document frequency: how many documents contain the term. */
  readonly documentFrequency: ReadonlyMap<string, number>;
}

/** A candidate document with its term statistics already counted. */
export interface Bm25Candidate {
  readonly id: string;
  readonly terms: TermFrequencies;
}

export interface Bm25Hit {
  readonly id: string;
  readonly score: number;
  /** Number of distinct query terms that actually matched. Diagnostics only. */
  readonly matchedTerms: number;
}

/**
 * Robertson/Sparck-Jones IDF with the +1 smoothing that keeps it non-negative
 * even for a term present in every document.
 */
export function idf(documentFrequency: number, corpusSize: number): number {
  const df = Math.max(0, documentFrequency);
  const n = Math.max(1, corpusSize);
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
}

/** BM25 score of one document against the (deduplicated) query terms. */
export function scoreDocument(
  terms: readonly string[],
  candidate: Bm25Candidate,
  stats: Bm25CorpusStats,
  params: Bm25Params = DEFAULT_BM25_PARAMS,
): Bm25Hit {
  const { k1, b } = params;
  const avgdl = stats.averageDocumentLength > 0 ? stats.averageDocumentLength : 1;
  const dl = candidate.terms.length;

  let score = 0;
  let matchedTerms = 0;
  for (const term of terms) {
    const tf = candidate.terms.counts.get(term) ?? 0;
    if (tf === 0) continue;
    matchedTerms += 1;
    const df = stats.documentFrequency.get(term) ?? 0;
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + (b * dl) / avgdl);
    score += idf(df, stats.corpusSize) * (numerator / denominator);
  }
  return { id: candidate.id, score, matchedTerms };
}

/**
 * Rank candidates by BM25, descending. Zero-scoring candidates are dropped —
 * a document that matches no query term is not a lexical result at all.
 *
 * Ties break on `id` so the ranking is deterministic across runs and platforms;
 * a retrieval eval that gates CI cannot afford a ranking that depends on the
 * order rows came back from a database.
 */
export function rankBm25(
  terms: readonly string[],
  candidates: readonly Bm25Candidate[],
  stats: Bm25CorpusStats,
  params: Bm25Params = DEFAULT_BM25_PARAMS,
): Bm25Hit[] {
  return candidates
    .map((c) => scoreDocument(terms, c, stats, params))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, 'en'));
}

/** Convenience: build a candidate from raw text using the shared tokenizer. */
export function candidateFromText(id: string, text: string): Bm25Candidate {
  return { id, terms: termFrequencies(text) };
}

/**
 * Compute corpus statistics from a full set of documents. Used by the in-memory
 * index and the CI eval harness; the Postgres adapter reads its statistics from
 * SQL instead so it never has to materialize the corpus.
 */
export function corpusStatsFrom(candidates: readonly Bm25Candidate[]): Bm25CorpusStats {
  const documentFrequency = new Map<string, number>();
  let totalLength = 0;
  for (const c of candidates) {
    totalLength += c.terms.length;
    for (const term of c.terms.counts.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }
  return {
    corpusSize: candidates.length,
    averageDocumentLength: candidates.length > 0 ? totalLength / candidates.length : 0,
    documentFrequency,
  };
}
