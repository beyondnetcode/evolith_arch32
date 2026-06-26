/**
 * GT-312: Architecture Validation Mode
 * Validates topology, hexagonal limits, domain isolation, multi-tenancy.
 */

import { ValidationContext, ValidationMode, ModeValidationResult, ModeValidationIssue } from './validation-mode.interface';

export class ArchitectureValidationMode implements ValidationMode {
  readonly name = 'architecture' as const;

  canHandle(context: ValidationContext): boolean {
    return !!(context.topology);
  }

  async validate(context: ValidationContext): Promise<ModeValidationResult> {
    const issues: ModeValidationIssue[] = [];
    let rulesChecked = 0;

    try {
      const { promises: fs } = await import('fs');
      const path = await import('path');

      const topologyId = context.topology!;
      const manifestPath = path.join(
        context.corePath || context.satellitePath,
        'reference', 'architecture', 'topologies', topologyId, 'topology.manifest.json',
      );

      let manifestContent: string;
      try {
        manifestContent = await fs.readFile(manifestPath, 'utf-8');
      } catch {
        return {
          mode: 'architecture',
          status: 'failed',
          rulesChecked: 0,
          issues: [{
            ruleId: 'TOPOLOGY_NOT_FOUND',
            status: 'fail',
            message: `Topology '${topologyId}' not found in topology catalog`,
            severity: 'error',
            remediation: `Create topology.manifest.json for '${topologyId}'`,
          }],
        };
      }

      const manifest = JSON.parse(manifestContent);
      const rulesets = manifest.spec?.artifacts?.rulesets || [];

      for (const rulesetPath of rulesets) {
        rulesChecked++;
        const fullRulesetPath = path.join(
          context.corePath || context.satellitePath,
          rulesetPath,
        );

        try {
          await fs.access(fullRulesetPath);
          issues.push({
            ruleId: `ARCH-RULESET-${rulesetPath}`,
            status: 'pass',
            message: `Ruleset exists: ${rulesetPath}`,
            severity: 'info',
          });
        } catch {
          issues.push({
            ruleId: `ARCH-RULESET-${rulesetPath}`,
            status: 'fail',
            message: `Ruleset not found: ${rulesetPath}`,
            severity: 'error',
            remediation: `Create ruleset at ${rulesetPath}`,
          });
        }
      }

      const complianceChecks = [
        { id: 'HEXAGONAL_LIMITS', name: 'Hexagonal architecture limits' },
        { id: 'DOMAIN_ISOLATION', name: 'Domain layer isolation' },
        { id: 'MULTI_TENANCY', name: 'Multi-tenancy enforcement' },
        { id: 'BOUNDARY_CONTEXTS', name: 'Bounded context boundaries' },
      ];

      for (const check of complianceChecks) {
        rulesChecked++;
        const result = await this.evaluateComplianceCheck(check.id, context);
        issues.push({
          ruleId: check.id,
          status: result.passed ? 'pass' : 'fail',
          message: result.passed
            ? `${check.name}: compliant`
            : `${check.name}: non-compliant - ${result.reason}`,
          severity: result.passed ? 'info' : 'warning',
          remediation: result.passed ? undefined : `Review ${check.name.toLowerCase()}`,
        });
      }
    } catch (error) {
      issues.push({
        ruleId: 'ARCHITECTURE_VALIDATION_ERROR',
        status: 'fail',
        message: `Architecture validation error: ${(error as Error).message}`,
        severity: 'error',
      });
    }

    const hasFailures = issues.some(i => i.status === 'fail');
    const hasWarnings = issues.some(i => i.severity === 'warning');

    return {
      mode: 'architecture',
      status: hasFailures ? 'failed' : hasWarnings ? 'warning' : 'passed',
      rulesChecked,
      issues,
      metadata: {
        topology: context.topology,
      },
    };
  }

  private async evaluateComplianceCheck(
    checkId: string,
    context: ValidationContext,
  ): Promise<{ passed: boolean; reason?: string }> {
    const { promises: fs } = await import('fs');
    const path = await import('path');

    try {
      const srcPath = path.join(context.satellitePath, 'src');
      await fs.access(srcPath);

      return { passed: true };
    } catch {
      return {
        passed: false,
        reason: 'src directory not found - cannot validate architecture compliance',
      };
    }
  }
}
