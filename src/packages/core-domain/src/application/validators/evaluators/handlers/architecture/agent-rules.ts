import { IFileSystem } from '../../../../../domain/interfaces';
import { NormalizedRule } from '../../../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext } from '../../evaluator.interface';
import { SubResult, PASSED, SKIPPED, asRecord, asStringArray, isRestrictedAccess, isPositiveNumber, pathsOverlap, readJsonConfig, declaredDirectoryIsPopulated, declaredFileHasContent, findDeclaredBoundaryBreaches } from './shared';

export const AGENT_CATEGORIES = new Set([
  'agent-identity', 'agent-sandbox', 'agent-prompt-boundaries', 'agent-tool-approval',
  'agent-sandbox-limits', 'agent-context-trust', 'agent-action-accountability',
  'agent-operational-budgets', 'agent-credential-lifecycle',
  'agent-sandbox-observed',
]);

export async function evaluateAgentRule(rule: NormalizedRule, ctx: WorkspaceEvaluationContext, fs: IFileSystem): Promise<SubResult> {
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
      // GT-683: the two arrays were the WHOLE rule, so a descriptor naming
      // directories that do not exist satisfied a boundary it never checked.
      // The offender is named, because "the separation is missing" tells nobody
      // which path to create.
      const missing: string[] = [];
      for (const declared of [...promptSources, ...implementationRoots]) {
        if (!await declaredDirectoryIsPopulated(fs, ctx.satellitePath, declared)) missing.push(declared);
      }
      if (missing.length > 0) {
        return fail(`Declared prompt/implementation paths must exist and hold files; missing or empty: ${missing.join(', ')}`);
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
      // GT-683: `fs.exists` is true of a DIRECTORY, so an empty folder satisfied
      // a rule whose own text asks for "a readable runbook document". Now the
      // path must be a file with content -- a zero-byte file is not a runbook.
      const runbooksExists = runbooksPath.length > 0 && await declaredFileHasContent(fs, ctx.satellitePath, runbooksPath);
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
    case 'agent-sandbox-observed': {
      // GT-683 — the other half of AAI-R02, and deliberately a SEPARATE rule.
      // R02's own text says `agent.config.json MUST declare`, and the handler
      // honours that literally; redefining it to mean "and the code agrees" would
      // change a shipped rule's meaning in silence. This one reads the code.
      const sandbox = asRecord(config?.sandbox);
      const claimsRestriction = isRestrictedAccess(sandbox?.network) || isRestrictedAccess(sandbox?.process);
      // No claim, no contradiction. A descriptor that never promised a boundary is
      // judged by R02, which fails it there -- not twice, and not here.
      if (!claimsRestriction) return SKIPPED;
      const roots = asStringArray(config?.implementationRoots);
      if (roots.length === 0) return SKIPPED;
      const breaches = await findDeclaredBoundaryBreaches(fs, ctx.satellitePath, roots);
      if (breaches.length > 0) {
        const first = breaches.slice(0, 3).map((b) => `${b.file}:${b.line} — ${b.evidence}`).join('; ');
        return fail(`Declared a restricted sandbox and the implementation contradicts it (${breaches.length} occurrence(s)): ${first}`);
      }
      return PASSED;
    }
    default:
      return SKIPPED;
  }
}
