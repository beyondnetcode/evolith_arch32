import * as path from 'path';
import { IFileSystem } from '../../../domain/interfaces';
import { EvaluationContext } from './evaluator.interface';

export class OpaInputBuilder {
  constructor(private readonly fs: IFileSystem) {}

  public async build(ctx: EvaluationContext): Promise<unknown> {
    const satelliteWorkflows = await this.readWorkflows(ctx.satellitePath);
    const coreEvidence = await this.readEvidence(ctx.corePath);
    const mcpServerContent = await this.safeReadFile(path.join(ctx.corePath, 'sdk', 'cli', 'src', 'core', 'mcp', 'server.ts'));
    const agenticAi = await this.readAgenticAiConfiguration(ctx.satellitePath);
    const serverless = await this.readServerlessConfiguration(ctx.satellitePath);
    const eventDriven = await this.readEventDrivenConfiguration(ctx.satellitePath);

    const input: unknown = {
      satellitePath: ctx.satellitePath,
      corePath: ctx.corePath,
      satellite: {
        packageJson: await this.safeReadJson(path.join(ctx.satellitePath, 'package.json')),
        hasPackageLock: await this.fs.exists(path.join(ctx.satellitePath, 'package-lock.json')),
        hasDependabot: await this.fs.exists(path.join(ctx.satellitePath, '.github', 'dependabot.yml')),
        hasRenovate: await this.fs.exists(path.join(ctx.satellitePath, '.renovaterc.json')),
        directories: await this.getTopLevelDirs(ctx.satellitePath),
        hasContracts: await this.fs.exists(path.join(ctx.satellitePath, 'contracts')),
        hasAcl: await this.fs.exists(path.join(ctx.satellitePath, 'acl')),
        hasEvents: await this.fs.exists(path.join(ctx.satellitePath, 'events')) || await this.fs.exists(path.join(ctx.satellitePath, 'src', 'events')),
        hasExtractionReadiness: await this.fs.exists(path.join(ctx.satellitePath, 'docs', 'extraction-readiness.md')),
        hasDockerfile: await this.fs.exists(path.join(ctx.satellitePath, 'Dockerfile')),
        serverless,
        eventDriven,
        hasAsyncApiConfig: await this.fs.exists(path.join(ctx.satellitePath, 'asyncapi.yaml')) || await this.fs.exists(path.join(ctx.satellitePath, 'asyncapi.json')),
        agenticAi,
        hasOtel: await this.fs.exists(path.join(ctx.satellitePath, 'otel.config.js')) || await this.fs.exists(path.join(ctx.satellitePath, 'opentelemetry.config.js')) || await this.fs.exists(path.join(ctx.satellitePath, 'src', 'instrumentation.ts')),
        workflows: satelliteWorkflows,
        workspacePackageJsons: await this.readWorkspacePackageJsons(ctx.satellitePath),
        sourceFiles: await this.analyzeSourceFiles(ctx.satellitePath)
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

  private async safeReadJson(filePath: string): Promise<unknown> {
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

  private async readAgenticAiConfiguration(root: string): Promise<Record<string, boolean>> {
    const config = await this.safeReadJson(path.join(root, 'agent.config.json')) as Record<string, unknown> | null;
    const agent = this.asRecord(config?.agent);
    const sandbox = this.asRecord(config?.sandbox);
    const toolPolicy = this.asRecord(config?.toolPolicy);
    const contextPolicy = this.asRecord(config?.contextPolicy);
    const audit = this.asRecord(config?.audit);
    const promptSources = this.asStringArray(config?.promptSources);
    const implementationRoots = this.asStringArray(config?.implementationRoots);

    return {
      hasIdentity: typeof agent?.id === 'string' && agent.id.length > 0 && this.asStringArray(agent.capabilities).length > 0,
      hasIsolatedSandbox: sandbox?.mode === 'isolated' && this.isRestrictedAccess(sandbox.network) && this.isRestrictedAccess(sandbox.process),
      hasSeparatedPromptAndImplementation: promptSources.length > 0 && implementationRoots.length > 0 && !this.pathsOverlap(promptSources, implementationRoots),
      requiresApprovalForMutativeTools: toolPolicy?.mutative === 'approval-required',
      hasEphemeralSandboxLimits: sandbox?.ephemeral === true && this.isPositiveNumber(sandbox.maxDurationSeconds) && this.isPositiveNumber(sandbox.maxMemoryMb) && this.isPositiveNumber(sandbox.maxCpuCores),
      hasTrustedContextPolicy: contextPolicy?.untrustedContent === 'data-only' && contextPolicy?.provenanceRequired === true && contextPolicy?.toolOutputSchemaValidation === true,
      hasAccountableActions: toolPolicy?.capabilityDelegation === 'scoped-and-expiring' && audit?.appendOnly === true && audit?.correlationId === 'required',
    };
  }

  private async readServerlessConfiguration(root: string): Promise<Record<string, boolean>> {
    const config = await this.safeReadJson(path.join(root, 'serverless.config.json')) as Record<string, unknown> | null;
    const pkg = this.asRecord(config?.package);
    const coldStart = this.asRecord(config?.coldStart);
    const maxSizeMb = pkg?.maxSizeMb;
    return {
      hasContract: Boolean(config),
      isStateless: config?.stateless === true,
      hasBoundedPackage: typeof maxSizeMb === 'number' && Number.isFinite(maxSizeMb) && maxSizeMb > 0 && maxSizeMb <= 50,
      hasColdStartReadiness: typeof coldStart?.maxInitMilliseconds === 'number' && Number.isFinite(coldStart.maxInitMilliseconds) && coldStart.maxInitMilliseconds > 0 && coldStart?.lazyInitialization === true,
    };
  }

  private async readEventDrivenConfiguration(root: string): Promise<Record<string, boolean>> {
    const config = await this.safeReadJson(path.join(root, 'event-driven.config.json')) as Record<string, unknown> | null;
    return {
      hasStrictAsyncApi: config?.strictAsyncApi === true,
      hasOutbox: config?.transactionalOutbox === true,
      hasDlq: config?.deadLetterQueue === true,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  }

  private asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
  }

  private isRestrictedAccess(value: unknown): boolean {
    return value === 'deny' || value === 'allowlist';
  }

  private isPositiveNumber(value: unknown): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }

  private pathsOverlap(left: string[], right: string[]): boolean {
    return left.some(leftPath => right.some(rightPath => {
      const normalizedLeft = leftPath.replace(/\\+|\/+/g, '/').replace(/\/$/, '');
      const normalizedRight = rightPath.replace(/\\+|\/+/g, '/').replace(/\/$/, '');
      return normalizedLeft === normalizedRight || normalizedLeft.startsWith(`${normalizedRight}/`) || normalizedRight.startsWith(`${normalizedLeft}/`);
    }));
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

  private async readEvidence(root: string): Promise<Record<string, unknown>> {
    const evidenceDir = path.join(root, '.harness', 'evidence');
    const result: Record<string, unknown> = {};
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

  private async readWorkspacePackageJsons(rootPath: string): Promise<unknown[]> {
    const rootPkgPath = path.join(rootPath, 'package.json');
    const files: unknown[] = [];
    const rootPkg = await this.safeReadJson(rootPkgPath);
    if (!rootPkg) return files;
    
    files.push({ path: rootPkgPath, content: rootPkg });
    
    const workspaces = (rootPkg as any)["workspaces"] as string[] | { packages?: string[] } | undefined;
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

  private async analyzeSourceFiles(rootPath: string): Promise<unknown[]> {
    const srcPath = path.join(rootPath, 'src');
    if (!await this.fs.exists(srcPath)) return [];
    
    const allFiles = await this.listFilesRecursive(srcPath);
    const tsFiles = allFiles.filter(f => f.endsWith('.ts'));
    const sourceFilesInfo: unknown[] = [];
    
    // We import typescript here to avoid tying it strictly if the plugin doesn't need it
    let ts: any;
    try {
      ts = require('typescript');
    } catch {
      // If typescript is not installed, return minimal file info
      for (const file of tsFiles) {
        const content = await this.safeReadFile(file);
        sourceFilesInfo.push({ path: file, content: content || '' });
      }
      return sourceFilesInfo;
    }

    for (const file of tsFiles) {
      const content = await this.safeReadFile(file) || '';
      const info: Record<string, unknown> = {
        path: file.replace(rootPath, ''),
        content: content,
        hasAstImport: false,
        hasManualInstantiation: false,
        hasUiImport: false,
        usesRegexForCode: content.includes('RegExp') || content.includes('.match(')
      };

      if (!file.endsWith('.spec.ts') && !file.endsWith('.test.ts')) {
        const sourceFile = ts.createSourceFile(
          file,
          content,
          ts.ScriptTarget.Latest,
          true
        );

        const checkNode = (node: any) => {
          if (ts.isImportDeclaration(node)) {
            const importPath = node.moduleSpecifier.getText().replace(/['"]/g, '');
            if (importPath === 'typescript' || importPath === '@babel/parser') {
              info.hasAstImport = true;
            }
            if (['@clack/prompts', 'inquirer', 'commander', 'express'].includes(importPath)) {
              info.hasUiImport = true;
            }
          }
          if (ts.isNewExpression(node)) {
            const className = node.expression.getText();
            if (/(Service|UseCase|Repository|Adapter)$/.test(className)) {
              info.hasManualInstantiation = true;
            }
          }
          ts.forEachChild(node, checkNode);
        };
        
        checkNode(sourceFile);
      }

      sourceFilesInfo.push(info);
    }

    return sourceFilesInfo;
  }
}
