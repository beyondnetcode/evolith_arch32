/**
 * Port over the existing end-to-end evaluation pipeline (GT-378 / ADR-0101).
 *
 * The EvaluationOrchestrator depends on this narrow interface rather than the
 * concrete SatelliteEvaluationPipeline, so the canonical contract layer composes
 * the existing engine without rewriting it (and stays unit-testable).
 */

import type { SatelliteManifest, EvaluationVerdict } from '../../domain/satellite-manifest';
import type { RuleEngine } from '../contracts/evaluation-result';
import type { EvaluationKind } from '../contracts/evaluation-context';

/**
 * GT-601 — rule-coverage facts a pipeline MAY attach to its verdict.
 *
 * The vocabulary is GT-569's, deliberately: `rulesChecked` never travels without
 * its denominator, and `skipped` ("the engine could not evaluate the rule") is
 * NEVER merged with `errored` ("the engine threw while evaluating it"). Both mean
 * the rule's outcome is unknown, which is a governance RISK, not a gap — the
 * mapper turns each id into a `RiskFinding` of a different level.
 */
export interface PipelineRuleCoverage {
  /** Rules that actually produced an outcome (pass or fail). */
  readonly rulesChecked: number;
  /** Rules the engine could not evaluate. */
  readonly rulesSkipped: number;
  /** Rules whose handler threw. */
  readonly rulesErrored: number;
  /** `rulesChecked + rulesSkipped + rulesErrored`. */
  readonly rulesTotal: number;
  readonly skippedRuleIds: readonly string[];
  readonly erroredRuleIds: readonly string[];
  /**
   * GT-614 — gates the pipeline did NOT execute because no requested kind needed
   * them.
   *
   * A fourth, deliberately separate bucket. `skipped` and `errored` mean the engine
   * TRIED and the outcome is UNKNOWN, so they belong in `rulesTotal` and become
   * coverage risks; GT-571 not-applicable means the rule does not apply, so it is
   * pre-filtered. This is neither: **nobody asked**. It is OUT OF SCOPE, and it must
   * therefore never be added to `rulesChecked`/`rulesSkipped`/`rulesErrored`/
   * `rulesTotal`, and never be turned into a risk — reporting an unasked question as
   * an unanswered one is exactly the dishonesty GT-569 exists to prevent. It is
   * recorded only so a reader can see what the request did not buy.
   */
  readonly outOfScopeGateIds?: readonly string[];
}

/**
 * GT-601 — the pipeline's verdict, plus the OPTIONAL execution facts the canonical
 * mapper needs to write a truthful audit trail.
 *
 * Both additions are optional so every existing pipeline still satisfies the port:
 *  - `engine` is the evaluator that ran, when the whole run used one. Per-rule
 *    attribution (the mixed case: OPA for the phase gates, the native evaluator for
 *    the canonical ruleset corpus) is resolved by the mapper from each rule's path,
 *    or from an `engine` stamped on the individual rule evaluation.
 *  - `coverage` reports what could NOT be evaluated (GT-569 vocabulary).
 */
export type PipelineVerdict = EvaluationVerdict & {
  readonly engine?: RuleEngine;
  readonly coverage?: PipelineRuleCoverage;
};

/**
 * GT-614 — WHICH pipeline kinds the consumer asked for, handed to the pipeline
 * BEFORE it executes anything.
 *
 * The orchestrator already refuses to run the pipeline at all when no pipeline kind
 * was requested. That is not enough: the gap's own statement is that "a request for
 * ONE kind pays for every gate", and asking for `compliance` alone still paid for
 * every phase gate, because the decision stopped at the pipeline boundary. This plan
 * carries the request THROUGH that boundary, so a pipeline can execute the gates the
 * requested kinds need and no others.
 *
 * The parameter is optional on {@link IEvaluationPipeline.evaluate} so that every
 * pipeline written before this contract still satisfies it — an implementation that
 * ignores the plan keeps its previous behaviour exactly.
 */
export interface PipelineExecutionPlan {
  /** The pipeline kinds actually requested (never empty when `unrestricted` is false). */
  readonly requestedKinds: readonly EvaluationKind[];
  /**
   * `true` when the consumer declared NO kinds at all. An empty request means
   * "nothing was declared", not "nothing is wanted" (the inline REST path still
   * sends `kinds: []`), so the pipeline runs in full — the pre-GT-614 behaviour.
   */
  readonly unrestricted: boolean;
  /**
   * Does a gate that answers `gateKinds` have to run for this request? A gate that
   * declares NO kinds is unclassified: it always runs, because silently dropping a
   * gate nobody has classified would turn a missing annotation into a missing check.
   */
  includesGate(gateKinds: readonly EvaluationKind[]): boolean;
}

/**
 * GT-614 — build the execution plan for a set of requested kinds. `[]` (or a set with
 * no pipeline kind in it) yields an unrestricted plan, preserving the legacy meaning
 * of an undeclared request.
 */
export function createPipelineExecutionPlan(
  requestedKinds: readonly EvaluationKind[] = [],
): PipelineExecutionPlan {
  const requested = new Set<EvaluationKind>(requestedKinds);
  const unrestricted = requested.size === 0;
  return {
    requestedKinds: [...requested],
    unrestricted,
    includesGate(gateKinds: readonly EvaluationKind[]): boolean {
      if (unrestricted) return true;
      if (gateKinds.length === 0) return true;
      return gateKinds.some((k) => requested.has(k));
    },
  };
}

export interface IEvaluationPipeline {
  evaluate(manifest: SatelliteManifest, plan?: PipelineExecutionPlan): Promise<PipelineVerdict>;
}
