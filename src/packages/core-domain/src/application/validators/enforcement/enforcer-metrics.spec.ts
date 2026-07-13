/**
 * Enforcer OTel metrics layer (GT-519 · EAG-14 — AC3).
 *
 * Proves: (1) the in-memory recorder captures duration/failure/timeout/violationCount
 * across pass/fail/skip/timeout paths; (2) {@link NoopEnforcerMetrics} is a true no-op
 * and the default, so wiring metrics never changes evaluation behaviour; and
 * (3) {@link isTimeoutError} classifies timeout-shaped throws.
 */

import type { EnforceDescriptor, NormalizedRule } from '../../../domain/models/normalized-rule';
import { makeViolation, type Violation } from '../../../domain/violation';
import type { WorkspaceEvaluationContext } from '../evaluators/evaluator.interface';
import { EnforcerEvaluator } from './enforcer-evaluator';
import type { EnforcerRuntime, IEnforcerAdapter } from './enforcer.types';
import {
  ENFORCER_METRICS,
  isTimeoutError,
  monotonicNow,
  NoopEnforcerMetrics,
  RecordingEnforcerMetrics,
} from './enforcer-metrics';

const ctx: WorkspaceEvaluationContext = { satellitePath: '/w', corePath: '/c' };
const enforce: EnforceDescriptor = { engine: 'enforcer', tool: 'dependency-cruiser', toolRuleId: 'no-circular' };

function rule(id: string, e: EnforceDescriptor = enforce): NormalizedRule {
  return { id, severity: 'MUST', category: 'arch', title: id, description: '', blocking: true, sourceFile: 'x.json', enforce: e };
}

/** A minimal adapter whose behaviour the test controls. */
function adapter(
  behaviour: () => Promise<Violation[]>,
  tool = 'dependency-cruiser',
  runtime: EnforcerRuntime = 'node',
): IEnforcerAdapter {
  return { tool, runtime, analyze: behaviour };
}

const circularViolation = (): Violation =>
  makeViolation({ ruleId: 'no-circular', tool: 'dependency-cruiser', file: 'src/a.ts', line: 3, severity: 'error', message: 'cycle a→b→a' });

