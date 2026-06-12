import * as path from 'path';
import { IFileSystem } from '../../../abstractions';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { EvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

export class EvidenceRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.id.startsWith('EVD-');
  }

  async evaluate(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const evidenceDir = path.join(ctx.corePath, '.harness', 'evidence');
    if (!await this.fs.exists(evidenceDir)) {
      return { rule, result: 'failed', message: '.harness/evidence directory not found' };
    }

    const files = await this.fs.readdirNames(evidenceDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    if (jsonFiles.length === 0) {
      return { rule, result: 'failed', message: 'No evidence manifests found in .harness/evidence/' };
    }

    for (const file of jsonFiles) {
      const content = await this.fs.readFile(path.join(evidenceDir, file));
      let manifest: Record<string, unknown>;
      try {
        manifest = JSON.parse(content) as Record<string, unknown>;
      } catch {
        return { rule, result: 'failed', message: `Invalid JSON in evidence file: ${file}` };
      }

      switch (rule.id) {
        case 'EVD-01': {
          const required = ['id', 'source', 'generatedAt', 'producer'];
          const missing = required.filter(k => !manifest[k]);
          if (missing.length > 0) {
            return { rule, result: 'failed', message: `${file} missing fields: ${missing.join(', ')}` };
          }
          if (!manifest['evaluatedRules'] && !manifest['relatedRuleIds'] && !manifest['relatedGateId']) {
            return { rule, result: 'failed', message: `${file} missing evaluatedRules or relatedGateId` };
          }
          break;
        }
        case 'EVD-02': {
          if (!manifest['sourceRef']) {
            return { rule, result: 'failed', message: `${file} missing sourceRef` };
          }
          break;
        }
        case 'EVD-03': {
          const required = ['status', 'evaluatedRules', 'blockingFailures'];
          const missing = required.filter(k => !manifest[k]);
          if (missing.length > 0) {
            return { rule, result: 'failed', message: `${file} missing fields: ${missing.join(', ')}` };
          }
          break;
        }
        case 'EVD-04': {
          if (!manifest['retentionPeriod'] || !manifest['owner']) {
            return { rule, result: 'failed', message: `${file} missing retentionPeriod or owner` };
          }
          break;
        }
      }
    }

    return { rule, result: 'passed' };
  }
}
