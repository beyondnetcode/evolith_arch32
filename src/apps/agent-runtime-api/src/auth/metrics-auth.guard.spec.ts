import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { MetricsAuthGuard } from './metrics-auth.guard';

function ctx(headers: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('MetricsAuthGuard (GT-549 — /metrics fail-closed with trusted-network opt-out)', () => {
  const saved = {
    key: process.env.AGENT_RUNTIME_API_KEY,
    allow: process.env.AGENT_RUNTIME_ALLOW_NO_AUTH,
  };
  const set = (key?: string, allow?: string) => {
    if (key === undefined) delete process.env.AGENT_RUNTIME_API_KEY;
    else process.env.AGENT_RUNTIME_API_KEY = key;
    if (allow === undefined) delete process.env.AGENT_RUNTIME_ALLOW_NO_AUTH;
    else process.env.AGENT_RUNTIME_ALLOW_NO_AUTH = allow;
  };
  afterEach(() => set(saved.key, saved.allow));

  const guard = new MetricsAuthGuard();

  it('rejects anonymous scraping when no credential is configured and no opt-out', () => {
    set(undefined, undefined);
    expect(() => guard.canActivate(ctx({}))).toThrow(UnauthorizedException);
  });

  it('allows anonymous scraping ONLY with the explicit trusted-network opt-out', () => {
    set(undefined, 'true');
    expect(guard.canActivate(ctx({}))).toBe(true);
  });

  it('accepts a matching Bearer token', () => {
    set('s3cret', undefined);
    expect(guard.canActivate(ctx({ authorization: 'Bearer s3cret' }))).toBe(true);
  });

  it('accepts a matching x-api-key header', () => {
    set('s3cret', undefined);
    expect(guard.canActivate(ctx({ 'x-api-key': 's3cret' }))).toBe(true);
  });

  it('rejects a wrong or missing credential when a key is configured (opt-out is ignored)', () => {
    set('s3cret', 'true');
    expect(() => guard.canActivate(ctx({ authorization: 'Bearer nope' }))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx({ 'x-api-key': 'nope' }))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx({}))).toThrow(UnauthorizedException);
  });
});
