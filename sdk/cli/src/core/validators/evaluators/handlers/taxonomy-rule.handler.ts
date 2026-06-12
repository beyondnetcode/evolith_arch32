import * as path from 'path';
import { IFileSystem } from '../../../abstractions';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { EvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

export class TaxonomyRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.id === 'TAX-05' || rule.id === 'TAX-06' || rule.id === 'TAX-07' || rule.id === 'TAX-08';
  }

  async evaluate(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    if (rule.id === 'TAX-05' || rule.id === 'TAX-06') return this.evalDirectoryStructure(rule, ctx);
    if (rule.id === 'TAX-07' || rule.id === 'TAX-08') return this.evalAdrNaming(rule, ctx);

    return { rule, result: 'skipped', message: 'Unhandled TAX rule' };
  }

  private async evalDirectoryStructure(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    if (rule.id === 'TAX-05') {
      const expected = ['reference', 'rulesets', 'sdk', '.harness'];
      const missing = [];
      for (const dir of expected) {
        if (!await this.fs.exists(path.join(ctx.corePath, dir))) missing.push(dir);
      }
      if (missing.length > 0) {
        return { rule, result: 'failed', message: `Missing top-level directories: ${missing.join(', ')}` };
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'TAX-06') {
      if (ctx.satellitePath === ctx.corePath) {
        return { rule, result: 'skipped', message: 'Not applicable when validating Core itself' };
      }
      const hasPkg = await this.fs.exists(path.join(ctx.satellitePath, 'package.json'));
      if (!hasPkg) {
        return { rule, result: 'skipped', message: 'Satellite has no package.json — directory structure check not applicable' };
      }
      const required = ['src', 'tests', 'docs'];
      const missing = [];
      for (const dir of required) {
        if (!await this.fs.exists(path.join(ctx.satellitePath, dir))) missing.push(dir);
      }
      if (missing.length > 0) {
        return { rule, result: 'failed', message: `Satellite missing directories: ${missing.join(', ')}` };
      }
      return { rule, result: 'passed' };
    }

    return { rule, result: 'skipped', message: 'Unhandled TAX rule' };
  }

  private async evalAdrNaming(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const adrDir = path.join(ctx.corePath, 'reference', 'architecture', 'adrs');
    if (!await this.fs.exists(adrDir)) {
      return { rule, result: 'skipped', message: 'ADR directory not found' };
    }

    const entries = await this.listFilesRecursive(adrDir);
    const mdFiles = entries.filter(f => f.endsWith('.md'));

    if (rule.id === 'TAX-07') {
      const adrPattern = /^[0-9]{4}-[a-z0-9-]+\.md$/;
      const violations = mdFiles
        .map(f => path.basename(f))
        .filter(n => /^[0-9]/.test(n) && !n.endsWith('.es.md') && !adrPattern.test(n));

      if (violations.length > 0) {
        return {
          rule, result: 'failed',
          message: `ADR filenames not matching kebab-case pattern: ${violations.slice(0, 3).join(', ')}`,
        };
      }
      return { rule, result: 'passed' };
    }

    if (rule.id === 'TAX-08') {
      const enFiles = mdFiles.filter(f => !f.endsWith('.es.md'));
      const missing = enFiles.filter(f => !mdFiles.includes(f.replace(/\.md$/, '.es.md')));
      if (missing.length > 0) {
        return {
          rule, result: 'failed',
          message: `ADRs missing bilingual pair: ${missing.slice(0, 3).map(f => path.basename(f)).join(', ')}`,
        };
      }
      return { rule, result: 'passed' };
    }

    return { rule, result: 'skipped', message: 'Unhandled TAX-ADR rule' };
  }

  private async listFilesRecursive(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await this.fs.readdirNames(dir);

    for (const entry of entries) {
      const full = path.join(dir, entry);
      const stat = await this.fs.stat(full);
      if (stat.isDirectory()) {
        files.push(...await this.listFilesRecursive(full));
      } else {
        files.push(full);
      }
    }

    return files;
  }
}
