/**
 * GT-614 — selective execution INSIDE the rule pipeline.
 *
 * The first half of GT-614 stopped the orchestrator from running the pipeline when
 * no pipeline kind was requested, and made an unserviceable kind a refusal rather
 * than a silent drop. Both hold. Neither closed the sentence the gap actually
 * states: *"a request for ONE kind pays for every gate"*. Ask for `compliance`
 * alone and every phase gate still ran, because the pipeline was monolithic — the
 * request was read at the boundary and then thrown away.
 *
 * This module is the missing half: a pipeline assembled from gates that each DECLARE
 * which evaluation kinds they answer, so a request selects the gates it needs and
 * the rest are never executed. Not filtered afterwards — never invoked. That is the
 * only version of this that saves anything, and the only version whose test can
 * prove something: a gate that WOULD fail does not fail a request that never asked
 * for its kind, because its `evaluate` was not called.
 *
 * ## Honesty of the denominator (GT-569 / GT-571)
 *
 * A gate that did not run because nobody asked is **out of scope**. It is:
 *  - NOT `skipped` — skipped means the engine tried and could not, so the outcome is
 *    UNKNOWN and belongs in the denominator as a risk;
 *  - NOT `errored` — errored means the handler threw;
 *  - NOT `not-applicable` (GT-571) — that means the rule does not apply to this
 *    workspace;
 *  - NOT a gate with `verdict: 'skipped'` in the verdict either, because the mapper
 *    would turn that into a `Verdict.SKIP` sub-result for a gate that was never
 *    considered.
 *
 * It therefore contributes NOTHING: no `PipelineGateResult`, no rule evaluation, no
 * entry in `summary.totalRules`/`totalGates`, and no coverage risk. It is recorded
 * once, by id, in {@link PipelineRuleCoverage.outOfScopeGateIds}, purely so a reader
 * can see what the request did not buy.
 *
 * ## Scope of this file
 *
 * `core-domain` owns the CONTRACT and the selection algorithm; the concrete gate
 * bodies live in the adapter layer, exactly as `KindEvaluator` does for the
 * non-pipeline kinds. A surface adopts selectivity by expressing its gates as
 * {@link PipelineGateSpec}s — until it does, it keeps passing an implementation that
 * ignores the plan and behaves precisely as before.
 */

import type {
  EvaluationVerdict,
  PipelineGateResult,
  RuleEvaluation,
  SatelliteManifest,
} from '../domain/satellite-manifest';
import type { EvaluationKind } from './contracts/evaluation-context';
import type {
  IEvaluationPipeline,
  PipelineExecutionPlan,
  PipelineRuleCoverage,
  PipelineVerdict,
} from './ports/evaluation-pipeline.port';

/**
 * One unit of pipeline work, tagged with the evaluation kinds it answers.
 *
 * `kinds` is the whole point: it is what lets the pipeline decide, before spending
 * anything, whether this gate is part of the question being asked. An EMPTY `kinds`
 * means "unclassified" and the gate always runs — a missing annotation must never
 * silently become a missing check.
 */
export interface PipelineGateSpec {
  readonly gateId: string;
  readonly gateName: string;
  /** SDLC phase id the gate belongs to (`f1..f5`, `cross`, …). */
  readonly phase: string;
  /** Evaluation kinds this gate answers. Empty ⇒ unclassified ⇒ always runs. */
  readonly kinds: readonly EvaluationKind[];
  /** Executed ONLY when {@link PipelineExecutionPlan.includesGate} admits it. */
  evaluate(manifest: SatelliteManifest): Promise<readonly RuleEvaluation[]>;
}

export interface KindSelectivePipelineOptions {
  /** Resolved topology to stamp on the verdict; the Core never guesses one. */
  readonly resolveTopology?: (manifest: SatelliteManifest) => string | null;
  /** Clock, injectable so the verdict timestamp is deterministic in tests. */
  readonly now?: () => string;
}

/** A gate result plus the coverage facts its execution produced. */
interface ExecutedGate {
  readonly gate: PipelineGateResult;
  readonly errored: boolean;
  readonly erroredRuleIds: readonly string[];
}

