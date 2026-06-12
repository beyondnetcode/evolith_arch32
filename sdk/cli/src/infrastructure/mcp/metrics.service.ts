import { Logger } from '@nestjs/common';

export interface ToolMetrics {
  toolName: string;
  callCount: number;
  successCount: number;
  errorCount: number;
  totalLatencyMs: number;
  lastCalled: string;
}

export interface McpMetrics {
  serverStartTime: string;
  totalRequests: number;
  toolMetrics: Map<string, ToolMetrics>;
  errorMetrics: Map<string, number>;
}

export class McpMetricsService {
  private readonly logger = new Logger(McpMetricsService.name);
  private metrics: McpMetrics;

  constructor() {
    this.metrics = {
      serverStartTime: new Date().toISOString(),
      totalRequests: 0,
      toolMetrics: new Map(),
      errorMetrics: new Map(),
    };
  }

  recordToolCall(toolName: string, latencyMs: number, success: boolean): void {
    this.metrics.totalRequests++;

    let toolMetrics = this.metrics.toolMetrics.get(toolName);
    if (!toolMetrics) {
      toolMetrics = {
        toolName,
        callCount: 0,
        successCount: 0,
        errorCount: 0,
        totalLatencyMs: 0,
        lastCalled: new Date().toISOString(),
      };
      this.metrics.toolMetrics.set(toolName, toolMetrics);
    }

    toolMetrics.callCount++;
    toolMetrics.totalLatencyMs += latencyMs;
    toolMetrics.lastCalled = new Date().toISOString();

    if (success) {
      toolMetrics.successCount++;
    } else {
      toolMetrics.errorCount++;
    }

    this.logger.debug(`Tool call recorded: ${toolName} - ${success ? 'success' : 'error'} (${latencyMs}ms)`);
  }

  recordError(errorCode: string): void {
    const count = this.metrics.errorMetrics.get(errorCode) || 0;
    this.metrics.errorMetrics.set(errorCode, count + 1);
  }

  getMetrics(): McpMetricsSnapshot {
    const toolMetricsArray = Array.from(this.metrics.toolMetrics.values()).map(tm => ({
      ...tm,
      averageLatencyMs: tm.callCount > 0 ? Math.round(tm.totalLatencyMs / tm.callCount) : 0,
      errorRate: tm.callCount > 0 ? (tm.errorCount / tm.callCount * 100).toFixed(2) + '%' : '0%',
    }));

    return {
      serverStartTime: this.metrics.serverStartTime,
      uptimeMs: Date.now() - new Date(this.metrics.serverStartTime).getTime(),
      totalRequests: this.metrics.totalRequests,
      toolMetrics: toolMetricsArray,
      topErrors: Array.from(this.metrics.errorMetrics.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([code, count]) => ({ code, count })),
    };
  }

  getToolMetrics(toolName: string): ToolMetrics | undefined {
    return this.metrics.toolMetrics.get(toolName);
  }

  reset(): void {
    this.metrics.totalRequests = 0;
    this.metrics.toolMetrics.clear();
    this.metrics.errorMetrics.clear();
    this.logger.log('Metrics reset');
  }
}

export interface McpMetricsSnapshot {
  serverStartTime: string;
  uptimeMs: number;
  totalRequests: number;
  toolMetrics: Array<ToolMetrics & { averageLatencyMs: number; errorRate: string }>;
  topErrors: Array<{ code: string; count: number }>;
}