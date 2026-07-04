/**
 * KindEvaluator — pluggable per-kind evaluator for the Core Evaluation Engine
 * (GT-379 / ADR-0101).
 *
 * The EvaluationOrchestrator always runs the pipeline (gate/artifact/rule/
 * compliance). Additional kinds (architecture, blueprint, topology, checkpoint,
 * deployment) are evaluated by registered KindEvaluators and merged into the
 * EvaluationResult. Concrete evaluators live in the surface/adapter layer (e.g.
 * core-api wraps ArchitectureDriftService); core-domain only defines the port,
 * so it stays decoupled from each engine's native types.
 */

import type {
  EvaluationContext,
  EvaluationKind,
  EvaluationResult,
  GapFinding,
  RiskFinding,
  Recommendation,
  RequiredAction,
} from '../contracts';
import type { Verdict } from '../../domain/verdict/verdict';
import type { ResolvedWorkspace } from './workspace-reference-resolver.port';

/** What a per-kind evaluator contributes to the aggregate EvaluationResult. */
export interface KindEvaluation {
  readonly verdict: Verdict;
  /** The per-engine sub-result(s) this kind produces (merged into result.results). */
  readonly results: Partial<EvaluationResult['results']>;
  readonly gaps?: readonly GapFinding[];
  readonly risks?: readonly RiskFinding[];
  readonly recommendations?: readonly Recommendation[];
  readonly requiredActions?: readonly RequiredAction[];
}

export interface KindEvaluator {
  /** The EvaluationKind this evaluator handles (e.g. 'architecture'). */
  readonly kind: EvaluationKind;
  evaluate(ctx: EvaluationContext, workspace: ResolvedWorkspace): Promise<KindEvaluation>;
}
