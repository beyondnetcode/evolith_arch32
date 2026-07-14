/**
 * End-to-end behaviour of the Agent Runtime over its default (stub) adapters.
 * Covers every required case from the design brief:
 *  valid request · unknown tool · blocked validation · mock adapter ·
 *  harness adapter · failed policy validation · trace-event generation.
 */

import { createAgentRuntime } from '../bootstrap';
import { parseAgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';
import { StubPolicyValidationAdapter } from '../adapters/policy/stub-policy-validation.adapter';
import { LocalSkillRegistryAdapter } from '../adapters/skills/local-skill-registry.adapter';
import { InMemoryKnowledgeAdapter } from '../adapters/knowledge/in-memory-knowledge.adapter';
import type { IHarnessPort, HarnessExecutionResult } from '../domain/ports/harness.port';
import type { InMemoryTrackerTraceAdapter } from '../adapters/tracker/in-memory-tracker-trace.adapter';
import type { SkillDescriptor } from '../domain/contracts/capability';

const FIXED_NOW = '2026-06-29T00:00:00.000Z';

function discoveryRequest(present: string[]) {
  return parseAgentRuntimeRequest({
    tenant: 'tenant_demo',
    product: 'evolith_tracker',
    initiative: 'init_001',
    phase: 'discovery',
    gate: 'prd_readiness',
    requested_by: 'tracker_chat',
    intent: 'validate_discovery_gate',
    tool: 'validate-discovery-gate',
    correlation_id: 'corr-1',
    parameters: { requiredArtifacts: ['prd'], presentArtifacts: present, gate: 'prd_readiness' },
  });
}

describe('AgentRuntimeService', () => {
  it('handles a VALID request and returns passed with full provenance', async () => {
    const { runtime } = createAgentRuntime({ now: () => FIXED_NOW });
    const result = await runtime.handle(discoveryRequest(['prd']));

    expect(result.status).toBe('passed');
    expect(result.trace.executedBy).toBe('agent_runtime');
    expect(result.trace.validatedBy).toBe('.harness');
    expect(result.trace.governedBy).toBe('evolith_core');
    expect(result.trace.policyEngine).toBe('opa');
    expect(result.trace.capability).toBe('validate-discovery-gate');
    expect(result.evaluatedAt).toBe(FIXED_NOW);
    expect(result.missingArtifacts).toHaveLength(0);
  });

  it('grounds a run in the knowledge corpus and cites corpus_version (GT-541)', async () => {
    const knowledge = new InMemoryKnowledgeAdapter();
    knowledge.seed([
      {
        chunkId: 'c1',
        sourceFile: 'reference/core/architecture/adrs/core/0002-hexagonal.md',
        sectionHeading: 'Rules',
        adrId: 'ADR-0002',
        language: 'en',
        tokenEstimate: 12,
        // contains the request intent so the token-overlap query retrieves it
        textPreview: 'the validate_discovery_gate rule requires a prd',
        text: 'The validate_discovery_gate rule requires a PRD before the gate passes.',
        corpusVersion: 'abc123def456',
      },
    ]);
    const { runtime } = createAgentRuntime({ now: () => FIXED_NOW, knowledge });
    const result = await runtime.handle(discoveryRequest(['prd']));

    expect(result.trace.steps).toContain('ground'); // queried the corpus BEFORE recommending
    expect(result.trace.groundedBy?.corpusVersion).toBe('abc123def456'); // cites the exact release
    expect(result.trace.groundedBy?.citations[0]).toContain('0002-hexagonal.md#Rules');
  });

  it('grounds against the default corpus with empty citations when nothing matches (GT-541)', async () => {
    // The default bundle wires an empty in-memory corpus: grounding still runs (best-effort)
    // but cites nothing, and NEVER blocks the governed run.
    const { runtime } = createAgentRuntime({ now: () => FIXED_NOW });
    const result = await runtime.handle(discoveryRequest(['prd']));
    expect(result.status).toBe('passed');
    expect(result.trace.steps).toContain('ground');
    expect(result.trace.groundedBy?.citations).toEqual([]);
    expect(result.trace.groundedBy?.corpusVersion).toBeUndefined();
  });

  it('returns ERROR for an unknown tool/intent (tool-not-found)', async () => {
    const { runtime } = createAgentRuntime();
    const result = await runtime.handle(
      parseAgentRuntimeRequest({ intent: 'totally_unknown_intent' }),
    );
    expect(result.status).toBe('error');
    expect(result.summary).toMatch(/No capability resolves/i);
  });

  it('returns BLOCKED when a mandatory artifact is missing', async () => {
    const { runtime } = createAgentRuntime();
    const result = await runtime.handle(discoveryRequest([])); // prd missing

    expect(result.status).toBe('blocked');
    expect(result.missingArtifacts).toContain('prd');
    expect(result.findings.some((f) => f.message.includes('prd'))).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('runs through a MOCK harness adapter (port substitution)', async () => {
    const calls: string[] = [];
    const mockHarness: IHarnessPort = {
      discover: async () => [],
      describe: async () => undefined,
      execute: async (req): Promise<HarnessExecutionResult> => {
        calls.push(req.capability);
        return { ok: true, capability: req.capability, data: { status: 'passed', missing_artifacts: [] } };
      },
    };
    const { runtime } = createAgentRuntime({ harness: mockHarness });
    const result = await runtime.handle(discoveryRequest(['prd']));

    expect(calls).toEqual(['sdlc-phase-gate-validator']);
    expect(result.status).toBe('passed');
  });

  it('runs through the in-memory HARNESS adapter (harness-only capability)', async () => {
    const { runtime } = createAgentRuntime();
    const result = await runtime.handle(
      parseAgentRuntimeRequest({
        intent: 'run_opa_audit',
        tool: 'run-opa-audit',
        parameters: { expectedViolations: ['style.line_too_long'] },
      }),
    );
    expect(result.status).toBe('warning');
    expect(result.trace.validatedBy).toBe('.harness');
    expect(result.findings[0].source).toBe('harness');
  });

  it('BLOCKS before capability execution when policy preflight fails', async () => {
    const mockHarness: IHarnessPort = {
      discover: async () => [],
      describe: async () => undefined,
      execute: jest.fn(async (req): Promise<HarnessExecutionResult> => (
        { ok: true, capability: req.capability, data: { status: 'passed', missing_artifacts: [] } }
      )),
    };
    const denyPreflight = new StubPolicyValidationAdapter((req) => (
      req.input.policyStage === 'pre-execution'
        ? [{ ruleId: 'gate.denied', message: 'Denied by org policy.', severity: 'error' }]
        : []
    ));
    const { runtime } = createAgentRuntime({ harness: mockHarness, policy: denyPreflight });
    const result = await runtime.handle(discoveryRequest(['prd'])); // would otherwise pass

    expect(mockHarness.execute).not.toHaveBeenCalled();
    expect(result.status).toBe('blocked');
    expect(result.trace.steps).toContain('policy-preflight');
    expect(result.trace.steps).toContain('blocked-by-policy-preflight');
    expect(result.trace.steps).not.toContain('harness-execute');
    expect(result.findings.some((f) => f.source === 'opa' && f.id === 'gate.denied')).toBe(true);
  });

  it('BLOCKS after execution when post-execution policy validation fails', async () => {
    const denyPostExecution = new StubPolicyValidationAdapter((req) => (
      req.input.policyStage === 'post-execution'
        ? [{ ruleId: 'gate.denied', message: 'Denied by org policy.', severity: 'error' }]
        : []
    ));
    const { runtime } = createAgentRuntime({ policy: denyPostExecution });
    const result = await runtime.handle(discoveryRequest(['prd'])); // would otherwise pass

    expect(result.status).toBe('blocked');
    expect(result.trace.steps).toContain('harness-execute');
    expect(result.trace.steps).toContain('policy-validate');
    expect(result.findings.some((f) => f.source === 'opa' && f.id === 'gate.denied')).toBe(true);
  });

  it('BLOCKS when the source interface is not allowed by the capability posture', async () => {
    const restricted: SkillDescriptor = {
      id: 'restricted-tool',
      description: 'Only MCP may trigger this capability.',
      intents: ['restricted_action'],
      kind: 'harness',
      harnessCapability: 'opa-audit',
      permissions: ['run:audit'],
      requiresApproval: false,
      emitsTrace: true,
      requiresPolicy: false,
      allowedSourceInterfaces: ['mcp'],
    };
    const { runtime } = createAgentRuntime({
      skillRegistry: new LocalSkillRegistryAdapter([restricted]),
    });

    const result = await runtime.handle(parseAgentRuntimeRequest({
      source_interface: 'smart_cli_chat',
      intent: 'restricted_action',
      tool: 'restricted-tool',
    }));

    expect(result.status).toBe('blocked');
    expect(result.summary).toContain("is not allowed to be executed from interface 'smart_cli_chat'");
    expect(result.trace.steps).toContain('blocked-by-interface');
  });

  it('GENERATES trazability events to the Tracker port', async () => {
    const { runtime, deps } = createAgentRuntime();
    await runtime.handle(discoveryRequest(['prd']));

    const tracker = deps.tracker as InMemoryTrackerTraceAdapter;
    const types = tracker.events.map((e) => e.type);
    expect(types).toContain('harness.executed');
    expect(types).toContain('core.evaluated');
    expect(types).toContain('policy.validated');
    expect(types).toContain('runtime.completed');

    const completed = tracker.events.find((e) => e.type === 'runtime.completed');
    expect(completed?.provenance?.executedBy).toBe('agent_runtime');
    expect(completed?.correlationId).toBe('corr-1');
  });
});
