/**
 * GT-573 — ONE construction site for the Core Evaluation Engine entry point.
 *
 * Before this, `POST /api/v1/evaluate` had two response shapes for one
 * operation: the `workspaceRef` branch returned the canonical `EvaluationResult`
 * (`overallVerdict` / `outcome` / `results.gate[]` / `evaluatedAt`), while the
 * inline (`evaluationInput.files`) branch returned the legacy pipeline envelope
 * (`{ topology, gates, summary }`). Every field the Tracker binds was missing on
 * the inline branch, so its mapper fell through to `SKIPPED` and persisted a
 * "not applicable" ledger entry over a real architectural FAIL.
 *
 * The fix is structural, not a mapper: BOTH branches now build an
 * `EvaluationOrchestrator` through this single factory — same core version, same
 * registered {@link KindEvaluator} set — and differ only in the two ports the
 * orchestrator already abstracts (which pipeline runs, and how the workspace is
 * resolved). One operation, one shape.
 */

import {
  EvaluationOrchestrator,
  type IEvaluationPipeline,
  type IWorkspaceReferenceResolver,
  type KindEvaluator,
} from '@beyondnet/evolith-core-domain/evaluation';

/** Core version stamped into `EvaluationResult.versions.core` (GT-378). */
export const CORE_VERSION = '1.0.5';

/**
 * DI token for {@link EvaluationOrchestratorFactory}. Injected by the
 * `EvaluationController` so the inline branch composes the SAME orchestrator the
 * canonical branch uses, but bound to a per-request overlay pipeline.
 */
export const EVALUATION_ORCHESTRATOR_FACTORY = 'EVALUATION_ORCHESTRATOR_FACTORY';

/** Builds an orchestrator over the given ports with the deployment's evaluator set. */
export type EvaluationOrchestratorFactory = (
  pipeline: IEvaluationPipeline,
  resolver: IWorkspaceReferenceResolver,
) => EvaluationOrchestrator;

/**
 * Curries the deployment-wide configuration (core version + kind evaluators) so
 * every call site produces an orchestrator that is identical except for the two
 * ports it is handed.
 */
export function makeEvaluationOrchestratorFactory(
  kindEvaluators: readonly KindEvaluator[],
  coreVersion: string = CORE_VERSION,
): EvaluationOrchestratorFactory {
  return (pipeline, resolver) =>
    new EvaluationOrchestrator(pipeline, resolver, coreVersion, kindEvaluators);
}
