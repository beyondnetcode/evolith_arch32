/**
 * GT-312: Composable Validation Engine
 * Validation mode interface for multi-entry-point validation.
 */

import { RuleEvaluation, EvaluationVerdict } from '../../../domain/satellite-manifest';

export type ValidationModeName = 'sdlc' | 'architecture' | 'ruleset' | 'adr' | 'adhoc';

export interface ValidationContext {
  satellitePath: string;
  corePath?: string;
  engine: 'native' | 'opa';
  topology?: string;
  phase?: string;
  rulesetId?: string;
  adrId?: string;
  filePath?: string;
  customRules?: unknown[];
}

export interface ModeValidationResult {
  mode: ValidationModeName;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  rulesChecked: number;
  issues: ModeValidationIssue[];
  evidence?: unknown;
  metadata?: Record<string, unknown>;
}

export interface ModeValidationIssue {
  ruleId: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  severity: 'error' | 'warning' | 'info';
  file?: string;
  line?: number;
  remediation?: string;
}

export interface ValidationMode {
  readonly name: ValidationModeName;

  canHandle(context: ValidationContext): boolean;

  validate(context: ValidationContext): Promise<ModeValidationResult>;
}
