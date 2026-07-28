/**
 * Port over the existing end-to-end evaluation pipeline (GT-378 / ADR-0101).
 *
 * The EvaluationOrchestrator depends on this narrow interface rather than the
 * concrete SatelliteEvaluationPipeline, so the canonical contract layer composes
 * the existing engine without rewriting it (and stays unit-testable).
 */

import type { SatelliteManifest, EvaluationVerdict } from '../../domain/satellite-manifest';
import type { RuleEngine } from '../contracts/evaluation-result';

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

export interface IEvaluationPipeline {
  evaluate(manifest: SatelliteManifest): Promise<PipelineVerdict>;
}
