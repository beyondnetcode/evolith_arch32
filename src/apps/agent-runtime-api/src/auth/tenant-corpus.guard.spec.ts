import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantCorpusGuard } from './tenant-corpus.guard';
import { AuthenticatedPrincipal, PRINCIPAL_KEY, WILDCARD_TENANT } from './principal';

interface MockReq {
  headers: Record<string, string | undefined>;
  body?: unknown;
  query?: Record<string, unknown>;
  [PRINCIPAL_KEY]?: AuthenticatedPrincipal;
}

function makeContext(req: MockReq): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function guardWith(isPublic = false): TenantCorpusGuard {
  const reflector = { getAllAndOverride: () => isPublic } as unknown as Reflector;
  return new TenantCorpusGuard(reflector);
}

const tenantA: AuthenticatedPrincipal = { authMethod: 'jwt', tenantId: 'tenant-a' };

describe('TenantCorpusGuard (per-tenant corpus isolation, GT-439)', () => {
  it('allows @Public() routes without a principal', () => {
    const guard = guardWith(true);
    expect(guard.canActivate(makeContext({ headers: {} }))).toBe(true);
  });

  it('DENIES a protected route with no authenticated principal (fail-closed)', () => {
    const guard = guardWith();
    expect(() => guard.canActivate(makeContext({ headers: {} }))).toThrow(ForbiddenException);
  });

  it('allows a service/wildcard principal to act across tenants', () => {
    const guard = guardWith();
    const req: MockReq = {
      headers: {},
      body: { context: { tenantId: 'tenant-b' } },
      [PRINCIPAL_KEY]: { authMethod: 'api-key', tenantId: WILDCARD_TENANT },
    };
    expect(guard.canActivate(makeContext(req))).toBe(true);
  });

  it('allows a tenant principal to access its OWN corpus (body context)', () => {
    const guard = guardWith();
    const req: MockReq = {
      headers: {},
      body: { context: { tenantId: 'tenant-a' } },
      [PRINCIPAL_KEY]: tenantA,
    };
    expect(guard.canActivate(makeContext(req))).toBe(true);
  });

  it('allows a tenant principal when no target tenant is specified', () => {
    const guard = guardWith();
    const req: MockReq = { headers: {}, [PRINCIPAL_KEY]: tenantA };
    expect(guard.canActivate(makeContext(req))).toBe(true);
  });

  it('DENIES cross-tenant corpus access via body context', () => {
    const guard = guardWith();
    const req: MockReq = {
      headers: {},
      body: { context: { tenantId: 'tenant-b' } },
      [PRINCIPAL_KEY]: tenantA,
    };
    expect(() => guard.canActivate(makeContext(req))).toThrow(ForbiddenException);
  });

  it('DENIES cross-tenant corpus access via x-evolith-tenant header', () => {
    const guard = guardWith();
    const req: MockReq = {
      headers: { 'x-evolith-tenant': 'tenant-b' },
      [PRINCIPAL_KEY]: tenantA,
    };
    expect(() => guard.canActivate(makeContext(req))).toThrow(ForbiddenException);
  });

  it('DENIES cross-tenant corpus access via tenant query param', () => {
    const guard = guardWith();
    const req: MockReq = {
      headers: {},
      query: { tenant: 'tenant-b' },
      [PRINCIPAL_KEY]: tenantA,
    };
    expect(() => guard.canActivate(makeContext(req))).toThrow(ForbiddenException);
  });
});
