/**
 * GT-531 - Cowork as a bounded governed executor, through the real runtime envelope.
 *
 * The adapter unit test proves the catalog bound. This e2e proves the remaining
 * closure criterion: a Cowork-proposed in-catalog activity runs only after the
 * runtime applies policy, approval, argument revalidation, harness execution and
 * Tracker evidence capture.
 */

import { createAgentRuntime } from '../bootstrap';
import { CoworkAgentEngineAdapter, type CoworkClient } from '../adapters/engine/cowork-agent.adapter';
import { LocalSkillRegistryAdapter } from '../adapters/skills/local-skill-registry.adapter';
import { InMemoryTrackerTraceAdapter } from '../adapters/tracker/in-memory-tracker-trace.adapter';
import { parseAgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../domain/contracts/capability';
import type { IHarnessPort, HarnessExecutionRequest, HarnessExecutionResult } from '../domain/ports/harness.port';
import type { IApprovalPort } from '../domain/ports/approval.port';
import type { IPolicyValidationPort } from '../domain/ports/policy-validation.port';

const COWORK_TOOL = 'publish-gap-evidence';

const governedSkill: SkillDescriptor = {
  id: COWORK_TOOL,
  description: 'Publishes auditable gap evidence.',
  intents: ['publish_gap_evidence'],
  kind: 'harness',
  harnessCapability: 'record-gap-evidence',
  permissions: ['write:gaps', 'write:evidence'],
  requiresApproval: true,
  requiresPolicy: true,
  emitsTrace: true,
  policyRef: 'evolith.agent_runtime.bounded_executor',
  allowedSourceInterfaces: ['future_chat_adapter'],
  inputs: {
    type: 'object',
    properties: {
      gap_id: { type: 'string' },
      evidence_ref: { type: 'string' },
    },
  },
};

function request() {
  return parseAgentRuntimeRequest({
    source_interface: 'future_chat_adapter',
    tenant: 'tenant_demo',
    product: 'evolith_core',
    initiative: 'init_gt_531',
    intent: 'please publish the GT-531 closure evidence',
    correlation_id: 'corr-gt-531',
  });
}

describe('Cowork bounded execution, end to end (GT-531)', () => {
  it('runs an in-catalog Cowork proposal through policy, approval, harness execution and evidence capture', async () => {
    const client: CoworkClient = {
      propose: jest.fn().mockResolvedValue({
        tool: COWORK_TOOL,
        arguments: { gap_id: 'GT-531', evidence_ref: 'cowork-runtime-envelope' },
        rationale: 'Cowork selected the catalogued gap-evidence capability.',
      }),
    };
    const executed: HarnessExecutionRequest[] = [];
    const harness: IHarnessPort = {
      discover: async () => [],
      describe: async () => undefined,
      execute: jest.fn(async (req): Promise<HarnessExecutionResult> => {
        executed.push(req);
        return { ok: true, capability: req.capability, exitCode: 0, data: { status: 'passed' } };
      }),
    };
    const policy: IPolicyValidationPort = {
      validate: jest.fn(async (policyRequest) => ({
        allowed: true,
        engine: 'opa',
        policyRef: policyRequest.policyRef,
        violations: [],
      })),
    };
    const approval: IApprovalPort = {
      requireApproval: jest.fn(async ({ skill }) => ({
        granted: skill.permissions.includes('write:evidence'),
        approver: 'owner@evolith.dev',
        status: 'approved',
        approvalId: 'appr-gt-531',
      })),
    };
    const tracker = new InMemoryTrackerTraceAdapter();

    const { runtime } = createAgentRuntime({
      skillRegistry: new LocalSkillRegistryAdapter([governedSkill]),
      engine: new CoworkAgentEngineAdapter({ client }),
      harness,
      policy,
      approval,
      tracker,
      memoryHistoryLimit: 0,
      now: () => '2026-08-01T00:00:00.000Z',
      id: (() => {
        let seq = 0;
        return () => `evt-${++seq}`;
      })(),
    });

    const result = await runtime.handle(request());

    expect(result.status).toBe('passed');
    expect(client.propose).toHaveBeenCalledTimes(1);
    expect(approval.requireApproval).toHaveBeenCalledTimes(1);
    expect(policy.validate).toHaveBeenCalledTimes(2);
    expect(harness.execute).toHaveBeenCalledTimes(1);
    expect(executed).toEqual([
      expect.objectContaining({
        capability: 'record-gap-evidence',
        args: { gap_id: 'GT-531', evidence_ref: 'cowork-runtime-envelope' },
      }),
    ]);
    expect(result.trace.approvedBy).toBe('owner@evolith.dev');
    expect(result.trace.steps).toEqual(
      expect.arrayContaining([
        'select-capability',
        'merge-engine-arguments',
        'policy-preflight',
        'approval',
        'harness-execute',
        'policy-validate',
        'completed',
      ]),
    );
    expect(result.trace.argumentSource).toEqual(
      expect.objectContaining({
        source: 'engine-merged',
        engine: 'cowork',
        contract: 'declared',
        accepted: ['gap_id', 'evidence_ref'],
      }),
    );
    expect(result.recommendations[0]).toEqual(
      expect.objectContaining({
        id: 'engine-plan',
        message: expect.stringContaining('Cowork selected the catalogued gap-evidence capability.'),
      }),
    );
    expect(tracker.events.map((event) => event.type)).toEqual([
      'capability.resolved',
      'policy.validated',
      'approval.decided',
      'harness.executed',
      'policy.validated',
      'runtime.completed',
    ]);
    expect(tracker.byType('runtime.completed')[0].provenance).toEqual(
      expect.objectContaining({
        approvedBy: 'owner@evolith.dev',
        capability: COWORK_TOOL,
        argumentSource: expect.objectContaining({ engine: 'cowork' }),
      }),
    );
  });

  it('does not execute or approve an out-of-catalog Cowork proposal', async () => {
    const client: CoworkClient = {
      propose: jest.fn().mockResolvedValue({ tool: 'unregistered-tool', rationale: 'not governed' }),
    };
    const harness: IHarnessPort = {
      discover: async () => [],
      describe: async () => undefined,
      execute: jest.fn(),
    };
    const policy: IPolicyValidationPort = {
      validate: jest.fn(),
    };
    const approval: IApprovalPort = {
      requireApproval: jest.fn(),
    };

    const { runtime } = createAgentRuntime({
      skillRegistry: new LocalSkillRegistryAdapter([governedSkill]),
      engine: new CoworkAgentEngineAdapter({ client }),
      harness,
      policy,
      approval,
      memoryHistoryLimit: 0,
    });

    const result = await runtime.handle(request());

    expect(result.status).toBe('error');
    expect(result.summary).toMatch(/No capability resolves intent/);
    expect(harness.execute).not.toHaveBeenCalled();
    expect(policy.validate).not.toHaveBeenCalled();
    expect(approval.requireApproval).not.toHaveBeenCalled();
  });
});
