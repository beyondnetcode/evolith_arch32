import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type { NormalizedRule, EnforceDescriptor } from '../../../domain/models/normalized-rule';
import { makeViolation } from '../../../domain/violation';
import type { IRuleEvaluatorStrategy, RuleEvaluationResult, WorkspaceEvaluationContext } from '../evaluators/evaluator.interface';
import { CompositeRuleEvaluator } from './composite-rule-evaluator';
import { EnforcerEvaluator } from './enforcer-evaluator';
import {
  DEFAULT_ENFORCER_TIMEOUT_MS,
  ENFORCER_TIMEOUT_GRACE_MS,
  EnforcerTimeoutError,
  ShellEnforcerAdapter,
  resolveEnforcerTimeoutMs,
} from './shell-enforcer-adapter';
import {
  PROCESS_TIMEOUT_EXIT_CODE,
  StubProcessRunner,
  type IProcessRunner,
  type ProcessResult,
  type ProcessSpec,
} from './enforcer.types';

const ctx: WorkspaceEvaluationContext = { satellitePath: '/w', corePath: '/c' };

function rule(id: string, enforce?: EnforceDescriptor): NormalizedRule {
  return { id, severity: 'MUST', category: 'arch', title: id, description: '', blocking: true, sourceFile: 'x.json', enforce };
}

/** Records which rules it was asked to evaluate — proves the Composite's native default. */
class RecordingNative implements IRuleEvaluatorStrategy {
  received: NormalizedRule[] = [];
  async evaluateAll(rules: NormalizedRule[]): Promise<RuleEvaluationResult[]> {
    this.received.push(...rules);
    return rules.map((r) => ({ rule: r, result: 'passed' as const }));
  }
}

/** dependency-cruiser-shaped adapter: JSON stdout → canonical violations (frozen optional). */
function depCruiserAdapter(runner: StubProcessRunner) {
  return new ShellEnforcerAdapter(
    {
      tool: 'dependency-cruiser',
      runtime: 'node',
      buildSpec: (c) => ({ command: 'depcruise', args: ['-T', 'json', c.satellitePath] }),
      parse: (res: ProcessResult) =>
        (JSON.parse(res.stdout || '{"violations":[]}').violations as any[]).map((v) =>
          makeViolation({
            ruleId: v.rule, tool: 'dependency-cruiser', file: v.file, line: v.line,
            severity: 'error', message: v.message, frozen: v.frozen ?? false,
          }),
        ),
    },
    runner,
  );
}

function findUp(rel: string): string {
  let dir = __dirname;
  for (let i = 0; i < 9; i++) {
    const c = resolve(dir, rel);
    if (existsSync(c)) return c;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`not found: ${rel}`);
}

