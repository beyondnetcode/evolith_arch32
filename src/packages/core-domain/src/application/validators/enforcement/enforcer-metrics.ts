/**
 * Enforcer OTel metrics layer (GT-519 · EAG-14 — AC3).
 *
 * A thin observability PORT the host wires to a real OpenTelemetry `Meter`, so the
 * {@link EnforcerEvaluator} can emit per-run telemetry WITHOUT core-domain taking a
 * hard dependency on the OTel SDK. Core ships two in-repo implementations:
 *  - {@link NoopEnforcerMetrics}      — the zero-cost default (a true no-op).
 *  - {@link RecordingEnforcerMetrics} — an in-memory recorder for tests + inspection.
 *
 * The port is modelled on OTel instrument shapes (a duration histogram plus three
 * monotonic counters), documented by {@link ENFORCER_METRICS}. A host adapter maps
 * each `record*` call onto `histogram.record(...)` / `counter.add(...)` with the
 * sample's attributes, using the names, units and kinds below verbatim.
 *
 * Metric catalogue (OTel semantic shape):
 *  | name                     | kind       | unit          | attributes         | meaning                              |
 *  |--------------------------|------------|---------------|--------------------|--------------------------------------|
 *  | `enforcer.run.duration`  | histogram  | `ms`          | tool, runtime?, outcome | wall-clock of one `adapter.analyze` |
 *  | `enforcer.run.failures`  | counter    | `{failure}`   | tool, runtime?, reason  | a run that produced no usable result |
 *  | `enforcer.run.timeouts`  | counter    | `{timeout}`   | tool, runtime?          | a run that exceeded its time budget  |
 *  | `enforcer.run.violations`| counter    | `{violation}` | tool, runtime?          | violations returned by a run (Σ)     |
 *
 * A timed-out run is ALSO a failed run: the evaluator records both `failures`
 * (reason `timeout`) and `timeouts`, so a host can compute failure-rate and
 * timeout-rate independently off the two counters.
 */

import { performance } from 'node:perf_hooks';

/** Monotonic millisecond clock used to bound `adapter.analyze` durations. */
export function monotonicNow(): number {
  return performance.now();
}

// ---------------------------------------------------------------------------
// Metric catalogue (OTel-shaped, SDK-free)
// ---------------------------------------------------------------------------

/** Outcome tag on the duration histogram: did the run complete or throw? */
export type EnforcerRunOutcome = 'ok' | 'error';

/** Why a run failed to produce a usable result. */
export type EnforcerFailureReason =
  /** The adapter threw (tool crash, unparseable output, …). */
  | 'adapter-error'
  /** The adapter threw and the error was timeout-shaped (see {@link isTimeoutError}). */
  | 'timeout'
  /** No adapter was registered for the rule's tool — the run never started. */
  | 'no-adapter';

/** Instrument descriptor a host uses to create the matching OTel instrument. */
export interface EnforcerMetricDescriptor {
  readonly name: string;
  readonly kind: 'histogram' | 'counter';
  readonly unit: string;
  readonly description: string;
}

/** The canonical instrument set. Host wiring MUST use these names/units verbatim. */
export const ENFORCER_METRICS = {
  duration: {
    name: 'enforcer.run.duration',
    kind: 'histogram',
    unit: 'ms',
    description: 'Wall-clock duration of a single enforcer adapter run.',
  },
  failures: {
    name: 'enforcer.run.failures',
    kind: 'counter',
    unit: '{failure}',
    description: 'Enforcer runs that produced no usable result (error, timeout or missing adapter).',
  },
  timeouts: {
    name: 'enforcer.run.timeouts',
    kind: 'counter',
    unit: '{timeout}',
    description: 'Enforcer runs that exceeded their time budget.',
  },
  violations: {
    name: 'enforcer.run.violations',
    kind: 'counter',
    unit: '{violation}',
    description: 'Number of violations returned by an enforcer run.',
  },
} as const satisfies Record<string, EnforcerMetricDescriptor>;

// ---------------------------------------------------------------------------
// Sample shapes (become OTel attributes)
// ---------------------------------------------------------------------------

/** Attributes shared by every enforcer sample. */
export interface EnforcerRunAttributes {
  /** The enforcer tool (e.g. `dependency-cruiser`). Maps to attribute `tool`. */
  readonly tool: string;
  /** The tool's runtime ecosystem, when known. Maps to attribute `runtime`. */
  readonly runtime?: string;
}

