import type { ITrackerTracePort } from '../../domain/ports/tracker-trace.port';
import type { TraceEvent } from '../../domain/contracts/trace';

/**
 * CompositeTrackerTraceAdapter — GT-420: Allows broadcasting trace events to
 * multiple tracker ports simultaneously (e.g. File for JSONL + OpenTelemetry for Grafana).
 */
export class CompositeTrackerTraceAdapter implements ITrackerTracePort {
  constructor(private readonly adapters: readonly ITrackerTracePort[]) {}

  async publish(event: TraceEvent): Promise<void> {
    const promises = this.adapters.map(adapter => adapter.publish(event));
    await Promise.allSettled(promises);
  }

  async publishMany(events: readonly TraceEvent[]): Promise<void> {
    const promises = this.adapters.map(async (adapter) => {
      if (adapter.publishMany) {
        return adapter.publishMany(events);
      }
      for (const event of events) {
        await adapter.publish(event);
      }
    });
    await Promise.allSettled(promises);
  }
}
