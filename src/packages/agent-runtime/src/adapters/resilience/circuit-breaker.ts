/**
 * CircuitBreaker — ADR-0011 §1/§2 applied where the runtime actually leaves the
 * process (GT-443).
 *
 * WHY HERE AND NOT IN core-api. GT-560 deleted the previous breaker because it
 * protected nothing: the Core is a stateless evaluation engine (ADR-0101) that
 * makes no outbound calls, and its only cache candidate never connected to
 * Redis. That verdict still stands for core-api. It does NOT cover the agent
 * runtime, which GT-560 explicitly left out of scope ("move the breaker to
 * where the real calls are"). The runtime's production profile MANDATES an
 * outbound HTTP call to the Core API (`runtime.factory.ts` throws without
 * `AGENT_RUNTIME_CORE_ENDPOINT`), and that call had no timeout, no retry and no
 * breaker — a hung Core stalls every governed request behind undici's 300 s
 * default header timeout, which is the exact failure ADR-0011 was written for.
 *
 * WHY NOT OPOSSUM. GT-560 removed `opossum` + `@types/opossum` from the tree.
 * This implementation is ~120 lines with no runtime dependency, keeps the
 * package's zero-transitive-dependency posture, and — unlike opossum — hands the
 * wrapped call an `AbortSignal` so a timeout actually CANCELS the in-flight
 * request instead of merely abandoning it.
 *
 * DEVIATION FROM ADR-0011, STATED PLAINLY: §1 mandates that breaker state live
 * in a shared Redis cluster so a trip propagates across nodes. This breaker is
 * PROCESS-LOCAL. Sharing the state would reintroduce the very Redis dependency
 * GT-560 removed, and each replica converges on its own within
 * `failureThreshold` calls. The gap between "each node trips independently" and
 * "the cluster trips at once" is real and is recorded here rather than papered
 * over.
 */

/** Breaker states, named as ADR-0011 §1 names them. */
export type CircuitState = 'closed' | 'open' | 'half-open';

/** Thrown INSTEAD of calling the dependency while the circuit is open. */
export class CircuitOpenError extends Error {
  readonly code = 'CIRCUIT_OPEN' as const;
  constructor(name: string, readonly retryAfterMs: number) {
    super(
      `[circuit:${name}] open — call rejected without touching the dependency; ` +
        `retry in ~${Math.max(0, Math.round(retryAfterMs))}ms`,
    );
    this.name = 'CircuitOpenError';
  }
}

/** Thrown when a call exceeds `timeoutMs`; the underlying call is aborted. */
export class CircuitTimeoutError extends Error {
  readonly code = 'CIRCUIT_TIMEOUT' as const;
  constructor(name: string, timeoutMs: number) {
    super(`[circuit:${name}] call exceeded ${timeoutMs}ms and was aborted`);
    this.name = 'CircuitTimeoutError';
  }
}

export interface CircuitBreakerOptions {
  /** Identifies the protected dependency in errors and stats. */
  readonly name: string;
  /** Consecutive failures that trip closed → open. Default 5. */
  readonly failureThreshold?: number;
  /** Cooldown before open → half-open admits a trial call. Default 30_000 ms. */
  readonly resetTimeoutMs?: number;
  /** Consecutive half-open successes that close the circuit. Default 1. */
  readonly successThreshold?: number;
  /** Per-call ceiling; the call is aborted past it. Default 10_000 ms. */
  readonly timeoutMs?: number;
  /** Injectable clock (tests drive transitions without real waiting). */
  readonly now?: () => number;
  /** Observability hook — fires on every state transition. */
  readonly onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
}

export interface CircuitBreakerStats {
  readonly name: string;
  readonly state: CircuitState;
  readonly failures: number;
  readonly successes: number;
  readonly rejected: number;
  readonly timeouts: number;
  readonly opens: number;
}