/** Deterministic clock: returns each seeded value once, then holds the last. */
function fakeClock(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('enforcer-metrics — catalogue + primitives (GT-519 AC3)', () => {
  it('exposes an OTel-shaped instrument catalogue with names, kinds and units', () => {
    expect(ENFORCER_METRICS.duration).toMatchObject({ name: 'enforcer.run.duration', kind: 'histogram', unit: 'ms' });
    expect(ENFORCER_METRICS.failures).toMatchObject({ name: 'enforcer.run.failures', kind: 'counter', unit: '{failure}' });
    expect(ENFORCER_METRICS.timeouts).toMatchObject({ name: 'enforcer.run.timeouts', kind: 'counter', unit: '{timeout}' });
    expect(ENFORCER_METRICS.violations).toMatchObject({ name: 'enforcer.run.violations', kind: 'counter', unit: '{violation}' });
  });

  it('monotonicNow is a non-decreasing millisecond clock', () => {
    const a = monotonicNow();
    const b = monotonicNow();
    expect(typeof a).toBe('number');
    expect(b).toBeGreaterThanOrEqual(a);
  });

  describe('isTimeoutError', () => {
    it('recognises an error object carrying a truthy timedOut flag', () => {
      expect(isTimeoutError(Object.assign(new Error('boom'), { timedOut: true }))).toBe(true);
      expect(isTimeoutError({ timedOut: true })).toBe(true);
    });
    it('recognises a timeout-worded Error message', () => {
      expect(isTimeoutError(new Error('depcruise timed out after 30000ms'))).toBe(true);
      expect(isTimeoutError(new Error('operation TIMEOUT'))).toBe(true);
    });
    it('does NOT classify a generic failure as a timeout', () => {
      expect(isTimeoutError(new Error('bad json'))).toBe(false);
      expect(isTimeoutError('nope')).toBe(false);
      expect(isTimeoutError(null)).toBe(false);
      expect(isTimeoutError({ timedOut: false })).toBe(false);
    });
  });
});

describe('NoopEnforcerMetrics — a true no-op', () => {
  it('every method is a silent no-op returning undefined', () => {
    expect(NoopEnforcerMetrics.recordDuration({ tool: 't', durationMs: 1, outcome: 'ok' })).toBeUndefined();
    expect(NoopEnforcerMetrics.recordFailure({ tool: 't', reason: 'adapter-error' })).toBeUndefined();
    expect(NoopEnforcerMetrics.recordTimeout({ tool: 't' })).toBeUndefined();
    expect(NoopEnforcerMetrics.recordViolations({ tool: 't', count: 3 })).toBeUndefined();
  });

  it('is frozen (a shared immutable singleton)', () => {
    expect(Object.isFrozen(NoopEnforcerMetrics)).toBe(true);
  });
});

describe('RecordingEnforcerMetrics — in-memory recorder', () => {
  it('captures every sample kind and exposes aggregates + reset', () => {
    const m = new RecordingEnforcerMetrics();
    m.recordDuration({ tool: 'dep', runtime: 'node', durationMs: 12, outcome: 'ok' });
    m.recordViolations({ tool: 'dep', count: 2 });
    m.recordViolations({ tool: 'dep', count: 5 });
    m.recordFailure({ tool: 'dep', reason: 'adapter-error' });
    m.recordTimeout({ tool: 'dep' });

    expect(m.durations).toHaveLength(1);
    expect(m.totalViolations).toBe(7);
    expect(m.failureCount).toBe(1);
    expect(m.timeoutCount).toBe(1);

    m.reset();
    expect(m.durations).toHaveLength(0);
    expect(m.violations).toHaveLength(0);
    expect(m.totalViolations).toBe(0);
    expect(m.failureCount).toBe(0);
    expect(m.timeoutCount).toBe(0);
  });
});

describe('EnforcerEvaluator observability wiring (GT-519 AC3)', () => {
  it('PASS path: records an ok duration and a zero-count violations sample, no failures/timeouts', async () => {
    const m = new RecordingEnforcerMetrics();
    const ev = new EnforcerEvaluator([adapter(async () => [])], m, fakeClock(100, 142));

    const [res] = await ev.evaluateAll([rule('HXA-01')], ctx);

    expect(res.result).toBe('passed');
    expect(m.durations).toEqual([{ tool: 'dependency-cruiser', runtime: 'node', durationMs: 42, outcome: 'ok' }]);
    expect(m.violations).toEqual([{ tool: 'dependency-cruiser', runtime: 'node', count: 0 }]);
    expect(m.failureCount).toBe(0);
    expect(m.timeoutCount).toBe(0);
  });

  it('FAIL path: records an ok duration and the returned violationCount', async () => {
    const m = new RecordingEnforcerMetrics();
    const ev = new EnforcerEvaluator([adapter(async () => [circularViolation()])], m, fakeClock(0, 10));

    const [res] = await ev.evaluateAll([rule('HXA-01')], ctx);

    expect(res.result).toBe('failed');
    expect(m.durations[0]).toMatchObject({ outcome: 'ok', durationMs: 10 });
    expect(m.totalViolations).toBe(1);
    expect(m.failureCount).toBe(0);
    expect(m.timeoutCount).toBe(0);
  });

  it('SKIP path (no adapter registered): records a no-adapter failure, no duration', async () => {
    const m = new RecordingEnforcerMetrics();
    const ev = new EnforcerEvaluator([], m);

    const [res] = await ev.evaluateAll([rule('HXA-01')], ctx);

    expect(res.result).toBe('skipped');
    expect(m.durations).toHaveLength(0);
    expect(m.failures).toEqual([{ tool: 'dependency-cruiser', reason: 'no-adapter' }]);
    expect(m.timeoutCount).toBe(0);
  });

  it('ERROR path (adapter throws a generic error): records an error duration + adapter-error failure, no timeout', async () => {
    const m = new RecordingEnforcerMetrics();
    const throwing = adapter(async () => {
      throw new Error('bad json');
    });
    const ev = new EnforcerEvaluator([throwing], m, fakeClock(5, 25));

    const [res] = await ev.evaluateAll([rule('HXA-01')], ctx);

    expect(res.result).toBe('skipped');
    expect(m.durations).toEqual([{ tool: 'dependency-cruiser', runtime: 'node', durationMs: 20, outcome: 'error' }]);
    expect(m.failures).toEqual([{ tool: 'dependency-cruiser', runtime: 'node', reason: 'adapter-error' }]);
    expect(m.timeoutCount).toBe(0);
  });

  it('TIMEOUT path (adapter throws timeout-shaped error): records failure(reason=timeout) AND a timeout', async () => {
    const m = new RecordingEnforcerMetrics();
    const timingOut = adapter(async () => {
      throw Object.assign(new Error('depcruise timed out'), { timedOut: true });
    });
    const ev = new EnforcerEvaluator([timingOut], m, fakeClock(0, 30000));

    const [res] = await ev.evaluateAll([rule('HXA-01')], ctx);

    expect(res.result).toBe('skipped');
    expect(m.durations).toEqual([{ tool: 'dependency-cruiser', runtime: 'node', durationMs: 30000, outcome: 'error' }]);
    expect(m.failures).toEqual([{ tool: 'dependency-cruiser', runtime: 'node', reason: 'timeout' }]);
    expect(m.timeouts).toEqual([{ tool: 'dependency-cruiser', runtime: 'node' }]);
  });

  it('defaults to NoopEnforcerMetrics: identical results whether or not a meter is wired', async () => {
    const rules = [rule('HXA-01'), rule('HXA-02')];
    const build = () => new EnforcerEvaluator([adapter(async () => [circularViolation()])]);

    const withoutMeter = await build().evaluateAll(rules, ctx);
    const withMeter = await new EnforcerEvaluator([adapter(async () => [circularViolation()])], new RecordingEnforcerMetrics()).evaluateAll(rules, ctx);

    expect(withMeter.map((r) => ({ id: r.rule.id, result: r.result }))).toEqual(
      withoutMeter.map((r) => ({ id: r.rule.id, result: r.result })),
    );
  });
});
