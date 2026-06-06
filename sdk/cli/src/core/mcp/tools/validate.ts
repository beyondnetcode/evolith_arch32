import { RulesetValidatorService } from '../../validators/ruleset-validator.service';

export async function handleValidateTool(
  args: Record<string, unknown>,
  validator: RulesetValidatorService,
) {
  const path = args.path as string;
  const format = (args.format as string) || 'json';
  const ruleset = args.ruleset as string | undefined;
  const corePath = args.corePath as string | undefined;

  if (!path) {
    return { error: true, message: 'path is required' };
  }

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