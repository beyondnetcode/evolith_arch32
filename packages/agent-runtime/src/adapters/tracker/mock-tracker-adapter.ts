import type { ITrackerTracePort, TraceEvent } from '../../domain/ports/tracker-trace.port';

/**
 * GT-381: Mock Tracker adapter for development/testing.
 *
 * Simulates the Tracker's trace reception and GateDecision emission
 * without requiring a running Tracker instance. Stores events in
 * memory for assertion in tests.
 *
 * Production: swap for HttpTrackerTraceAdapter when Tracker is ready.
 * Design rule #5: the package works with this stub by default.
 */
export class MockTrackerTraceAdapter implements ITrackerTracePort {
  private readonly events: TraceEvent[] = [];

  async publish(event: TraceEvent): Promise<void> {
    this.events.push(event);
    // In production, this would POST to Tracker's trace API
  }

  /**
   * Returns all published events (for test assertions).
   */
  getPublishedEvents(): readonly TraceEvent[] {
    return [...this.events];
  }

  /**
   * Clears stored events (for test isolation).
   */
  clear(): void {
    this.events.length = 0;
  }
}
