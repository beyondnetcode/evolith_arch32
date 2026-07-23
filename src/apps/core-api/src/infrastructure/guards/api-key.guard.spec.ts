import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

function ctx(headers: Record<string, string> = {}) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as never;
}

describe('ApiKeyGuard', () => {
  const original = { ...process.env };
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    delete process.env.EVOLITH_API_KEY;
    delete process.env.CORE_API_AUTH_REQUIRED;
    // canActivate falls back to a Dapr secret fetch when no env key is set;
    // simulate no reachable sidecar so the no-key path is hermetic and fast.
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('no dapr sidecar'));
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  afterAll(() => {
    process.env = original;
  });

  it('allows @Public() routes regardless of key', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    process.env.EVOLITH_API_KEY = 'secret';
    await expect(new ApiKeyGuard(reflector).canActivate(ctx())).resolves.toBe(true);
  });

  it('denies when no key configured (fail-closed by default)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    // H6: fail-closed — rejects unauthenticated requests unless explicitly opted out
    await expect(new ApiKeyGuard(reflector).canActivate(ctx())).rejects.toThrow(UnauthorizedException);
  });

  it('allows when no key configured and CORE_API_AUTH_REQUIRED=false (explicit opt-out)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    process.env.CORE_API_AUTH_REQUIRED = 'false';
    await expect(new ApiKeyGuard(reflector).canActivate(ctx())).resolves.toBe(true);
  });

  it('denies when CORE_API_AUTH_REQUIRED=true and no key configured', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    process.env.CORE_API_AUTH_REQUIRED = 'true';
    await expect(new ApiKeyGuard(reflector).canActivate(ctx())).rejects.toThrow(UnauthorizedException);
  });

  it('requires a valid key when EVOLITH_API_KEY is set', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    process.env.EVOLITH_API_KEY = 'secret';
    const guard = new ApiKeyGuard(reflector);

    await expect(guard.canActivate(ctx())).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx({ 'x-api-key': 'wrong' }))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx({ 'x-api-key': 'secret' }))).resolves.toBe(true);
    await expect(guard.canActivate(ctx({ authorization: 'Bearer secret' }))).resolves.toBe(true);
  });
});
