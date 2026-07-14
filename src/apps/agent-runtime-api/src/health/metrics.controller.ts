import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import promClient from 'prom-client';
import { Public } from '../auth/public.decorator';
import { MetricsAuthGuard } from '../auth/metrics-auth.guard';

// Default process/runtime metrics, registered once at module load (calling
// collectDefaultMetrics twice on the default registry throws).
promClient.collectDefaultMetrics({ prefix: 'evolith_agent_runtime_' });

/**
 * Prometheus metrics scrape endpoint. `@Public` bypasses the global request-auth
 * guards, but GT-549 puts a dedicated fail-closed {@link MetricsAuthGuard} in front:
 * the scrape credential is required (or an explicit trusted-network opt-out) so the
 * process/runtime + agent-execution (GT-546) metrics are not exposed to anonymous
 * callers, matching core-api's guarded /metrics.
 */
@Controller()
@UseGuards(MetricsAuthGuard)
export class MetricsController {
  @Public()
  @Get('metrics')
  @Header('Content-Type', promClient.register.contentType)
  async metrics(): Promise<string> {
    return promClient.register.metrics();
  }
}
