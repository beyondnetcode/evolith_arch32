import type { NormalizedRule } from '../../../domain/models/normalized-rule';
import type { IRuleEvaluatorStrategy, RuleEvaluationResult, WorkspaceEvaluationContext } from '../evaluators/evaluator.interface';
import { createCompositeEnforcerStrategy, createEnforcerAdapters } from './enforcer-subsystem';
import { StubProcessRunner } from './enforcer.types';

const CTX: WorkspaceEvaluationContext = { satellitePath: '/w', corePath: '/c' };

/** A native strategy stub that records the rules routed to it and passes them all. */
class RecordingNativeStrategy implements IRuleEvaluatorStrategy {
  readonly seen: NormalizedRule[] = [];
  async evaluateAll(rules: NormalizedRule[]): Promise<RuleEvaluationResult[]> {
    this.seen.push(...rules);
    return rules.map((rule) => ({ rule, result: 'passed' as const }));
  }
}

/** A native strategy that declines every rule — the shape of "no handler claims it". */
class DecliningNativeStrategy implements IRuleEvaluatorStrategy {
  async evaluateAll(rules: NormalizedRule[]): Promise<RuleEvaluationResult[]> {
    return rules.map((rule) => ({ rule, result: 'skipped' as const, message: 'no native handler claims this rule' }));
  }
}

/** A native strategy that returns a real verdict — the shape of "a handler decided it". */
class VerdictNativeStrategy implements IRuleEvaluatorStrategy {
  readonly seen: NormalizedRule[] = [];
  constructor(
    private readonly verdict: 'passed' | 'failed',
    private readonly message: string,
  ) {}
  async evaluateAll(rules: NormalizedRule[]): Promise<RuleEvaluationResult[]> {
    this.seen.push(...rules);
    return rules.map((rule) => ({ rule, result: this.verdict, message: this.message }));
  }
}

const netArchRule = (toolRuleId: string): NormalizedRule => ({
  id: 'HXA-01',
  severity: 'MUST',
  category: 'architecture',
  title: 'Domain must not depend on Infrastructure',
  description: 'Hexagonal boundary (ADR-0002).',
  blocking: true,
  sourceFile: 'adr-0002.rules.json',
  enforce: { engine: 'enforcer', tool: 'NetArchTest', toolRuleId, runtime: 'dotnet' },
});

const nativeRule: NormalizedRule = {
  id: 'DOC-01',
  severity: 'SHOULD',
  category: 'docs',
  title: 'A native rule',
  description: 'Stays on the native engine.',
  blocking: false,
  sourceFile: 'native.rules.json',
};

const DOTNET_FAILURE = [
  '  Failed MyApp.Arch.Tests.Domain_should_not_depend_on_Infrastructure [45 ms]',
  '  Error Message:',
  '   NetArchTest: expected no dependencies but found MyApp.Domain.Order -> MyApp.Infrastructure.Db',
  'Failed!  - Failed:     1, Passed:     9, Skipped:     0, Total:    10',
].join('\n');

describe('createEnforcerAdapters — one adapter per validated runtime', () => {
  it('registers one adapter per validated runtime (node/dotnet/python/iac — GT-515/524/521)', () => {
    const adapters = createEnforcerAdapters(new StubProcessRunner());
    // GT-662 adds `iso-5055`, which is NOT a sixth scanner: it translates the
    // SARIF a free analyser already produces into the four ISO/IEC 5055
    // measures. It registers under `node` because that is how semgrep is
    // invoked when the tenant has not pointed it at an existing SARIF log.
    expect(adapters.map((a) => a.tool).sort()).toEqual(
      ['Checkov', 'NetArchTest', 'Trivy', 'dependency-cruiser', 'import-linter', 'iso-5055'],
    );
    expect(adapters.map((a) => a.runtime).sort()).toEqual(['dotnet', 'iac', 'iac', 'node', 'node', 'python']);
  });
});

