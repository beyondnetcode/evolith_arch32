import { McpTool } from '../mcp/tool.interface';
import { MetricsService } from '../mcp/metrics.service';

/** `evolith-metrics` — expose the gateway's in-process metrics snapshot. */
export function createMetricsTools(metrics: MetricsService): McpTool[] {
  return [
    {
      schema: {
        name: 'evolith-metrics',
        description: 'Get MCP server metrics (per-tool call counts, latency, failures)',
        inputSchema: { type: 'object', properties: {} },
      },
      execute: async () => metrics.getMetrics(),
    },
  ];
}
