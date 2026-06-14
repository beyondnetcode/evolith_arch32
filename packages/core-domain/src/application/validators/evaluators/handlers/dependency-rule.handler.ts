import * as path from 'path';
import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { EvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

export class DependencyRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.category === 'version-pinning' || rule.id.startsWith('DEP-0') || rule.id.startsWith('DEP-1');
  }

  async evaluate(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    if (rule.id === 'DEP-04') return this.evalLockFile(rule, ctx);
    if (rule.id === 'DEP-05') return this.evalCiInstall(rule, ctx);
    if (rule.id === 'DEP-06' || rule.id === 'DEP-07') return this.evalCiAudit(rule, ctx);
    if (rule.id === 'DEP-09') return this.evalDependabot(rule, ctx);
    if (rule.category === 'version-pinning') return this.evalVersionPinning(rule, ctx);
    
    return { rule, result: 'skipped', message: 'Unhandled DEP rule' };
  }

  private async evalVersionPinning(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const violations: string[] = [];
    const targets = rule.id === 'DEP-10'
      ? await this.findWorkspacePackageJsons(ctx.satellitePath)
      : [path.join(ctx.satellitePath, 'package.json')];

    for (const pkgPath of targets) {
      if (!await this.fs.exists(pkgPath)) continue;

      const raw = await this.fs.readJson(pkgPath) as Record<string, unknown>;
      const depsGroups = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

      for (const group of depsGroups) {
        const deps = raw[group] as Record<string, string> | undefined;
        if (!deps) continue;

        for (const [pkg, version] of Object.entries(deps)) {
          const v = String(version ?? '');
          if (
            (rule.id === 'DEP-01' && v.startsWith('^')) ||
            (rule.id === 'DEP-02' && v.startsWith('~')) ||
            (rule.id === 'DEP-03' && ['*', 'latest', 'x', 'X', ''].includes(v)) ||
            (rule.id === 'DEP-10' && (v.startsWith('^') || v.startsWith('~')))
          ) {
            violations.push(`${path.basename(pkgPath)}#${group}.${pkg}=${v}`);
          }
        }
      }
    }

    if (violations.length > 0) {
      return {
        rule,
        result: 'failed',
        message: `Unpinned dependencies: ${violations.slice(0, 5).join(', ')}${violations.length > 5 ? ` (+${violations.length - 5} more)` : ''}`,
      };
    }

    return { rule, result: 'passed' };
  }

  private async evalLockFile(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const candidates = [
      path.join(ctx.satellitePath, 'package-lock.json'),
      path.join(ctx.corePath, 'package-lock.json'),
    ];

    for (const p of candidates) {
      if (await this.fs.exists(p)) return { rule, result: 'passed' };
    }

    return { rule, result: 'failed', message: 'package-lock.json not found at project or workspace root' };
  }

  private async evalCiInstall(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    return this.evalCiWorkflowContains(rule, ctx, 'npm ci', 'CI workflow does not use "npm ci"');
  }

  private async evalCiAudit(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    return this.evalCiWorkflowContains(rule, ctx, 'npm audit', 'CI workflow does not run "npm audit"');
  }

  private async evalDependabot(rule: NormalizedRule, ctx: EvaluationContext): Promise<RuleEvaluationResult> {
    const candidates = [
      path.join(ctx.satellitePath, '.github', 'dependabot.yml'),
      path.join(ctx.satellitePath, '.renovaterc.json'),
      path.join(ctx.corePath, '.github', 'dependabot.yml'),
    ];

    for (const p of candidates) {
      if (await this.fs.exists(p)) return { rule, result: 'passed' };
    }

    return { rule, result: 'failed', message: 'No .github/dependabot.yml or .renovaterc.json found' };
  }

  private async evalCiWorkflowContains(
    rule: NormalizedRule,
    ctx: EvaluationContext,
    needle: string,
    failMsg: string,
  ): Promise<RuleEvaluationResult> {
    const workflowDir = path.join(ctx.satellitePath, '.github', 'workflows');
    if (!await this.fs.exists(workflowDir)) {
      return { rule, result: 'skipped', message: 'No .github/workflows directory found' };
    }

    const files = await this.fs.readdirNames(workflowDir);
    for (const f of files) {
      if (!f.endsWith('.yml') && !f.endsWith('.yaml')) continue;
      const content = await this.fs.readFile(path.join(workflowDir, f));
      if (content.includes(needle)) return { rule, result: 'passed' };
    }

    return { rule, result: 'failed', message: failMsg };
  }

  private async findWorkspacePackageJsons(rootPath: string): Promise<string[]> {
    const rootPkg = path.join(rootPath, 'package.json');
    const files: string[] = [];

    if (await this.fs.exists(rootPkg)) {
      files.push(rootPkg);
      const raw = await this.fs.readJson(rootPkg) as Record<string, unknown>;
      const workspaces = raw['workspaces'] as string[] | { packages?: string[] } | undefined;
      const patterns: string[] = Array.isArray(workspaces)
        ? workspaces
        : (workspaces?.packages ?? []);

      for (const pattern of patterns) {
        const base = pattern.replace(/\/\*.*$/, '');
        const wsBase = path.join(rootPath, base);
        if (await this.fs.exists(wsBase)) {
          const entries = await this.fs.readdirNames(wsBase);
          for (const entry of entries) {
            const pkgPath = path.join(wsBase, entry, 'package.json');
            if (await this.fs.exists(pkgPath)) files.push(pkgPath);
          }
        }
      }
    }

    return files.length > 0 ? files : [rootPkg];
  }
}
