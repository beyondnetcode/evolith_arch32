import { Injectable } from '@nestjs/common';
import { Counter, Registry } from 'prom-client';

@Injectable()
export class CacheMetricsService {
  readonly registry: Registry;
  private readonly hitsTotal: Counter;
  private readonly missesTotal: Counter;
  private readonly errorsTotal: Counter;

  constructor() {
    this.registry = new Registry();
    this.registry.setDefaultLabels({ app: 'evolith-core-api' });

    this.hitsTotal = new Counter({
      name: 'evolith_cache_hits_total',
      help: 'Total cache hits',
      labelNames: ['cache_namespace'],
      registers: [this.registry],
    });

    this.missesTotal = new Counter({
      name: 'evolith_cache_misses_total',
      help: 'Total cache misses',
      labelNames: ['cache_namespace'],
      registers: [this.registry],
    });

    this.errorsTotal = new Counter({
      name: 'evolith_cache_errors_total',
      help: 'Total cache operation errors',
      labelNames: ['cache_namespace', 'operation'],
      registers: [this.registry],
    });
  }

  recordHit(namespace: string): void {
    this.hitsTotal.inc({ cache_namespace: namespace });
  }

  recordMiss(namespace: string): void {
    this.missesTotal.inc({ cache_namespace: namespace });
  }

  recordError(namespace: string, operation: string): void {
    this.errorsTotal.inc({ cache_namespace: namespace, operation });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