export interface EnforcerDurationSample extends EnforcerRunAttributes {
  /** Elapsed milliseconds around `adapter.analyze`. */
  readonly durationMs: number;
  readonly outcome: EnforcerRunOutcome;
}

export interface EnforcerFailureSample extends EnforcerRunAttributes {
  readonly reason: EnforcerFailureReason;
}

export type EnforcerTimeoutSample = EnforcerRunAttributes;

export interface EnforcerViolationSample extends EnforcerRunAttributes {
  /** Violations returned by the run (frozen included; 0 is recorded too). */
  readonly count: number;
}

// ---------------------------------------------------------------------------
// The port
// ---------------------------------------------------------------------------

/**
 * Observability port for enforcer runs. A host implements it over an OTel `Meter`;
 * core-domain only ever depends on this interface.
 */
export interface IEnforcerMetrics {
  /** Record the `enforcer.run.duration` histogram for one `adapter.analyze`. */
  recordDuration(sample: EnforcerDurationSample): void;
  /** Increment the `enforcer.run.failures` counter. */
  recordFailure(sample: EnforcerFailureSample): void;
  /** Increment the `enforcer.run.timeouts` counter. */
  recordTimeout(sample: EnforcerTimeoutSample): void;
  /** Add `sample.count` to the `enforcer.run.violations` counter. */
  recordViolations(sample: EnforcerViolationSample): void;
}

// ---------------------------------------------------------------------------
// Noop (default) — a true no-op
// ---------------------------------------------------------------------------

/**
 * The zero-cost default. Every method is empty, so wiring metrics is opt-in and the
 * {@link EnforcerEvaluator} behaves identically when no host meter is supplied.
 */
export const NoopEnforcerMetrics: IEnforcerMetrics = Object.freeze({
  recordDuration(): void {
    /* no-op */
  },
  recordFailure(): void {
    /* no-op */
  },
  recordTimeout(): void {
    /* no-op */
  },
  recordViolations(): void {
    /* no-op */
  },
});

// ---------------------------------------------------------------------------
// In-memory recorder — for tests and inspection
// ---------------------------------------------------------------------------

/**
 * An in-memory {@link IEnforcerMetrics} that captures every sample. Useful in tests
 * (assert what the evaluator emitted) and for local inspection. Not for production
 * telemetry — a host wires a real OTel adapter instead.
 */
export class RecordingEnforcerMetrics implements IEnforcerMetrics {
  readonly durations: EnforcerDurationSample[] = [];
  readonly failures: EnforcerFailureSample[] = [];
  readonly timeouts: EnforcerTimeoutSample[] = [];
  readonly violations: EnforcerViolationSample[] = [];

  recordDuration(sample: EnforcerDurationSample): void {
    this.durations.push(sample);
  }

  recordFailure(sample: EnforcerFailureSample): void {
    this.failures.push(sample);
  }

  recordTimeout(sample: EnforcerTimeoutSample): void {
    this.timeouts.push(sample);
  }

  recordViolations(sample: EnforcerViolationSample): void {
    this.violations.push(sample);
  }

  // --- aggregates (read-side conveniences) ---

  /** Count of `enforcer.run.failures` increments. */
  get failureCount(): number {
    return this.failures.length;
  }

  /** Count of `enforcer.run.timeouts` increments. */
  get timeoutCount(): number {
    return this.timeouts.length;
  }

  /** Sum of violation counts across all recorded runs (the counter's total). */
  get totalViolations(): number {
    return this.violations.reduce((acc, s) => acc + s.count, 0);
  }

  /** Drop all captured samples. */
  reset(): void {
    this.durations.length = 0;
    this.failures.length = 0;
    this.timeouts.length = 0;
    this.violations.length = 0;
  }
}

// ---------------------------------------------------------------------------
// Timeout detection
// ---------------------------------------------------------------------------

const TIMEOUT_MESSAGE = /tim(?:e|ed)[\s_-]?out/i;

/**
 * Classify a thrown value as a timeout. The seam the sandboxed process runner
 * (GT-512) uses to signal that a run exceeded its budget: it either throws an error
 * carrying a truthy `timedOut` flag (mirroring {@link ProcessResult.timedOut}) or an
 * `Error` whose message reads as a timeout. Anything else is a generic failure.
 */
export function isTimeoutError(err: unknown): boolean {
  if (err != null && typeof err === 'object' && (err as { timedOut?: unknown }).timedOut === true) {
    return true;
  }
  return err instanceof Error && TIMEOUT_MESSAGE.test(err.message);
}
