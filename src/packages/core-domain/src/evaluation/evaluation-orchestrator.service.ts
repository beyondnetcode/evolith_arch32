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
 *
 * GT-614 — `ctx.kinds` is now read BEFORE anything executes. The pipeline runs
 * only when a pipeline kind was actually requested, and a kind no one can serve is
 * REFUSED ({@link UnsupportedEvaluationKindError}) instead of being dropped, so a
 * consumer never receives a verdict shaped by gates it did not ask for and never
 * mistakes an unanswered question for a PASS. The selection does not stop at the
 * pipeline boundary either: the request is handed to the pipeline as a
 * {@link PipelineExecutionPlan}, so a pipeline assembled from kind-tagged gates
 * (`createKindSelectivePipeline`) executes the gates the requested kinds need and no
 * others — asking for `compliance` alone stops paying for every phase gate.
 *
 * GT-586 — the context's `requester` and `repositoryRevision` are echoed verbatim
 * onto the result. Neither is ever derived here: an absent value is the truthful
 * statement that the consumer supplied none.
 */

import { Verdict } from '../domain/verdict/verdict';
import type { EvaluationContext, EvaluationKind } from './contracts';
import { EvaluationResult, DecisionRecommendation, foldQualitySignals } from './contracts';
import type { IEvaluationPipeline } from './ports/evaluation-pipeline.port';
import { createPipelineExecutionPlan } from './ports/evaluation-pipeline.port';
import type { IWorkspaceReferenceResolver, ResolvedWorkspace } from './ports/workspace-reference-resolver.port';
import type { KindEvaluator, KindEvaluation } from './ports/kind-evaluator.port';
import { manifestFromWorkspace } from './evaluation-context.builder';
import { mapPipelineVerdict, pipelineOutOfScopeResult } from './canonical-result.mapper';
import type { MapOptions } from './canonical-result.mapper';

/**
 * GT-614 — the kinds the built-in rule pipeline serves. Everything else is served
 * by a registered {@link KindEvaluator}, so these four are ALWAYS supported and a
 * request naming any of them runs the pipeline; a request naming none of them does
 * not run it at all.
 */
export const PIPELINE_EVALUATION_KINDS: readonly EvaluationKind[] = [
  'gate',
  'artifact',
  'rule',
  'compliance',
];

/**
 * GT-614 — a requested kind that neither the pipeline nor any registered evaluator
 * can serve. Previously such a kind was silently dropped (`continue`), so a consumer
 * asking for `architecture` on a deployment that never wired the architecture
 * evaluator received a PASS shaped entirely by gates it did not ask for, with no
 * indication that its actual question went unanswered. A refusal is the only honest
 * answer: the engine cannot evaluate the kind, so it must not return a verdict.
 */
