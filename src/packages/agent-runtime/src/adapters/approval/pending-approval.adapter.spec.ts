/**
 * GT-441 — PendingApprovalAdapter: real (non-auto) HITL gate.
 *
 * Covers the acceptance criteria of the verifiable slice:
 *  - a new request is PENDING, never silently granted;
 *  - approve → granted; reject → denied;
 *  - TTL expiry → denied (fail-closed);
 *  - an unknown / expired id never reads as approved.
 */

import { parseAgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../../domain/contracts/capability';
import type { ApprovalRequest, IApprovalTransport, ApprovalRecord } from '../../domain/ports/approval.port';
import {
  PendingApprovalAdapter,
  NoopApprovalTransport,
  ApprovalResolutionError,
} from './pending-approval.adapter';
import { InMemoryApprovalStore } from './in-memory-approval-store';

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

describe('PendingApprovalAdapter (GT-441)', () => {
  it('does NOT auto-grant: a fresh request is pending and not granted', async () => {
    const adapter = new PendingApprovalAdapter();
    const decision = await adapter.requireApproval(approvalRequest());

    expect(decision.granted).toBe(false);
    expect(decision.status).toBe('pending');
    expect(decision.approvalId).toBeTruthy();
  });

  it('registers a pending record and notifies the transport seam', async () => {
    const notified: ApprovalRecord[] = [];
    const transport: IApprovalTransport = {
      notifyPending: async (r) => void notified.push(r),
      notifyResolved: async () => {},
    };
    const store = new InMemoryApprovalStore();
    const adapter = new PendingApprovalAdapter({ store, transport });

    const { approvalId } = await adapter.requireApproval(approvalRequest());

    expect(notified).toHaveLength(1);
    expect(notified[0].status).toBe('pending');
    const stored = await store.get(approvalId!);
    expect(stored?.status).toBe('pending');
    expect(await adapter.list('pending')).toHaveLength(1);
  });

  it('approve(id) → granted with approver', async () => {
    const adapter = new PendingApprovalAdapter();
    const { approvalId } = await adapter.requireApproval(approvalRequest());

    const record = await adapter.approve(approvalId!, 'alice@evolith');
    expect(record.status).toBe('approved');

    const decision = await adapter.decisionFor(approvalId!);
    expect(decision.granted).toBe(true);
    expect(decision.approver).toBe('alice@evolith');
    expect(decision.status).toBe('approved');
  });

  it('a correlated re-submission after approval reads as granted', async () => {
    const adapter = new PendingApprovalAdapter();
    const req = approvalRequest('corr-deploy-42');

    const first = await adapter.requireApproval(req);
    expect(first.granted).toBe(false); // pending
    expect(first.status).toBe('pending');

    // Human approves out-of-band using the pending id.
    await adapter.approve(first.approvalId!, 'ops@evolith');

    // Same governed request comes back → now granted (deterministic id).
    const second = await adapter.requireApproval(req);
    expect(second.granted).toBe(true);
    expect(second.approvalId).toBe(first.approvalId);
  });

  it('reject(id) → denied with reason (fail-closed)', async () => {
    const adapter = new PendingApprovalAdapter();
    const { approvalId } = await adapter.requireApproval(approvalRequest());

    const record = await adapter.reject(approvalId!, 'change window closed');
    expect(record.status).toBe('rejected');

    const decision = await adapter.decisionFor(approvalId!);
    expect(decision.granted).toBe(false);
    expect(decision.status).toBe('rejected');
    expect(decision.reason).toContain('change window closed');
  });

  it('expires to a denied terminal state after its TTL (fail-closed)', async () => {
    let clock = 1_000;
    const adapter = new PendingApprovalAdapter({ now: () => clock, ttlMs: 5_000 });
    const { approvalId } = await adapter.requireApproval(approvalRequest());

    // Before TTL: still pending, not granted.
    clock = 4_000;
    expect((await adapter.decisionFor(approvalId!)).status).toBe('pending');

    // After TTL: expired, not granted, never auto-granted.
    clock = 6_500;
    const expired = await adapter.decisionFor(approvalId!);
    expect(expired.granted).toBe(false);
    expect(expired.status).toBe('expired');
  });

  it('an expired id can never be approved (fail-closed)', async () => {
    let clock = 0;
    const adapter = new PendingApprovalAdapter({ now: () => clock, ttlMs: 1_000 });
    const { approvalId } = await adapter.requireApproval(approvalRequest());

    clock = 2_000; // past TTL
    await expect(adapter.approve(approvalId!, 'late@evolith')).rejects.toBeInstanceOf(
      ApprovalResolutionError,
    );
    expect((await adapter.decisionFor(approvalId!)).granted).toBe(false);
  });

  it('an unknown id never reads as approved and cannot be resolved', async () => {
    const adapter = new PendingApprovalAdapter();

    const decision = await adapter.decisionFor('does-not-exist');
    expect(decision.granted).toBe(false);

    await expect(adapter.approve('does-not-exist', 'x')).rejects.toBeInstanceOf(
      ApprovalResolutionError,
    );
    await expect(adapter.reject('does-not-exist')).rejects.toBeInstanceOf(
      ApprovalResolutionError,
    );
  });

  it('cannot double-resolve: rejecting an approved request throws', async () => {
    const adapter = new PendingApprovalAdapter();
    const { approvalId } = await adapter.requireApproval(approvalRequest());
    await adapter.approve(approvalId!, 'alice');

    await expect(adapter.reject(approvalId!)).rejects.toBeInstanceOf(ApprovalResolutionError);
    // Still approved / granted — the terminal decision is immutable.
    expect((await adapter.decisionFor(approvalId!)).granted).toBe(true);
  });

  it('the default transport is a real no-op (not a fake Slack/Tracker client)', async () => {
    const transport = new NoopApprovalTransport();
    await expect(
      transport.notifyPending({} as unknown as ApprovalRecord),
    ).resolves.toBeUndefined();
    await expect(
      transport.notifyResolved({} as unknown as ApprovalRecord),
    ).resolves.toBeUndefined();
  });
});