describe('ShellEnforcerAdapter (GT-514 AC2 — Violation[] via IProcessRunner)', () => {
  it('runs the tool through the injected runner and returns canonical violations', async () => {
    const runner = new StubProcessRunner({
      exitCode: 1,
      stdout: JSON.stringify({ violations: [{ rule: 'no-circular', file: 'src/a.ts', line: 3, message: 'cycle a→b→a' }] }),
      stderr: '',
    });
    const adapter = depCruiserAdapter(runner);
    const out = await adapter.analyze({ ...ctx, rules: [] });
    expect(adapter.tool).toBe('dependency-cruiser');
    expect(adapter.runtime).toBe('node');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ ruleId: 'no-circular', tool: 'dependency-cruiser', file: 'src/a.ts', severity: 'error' });
    expect(out[0].fingerprint).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('ShellEnforcerAdapter wall clock (GT-664 — a tool that ran out of time SKIPs)', () => {
  const enforce: EnforceDescriptor = { engine: 'enforcer', tool: 'dependency-cruiser', toolRuleId: 'no-circular' };

  /** An adapter whose parser would happily accept a truncated report. */
  function permissiveAdapter(runner: IProcessRunner, timeoutMs?: number): ShellEnforcerAdapter {
    return new ShellEnforcerAdapter(
      {
        tool: 'dependency-cruiser',
        runtime: 'node',
        timeoutMs,
        buildSpec: () => ({ command: 'depcruise', args: [] }),
        // The failure mode being guarded: an `isToolFailure` that asks "is this
        // a report?" answers YES for the prefix of one.
        isToolFailure: (res) => { try { JSON.parse(res.stdout); return false; } catch { return true; } },
        parse: () => [],
      },
      runner,
    );
  }

  it('reads a timed-out run as SKIPPED even when its partial output still parses', async () => {
    // The tool was killed mid-scan but had already flushed a syntactically valid
    // (and therefore shorter) report. Parsed as a completed run it would report
    // zero violations — a clean repository that was never fully looked at.
    const runner = new StubProcessRunner({
      exitCode: PROCESS_TIMEOUT_EXIT_CODE,
      stdout: '{"violations":[]}',
      stderr: '',
      timedOut: true,
    });
    const [res] = await new EnforcerEvaluator([permissiveAdapter(runner)]).evaluateAll(
      [rule('HXA-01', enforce)],
      ctx,
    );
    expect(res.result).toBe('skipped');
    expect(res.message).toMatch(/timed out/i);
  });

  it('treats the conventional 124 exit as a timeout even without the timedOut flag', async () => {
    const runner = new StubProcessRunner({ exitCode: PROCESS_TIMEOUT_EXIT_CODE, stdout: '{"violations":[]}', stderr: '' });
    const [res] = await new EnforcerEvaluator([permissiveAdapter(runner)]).evaluateAll(
      [rule('HXA-01', enforce)],
      ctx,
    );
    expect(res.result).toBe('skipped');
  });

  it('bounds a runner that ignores spec.timeoutMs and never settles', async () => {
    jest.useFakeTimers();
    try {
      const hanging: IProcessRunner = { run: () => new Promise<ProcessResult>(() => {}) };
      const analysis = permissiveAdapter(hanging, 1_000).analyze({ ...ctx, rules: [] });
      const assertion = expect(analysis).rejects.toBeInstanceOf(EnforcerTimeoutError);
      await jest.advanceTimersByTimeAsync(1_000 + ENFORCER_TIMEOUT_GRACE_MS + 1);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it('hands the resolved wall clock to the runner on the spec', async () => {
    let seen: ProcessSpec | undefined;
    const runner: IProcessRunner = {
      run: async (spec) => { seen = spec; return { exitCode: 0, stdout: '{}', stderr: '' }; },
    };
    await permissiveAdapter(runner, 7_000).analyze({ ...ctx, rules: [] });
    expect(seen?.timeoutMs).toBe(7_000);
  });

  describe('resolveEnforcerTimeoutMs precedence', () => {
    const withConfig = (config: Record<string, unknown>) =>
      ({ ...ctx, rules: [rule('HXA-01', { ...enforce, config })] });

    it('lets a rule override the adapter default via enforce.config.timeoutMs', () => {
      expect(resolveEnforcerTimeoutMs(withConfig({ timeoutMs: 4_000 }), 90_000)).toBe(4_000);
    });

    it('accepts the override as a string, because JSON config is hand-written', () => {
      expect(resolveEnforcerTimeoutMs(withConfig({ timeoutMs: '2500' }), 90_000)).toBe(2_500);
    });

    it('falls back to the adapter default, then to the package default', () => {
      expect(resolveEnforcerTimeoutMs({ ...ctx, rules: [] }, 90_000)).toBe(90_000);
      expect(resolveEnforcerTimeoutMs({ ...ctx, rules: [] })).toBe(DEFAULT_ENFORCER_TIMEOUT_MS);
    });

    it('ignores a zero/negative/garbage override instead of honouring it', () => {
      // `timeoutMs: 0` read literally means "no time at all", which would SKIP
      // every rule routed to the tool and be indistinguishable, in the report,
      // from an analyser nobody installed.
      for (const bad of [0, -1, 'soon', NaN]) {
        expect(resolveEnforcerTimeoutMs(withConfig({ timeoutMs: bad }), 90_000)).toBe(90_000);
      }
    });
  });
});

describe('CompositeRuleEvaluator (GT-514 AC1 — routing preserves the native default)', () => {
  const enforce: EnforceDescriptor = { engine: 'enforcer', tool: 'dependency-cruiser', toolRuleId: 'no-circular' };

  it('routes enforcer rules to adapters and leaves native rules on the native strategy', async () => {
    const runner = new StubProcessRunner({
      exitCode: 1,
      stdout: JSON.stringify({ violations: [{ rule: 'no-circular', file: 'src/a.ts', line: 3, message: 'cycle' }] }),
      stderr: '',
    });
    const native = new RecordingNative();
    const composite = new CompositeRuleEvaluator(native, new EnforcerEvaluator([depCruiserAdapter(runner)]));

    const results = await composite.evaluateAll([rule('GOV-001'), rule('HXA-01', enforce)], ctx);

    // native saw ONLY the non-enforcer rule
    expect(native.received.map((r) => r.id)).toEqual(['GOV-001']);
    expect(results.find((r) => r.rule.id === 'GOV-001')!.result).toBe('passed');
    // the enforcer rule was decided by the adapter's violation
    expect(results.find((r) => r.rule.id === 'HXA-01')!.result).toBe('failed');
  });

  it('sends everything to native when no rule opts into an enforcer', async () => {
    const native = new RecordingNative();
    const composite = new CompositeRuleEvaluator(native, new EnforcerEvaluator([]));
    await composite.evaluateAll([rule('GOV-001'), rule('GOV-002')], ctx);
    expect(native.received.map((r) => r.id)).toEqual(['GOV-001', 'GOV-002']);
  });
});

describe('EnforcerEvaluator (pass / fail / frozen / skip)', () => {
  const enforce: EnforceDescriptor = { engine: 'enforcer', tool: 'dependency-cruiser', toolRuleId: 'no-circular' };

  it('passes a rule with no matching violation', async () => {
    const runner = new StubProcessRunner({ exitCode: 0, stdout: '{"violations":[]}', stderr: '' });
    const [res] = await new EnforcerEvaluator([depCruiserAdapter(runner)]).evaluateAll([rule('HXA-01', enforce)], ctx);
    expect(res.result).toBe('passed');
  });

  it('treats a FROZEN (baselined) violation as non-blocking → passed', async () => {
    const runner = new StubProcessRunner({
      exitCode: 1,
      stdout: JSON.stringify({ violations: [{ rule: 'no-circular', file: 'src/a.ts', line: 3, message: 'cycle', frozen: true }] }),
      stderr: '',
    });
    const [res] = await new EnforcerEvaluator([depCruiserAdapter(runner)]).evaluateAll([rule('HXA-01', enforce)], ctx);
    expect(res.result).toBe('passed');
  });

  it('skips (never false-passes) when no adapter is registered for the tool', async () => {
    const [res] = await new EnforcerEvaluator([]).evaluateAll([rule('HXA-01', enforce)], ctx);
    expect(res.result).toBe('skipped');
    expect(res.message).toMatch(/No enforcer adapter/);
  });

  it('skips when the adapter throws (a tool crash never becomes a false pass)', async () => {
    const throwing = new ShellEnforcerAdapter(
      { tool: 'dependency-cruiser', runtime: 'node', buildSpec: () => ({ command: 'x', args: [] }), parse: () => { throw new Error('bad json'); } },
      new StubProcessRunner({ exitCode: 1, stdout: '{"summary":{"garbage":true}}', stderr: '' }),
    );
    const [res] = await new EnforcerEvaluator([throwing]).evaluateAll([rule('HXA-01', enforce)], ctx);
    expect(res.result).toBe('skipped');
    expect(res.message).toMatch(/failed to run/);
  });

  it('skips (never false-passes) when the tool emits no report — missing binary/crash', async () => {
    // exit!=0 + empty stdout = the tool never produced a report; the adapter must SKIP,
    // not treat the absence of parseable violations as "0 violations → passed".
    const runner = new StubProcessRunner({ exitCode: 127, stdout: '', stderr: 'depcruise: command not found' });
    const [res] = await new EnforcerEvaluator([depCruiserAdapter(runner)]).evaluateAll([rule('HXA-01', enforce)], ctx);
    expect(res.result).toBe('skipped');
    expect(res.message).toMatch(/failed to run/);
  });

  it('ignores non-enforcer rules entirely', async () => {
    const results = await new EnforcerEvaluator([]).evaluateAll([rule('GOV-001')], ctx);
    expect(results).toEqual([]);
  });
});

describe('enforcer-catalog.json ⇄ validated-tool-catalog.md (GT-514 AC3)', () => {
  it('every catalog enforcer (tool + version) appears in the doc', () => {
    const catalog = JSON.parse(readFileSync(findUp('src/rulesets/enforcement/enforcer-catalog.json'), 'utf8'));
    const doc = readFileSync(findUp('product/infra/validated-tool-catalog.md'), 'utf8');
    expect(catalog.enforcers.length).toBeGreaterThan(0);
    for (const e of catalog.enforcers) {
      expect(doc).toContain(`**${e.tool}**`);
      expect(doc).toContain(e.version);
      expect(doc).toContain(e.runtime);
    }
  });

  it('declares a valid runtime for every enforcer', () => {
    const catalog = JSON.parse(readFileSync(findUp('src/rulesets/enforcement/enforcer-catalog.json'), 'utf8'));
    const runtimes = new Set(['node', 'dotnet', 'php', 'python', 'iac', 'shell']);
    for (const e of catalog.enforcers) expect(runtimes.has(e.runtime)).toBe(true);
  });
});