export class UnsupportedEvaluationKindError extends Error {
  readonly name = 'UnsupportedEvaluationKindError';
  constructor(
    readonly unsupportedKinds: readonly string[],
    readonly supportedKinds: readonly string[],
  ) {
    super(
      `Unsupported evaluation kind(s): ${[...unsupportedKinds].sort().join(', ')}. ` +
        `No evaluator is registered for them on this deployment. ` +
        `Supported kinds: ${[...supportedKinds].sort().join(', ')}.`,
    );
  }
}

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

  /**
   * Kinds this orchestrator can actually answer: the pipeline's four plus every
   * registered {@link KindEvaluator}. Deployment-dependent by construction — the
   * set is what was wired, not what the enum lists (GT-614).
   */
  get supportedKinds(): readonly EvaluationKind[] {
    return [
      ...PIPELINE_EVALUATION_KINDS,
      ...([...this.evaluatorsByKind.keys()] as EvaluationKind[]),
    ];
  }

  async evaluate(ctx: EvaluationContext): Promise<EvaluationResult> {
    // GT-614: read the request BEFORE executing anything. A kind nobody can answer
    // is refused rather than dropped, and the pipeline runs only when a pipeline
    // kind was actually asked for.
    const requestedKinds = this.planKinds(ctx);

    const workspace = await this.resolveWorkspace(ctx);

    const mapOptions: MapOptions = {
      coreVersion: this.coreVersion,
      correlationId: ctx.correlationId,
      ruleset: ctx.rulesetRef,
      rulesetVersion: ctx.rulesetVersion,
      evaluatedAt: new Date().toISOString(),
      declaredArtifacts: ctx.artifacts,
      // GT-586: attribution travels from the context to the result unchanged. The
      // Core never invents an actor or a revision — an absent value means the
      // consumer supplied none.
      requester: ctx.requester,
      repositoryRevision: ctx.repositoryRevision,
    };

    // Core kinds (gate/artifact/rule/compliance) come from the existing pipeline.
    let result: EvaluationResult;
    if (requestedKinds.runPipeline) {
      // GT-614: the request travels THROUGH the pipeline boundary. A pipeline built
      // from kind-tagged gates (`createKindSelectivePipeline`) executes only the gates
      // the requested kinds need; one written before this contract ignores the second
      // argument and behaves exactly as it did.
      const verdict = await this.pipeline.evaluate(
        manifestFromWorkspace(ctx, workspace),
        requestedKinds.plan,
      );
      result = mapPipelineVerdict(verdict, {
        ...mapOptions,
        evaluatedAt: verdict.evaluatedAt,
        // GT-601: the audit trail records what actually ran. The engine and the
        // GT-569 coverage facts come from the pipeline; the declared artifacts come
        // from the context, so `missingEvidence` names what the consumer required and
        // never presented. None of the three is a literal any more.
        engine: verdict.engine,
        coverage: verdict.coverage,
      });
    } else {
      // GT-614: not-applicable (GT-571) and unknown (GT-569 skipped/errored) both
      // describe rules the engine considered. This is neither — the consumer did not
      // request the pipeline, so it is OUT OF SCOPE and contributes no sub-result and
      // no denominator entry.
      result = pipelineOutOfScopeResult(mapOptions);
    }

    // Dispatch the requested non-pipeline kinds to their evaluators and merge.
    for (const kind of requestedKinds.evaluatorKinds) {
      const evaluator = this.evaluatorsByKind.get(kind);
      /* istanbul ignore next — planKinds already proved the evaluator exists. */
      if (!evaluator) continue;
      const ke = await evaluator.evaluate(ctx, workspace);
      result = this.merge(result, ke);
    }

    // Fold the inline quality Evidence[] carried on the context into per-dimension
    // signals (ADR-0111 / GT-533). The Core only READS the received evidence — it
    // never executes a provider; a context with no evidence yields a single
    // `no-evidence` signal (advisory), so the verdict is never affected by absence.
    // Recompute the non-binding decision recommendation from the final verdict.
    return {
      ...result,
      qualitySignals: foldQualitySignals(ctx.qualitySignals),
      decisionRecommendation: this.buildDecisionRecommendation(ctx, result.overallVerdict),
    };
  }

  /**
   * GT-614 — decide what will run, BEFORE anything runs.
   *
   * Three outcomes, in order:
   *  1. a requested kind no one can serve ⇒ {@link UnsupportedEvaluationKindError};
   *  2. `kinds` empty ⇒ the pre-GT-614 whole-pipeline behaviour, deliberately kept:
   *     the REST inline path sends `kinds: []` for callers that predate the field
   *     (`evaluation.controller.ts`), and an empty request means "no kind was
   *     declared", not "no kind is wanted";
   *  3. otherwise the pipeline runs only when a pipeline kind was named, and only
   *     the named non-pipeline kinds are dispatched.
   *
   * It also builds the {@link PipelineExecutionPlan} the pipeline receives, so the
   * selection continues INSIDE the pipeline instead of stopping at its boundary: a
   * request naming only `compliance` must not pay for the phase gates.
   */
  private planKinds(ctx: EvaluationContext): {
    readonly runPipeline: boolean;
    readonly evaluatorKinds: readonly EvaluationKind[];
    readonly plan: ReturnType<typeof createPipelineExecutionPlan>;
  } {
    const requested = ctx.kinds ?? [];
    if (requested.length === 0) {
      // Nothing declared ⇒ unrestricted plan ⇒ the pipeline runs in full, as before.
      return { runPipeline: true, evaluatorKinds: [], plan: createPipelineExecutionPlan([]) };
    }

    const supported = new Set<string>(this.supportedKinds);
    const unsupported = [...new Set(requested.filter((k) => !supported.has(k)))];
    if (unsupported.length > 0) {
      throw new UnsupportedEvaluationKindError(unsupported, [...supported]);
    }

    const pipelineKinds = new Set<string>(PIPELINE_EVALUATION_KINDS);
    const requestedPipelineKinds = [...new Set(requested.filter((k) => pipelineKinds.has(k)))];
    return {
      runPipeline: requestedPipelineKinds.length > 0,
      evaluatorKinds: [...new Set(requested.filter((k) => this.evaluatorsByKind.has(k)))],
      // Only the PIPELINE kinds go into the plan: a gate is selected by the pipeline
      // work it answers, and `architecture` or `design` is not pipeline work.
      plan: createPipelineExecutionPlan(requestedPipelineKinds),
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
