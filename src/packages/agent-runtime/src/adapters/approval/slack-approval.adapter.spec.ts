/**
 * GT-441 — SlackApprovalTransport + fail-closed SlackApprovalAdapter.
 *
 * Same guard as the chat side: the transport DELIVERS via an injected client
 * (the live webhook POST is GATED inside that client) and is no-op/safe without
 * one; the adapter is FAIL-CLOSED — no auto-grant, only an explicit approve().
 */

import { parseAgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../../domain/contracts/capability';
import type { ApprovalRequest, ApprovalRecord } from '../../domain/ports/approval.port';
import {
  SlackApprovalAdapter,
  SlackApprovalTransport,
  type SlackClient,
} from './slack-approval.adapter';

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
  createdAt: 0,
  expiresAt: 1000,
  ...over,
});

describe('SlackApprovalTransport (GT-441)', () => {
  it('delivers via an injected client (the webhook POST lives inside it — GATED)', async () => {
    const posted: string[] = [];
    const client: SlackClient = { post: async (m) => void posted.push(m) };
    const transport = new SlackApprovalTransport(client);

    await transport.notifyPending(record());
    await transport.notifyResolved(record({ status: 'rejected', reason: 'no' }));

    expect(posted).toHaveLength(2);
    expect(posted[0]).toContain('approval:pending');
    expect(posted[1]).toContain('approval:resolved');
    expect(posted[1]).toContain('status=rejected');
  });

  it('is side-effect-safe with NO client: logs, never grants', async () => {
    const logged: string[] = [];
    const transport = new SlackApprovalTransport(undefined, (l) => logged.push(l));

    await expect(transport.notifyPending(record())).resolves.toBeUndefined();
    expect(logged).toHaveLength(1);
    expect(transport).not.toHaveProperty('requireApproval');
  });
});

describe('SlackApprovalAdapter (GT-441) — fail-closed, no auto-grant', () => {
  it('a fresh requireApproval is PENDING, never silently granted (even with no client)', async () => {
    const adapter = new SlackApprovalAdapter();
    const decision = await adapter.requireApproval(approvalRequest());

    expect(decision.granted).toBe(false);
    expect(decision.status).toBe('pending');
  });

  it('delivers the pending request via the injected Slack client', async () => {
    const posted: string[] = [];
    const adapter = new SlackApprovalAdapter({ client: { post: async (m) => void posted.push(m) } });

    await adapter.requireApproval(approvalRequest());

    expect(posted).toHaveLength(1);
    expect(posted[0]).toContain('approval:pending');
  });

  it('ONLY an explicit approve() grants', async () => {
    const adapter = new SlackApprovalAdapter();
    const { approvalId } = await adapter.requireApproval(approvalRequest());

    expect((await adapter.decisionFor(approvalId!)).granted).toBe(false);

    await adapter.approve(approvalId!, 'ops@evolith');

    expect((await adapter.decisionFor(approvalId!)).granted).toBe(true);
  });
});
