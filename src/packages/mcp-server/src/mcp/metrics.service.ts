import { Injectable } from '@nestjs/common';

export interface ToolCallStats {
  calls: number;
  failures: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
}

export interface McpMetrics {
  uptimeMs: number;
  totalCalls: number;
  totalFailures: number;
  tools: Record<string, ToolCallStats>;
  recentErrors: string[];
}

/**
 * Lightweight in-process metrics for the MCP Gateway: per-tool call counts,
 * latency, failures, and a bounded ring of recent error messages.
 */
@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private totalCalls = 0;
  private totalFailures = 0;
  private readonly tools = new Map<string, { calls: number; failures: number; totalLatencyMs: number }>();
  private readonly recentErrors: string[] = [];
  private static readonly MAX_RECENT_ERRORS = 20;

  recordToolCall(name: string, latencyMs: number, success: boolean): void {
    this.totalCalls += 1;
    if (!success) this.totalFailures += 1;

    const stat = this.tools.get(name) ?? { calls: 0, failures: 0, totalLatencyMs: 0 };
    stat.calls += 1;
    stat.totalLatencyMs += latencyMs;
    if (!success) stat.failures += 1;
    this.tools.set(name, stat);
  }

  recordError(message: string): void {
    this.recentErrors.unshift(message);
    if (this.recentErrors.length > MetricsService.MAX_RECENT_ERRORS) {
      this.recentErrors.length = MetricsService.MAX_RECENT_ERRORS;
    }
  }

  getMetrics(now: number = Date.now()): McpMetrics {
    const tools: Record<string, ToolCallStats> = {};
    for (const [name, stat] of this.tools.entries()) {
      tools[name] = {
        calls: stat.calls,
        failures: stat.failures,
        totalLatencyMs: stat.totalLatencyMs,
        avgLatencyMs: stat.calls > 0 ? stat.totalLatencyMs / stat.calls : 0,
      };
    }

    return {
      uptimeMs: now - this.startedAt,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      tools,
      recentErrors: [...this.recentErrors],
    };
  }
}
