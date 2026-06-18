import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let metrics: MetricsService;

  beforeEach(() => {
    metrics = new MetricsService();
  });

  it('aggregates per-tool calls, failures and average latency', () => {
    metrics.recordToolCall('evolith-validate', 10, true);
    metrics.recordToolCall('evolith-validate', 30, false);
    const snap = metrics.getMetrics();

    expect(snap.totalCalls).toBe(2);
    expect(snap.totalFailures).toBe(1);
    const t = snap.tools['evolith-validate'];
    expect(t.calls).toBe(2);
    expect(t.failures).toBe(1);
    expect(t.totalLatencyMs).toBe(40);
    expect(t.avgLatencyMs).toBe(20);
  });

  it('computes uptime from the injected clock', () => {
    const snap = metrics.getMetrics(Number.MAX_SAFE_INTEGER);
    expect(snap.uptimeMs).toBeGreaterThan(0);
  });

  it('keeps recent errors bounded and most-recent-first', () => {
    for (let i = 0; i < 25; i++) metrics.recordError(`err-${i}`);
    const snap = metrics.getMetrics();
    expect(snap.recentErrors).toHaveLength(20);
    expect(snap.recentErrors[0]).toBe('err-24');
  });
});