function gateVerdict(evaluations: readonly RuleEvaluation[]): PipelineGateResult['verdict'] {
  return evaluations.every((e) => e.passed || e.severity !== 'error') ? 'passed' : 'failed';
}

/**
 * Decide which gates this request pays for. Pure and side-effect free — it is called
 * BEFORE any gate is executed, which is the entire behavioural change.
 */
export function selectGates<T extends { readonly kinds: readonly EvaluationKind[] }>(
  gates: readonly T[],
  plan?: PipelineExecutionPlan,
): { readonly selected: readonly T[]; readonly outOfScope: readonly T[] } {
  if (!plan || plan.unrestricted) return { selected: gates, outOfScope: [] };
  const selected: T[] = [];
  const outOfScope: T[] = [];
  for (const gate of gates) (plan.includesGate(gate.kinds) ? selected : outOfScope).push(gate);
  return { selected, outOfScope };
}

/**
 * Assemble an {@link IEvaluationPipeline} that executes only the gates the request
 * needs.
 *
 * A gate whose `evaluate` throws is reported as ERRORED (its rule ids unknown, so the
 * gate id stands in) rather than swallowed: an engine failure is a governance risk,
 * and it is a different thing from a gate nobody asked for.
 */
export function createKindSelectivePipeline(
  gates: readonly PipelineGateSpec[],
  options: KindSelectivePipelineOptions = {},
): IEvaluationPipeline {
  const now = options.now ?? (() => new Date().toISOString());

  return {
    async evaluate(
      manifest: SatelliteManifest,
      plan?: PipelineExecutionPlan,
    ): Promise<PipelineVerdict> {
      const { selected, outOfScope } = selectGates(gates, plan);

      const executed: ExecutedGate[] = [];
      for (const spec of selected) {
        try {
          const evaluations = [...(await spec.evaluate(manifest))];
          executed.push({
            gate: {
              gateId: spec.gateId,
              gateName: spec.gateName,
              phase: spec.phase,
              verdict: gateVerdict(evaluations),
              artifactEvaluations: evaluations,
            },
            errored: false,
            erroredRuleIds: [],
          });
        } catch {
          // The engine threw: UNKNOWN outcome, which is a GT-569 `errored` — counted
          // in the denominator and surfaced as a high risk by the mapper. Deliberately
          // NOT the same bucket as `outOfScope`.
          executed.push({
            gate: {
              gateId: spec.gateId,
              gateName: spec.gateName,
              phase: spec.phase,
              verdict: 'failed',
              artifactEvaluations: [],
            },
            errored: true,
            erroredRuleIds: [spec.gateId],
          });
        }
      }

      const gateResults = executed.map((e) => e.gate);
      const allRules = gateResults.flatMap((g) => g.artifactEvaluations);
      const passedRules = allRules.filter((r) => r.passed).length;
      const failedRules = allRules.length - passedRules;
      const failedGates = gateResults.filter((g) => g.verdict === 'failed').length;
      const erroredRuleIds = executed.flatMap((e) => e.erroredRuleIds);

      const coverage: PipelineRuleCoverage = {
        rulesChecked: allRules.length,
        rulesSkipped: 0,
        rulesErrored: erroredRuleIds.length,
        // The denominator counts what the engine attempted. Out-of-scope gates are
        // ABSENT from it by construction (GT-569/GT-614).
        rulesTotal: allRules.length + erroredRuleIds.length,
        skippedRuleIds: [],
        erroredRuleIds,
        outOfScopeGateIds: outOfScope.map((g) => g.gateId),
      };

      const verdict: EvaluationVerdict = {
        passed: failedGates === 0 && erroredRuleIds.length === 0,
        resolvedTopology: options.resolveTopology?.(manifest) ?? null,
        gates: gateResults,
        summary: {
          totalGates: gateResults.length,
          passedGates: gateResults.length - failedGates,
          failedGates,
          totalRules: allRules.length,
          passedRules,
          failedRules,
        },
        evaluatedAt: now(),
      };

      return { ...verdict, coverage };
    },
  };
}
