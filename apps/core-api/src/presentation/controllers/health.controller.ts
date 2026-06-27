import { Controller, Get, VERSION_NEUTRAL, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService } from '../../application/services/health.service';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';
import { ConfigService } from '@nestjs/config';
import type { IFileSystem } from '@evolith/core-domain/domain/interfaces';
import * as path from 'path';
import { EnvConfig } from '../../infrastructure/config/env.validation';

// version-neutral-justification: liveness/readiness probes are scraped by
// orchestrators (k8s) that cannot tolerate URI churn between major versions.
@SkipThrottle()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly metrics: MetricsService,
    private readonly config: ConfigService<EnvConfig>,
    @Inject('IFileSystem') private readonly fs: IFileSystem,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Service health check (liveness + readiness combined)' })
  @ApiEnvelopeResponse(undefined, { description: 'Service is healthy' })
  check() {
    return this.healthService.getHealthStatus();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe — process is running' })
  @ApiEnvelopeResponse(undefined, { description: 'Process is alive' })
  live() {
    return { status: 'UP', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — corpus and dependencies are accessible' })
  @ApiEnvelopeResponse(undefined, { description: 'Service is ready to handle traffic' })
  async ready() {
    const corePath = this.config.get('CORE_PATH', { infer: true }) as string;
    const gatesFile = path.join(corePath, 'rulesets', 'phase-gates', 'phase-gates.rules.json');

    const [corpusOk] = await Promise.allSettled([this.fs.exists(gatesFile)]);

    const checks: Record<string, 'UP' | 'DOWN'> = {
      corpus: corpusOk.status === 'fulfilled' && corpusOk.value ? 'UP' : 'DOWN',
      metrics: this.metrics ? 'UP' : 'DOWN',
    };

    const allUp = Object.values(checks).every((v) => v === 'UP');
    if (!allUp) {
      throw new HttpException(
        { status: 'DOWN', checks, timestamp: new Date().toISOString() },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { status: 'UP', checks, timestamp: new Date().toISOString() };
  }
}
