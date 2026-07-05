/**
 * InProcessCoreEvaluationAdapter — the PRODUCTION {@link ICoreEvaluationPort}
 * that runs the stateless Core Evaluation Engine in-process (ADR-0101 / GT-384).
 *
 * It is a thin seam, not new logic: it wraps the Core's `EvaluationOrchestrator`,
 * whose `evaluate(EvaluationContext): Promise<EvaluationResult>` is already the
 * exact shape of this port. The heavy composition (pipeline + workspace resolver
 * + kind evaluators) lives in the host's composition root, which constructs the
 * orchestrator and injects it here — so this adapter neither imports the concrete
 * orchestrator nor re-implements any evaluation logic.
 *
 * Unlike {@link StubCoreEvaluationAdapter}, the real engine actually executes
 * rules and policies, so `rulesExecuted` / `policiesApplied` are populated.
 */

import type {
  ICoreEvaluationPort,
  EvaluationContext,
  EvaluationResult,
} from '../../domain/ports/core-evaluation.port';

/**
 * Structural type of the Core's stateless orchestrator. Matching
 * `EvaluationOrchestrator` from `@beyondnet/evolith-core-domain/evaluation` by shape keeps
 * this adapter decoupled from the concrete Core wiring (and lets a host inject an
 * in-process orchestrator or any equivalent facade).
 */
export interface CoreEvaluationOrchestrator {
  evaluate(context: EvaluationContext): Promise<EvaluationResult>;
}

export class InProcessCoreEvaluationAdapter implements ICoreEvaluationPort {
  constructor(private readonly orchestrator: CoreEvaluationOrchestrator) {}

  evaluate(context: EvaluationContext): Promise<EvaluationResult> {
    return this.orchestrator.evaluate(context);
  }
}
