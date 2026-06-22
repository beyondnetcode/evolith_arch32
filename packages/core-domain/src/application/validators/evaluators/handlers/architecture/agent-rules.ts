import * as path from 'path';
import { IFileSystem } from '../../../../../domain/interfaces';
import { NormalizedRule } from '../../../../../domain/models/normalized-rule';
import { EvaluationContext } from '../../evaluator.interface';
import { SubResult, PASSED, SKIPPED, asRecord, asStringArray, isRestrictedAccess, isPositiveNumber, pathsOverlap, readJsonConfig } from './shared';

export const AGENT_CATEGORIES = new Set([
  'agent-identity', 'agent-sandbox', 'agent-prompt-boundaries', 'agent-tool-approval',
  'agent-sandbox-limits', 'agent-context-trust', 'agent-action-accountability',
  'agent-operational-budgets', 'agent-credential-lifecycle',
]);

export async function evaluateAgentRule(rule: NormalizedRule, ctx: EvaluationContext, fs: IFileSystem): Promise<SubResult> {
  const config = await readJsonConfig(fs, ctx.satellitePath, 'agent.config.json');
  const fail = (reason: string): SubResult => ({ result: 'failed', message: `${rule.description} - ${reason}` });

  switch (rule.category) {
    case 'agent-identity': {
      const agent = asRecord(config?.agent);
      if (typeof agent?.id !== 'string' || agent.id.length === 0 || asStringArray(agent.capabilities).length === 0) {
        return fail('Expected agent.config.json with agent.id and one or more capabilities');
      }
      return PASSED;
    }
    case 'agent-sandbox': {
      const sandbox = asRecord(config?.sandbox);
      if (sandbox?.mode !== 'isolated' || !isRestrictedAccess(sandbox.network) || !isRestrictedAccess(sandbox.process)) {
        return fail('Expected sandbox.mode=isolated and deny or allowlist network and process access');
      }
      return PASSED;
    }
    case 'agent-prompt-boundaries': {
      const promptSources = asStringArray(config?.promptSources);
      const implementationRoots = asStringArray(config?.implementationRoots);
      if (promptSources.length === 0 || implementationRoots.length === 0 || pathsOverlap(promptSources, implementationRoots)) {
        return fail('Expected non-overlapping promptSources and implementationRoots in agent.config.json');
      }
      return PASSED;
    }
    case 'agent-tool-approval': {
      const toolPolicy = asRecord(config?.toolPolicy);
      if (toolPolicy?.mutative !== 'approval-required') {
        return fail('Expected toolPolicy.mutative=approval-required in agent.config.json');
      }
      return PASSED;
    }
    case 'agent-sandbox-limits': {
      const sandbox = asRecord(config?.sandbox);
      if (sandbox?.ephemeral !== true || !isPositiveNumber(sandbox.maxDurationSeconds) || !isPositiveNumber(sandbox.maxMemoryMb) || !isPositiveNumber(sandbox.maxCpuCores)) {
        return fail('Expected ephemeral sandbox with positive duration, memory, and CPU limits');
      }
      return PASSED;
    }
    case 'agent-context-trust': {
      const contextPolicy = asRecord(config?.contextPolicy);
      if (contextPolicy?.untrustedContent !== 'data-only' || contextPolicy?.provenanceRequired !== true || contextPolicy?.toolOutputSchemaValidation !== true) {
        return fail('Expected data-only untrusted context, provenance, and tool-output schema validation');
      }
      return PASSED;
    }
    case 'agent-action-accountability': {
      const toolPolicy = asRecord(config?.toolPolicy);
      const audit = asRecord(config?.audit);
      if (toolPolicy?.capabilityDelegation !== 'scoped-and-expiring' || audit?.appendOnly !== true || audit?.correlationId !== 'required') {
        return fail('Expected scoped-and-expiring capabilities plus append-only correlated action evidence');
      }
      return PASSED;
    }
    case 'agent-operational-budgets': {
      const budgets = asRecord(config?.operationalBudgets);
      const concurrency = asRecord(budgets?.mcpToolConcurrency);
      const runbooksPath = typeof budgets?.runbooksPath === 'string' ? budgets.runbooksPath : '';
      const runbooksAbsolute = runbooksPath.length > 0 ? (path.isAbsolute(runbooksPath) ? runbooksPath : path.join(ctx.satellitePath, runbooksPath)) : '';
      const runbooksExists = runbooksAbsolute.length > 0 && await fs.exists(runbooksAbsolute);
      if (!isPositiveNumber(budgets?.maxPromptTokens)
        || !isPositiveNumber(budgets?.maxCompletionTokens)
        || !isPositiveNumber(budgets?.maxContextWindowTokens)
        || !isPositiveNumber(concurrency?.maxInFlight)
        || !isPositiveNumber(concurrency?.perToolMaxInFlight)
        || !runbooksExists) {
        return fail('Expected positive token, context, and MCP concurrency budgets plus a runbooksPath that exists');
      }
      return PASSED;
    }
    case 'agent-credential-lifecycle': {
      const credentials = asRecord(config?.credentialLifecycle);
      const revocation = asRecord(credentials?.revocation);
      if (!isPositiveNumber(credentials?.delegationMaxTtlSeconds)
        || !isPositiveNumber(credentials?.rotationCadenceDays)
        || (revocation?.onIncident !== 'immediate' && revocation?.onIncident !== 'scheduled')
        || !isPositiveNumber(revocation?.maxPropagationSeconds)) {
        return fail('Expected positive delegation TTL, rotation cadence, and bounded incident revocation');
      }
      return PASSED;
    }
    default:
      return SKIPPED;
  }
}
