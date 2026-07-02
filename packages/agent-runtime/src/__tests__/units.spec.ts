/**
 * Focused unit tests for the pure mappers, the `.harness` manifest parser, and
 * the CLI gateway — the pieces the e2e suite exercises only indirectly.
 */

import { verdictToStatus, mergeStatus, fromHarness, applyPolicy } from '../application/result-assembler';
import { toPhaseId, buildEvaluationContext, buildPolicyInput } from '../application/context-mapper';
import { parseManifest } from '../adapters/harness/harness-manifest';
import { CliCommunicationGatewayAdapter } from '../adapters/gateway/cli-communication-gateway.adapter';
import { parseAgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../domain/contracts/capability';

describe('result-assembler (pure)', () => {
  it('maps verdicts to statuses', () => {
    expect(verdictToStatus('PASS')).toBe('passed');
    expect(verdictToStatus('FAIL')).toBe('blocked');
    expect(verdictToStatus('WAIVE')).toBe('warning');
    expect(verdictToStatus('SKIP')).toBe('warning');
  });

  it('merges statuses by precedence error>blocked>warning>passed', () => {
    expect(mergeStatus('passed', 'blocked')).toBe('blocked');
    expect(mergeStatus('warning', 'error')).toBe('error');
    expect(mergeStatus('passed', 'warning')).toBe('warning');
  });

  it('reads the conventional harness JSON shape', () => {
    const parts = fromHarness({
      ok: false,
      capability: 'x',
      data: {
        status: 'blocked',
        missing_artifacts: ['prd', 'adr'],
        findings: [{ id: 'f1', severity: 'error', message: 'boom' }],
      },
    });
    expect(parts.status).toBe('blocked');
    expect(parts.missingArtifacts).toEqual(['prd', 'adr']);
    expect(parts.findings[0].source).toBe('harness');
  });

  it('forces blocked when policy is not allowed', () => {
    const out = applyPolicy(
      { status: 'passed', findings: [], recommendations: [], missingArtifacts: [] },
      { allowed: false, engine: 'opa', policyRef: 'p', violations: [{ ruleId: 'r', message: 'm', severity: 'error' }] },
    );
    expect(out.status).toBe('blocked');
    expect(out.findings).toHaveLength(1);
  });
});

describe('context-mapper (pure)', () => {
  it('narrows phase to a canonical PhaseId', () => {
    expect(toPhaseId('discovery')).toBe('discovery');
    expect(toPhaseId('DISCOVERY')).toBe('discovery');
    expect(toPhaseId('made-up')).toBeUndefined();
    expect(toPhaseId(undefined)).toBeUndefined();
  });

  it('builds a canonical EvaluationContext that echoes opaque ids', () => {
    const skill: SkillDescriptor = {
      id: 's', description: 'd', intents: ['i'], kind: 'evaluation',
      evaluationKinds: ['gate'], permissions: [], requiresApproval: false,
      emitsTrace: true, requiresPolicy: false,
    };
    const req = parseAgentRuntimeRequest({
      tenant: 't', product: 'p', initiative: 'init', phase: 'discovery', gate: 'g', intent: 'i',
    });
    const ctx = buildEvaluationContext(req, skill, { missing_artifacts: ['x'] });
    expect(ctx.kinds).toEqual(['gate']);
    expect(ctx.tenant?.tenantId).toBe('t');
    expect(ctx.initiative?.initiativeId).toBe('init');
    expect(ctx.phaseId).toBe('discovery');
    expect((ctx.passthrough as Record<string, unknown>).missing_artifacts).toEqual(['x']);
  });

  it('builds OPA policy input with capability source-interface posture', () => {
    const skill: SkillDescriptor = {
      id: 'restricted-tool', description: 'd', intents: ['i'], kind: 'harness',
      harnessCapability: 'h', permissions: ['run:harness'], requiresApproval: false,
      emitsTrace: true, requiresPolicy: true, policyRef: 'evolith.capability_source_interface',
      allowedSourceInterfaces: ['mcp'],
    };
    const req = parseAgentRuntimeRequest({
      source_interface: 'smart_cli_chat',
      tenant: 't',
      intent: 'i',
      tool: 'restricted-tool',
    });

    const input = buildPolicyInput(req, skill, {});
    expect(input.sourceInterface).toBe('smart_cli_chat');
    expect((input.context as Record<string, unknown>).sourceInterface).toBe('smart_cli_chat');
    expect((input.capability as Record<string, unknown>).allowedSourceInterfaces).toEqual(['mcp']);
  });
});

describe('.harness manifest parser', () => {
  it('parses capabilities with governance posture', () => {
    const caps = parseManifest(`
version: 1
capabilities:
  - name: sdlc-phase-gate-validator
    type: validator
    description: Validate a gate
    entry: .harness/playbooks/sdlc-phase-gate-validator.mjs
    runner: node
    permissions: [read:repo, run:validator]
    requiresApproval: false
    emitsTrace: true
    requiresPolicy: true
    policyRef: evolith.gates.discovery
`);
    expect(caps).toHaveLength(1);
    expect(caps[0].name).toBe('sdlc-phase-gate-validator');
    expect(caps[0].type).toBe('validator');
    expect(caps[0].runner).toBe('node');
    expect(caps[0].requiresPolicy).toBe(true);
    expect(caps[0].policyRef).toBe('evolith.gates.discovery');
  });
});

describe('CLI communication gateway', () => {
  const gw = new CliCommunicationGatewayAdapter();

  it('parses a command line into a runtime request', async () => {
    const req = await gw.parse(
      'validate-discovery-gate tenant=acme product=tracker gate=prd_readiness requiredArtifacts=prd,adr',
    );
    expect(req.intent).toBe('validate_discovery_gate');
    expect(req.tool).toBe('validate-discovery-gate');
    expect(req.context.tenantId).toBe('acme');
    expect(req.context.gate).toBe('prd_readiness');
    expect(req.parameters?.requiredArtifacts).toEqual(['prd', 'adr']);
  });

  it('renders a result for the terminal', async () => {
    const text = await gw.present({
      status: 'blocked',
      summary: 'Execution blocked',
      findings: [{ id: 'f', severity: 'error', message: 'missing prd' }],
      missingArtifacts: ['prd'],
      recommendations: [{ id: 'r', message: 'add prd' }],
      trace: { executedBy: 'agent_runtime', validatedBy: '.harness', capability: 'validate-discovery-gate' },
      evaluatedAt: '2026-06-29T00:00:00.000Z',
    });
    expect(text).toContain('[BLOCKED]');
    expect(text).toContain('missing prd');
    expect(text).toContain('prd');
  });
});
