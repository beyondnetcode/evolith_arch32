import { initCliOtel, shutdownCliOtel, isOtelEnabled } from './otel-tracing';

describe('otel-tracing', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OTEL_ENABLED;
    const g = globalThis as { __otelSdk?: unknown; __otelInitialized?: boolean };
    delete g.__otelSdk;
    delete g.__otelInitialized;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isOtelEnabled', () => {
    it('returns false when not initialized', () => {
      expect(isOtelEnabled()).toBe(false);
    });
  });

  describe('initCliOtel', () => {
    it('does nothing when OTEL_ENABLED is not set', () => {
      initCliOtel();
      expect(isOtelEnabled()).toBe(false);
    });

    it('does nothing when OTEL_ENABLED is not true', () => {
      process.env.OTEL_ENABLED = 'false';
      initCliOtel();
      expect(isOtelEnabled()).toBe(false);
    });

    it('is idempotent when already initialized', () => {
      process.env.OTEL_ENABLED = 'true';
      initCliOtel();
      expect(isOtelEnabled()).toBe(true);
      const g = globalThis as { __otelSdk?: unknown; __otelInitialized?: boolean };
      const sdkRef = g.__otelSdk;
      initCliOtel();
      expect(g.__otelSdk).toBe(sdkRef);
    });
  });

  describe('shutdownCliOtel', () => {
    it('does nothing when SDK is not initialized', async () => {
      await expect(shutdownCliOtel()).resolves.toBeUndefined();
    });

    it('shuts down and clears SDK reference', async () => {
      process.env.OTEL_ENABLED = 'true';
      initCliOtel();

      const g = globalThis as { __otelSdk?: { shutdown: () => Promise<void> }; __otelInitialized?: boolean };
      const mockShutdown = jest.fn().mockResolvedValue(undefined);
      g.__otelSdk = { shutdown: mockShutdown };

      await shutdownCliOtel();
      expect(mockShutdown).toHaveBeenCalled();
    });
  });
});
