import * as path from 'path';
import { IFileSystem } from '../../../../domain/interfaces';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

/**
 * The native twin of `mcp.rego`. GT-716 AC4 aligned the two where they disagreed:
 *
 * - MCP-01..03 with no smoke evidence under `<core>/.harness/evidence/` used to be
 *   `skipped` here and `failed` in Rego. The evidence is an observed fact of the
 *   checkout (`core.evidence`), and its absence is the policy's finding — "nothing
 *   proves the server answers `initialize`" — so both engines now fail it, with the
 *   same message telling the reader how to produce the evidence.
 * - MCP-05 was "Unhandled" here while Rego decided it from the server source; the
 *   same token check now runs natively over the same file.
 */
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
    if (rule.id === 'MCP-05') {
      return this.evalMcpMetrics(rule, ctx);
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
      // Same verdict and words as `mcp.rego`: absent evidence is the finding.
      return { rule, result: 'failed', message: 'Run .harness/scripts/mcp-smoke.mjs to generate evidence' };
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

  private serverFile(ctx: WorkspaceEvaluationContext): string {
    return path.join(ctx.corePath, 'src', 'packages', 'mcp-server', 'src', 'mcp', 'mcp-server.service.ts');
  }

  private async evalMcpSecurity(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const serverFile = this.serverFile(ctx);
    if (!await this.fs.exists(serverFile)) {
      return { rule, result: 'skipped', message: 'MCP server.ts not found' };
    }
    const content = await this.fs.readFile(serverFile);
    if (content.includes('apiKey') || content.includes('local-only') || content.includes('localhost')) {
      return { rule, result: 'passed' };
    }
    return { rule, result: 'failed', message: 'MCP transport config missing apiKey or local-only restriction' };
  }

  /** MCP-05, the tokens `mcp.rego` looks for in the same file. */
  private async evalMcpMetrics(rule: NormalizedRule, ctx: WorkspaceEvaluationContext): Promise<RuleEvaluationResult> {
    const serverFile = this.serverFile(ctx);
    if (!await this.fs.exists(serverFile)) {
      return { rule, result: 'skipped', message: 'MCP server.ts not found' };
    }
    const content = await this.fs.readFile(serverFile);
    if (['latency', 'metrics', 'histogram', 'counter'].some(token => content.includes(token))) {
      return { rule, result: 'passed' };
    }
    return {
      rule,
      result: 'failed',
      message: 'MCP tool calls SHOULD emit latency, success, failure, and error class metrics — no metrics instrumentation detected in MCP server source',
    };
  }
}
