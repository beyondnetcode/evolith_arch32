import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type { NormalizedRule, EnforceDescriptor } from '../../../domain/models/normalized-rule';
import { makeViolation } from '../../../evaluation/violation';
import type { IRuleEvaluatorStrategy, RuleEvaluationResult, WorkspaceEvaluationContext } from '../evaluators/evaluator.interface';
import { CompositeRuleEvaluator } from './composite-rule-evaluator';
import { EnforcerEvaluator } from './enforcer-evaluator';
import { ShellEnforcerAdapter } from './shell-enforcer-adapter';
import { StubProcessRunner, type ProcessResult } from './enforcer.types';

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
      new StubProcessRunner(),
    );
    const [res] = await new EnforcerEvaluator([throwing]).evaluateAll([rule('HXA-01', enforce)], ctx);
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
