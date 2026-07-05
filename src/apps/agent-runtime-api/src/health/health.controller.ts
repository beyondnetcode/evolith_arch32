import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

/**
 * Liveness/readiness + service banner. Public (no API key) so Traefik/Coolify
 * health checks and `curl /health` work without credentials.
 */
@Controller()
export class HealthController {
  private readonly startedAt = Date.now();

  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'agent-runtime-api',
      version: process.env.npm_package_version ?? '0.1.0',
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
    };
  }

  /** Liveness probe — the process is up (always ok while serving). */
  @Public()
  @Get('health/live')
  live() {
    return { status: 'ok', probe: 'live' };
  }

  /** Readiness probe — the app is ready to accept traffic. */
  @Public()
  @Get('health/ready')
  ready() {
    return { status: 'ok', probe: 'ready' };
  }

  @Public()
  @Get()
  root() {
    return {
      service: 'Evolith Agent Runtime',
      docs: 'https://github.com/beyondnetcode/evolith_arch32',
      endpoints: ['GET /health', 'GET /v1/agent/skills', 'POST /v1/agent/handle'],
    };
  }
}
