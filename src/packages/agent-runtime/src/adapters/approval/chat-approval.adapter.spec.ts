/**
 * GT-441 — ChatApprovalTransport + fail-closed ChatApprovalAdapter.
 *
 * Guards the reconciliation of the former auto-grant footgun:
 *  - the transport DELIVERS via an injected client and is no-op/safe without one;
 *  - the adapter is FAIL-CLOSED — a fresh requireApproval is pending (not granted),
 *    and ONLY an explicit approve() grants. NO path returns granted:true silently.
 */

import { parseAgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../../domain/contracts/capability';
import type { ApprovalRequest, ApprovalRecord } from '../../domain/ports/approval.port';
import { ChatApprovalAdapter, ChatApprovalTransport, type ChatClient } from './chat-approval.adapter';

const governedSkill: SkillDescriptor = {
  id: 'deploy-to-prod',
  description: 'A governed capability that requires a human.',
  intents: ['deploy_to_prod'],
  kind: 'harness',
  harnessCapability: 'deploy',
  permissions: ['write:governed'],
  requiresApproval: true,
  emitsTrace: true,
  requiresPolicy: false,
};

const approvalRequest = (correlationId?: string): ApprovalRequest => ({
  skill: governedSkill,
  request: parseAgentRuntimeRequest({
    intent: 'deploy_to_prod',
    tool: 'deploy-to-prod',
    correlation_id: correlationId,
  }),
});

const record = (over: Partial<ApprovalRecord> = {}): ApprovalRecord => ({
  id: 'appr-1',
  status: 'pending',
  skillId: 'deploy-to-prod',
  intent: 'deploy_to_prod',
  correlationId: 'corr-9',
  tenantId: 'tenant-x',
  createdAt: 0,
  expiresAt: 1000,
  ...over,
});

describe('ChatApprovalTransport (GT-441)', () => {
  it('delivers pending + resolved notifications via an injected client', async () => {
    const posted: string[] = [];
    const client: ChatClient = { post: async (m) => void posted.push(m) };
    const transport = new ChatApprovalTransport(client);

    await transport.notifyPending(record());
    await transport.notifyResolved(record({ status: 'approved', approver: 'alice' }));

    expect(posted).toHaveLength(2);
    expect(posted[0]).toContain('approval:pending');
    expect(posted[0]).toContain('skill=deploy-to-prod');
    expect(posted[1]).toContain('approval:resolved');
    expect(posted[1]).toContain('approver=alice');
  });

  it('is side-effect-safe with NO client: logs, never grants', async () => {
    const logged: string[] = [];
    const transport = new ChatApprovalTransport(undefined, (l) => logged.push(l));

    await expect(transport.notifyPending(record())).resolves.toBeUndefined();
    await expect(transport.notifyResolved(record())).resolves.toBeUndefined();

    expect(logged).toHaveLength(2);
    // Delivery only — the transport has no grant path at all.
    expect(transport).not.toHaveProperty('requireApproval');
  });
});

describe('ChatApprovalAdapter (GT-441) — fail-closed, no auto-grant', () => {
  it('a fresh requireApproval is PENDING, never silently granted', async () => {
    const adapter = new ChatApprovalAdapter();
    const decision = await adapter.requireApproval(approvalRequest());

    expect(decision.granted).toBe(false);
    expect(decision.status).toBe('pending');
    expect(decision.approvalId).toBeTruthy();
  });

  it('delivers the pending request to a human via the injected chat client', async () => {
    const posted: string[] = [];
    const adapter = new ChatApprovalAdapter({ client: { post: async (m) => void posted.push(m) } });

    await adapter.requireApproval(approvalRequest());

    expect(posted).toHaveLength(1);
    expect(posted[0]).toContain('approval:pending');
  });

  it('ONLY an explicit approve() grants', async () => {
    const adapter = new ChatApprovalAdapter();
    const { approvalId } = await adapter.requireApproval(approvalRequest());

    expect((await adapter.decisionFor(approvalId!)).granted).toBe(false);

    await adapter.approve(approvalId!, 'alice@evolith');

    const decision = await adapter.decisionFor(approvalId!);
    expect(decision.granted).toBe(true);
    expect(decision.approver).toBe('alice@evolith');
  });

  it('reject() denies (fail-closed)', async () => {
    const adapter = new ChatApprovalAdapter();
    const { approvalId } = await adapter.requireApproval(approvalRequest());

    await adapter.reject(approvalId!, 'window closed');

    const decision = await adapter.decisionFor(approvalId!);
    expect(decision.granted).toBe(false);
    expect(decision.status).toBe('rejected');
  });

  it('expires to a denied terminal state after its TTL (fail-closed)', async () => {
    let clock = 1_000;
    const adapter = new ChatApprovalAdapter({ now: () => clock, ttlMs: 5_000 });
    const { approvalId } = await adapter.requireApproval(approvalRequest());

    clock = 6_500;
    const decision = await adapter.decisionFor(approvalId!);
    expect(decision.granted).toBe(false);
    expect(decision.status).toBe('expired');
  });
});
