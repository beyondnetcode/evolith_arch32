/**
 * GT-443 — circuit-breaker INTEGRATION tests against a real failing dependency.
 *
 * Not a unit test of the state machine: every case boots a real `node:http`
 * server, drives it through the real `HttpCoreEvaluationAdapter` over real
 * `fetch`, and counts the requests the dependency actually receives. The
 * dependency is the Core API stand-in — the runtime's one MANDATORY outbound
 * call (`AGENT_RUNTIME_CORE_ENDPOINT`, GT-384/GT-438).
 *
 * Each transition case carries its own CONTROL run with `breaker: undefined`,
 * asserting the opposite outcome. That is what makes these tests "fail without
 * the breaker": delete the wiring and the control assertions become the
 * protected assertions, and the suite goes red.
 */

import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { CircuitBreaker, CircuitOpenError, CircuitTimeoutError } from './circuit-breaker';
import { HttpCoreEvaluationAdapter } from '../core/http-core-evaluation.adapter';
import type { EvaluationContext } from '../../domain/ports/core-evaluation.port';

jest.setTimeout(20_000);

const ctx = () => ({ correlationId: 'gt-443' } as unknown as EvaluationContext);

/** A controllable Core stand-in: healthy, failing, or hanging — and it counts. */
class FakeCoreDependency {
  mode: 'healthy' | 'failing' | 'hanging' = 'healthy';
  requests = 0;
  private server!: http.Server;
  private readonly open = new Set<http.ServerResponse>();

