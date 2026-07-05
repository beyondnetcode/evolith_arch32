import { Controller, Get, Header } from '@nestjs/common';
import promClient from 'prom-client';
import { Public } from '../auth/public.decorator';

// Default process/runtime metrics, registered once at module load (calling
// collectDefaultMetrics twice on the default registry throws).
promClient.collectDefaultMetrics({ prefix: 'evolith_agent_runtime_' });

/**
 * Prometheus metrics scrape endpoint. Public (no API key) so a collector can
 * scrape it like the health probes. Exposes only process/runtime metrics.
 */
@Controller()
export class MetricsController {
  @Public()
  @Get('metrics')
  @Header('Content-Type', promClient.register.contentType)
  async metrics(): Promise<string> {
    return promClient.register.metrics();
  }
}
