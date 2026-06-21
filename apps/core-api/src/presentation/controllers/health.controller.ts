import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from '../../application/services/health.service';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';

// version-neutral-justification: liveness/readiness probes are scraped by
// orchestrators (k8s) that cannot tolerate URI churn between major versions.
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly metrics: MetricsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Service health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return this.healthService.getHealthStatus();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  live() {
    return { status: 'UP', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  ready() {
    return {
      status: 'UP',
      checks: {
        metrics: this.metrics ? 'UP' : 'DOWN',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
