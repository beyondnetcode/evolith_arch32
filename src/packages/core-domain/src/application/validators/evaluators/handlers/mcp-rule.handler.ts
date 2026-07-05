import * as path from 'path';
import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

export class McpRuleHandler implements INativeRuleHandler {
  constructor(private readonly fs: IFileSystem) {}

  canHandle(rule: NormalizedRule): boolean {
    return rule.id.startsWith('MCP-');
  }

  async evaluate(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    if (rule.id === 'MCP-01' || rule.id === 'MCP-02' || rule.id === 'MCP-03') {
      return this.evalMcpEvidence(rule, ctx);
    }
    if (rule.id === 'MCP-04') {
      return this.evalMcpSecurity(rule, ctx);
    }
    return { rule, result: 'skipped', message: 'Unhandled MCP rule' };
  }

  private async evalMcpEvidence(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const evidenceDir = path.join(ctx.corePath, '.harness', 'evidence');
    const files = await this.fs.exists(evidenceDir)
      ? await this.fs.readdirNames(evidenceDir)
      : [];
    const smokeFile = files.find(f => f.includes('mcp') && f.endsWith('.json'));

    if (!smokeFile) {
      return { rule, result: 'skipped', message: 'Run .harness/scripts/mcp-smoke.mjs to generate evidence' };
    }

    const evidence = JSON.parse(
      await this.fs.readFile(path.join(evidenceDir, smokeFile)),
    ) as Record<string, unknown>;

    const results = evidence['results'] as Record<string, unknown> | undefined;
    if (!results) return { rule, result: 'failed', message: 'Evidence missing results field' };

    if (rule.id === 'MCP-01' && !results['initialize']) {
      return { rule, result: 'failed', message: 'initialize response missing from evidence' };
    }
    if (rule.id === 'MCP-02' && !results['tools/list']) {
      return { rule, result: 'failed', message: 'tools/list response missing from evidence' };
    }
    if (rule.id === 'MCP-03' && !results['resources/list']) {
      return { rule, result: 'failed', message: 'resources/list response missing from evidence' };
    }

    return { rule, result: 'passed' };
  }

  private async evalMcpSecurity(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const serverFile = path.join(ctx.corePath, 'sdk', 'cli', 'src', 'core', 'mcp', 'server.ts');
    if (!await this.fs.exists(serverFile)) {
      return { rule, result: 'skipped', message: 'MCP server.ts not found' };
    }
    const content = await this.fs.readFile(serverFile);
    if (content.includes('apiKey') || content.includes('local-only') || content.includes('localhost')) {
      return { rule, result: 'passed' };
    }
    return { rule, result: 'failed', message: 'MCP transport config missing apiKey or local-only restriction' };
  }
}
