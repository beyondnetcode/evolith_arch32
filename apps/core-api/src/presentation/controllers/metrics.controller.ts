import { Controller, Get, Res, VERSION_NEUTRAL } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';

// version-neutral-justification: Prometheus scrapers expect a stable
// /metrics path in text exposition format — versioning is not applicable.
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics in text format' })
  async getMetrics(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(await this.metricsService.getMetrics());
  }
}
