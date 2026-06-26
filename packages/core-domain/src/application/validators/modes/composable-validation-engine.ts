/**
 * GT-312: Composable Validation Engine
 * Orchestrates multiple validation modes into a unified result.
 *
 * The engine is NOT rigid — it resolves validation scope dynamically
 * based on what the user provides, not forcing them into a single pipeline.
 */

import { ValidationContext, ValidationMode, ModeValidationResult } from './validation-mode.interface';
import { EvolithConfigService, EvolithConfig } from '../../services/evolith-config.service';

export interface ComposableValidationResult {
  status: 'passed' | 'failed' | 'warning';
  modes: ModeValidationResult[];
  totalRulesChecked: number;
  totalIssues: number;
  passedRules: number;
  failedRules: number;
  performanceMs: number;
  config?: EvolithConfig;
}

export class ComposableValidationEngine {
  private modes: ValidationMode[] = [];
  private configService: EvolithConfigService;

  constructor() {
    this.configService = new EvolithConfigService();
  }

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

    let config: EvolithConfig | undefined;
    try {
      config = await this.configService.loadConfig(context.satellitePath);
    } catch {
      // Config is optional, continue without it
    }

    const mergedContext: ValidationContext = {
      ...context,
      topology: context.topology || config?.topology,
      phase: context.phase || config?.phase,
      rulesetId: context.rulesetId || config?.rulesets?.[0],
      adrId: context.adrId || config?.adrRules?.[0],
      engine: context.engine || config?.engine || 'native',
    };

    const modesToRun = this.resolveModes(mergedContext);
    const modeResults: ModeValidationResult[] = [];

    const shouldParallel = config?.validation?.parallel !== false;
    const timeout = config?.validation?.timeout || 2000;

    if (shouldParallel) {
      const modePromises = modesToRun.map(mode =>
        Promise.race([
          mode.validate(mergedContext),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Mode ${mode.name} timed out after ${timeout}ms`)), timeout),
          ),
        ]),
      );

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
    } else {
      for (const mode of modesToRun) {
        try {
          const result = await mode.validate(mergedContext);
          modeResults.push(result);
        } catch (error) {
          modeResults.push({
            mode: mode.name,
            status: 'failed',
            rulesChecked: 0,
            issues: [{
              ruleId: 'MODE_EXECUTION_ERROR',
              status: 'fail',
              message: (error as Error).message || 'Mode execution failed',
              severity: 'error',
            }],
          });
        }
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
      config,
    };
  }
}
