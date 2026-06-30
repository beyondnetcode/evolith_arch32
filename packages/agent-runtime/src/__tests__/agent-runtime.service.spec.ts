/**
 * End-to-end behaviour of the Agent Runtime over its default (stub) adapters.
 * Covers every required case from the design brief:
 *  valid request · unknown tool · blocked validation · mock adapter ·
 *  harness adapter · failed policy validation · trace-event generation.
 */

import { createAgentRuntime } from '../bootstrap';
import { parseAgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';
import { StubPolicyValidationAdapter } from '../adapters/policy/stub-policy-validation.adapter';
import type { IHarnessPort, HarnessExecutionResult } from '../domain/ports/harness.port';
import type { InMemoryTrackerTraceAdapter } from '../adapters/tracker/in-memory-tracker-trace.adapter';

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

  it('BLOCKS when policy validation fails even if the capability ran', async () => {
    const denyAll = new StubPolicyValidationAdapter(() => [
      { ruleId: 'gate.denied', message: 'Denied by org policy.', severity: 'error' },
    ]);
    const { runtime } = createAgentRuntime({ policy: denyAll });
    const result = await runtime.handle(discoveryRequest(['prd'])); // would otherwise pass

    expect(result.status).toBe('blocked');
    expect(result.findings.some((f) => f.source === 'opa' && f.id === 'gate.denied')).toBe(true);
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
