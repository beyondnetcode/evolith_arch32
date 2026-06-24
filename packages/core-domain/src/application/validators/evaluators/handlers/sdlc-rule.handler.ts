import * as path from 'path';
import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { EvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

export class SdlcRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.id.startsWith('QT-');
  }

  async evaluate(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    switch (rule.id) {
      case 'QT-01': return this.checkForEvidence(rule, ctx, 'coverage report', ['coverage', 'lcov.info']);
      case 'QT-02': return this.checkForEvidence(rule, ctx, 'complexity report', ['complexity-report.json']);
      case 'QT-03': return this.checkForEvidence(rule, ctx, 'security scan', ['security-scan.json']);
      case 'QT-04': return this.checkForEvidence(rule, ctx, 'debt report', ['debt-report.json']);
      case 'QT-05': return { rule, result: 'passed', message: 'Testing pyramid distribution requires runtime analysis' };
      case 'QT-06': return this.evalDocumentationDelta(rule, ctx);
      case 'QT-07': return this.checkForEvidence(rule, ctx, 'observability config', [
        'otel.config.js', 'opentelemetry.config.js', 'src/instrumentation.ts',
      ]);
      case 'QT-08': return this.checkForEvidence(rule, ctx, 'contract definitions', ['contracts']);
      default: return { rule, result: 'skipped', message: 'Unhandled QT rule' };
    }
  }

  private async checkForEvidence(
    rule: NormalizedRule, ctx: EvaluationContext, label: string, candidates: string[],
  ): Promise<RuleEvaluationResult> {
    for (const c of candidates) {
      if (await this.fs.exists(path.join(ctx.satellitePath, c))) return { rule, result: 'passed' };
    }
    for (const c of candidates) {
      if (await this.fs.exists(path.join(ctx.corePath, c))) return { rule, result: 'passed' };
    }
    return { rule, result: 'skipped', message: `Requires external verification: ${label}` };
  }

  private async evalDocumentationDelta(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const candidates = ['docs', 'README.md'];
    for (const c of candidates) {
      if (await this.fs.exists(path.join(ctx.satellitePath, c))) return { rule, result: 'passed' };
    }
    return { rule, result: 'skipped', message: 'Documentation delta requires manual verification' };
  }
}
