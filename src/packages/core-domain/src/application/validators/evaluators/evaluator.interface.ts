import { NormalizedRule } from '../../../domain/models/normalized-rule';
import type { EvaluationFacts } from '../../../domain/satellite-manifest';

export interface WorkspaceEvaluationContext {
  satellitePath: string;
  corePath: string;
  /**
   * GT-380 L1c: declared facts projected from the canonical EvaluationContext,
   * merged additively into the OPA input. Optional — absent on the legacy
   * FS-only path, where the OPA input stays byte-for-byte identical.
   */
  facts?: EvaluationFacts;
}

/**
 * GT-569 — the outcome vocabulary of a single rule evaluation.
 *
 * `skipped` and `errored` are DELIBERATELY distinct. Before GT-569 a handler
 * exception was converted into `skipped`, which made a crashing evaluator
 * indistinguishable from a rule the engine legitimately cannot express — and
 * both were then filtered out of `rulesChecked`, so a crash read as a green.
 *
 * - `passed`  — evaluated, no violation.
 * - `failed`  — evaluated, violation found.
 * - `skipped` — NOT evaluated: no handler supports the rule, or the handler
 *               declined it (requires external/runtime evidence).
 * - `errored` — NOT evaluated: the handler threw. This is a defect in the
 *               engine or the workspace, never a verdict about the rule.
 */
export type RuleEvaluationOutcome = 'passed' | 'failed' | 'skipped' | 'errored';

export interface RuleEvaluationResult {
  rule: NormalizedRule;
  result: RuleEvaluationOutcome;
  message?: string;
  evidencePath?: string;
}

export interface IRuleEvaluatorStrategy {
  /**
   * Evaluate a set of normalized rules against the given context.
   * Return an array of validation results.
   */
  evaluateAll(rules: NormalizedRule[], context: WorkspaceEvaluationContext): Promise<RuleEvaluationResult[]>;
}
