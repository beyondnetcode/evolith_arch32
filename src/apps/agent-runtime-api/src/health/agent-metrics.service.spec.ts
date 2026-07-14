import promClient from 'prom-client';
import type { AgentRuntimeResult } from '@beyondnet/evolith-agent-runtime';
import { AgentMetricsService } from './agent-metrics.service';

function result(overrides: Partial<AgentRuntimeResult> = {}): AgentRuntimeResult {
  const { trace, ...rest } = overrides;
  return {
    status: 'passed',
    summary: 's',
    findings: [],
    missingArtifacts: [],
    recommendations: [],
    trace: { executedBy: 'agent_runtime', ...(trace ?? {}) },
    evaluatedAt: '2026-07-13T00:00:00.000Z',
    ...rest,
  } as AgentRuntimeResult;
}

/** Read the current value of a labelled metric (or histogram sub-metric) from the default registry. */
async function value(name: string, labels: Record<string, string>): Promise<number | undefined> {
  // Histogram sub-metrics (_count/_sum/_bucket) are registered under the base name.
  const base = name.replace(/_(count|sum|bucket)$/, '');
  const metric = (promClient.register.getSingleMetric(base) ?? promClient.register.getSingleMetric(name)) as unknown as
    | { get(): Promise<{ values: { labels: Record<string, string>; value: number; metricName?: string }[] }> }
    | undefined;
  if (!metric) return undefined;
  const snapshot = await metric.get();
  const match = snapshot.values.find(
    (v) => (v.metricName ?? base) === name && Object.entries(labels).every(([k, val]) => v.labels[k] === val),
  );
  return match?.value;
}

describe('AgentMetricsService (GT-546 — agent-execution metrics)', () => {
  // Reset VALUES (not registrations) so counts are deterministic across cases.
  beforeEach(() => promClient.register.resetMetrics());

  it('registers its metrics on the default registry so /metrics exposes them', () => {
    new AgentMetricsService();
    const names = promClient.register.getMetricsAsArray().map((m) => m.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'evolith_agent_runs_total',
        'evolith_agent_run_duration_seconds',
        'evolith_skill_invocations_total',
        'evolith_agent_core_calls_total',
        'evolith_hitl_approvals_total',
      ]),
    );
  });

  it('records run verdict, latency, skill and a governed Core call from a passing result', async () => {
    const svc = new AgentMetricsService();
    svc.recordRun(
      result({
        status: 'passed',
        trace: { executedBy: 'agent_runtime', capability: 'architecture.review', governedBy: 'evolith_core', durationMs: 120 },
      }),
      0.2,
    );

    expect(await value('evolith_agent_runs_total', { engine: 'stub', verdict: 'passed' })).toBe(1);
    expect(await value('evolith_agent_run_duration_seconds_count', { engine: 'stub' })).toBe(1);
    expect(await value('evolith_skill_invocations_total', { skill: 'architecture.review' })).toBe(1);
    expect(await value('evolith_agent_core_calls_total', { outcome: 'ok' })).toBe(1);
  });

  it('marks a Core call that errored (a core-sourced error finding) as outcome=error', async () => {
    const svc = new AgentMetricsService();
    svc.recordRun(
      result({
        status: 'error',
        findings: [{ id: 'f1', severity: 'error', message: 'boom', source: 'core' }],
        trace: { executedBy: 'agent_runtime', governedBy: 'evolith_core' },
      }),
      0.1,
    );
    expect(await value('evolith_agent_core_calls_total', { outcome: 'error' })).toBe(1);
  });

  it('does NOT count a plain blocked run as HITL, nor fabricate a skill/core call', async () => {
    const svc = new AgentMetricsService();
    svc.recordRun(result({ status: 'blocked' }), 0.05);
    // A block can be policy/gate-driven, not a human approval — no HITL series.
    expect(await value('evolith_hitl_approvals_total', { decision: 'blocked' })).toBeUndefined();
    expect(await value('evolith_hitl_approvals_total', { decision: 'approved' })).toBeUndefined();
    // No capability resolved and no Core governance → those counters stay untouched.
    expect(await value('evolith_skill_invocations_total', { skill: '' })).toBeUndefined();
    expect(await value('evolith_agent_core_calls_total', { outcome: 'ok' })).toBeUndefined();
  });

  it('counts an approver-attested run as an approved HITL decision', async () => {
    const svc = new AgentMetricsService();
    svc.recordRun(result({ status: 'passed', trace: { executedBy: 'agent_runtime', approvedBy: 'jdoe' } }), 0.05);
    expect(await value('evolith_hitl_approvals_total', { decision: 'approved' })).toBe(1);
  });
});
