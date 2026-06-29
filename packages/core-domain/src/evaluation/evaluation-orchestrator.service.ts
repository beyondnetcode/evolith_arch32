/**
 * EvaluationOrchestrator — the single stateless entry point of the Core
 * Evaluation Engine (GT-378 / ADR-0101).
 *
 * Receives a canonical EvaluationContext, composes the existing pipeline
 * (no rewrite), and returns a canonical EvaluationResult. The Core EVALUATES
 * and RECOMMENDS; it never owns/persists product/tenant/initiative, and never
 * emits a binding GateDecision (that is the Tracker's).
 */

import { Verdict } from '../domain/verdict/verdict';
import type { EvaluationContext } from './contracts';
import { EvaluationResult, DecisionRecommendation } from './contracts';
import type { IEvaluationPipeline } from './ports/evaluation-pipeline.port';
import type { IWorkspaceReferenceResolver } from './ports/workspace-reference-resolver.port';
import { buildSatelliteManifest } from './evaluation-context.builder';
import { mapPipelineVerdict } from './canonical-result.mapper';

export class EvaluationOrchestrator {
  constructor(
    private readonly pipeline: IEvaluationPipeline,
    private readonly resolver: IWorkspaceReferenceResolver,
    private readonly coreVersion: string = 'unknown',
  ) {}

  async evaluate(ctx: EvaluationContext): Promise<EvaluationResult> {
    const manifest = await buildSatelliteManifest(ctx, this.resolver);
    const verdict = await this.pipeline.evaluate(manifest);

    return mapPipelineVerdict(verdict, {
      coreVersion: this.coreVersion,
      correlationId: ctx.correlationId,
      ruleset: ctx.rulesetRef,
      rulesetVersion: ctx.rulesetVersion,
      evaluatedAt: verdict.evaluatedAt,
      decisionRecommendation: this.buildDecisionRecommendation(ctx, verdict.passed),
    });
  }

  /** Non-binding recommendation; the Tracker decides and persists the canonical GateDecision. */
  private buildDecisionRecommendation(
    ctx: EvaluationContext,
    passed: boolean,
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
      recommendedVerdict: passed ? Verdict.PASS : Verdict.FAIL,
      binding: false,
      recommendedBy: 'evolith-core',
    };
  }
}
