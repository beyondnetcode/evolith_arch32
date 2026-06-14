import * as path from 'path';
import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { EvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

export class CliReleaseRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.id.startsWith('CLI-RR-');
  }

  async evaluate(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    if (rule.id === 'CLI-RR-01') return this.evalBuild(rule, ctx);
    if (rule.id === 'CLI-RR-02') return this.evalTestArtifacts(rule, ctx);
    if (rule.id === 'CLI-RR-03') return this.evalDependencyLock(rule, ctx);
    if (rule.id === 'CLI-RR-04') return this.evalMcpSmoke(rule, ctx);
    if (rule.id === 'CLI-RR-05') return this.evalCliDocs(rule, ctx);

    return { rule, result: 'skipped', message: 'Unhandled CLI-RR rule' };
  }

  private async evalBuild(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const distMain = path.join(ctx.corePath, 'sdk', 'cli', 'dist', 'main.js');
    if (await this.fs.exists(distMain)) return { rule, result: 'passed' };
    return { rule, result: 'failed', message: `dist/main.js not found — run npm run build in sdk/cli` };
  }

  private async evalTestArtifacts(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const distDir = path.join(ctx.corePath, 'sdk', 'cli', 'dist');
    if (!await this.fs.exists(distDir)) {
      return { rule, result: 'failed', message: 'dist/ not found — run npm run build' };
    }
    const specFiles = await this.findSpecFiles(distDir);
    if (specFiles.length === 0) {
      return { rule, result: 'skipped', message: 'No compiled spec files in dist/ — run npm test to confirm' };
    }
    return { rule, result: 'passed' };
  }

  private async evalDependencyLock(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const candidates = [
      path.join(ctx.corePath, 'package-lock.json'),
      path.join(ctx.corePath, 'sdk', 'cli', 'package-lock.json'),
    ];
    for (const p of candidates) {
      if (await this.fs.exists(p)) return { rule, result: 'passed' };
    }
    return { rule, result: 'failed', message: 'package-lock.json not found' };
  }

  private async evalMcpSmoke(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const evidenceDir = path.join(ctx.corePath, '.harness', 'evidence');
    if (!await this.fs.exists(evidenceDir)) {
      return { rule, result: 'failed', message: 'No .harness/evidence directory' };
    }
    const files = await this.fs.readdirNames(evidenceDir);
    const smokeFile = files.find(f => f.includes('mcp') && f.endsWith('.json'));
    if (!smokeFile) {
      return { rule, result: 'failed', message: 'No MCP smoke evidence found in .harness/evidence/' };
    }

    const content = await this.fs.readFile(path.join(evidenceDir, smokeFile));
    const evidence = JSON.parse(content) as Record<string, unknown>;
    if (evidence['status'] !== 'passed') {
      return { rule, result: 'failed', message: `MCP smoke evidence status: ${evidence['status']}` };
    }
    return { rule, result: 'passed' };
  }

  private async evalCliDocs(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const cliDir = path.join(ctx.corePath, 'sdk', 'cli');
    const readme = path.join(cliDir, 'README.md');
    const arch = path.join(cliDir, 'ARCHITECTURE.md');
    if (await this.fs.exists(readme) || await this.fs.exists(arch)) {
      return { rule, result: 'passed' };
    }
    return { rule, result: 'failed', message: 'CLI missing README.md or ARCHITECTURE.md' };
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

  private async findSpecFiles(dir: string): Promise<string[]> {
    const all = await this.listFilesRecursive(dir);
    return all.filter(f => f.includes('.spec.') || f.includes('.test.'));
  }
}
