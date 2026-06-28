import { Injectable, Optional } from '@nestjs/common';
import { RulesetValidatorService, ValidationResult } from '@evolith/core';
import { McpTool, McpToolSchema } from '../mcp/tool.interface';
import { safeParseSatelliteManifest } from '@evolith/core-domain/schemas';

/**
 * `evolith-validate` — validate a satellite repository against Evolith rules.
 *
 * Delegates to the shared {@link RulesetValidatorService} from `@evolith/core`;
 * supports `json` (default), `summary`, and `table` output formats, plus loading
 * a single ruleset by id.
 */
@Injectable()
export class ValidateTool implements McpTool {
  readonly schema: McpToolSchema = {
    name: 'evolith-validate',
    description: 'Validate a satellite repository against Evolith rules. Supports end-to-end evaluation pipeline via manifest.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the satellite repository' },
        format: {
          type: 'string',
          description: 'Output format (json, summary, table)',
          default: 'json',
        },
        ruleset: { type: 'string', description: 'Optional ID of a specific ruleset to load' },
        corePath: {
          type: 'string',
          description: 'Optional explicit path to the Evolith core repository',
        },
        topology: { type: 'string', description: 'Topology to target (auto-detects from manifest if omitted). Triggers end-to-end pipeline.' },
        phase: { type: 'string', description: 'SDLC phase to evaluate (canonical: discovery|design|construction|qa|release; legacy f1-f5 deprecated). Triggers end-to-end pipeline.' },
        manifest: { type: 'string', description: 'JSON string or path to SatelliteManifest for pipeline evaluation. Overrides path/topology/phase.' },
      },
      required: ['path'],
    },
  };

  constructor(
    private readonly validator: RulesetValidatorService,
    @Optional() private readonly validateUseCase?: any,
  ) {}

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const path = args.path as string | undefined;
    const format = (args.format as string) || 'json';
    const ruleset = args.ruleset as string | undefined;
    const corePath = args.corePath as string | undefined;
    const topology = args.topology as string | undefined;
    const phase = args.phase as string | undefined;
    const manifestArg = args.manifest as string | undefined;

    if (!path) {
      throw new Error('path is required');
    }

    // End-to-end pipeline mode (GT-281)
    if (manifestArg || topology || phase) {
      const raw = manifestArg
        ? (typeof manifestArg === 'string' && manifestArg.startsWith('{')
            ? JSON.parse(manifestArg)
            : { satellitePath: path, corePath, topology: manifestArg === path ? topology : undefined })
        : { satellitePath: path, corePath, topology, phase };

      const parsed = safeParseSatelliteManifest(raw);
      if (!parsed.success) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Invalid SatelliteManifest: ${parsed.error.message}` }],
        };
      }

      return this.runPipeline(parsed.data);
    }

    if (ruleset) {
      const coreRepoPath = corePath || (await findCorePath(path));
      const issues = await this.validator.loadRulesetById(coreRepoPath, ruleset);
      return {
        tool: 'evolith-validate',
        ruleset,
        corePath: coreRepoPath,
        issues,
        timestamp: new Date().toISOString(),
      };
    }

    const result = await this.validator.validate(path, corePath);

    if (format === 'summary') return formatSummary(result);
    if (format === 'table') return formatTable(result);
    return result;
  }

  private async runPipeline(manifest: any): Promise<unknown> {
    // Dynamically import use case to avoid circular DI issues
    const { ValidateSatelliteUseCase } = await import('@evolith/core-domain/application/use-cases/validate-satellite.use-case');
    const useCase = this.validateUseCase || new ValidateSatelliteUseCase(this.validator);
    const output = await useCase.execute({ satellitePath: manifest.satellitePath, manifest });

    // GT-282: flatten actionable evidence per gate
    const gates = (output.evaluationVerdict?.gates ?? []).map((gate: any) => ({
      gateId: gate.gateId,
      gateName: gate.gateName,
      phase: gate.phase,
      verdict: gate.verdict,
      evaluations: gate.artifactEvaluations.map((ev: any) => ({
        ruleId: ev.ruleId,
        rulePath: ev.rulePath,
        artifact: ev.artifact,
        passed: ev.passed,
        message: ev.message,
        severity: ev.severity,
        remediation: ev.remediation,
        gateRef: ev.gateRef,
      })),
    }));

    return {
      tool: 'evolith-validate',
      type: 'pipeline',
      passed: output.evaluationVerdict?.passed ?? false,
      topology: output.evaluationVerdict?.resolvedTopology ?? null,
      gates,
      summary: output.evaluationVerdict?.summary ?? {},
      result: output.result,
      evaluatedAt: output.evaluationVerdict?.evaluatedAt ?? new Date().toISOString(),
      outputEnvelope: output.evaluationVerdict?.outputEnvelope ?? null,
    };
  }
}

function formatSummary(result: ValidationResult): string {
  const passed = result.status === 'passed' ? '✓' : '✗';
  const blocking = result.issues
    .filter((i) => i.blocking)
    .map((i) => `  [${i.severity}] ${i.ruleId}: ${i.title}`)
    .join('\n');
  return `${passed} Validation ${result.status.toUpperCase()}\nRules checked: ${result.rulesChecked}\nIssues: ${result.issues.length}\n${blocking}`;
}

function formatTable(result: ValidationResult): string {
  const lines = [
    `| Rule | Severity | Category | Title | Blocking |`,
    `|--------|----------|----------|-------|----------|`,
  ];
  for (const issue of result.issues) {
    lines.push(
      `| ${issue.ruleId} | ${issue.severity} | ${issue.category} | ${issue.title} | ${issue.blocking ? 'YES' : 'no'} |`,
    );
  }
  return lines.join('\n');
}

/** Walk parent directories looking for a `rulesets/` folder (the Evolith core). */
async function findCorePath(satellitePath: string): Promise<string> {
  const path = await import('node:path');
  const fs = await import('node:fs/promises');
  const parts = satellitePath.split(path.sep);
  while (parts.length > 0) {
    parts.pop();
    const candidate = path.join(parts.join(path.sep), 'rulesets');
    try {
      await fs.access(candidate);
      return parts.join(path.sep);
    } catch {
      // keep walking up
    }
  }
  return path.join(satellitePath, '..', 'evolith');
}
