/**
 * ITrackerTracePort — publishes trazability events to Evolith Tracker.
 *
 * Tracker normally owns tenant/product/initiative state, monitors and the
 * operational record. The runtime only EMITS append-only {@link TraceEvent}s;
 * it never reads or mutates Tracker-owned entities. Delivery is best-effort and
 * must not block the governed result (failures are surfaced as findings).
 */

import type { TraceEvent } from '../contracts/trace';

export interface ITrackerTracePort {
  publish(event: TraceEvent): Promise<void>;
  /** Optional batch publish; default implementations may loop over publish(). */
  publishMany?(events: readonly TraceEvent[]): Promise<void>;
}
