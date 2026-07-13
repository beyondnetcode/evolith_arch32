import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';
import { signHs256 } from './jwt.util';
import { AuthenticatedPrincipal, PRINCIPAL_KEY, WILDCARD_TENANT } from './principal';

interface MockReq {
  headers: Record<string, string | undefined>;
  body?: unknown;
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

// `isPublic` is enforced via the Reflector mock (matches how NestJS resolves
// @Public() metadata), not via the ExecutionContext.
function guardWith(isPublic = false): ApiKeyGuard {
  const reflector = { getAllAndOverride: () => isPublic } as unknown as Reflector;
  return new ApiKeyGuard(reflector);
}

describe('ApiKeyGuard (fail-closed auth + JWT tenant extraction, GT-439)', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.AGENT_RUNTIME_API_KEY;
    delete process.env.AGENT_RUNTIME_JWT_SECRET;
    delete process.env.AGENT_RUNTIME_ALLOW_NO_AUTH;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('allows @Public() routes without any credential', () => {
    const guard = guardWith(true);
    const req: MockReq = { headers: {} };
    expect(guard.canActivate(makeContext(req))).toBe(true);
  });

  describe('fail-closed when no credential is configured', () => {
    it('DENIES in production when no key/secret is set (fail-closed)', () => {
      process.env.NODE_ENV = 'production';
      const guard = guardWith();
      const req: MockReq = { headers: {} };
      expect(() => guard.canActivate(makeContext(req))).toThrow(UnauthorizedException);
    });

    it('allows in production only with the explicit AGENT_RUNTIME_ALLOW_NO_AUTH override', () => {
      process.env.NODE_ENV = 'production';
      process.env.AGENT_RUNTIME_ALLOW_NO_AUTH = 'true';
      const guard = guardWith();
      const req: MockReq = { headers: {} };
      expect(guard.canActivate(makeContext(req))).toBe(true);
      expect(req[PRINCIPAL_KEY]).toEqual({ authMethod: 'none', tenantId: WILDCARD_TENANT });
    });

    it('allows in development (dev still runs without a key)', () => {
      process.env.NODE_ENV = 'development';
      const guard = guardWith();
      const req: MockReq = { headers: {} };
      expect(guard.canActivate(makeContext(req))).toBe(true);
      expect(req[PRINCIPAL_KEY]?.tenantId).toBe(WILDCARD_TENANT);
    });
  });

  describe('API-key authentication', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.AGENT_RUNTIME_API_KEY = 'secret-key';
    });

    it('allows a valid x-api-key and attaches a service (wildcard) principal', () => {
      const guard = guardWith();
      const req: MockReq = { headers: { 'x-api-key': 'secret-key' } };
      expect(guard.canActivate(makeContext(req))).toBe(true);
      expect(req[PRINCIPAL_KEY]).toEqual({ authMethod: 'api-key', tenantId: WILDCARD_TENANT });
    });

    it('allows a valid opaque Bearer key', () => {
      const guard = guardWith();
      const req: MockReq = { headers: { authorization: 'Bearer secret-key' } };
      expect(guard.canActivate(makeContext(req))).toBe(true);
      expect(req[PRINCIPAL_KEY]?.authMethod).toBe('api-key');
    });

    it('denies a wrong key', () => {
      const guard = guardWith();
      const req: MockReq = { headers: { 'x-api-key': 'nope' } };
      expect(() => guard.canActivate(makeContext(req))).toThrow(UnauthorizedException);
    });

    it('denies when no credential is presented on a protected route', () => {
      const guard = guardWith();
      const req: MockReq = { headers: {} };
      expect(() => guard.canActivate(makeContext(req))).toThrow(UnauthorizedException);
    });
  });

  describe('JWT authentication with tenant-claim extraction', () => {
    const jwtSecret = 'jwt-shared-secret';
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.AGENT_RUNTIME_JWT_SECRET = jwtSecret;
    });

    it('allows a valid JWT and extracts the tenant claim into the principal', () => {
      const token = signHs256({ sub: 'user-9', tenant: 'tenant-a', roles: ['runtime:user'] }, jwtSecret);
      const guard = guardWith();
      const req: MockReq = { headers: { authorization: `Bearer ${token}` } };
      expect(guard.canActivate(makeContext(req))).toBe(true);
      expect(req[PRINCIPAL_KEY]).toEqual({
        authMethod: 'jwt',
        tenantId: 'tenant-a',
        subject: 'user-9',
        roles: ['runtime:user'],
      });
    });

    it('denies a JWT with a bad signature', () => {
      const token = signHs256({ tenant: 'tenant-a' }, 'attacker-secret');
      const guard = guardWith();
      const req: MockReq = { headers: { authorization: `Bearer ${token}` } };
      expect(() => guard.canActivate(makeContext(req))).toThrow(UnauthorizedException);
    });

    it('denies a verified JWT that is missing a tenant claim', () => {
      const token = signHs256({ sub: 'user-9' }, jwtSecret);
      const guard = guardWith();
      const req: MockReq = { headers: { authorization: `Bearer ${token}` } };
      expect(() => guard.canActivate(makeContext(req))).toThrow(UnauthorizedException);
    });

    it('denies an expired JWT', () => {
      const token = signHs256(
        { tenant: 'tenant-a', exp: Math.floor(Date.now() / 1000) - 10 },
        jwtSecret,
      );
      const guard = guardWith();
      const req: MockReq = { headers: { authorization: `Bearer ${token}` } };
      expect(() => guard.canActivate(makeContext(req))).toThrow(UnauthorizedException);
    });

    it('denies a JWT-shaped bearer when no JWT secret is configured (cannot verify)', () => {
      delete process.env.AGENT_RUNTIME_JWT_SECRET;
      process.env.AGENT_RUNTIME_API_KEY = 'secret-key'; // some auth configured, but not JWT
      const token = signHs256({ tenant: 'tenant-a' }, 'whatever');
      const guard = guardWith();
      const req: MockReq = { headers: { authorization: `Bearer ${token}` } };
      expect(() => guard.canActivate(makeContext(req))).toThrow(UnauthorizedException);
    });
  });
});
