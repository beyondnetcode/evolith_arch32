import { Controller, Get, Res, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';
import { CacheMetricsService } from '../../infrastructure/cache/cache-metrics.service';
import { MetricsAuthGuard } from '../../infrastructure/guards/metrics-auth.guard';

// version-neutral-justification: Prometheus scrapers expect a stable
// /metrics path in text exposition format — versioning is not applicable.
@SkipThrottle()
@UseGuards(MetricsAuthGuard)
@Controller({ path: 'metrics', version: VERSION_NEUTRAL })
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly cacheMetrics: CacheMetricsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics in text format' })
  async getMetrics(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain');
    const [appMetrics, cacheMetrics] = await Promise.all([
      this.metricsService.getMetrics(),
      this.cacheMetrics.getMetrics(),
    ]);
    res.send(`${appMetrics}\n${cacheMetrics}`);
  }
}
