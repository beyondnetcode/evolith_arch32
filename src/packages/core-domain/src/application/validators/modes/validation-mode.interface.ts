/**
 * GT-312: Composable Validation Engine
 * Validation mode interface for multi-entry-point validation.
 */

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
  /**
   * GT-569 — the denominator behind `rulesChecked`, so an aggregate built from
   * several modes can report checked/skipped/errored/total instead of a bare
   * coverage number. Optional: a mode that cannot distinguish the outcomes
   * omits them and the aggregate falls back to `rulesChecked` as the total.
   */
  rulesSkipped?: number;
  rulesErrored?: number;
  rulesTotal?: number;
  skippedRuleIds?: string[];
  erroredRuleIds?: string[];
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
