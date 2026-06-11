import * as path from 'path';
import { IFileSystem } from '../../abstractions';
import { EvaluationContext } from './evaluator.interface';

export class OpaInputBuilder {
  constructor(private readonly fs: IFileSystem) {}

  public async build(ctx: EvaluationContext): Promise<any> {
    const satelliteWorkflows = await this.readWorkflows(ctx.satellitePath);
    const coreEvidence = await this.readEvidence(ctx.corePath);
    const mcpServerContent = await this.safeReadFile(path.join(ctx.corePath, 'sdk', 'cli', 'src', 'core', 'mcp', 'server.ts'));

    const input: any = {
      satellitePath: ctx.satellitePath,
      corePath: ctx.corePath,
      satellite: {
        packageJson: await this.safeReadJson(path.join(ctx.satellitePath, 'package.json')),
        hasPackageLock: await this.fs.exists(path.join(ctx.satellitePath, 'package-lock.json')),
        hasDependabot: await this.fs.exists(path.join(ctx.satellitePath, '.github', 'dependabot.yml')),
        hasRenovate: await this.fs.exists(path.join(ctx.satellitePath, '.renovaterc.json')),
        directories: await this.getTopLevelDirs(ctx.satellitePath),
        workflows: satelliteWorkflows,
        workspacePackageJsons: await this.readWorkspacePackageJsons(ctx.satellitePath)
      },
      core: {
        packageJson: await this.safeReadJson(path.join(ctx.corePath, 'package.json')),
        hasPackageLock: await this.fs.exists(path.join(ctx.corePath, 'package-lock.json')),
        hasDependabot: await this.fs.exists(path.join(ctx.corePath, '.github', 'dependabot.yml')),
        directories: await this.getTopLevelDirs(ctx.corePath),
        adrs: await this.listAdrs(ctx.corePath),
        evidence: coreEvidence,
        cli: {
          hasMainJs: await this.fs.exists(path.join(ctx.corePath, 'sdk', 'cli', 'dist', 'main.js')),
          hasTests: await this.hasCompiledTests(ctx.corePath),
          hasReadme: await this.fs.exists(path.join(ctx.corePath, 'sdk', 'cli', 'README.md')),
          hasArchitectureMd: await this.fs.exists(path.join(ctx.corePath, 'sdk', 'cli', 'ARCHITECTURE.md')),
          hasPackageLock: await this.fs.exists(path.join(ctx.corePath, 'sdk', 'cli', 'package-lock.json')),
          mcpServerSource: mcpServerContent
        }
      }
    };
    return input;
  }

  private async safeReadJson(filePath: string): Promise<any> {
    if (await this.fs.exists(filePath)) {
      try {
        return await this.fs.readJson(filePath);
      } catch {
        return null;
      }
    }
    return null;
  }

  private async safeReadFile(filePath: string): Promise<string | null> {
    if (await this.fs.exists(filePath)) {
      try {
        return await this.fs.readFile(filePath);
      } catch {
        return null;
      }
    }
    return null;
  }

  private async getTopLevelDirs(dir: string): Promise<string[]> {
    if (!await this.fs.exists(dir)) return [];
    const entries = await this.fs.readdirNames(dir);
    const dirs = [];
    for (const entry of entries) {
      if (entry === '.' || entry === '..') continue;
      const stat = await this.fs.stat(path.join(dir, entry));
      if (stat.isDirectory()) dirs.push(entry);
    }
    return dirs;
  }

  private async readWorkflows(root: string): Promise<Record<string, string>> {
    const workflowsDir = path.join(root, '.github', 'workflows');
    const result: Record<string, string> = {};
    if (!await this.fs.exists(workflowsDir)) return result;
    const entries = await this.fs.readdirNames(workflowsDir);
    for (const entry of entries) {
      if (entry.endsWith('.yml') || entry.endsWith('.yaml')) {
        const content = await this.safeReadFile(path.join(workflowsDir, entry));
        if (content) result[entry] = content;
      }
    }
    return result;
  }

  private async readEvidence(root: string): Promise<Record<string, any>> {
    const evidenceDir = path.join(root, '.harness', 'evidence');
    const result: Record<string, any> = {};
    if (!await this.fs.exists(evidenceDir)) return result;
    const entries = await this.fs.readdirNames(evidenceDir);
    for (const entry of entries) {
      if (entry.endsWith('.json')) {
        const content = await this.safeReadJson(path.join(evidenceDir, entry));
        if (content) result[entry] = content;
      }
    }
    return result;
  }

  private async listAdrs(root: string): Promise<string[]> {
    const adrDir = path.join(root, 'reference', 'architecture', 'adrs');
    if (!await this.fs.exists(adrDir)) return [];
    return this.listFilesRecursive(adrDir);
  }

  private async listFilesRecursive(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await this.fs.readdirNames(dir);

    for (const entry of entries) {
      if (entry === '.' || entry === '..') continue;
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

  private async hasCompiledTests(root: string): Promise<boolean> {
    const distDir = path.join(root, 'sdk', 'cli', 'dist');
    if (!await this.fs.exists(distDir)) return false;
    const files = await this.listFilesRecursive(distDir);
    return files.some(f => f.includes('.spec.') || f.includes('.test.'));
  }

  private async readWorkspacePackageJsons(rootPath: string): Promise<any[]> {
    const rootPkgPath = path.join(rootPath, 'package.json');
    const files: any[] = [];
    const rootPkg = await this.safeReadJson(rootPkgPath);
    if (!rootPkg) return files;
    
    files.push({ path: rootPkgPath, content: rootPkg });

    const workspaces = rootPkg['workspaces'] as string[] | { packages?: string[] } | undefined;
    const patterns: string[] = Array.isArray(workspaces)
      ? workspaces
      : (workspaces?.packages ?? []);

    for (const pattern of patterns) {
      const base = pattern.replace(/\/\*.*$/, '');
      const wsBase = path.join(rootPath, base);
      if (await this.fs.exists(wsBase)) {
        const entries = await this.fs.readdirNames(wsBase);
        for (const entry of entries) {
          if (entry === '.' || entry === '..') continue;
          const pkgPath = path.join(wsBase, entry, 'package.json');
          const pkg = await this.safeReadJson(pkgPath);
          if (pkg) files.push({ path: pkgPath, content: pkg });
        }
      }
    }
    return files;
  }
}
