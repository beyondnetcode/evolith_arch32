// @ts-nocheck
import { IFileSystem, IConfigParser } from '@evolith/core-domain/domain/interfaces';
import { RulesetValidatorService } from '@evolith/core-domain/application/validators/ruleset-validator.service';

import { IMcpToolHandler } from '../mcp-tool.registry';

export function getValidateTools(fs: IFileSystem, configParser: IConfigParser): IMcpToolHandler[] {
  return [
    {
      schema: {
        name: 'evolith-validate',
        description: 'Validate a satellite repository against Evolith rules',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to the satellite repository' },
            format: { type: 'string', description: 'Output format (json, summary, table)', default: 'json' },
            ruleset: { type: 'string', description: 'Optional ID of a specific ruleset to load' },
            corePath: { type: 'string', description: 'Optional explicit path to the Evolith core repository' },
          },
          required: ['path'],
        },
      },
      execute: async (args, deps) => {
        const path = args.path as string;
        const format = (args.format as string) || 'json';
        const ruleset = args.ruleset as string | undefined;
        const corePath = args.corePath as string | undefined;

        if (!path) {
          return { error: true, message: 'path is required' };
        }

        const validator = deps?.validator || new RulesetValidatorService();

        if (ruleset) {
          const coreRepoPath = corePath || findCorePath(path);
          const issues = await validator.loadRulesetById(coreRepoPath, ruleset);
          return {
            tool: 'evolith-validate',
            ruleset,
            corePath: coreRepoPath,
            issues,
            timestamp: new Date().toISOString(),
          };
        }

        const result = await validator.validate(path, corePath);

        if (format === 'summary') {
          return formatSummary(result);
        } else if (format === 'table') {
          return formatTable(result);
        }

        return result;
      }
    }
  ];
}

function formatSummary(result: { status: string; rulesChecked: number; issues: Array<{ ruleId: string; severity: string; title: string; blocking: boolean }> }) {
  const passed = result.status === 'passed' ? '✓' : '✗';
  const issueCount = result.issues.length;
  return `${passed} Validation ${result.status.toUpperCase()}\nRules checked: ${result.rulesChecked}\nIssues: ${issueCount}\n${result.issues.filter(i => i.blocking).map(i => `  [${i.severity}] ${i.ruleId}: ${i.title}`).join('\n')}`;
}

function formatTable(result: { status: string; rulesChecked: number; issues: Array<{ ruleId: string; severity: string; title: string; blocking: boolean; category: string }> }) {
  const lines = [`| Rule | Severity | Category | Title | Blocking |`, `|--------|----------|----------|-------|----------|`];
  for (const issue of result.issues) {
    lines.push(`| ${issue.ruleId} | ${issue.severity} | ${issue.category} | ${issue.title} | ${issue.blocking ? 'YES' : 'no'} |`);
  }
  return lines.join('\n');
}

function findCorePath(satellitePath: string): string {
  const path = require('path');
  const parts = satellitePath.split(path.sep);
  while (parts.length > 0) {
    parts.pop();
    const candidate = path.join(parts.join(path.sep), 'rulesets');
    if (require('fs').existsSync(candidate)) {
      return parts.join(path.sep);
    }
  }
  return path.join(satellitePath, '..', 'evolith');
}