import { NormalizedRule } from '../rule-evaluation-engine';
import { ValidationIssue } from '../ruleset-validator.service';

export interface EvaluationContext {
  satellitePath: string;
  corePath: string;
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
  evaluateAll(rules: NormalizedRule[], context: EvaluationContext): Promise<RuleEvaluationResult[]>;
}
