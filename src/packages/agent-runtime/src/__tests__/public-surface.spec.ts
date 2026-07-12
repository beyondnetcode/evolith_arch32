/**
 * GT-388 — public-surface freeze guard.
 *
 * Freezes the runtime VALUE surface of the package's public entrypoints so any
 * added / removed / renamed export is a deliberate, reviewed change (and, for a
 * removal or rename, a SemVer major). `./ports` is a type-only surface, frozen
 * by consumers' `tsc`, so it has no runtime guard here.
 *
 * If this test fails because you intentionally changed the surface: update the
 * frozen list below AND record it as additive (minor) or breaking (major) per
 * the package's "Versioning & contract stability" policy in the README.
 */

import * as mainEntry from '../index';
import * as adaptersEntry from '../adapters/index';

const keys = (m: object): string[] => Object.keys(m).sort();

/** The exact runtime value surface of the `./adapters` subpath export. */
const ADAPTERS_SURFACE = [
  'ApprovalResolutionError',
  'AutoApprovalAdapter',
  'ChatApprovalAdapter',
  'CliCommunicationGatewayAdapter',
  'CompositeTrackerTraceAdapter',
  'DEFAULT_SKILLS',
  'DenyByDefaultApprovalAdapter',
  'ExternalTriggerInteractionAdapter',
  'FileMemoryAdapter',
  'FileSchedulerAdapter',
  'FileTrackerTraceAdapter',
  'HarnessProcessAdapter',
  'HermesAgentAdapter',
  'HermesChatBoxInteractionAdapter',
  'HttpCoreEvaluationAdapter',
  'HttpTrackerTraceAdapter',
  'InMemoryApprovalStore',
  'InMemoryHarnessAdapter',
  'InMemoryKnowledgeAdapter',
  'InMemoryMemoryAdapter',
  'InMemorySchedulerAdapter',
  'InMemoryTrackerTraceAdapter',
  'InProcessCoreEvaluationAdapter',
  'LocalSkillRegistryAdapter',
  'McpInteractionAdapter',
  'MockTrackerTraceAdapter',
  'NoopApprovalTransport',
  'OpaCliPolicyValidationAdapter',
  'OpenCodeInteractionAdapter',
  'OpenTelemetryTrackerTraceAdapter',
  'PendingApprovalAdapter',
  'PolicyBasedEngineRouter',
  'RoutingAgentAdapter',
  'SlackApprovalAdapter',
  'SmartCliChatInteractionAdapter',
  'SmartCliCommandInteractionAdapter',
  'StubAgentEngineAdapter',
  'StubCoreEvaluationAdapter',
  'StubPolicyValidationAdapter',
  'SwarmsAgentAdapter',
  'denyOnFailedEvaluation',
  'loadManifest',
  'parseManifest',
].sort();

describe('public surface freeze (GT-388)', () => {
  it('`./adapters` exposes exactly the frozen set of value exports', () => {
    expect(keys(adaptersEntry)).toEqual(ADAPTERS_SURFACE);
  });

  it('the root re-exports the bootstrap factory, the request parser, and every adapter', () => {
    const main = keys(mainEntry);
    expect(main).toContain('ArchitecturePlanInterpreter');
    expect(main).toContain('createAgentRuntime'); // bootstrap
    expect(main).toContain('GeminiProvider');
    expect(main).toContain('parseAgentRuntimeRequest'); // domain contract helper
    for (const name of ADAPTERS_SURFACE) {
      expect(main).toContain(name);
    }
  });
});
