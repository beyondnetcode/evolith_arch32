/**
 * GT-441 — TrackerApprovalAdapter: the Core asks, the Tracker decides.
 *
 * The rules pinned here are, in order of importance:
 *   1. Every way of failing to obtain an answer DENIES.
 *   2. "The Tracker said no" and "I could not ask the Tracker" stay
 *      distinguishable, because they call for different follow-ups.
 *   3. The Core never invents an approver the Tracker did not name.
 */

import { parseAgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../../domain/contracts/capability';
import type { ApprovalRequest } from '../../domain/ports/approval.port';
import {
  TrackerApprovalAdapter,
  TRACKER_DECISION_PREFIX,
  TRACKER_UNAVAILABLE_PREFIX,
  isTrackerUnavailable,
  type TrackerApprovalClient,
  type TrackerApprovalResponse,
  type TrackerApprovalSubmission,
} from './tracker-approval.adapter';

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

const approvalRequest = (
  over: Partial<{
    tenant: string;
    product: string;
    initiative: string;
    correlation_id: string;
    requested_by: string;
  }> = {},
): ApprovalRequest => ({
  skill: governedSkill,
  request: parseAgentRuntimeRequest({
    intent: 'deploy_to_prod',
    tool: 'deploy-to-prod',
    tenant: 'acme',
    ...over,
  }),
});

/** A client that answers with whatever the test hands it, recording the ask. */
const answering = (
  response: unknown,
): TrackerApprovalClient & { calls: TrackerApprovalSubmission[] } => {
  const calls: TrackerApprovalSubmission[] = [];
  return {
    calls,
    async submit(submission) {
      calls.push(submission);
      return response as TrackerApprovalResponse;
    },
  };
};

/** Immediate-fire timer, so the timeout path is exercised without real waiting. */
const immediateTimer = {
  setTimeoutImpl: (fn: () => void) => {
    fn();
    return {};
  },
  clearTimeoutImpl: () => undefined,
};

describe('TrackerApprovalAdapter — the Tracker decides, the Core obeys (GT-441)', () => {
  it('grants only when the Tracker itself answered `approved`', async () => {
    const client = answering({ status: 'approved', approver: 'ana@acme', approvalId: 'trk-9' });
    const decision = await new TrackerApprovalAdapter({ client }).requireApproval(approvalRequest());

    expect(decision.granted).toBe(true);
    expect(decision.status).toBe('approved');
    expect(decision.approver).toBe('ana@acme');
    expect(decision.approvalId).toBe('trk-9');
  });

  it('routes by the tenant on the request and names no approver of its own', async () => {
    const client = answering({ status: 'pending' });
    await new TrackerApprovalAdapter({ client }).requireApproval(
      approvalRequest({
        tenant: 'globex',
        product: 'p-1',
        initiative: 'i-1',
        correlation_id: 'corr-1',
        requested_by: 'ci-bot',
      }),
    );

    expect(client.calls).toHaveLength(1);
    const [submission] = client.calls;
    expect(submission.tenantId).toBe('globex');
    expect(submission.skillId).toBe('deploy-to-prod');
    expect(submission.productId).toBe('p-1');
    expect(submission.initiativeId).toBe('i-1');
    expect(submission.correlationId).toBe('corr-1');
    // requestedBy is forwarded as context, and is emphatically not an approver.
    expect(submission.requestedBy).toBe('ci-bot');
    expect(submission).not.toHaveProperty('approver');
  });

  it('never infers an approver the Tracker did not name, even when granting', async () => {
    const client = answering({ status: 'approved' });
    const decision = await new TrackerApprovalAdapter({ client }).requireApproval(
      approvalRequest({ requested_by: 'ci-bot' }),
    );

    expect(decision.granted).toBe(true);
    expect(decision.approver).toBeUndefined();
  });

  it('treats a Tracker-pending approval as pending and NOT granted', async () => {
    const client = answering({ status: 'pending', approvalId: 'trk-1' });
    const decision = await new TrackerApprovalAdapter({ client }).requireApproval(approvalRequest());

    expect(decision.granted).toBe(false);
    expect(decision.status).toBe('pending');
    expect(decision.approvalId).toBe('trk-1');
  });

  it('reports a Tracker rejection as a human decision, keeping the approver it named', async () => {
    const client = answering({ status: 'rejected', approver: 'ana@acme', reason: 'not in window' });
    const decision = await new TrackerApprovalAdapter({ client }).requireApproval(approvalRequest());

    expect(decision.granted).toBe(false);
    expect(decision.status).toBe('rejected');
    expect(decision.approver).toBe('ana@acme');
    expect(decision.reason).toContain(TRACKER_DECISION_PREFIX);
    expect(decision.reason).toContain('not in window');
    expect(isTrackerUnavailable(decision)).toBe(false);
  });

  it('reports a Tracker expiry as a human-lifecycle outcome, not an outage', async () => {
    const client = answering({ status: 'expired' });
    const decision = await new TrackerApprovalAdapter({ client }).requireApproval(approvalRequest());

    expect(decision.granted).toBe(false);
    expect(decision.status).toBe('expired');
    expect(isTrackerUnavailable(decision)).toBe(false);
  });
});

describe('TrackerApprovalAdapter — failing to reach the Tracker DENIES (GT-441)', () => {
  /**
   * The failure branch carries NO `status`, mirroring `scope-contract`'s
   * failure branch carrying no scope: there is nothing to fall back to.
   */
  const expectUnavailable = (decision: { granted: boolean; status?: string; reason?: string }) => {
    expect(decision.granted).toBe(false);
    expect(decision.status).toBeUndefined();
    expect(decision.reason).toContain(TRACKER_UNAVAILABLE_PREFIX);
    expect(isTrackerUnavailable(decision)).toBe(true);
  };

  it('denies when the request carries no tenant, without asking the Tracker at all', async () => {
    const client = answering({ status: 'approved' });
    const decision = await new TrackerApprovalAdapter({ client }).requireApproval({
      skill: governedSkill,
      request: parseAgentRuntimeRequest({ intent: 'deploy_to_prod' }),
    });

    expectUnavailable(decision);
    expect(decision.reason).toContain('no tenant');
    expect(client.calls).toHaveLength(0);
  });

  it('denies when the tenant is blank whitespace rather than routing it somewhere', async () => {
    const client = answering({ status: 'approved' });
    const decision = await new TrackerApprovalAdapter({ client }).requireApproval(
      approvalRequest({ tenant: '   ' }),
    );

    expectUnavailable(decision);
    expect(client.calls).toHaveLength(0);
  });

  it('denies when no Tracker client is wired (the unconfigured default is "no")', async () => {
    const decision = await new TrackerApprovalAdapter().requireApproval(approvalRequest());

    expectUnavailable(decision);
    expect(decision.reason).toContain('no Tracker approval client is wired');
  });

  it('denies on a network error instead of letting the failure grant', async () => {
    const client: TrackerApprovalClient = {
      submit: async () => {
        throw new Error('ECONNREFUSED 10.0.0.1:8080');
      },
    };
    const decision = await new TrackerApprovalAdapter({ client }).requireApproval(approvalRequest());

    expectUnavailable(decision);
    expect(decision.reason).toContain('could not reach the Tracker');
    expect(decision.reason).toContain('ECONNREFUSED');
  });

  it('denies on a non-Error rejection too', async () => {
    const client: TrackerApprovalClient = {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      submit: () => Promise.reject('gateway exploded'),
    };
    const decision = await new TrackerApprovalAdapter({ client }).requireApproval(approvalRequest());

    expectUnavailable(decision);
    expect(decision.reason).toContain('gateway exploded');
  });

  it('denies when the Tracker never answers, rather than hanging the gate open', async () => {
    const client: TrackerApprovalClient = {
      submit: () => new Promise<TrackerApprovalResponse>(() => undefined),
    };
    const decision = await new TrackerApprovalAdapter({
      client,
      timeoutMs: 25,
      ...immediateTimer,
    }).requireApproval(approvalRequest());

    expectUnavailable(decision);
    expect(decision.reason).toContain('no answer within 25ms');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'approved'],
    ['an object with no status', { approver: 'ana@acme' }],
    ['an object whose status is not a string', { status: 200 }],
  ])('denies on a malformed response: %s', async (_label, payload) => {
    const client = answering(payload);
    const decision = await new TrackerApprovalAdapter({ client }).requireApproval(approvalRequest());

    expectUnavailable(decision);
    expect(decision.reason).toContain('malformed');
  });

  it('denies on a status this Core does not model rather than assuming it benign', async () => {
    const client = answering({ status: 'auto_approved', approvalId: 'trk-7' });
    const decision = await new TrackerApprovalAdapter({ client }).requireApproval(approvalRequest());

    expectUnavailable(decision);
    expect(decision.reason).toContain("status 'auto_approved'");
    // The Tracker's own record id is still surfaced so the outage is traceable.
    expect(decision.approvalId).toBe('trk-7');
  });

  it('distinguishes "could not ask" from "the Tracker said no"', async () => {
    const adapter = (client: TrackerApprovalClient) => new TrackerApprovalAdapter({ client });

    const said_no = await adapter(answering({ status: 'rejected' })).requireApproval(approvalRequest());
    const could_not_ask = await adapter({
      submit: async () => {
        throw new Error('timeout');
      },
    }).requireApproval(approvalRequest());

    expect(said_no.granted).toBe(false);
    expect(could_not_ask.granted).toBe(false);
    expect(isTrackerUnavailable(said_no)).toBe(false);
    expect(isTrackerUnavailable(could_not_ask)).toBe(true);
  });

  it('grants on NO failure path — every one of them reads granted:false', async () => {
    const failures: TrackerApprovalClient[] = [
      { submit: async () => { throw new Error('boom'); } },
      answering(null),
      answering({ status: 'something-else' }),
      answering({ status: 42 }),
      { submit: () => new Promise<TrackerApprovalResponse>(() => undefined) },
    ];

    for (const client of failures) {
      const decision = await new TrackerApprovalAdapter({
        client,
        timeoutMs: 5,
        ...immediateTimer,
      }).requireApproval(approvalRequest());
      expect(decision.granted).toBe(false);
    }
  });
});
