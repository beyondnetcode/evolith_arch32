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
  });
  afterAll(() => {
    process.env = original;
  });

  it('allows @Public() routes regardless of key', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    process.env.EVOLITH_API_KEY = 'secret';
    expect(new ApiKeyGuard(reflector).canActivate(ctx())).toBe(true);
  });

  it('allows when no key configured (migration-safe)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    expect(new ApiKeyGuard(reflector).canActivate(ctx())).toBe(true);
  });

  it('denies when CORE_API_AUTH_REQUIRED=true and no key configured', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    process.env.CORE_API_AUTH_REQUIRED = 'true';
    expect(() => new ApiKeyGuard(reflector).canActivate(ctx())).toThrow(UnauthorizedException);
  });

  it('requires a valid key when EVOLITH_API_KEY is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    process.env.EVOLITH_API_KEY = 'secret';
    const guard = new ApiKeyGuard(reflector);

    expect(() => guard.canActivate(ctx())).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx({ 'x-api-key': 'wrong' }))).toThrow(UnauthorizedException);
    expect(guard.canActivate(ctx({ 'x-api-key': 'secret' }))).toBe(true);
    expect(guard.canActivate(ctx({ authorization: 'Bearer secret' }))).toBe(true);
  });
});
