/**
 * EvaluationOrchestrator — the single stateless entry point of the Core
 * Evaluation Engine (GT-378/GT-379 / ADR-0101).
 *
 * Receives a canonical EvaluationContext, composes the existing pipeline
 * (no rewrite) for the gate/artifact/rule/compliance kinds, and dispatches any
 * additional requested kinds (architecture, blueprint, topology, checkpoint,
 * deployment) to registered KindEvaluators, merging everything into one
 * canonical EvaluationResult. The Core EVALUATES and RECOMMENDS; it never
 * owns/persists product/tenant/initiative, and never emits a binding
 * GateDecision (that is the Tracker's).
 */

import { Verdict } from '../domain/verdict/verdict';
import type { EvaluationContext } from './contracts';
import { EvaluationResult, DecisionRecommendation } from './contracts';
import type { IEvaluationPipeline } from './ports/evaluation-pipeline.port';
import type { IWorkspaceReferenceResolver, ResolvedWorkspace } from './ports/workspace-reference-resolver.port';
import type { KindEvaluator, KindEvaluation } from './ports/kind-evaluator.port';
import { manifestFromWorkspace } from './evaluation-context.builder';
import { mapPipelineVerdict } from './canonical-result.mapper';

export class EvaluationOrchestrator {
  private readonly evaluatorsByKind: Map<string, KindEvaluator>;

  constructor(
    private readonly pipeline: IEvaluationPipeline,
    private readonly resolver: IWorkspaceReferenceResolver,
    private readonly coreVersion: string = 'unknown',
    kindEvaluators: readonly KindEvaluator[] = [],
  ) {
    this.evaluatorsByKind = new Map(kindEvaluators.map((e) => [e.kind, e]));
  }

  async evaluate(ctx: EvaluationContext): Promise<EvaluationResult> {
    const workspace = await this.resolveWorkspace(ctx);

    // Core kinds (gate/artifact/rule/compliance) come from the existing pipeline.
    const verdict = await this.pipeline.evaluate(manifestFromWorkspace(ctx, workspace));
    let result = mapPipelineVerdict(verdict, {
      coreVersion: this.coreVersion,
      correlationId: ctx.correlationId,
      ruleset: ctx.rulesetRef,
      rulesetVersion: ctx.rulesetVersion,
      evaluatedAt: verdict.evaluatedAt,
    });

    // Dispatch additional requested kinds to registered evaluators and merge.
    for (const kind of ctx.kinds) {
      const evaluator = this.evaluatorsByKind.get(kind);
      if (!evaluator) continue; // not wired on this deployment → sub-result simply absent
      const ke = await evaluator.evaluate(ctx, workspace);
      result = this.merge(result, ke);
    }

    // Recompute the non-binding decision recommendation from the final verdict.
    return {
      ...result,
      decisionRecommendation: this.buildDecisionRecommendation(ctx, result.overallVerdict),
    };
  }

  private async resolveWorkspace(ctx: EvaluationContext): Promise<ResolvedWorkspace> {
    if (!ctx.workspaceRef) {
      throw new Error(
        'EvaluationContext.workspaceRef is required to resolve a workspace for evaluation',
      );
    }
    return this.resolver.resolve(ctx.workspaceRef);
  }

  private merge(base: EvaluationResult, ke: KindEvaluation): EvaluationResult {
    const overallVerdict =
      base.overallVerdict === Verdict.FAIL || ke.verdict === Verdict.FAIL
        ? Verdict.FAIL
        : base.overallVerdict;
    return {
      ...base,
      overallVerdict,
      outcome: overallVerdict === Verdict.FAIL ? 'rejected' : base.outcome,
      results: { ...base.results, ...ke.results },
      gaps: [...base.gaps, ...(ke.gaps ?? [])],
      risks: [...base.risks, ...(ke.risks ?? [])],
      recommendations: [...base.recommendations, ...(ke.recommendations ?? [])],
      requiredActions: [...base.requiredActions, ...(ke.requiredActions ?? [])],
    };
  }

  /** Non-binding recommendation; the Tracker decides and persists the canonical GateDecision. */
  private buildDecisionRecommendation(
    ctx: EvaluationContext,
    verdict: Verdict,
  ): DecisionRecommendation {
    const subjectType: DecisionRecommendation['subjectType'] = ctx.gateId
      ? 'gate'
      : ctx.phaseId
        ? 'phase'
        : ctx.initiative
          ? 'initiative'
          : 'product';
    const subjectRef =
      ctx.gateId ??
      ctx.phaseId ??
      ctx.initiative?.initiativeId ??
      ctx.product?.productId ??
      'unknown';
    return {
      subjectType,
      subjectRef,
      recommendedVerdict: verdict,
      binding: false,
      recommendedBy: 'evolith-core',
    };
  }
}
