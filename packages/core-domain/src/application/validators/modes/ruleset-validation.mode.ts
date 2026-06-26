/**
 * GT-312: Ruleset Validation Mode
 * Validates specific rulesets independently.
 */

import { ValidationContext, ValidationMode, ModeValidationResult, ModeValidationIssue } from './validation-mode.interface';

const RULESET_ID_MAP: Record<string, string> = {
  'acl': 'rulesets/acl/anti-corruption-layer.rules.json',
  'open-core': 'rulesets/governance/open-core-boundary.rules.json',
  'inheritance': 'rulesets/governance/inheritance.rules.json',
  'satellite-contracts': 'rulesets/governance/satellite-contracts.rules.json',
  'executive-scorecards': 'rulesets/governance/executive-scorecards.rules.json',
  'cli-release': 'rulesets/cli/release-readiness.rules.json',
  'cli-parity': 'rulesets/cli/core-parity.rules.json',
  'evidence': 'rulesets/evidence/evidence-manifest.rules.json',
  'mcp': 'rulesets/mcp/protocol-compliance.rules.json',
  'observability': 'rulesets/observability/telemetry-evidence.rules.json',
  'compliance-baseline': 'rulesets/compliance-baseline/compliance-baseline.rules.json',
  'definition-of-done': 'rulesets/definition-of-done/definition-of-done.rules.json',
  'engineering-manifesto': 'rulesets/engineering-manifesto/engineering-manifesto.rules.json',
  'repository-taxonomy': 'rulesets/repository-taxonomy/repository-taxonomy.rules.json',
  'phase-gates': 'rulesets/phase-gates/phase-gates.rules.json',
  'quality-thresholds': 'rulesets/quality-thresholds/quality-thresholds.rules.json',
  'dependency-pinning': 'rulesets/sdlc/dependency-pinning.rules.json',
};

export class RulesetValidationMode implements ValidationMode {
  readonly name = 'ruleset' as const;

  canHandle(context: ValidationContext): boolean {
    return !!(context.rulesetId);
  }

  async validate(context: ValidationContext): Promise<ModeValidationResult> {
    const issues: ModeValidationIssue[] = [];
    let rulesChecked = 0;

    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');

      const rulesetId = context.rulesetId!;
      const rulesetPath = RULESET_ID_MAP[rulesetId];

      if (!rulesetPath) {
        return {
          mode: 'ruleset',
          status: 'failed',
          rulesChecked: 0,
          issues: [{
            ruleId: 'RULESET_NOT_FOUND',
            status: 'fail',
            message: `Ruleset '${rulesetId}' not found. Supported: ${Object.keys(RULESET_ID_MAP).join(', ')}`,
            severity: 'error',
            remediation: `Create ruleset with ID '${rulesetId}'`,
          }],
        };
      }

      const fullRulesetPath = path.join(
        context.corePath || context.satellitePath,
        rulesetPath,
      );

      let rulesetContent: string;
      try {
        rulesetContent = await fs.readFile(fullRulesetPath, 'utf-8');
      } catch {
        return {
          mode: 'ruleset',
          status: 'failed',
          rulesChecked: 0,
          issues: [{
            ruleId: 'RULESET_FILE_NOT_FOUND',
            status: 'fail',
            message: `Ruleset file not found: ${rulesetPath}`,
            severity: 'error',
            remediation: `Create ruleset file at ${rulesetPath}`,
          }],
        };
      }

      const ruleset = JSON.parse(rulesetContent);
      const rules = ruleset.rules || [];

      for (const rule of rules) {
        rulesChecked++;
        issues.push({
          ruleId: rule.id || `RULESET-${rulesetId}-${rules.indexOf(rule)}`,
          status: 'pass',
          message: `Rule '${rule.id || rule.title}' loaded and registered`,
          severity: 'info',
        });
      }

      issues.push({
        ruleId: 'RULESET-LOADED',
        status: 'pass',
        message: `Ruleset '${rulesetId}' loaded successfully with ${rules.length} rules`,
        severity: 'info',
      });
    } catch (error) {
      issues.push({
        ruleId: 'RULESET_VALIDATION_ERROR',
        status: 'fail',
        message: `Ruleset validation error: ${(error as Error).message}`,
        severity: 'error',
      });
    }

    const hasFailures = issues.some(i => i.status === 'fail');

    return {
      mode: 'ruleset',
      status: hasFailures ? 'failed' : 'passed',
      rulesChecked,
      issues,
      metadata: {
        rulesetId: context.rulesetId,
      },
    };
  }
}
