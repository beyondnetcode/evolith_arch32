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

export interface RuleEvaluationResult {
  rule: NormalizedRule;
  result: 'passed' | 'failed' | 'skipped';
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
