import * as path from 'node:path';
import type { IFileSystem, IConfigParser } from '@evolith/core';
import {
  DeepArchitectureAnalyzer,
  ArchitectureDriftService,
  RulesetValidatorService,
} from '@evolith/core';
import { McpTool } from '../mcp/tool.interface';

interface ArchIssue {
  ruleId: string;
  level: string;
  title: string;
  severity: string;
  blocking: boolean;
}

/**
 * Maps a canonical progressive-axis topology id to the internal maturity level
 * the validators use. The progressive axis is
 * modular-monolith → distributed-modules → microservices. The `F1/F2/F3` values
 * are the internal encoding, not a user-facing input alias.
 */
const PROGRESSIVE_LEVEL: Record<string, 'F1' | 'F2' | 'F3'> = {
  'modular-monolith': 'F1',
  'distributed-modules': 'F2',
  microservices: 'F3',
};

function normalizeLevel(input: string | undefined): 'F1' | 'F2' | 'F3' {
  if (!input) return 'F1';
  return PROGRESSIVE_LEVEL[input.trim()] ?? 'F1';
}

/** Architecture tools: progressive-axis validation (optionally deep) and drift detection. */
export function createArchitectureTools(
  fs: IFileSystem,
  configParser: IConfigParser,
  validator: RulesetValidatorService,
): McpTool[] {
  return [
    {
      schema: {
        name: 'evolith-architecture-validate',
        description:
          'Validate repository architecture along the progressive maturity axis ' +
          '(modular-monolith → distributed-modules → microservices). Use deep=true for ' +
          'import graph analysis, layer violations, and coupling metrics.',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            level: {
              type: 'string',
              description:
                'Progressive-axis topology id (modular-monolith, distributed-modules, microservices). ' +
                'Default: modular-monolith.',
            },
            deep: { type: 'boolean', description: 'Enable deep static analysis', default: false },
          },
          required: ['path'],
        },
      },
      execute: async (args) => {
        const repoPath = args.path as string;
        const level = normalizeLevel(args.level as string | undefined);
        const deep = (args.deep as boolean) || false;
        if (!repoPath) return { error: true, message: 'path is required' };

        const issues: ArchIssue[] = [];
        if (level === 'F1' || level === 'F2' || level === 'F3') {
          issues.push(...(await validateF1ModularIndependence(repoPath, fs)));
        }
        if (level === 'F2' || level === 'F3') {
          issues.push(...(await validateF2ContractBoundaries(repoPath, fs)));
        }
        if (level === 'F3') {
          issues.push(...(await validateF3ExtractionReadiness(repoPath, fs, configParser)));
        }
        if (deep) issues.push(...(await runDeepAnalysis(repoPath)));

        // OPA parity via the shared ruleset validator.
        try {
          const corePath = path.join(repoPath, '..', 'evolith');
          const opaResult = await validator.validate(repoPath, corePath);
          for (const issue of opaResult.issues.filter((i) => /^F[123]/.test(i.ruleId))) {
            issues.push({
              ruleId: issue.ruleId,
              level: issue.ruleId.substring(0, 2),
              title: issue.title,
              severity: issue.severity,
              blocking: issue.blocking,
            });
          }
        } catch {
          // OPA parity is best-effort; native checks still apply.
        }

        const blockingCount = issues.filter((i) => i.blocking).length;
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
      },
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
        if (!repoPath) return { error: true, message: 'path is required' };

        try {
          const driftService = new ArchitectureDriftService();
          const result = await driftService.detectDrift({ projectPath: repoPath, corePath });
          return { tool: 'evolith-drift-detect', repository: repoPath, result, timestamp: new Date().toISOString() };
        } catch (error) {
          return {
            error: true,
            message: `Failed to detect drift: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
  ];
}

async function runDeepAnalysis(repoPath: string): Promise<ArchIssue[]> {
  const issues: ArchIssue[] = [];
  try {
    const analyzer = new DeepArchitectureAnalyzer(repoPath);
    const result = await analyzer.analyze();

    for (const v of result.layerViolations) {
      issues.push({
        ruleId: v.ruleId,
        level: 'F1',
        title: `Layer violation: ${v.fromLayer} → ${v.toLayer} (${v.fromFile} imports ${v.toFile})`,
        severity: v.severity,
        blocking: v.blocking,
      });
    }
    for (const v of result.contextViolations) {
      issues.push({
        ruleId: v.ruleId,
        level: 'F2',
        title: `Context coupling: ${v.fromContext} → ${v.toContext} (${v.fromFile} imports ${v.toFile})`,
        severity: v.severity,
        blocking: v.blocking,
      });
    }
    for (const issue of result.dependencyInversionIssues) {
      issues.push({ ruleId: issue.ruleId, level: 'F1', title: issue.issue, severity: issue.severity, blocking: issue.blocking });
    }

    const couplingSummary: Record<string, unknown> = {};
    for (const [context, instability] of Object.entries(result.couplingMetrics.instability)) {
      couplingSummary[context] = {
        instability: (instability as number).toFixed(2),
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

async function validateF1ModularIndependence(repoPath: string, fs: IFileSystem): Promise<ArchIssue[]> {
  const issues: ArchIssue[] = [];
  const packageJsonPath = path.join(repoPath, 'package.json');
  if (await fs.exists(packageJsonPath)) {
    const pkg = (await fs.readJson(packageJsonPath)) as { workspaces?: unknown };
    if (pkg.workspaces) {
      issues.push({ ruleId: 'F1-01', level: 'F1', title: 'Monorepo workspace detected', severity: 'SHOULD', blocking: false });
    }
  }
  const srcDir = path.join(repoPath, 'src');
  if (await fs.exists(srcDir)) {
    const entries = await fs.readdirNames(srcDir);
    if (entries.filter((e) => !e.startsWith('.')).length <= 5) {
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

async function validateF2ContractBoundaries(repoPath: string, fs: IFileSystem): Promise<ArchIssue[]> {
  const issues: ArchIssue[] = [];
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
          const pkg = (await fs.readJson(packageJsonPath)) as { dependencies?: Record<string, string> };
          for (const dep of Object.keys(pkg.dependencies || {})) {
            if (dep.startsWith('@') && dep.includes('/')) {
              const [scope] = dep.split('/');
              if (dep === `${scope}/${entry}`) circularDeps = true;
            }
          }
        }
      }
    }
    if (circularDeps) {
      issues.push({ ruleId: 'F2-01', level: 'F2', title: 'Circular dependency detected between modules', severity: 'MUST', blocking: true });
    }
  }
  return issues;
}

async function validateF3ExtractionReadiness(
  repoPath: string,
  fs: IFileSystem,
  configParser: IConfigParser,
): Promise<ArchIssue[]> {
  const issues: ArchIssue[] = [];
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
  if (!(await fs.exists(path.join(repoPath, 'Dockerfile')))) {
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
