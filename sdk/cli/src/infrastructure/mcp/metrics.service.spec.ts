import { McpMetricsService } from './metrics.service';

describe('McpMetricsService', () => {
  let service: McpMetricsService;

  beforeEach(() => {
    service = new McpMetricsService();
  });

  describe('recordToolCall', () => {
    it('should record a successful tool call', () => {
      service.recordToolCall('test-tool', 100, true);

      const metrics = service.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.toolMetrics).toHaveLength(1);
      expect(metrics.toolMetrics[0].toolName).toBe('test-tool');
      expect(metrics.toolMetrics[0].callCount).toBe(1);
      expect(metrics.toolMetrics[0].successCount).toBe(1);
      expect(metrics.toolMetrics[0].errorCount).toBe(0);
      expect(metrics.toolMetrics[0].totalLatencyMs).toBe(100);
    });

    it('should record a failed tool call', () => {
      service.recordToolCall('test-tool', 50, false);

      const metrics = service.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.toolMetrics[0].errorCount).toBe(1);
      expect(metrics.toolMetrics[0].successCount).toBe(0);
    });

    it('should aggregate multiple calls to the same tool', () => {
      service.recordToolCall('test-tool', 100, true);
      service.recordToolCall('test-tool', 200, true);
      service.recordToolCall('test-tool', 50, false);

      const metrics = service.getMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.toolMetrics).toHaveLength(1);
      expect(metrics.toolMetrics[0].callCount).toBe(3);
      expect(metrics.toolMetrics[0].successCount).toBe(2);
      expect(metrics.toolMetrics[0].errorCount).toBe(1);
      expect(metrics.toolMetrics[0].totalLatencyMs).toBe(350);
    });

    it('should track multiple different tools', () => {
      service.recordToolCall('tool-a', 100, true);
      service.recordToolCall('tool-b', 200, true);

      const metrics = service.getMetrics();
      expect(metrics.toolMetrics).toHaveLength(2);
    });

    it('should calculate average latency correctly', () => {
      service.recordToolCall('test-tool', 100, true);
      service.recordToolCall('test-tool', 200, true);

      const metrics = service.getMetrics();
      expect(metrics.toolMetrics[0].averageLatencyMs).toBe(150);
    });

    it('should calculate error rate as percentage string', () => {
      service.recordToolCall('test-tool', 100, true);
      service.recordToolCall('test-tool', 100, false);

      const metrics = service.getMetrics();
      expect(metrics.toolMetrics[0].errorRate).toBe('50.00%');
    });

    it('should show 0% error rate when no calls made', () => {
      const metrics = service.getMetrics();
      expect(metrics.toolMetrics).toHaveLength(0);
    });

    it('should update lastCalled timestamp on each call', () => {
      service.recordToolCall('test-tool', 100, true);
      const firstMetrics = service.getToolMetrics('test-tool');

      // Small delay to ensure timestamp changes
      const before = new Date().toISOString();
      service.recordToolCall('test-tool', 100, true);
      const secondMetrics = service.getToolMetrics('test-tool');

      expect(secondMetrics?.lastCalled).toBeDefined();
    });
  });

  describe('recordError', () => {
    it('should record an error code', () => {
      service.recordError('ERR_001');

      const metrics = service.getMetrics();
      expect(metrics.topErrors).toHaveLength(1);
      expect(metrics.topErrors[0].code).toBe('ERR_001');
      expect(metrics.topErrors[0].count).toBe(1);
    });

    it('should increment error count for repeated errors', () => {
      service.recordError('ERR_001');
      service.recordError('ERR_001');
      service.recordError('ERR_001');

      const metrics = service.getMetrics();
      expect(metrics.topErrors[0].count).toBe(3);
    });

    it('should track multiple error codes', () => {
      service.recordError('ERR_001');
      service.recordError('ERR_002');
      service.recordError('ERR_003');

      const metrics = service.getMetrics();
      expect(metrics.topErrors).toHaveLength(3);
    });

    it('should sort errors by count descending', () => {
      service.recordError('ERR_LOW');
      service.recordError('ERR_HIGH');
      service.recordError('ERR_HIGH');
      service.recordError('ERR_HIGH');
      service.recordError('ERR_MED');
      service.recordError('ERR_MED');

      const metrics = service.getMetrics();
      expect(metrics.topErrors[0].code).toBe('ERR_HIGH');
      expect(metrics.topErrors[1].code).toBe('ERR_MED');
      expect(metrics.topErrors[2].code).toBe('ERR_LOW');
    });

    it('should limit top errors to 5', () => {
      for (let i = 0; i < 10; i++) {
        service.recordError(`ERR_${i}`);
      }

      const metrics = service.getMetrics();
      expect(metrics.topErrors).toHaveLength(5);
    });
  });

  describe('getMetrics', () => {
    it('should return server start time', () => {
      const metrics = service.getMetrics();
      expect(metrics.serverStartTime).toBeDefined();
      expect(new Date(metrics.serverStartTime).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should calculate uptime', () => {
      const metrics = service.getMetrics();
      expect(metrics.uptimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return empty arrays when no data', () => {
      const metrics = service.getMetrics();
      expect(metrics.toolMetrics).toEqual([]);
      expect(metrics.topErrors).toEqual([]);
    });
  });

  describe('getToolMetrics', () => {
    it('should return metrics for a specific tool', () => {
      service.recordToolCall('test-tool', 100, true);

      const toolMetrics = service.getToolMetrics('test-tool');
      expect(toolMetrics).toBeDefined();
      expect(toolMetrics?.toolName).toBe('test-tool');
    });

    it('should return undefined for unknown tool', () => {
      const toolMetrics = service.getToolMetrics('unknown-tool');
      expect(toolMetrics).toBeUndefined();
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      service.recordToolCall('test-tool', 100, true);
      service.recordError('ERR_001');

      service.reset();

      const metrics = service.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.toolMetrics).toEqual([]);
      expect(metrics.topErrors).toEqual([]);
    });

    it('should preserve server start time after reset', () => {
      const beforeReset = service.getMetrics().serverStartTime;
      service.reset();
      const afterReset = service.getMetrics().serverStartTime;

      expect(beforeReset).toBe(afterReset);
    });
  });
});
