import { Controller, Get, VERSION_NEUTRAL, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService } from '../../application/services/health.service';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';
import { ConfigService } from '@nestjs/config';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import * as path from 'path';
import { probeRulesetsLocation } from '@beyondnet/evolith-core-domain/application/paths/rulesets-location';
import { EnvConfig } from '../../infrastructure/config/env.validation';
import { Public } from '../../infrastructure/auth/public.decorator';

// version-neutral-justification: liveness/readiness probes are scraped by
// orchestrators (k8s) that cannot tolerate URI churn between major versions.
@Public() // probes must be reachable without an API key (ApiKeyGuard bypass)
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

    // GT-566: resolve the corpus root the same way the ruleset repository does
    // instead of hardcoding `<core>/rulesets`. Hardcoding one candidate made
    // readiness report DOWN whenever CORE_PATH pointed at a Core monorepo
    // checkout (corpus at `src/rulesets`) — and, worse, report UP off a
    // `rulesets/` tree that holds no corpus at all. Readiness must answer the
    // question the validators will actually ask.
    const [corpusOk] = await Promise.allSettled([
      (async () => {
        const { rulesetsRoot } = await probeRulesetsLocation(
          corePath,
          {
            exists: (p) => this.fs.exists(p),
            readdirNames: (p) => this.fs.readdirNames(p),
          },
          path.sep,
        );
        if (!rulesetsRoot) return false;
        return this.fs.exists(path.join(rulesetsRoot, 'sdlc', 'phase-gates.rules.json'));
      })(),
    ]);

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
