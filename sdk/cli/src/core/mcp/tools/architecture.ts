import * as path from 'path';
import { getFileSystem, getContainer } from './tool-utils';
import { IFileSystem, IConfigParser } from '../../abstractions';

export async function handleArchitectureTools(args: Record<string, unknown>) {
  const fs = getFileSystem();
  const configParser = getContainer().createConfigParser('yaml');
  const repoPath = args.path as string;
  const level = (args.level as string) || 'F1';

  if (!repoPath) {
    return { error: true, message: 'path is required' };
  }

  const issues: Array<{ ruleId: string; level: string; title: string; severity: string; blocking: boolean }> = [];

  if (level === 'F1' || level === 'F2' || level === 'F3') {
    issues.push(...await validateF1ModularIndependence(repoPath, fs, configParser));
  }

  if (level === 'F2' || level === 'F3') {
    issues.push(...await validateF2ContractBoundaries(repoPath, fs));
  }

  if (level === 'F3') {
    issues.push(...await validateF3ExtractionReadiness(repoPath, fs, configParser));
  }

  const blockingCount = issues.filter(i => i.blocking).length;

  return {
    level,
    repository: repoPath,
    status: blockingCount > 0 ? 'failed' : 'passed',
    issuesChecked: issues.length,
    blockingIssues: blockingCount,
    issues,
    timestamp: new Date().toISOString(),
  };
}

async function validateF1ModularIndependence(repoPath: string, fs: IFileSystem, configParser: IConfigParser): Promise<Array<{ ruleId: string; level: string; title: string; severity: string; blocking: boolean }>> {
  const issues: Array<{ ruleId: string; level: string; title: string; severity: string; blocking: boolean }> = [];

  const packageJsonPath = path.join(repoPath, 'package.json');
  if (await fs.exists(packageJsonPath)) {
    const pkg = await fs.readJson(packageJsonPath) as { workspaces?: unknown };
    if (pkg.workspaces) {
      issues.push({
        ruleId: 'F1-01',
        level: 'F1',
        title: 'Monorepo workspace detected',
        severity: 'SHOULD',
        blocking: false,
      });
    }
  }

  const srcDir = path.join(repoPath, 'src');
  if (await fs.exists(srcDir)) {
    const entries = await fs.readdirNames(srcDir);
    const hasMultipleModules = entries.filter(e => !e.startsWith('.')).length > 5;
    if (!hasMultipleModules) {
      issues.push({
        ruleId: 'F1-02',
        level: 'F1',
        title: 'Single module detected - should have multiple bounded contexts',
        severity: 'SHOULD',
        blocking: false,
      });
    }
  }

  return issues;
}

async function validateF2ContractBoundaries(repoPath: string, fs: IFileSystem): Promise<Array<{ ruleId: string; level: string; title: string; severity: string; blocking: boolean }>> {
  const issues: Array<{ ruleId: string; level: string; title: string; severity: string; blocking: boolean }> = [];

  const srcDir = path.join(repoPath, 'src');
  if (await fs.exists(srcDir)) {
    const entries = await fs.readdirNames(srcDir);
    let circularDeps = false;

    for (const entry of entries) {
      const entryPath = path.join(srcDir, entry);
      const stat = await fs.stat(entryPath);
      if (stat.isDirectory()) {
        const packageJsonPath = path.join(entryPath, 'package.json');
        if (await fs.exists(packageJsonPath)) {
          const pkg = await fs.readJson(packageJsonPath) as { dependencies?: Record<string, string> };
          if (pkg.dependencies) {
            for (const dep of Object.keys(pkg.dependencies)) {
              if (dep.startsWith('@') && dep.includes('/')) {
                const [scope] = dep.split('/');
                if (dep === `${scope}/${entry}`) {
                  circularDeps = true;
                }
              }
            }
          }
        }
      }
    }

    if (circularDeps) {
      issues.push({
        ruleId: 'F2-01',
        level: 'F2',
        title: 'Circular dependency detected between modules',
        severity: 'MUST',
        blocking: true,
      });
    }
  }

  return issues;
}

async function validateF3ExtractionReadiness(repoPath: string, fs: IFileSystem, configParser: IConfigParser): Promise<Array<{ ruleId: string; level: string; title: string; severity: string; blocking: boolean }>> {
  const issues: Array<{ ruleId: string; level: string; title: string; severity: string; blocking: boolean }> = [];

  const evolithYamlPath = path.join(repoPath, 'evolith.yaml');
  if (await fs.exists(evolithYamlPath)) {
    const content = await fs.readFile(evolithYamlPath);
    const config = configParser.parse(content) as { product?: { type?: string } };

    if (!config.product?.type) {
      issues.push({
        ruleId: 'F3-01',
        level: 'F3',
        title: 'Product type not declared - extraction readiness unknown',
        severity: 'SHOULD',
        blocking: false,
      });
    }
  }

  const dockerfilePath = path.join(repoPath, 'Dockerfile');
  const hasDocker = await fs.exists(dockerfilePath);

  if (!hasDocker) {
    issues.push({
      ruleId: 'F3-02',
      level: 'F3',
      title: 'No Dockerfile found - microservice extraction requires containerization',
      severity: 'SHOULD',
      blocking: false,
    });
  }

  return issues;
}