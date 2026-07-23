import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  describe('recordToolCall', () => {
    it('increments total calls', () => {
      service.recordToolCall('tool-a', 100, true);
      const metrics = service.getMetrics();
      expect(metrics.totalCalls).toBe(1);
    });

    it('counts failures', () => {
      service.recordToolCall('tool-a', 100, false);
      const metrics = service.getMetrics();
      expect(metrics.totalFailures).toBe(1);
    });

    it('tracks per-tool stats', () => {
      service.recordToolCall('tool-a', 100, true);
      service.recordToolCall('tool-a', 200, true);
      const metrics = service.getMetrics();
      expect(metrics.tools['tool-a'].calls).toBe(2);
      expect(metrics.tools['tool-a'].totalLatencyMs).toBe(300);
      expect(metrics.tools['tool-a'].avgLatencyMs).toBe(150);
    });

    it('handles multiple tools', () => {
      service.recordToolCall('tool-a', 100, true);
      service.recordToolCall('tool-b', 200, true);
      const metrics = service.getMetrics();
      expect(Object.keys(metrics.tools)).toHaveLength(2);
    });
  });

  describe('recordError', () => {
    it('stores error messages', () => {
      service.recordError('test error');
      const metrics = service.getMetrics();
      expect(metrics.recentErrors).toContain('test error');
    });

    it('bounds recent errors to MAX_RECENT_ERRORS', () => {
      for (let i = 0; i < 25; i++) {
        service.recordError(`error-${i}`);
      }
      const metrics = service.getMetrics();
      expect(metrics.recentErrors.length).toBeLessThanOrEqual(20);
    });
  });

  describe('getMetrics', () => {
    it('returns empty metrics initially', () => {
      const metrics = service.getMetrics();
      expect(metrics.totalCalls).toBe(0);
      expect(metrics.totalFailures).toBe(0);
      expect(metrics.tools).toEqual({});
      expect(metrics.recentErrors).toEqual([]);
    });

    it('calculates uptime', () => {
      const now = Date.now();
      const metrics = service.getMetrics(now);
      expect(metrics.uptimeMs).toBeGreaterThanOrEqual(0);
    });

    it('calculates average latency', () => {
      service.recordToolCall('tool-a', 100, true);
      service.recordToolCall('tool-a', 300, true);
      const metrics = service.getMetrics();
      expect(metrics.tools['tool-a'].avgLatencyMs).toBe(200);
    });

    it('returns empty avgLatencyMs when no calls', () => {
      const metrics = service.getMetrics();
      expect(metrics.tools['tool-a']?.avgLatencyMs ?? 0).toBe(0);
    });
  });
});
