import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Counter, CounterConfiguration, Histogram, HistogramConfiguration, Registry } from 'prom-client';

/**
 * GT-548: cardinality cap for the `tenant` metric label. Only tenants in the
 * allowlist (`EVOLITH_METRICS_TENANT_ALLOWLIST`, comma-separated) label their own
 * series; everything else collapses to `other`. Series growth is therefore bounded
 * to |allowlist ∩ cap| + 1 regardless of how many tenants exist — a raw tenant id
 * would be unbounded and blow up the TSDB. The allowlist itself is hard-capped so a
 * mis-set env var can never uncork cardinality.
 */
const TENANT_ALLOWLIST_CAP = 100;
const OTHER_TENANT = 'other';

@Injectable()
export class MetricsService implements OnModuleDestroy {
  private readonly registry: Registry;
  private readonly tenantAllowlist: ReadonlySet<string>;
  readonly gateEvaluationsTotal: Counter;
  readonly gateEvaluationDuration: Histogram;
  readonly httpRequestsTotal: Counter;
  readonly httpRequestDuration: Histogram;

  constructor() {
    this.registry = new Registry();
    this.registry.setDefaultLabels({ app: 'evolith-core-api' });
    this.tenantAllowlist = new Set(
      (process.env.EVOLITH_METRICS_TENANT_ALLOWLIST ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, TENANT_ALLOWLIST_CAP),
    );

    this.gateEvaluationsTotal = new Counter({
      name: 'evolith_gate_evaluations_total',
      help: 'Total governance gate/architecture evaluations, by verdict (status), gate, phase and (bounded) tenant',
      labelNames: ['status', 'gateId', 'phase', 'tenant'],
      registers: [this.registry],
    });

    this.gateEvaluationDuration = new Histogram({
      name: 'evolith_gate_evaluation_duration_seconds',
      help: 'Duration of gate/architecture evaluations in seconds, by gate, phase and (bounded) tenant',
      labelNames: ['gateId', 'phase', 'tenant'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestsTotal = new Counter({
      name: 'evolith_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    // GT-543: the SLO/alert layer (HighLatency, latency SLOs) needs a request-duration
    // histogram — none existed, so those alerts were inert. Emitted here, prefixed
    // `evolith_` like every other metric so alerts/SLO reference one consistent name.
    this.httpRequestDuration = new Histogram({
      name: 'evolith_http_request_duration_seconds',
      help: 'HTTP request duration in seconds, by method, route and status',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
  }

  recordHttpRequest(method: string, path: string, status: number, durationSeconds?: number): void {
    const labels = { method, path, status: String(status) };
    this.httpRequestsTotal.inc(labels);
    if (durationSeconds !== undefined) {
      this.httpRequestDuration.observe(labels, durationSeconds);
    }
  }

  /**
   * Record a governance gate / architecture evaluation (GT-542).
   *
   * The flagship product signal of a governance engine: pass/fail volume + latency,
   * labelled by verdict (`status`), `gateId` and `phase`. Declared since GT-393 but
   * never emitted — nothing could chart gate outcomes until this is called from the
   * evaluate/gate paths. `status` carries the canonical Verdict (PASS/FAIL/…).
   */
  recordGateEvaluation(gateId: string, status: string, phase: string, tenant?: string, durationSeconds?: number): void {
    const t = this.boundedTenant(tenant);
    this.gateEvaluationsTotal.inc({ status, gateId, phase, tenant: t });
    if (durationSeconds !== undefined) {
      this.gateEvaluationDuration.observe({ gateId, phase, tenant: t }, durationSeconds);
    }
  }

  /**
   * GT-548: collapse an unbounded tenant id to a bounded label value. A tenant in the
   * allowlist keeps its own series; anything else (and any unset tenant) becomes `other`,
   * so per-tenant scorecards stay derivable without unbounded TSDB series growth.
   */
  boundedTenant(tenantId?: string): string {
    return tenantId && this.tenantAllowlist.has(tenantId) ? tenantId : OTHER_TENANT;
  }

  createCounter(config: CounterConfiguration<string>): Counter {
    return new Counter({ ...config, registers: [this.registry] });
  }

  createHistogram(config: HistogramConfiguration<string>): Histogram {
    return new Histogram({ ...config, registers: [this.registry] });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  onModuleDestroy(): void {
    this.registry.clear();
  }
}
