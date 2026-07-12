import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { MetricsAuthGuard } from './metrics-auth.guard';

function ctx(headers: Record<string, string> = {}) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as never;
}

describe('MetricsAuthGuard (GT-393)', () => {
  const original = { ...process.env };
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    delete process.env.EVOLITH_API_KEY;
    // With no env key, the guard falls back to a Dapr secret fetch; simulate an
    // unreachable sidecar so the no-key path is hermetic and fast.
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('no dapr sidecar'));
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  afterAll(() => {
    process.env = original;
  });

  it('fails closed when no key is configured (deny open scraping)', async () => {
    await expect(
      new MetricsAuthGuard(reflector).canActivate(ctx({ authorization: 'Bearer anything' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a missing or non-Bearer Authorization header when a key is set', async () => {
    process.env.EVOLITH_API_KEY = 'secret';
    const guard = new MetricsAuthGuard(reflector);

    await expect(guard.canActivate(ctx())).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx({ authorization: 'secret' }))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx({ authorization: 'Basic secret' }))).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an invalid Bearer token', async () => {
    process.env.EVOLITH_API_KEY = 'secret';
    await expect(
      new MetricsAuthGuard(reflector).canActivate(ctx({ authorization: 'Bearer wrong' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('authorizes a valid Bearer token', async () => {
    process.env.EVOLITH_API_KEY = 'secret';
    await expect(
      new MetricsAuthGuard(reflector).canActivate(ctx({ authorization: 'Bearer secret' })),
    ).resolves.toBe(true);
  });

  it('reads the key from a Dapr secret when EVOLITH_API_KEY is unset', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ EVOLITH_API_KEY: 'from-dapr' }),
    } as Response);

    const guard = new MetricsAuthGuard(reflector);
    await expect(guard.canActivate(ctx({ authorization: 'Bearer from-dapr' }))).resolves.toBe(true);
    // second call is served from the in-memory cache (no second fetch)
    await expect(guard.canActivate(ctx({ authorization: 'Bearer from-dapr' }))).resolves.toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
