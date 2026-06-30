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
} from '@evolith/core-domain/evaluation/contracts';

export interface ICoreEvaluationPort {
  evaluate(context: EvaluationContext): Promise<EvaluationResult>;
}

export type { EvaluationContext, EvaluationResult };
