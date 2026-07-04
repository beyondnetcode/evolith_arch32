import * as fs from 'fs-extra';
import * as path from 'path';

export interface ToolUsageEvent {
  timestamp: string;
  toolName: string;
  userId?: string;
  sessionId?: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  context?: Record<string, unknown>;
}

export interface ToolUsageStats {
  toolName: string;
  totalCalls: number;
  successCount: number;
  errorCount: number;
  averageDurationMs: number;
  lastCalled: string;
  peakHour?: string;
}

export interface TelemetryReport {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  totalEvents: number;
  uniqueTools: number;
  toolStats: ToolUsageStats[];
  topErrors: Array<{ tool: string; error: string; count: number }>;
  usageByHour: Record<string, number>;
  recommendation?: string;
}

export class ToolUsageTelemetry {
  private readonly telemetryPath: string;
  private events: ToolUsageEvent[] = [];
  private initialized = false;

  constructor(repoPath?: string) {
    const basePath = repoPath || process.cwd();
    this.telemetryPath = path.join(basePath, '.evolith', 'telemetry', 'tool-usage.jsonl');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const dir = path.dirname(this.telemetryPath);
    await fs.ensureDir(dir);

    if (await fs.pathExists(this.telemetryPath)) {
      const content = await fs.readFile(this.telemetryPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      this.events = lines.map(l => {
        try {
          return JSON.parse(l) as ToolUsageEvent;
        } catch {
          return null;
        }
      }).filter(Boolean) as ToolUsageEvent[];
    }

    this.initialized = true;
  }

  async recordEvent(event: Omit<ToolUsageEvent, 'timestamp'>): Promise<void> {
    await this.initialize();

    const fullEvent: ToolUsageEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.events.push(fullEvent);

    await fs.appendFile(this.telemetryPath, JSON.stringify(fullEvent) + '\n');
  }

  async getStats(periodDays = 7): Promise<ToolUsageStats[]> {
    await this.initialize();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);

    const recentEvents = this.events.filter(e => new Date(e.timestamp) >= cutoff);

    const toolMap = new Map<string, ToolUsageEvent[]>();
    for (const event of recentEvents) {
      const list = toolMap.get(event.toolName) || [];
      list.push(event);
      toolMap.set(event.toolName, list);
    }

    const stats: ToolUsageStats[] = [];
    for (const [toolName, events] of toolMap) {
      const durations = events.map(e => e.durationMs);
      const hourCounts: Record<string, number> = {};

      for (const event of events) {
        const hour = new Date(event.timestamp).getHours().toString().padStart(2, '0') + ':00';
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }

      let peakHour = '';
      let peakCount = 0;
      for (const [hour, count] of Object.entries(hourCounts)) {
        if (count > peakCount) {
          peakHour = hour;
          peakCount = count;
        }
      }

      stats.push({
        toolName,
        totalCalls: events.length,
        successCount: events.filter(e => e.success).length,
        errorCount: events.filter(e => !e.success).length,
        averageDurationMs: durations.reduce((a, b) => a + b, 0) / durations.length,
        lastCalled: events.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0].timestamp,
        peakHour: peakHour || undefined,
      });
    }

    return stats.sort((a, b) => b.totalCalls - a.totalCalls);
  }

  async generateReport(periodDays = 7): Promise<TelemetryReport> {
    await this.initialize();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);

    const recentEvents = this.events.filter(e => new Date(e.timestamp) >= cutoff);
    const periodEnd = recentEvents.length > 0
      ? recentEvents.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0].timestamp
      : new Date().toISOString();

    const stats = await this.getStats(periodDays);

    const errorMap = new Map<string, number>();
    for (const event of recentEvents) {
      if (!event.success && event.errorMessage) {
        const key = `${event.toolName}:${event.errorMessage.substring(0, 50)}`;
        errorMap.set(key, (errorMap.get(key) || 0) + 1);
      }
    }

    const topErrors: Array<{ tool: string; error: string; count: number }> = [];
    for (const [key, count] of errorMap) {
      const [tool, error] = key.split(':');
      topErrors.push({ tool, error, count });
    }
    topErrors.sort((a, b) => b.count - a.count);

    const usageByHour: Record<string, number> = {};
    for (const event of recentEvents) {
      const hour = new Date(event.timestamp).toISOString().substring(0, 13) + ':00';
      usageByHour[hour] = (usageByHour[hour] || 0) + 1;
    }

    let recommendation: string | undefined;
    if (stats.length > 0) {
      const lowUsageTool = stats.find(s => s.totalCalls < 3);
      if (lowUsageTool) {
        recommendation = `Tool '${lowUsageTool.toolName}' has low usage. Consider adding training or documentation.`;
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      periodStart: cutoff.toISOString(),
      periodEnd,
      totalEvents: recentEvents.length,
      uniqueTools: stats.length,
      toolStats: stats,
      topErrors: topErrors.slice(0, 5),
      usageByHour,
      recommendation,
    };
  }

  async exportCsv(): Promise<string> {
    const stats = await this.getStats();
    const headers = ['Tool', 'Total Calls', 'Success', 'Errors', 'Avg Duration (ms)', 'Last Called', 'Peak Hour'];
    const rows = stats.map(s => [
      s.toolName,
      s.totalCalls.toString(),
      s.successCount.toString(),
      s.errorCount.toString(),
      Math.round(s.averageDurationMs).toString(),
      s.lastCalled,
      s.peakHour || 'N/A',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  async clear(): Promise<void> {
    if (await fs.pathExists(this.telemetryPath)) {
      await fs.remove(this.telemetryPath);
    }
    this.events = [];
  }
}