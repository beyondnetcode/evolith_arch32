import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  it('creates service with default config', () => {
    const service = new RateLimitService();
    expect(service).toBeDefined();
  });

  it('creates service with custom config', () => {
    const service = new RateLimitService(30000, 50);
    expect(service).toBeDefined();
  });

  describe('isRateLimited', () => {
    it('returns false for first request from new IP', () => {
      const service = new RateLimitService(60000, 3);
      expect(service.isRateLimited('192.168.1.1')).toBe(false);
    });

    it('returns false when under limit', () => {
      const service = new RateLimitService(60000, 3);
      service.isRateLimited('192.168.1.1');
      service.isRateLimited('192.168.1.1');
      expect(service.isRateLimited('192.168.1.1')).toBe(false);
    });

    it('returns true when over limit', () => {
      const service = new RateLimitService(60000, 2);
      service.isRateLimited('192.168.1.1');
      service.isRateLimited('192.168.1.1');
      expect(service.isRateLimited('192.168.1.1')).toBe(true);
    });

    it('resets after window expires', () => {
      const service = new RateLimitService(1, 2); // 1ms window
      service.isRateLimited('192.168.1.1');
      service.isRateLimited('192.168.1.1');
      // Wait for window to expire
      return new Promise(resolve => setTimeout(() => {
        expect(service.isRateLimited('192.168.1.1')).toBe(false);
        resolve(undefined);
      }, 5));
    });

    it('tracks different IPs independently', () => {
      const service = new RateLimitService(60000, 2);
      service.isRateLimited('192.168.1.1');
      service.isRateLimited('192.168.1.1');
      expect(service.isRateLimited('192.168.1.1')).toBe(true);
      expect(service.isRateLimited('192.168.1.2')).toBe(false);
    });
  });

  describe('getRetryAfter', () => {
    it('returns retry seconds from window', () => {
      const service = new RateLimitService(60000, 100);
      expect(service.getRetryAfter()).toBe(60);
    });

    it('returns correct value for custom window', () => {
      const service = new RateLimitService(30000, 100);
      expect(service.getRetryAfter()).toBe(30);
    });
  });

  describe('trackedIpCount', () => {
    it('tracks number of unique IPs', () => {
      const service = new RateLimitService(60000, 100);
      expect(service.trackedIpCount).toBe(0);
      service.isRateLimited('192.168.1.1');
      expect(service.trackedIpCount).toBe(1);
      service.isRateLimited('192.168.1.2');
      expect(service.trackedIpCount).toBe(2);
    });
  });
});
