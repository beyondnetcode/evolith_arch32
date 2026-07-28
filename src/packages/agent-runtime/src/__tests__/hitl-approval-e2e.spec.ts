/**
 * GT-608 — the HITL approval subsystem, EXECUTED end to end.
 *
 * Every assertion here was structurally unreachable before this change: no skill
 * the runtime could route to declared `requiresApproval: true`, so step 4 of
 * `AgentRuntimeService.handleStream` never ran and neither did the ~1,000 LOC
 * behind `IApprovalPort`.
 *
 * Two paths are covered, and the DENIAL one is the load-bearing half — an
 * approval subsystem that cannot refuse is decoration:
 *
 *   pending → approved → executed → audited
 *   pending → denied   → NOT executed → audited
 *
 * The capability under test is the real `self-improving-loop` from
 * `.harness/manifest.yaml` (executable, `write:report`), routed through the
 * derived catalogue. The harness is a SPY, so "not executed" is an observation
 * about the executor, not an inference from the result status.
 */

import { resolve } from 'node:path';

import { createAgentRuntime } from '../bootstrap';
import { parseAgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';
import { ManifestSkillRegistryAdapter } from '../adapters/skills/manifest-skill-registry.adapter';
import { PendingApprovalAdapter } from '../adapters/approval/pending-approval.adapter';
import { InMemoryTrackerTraceAdapter } from '../adapters/tracker/in-memory-tracker-trace.adapter';
import {
  TrackerApprovalAdapter,
  type TrackerApprovalClient,
  type TrackerApprovalResponse,
} from '../adapters/approval/tracker-approval.adapter';
import type { IHarnessPort, HarnessExecutionResult } from '../domain/ports/harness.port';
import type { TraceEvent } from '../domain/contracts/trace';

const HARNESS_ROOT = resolve(__dirname, '../../../../../.harness');
const GATED_CAPABILITY = 'self-improving-loop';

/** Harness spy: records every capability the runtime actually executed. */
function spyHarness(): { port: IHarnessPort; executed: string[] } {
  const executed: string[] = [];
  const port: IHarnessPort = {
    discover: async () => [],
    describe: async () => undefined,
    execute: async (req): Promise<HarnessExecutionResult> => {
      executed.push(req.capability);
      return { ok: true, capability: req.capability, exitCode: 0, data: { status: 'passed' } };
    },
  };
  return { port, executed };
}

function gatedRequest(correlationId: string) {
  return parseAgentRuntimeRequest({
    tenant: 'tenant_demo',
    product: 'evolith_core',
    initiative: 'init_hitl',
    intent: 'self_improving_loop',
    tool: GATED_CAPABILITY,
    correlation_id: correlationId,
    parameters: { task: 'audit harness drift', agent: '@winston' },
  });
}

function build(approval: PendingApprovalAdapter) {
  const harness = spyHarness();
  const tracker = new InMemoryTrackerTraceAdapter();
  const { runtime } = createAgentRuntime({
    skillRegistry: ManifestSkillRegistryAdapter.fromHarnessRoot(HARNESS_ROOT),
    harness: harness.port,
    approval,
    tracker,
    engine: undefined,
  });
  return { runtime, harness, tracker, approval };
}

/** Trace events the in-memory Tracker captured, as `type[:status]` strings. */
function audit(tracker: InMemoryTrackerTraceAdapter): string[] {
  return (tracker.events as readonly TraceEvent[]).map((e) =>
    e.status ? `${e.type}:${e.status}` : e.type,
  );
}

describe('HITL approval, end to end (GT-608)', () => {
  it('the routed capability actually requires approval (precondition, not an assumption)', async () => {
    const registry = ManifestSkillRegistryAdapter.fromHarnessRoot(HARNESS_ROOT);
    const skill = await registry.resolve('self_improving_loop');
    expect(skill?.id).toBe(GATED_CAPABILITY);
    expect(skill?.requiresApproval).toBe(true);
  });

  it('PENDING: an un-decided request is blocked and the capability never runs', async () => {
    const { runtime, harness } = build(new PendingApprovalAdapter());
    const result = await runtime.handle(gatedRequest('corr-pending'));

    expect(result.status).toBe('blocked');
    expect(result.summary).toMatch(/requires human approval/i);
    expect(harness.executed).toEqual([]); // fail-closed: nothing executed
    expect(result.trace.approvedBy).toBeUndefined();
  });

  it('pending → APPROVED → executed → audited', async () => {
    const approval = new PendingApprovalAdapter();
    const { runtime, harness, tracker } = build(approval);
    const request = gatedRequest('corr-approved');

    // 1. First pass registers the pending record and refuses to execute.
    const first = await runtime.handle(request);
    expect(first.status).toBe('blocked');
    expect(harness.executed).toEqual([]);

    // 2. A HUMAN resolves it out of band. The id is deterministic from the
    //    correlation id + skill, which is what makes re-submission honour it.
    const pending = await approval.list('pending');
    expect(pending).toHaveLength(1);
    expect(pending[0].skillId).toBe(GATED_CAPABILITY);
    const granted = await approval.approve(pending[0].id, 'alice@evolith.dev');
    expect(granted.status).toBe('approved');

    // 3. Re-submitting the SAME governed request now executes.
    const second = await runtime.handle(request);
    expect(second.status).toBe('passed');
    expect(harness.executed).toEqual([GATED_CAPABILITY]);

    // 4. Audited: the approver is on the provenance trace — this is the exact
    //    field `AgentMetricsService` reads to increment evolith_hitl_approvals_total.
    expect(second.trace.approvedBy).toBe('alice@evolith.dev');
    expect(second.trace.steps).toContain('approval');
    expect(second.trace.steps).toContain('harness-execute');
    expect(audit(tracker)).toContain('approval.decided:warning');
    expect(audit(tracker)).toContain('harness.executed:passed');
  });

  it('pending → DENIED → NOT executed → audited (an approval that cannot refuse is decoration)', async () => {
    const approval = new PendingApprovalAdapter();
    const { runtime, harness, tracker } = build(approval);
    const request = gatedRequest('corr-denied');

    await runtime.handle(request);
    const [pending] = await approval.list('pending');
    const rejected = await approval.reject(pending.id, 'unreviewed write to the audit record');
    expect(rejected.status).toBe('rejected');

    const result = await runtime.handle(request);

    expect(result.status).toBe('blocked');
    expect(harness.executed).toEqual([]); // the denial actually stopped execution
    expect(result.trace.approvedBy).toBeUndefined();
    expect(result.trace.steps).toContain('approval-denied');
    expect(audit(tracker)).toContain('approval.decided:blocked');
    expect(audit(tracker)).toContain('capability.blocked:blocked');
    // A denial is terminal: re-submitting does NOT re-open the request.
    expect(await approval.list('pending')).toEqual([]);
  });

  it('EXPIRED: a request nobody decided fails closed and never executes', async () => {
    let clock = 1_000;
    const approval = new PendingApprovalAdapter({ now: () => clock, ttlMs: 60_000 });
    const { runtime, harness } = build(approval);
    const request = gatedRequest('corr-expired');

    await runtime.handle(request);
    clock += 61_000; // TTL elapses with no human decision

    const result = await runtime.handle(request);
    expect(result.status).toBe('blocked');
    expect(harness.executed).toEqual([]);
    expect((await approval.list('expired'))).toHaveLength(1);
  });

  it('routes the decision through the TRACKER seam (per-tenant approvers decide, the runtime obeys)', async () => {
    const submissions: string[] = [];
    const client: TrackerApprovalClient = {
      submit: async (submission): Promise<TrackerApprovalResponse> => {
        submissions.push(submission.skillId);
        return { status: 'approved', approver: 'tenant-owner@demo', approvalId: 'trk-1' };
      },
    };
    const harness = spyHarness();
    const { runtime } = createAgentRuntime({
      skillRegistry: ManifestSkillRegistryAdapter.fromHarnessRoot(HARNESS_ROOT),
      harness: harness.port,
      approval: new TrackerApprovalAdapter({ client }),
      engine: undefined,
    });

    const result = await runtime.handle(gatedRequest('corr-tracker'));

    expect(submissions).toEqual([GATED_CAPABILITY]);
    expect(result.status).toBe('passed');
    expect(result.trace.approvedBy).toBe('tenant-owner@demo');
    expect(harness.executed).toEqual([GATED_CAPABILITY]);
  });
});
