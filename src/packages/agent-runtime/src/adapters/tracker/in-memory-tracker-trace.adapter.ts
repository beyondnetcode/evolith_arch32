/**
 * InMemoryTrackerTraceAdapter — default {@link ITrackerTracePort}. Collects
 * events in memory so tests/CLI can assert on trazability without a live
 * Tracker. The HTTP adapter (sibling file) is the production-facing variant.
 */

import type { ITrackerTracePort } from '../../domain/ports/tracker-trace.port';
import type { TraceEvent } from '../../domain/contracts/trace';

export class InMemoryTrackerTraceAdapter implements ITrackerTracePort {
  readonly events: TraceEvent[] = [];

  async publish(event: TraceEvent): Promise<void> {
    this.events.push(event);
  }

  async publishMany(events: readonly TraceEvent[]): Promise<void> {
    this.events.push(...events);
  }

  /** Convenience for tests: events of a given type. */
  byType(type: TraceEvent['type']): TraceEvent[] {
    return this.events.filter((e) => e.type === type);
  }
}
