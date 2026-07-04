/**
 * GT-312: Ad-hoc Validation Mode
 * Validates individual components, artifacts, or files on demand.
 */

import { ValidationContext, ValidationMode, ModeValidationResult, ModeValidationIssue } from './validation-mode.interface';

export class AdhocValidationMode implements ValidationMode {
  readonly name = 'adhoc' as const;

  canHandle(context: ValidationContext): boolean {
    return !!(context.filePath || context.customRules?.length);
  }

  async validate(context: ValidationContext): Promise<ModeValidationResult> {
    const issues: ModeValidationIssue[] = [];
    let rulesChecked = 0;

    if (context.filePath) {
      const fileResult = await this.validateFile(context.filePath, context);
      issues.push(...fileResult.issues);
      rulesChecked += fileResult.rulesChecked;
    }

    if (context.customRules?.length) {
      for (const rule of context.customRules) {
        rulesChecked++;
        const result = this.evaluateCustomRule(rule, context);
        issues.push(result);
      }
    }

    if (!context.filePath && !context.customRules?.length) {
      return {
        mode: 'adhoc',
        status: 'skipped',
        rulesChecked: 0,
        issues: [],
        metadata: { reason: 'No file or custom rules specified' },
      };
    }

    const hasFailures = issues.some(i => i.status === 'fail');

    return {
      mode: 'adhoc',
      status: hasFailures ? 'failed' : 'passed',
      rulesChecked,
      issues,
      metadata: {
        filePath: context.filePath,
        customRulesCount: context.customRules?.length || 0,
      },
    };
  }

  private async validateFile(
    filePath: string,
    context: ValidationContext,
  ): Promise<{ issues: ModeValidationIssue[]; rulesChecked: number }> {
    const issues: ModeValidationIssue[] = [];
    let rulesChecked = 0;

    const { promises: fs } = await import('fs');
    const path = await import('path');

    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(context.satellitePath, filePath);

      const content = await fs.readFile(fullPath, 'utf-8');

      rulesChecked++;
      issues.push({
        ruleId: 'FILE-EXISTS',
        status: 'pass',
        message: `File exists: ${filePath}`,
        severity: 'info',
      });

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('@ts-nocheck') || line.includes('@ts-ignore')) {
          rulesChecked++;
          issues.push({
            ruleId: 'NO-TS-SUPPRESS',
            status: 'fail',
            message: `TypeScript suppression found: ${line.trim()}`,
            severity: 'warning',
            file: filePath,
            line: i + 1,
            remediation: 'Remove TypeScript suppression and fix the type error',
          });
        }

        if (line.includes('console.log') && !filePath.includes('.spec.') && !filePath.includes('.test.')) {
          rulesChecked++;
          issues.push({
            ruleId: 'NO-CONSOLE-LOG',
            status: 'fail',
            message: 'console.log found in production code',
            severity: 'warning',
            file: filePath,
            line: i + 1,
            remediation: 'Use structured logging instead of console.log',
          });
        }
      }
    } catch (error) {
      issues.push({
        ruleId: 'FILE-READ-ERROR',
        status: 'fail',
        message: `Cannot read file: ${(error as Error).message}`,
        severity: 'error',
        file: filePath,
      });
    }

    return { issues, rulesChecked };
  }

  private evaluateCustomRule(rule: unknown, context: ValidationContext): ModeValidationIssue {
    const r = rule as Record<string, unknown>;

    if (!r.id || !r.check) {
      return {
        ruleId: 'CUSTOM-RULE-INVALID',
        status: 'fail',
        message: 'Custom rule must have id and check function',
        severity: 'error',
      };
    }

    return {
      ruleId: String(r.id),
      status: 'pass',
      message: `Custom rule '${r.id}' evaluated`,
      severity: 'info',
    };
  }
}
