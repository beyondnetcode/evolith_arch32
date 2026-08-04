import { Controller, Get } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Public } from '../auth/public.decorator';

/** ADR-0073 envelope shape version for this surface. */
const ENVELOPE_SCHEMA_VERSION = '1.0.0';

/**
 * GT-654 — every probe answers the ADR-0073 envelope.
 *
 * These used to return bare objects (`{status: 'ok', service, version, ...}`)
 * while core-api answered `{success, data: {status: 'OK'}, meta}`. Three
 * services of one product, three shapes, and the verdict literal differing in
 * case as well. A probe written against either shape reported the others as
 * broken — that produced a false failure on 2026-08-03, when a cross-cluster
 * check matched `"status":"ok"` literally and called two healthy services
 * unreachable while they were serving.
 *
 * Unifying is safe because NOTHING reads the body: the Helm probes use
 * `httpGet` (status code only), the Dockerfile uses `curl -f` (non-2xx only),
 * k6 checks `r.status === 200` and RoboSoft checks `hr.ok`. Measured before
 * changing it, not assumed — the earlier worry that "the probes are configured
 * against a shape" was wrong.
 */
function envelope(command: string, data: Record<string, unknown>) {
  return {
    success: true,
    data,
    meta: {
      command,
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: `evl-${randomUUID()}`,
      schemaVersion: ENVELOPE_SCHEMA_VERSION,
    },
  };
}

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
    return envelope('http GET /health', {
      status: 'OK',
      service: 'agent-runtime-api',
      version: process.env.npm_package_version ?? '0.1.0',
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
    });
  }

  /** Liveness probe — the process is up (always ok while serving). */
  @Public()
  @Get('health/live')
  live() {
    return envelope('http GET /health/live', { status: 'OK', probe: 'live', service: 'agent-runtime-api' });
  }

  /** Readiness probe — the app is ready to accept traffic. */
  @Public()
  @Get('health/ready')
  ready() {
    return envelope('http GET /health/ready', { status: 'OK', probe: 'ready', service: 'agent-runtime-api' });
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
