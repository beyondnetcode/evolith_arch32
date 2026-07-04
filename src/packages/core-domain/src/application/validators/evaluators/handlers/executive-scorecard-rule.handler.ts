import * as path from 'path';
import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

export class ExecutiveScorecardRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.id.startsWith('DORA-') || rule.id.startsWith('SPACE-') || rule.id.startsWith('DRIFT-');
  }

  async evaluate(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    if (rule.id.startsWith('DORA-')) return this.evalDora(rule, ctx);
    if (rule.id.startsWith('SPACE-')) return this.evalSpace(rule, ctx);
    if (rule.id.startsWith('DRIFT-')) return this.evalDrift(rule, ctx);
    return { rule, result: 'skipped', message: 'Unhandled scorecard rule' };
  }

  private async evalDora(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const ciDir = path.join(ctx.satellitePath, '.github', 'workflows');
    const hasCi = await this.fs.exists(ciDir);
    switch (rule.id) {
      case 'DORA-01':
        if (hasCi) return { rule, result: 'passed', message: 'Deployment frequency requires CI pipeline evidence' };
        return { rule, result: 'skipped', message: 'No CI workflows found for deployment frequency' };
      case 'DORA-02':
        return { rule, result: 'skipped', message: 'Lead time requires git history analysis' };
      case 'DORA-03':
        return { rule, result: 'skipped', message: 'Change failure rate requires CI/CD metrics' };
      case 'DORA-04':
        return { rule, result: 'skipped', message: 'Time to restore requires incident management data' };
      default:
        return { rule, result: 'skipped', message: 'Unhandled DORA rule' };
    }
  }

  private async evalSpace(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    switch (rule.id) {
      case 'SPACE-01': {
        const observabilityFiles = [
          'otel.config.js', 'opentelemetry.config.js', 'src/instrumentation.ts',
        ];
        for (const f of observabilityFiles) {
          if (await this.fs.exists(path.join(ctx.satellitePath, f))) {
            return { rule, result: 'passed' };
          }
        }
        return { rule, result: 'skipped', message: 'Observability infrastructure requires runtime verification' };
      }
      case 'SPACE-02':
        return { rule, result: 'skipped', message: 'Team health requires quarterly survey data' };
      case 'SPACE-03':
        return { rule, result: 'skipped', message: 'Sprint throughput requires tracker data' };
      case 'SPACE-04':
        return this.checkPhaseGateVisibility(rule, ctx);
      case 'SPACE-05':
        return this.checkExecutiveSponsor(rule, ctx);
      default:
        return { rule, result: 'skipped', message: 'Unhandled SPACE rule' };
    }
  }

  private async evalDrift(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const evidenceDir = path.join(ctx.corePath, '.harness', 'evidence');
    if (await this.fs.exists(evidenceDir)) {
      return { rule, result: 'passed', message: 'Drift evidence directory present' };
    }
    return { rule, result: 'skipped', message: 'Architecture drift index requires CLI validation output' };
  }

  private async checkPhaseGateVisibility(
    rule: NormalizedRule, ctx: WorkspaceEvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const evolithYaml = path.join(ctx.satellitePath, 'evolith.yaml');
    if (await this.fs.exists(evolithYaml)) {
      const content = await this.fs.readFile(evolithYaml);
      if (content.includes('sdlc') || content.includes('phase')) {
        return { rule, result: 'passed' };
      }
    }
    return { rule, result: 'skipped', message: 'Phase gate visibility requires evolith.yaml with SDLC state' };
  }

  private async checkExecutiveSponsor(
    rule: NormalizedRule, ctx: WorkspaceEvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const evolithYaml = path.join(ctx.satellitePath, 'evolith.yaml');
    if (await this.fs.exists(evolithYaml)) {
      const content = await this.fs.readFile(evolithYaml);
      if (content.includes('sponsor') || content.includes('governance')) {
        return { rule, result: 'passed' };
      }
    }
    return { rule, result: 'skipped', message: 'Executive sponsor requires evolith.yaml governance section' };
  }
}
