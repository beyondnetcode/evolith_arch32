import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleDestroy {
  private readonly registry: Registry;
  readonly gateEvaluationsTotal: Counter;
  readonly gateEvaluationDuration: Histogram;

  constructor() {
    this.registry = new Registry();
    this.registry.setDefaultLabels({ app: 'evolith-core-api' });

    this.gateEvaluationsTotal = new Counter({
      name: 'evolith_gate_evaluations_total',
      help: 'Total number of gate evaluations',
      labelNames: ['status', 'gateId'],
      registers: [this.registry],
    });

    this.gateEvaluationDuration = new Histogram({
      name: 'evolith_gate_evaluation_duration_seconds',
      help: 'Duration of gate evaluations in seconds',
      labelNames: ['gateId'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    new Counter({
      name: 'evolith_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  onModuleDestroy(): void {
    this.registry.clear();
  }
}
