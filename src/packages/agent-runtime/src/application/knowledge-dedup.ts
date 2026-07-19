/**
 * Duplicate resolution for knowledge candidates (ADR-0115) — the "do we already
 * know this?" step that must run before anything is proposed.
 *
 * Creating a new entry is the LAST resort. The priority is Reuse, then Extend,
 * then Relate, then Create, and the ordering is not stylistic: a corpus that
 * accumulates near-duplicates degrades every future retrieval against it, and
 * the degradation is silent. One entry answering a question well is worth more
 * than four entries answering it partially.
 *
 * The similarity signal comes from {@link IKnowledgePort}, so this module is
 * embedding-agnostic: it consumes scores, it does not compute them. That keeps
 * the decision testable without infrastructure, and means swapping the embedding
 * model changes retrieval quality without touching this logic.
 *
 * IMPORTANT — what a score means here. With a real semantic index a score is
 * cosine similarity. With the in-memory fallback it is token overlap, which is
 * far weaker. The thresholds below are calibrated for the former; against the
 * latter this will under-merge (propose Create where a human would Reuse). That
 * failure direction is the safe one, and it is why {@link resolveDuplicate}
 * reports the corpus size: a decision taken against an empty or tiny corpus is
 * not evidence of novelty, and callers must be able to tell the difference.
 */

import type { IKnowledgePort, KnowledgeChunk } from '../domain/ports/knowledge.port';

/**
 * What to do with a candidate, in the order the ADR mandates trying them.
 * `create` is deliberately last.
 */
export type DedupAction = 'reuse' | 'extend' | 'relate' | 'create';

export interface DedupThresholds {
  /** At or above this, the candidate says nothing new — point at what exists. */
  readonly reuse: number;
  /** At or above this, it belongs INSIDE an existing entry as new material. */
  readonly extend: number;
  /** At or above this, it is a distinct entry worth cross-linking. */
  readonly relate: number;
}

/**
 * Defaults chosen so the expensive mistake is the unlikely one. Creating a
 * duplicate is costlier than over-merging, because a duplicate is invisible
 * once written whereas a wrong merge is argued about in review.
 */
export const DEFAULT_DEDUP_THRESHOLDS: DedupThresholds = {
  reuse: 0.9,
  extend: 0.75,
  relate: 0.55,
};

export interface DedupMatch {
  /** Source file of the closest existing knowledge. */
  readonly sourceFile: string;
  /** Section within it, so a reviewer lands on the paragraph, not the document. */
  readonly sectionHeading: string;
  /** ADR id when the match is an ADR, else null. */
  readonly adrId: string | null;
  /** Similarity in [0,1]. */
  readonly score: number;
}

export interface DedupVerdict {
  readonly action: DedupAction;
  /** Highest similarity found; 0 when nothing matched. */
  readonly similarity: number;
  /** Closest matches, best first. Empty when the corpus had nothing. */
  readonly matches: readonly DedupMatch[];
  /** Corpus size at decision time — see the note on empty corpora above. */
  readonly corpusSize: number;
  /**
   * True when the verdict cannot be trusted as evidence of novelty because the
   * corpus was empty. A `create` on an empty corpus means "we know nothing",
   * not "this is new", and callers MUST NOT present it as the latter.
   */
  readonly inconclusive: boolean;
  /** Human-readable justification, suitable for a review comment verbatim. */
  readonly rationale: string;
}

/** Maps a similarity to an action. Pure, so the policy is inspectable and testable. */
export function actionForSimilarity(
  similarity: number,
  thresholds: DedupThresholds = DEFAULT_DEDUP_THRESHOLDS,
): DedupAction {
  if (similarity >= thresholds.reuse) return 'reuse';
  if (similarity >= thresholds.extend) return 'extend';
  if (similarity >= thresholds.relate) return 'relate';
  return 'create';
}

function describe(action: DedupAction, top: DedupMatch | undefined, inconclusive: boolean): string {
  if (inconclusive) {
    return 'The corpus is empty, so no comparison was possible. This is NOT evidence that the finding is new — index the corpus before treating a "create" as novelty.';
  }
  if (!top) {
    return 'Nothing in the corpus resembles this finding closely enough to reuse, extend or relate. Creating a new entry is justified.';
  }
  const where = `${top.sourceFile}#${top.sectionHeading}`;
  const pct = `${Math.round(top.score * 100)}%`;
  switch (action) {
    case 'reuse':
      return `${pct} similar to ${where}. The finding appears already covered — reference the existing entry instead of writing a new one.`;
    case 'extend':
      return `${pct} similar to ${where}. Add this as new material (a case, example or exception) INSIDE that entry rather than creating a sibling.`;
    case 'relate':
      return `${pct} similar to ${where}. Distinct enough to stand alone, close enough that the two should cross-reference each other.`;
    default:
      return `Closest match is ${where} at ${pct}, below the relate threshold. Creating a new entry is justified.`;
  }
}

export interface ResolveDuplicateOptions {
  readonly thresholds?: DedupThresholds;
  /** How many neighbours to retrieve; more context for the reviewer, same verdict. */
  readonly maxResults?: number;
}

/**
 * Asks the corpus whether a candidate is already known, and recommends what to
 * do. Advisory only — per ADR-0115 nothing here writes, promotes or decides.
 *
 * A retrieval failure yields an inconclusive verdict rather than a `create`:
 * inferring novelty from a broken lookup is how duplicates get written.
 */
export async function resolveDuplicate(
  knowledge: IKnowledgePort,
  candidateText: string,
  options: ResolveDuplicateOptions = {},
): Promise<DedupVerdict> {
  const thresholds = options.thresholds ?? DEFAULT_DEDUP_THRESHOLDS;

  let chunks: KnowledgeChunk[] = [];
  let corpusSize = 0;
  let failed = false;
  try {
    const result = await knowledge.query({ query: candidateText, maxResults: options.maxResults ?? 5 });
    chunks = result.chunks ?? [];
    corpusSize = result.totalChunks ?? 0;
  } catch {
    failed = true;
  }

  const matches: DedupMatch[] = chunks
    .map((c) => ({
      sourceFile: c.sourceFile,
      sectionHeading: c.sectionHeading,
      adrId: c.adrId,
      // A chunk without a score cannot argue for similarity, so it scores 0
      // rather than being dropped: the reviewer still sees it as context.
      score: typeof c.score === 'number' ? c.score : 0,
    }))
    .sort((a, b) => b.score - a.score);

  const similarity = matches.length ? matches[0].score : 0;
  const inconclusive = failed || corpusSize === 0;
  const action = inconclusive ? 'create' : actionForSimilarity(similarity, thresholds);
  const top = matches[0];

  return {
    action,
    similarity,
    matches,
    corpusSize,
    inconclusive,
    rationale: describe(action, top, inconclusive),
  };
}
