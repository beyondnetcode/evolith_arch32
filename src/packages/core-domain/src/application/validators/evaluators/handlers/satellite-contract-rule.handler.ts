import * as path from 'path';
import { IFileSystem, IConfigParser } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

export class SatelliteContractRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem, private readonly configParser: IConfigParser) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.id.startsWith('SVC-');
  }

  async evaluate(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    switch (rule.id) {
      case 'SVC-01': return this.evalProjectEvolithYaml(rule, ctx);
      case 'SVC-02': return { rule, result: 'skipped', message: 'Satellite name uniqueness requires registry check' };
      case 'SVC-03': return this.evalF1AdrRegistry(rule, ctx);
      case 'SVC-04': return this.evalExtractionReadiness(rule, ctx);
      case 'SVC-05': return { rule, result: 'skipped', message: 'Core version existence requires registry check' };
      case 'SVC-06': return this.evalWorkspaceIntegrity(rule, ctx);
      default: return { rule, result: 'skipped', message: 'Unhandled SVC rule' };
    }
  }

  /**
   * SVC-01 (ADR-0109: project-scoped). The native evaluator already runs against
   * `ctx.satellitePath` — for a workspace that path is the resolved *project*
   * root, so a single evolith.yaml there satisfies the rule. A single-repo
   * satellite is the degenerate case where the project root is the repo root.
   */
  private async evalProjectEvolithYaml(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const evolithYaml = path.join(ctx.satellitePath, 'evolith.yaml');
    if (!await this.fs.exists(evolithYaml)) {
      return { rule, result: 'failed', message: 'Satellite project must have exactly one evolith.yaml at its project root' };
    }
    return { rule, result: 'passed' };
  }

  /**
   * SVC-06 (ADR-0109: workspace integrity). When the root carries an
   * `evolith.workspace.yaml`, every declared `spec.projects[].path` must contain
   * an `evolith.yaml`, and every `evolith.yaml` discovered under the workspace
   * must correspond to a declared project path (no stray/nested manifests).
   * Single-project satellites (no workspace descriptor) are exempt.
   */
  private async evalWorkspaceIntegrity(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const workspaceDescriptor = path.join(ctx.satellitePath, 'evolith.workspace.yaml');
    if (!await this.fs.exists(workspaceDescriptor)) {
      return { rule, result: 'skipped', message: 'No evolith.workspace.yaml — single-project satellite, workspace integrity not applicable' };
    }

    const content = await this.fs.readFile(workspaceDescriptor);
    const doc = this.configParser.parse(content) as Record<string, unknown>;
    const spec = doc?.spec as Record<string, unknown> | undefined;
    const projects = (spec?.projects as Array<Record<string, unknown>> | undefined) ?? [];
    const declaredPaths = new Set(
      projects
        .map(p => this.normalizeRel(String(p?.path ?? '')))
        .filter(p => p.length > 0),
    );

    // 1. Every declared project path must contain an evolith.yaml.
    const missing: string[] = [];
    for (const rel of declaredPaths) {
      const manifest = path.join(ctx.satellitePath, rel, 'evolith.yaml');
      if (!await this.fs.exists(manifest)) {
        missing.push(rel);
      }
    }

    // 2. Every discovered evolith.yaml must be declared (no stray/nested manifests).
    const discovered = await this.discoverManifestDirs(ctx.satellitePath);
    const undeclared = discovered.filter(rel => !declaredPaths.has(rel));

    if (missing.length === 0 && undeclared.length === 0) {
      return { rule, result: 'passed' };
    }

    const parts: string[] = [];
    if (missing.length > 0) {
      parts.push(`declared project(s) missing evolith.yaml: ${missing.join(', ')}`);
    }
    if (undeclared.length > 0) {
      parts.push(`undeclared evolith.yaml discovered at: ${undeclared.join(', ')}`);
    }
    return { rule, result: 'failed', message: `Workspace integrity violation — ${parts.join('; ')}` };
  }

  /**
   * Walk the workspace tree (bounded — skips VCS/build/dependency dirs) and
   * return the workspace-relative directory of every `evolith.yaml` found.
   */
  private async discoverManifestDirs(workspaceRoot: string): Promise<string[]> {
    const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.harness', 'bin', 'obj', '.next', 'coverage']);
    const found: string[] = [];

    const walk = async (dir: string): Promise<void> => {
      let entries: Awaited<ReturnType<IFileSystem['readdir']>>;
      try {
        entries = await this.fs.readdir(dir);
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (SKIP.has(entry.name)) continue;
          await walk(path.join(dir, entry.name));
        } else if (entry.isFile() && entry.name === 'evolith.yaml') {
          found.push(this.normalizeRel(path.relative(workspaceRoot, dir)));
        }
      }
    };

    await walk(workspaceRoot);
    return found;
  }

  /** Normalize a workspace-relative path: strip ./ prefix and trailing slash; root → '.'. */
  private normalizeRel(rel: string): string {
    const trimmed = rel.replace(/^\.\//, '').replace(/\/+$/, '');
    return trimmed.length === 0 ? '.' : trimmed;
  }

  private async evalF1AdrRegistry(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
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

  private async evalExtractionReadiness(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
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
