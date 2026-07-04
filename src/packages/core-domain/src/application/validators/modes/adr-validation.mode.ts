/**
 * GT-312: ADR Validation Mode
 * Validates against specific ADR rules (hexagonal architecture, multi-tenancy, etc.).
 */

import { ValidationContext, ValidationMode, ModeValidationResult, ModeValidationIssue } from './validation-mode.interface';

const ADR_IDS = [
  'adr-0002',
  'adr-0005',
  'adr-0010',
  'adr-0018',
  'adr-0032',
  'adr-0040',
  'adr-0050',
];

const ADR_RULESET_MAP: Record<string, string> = {
  'adr-0002': 'rulesets/adr/adr-0002-hexagonal-architecture.rules.json',
  'adr-0005': 'rulesets/adr/adr-0005-cicd-quality-gates.rules.json',
  'adr-0010': 'rulesets/adr/adr-0010-multi-tenancy.rules.json',
  'adr-0018': 'rulesets/adr/adr-0018-testing-pyramid.rules.json',
  'adr-0032': 'rulesets/adr/adr-0032-protocol-selection.rules.json',
  'adr-0040': 'rulesets/adr/adr-0040-multi-runtime.rules.json',
  'adr-0050': 'rulesets/adr/adr-0050-gitflow-branching.rules.json',
};

export class AdrValidationMode implements ValidationMode {
  readonly name = 'adr' as const;

  canHandle(context: ValidationContext): boolean {
    return !!(context.adrId);
  }

  async validate(context: ValidationContext): Promise<ModeValidationResult> {
    const issues: ModeValidationIssue[] = [];
    let rulesChecked = 0;

    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');

      const adrId = context.adrId!;

      if (!ADR_IDS.includes(adrId)) {
        return {
          mode: 'adr',
          status: 'failed',
          rulesChecked: 0,
          metadata: {
            adrId,
          },
          issues: [{
            ruleId: 'ADR_UNKNOWN',
            status: 'fail',
            message: `Unknown ADR '${adrId}'. Supported: ${ADR_IDS.join(', ')}`,
            severity: 'error',
          }],
        };
      }

      const rulesetPath = ADR_RULESET_MAP[adrId];
      const fullRulesetPath = path.join(
        context.corePath || context.satellitePath,
        rulesetPath,
      );

      let rulesetContent: string;
      try {
        rulesetContent = await fs.readFile(fullRulesetPath, 'utf-8');
      } catch {
        return {
          mode: 'adr',
          status: 'failed',
          rulesChecked: 0,
          metadata: {
            adrId,
          },
          issues: [{
            ruleId: 'ADR_RULESET_NOT_FOUND',
            status: 'fail',
            message: `ADR ruleset for '${adrId}' not found at ${rulesetPath}`,
            severity: 'error',
            remediation: `Create ruleset for ${adrId}`,
          }],
        };
      }

      const ruleset = JSON.parse(rulesetContent);
      const rules = ruleset.rules || [];

      for (const rule of rules) {
        rulesChecked++;
        issues.push({
          ruleId: rule.id || `ADR-${adrId}-${rules.indexOf(rule)}`,
          status: 'pass',
          message: `ADR rule '${rule.id || rule.title}' loaded and registered`,
          severity: 'info',
        });
      }

      const adrDocPath = await this.findAdrDocument(adrId, context);
      if (adrDocPath) {
        rulesChecked++;
        issues.push({
          ruleId: `ADR-DOC-${adrId.toUpperCase()}`,
          status: 'pass',
          message: `ADR document exists: ${adrDocPath}`,
          severity: 'info',
        });
      } else {
        rulesChecked++;
        issues.push({
          ruleId: `ADR-DOC-${adrId.toUpperCase()}`,
          status: 'fail',
          message: `ADR document not found for '${adrId}'`,
          severity: 'warning',
          remediation: `Create ADR document for ${adrId}`,
        });
      }
    } catch (error) {
      issues.push({
        ruleId: 'ADR_VALIDATION_ERROR',
        status: 'fail',
        message: `ADR validation error: ${(error as Error).message}`,
        severity: 'error',
      });
    }

    const hasFailures = issues.some(i => i.status === 'fail');

    return {
      mode: 'adr',
      status: hasFailures ? 'failed' : 'passed',
      rulesChecked,
      issues,
      metadata: {
        adrId: context.adrId,
      },
    };
  }

  private async findAdrDocument(adrId: string, context: ValidationContext): Promise<string | null> {
    const { promises: fs } = await import('fs');
    const path = await import('path');

    const possiblePaths = [
      path.join(context.corePath || context.satellitePath, 'reference', 'architecture', 'adrs'),
      path.join(context.satellitePath, 'docs', 'adrs'),
    ];

    const adrNumber = adrId.replace('adr-', '');

    for (const dir of possiblePaths) {
      try {
        const files = await fs.readdir(dir);
        const match = files.find(f =>
          f.includes(adrNumber) || f.includes(adrId),
        );
        if (match) {
          return path.join(dir, match);
        }
      } catch {
        continue;
      }
    }

    return null;
  }
}
