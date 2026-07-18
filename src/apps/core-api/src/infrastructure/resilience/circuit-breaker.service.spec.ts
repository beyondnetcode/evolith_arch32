import { CircuitBreakerService } from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService();
  });

  it('should create a circuit breaker', () => {
    const breaker = service.createBreaker('test', async () => 'result');
    expect(breaker).toBeDefined();
  });

  it('should execute function through circuit breaker', async () => {
    const breaker = service.createBreaker('test', async () => 'success');
    const result = await breaker.fire();
    expect(result).toBe('success');
  });

  it('should use fallback when function fails', async () => {
    const breaker = service.createBreaker(
      'fallback-test',
      async () => { throw new Error('fail'); },
      async () => 'fallback-result'
    );
    const result = await breaker.fire();
    expect(result).toBe('fallback-result');
  });

  it('should report circuit breaker stats', () => {
    service.createBreaker('stats-test', async () => 'ok');
    const stats = service.getStats();
    expect(stats.length).toBeGreaterThan(0);
    expect(stats[0].name).toBe('stats-test');
    expect(stats[0].state).toBeDefined();
  });
});

/**
 * GT-443 — circuit-breaker state-machine integration tests.
 *
 * The suite above only exercises single fire/fallback/stats calls; it never
 * drives the breaker through its lifecycle. These tests trip the breaker under
 * failure load and assert every transition of the resilience state machine
 * (CLOSED → OPEN → HALF_OPEN → {CLOSED | OPEN}), including fail-fast while OPEN
 * and the `resetTimeout` half-open window (advanced with fake timers so the
 * 30 s reset does not stall the suite). Faithful to the SERVICE-configured
 * breaker (errorThresholdPercentage 50, resetTimeout 30000).
 */
describe('CircuitBreakerService — resilience state machine (GT-443)', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const alwaysFails = async () => {
    throw new Error('downstream unavailable');
  };

  /** Fire until the breaker opens (or we exhaust the budget), swallowing rejections. */
  const tripOpen = async (breaker: { fire: () => Promise<unknown>; opened: boolean }, budget = 20) => {
    for (let i = 0; i < budget && !breaker.opened; i++) {
      await breaker.fire().catch(() => undefined);
    }
  };

  it('starts CLOSED and trips to OPEN once failures cross the error threshold', async () => {
    const breaker = service.createBreaker('trip', alwaysFails);
    expect(breaker.closed).toBe(true);

    await tripOpen(breaker);

    expect(breaker.opened).toBe(true);
    expect(service.getStats().find((s) => s.name === 'trip')?.state).toBe('open');
  });

  it('fails fast while OPEN — rejects without invoking the wrapped fn', async () => {
    let invocations = 0;
    const breaker = service.createBreaker('fail-fast', async () => {
      invocations += 1;
      throw new Error('downstream unavailable');
    });

    await tripOpen(breaker);
    expect(breaker.opened).toBe(true);

    const invocationsWhenOpen = invocations;
    await expect(breaker.fire()).rejects.toThrow(); // EOPENBREAKER, no fn call
    expect(invocations).toBe(invocationsWhenOpen);
    expect(service.getStats().find((s) => s.name === 'fail-fast')?.rejects).toBeGreaterThan(0);
  });

  it('transitions OPEN → HALF_OPEN after the resetTimeout elapses', async () => {
    jest.useFakeTimers();
    const breaker = service.createBreaker('reset', alwaysFails);

    await tripOpen(breaker);
    expect(breaker.opened).toBe(true);

    jest.advanceTimersByTime(30000);

    expect(breaker.halfOpen).toBe(true);
    expect(service.getStats().find((s) => s.name === 'reset')?.state).toBe('halfOpen');
  });

  it('HALF_OPEN → CLOSED when the trial call succeeds (recovery)', async () => {
    jest.useFakeTimers();
    let downstreamHealthy = false;
    const breaker = service.createBreaker('recover', async () => {
      if (!downstreamHealthy) throw new Error('downstream unavailable');
      return 'ok';
    });

    await tripOpen(breaker);
    expect(breaker.opened).toBe(true);

    jest.advanceTimersByTime(30000);
    expect(breaker.halfOpen).toBe(true);

    downstreamHealthy = true;
    await expect(breaker.fire()).resolves.toBe('ok');
    expect(breaker.closed).toBe(true);
  });

  it('HALF_OPEN → OPEN again when the trial call still fails', async () => {
    jest.useFakeTimers();
    const breaker = service.createBreaker('still-down', alwaysFails);

    await tripOpen(breaker);
    expect(breaker.opened).toBe(true);

    jest.advanceTimersByTime(30000);
    expect(breaker.halfOpen).toBe(true);

    await breaker.fire().catch(() => undefined);
    expect(breaker.opened).toBe(true);
  });
});
