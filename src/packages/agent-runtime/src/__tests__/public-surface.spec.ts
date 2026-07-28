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
  'ChatApprovalTransport',
  'CliCommunicationGatewayAdapter',
  'COWORK_ENGINE',
  'CoworkAgentEngineAdapter',
  'CompositeTrackerTraceAdapter',
  'DEFAULT_SKILLS',
  'DenyByDefaultApprovalAdapter',
  'ExternalTriggerInteractionAdapter',
  'FileApprovalStore',
  'FileMemoryAdapter',
  'FileSchedulerAdapter',
  'FileTrackerTraceAdapter',
  // GT-593 — step journal / resumability. ADDITIVE to the GT-388 freeze.
  'FileRunJournalAdapter',
  'InMemoryRunJournalAdapter',
  'FsWorkspaceContextAdapter',
  'HarnessProcessAdapter',
  // GT-607 — least-privilege capability environment. ADDITIVE to the GT-388 freeze.
  'DEFAULT_CAPABILITY_MAX_MEMORY_MB',
  'DEFAULT_CAPABILITY_ENV_ALLOWLIST',
  'CREDENTIAL_ENV_NAME_PATTERN',
  'buildCapabilityEnv',
  'isCredentialEnvName',
  // GT-613 — first IStructuralReviewer adapter. ADDITIVE to the GT-388 freeze.
  'HEURISTIC_COVERED_STANDARDS',
  'HEURISTIC_UNCOVERED_STANDARDS',
  'HeuristicStructuralReviewer',
  'HermesAgentAdapter',
  'HermesChatBoxInteractionAdapter',
  'HttpCoreEvaluationAdapter',
  'HttpSlackClient',
  'HttpTrackerTraceAdapter',
  'InMemoryApprovalStore',
  'InMemoryHarnessAdapter',
  'InMemoryKnowledgeAdapter',
  'InMemoryMemoryAdapter',
  'InMemorySchedulerAdapter',
  'InMemoryTrackerTraceAdapter',
  'InProcessCoreEvaluationAdapter',
  'LocalSkillRegistryAdapter',
  // GT-608 — manifest-derived skill catalogue. ADDITIVE to the GT-388 freeze.
  'ManifestSkillRegistryAdapter',
  'deriveSkillsFromManifest',
  'intentsForCapability',
  'McpInteractionAdapter',
  'MockTrackerTraceAdapter',
  'NoopApprovalTransport',
  'OpaCliPolicyValidationAdapter',
  'OpenCodeInteractionAdapter',
  'OpenTelemetryTrackerTraceAdapter',
  'PGVECTOR_KNOWLEDGE_DIM',
  'PendingApprovalAdapter',
  'PgVectorKnowledgeAdapter',
  'PolicyBasedEngineRouter',
  'RAG_CHUNKS_TABLE',
  'RoutingAgentAdapter',
  'SlackApprovalAdapter',
  'SlackApprovalTransport',
  // GT-531 — supervised assistant reference wiring. ADDITIVE to the GT-388 freeze:
  // new names only, no existing export changed or removed, so the frozen contract holds.
  'ASSISTANT_INVOKE_SKILL_ID',
  'SupervisedAssistantClient',
  'SmartCliChatInteractionAdapter',
  'SmartCliCommandInteractionAdapter',
  'StubAgentEngineAdapter',
  'StubCoreEvaluationAdapter',
  'StubPolicyValidationAdapter',
  'SwarmsAgentAdapter',
  // GT-441 — Tracker-routed HITL. ADDITIVE to the GT-388 freeze: new names only,
  // no existing export changed or removed, so the frozen contract holds.
  'TRACKER_DECISION_PREFIX',
  'TRACKER_UNAVAILABLE_PREFIX',
  'TrackerApprovalAdapter',
  'TrackerApprovalHttpClient',
  'denyOnFailedEvaluation',
  'isTrackerUnavailable',
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
