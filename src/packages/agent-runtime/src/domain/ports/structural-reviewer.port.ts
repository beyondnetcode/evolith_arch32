/**
 * IStructuralReviewer — the driven port that produces raw structural findings for
 * the structural-review rubric (GT-535). This is the PROBABILISTIC edge: a concrete
 * adapter is LLM-backed (an agent judging code against the seven standards), which
 * is why the emitted {@link Evidence} carries `determinism: 'probabilistic'`.
 *
 * Owned by the orchestration layer (agent-runtime), NEVER by core-domain. Keeping the
 * LLM/agent behind this port keeps {@link StructuralReviewProvider} pure of model I/O
 * so it can be unit-tested with a deterministic stub reviewer, and lets any engine
 * (Hermes, a local model, a human) back the same rubric without changing callers.
 */

import type {
  Determinism,
  EvidenceFindingSeverity,
} from '@beyondnet/evolith-core-domain/evaluation/contracts';

import type { StructuralStandardId } from '../rubrics/structural-review-rubric';

/** What the reviewer should judge — a code target, not source the Core stores. */
export interface StructuralReviewInput {
  /** Repository/commit reference the review runs against. */
  readonly repositoryRef?: string;
  /** Optional inline files (path + content) for the reviewer to inspect. */
  readonly files?: readonly { readonly path: string; readonly content: string }[];
  /** Free-form, reviewer-interpreted hints (never reach the Core). */
  readonly hints?: Readonly<Record<string, unknown>>;
}

/**
 * One raw structural finding as judged by the reviewer, keyed to a rubric standard.
 * `severity` is the reviewer's assessment of THIS instance (it may differ from the
 * standard's default). The provider ranks and normalizes these into canonical Evidence.
 */
export interface RawStructuralFinding {
  /** Which of the seven structural standards this finding violates. */
  readonly standardId: StructuralStandardId;
  /** Severity on the canonical hierarchy (reviewer's assessment of this instance). */
  readonly severity: EvidenceFindingSeverity;
  /** Human-readable explanation of the violation. */
  readonly message: string;
  /** Optional pointer (path:line, symbol) — a reference, never a copy. */
  readonly location?: string;
}

/**
 * A reviewer of the structural rubric.
 *
 * The seam was introduced for the PROBABILISTIC (LLM/agent-backed) case, which
 * is why that is still the default. GT-613 added the first shipped adapter and
 * it is deterministic ({@link HeuristicStructuralReviewer} measures rather than
 * judges), so an implementation MAY declare its own determinism class and the
 * provider will stamp that onto the Evidence instead of assuming. Declaring
 * `deterministic` is a claim about the implementation: same input, same findings,
 * no model and no network.
 */
export interface IStructuralReviewer {
  /** Judge the target against the seven structural standards; return raw findings. */
  review(input: StructuralReviewInput): Promise<readonly RawStructuralFinding[]>;
  /**
   * Determinism class of THIS implementation. Omitted ⇒ `probabilistic`, the
   * fail-safe reading: an unlabelled reviewer must never be presented as fact.
   */
  readonly determinism?: Determinism;
}
