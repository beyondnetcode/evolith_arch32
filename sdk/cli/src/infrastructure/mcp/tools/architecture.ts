// @ts-nocheck
import * as path from 'path';
import { IFileSystem, IConfigParser } from '@evolith/core-domain/domain/interfaces';
import { DeepArchitectureAnalyzer } from '@evolith/core-domain/application/validators/deep-architecture-analyzer';

import { IMcpToolHandler } from '../mcp-tool.registry';

export function getArchitectureTools(fs: IFileSystem, configParser: IConfigParser): IMcpToolHandler[] {
  return [
    {
      schema: {
        name: 'evolith-architecture-validate',
        description: 'Validate repository architecture against F1/F2/F3 rules. Use deep=true for import graph analysis, layer violations, and coupling metrics.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            level: { type: 'string', description: 'F1, F2, or F3' },
            deep: { type: 'boolean', description: 'Enable deep static analysis (import graph, layer violations, coupling metrics)', default: false },
          },
          required: ['path'],
        },
      },
      execute: async (args, deps) => {
        /* fs injected */
        /* configParser injected */
        const repoPath = args.path as string;
        const level = (args.level as string) || 'F1';
        const deep = (args.deep as boolean) || false;

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

        if (deep) {
          const deepResults = await runDeepAnalysis(repoPath);
          issues.push(...deepResults);
        }

        // Use proper RulesetValidatorService for OPA Parity
        const validator = deps?.validator;
        if (validator) {
           const corePath = path.join(repoPath, '..', 'evolith');
           const opaResult = await validator.validate(repoPath, corePath);
           const opaArchIssues = opaResult.issues.filter((i: unknown) => i.ruleId.startsWith('F1') || i.ruleId.startsWith('F2') || i.ruleId.startsWith('F3'));
           for (const issue of opaArchIssues) {
             issues.push({
               ruleId: issue.ruleId,
               level: issue.ruleId.substring(0, 2),
               title: issue.title,
               severity: issue.severity,
               blocking: issue.blocking
             });
           }
        }

        const blockingCount = issues.filter(i => i.blocking).length;

        return {
          level,
          repository: repoPath,
          deepAnalysis: deep,
          status: blockingCount > 0 ? 'failed' : 'passed',
          issuesChecked: issues.length,
          blockingIssues: blockingCount,
          issues,
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      schema: {
        name: 'evolith-drift-detect',
        description: 'Detect architecture drift in a repository',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            corePath: { type: 'string', description: 'Optional explicit path to the Evolith core repository' },
          },
          required: ['path'],
        },
      },
      execute: async (args) => {
        const repoPath = args.path as string;
        const corePath = (args.corePath as string) || path.join(repoPath, '..', 'evolith');

        if (!repoPath) {
          return { error: true, message: 'path is required' };
        }

        try {
          const { ArchitectureDriftService } = require('../../../application/validators/architecture-drift.service');
          const driftService = new ArchitectureDriftService();
          const result = await driftService.detectDrift(repoPath, corePath);
          return {
            tool: 'evolith-drift-detect',
            repository: repoPath,
            result,
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
           return {
             error: true,
             message: `Failed to detect drift: ${error instanceof Error ? error.message : String(error)}`
           };
        }
      }
    }
  ];
}

async function runDeepAnalysis(repoPath: string): Promise<Array<{ ruleId: string; level: string; title: string; severity: string; blocking: boolean }>> {
  const issues: Array<{ ruleId: string; level: string; title: string; severity: string; blocking: boolean }> = [];

  try {
    const analyzer = new DeepArchitectureAnalyzer(repoPath);
    const result = await analyzer.analyze();

    for (const violation of result.layerViolations) {
      issues.push({
        ruleId: violation.ruleId,
        level: 'F1',
        title: `Layer violation: ${violation.fromLayer} → ${violation.toLayer} (${violation.fromFile} imports ${violation.toFile})`,
        severity: violation.severity,
        blocking: violation.blocking,
      });
    }

    for (const violation of result.contextViolations) {
      issues.push({
        ruleId: violation.ruleId,
        level: 'F2',
        title: `Context coupling: ${violation.fromContext} → ${violation.toContext} (${violation.fromFile} imports ${violation.toFile})`,
        severity: violation.severity,
        blocking: violation.blocking,
      });
    }

    for (const issue of result.dependencyInversionIssues) {
      issues.push({
        ruleId: issue.ruleId,
        level: 'F1',
        title: issue.issue,
        severity: issue.severity,
        blocking: issue.blocking,
      });
    }

    const couplingSummary: Record<string, unknown> = {};
    for (const [context, instability] of Object.entries(result.couplingMetrics.instability)) {
      couplingSummary[context] = {
        instability: instability.toFixed(2),
        afferent: result.couplingMetrics.afferentCoupling[context] || 0,
        efferent: result.couplingMetrics.efferentCoupling[context] || 0,
      };
    }

    if (Object.keys(couplingSummary).length > 0) {
      issues.push({
        ruleId: 'ARCH-COUPLING',
        level: 'F2',
        title: `Coupling metrics: ${JSON.stringify(couplingSummary)}`,
        severity: 'MAY',
        blocking: false,
      });
    }
  } catch (error) {
    issues.push({
      ruleId: 'ARCH-DEEP-ERROR',
      level: 'F1',
      title: `Deep analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      severity: 'SHOULD',
      blocking: false,
    });
  }

  return issues;
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