  async start(): Promise<void> {
    this.server = http.createServer((_req, res) => {
      this.requests += 1;
      if (this.mode === 'hanging') {
        // Accept the request and never answer — the failure mode an unbounded
        // fetch cannot escape (undici's default header timeout is 300 s).
        this.open.add(res);
        return;
      }
      if (this.mode === 'failing') {
        res.writeHead(503).end('dependency down');
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: { overallVerdict: 'PASS' } }));
    });
    await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
  }

  get url(): string {
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}/api/v1/evaluate`;
  }

  async stop(): Promise<void> {
    for (const res of this.open) res.destroy();
    this.open.clear();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

/** Swallow the rejection and hand back the error, so cases read linearly. */
const attempt = async (fn: () => Promise<unknown>): Promise<unknown> => {
  try {
    await fn();
    return null;
  } catch (err) {
    return err;
  }
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('CircuitBreaker against a real failing dependency (GT-443)', () => {
  let dep: FakeCoreDependency;

  beforeEach(async () => {
    dep = new FakeCoreDependency();
    await dep.start();
  });

  afterEach(async () => {
    await dep.stop();
  });

  it('CLOSED → OPEN: stops calling the dependency after the failure threshold', async () => {
    dep.mode = 'failing';
    const breaker = new CircuitBreaker({ name: 'core', failureThreshold: 3, resetTimeoutMs: 60_000 });
    const protectedAdapter = new HttpCoreEvaluationAdapter({ endpoint: dep.url, breaker });

    for (let i = 0; i < 3; i++) {
      expect(await attempt(() => protectedAdapter.evaluate(ctx()))).toBeInstanceOf(Error);
    }
    expect(breaker.currentState()).toBe('open');
    const requestsAtTrip = dep.requests;
    expect(requestsAtTrip).toBe(3);

    // Ten more calls while open: rejected locally, dependency untouched.
    for (let i = 0; i < 10; i++) {
      expect(await attempt(() => protectedAdapter.evaluate(ctx()))).toBeInstanceOf(CircuitOpenError);
    }
    expect(dep.requests).toBe(requestsAtTrip);

    // CONTROL — the same 13 calls with no breaker all reach the failing
    // dependency. This is the assertion that fails if the breaker is removed.
    dep.requests = 0;
    const unprotected = new HttpCoreEvaluationAdapter({ endpoint: dep.url });
    for (let i = 0; i < 13; i++) {
      expect(await attempt(() => unprotected.evaluate(ctx()))).toBeInstanceOf(Error);
    }
    expect(dep.requests).toBe(13);
  });

  it('OPEN → HALF-OPEN → CLOSED: one trial call is admitted after the cooldown, and recovery closes it', async () => {
    dep.mode = 'failing';
    const breaker = new CircuitBreaker({ name: 'core', failureThreshold: 2, resetTimeoutMs: 250 });
    const adapter = new HttpCoreEvaluationAdapter({ endpoint: dep.url, breaker });

    await attempt(() => adapter.evaluate(ctx()));
    await attempt(() => adapter.evaluate(ctx()));
    expect(breaker.currentState()).toBe('open');
    expect(await attempt(() => adapter.evaluate(ctx()))).toBeInstanceOf(CircuitOpenError);

    await sleep(300); // cooldown elapses
    expect(breaker.currentState()).toBe('half-open');

    dep.mode = 'healthy'; // the dependency recovers
    const requestsBeforeProbe = dep.requests;
    const result = await adapter.evaluate(ctx()); // the single trial call
    expect(result).toMatchObject({ overallVerdict: 'PASS' });
    expect(dep.requests).toBe(requestsBeforeProbe + 1);
    expect(breaker.currentState()).toBe('closed');

    // Closed again: traffic flows normally.
    await adapter.evaluate(ctx());
    expect(dep.requests).toBe(requestsBeforeProbe + 2);
    expect(breaker.stats()).toMatchObject({ state: 'closed', opens: 1, rejected: 1 });
  });

  it('HALF-OPEN → OPEN: a failed trial call re-opens and restarts the cooldown', async () => {
    dep.mode = 'failing';
    const breaker = new CircuitBreaker({ name: 'core', failureThreshold: 2, resetTimeoutMs: 200 });
    const adapter = new HttpCoreEvaluationAdapter({ endpoint: dep.url, breaker });

    await attempt(() => adapter.evaluate(ctx()));
    await attempt(() => adapter.evaluate(ctx()));
    expect(breaker.currentState()).toBe('open');

    await sleep(250);
    expect(breaker.currentState()).toBe('half-open');

    const requestsBeforeProbe = dep.requests;
    expect(await attempt(() => adapter.evaluate(ctx()))).toBeInstanceOf(Error); // trial fails
    expect(dep.requests).toBe(requestsBeforeProbe + 1); // exactly ONE probe got through
    expect(breaker.currentState()).toBe('open');

    // Cooldown restarted: the very next call is rejected without a request.
    const requestsAfterProbe = dep.requests;
    expect(await attempt(() => adapter.evaluate(ctx()))).toBeInstanceOf(CircuitOpenError);
    expect(dep.requests).toBe(requestsAfterProbe);
    expect(breaker.stats().opens).toBe(2);
  });

  it('bounds a HANGING dependency — and without the breaker the same call is still pending', async () => {
    dep.mode = 'hanging';
    const breaker = new CircuitBreaker({ name: 'core', failureThreshold: 5, timeoutMs: 300 });
    const protectedAdapter = new HttpCoreEvaluationAdapter({ endpoint: dep.url, breaker });

    const started = Date.now();
    const err = await attempt(() => protectedAdapter.evaluate(ctx()));
    const elapsed = Date.now() - started;
    expect(err).toBeInstanceOf(CircuitTimeoutError);
    expect(elapsed).toBeLessThan(2_000); // bounded, and nowhere near undici's 300 s
    expect(breaker.stats().timeouts).toBe(1);

    // CONTROL — no breaker: after 3× the same budget the call has not settled.
    const unprotected = new HttpCoreEvaluationAdapter({ endpoint: dep.url });
    let settled = false;
    const pending = unprotected.evaluate(ctx()).then(
      () => { settled = true; },
      () => { settled = true; },
    );
    await sleep(900);
    expect(settled).toBe(false);

    // Release it so the run does not leak a socket.
    await dep.stop();
    await pending.catch(() => undefined);
    await dep.start();
  });

  it('bounds a callee that IGNORES the abort signal (the timeout is not advisory)', async () => {
    const breaker = new CircuitBreaker({ name: 'uncooperative', failureThreshold: 5, timeoutMs: 200 });
    let released: (() => void) | undefined;
    const neverSettles = new Promise<void>((resolve) => {
      released = resolve;
    });

    const started = Date.now();
    const err = await attempt(() => breaker.execute(() => neverSettles)); // signal dropped on the floor
    expect(err).toBeInstanceOf(CircuitTimeoutError);
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(breaker.stats()).toMatchObject({ timeouts: 1, failures: 1 });
    released?.();
  });
});
