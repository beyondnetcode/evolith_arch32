/**
 * ICoreEvaluationPort — the runtime's window into the stateless Evolith Core
 * Evaluation Engine (ADR-0101).
 *
 * The runtime sends the canonical {@link EvaluationContext} and receives the
 * canonical {@link EvaluationResult}. It NEVER reaches into Core internals; the
 * Core remains deterministic, auditable and contract-governed. The concrete
 * adapter may call Core in-process, over HTTP, or via a `.harness` validator —
 * the runtime does not care.
 */

import type {
  EvaluationContext,
  EvaluationResult,
} from '@beyondnet/evolith-core-domain/evaluation/contracts';

/**
 * Inline satellite content the stateless Core evaluates in memory (GT-438 /
 * ADR-0101). `files` is a map of RELATIVE posix path -> content — the exact
 * `evaluationInput.files` shape the Core API accepts and mounts on its
 * `OverlayFileSystem`. Must include `evolith.yaml` at the satellite root for a
 * substantive (non GOV-000) evaluation.
 */
export interface InlineEvaluationInput {
  readonly files: Readonly<Record<string, string>>;
}

/**
 * The canonical {@link EvaluationContext} plus the OPTIONAL inline workspace
 * content. Additive and backward compatible: a plain `EvaluationContext` (no
 * `evaluationInput`) is still assignable, so callers/adapters that never assemble
 * a workspace keep their prior behaviour.
 */
export interface RuntimeEvaluationContext extends EvaluationContext {
  readonly evaluationInput?: InlineEvaluationInput;
}

export interface ICoreEvaluationPort {
  evaluate(context: RuntimeEvaluationContext): Promise<EvaluationResult>;
}

export type { EvaluationContext, EvaluationResult };
