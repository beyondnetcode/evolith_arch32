import { Injectable } from '@nestjs/common';
import { RulesetValidatorService, ValidationResult } from '@evolith/core';
import { McpTool, McpToolSchema } from '../mcp/tool.interface';

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
    description: 'Validate a satellite repository against Evolith rules',
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
      },
      required: ['path'],
    },
  };

  constructor(private readonly validator: RulesetValidatorService) {}

  async execute(args: Record<string, unknown>): Promise<unknown> {
    const path = args.path as string | undefined;
    const format = (args.format as string) || 'json';
    const ruleset = args.ruleset as string | undefined;
    const corePath = args.corePath as string | undefined;

    if (!path) {
      throw new Error('path is required');
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
