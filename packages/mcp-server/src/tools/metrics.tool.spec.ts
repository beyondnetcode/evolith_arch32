import { createMetricsTools } from './metrics.tool';
import { MetricsService } from '../mcp/metrics.service';

describe('metrics tool', () => {
  it('returns the metrics snapshot', async () => {
    const metrics = new MetricsService();
    metrics.recordToolCall('evolith-validate', 12, true);
    const tool = createMetricsTools(metrics)[0];

    const snap = (await tool.execute({})) as { totalCalls: number; tools: Record<string, unknown> };
    expect(snap.totalCalls).toBe(1);
    expect(snap.tools['evolith-validate']).toBeDefined();
  });
});