describe('createCompositeEnforcerStrategy — the closed .NET enforcer loop', () => {
  it('routes a .NET enforce: rule through the sandbox → NetArchTest → violation → failed', async () => {
    const native = new RecordingNativeStrategy();
    const runner = new StubProcessRunner({ exitCode: 0, stdout: '', stderr: '' }, {
      dotnet: { exitCode: 1, stdout: DOTNET_FAILURE, stderr: '' },
    });
    const strategy = createCompositeEnforcerStrategy(native, runner);

    const results = await strategy.evaluateAll([netArchRule('MyApp.Arch.Tests.Domain_should_not_depend_on_Infrastructure')], CTX);

    expect(results).toHaveLength(1);
    expect(results[0].result).toBe('failed');
    expect(results[0].message).toContain('NetArchTest');
    expect(native.seen).toHaveLength(0); // the enforcer rule never touched the native engine
  });

  it('passes when NetArchTest reports no matching violation', async () => {
    const runner = new StubProcessRunner({ exitCode: 0, stdout: '', stderr: '' }, {
      dotnet: { exitCode: 1, stdout: DOTNET_FAILURE, stderr: '' },
    });
    const strategy = createCompositeEnforcerStrategy(new RecordingNativeStrategy(), runner);
    // toolRuleId matches no failed test in the transcript → the rule is satisfied.
    const results = await strategy.evaluateAll([netArchRule('MyApp.Arch.Tests.Some_other_rule')], CTX);
    expect(results[0].result).toBe('passed');
  });

  it('leaves native rules on the native strategy (non-forking)', async () => {
    const native = new RecordingNativeStrategy();
    const strategy = createCompositeEnforcerStrategy(native, new StubProcessRunner());
    const results = await strategy.evaluateAll([nativeRule], CTX);
    expect(native.seen).toEqual([nativeRule]);
    expect(results[0].result).toBe('passed');
  });

  it('the sandbox denies a runtime binary outside the allowlist (fail-closed → skip, not false pass)', async () => {
    // GT-632: a denied binary now degrades to the NATIVE engine, so the guarantee
    // is stated against a native strategy that DECLINES — the real production
    // shape for a rule no handler claims. `RecordingNativeStrategy` passes
    // everything unconditionally, which would make any degradation look like a
    // false pass regardless of whether it is one.
    const strategy = createCompositeEnforcerStrategy(new DecliningNativeStrategy(), new StubProcessRunner(), { policy: {
      allowEgress: false, allowSecrets: false, binaryAllowlist: [], timeoutMs: 1000,
    } });
    const results = await strategy.evaluateAll([netArchRule('any')], CTX);
    expect(results[0].result).toBe('skipped');
    // Both reasons survive: nothing evaluated this rule, and the report says so twice.
    expect(results[0].message).toContain("is not in the allowlist");
    expect(results[0].message).toContain('no native handler');
  });

  it('degrades an unavailable enforcer to the native engine instead of skipping (GT-632)', async () => {
    // The defect this closes: four `blocking: true` HXA rules routed to
    // dependency-cruiser reported `skipped` whenever the tool was not provisioned,
    // i.e. always. An enforcer that cannot run must cost PRECISION, not COVERAGE.
    const native = new VerdictNativeStrategy('failed', 'native module-graph engine found a forbidden import');
    const strategy = createCompositeEnforcerStrategy(native, new StubProcessRunner(), { policy: {
      allowEgress: false, allowSecrets: false, binaryAllowlist: [], timeoutMs: 1000,
    } });

    const results = await strategy.evaluateAll([netArchRule('any')], CTX);

    expect(results[0].result).toBe('failed');
    expect(results[0].message).toContain('enforcer unavailable');
    expect(results[0].message).toContain('native module-graph engine found a forbidden import');
    expect(native.seen.map((r) => r.id)).toEqual(['HXA-01']);
  });
});
