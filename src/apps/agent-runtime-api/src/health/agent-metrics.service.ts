import { Injectable } from '@nestjs/common';
import promClient, { Counter, CounterConfiguration, Histogram, HistogramConfiguration } from 'prom-client';
import type { AgentRuntimeResult } from '@beyondnet/evolith-agent-runtime';

/**
 * Business / agent-execution metrics for the Agent Runtime (GT-546 · EAG observability).
 *
 * Before this, `/metrics` served only `collectDefaultMetrics` (process/runtime) — the
 * AI-era question "did governance actually run the agent, and how did it go?" had NO
 * signal. These counters/histograms answer it: run volume by engine+verdict, run
 * latency, skill invocations, Core calls and HITL approvals.
 *
 * The metrics register on the DEFAULT prom registry (idempotently — `getSingleMetric`
 * guards Jest module reloads / repeated instantiation), so the existing @Public
 * `/metrics` controller (`promClient.register.metrics()`) exposes them alongside the
 * default metrics with no extra wiring.
 */
@Injectable()
export class AgentMetricsService {
  readonly runsTotal: Counter<string>;
  readonly runDuration: Histogram<string>;
  readonly skillInvocations: Counter<string>;
  readonly coreCalls: Counter<string>;
  readonly hitlApprovals: Counter<string>;

  /** Configured reasoning engine (label), captured once from the environment. */
  private readonly engine: string;

  constructor() {
    this.engine = (process.env.AGENT_RUNTIME_ENGINE ?? 'stub').trim().toLowerCase() || 'stub';

    this.runsTotal = this.counter({
      name: 'evolith_agent_runs_total',
      help: 'Total agent-runtime executions, by engine and verdict (run status)',
      labelNames: ['engine', 'verdict'],
    });
    this.runDuration = this.histogram({
      name: 'evolith_agent_run_duration_seconds',
      help: 'Agent-runtime execution duration in seconds, by engine',
      labelNames: ['engine'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
    });
    this.skillInvocations = this.counter({
      name: 'evolith_skill_invocations_total',
      help: 'Total skill/capability invocations resolved by the runtime, by skill',
      labelNames: ['skill'],
    });
    this.coreCalls = this.counter({
      name: 'evolith_agent_core_calls_total',
      help: 'Total Core evaluations invoked by the runtime, by outcome (ok|error)',
      labelNames: ['outcome'],
    });
    this.hitlApprovals = this.counter({
      name: 'evolith_hitl_approvals_total',
      help: 'Total human-in-the-loop approval outcomes observed by the runtime, by decision',
      labelNames: ['decision'],
    });
  }

  /**
   * Record one runtime execution from its result. The derivations are intentionally
   * CONSERVATIVE — each emits only what the {@link AgentRuntimeResult}/trace actually
   * attests, never an invented value:
   *   · runs_total{engine,verdict}      — always (verdict = run status).
   *   · run_duration_seconds{engine}    — trace.durationMs when present, else measured.
   *   · skill_invocations_total{skill}  — only when a capability was resolved.
   *   · agent_core_calls_total{outcome} — only when the Core actually governed the run.
   *   · hitl_approvals_total{decision}  — approved (trace.approvedBy) or blocked (status).
   */
  recordRun(result: AgentRuntimeResult, measuredSeconds: number): void {
    this.runsTotal.inc({ engine: this.engine, verdict: result.status });

    const durationSeconds =
      typeof result.trace.durationMs === 'number' ? result.trace.durationMs / 1000 : measuredSeconds;
    this.runDuration.observe({ engine: this.engine }, durationSeconds);

    const skill = result.trace.capability;
    if (skill) this.skillInvocations.inc({ skill });

    // The Core governed the run iff the trace names it (`governedBy: 'evolith_core'`).
    if (result.trace.governedBy) {
      const coreErrored = result.findings.some((f) => f.source === 'core' && f.severity === 'error');
      this.coreCalls.inc({ outcome: coreErrored ? 'error' : 'ok' });
    }

    // HITL: an approver attests approval; a `blocked` status is an approval/policy block.
    if (result.trace.approvedBy) {
      this.hitlApprovals.inc({ decision: 'approved' });
    } else if (result.status === 'blocked') {
      this.hitlApprovals.inc({ decision: 'blocked' });
    }
  }

  private counter(cfg: CounterConfiguration<string>): Counter<string> {
    return (
      (promClient.register.getSingleMetric(cfg.name) as Counter<string> | undefined) ??
      new Counter({ ...cfg, registers: [promClient.register] })
    );
  }

  private histogram(cfg: HistogramConfiguration<string>): Histogram<string> {
    return (
      (promClient.register.getSingleMetric(cfg.name) as Histogram<string> | undefined) ??
      new Histogram({ ...cfg, registers: [promClient.register] })
    );
  }
}
