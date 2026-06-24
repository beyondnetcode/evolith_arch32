import * as path from 'path';
import { IFileSystem, IConfigParser } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { EvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

export class SatelliteContractRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem, private readonly configParser: IConfigParser) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.id.startsWith('SVC-');
  }

  async evaluate(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    switch (rule.id) {
      case 'SVC-01': return this.evalSingleEvolithYaml(rule, ctx);
      case 'SVC-02': return { rule, result: 'skipped', message: 'Satellite name uniqueness requires registry check' };
      case 'SVC-03': return this.evalF1AdrRegistry(rule, ctx);
      case 'SVC-04': return this.evalExtractionReadiness(rule, ctx);
      case 'SVC-05': return { rule, result: 'skipped', message: 'Core version existence requires registry check' };
      default: return { rule, result: 'skipped', message: 'Unhandled SVC rule' };
    }
  }

  private async evalSingleEvolithYaml(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const evolithYaml = path.join(ctx.satellitePath, 'evolith.yaml');
    if (!await this.fs.exists(evolithYaml)) {
      return { rule, result: 'failed', message: 'Satellite must have exactly one evolith.yaml in repository root' };
    }
    return { rule, result: 'passed' };
  }

  private async evalF1AdrRegistry(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const evolithYaml = path.join(ctx.satellitePath, 'evolith.yaml');
    if (!await this.fs.exists(evolithYaml)) {
      return { rule, result: 'skipped', message: 'No evolith.yaml found' };
    }
    const content = await this.fs.readFile(evolithYaml);
    const yaml = this.configParser.parse(content) as Record<string, unknown>;
    const metadata = yaml?.metadata as Record<string, unknown> | undefined;
    if (metadata?.phase === 'F1' || metadata?.phase === 1) {
      const spec = yaml?.spec as Record<string, unknown> | undefined;
      const compliance = spec?.compliance as Record<string, unknown> | undefined;
      const adrRegistry = compliance?.adrRegistry as string[] | undefined;
      if (adrRegistry && adrRegistry.some(adr => adr.includes('ADR-0047') || adr.includes('0047'))) {
        return { rule, result: 'passed' };
      }
      return { rule, result: 'failed', message: 'F1 phase satellite must reference core/ADR-0047 in spec.compliance.adrRegistry' };
    }
    return { rule, result: 'passed', message: 'Rule applies only to F1 phase satellites' };
  }

  private async evalExtractionReadiness(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const evolithYaml = path.join(ctx.satellitePath, 'evolith.yaml');
    if (!await this.fs.exists(evolithYaml)) {
      return { rule, result: 'skipped', message: 'No evolith.yaml found' };
    }
    const content = await this.fs.readFile(evolithYaml);
    const yaml = this.configParser.parse(content) as Record<string, unknown>;
    const metadata = yaml?.metadata as Record<string, unknown> | undefined;
    const phase = metadata?.phase as string | number | undefined;
    if (phase === 'F2' || phase === 2 || phase === 'F3' || phase === 3) {
      const docsPath = path.join(ctx.satellitePath, 'docs', 'extraction-readiness.md');
      if (await this.fs.exists(docsPath)) {
        return { rule, result: 'passed' };
      }
      return {
        rule, result: 'failed',
        message: `${phase} phase satellite must have extraction readiness score documented`,
      };
    }
    return { rule, result: 'passed', message: 'Rule applies only to F2/F3 phase satellites' };
  }
}
