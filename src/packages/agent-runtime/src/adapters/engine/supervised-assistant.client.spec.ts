/**
 * GT-531 — SupervisedAssistantClient: the fail-closed, off-by-default wiring
 * that makes the REAL (HITL-approved) call to the AI assistant.
 *
 * Verifies the governed seam:  request → HITL approval → real assistant call,
 * and that every refusal path leaves the assistant UNCONTACTED (fail-closed).
 * Also verifies it drops into the bounded Cowork executor unchanged.
 */

import {
  SupervisedAssistantClient,
  ASSISTANT_INVOKE_SKILL_ID,
} from './supervised-assistant.client';
import { CoworkAgentEngineAdapter } from './cowork-agent.adapter';
import type { IApprovalPort, ApprovalDecision } from '../../domain/ports/approval.port';
import type { IAssistantTransport } from '../../domain/ports/assistant-invocation.port';
import type { AgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../../domain/contracts/capability';

const skills: SkillDescriptor[] = [
  { id: 'foo', description: 'Does foo', intents: ['foo'], kind: 'harness', permissions: [], requiresApproval: false, emitsTrace: true, requiresPolicy: false },
  { id: 'bar', description: 'Does bar', intents: ['bar'], kind: 'harness', permissions: [], requiresApproval: false, emitsTrace: true, requiresPolicy: false },
];

const request: AgentRuntimeRequest = {
  intent: 'do the thing',
  context: { tenantId: 'tenant-1', productId: 'prod-1', initiativeId: 'init-1', phase: 'build', gate: 'f2' },
};

const grantAll: IApprovalPort = {
  requireApproval: jest.fn(async (): Promise<ApprovalDecision> => ({ granted: true, approver: 'alice' })),
};

const denyAll: IApprovalPort = {
  requireApproval: jest.fn(async (): Promise<ApprovalDecision> => ({ granted: false, status: 'rejected', reason: 'not now' })),
};

function transportReturning(proposal: Awaited<ReturnType<IAssistantTransport['invoke']>>): IAssistantTransport {
  return { invoke: jest.fn(async () => proposal) };
}

beforeEach(() => jest.clearAllMocks());

describe('SupervisedAssistantClient (GT-531)', () => {
  it('HAPPY PATH: enabled + transport + approval GRANTED → contacts the assistant and returns its in-catalog proposal', async () => {
    const transport = transportReturning({ tool: 'foo', arguments: { a: 1 }, rationale: 'assistant picked foo' });
    const client = new SupervisedAssistantClient({ enabled: true, approval: grantAll, transport });

    const proposal = await client.propose(request, skills);

    expect(grantAll.requireApproval).toHaveBeenCalledTimes(1);
    // the approval is asked for the synthetic "invoke assistant" capability, not a domain skill
    const approvalArg = (grantAll.requireApproval as jest.Mock).mock.calls[0][0];
    expect(approvalArg.skill.id).toBe(ASSISTANT_INVOKE_SKILL_ID);
    expect(approvalArg.skill.requiresApproval).toBe(true);

    expect(transport.invoke).toHaveBeenCalledTimes(1);
    expect(proposal.tool).toBe('foo');
    expect(proposal.arguments).toEqual({ a: 1 });
    expect(proposal.rationale).toContain('assistant picked foo');
    expect(proposal.rationale).toContain('alice');
  });

  it('GT-575: stamps the approval decision on the invocation so the transport can PROVE it was supervised', async () => {
    const transport = transportReturning({ tool: 'foo' });
    const client = new SupervisedAssistantClient({ enabled: true, approval: grantAll, transport });

    await client.propose(request, skills);

    const invocation = (transport.invoke as jest.Mock).mock.calls[0][0];
    expect(invocation.supervision).toEqual({
      granted: true,
      approver: 'alice',
      gate: 'SupervisedAssistantClient',
    });
  });

  it('GT-575: a DENIED decision is never stamped — the transport is not reached at all', async () => {
    const transport = transportReturning({ tool: 'foo' });
    const client = new SupervisedAssistantClient({ enabled: true, approval: denyAll, transport });

    await client.propose(request, skills);

    expect(transport.invoke).not.toHaveBeenCalled();
  });

  it('FAIL-CLOSED: OFF by default — never contacts the assistant and never asks for approval', async () => {
    const transport = transportReturning({ tool: 'foo' });
    const client = new SupervisedAssistantClient({ approval: grantAll, transport }); // enabled omitted

    const proposal = await client.propose(request, skills);

    expect(proposal.tool).toBeUndefined();
    expect(grantAll.requireApproval).not.toHaveBeenCalled();
    expect(transport.invoke).not.toHaveBeenCalled();
    expect(proposal.rationale).toMatch(/disabled/i);
  });

  it('FAIL-CLOSED: enabled but NO transport (decision-gated vendor) → no approval, no call', async () => {
    const client = new SupervisedAssistantClient({ enabled: true, approval: grantAll });

    const proposal = await client.propose(request, skills);

    expect(proposal.tool).toBeUndefined();
    expect(grantAll.requireApproval).not.toHaveBeenCalled();
    expect(proposal.rationale).toMatch(/no assistant transport/i);
  });

  it('APPROVAL DENIED: assistant is NEVER contacted; refusal is surfaced', async () => {
    const transport = transportReturning({ tool: 'foo' });
    const client = new SupervisedAssistantClient({ enabled: true, approval: denyAll, transport });

    const proposal = await client.propose(request, skills);

    expect(denyAll.requireApproval).toHaveBeenCalledTimes(1);
    expect(transport.invoke).not.toHaveBeenCalled();
    expect(proposal.tool).toBeUndefined();
    expect(proposal.rationale).toMatch(/not approved/i);
    expect(proposal.rationale).toMatch(/rejected/);
  });

  it('FAIL-CLOSED: transport throws AFTER approval → no tool proposed (governed action never runs unsupervised)', async () => {
    const transport: IAssistantTransport = { invoke: jest.fn(async () => { throw new Error('boom: 503'); }) };
    const client = new SupervisedAssistantClient({ enabled: true, approval: grantAll, transport });

    const proposal = await client.propose(request, skills);

    expect(transport.invoke).toHaveBeenCalledTimes(1);
    expect(proposal.tool).toBeUndefined();
    expect(proposal.rationale).toMatch(/transport failed/i);
    expect(proposal.rationale).toMatch(/boom: 503/);
  });

  describe('wired into the bounded Cowork executor (drop-in IAgentEnginePort)', () => {
    it('supervised approved call whose proposal is IN-CATALOG → engine proposes the tool', async () => {
      const transport = transportReturning({ tool: 'foo', rationale: 'use foo' });
      const client = new SupervisedAssistantClient({ enabled: true, approval: grantAll, transport });
      const engine = new CoworkAgentEngineAdapter({ client });

      const plan = await engine.plan(request, skills);

      expect(plan.engine).toBe('cowork');
      expect(plan.proposedTool).toBe('foo');
    });

    it('supervised approved call whose proposal is OUT-OF-CATALOG → bounded executor rejects it', async () => {
      const transport = transportReturning({ tool: 'delete-everything', rationale: 'trust me' });
      const client = new SupervisedAssistantClient({ enabled: true, approval: grantAll, transport });
      const engine = new CoworkAgentEngineAdapter({ client });

      const plan = await engine.plan(request, skills);

      expect(plan.proposedTool).toBeUndefined();
      expect(plan.rationale).toMatch(/not in the governed skill catalog — rejected/);
    });

    it('disabled client wired into the engine keeps the default deterministic behaviour (no tool)', async () => {
      const client = new SupervisedAssistantClient({ approval: grantAll, transport: transportReturning({ tool: 'foo' }) });
      const engine = new CoworkAgentEngineAdapter({ client });

      const plan = await engine.plan(request, skills);

      expect(plan.proposedTool).toBeUndefined();
    });
  });
});
