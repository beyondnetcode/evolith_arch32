import { IFileSystem, ICommandExecutor } from '../../domain/interfaces';
import { RepoDetectionResult } from '../ports/repo-detection.port';

export class RepoDetectorService {
  constructor(
    private readonly fs: IFileSystem,
    private readonly cmd: ICommandExecutor,
  ) {}

  async detect(cwd: string): Promise<RepoDetectionResult> {
    const repoName = this.extractRepoName(cwd);
    const remoteUrl = await this.detectRemoteUrl(cwd);
    const remoteOwner = this.parseOwnerFromUrl(remoteUrl);
    const runtime = await this.detectRuntime(cwd);
    const packageManager = await this.detectPackageManager(cwd);
    const framework = await this.detectFramework(cwd, runtime);
    const ciPlatform = await this.detectCiPlatform(cwd);
    const hasDocs = await this.dirExists(cwd, 'docs') || await this.dirExists(cwd, 'doc');
    const hasGovernance = await this.dirExists(cwd, '.harness') || await this.dirExists(cwd, 'reference/governance');
    const hasEvolithYaml = await this.fileExists(cwd, 'evolith.yaml');
    const hasAgentsMd = await this.fileExists(cwd, 'AGENTS.md');

    return {
      repoName,
      remoteUrl,
      remoteOwner,
      runtime,
      packageManager,
      framework,
      ciPlatform,
      hasDocs,
      hasGovernance,
      hasEvolithYaml,
      hasAgentsMd,
    };
  }

  private extractRepoName(cwd: string): string {
    const parts = cwd.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'unknown';
  }

  private async detectRemoteUrl(cwd: string): Promise<string | null> {
    try {
      const output = await this.cmd.executeOrThrow('git remote get-url origin', cwd);
      return output.trim() || null;
    } catch {
      return null;
    }
  }

  private parseOwnerFromUrl(url: string | null): string | null {
    if (!url) return null;
    const httpsMatch = url.match(/github\.com[:/]+([^/]+)\/[^/]+/);
    if (httpsMatch) return httpsMatch[1];
    const sshMatch = url.match(/github\.com:([^/]+)\/[^/]+/);
    if (sshMatch) return sshMatch[1];
    return null;
  }

  private async detectRuntime(cwd: string): Promise<'nodejs' | 'dotnet' | 'python' | 'unknown'> {
    if (await this.fileExists(cwd, 'package.json')) return 'nodejs';
    if (await this.hasGlobFiles(cwd, '*.csproj') || await this.hasGlobFiles(cwd, '*.sln')) return 'dotnet';
    if (await this.fileExists(cwd, 'requirements.txt') || await this.fileExists(cwd, 'pyproject.toml')) return 'python';
    return 'unknown';
  }

  private async detectPackageManager(cwd: string): Promise<'npm' | 'yarn' | 'pnpm' | 'pip' | 'nuget' | 'unknown'> {
    if (await this.fileExists(cwd, 'package-lock.json')) return 'npm';
    if (await this.fileExists(cwd, 'yarn.lock')) return 'yarn';
    if (await this.fileExists(cwd, 'pnpm-lock.yaml')) return 'pnpm';
    if (await this.fileExists(cwd, 'requirements.txt')) return 'pip';
    if (await this.fileExists(cwd, 'packages.lock.json') || await this.fileExists(cwd, 'nuget.config')) return 'nuget';
    return 'unknown';
  }

  private async detectFramework(cwd: string, runtime: string): Promise<string | null> {
    if (runtime === 'nodejs') {
      try {
        const content = await this.fs.readFile(`${cwd}/package.json`);
        const pkg = JSON.parse(content);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (allDeps['@nestjs/core']) return 'nestjs';
        if (allDeps['express']) return 'express';
        if (allDeps['fastify'] || allDeps['@fastify/fastify']) return 'fastify';
        if (allDeps['next']) return 'nextjs';
        if (allDeps['react']) return 'react';
        if (allDeps['vue']) return 'vue';
        if (allDeps['angular'] || allDeps['@angular/core']) return 'angular';
      } catch { /* ignore */ }
    }
    if (runtime === 'python') {
      try {
        if (await this.fileExists(cwd, 'pyproject.toml')) {
          const content = await this.fs.readFile(`${cwd}/pyproject.toml`);
          if (content.includes('fastapi')) return 'fastapi';
          if (content.includes('django')) return 'django';
          if (content.includes('flask')) return 'flask';
        }
        if (await this.fileExists(cwd, 'requirements.txt')) {
          const content = await this.fs.readFile(`${cwd}/requirements.txt`);
          if (content.includes('fastapi')) return 'fastapi';
          if (content.includes('django')) return 'django';
          if (content.includes('flask')) return 'flask';
        }
      } catch { /* ignore */ }
    }
    if (runtime === 'dotnet') {
      try {
        const files = await this.fs.readdirNames(cwd);
        const csproj = files.find(f => f.endsWith('.csproj'));
        if (csproj) {
          const content = await this.fs.readFile(`${cwd}/${csproj}`);
          if (content.includes('Microsoft.NET.Sdk.Web')) return 'aspnetcore';
          if (content.includes('Microsoft.NET.Sdk.Blazor')) return 'blazor';
        }
      } catch { /* ignore */ }
    }
    return null;
  }

  private async detectCiPlatform(cwd: string): Promise<'github' | 'gitlab' | 'azure' | 'none'> {
    if (await this.dirExists(cwd, '.github/workflows')) return 'github';
    if (await this.fileExists(cwd, '.gitlab-ci.yml')) return 'gitlab';
    if (await this.fileExists(cwd, 'azure-pipelines.yml')) return 'azure';
    return 'none';
  }

  private async dirExists(cwd: string, relativePath: string): Promise<boolean> {
    try {
      const stat = await this.fs.stat(`${cwd}/${relativePath}`);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  private async fileExists(cwd: string, relativePath: string): Promise<boolean> {
    try {
      const stat = await this.fs.stat(`${cwd}/${relativePath}`);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  private async hasGlobFiles(cwd: string, pattern: string): Promise<boolean> {
    try {
      const entries = await this.fs.readdirNames(cwd);
      const prefix = pattern.replace('*', '');
      return entries.some(e => e.endsWith(prefix));
    } catch {
      return false;
    }
  }
}
