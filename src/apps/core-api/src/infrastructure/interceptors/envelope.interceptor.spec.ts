import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import {
  ENVELOPE_SCHEMA_VERSION,
  Envelope,
  EnvelopeInterceptor,
  buildEnvelopeMeta,
} from './envelope.interceptor';
import { requestContextStorage } from '@beyondnet/evolith-core-domain/common/request-context';

function makeContext(
  req: Record<string, unknown>,
  handler: object = function dummy() {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
    }),
    getHandler: () => handler,
  } as unknown as ExecutionContext;
}

function makeHandler(value: unknown): CallHandler {
  return { handle: () => of(value) } as CallHandler;
}

describe('EnvelopeInterceptor', () => {
  const interceptor = new EnvelopeInterceptor();
  const baseReq = {
    method: 'GET',
    url: '/api/v1/gates/eval',
    route: { path: '/api/v1/gates/eval' },
    headers: {},
    query: {},
    body: {},
  };

  it('wraps a controller return in {success, data, meta}', async () => {
    const ctx = makeContext(baseReq);
    const env = (await lastValueFrom(
      interceptor.intercept(ctx, makeHandler({ verdict: 'passed' })),
    )) as Envelope<{ verdict: string }>;

    expect(env.success).toBe(true);
    if (env.success) {
      expect(env.data).toEqual({ verdict: 'passed' });
    }
    expect(env.meta.command).toBe('http GET /api/v1/gates/eval');
    expect(env.meta.schemaVersion).toBe(ENVELOPE_SCHEMA_VERSION);
    expect(env.meta.correlationId).toMatch(/^evl-/);
    expect(typeof env.meta.durationMs).toBe('number');
    expect(env.meta.executedAt).toMatch(/T.*Z$/);
    expect(env.meta.context).toEqual({});
  });

  it('passes through values that already look like envelopes', async () => {
    const ctx = makeContext(baseReq);
    const preEnveloped = {
      success: true,
      data: { ok: 1 },
      meta: { command: 'pre' },
    };
    const result = await lastValueFrom(
      interceptor.intercept(ctx, makeHandler(preEnveloped)),
    );
    expect(result).toBe(preEnveloped);
  });

  it('echoes caller-supplied correlationId from header', async () => {
    const ctx = makeContext({
      ...baseReq,
      headers: { 'x-correlation-id': 'caller-123' },
    });
    const env = (await lastValueFrom(
      interceptor.intercept(ctx, makeHandler({})),
    )) as Envelope;
    expect(env.meta.correlationId).toBe('caller-123');
  });

  it('echoes context flags from headers, query, and body (in that precedence)', async () => {
    const ctx = makeContext({
      ...baseReq,
      headers: { 'x-evolith-initiative': 'opt-init' },
      query: { tenant: 'q-tenant', phase: 'q-phase' },
      body: { phase: 'body-phase' },
    });
    const env = (await lastValueFrom(
      interceptor.intercept(ctx, makeHandler({})),
    )) as Envelope;
    expect(env.meta.context).toEqual({
      initiative: 'opt-init',
      tenant: 'q-tenant',
      phase: 'q-phase',
    });
  });

  it('reads correlation ID and context from shared requestContextStorage', async () => {
    const ctx = makeContext(baseReq);
    let env: Envelope | undefined;
    await requestContextStorage.run({
      correlationId: 'shared-corr-999',
      initiative: 'shared-init',
      tenant: 'shared-tenant',
      phase: 'construction',
    }, async () => {
      env = (await lastValueFrom(
        interceptor.intercept(ctx, makeHandler({})),
      )) as Envelope;
    });

    expect(env).toBeDefined();
    expect(env!.meta.correlationId).toBe('shared-corr-999');
    expect(env!.meta.context).toEqual({
      initiative: 'shared-init',
      tenant: 'shared-tenant',
      phase: 'construction',
    });
  });

  it('wraps null/undefined returns as data: null', async () => {
    const ctx = makeContext(baseReq);
    const env = (await lastValueFrom(
      interceptor.intercept(ctx, makeHandler(undefined)),
    )) as Envelope;
    expect(env.success).toBe(true);
    if (env.success) {
      expect(env.data).toBeNull();
    }
  });
});

describe('buildEnvelopeMeta', () => {
  it('computes durationMs from the supplied start time', () => {
    const start = Date.now() - 50;
    const meta = buildEnvelopeMeta(
      {
        method: 'POST',
        url: '/api/v1/projects',
        route: { path: '/api/v1/projects' },
        headers: {},
        query: {},
        body: {},
      } as unknown as Parameters<typeof buildEnvelopeMeta>[0],
      start,
    );
    expect(meta.durationMs).toBeGreaterThanOrEqual(50);
    expect(meta.command).toBe('http POST /api/v1/projects');
    expect(meta.schemaVersion).toBe(ENVELOPE_SCHEMA_VERSION);
  });
});