const DEFAULTS = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  successThreshold: 1,
  timeoutMs: 10_000,
} as const;

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private halfOpenSuccesses = 0;
  /** Guards half-open so exactly ONE trial call reaches the dependency. */
  private probeInFlight = false;
  private openedAt = 0;

  private totalFailures = 0;
  private totalSuccesses = 0;
  private totalRejected = 0;
  private totalTimeouts = 0;
  private totalOpens = 0;

  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly successThreshold: number;
  private readonly timeoutMs: number;
  private readonly now: () => number;
  private readonly onStateChange?: CircuitBreakerOptions['onStateChange'];

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? DEFAULTS.failureThreshold;
    this.resetTimeoutMs = options.resetTimeoutMs ?? DEFAULTS.resetTimeoutMs;
    this.successThreshold = options.successThreshold ?? DEFAULTS.successThreshold;
    this.timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs;
    this.now = options.now ?? Date.now;
    this.onStateChange = options.onStateChange;
  }

  /** Current state, after applying any due open → half-open cooldown. */
  currentState(): CircuitState {
    this.promoteIfCooledDown();
    return this.state;
  }

  stats(): CircuitBreakerStats {
    return {
      name: this.name,
      state: this.currentState(),
      failures: this.totalFailures,
      successes: this.totalSuccesses,
      rejected: this.totalRejected,
      timeouts: this.totalTimeouts,
      opens: this.totalOpens,
    };
  }

  /**
   * Run `fn` under the breaker. `fn` receives an `AbortSignal` that fires at
   * `timeoutMs`; a fetch-based caller MUST forward it, otherwise the timeout
   * frees the caller but leaks the socket.
   */
  async execute<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    this.promoteIfCooledDown();

    if (this.state === 'open' || (this.state === 'half-open' && this.probeInFlight)) {
      this.totalRejected += 1;
      throw new CircuitOpenError(this.name, this.openedAt + this.resetTimeoutMs - this.now());
    }

    const isProbe = this.state === 'half-open';
    if (isProbe) this.probeInFlight = true;

    const controller = new AbortController();
    let timedOut = false;
    let fire: () => void = () => undefined;

    // The deadline is enforced TWO ways on purpose: abort() cancels a
    // cooperative call (freeing the socket), and the race frees the CALLER even
    // when the wrapped function ignores its signal. Relying on abort alone would
    // mean an uncooperative callee still hangs the runtime forever — the exact
    // failure this breaker exists to prevent.
    const deadline = new Promise<never>((_resolve, reject) => {
      fire = () => {
        timedOut = true;
        controller.abort();
        reject(new CircuitTimeoutError(this.name, this.timeoutMs));
      };
    });
    const timer = setTimeout(() => fire(), this.timeoutMs);
    // Never hold the event loop open on the breaker's own timer.
    (timer as unknown as { unref?: () => void }).unref?.();

    try {
      const result = await Promise.race([fn(controller.signal), deadline]);
      this.onSuccess();
      return result;
    } catch (err) {
      if (timedOut) this.totalTimeouts += 1;
      this.onFailure();
      throw timedOut ? new CircuitTimeoutError(this.name, this.timeoutMs) : err;
    } finally {
      clearTimeout(timer);
      if (isProbe) this.probeInFlight = false;
    }
  }

  // ── transitions ──────────────────────────────────────────────────────────

  private promoteIfCooledDown(): void {
    if (this.state === 'open' && this.now() - this.openedAt >= this.resetTimeoutMs) {
      this.transition('half-open');
      this.halfOpenSuccesses = 0;
      this.probeInFlight = false;
    }
  }

  private onSuccess(): void {
    this.totalSuccesses += 1;
    if (this.state === 'half-open') {
      this.halfOpenSuccesses += 1;
      if (this.halfOpenSuccesses >= this.successThreshold) {
        this.consecutiveFailures = 0;
        this.transition('closed');
      }
      return;
    }
    this.consecutiveFailures = 0;
  }

  private onFailure(): void {
    this.totalFailures += 1;
    // A failed trial call re-opens immediately — the cooldown restarts and the
    // dependency gets no further traffic until it elapses again.
    if (this.state === 'half-open') {
      this.trip();
      return;
    }
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.trip();
    }
  }

  private trip(): void {
    this.openedAt = this.now();
    this.halfOpenSuccesses = 0;
    this.totalOpens += 1;
    this.transition('open');
  }

  private transition(to: CircuitState): void {
    if (this.state === to) return;
    const from = this.state;
    this.state = to;
    this.onStateChange?.(from, to, this.name);
  }
}
