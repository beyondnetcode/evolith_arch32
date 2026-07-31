/**
 * GT-592 — Reciprocal Rank Fusion (Cormack et al., 2009). Pure domain.
 *
 * Fuses the BM25 ranking with the dense ranking on RANK, not on score. That
 * choice is deliberate: BM25 scores are unbounded and corpus-dependent while
 * cosine similarities live in [-1, 1], so any score-level combination needs a
 * normalization step whose constants are themselves a tuning knob. RRF has one
 * constant (`k`, conventionally 60) and it is not corpus-dependent.
 *
 * `k = 60` and equal list weights are the published defaults and are fixed here
 * BEFORE any measurement in this repository, so the eval numbers are a
 * measurement rather than the result of fitting the fusion to the query set.
 */

/** Published RRF default (Cormack et al., SIGIR 2009). */
export const DEFAULT_RRF_K = 60;

export interface RankedList {
  /** Identifier of the list, surfaced in the fused explanation (`bm25`, `dense`). */
  readonly name: string;
  /** Document ids in descending relevance. */
  readonly ids: readonly string[];
  /** Multiplier on this list's reciprocal-rank contribution. Default 1. */
  readonly weight?: number;
}

export interface FusedHit {
  readonly id: string;
  readonly score: number;
  /** 1-based rank this id held in each contributing list, when it appeared. */
  readonly ranks: Readonly<Record<string, number>>;
}

/**
 * Fuse ranked lists by weighted RRF.
 *
 * An id absent from a list simply contributes nothing for that list, which is
 * the property that makes RRF usable when the two retrievers return different
 * candidate sets — the common case here, since BM25 returns nothing at all for
 * a document that shares no term with the query.
 *
 * Ties break on id so the output is deterministic.
 */
export function reciprocalRankFusion(
  lists: readonly RankedList[],
  k: number = DEFAULT_RRF_K,
): FusedHit[] {
  const scores = new Map<string, number>();
  const ranks = new Map<string, Record<string, number>>();

  for (const list of lists) {
    const weight = list.weight ?? 1;
    list.ids.forEach((id, index) => {
      const rank = index + 1;
      scores.set(id, (scores.get(id) ?? 0) + weight / (k + rank));
      const perId = ranks.get(id) ?? {};
      perId[list.name] = rank;
      ranks.set(id, perId);
    });
  }

  return Array.from(scores.entries())
    .map(([id, score]) => ({ id, score, ranks: ranks.get(id) ?? {} }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, 'en'));
}
