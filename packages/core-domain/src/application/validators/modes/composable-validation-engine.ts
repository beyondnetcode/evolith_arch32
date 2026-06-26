/**
 * GT-312: Composable Validation Engine
 * Orchestrates multiple validation modes into a unified result.
 *
 * The engine is NOT rigid — it resolves validation scope dynamically
 * based on what the user provides, not forcing them into a single pipeline.
 */

import { ValidationContext, ValidationMode, ModeValidationResult } from './validation-mode.interface';

export interface ComposableValidationResult {
  status: 'passed' | 'failed' | 'warning';
  modes: ModeValidationResult[];
  totalRulesChecked: number;
  totalIssues: number;
  passedRules: number;
  failedRules: number;
  performanceMs: number;
}

export class ComposableValidationEngine {
  private modes: ValidationMode[] = [];

  registerMode(mode: ValidationMode): void {
    this.modes.push(mode);
  }

  resolveModes(context: ValidationContext): ValidationMode[] {
    const resolved: ValidationMode[] = [];

    for (const mode of this.modes) {
      if (mode.canHandle(context)) {
        resolved.push(mode);
      }
    }

    if (resolved.length === 0) {
      return this.modes.filter(m => m.name === 'ruleset');
    }

    return resolved;
  }

  async execute(context: ValidationContext): Promise<ComposableValidationResult> {
    const startTime = Date.now();
    const modesToRun = this.resolveModes(context);
    const modeResults: ModeValidationResult[] = [];

    const modePromises = modesToRun.map(mode => mode.validate(context));
    const results = await Promise.allSettled(modePromises);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        modeResults.push(result.value);
      } else {
        modeResults.push({
          mode: 'adhoc',
          status: 'failed',
          rulesChecked: 0,
          issues: [{
            ruleId: 'MODE_EXECUTION_ERROR',
            status: 'fail',
            message: result.reason?.message || 'Mode execution failed',
            severity: 'error',
          }],
        });
      }
    }

    const totalRulesChecked = modeResults.reduce((sum, r) => sum + r.rulesChecked, 0);
    const totalIssues = modeResults.reduce((sum, r) => sum + r.issues.length, 0);
    const failedRules = modeResults.reduce(
      (sum, r) => sum + r.issues.filter(i => i.status === 'fail').length,
      0,
    );
    const passedRules = totalRulesChecked - failedRules;

    const hasFailures = modeResults.some(r => r.status === 'failed');
    const hasWarnings = modeResults.some(r => r.status === 'warning');

    return {
      status: hasFailures ? 'failed' : hasWarnings ? 'warning' : 'passed',
      modes: modeResults,
      totalRulesChecked,
      totalIssues,
      passedRules,
      failedRules,
      performanceMs: Date.now() - startTime,
    };
  }
}
