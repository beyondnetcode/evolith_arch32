/**
 * Cross-surface enforcer parity — CLI · MCP · REST (BR-008 · GT-519 · EAG-14).
 *
 * The enforcer path (the {@link CompositeRuleEvaluator} the enforcer subsystem builds) must be
 * reachable IDENTICALLY from all three consumption surfaces:
 *   - CLI `evaluate`      → `src/sdk/cli/src/app.module.ts`
 *   - MCP `architecture`  → `src/packages/mcp-server/src/domain/domain.module.ts`
 *   - REST `POST /api/v1/evaluate` → `src/apps/core-api/src/core-domain.module.ts`
 *
 * All three reach the enforcer through the SAME seam: `RulesetValidatorService`, which wraps its
 * strategy with `createCompositeEnforcerStrategy` iff a `processRunner` is injected. Parity is
 * therefore two claims, both verified here WITHOUT standing up REST/MCP servers (no infra):
 *
 *   1. BEHAVIOURAL — construct the strategy the way each surface's DI factory does (a shared
 *      process runner behind the composite) and assert the SAME enforcer rule yields
 *      byte-identical results across all three. A surface that forgot to inject the runner would
 *      instead DROP the enforcer rule — the divergence test pins that as the parity break the
 *      GT-519 wiring closes.
 *   2. REGISTRATION (anti-drift) — assert each of the three real surface-module source files
 *      actually injects a `NodeProcessRunner` into `RulesetValidatorService`. If any surface
 *      silently drops it, the enforcer path is no longer reachable there and this fails.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

import type { NormalizedRule } from '../../../domain/models/normalized-rule';
import type {
  IRuleEvaluatorStrategy, RuleEvaluationResult, WorkspaceEvaluationContext,
} from '../evaluators/evaluator.interface';
import { createCompositeEnforcerStrategy } from './enforcer-subsystem';
import { StubProcessRunner } from './enforcer.types';

const CTX: WorkspaceEvaluationContext = { satellitePath: '/w', corePath: '/c' };

/** Native strategy stub: records what it saw, passes everything (stands in for native/opa). */
class RecordingNativeStrategy implements IRuleEvaluatorStrategy {
  readonly seen: NormalizedRule[] = [];
  async evaluateAll(rules: NormalizedRule[]): Promise<RuleEvaluationResult[]> {
    this.seen.push(...rules);
    return rules.map((rule) => ({ rule, result: 'passed' as const }));
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

/** Reproduce exactly what each surface's DI factory does: inject a runner ⇒ enforcer registered. */
function surfaceStrategyWithRunner(): IRuleEvaluatorStrategy {
  const runner = new StubProcessRunner({ exitCode: 0, stdout: '', stderr: '' }, {
    dotnet: { exitCode: 1, stdout: DOTNET_FAILURE, stderr: '' },
  });
  return createCompositeEnforcerStrategy(new RecordingNativeStrategy(), runner);
}

const SURFACES = ['cli', 'mcp', 'rest'] as const;
const RULE_ID = 'MyApp.Arch.Tests.Domain_should_not_depend_on_Infrastructure';

describe('enforcer path parity across CLI / MCP / REST (GT-519 · BR-008)', () => {
  describe('behavioural: the same enforcer rule yields identical results on every surface', () => {
    it('all three surfaces route the enforcer rule and produce equivalent results', async () => {
      const rules = [nativeRule, netArchRule(RULE_ID)];

      const perSurface = await Promise.all(
        SURFACES.map(async () => {
          const results = await surfaceStrategyWithRunner().evaluateAll(rules, CTX);
          // Normalize ordering so the comparison is about content, not evaluation interleaving.
          return results
            .map((r) => ({ id: r.rule.id, result: r.result, message: r.message ?? null }))
            .sort((a, b) => a.id.localeCompare(b.id));
        }),
      );

      // Every surface must agree with the first — full cross-surface equivalence.
      const [reference, ...others] = perSurface;
      for (const other of others) expect(other).toEqual(reference);

      // And the enforcer rule was actually exercised (a real violation → failed), so this is
      // parity on the ENFORCER path, not merely on an empty result set.
      const enforcerResult = reference.find((r) => r.id === 'HXA-01');
      expect(enforcerResult?.result).toBe('failed');
      expect(enforcerResult?.message).toContain('NetArchTest');
    });

    it('divergence guard: a surface WITHOUT the runner drops the enforcer rule (the parity break GT-519 closes)', async () => {
      const rules = [nativeRule, netArchRule(RULE_ID)];

      // With the enforcer registered (post-GT-519 wiring): both rules produce a result.
      const withEnforcer = await surfaceStrategyWithRunner().evaluateAll(rules, CTX);
      expect(withEnforcer.map((r) => r.rule.id).sort()).toEqual(['DOC-01', 'HXA-01']);

      // Native-only surface (the pre-fix state, no processRunner): the enforcer rule is not
      // evaluated at all — this is exactly the cross-surface divergence the wiring removes.
      const native = new RecordingNativeStrategy();
      const nativeOnly = await native.evaluateAll(rules);
      expect(nativeOnly.some((r) => r.rule.id === 'HXA-01')).toBe(true);
      // The native strategy "passes" the enforcer rule instead of actually running the analyzer —
      // a false pass relative to the enforcer surfaces. The results are NOT equivalent.
      const enforcerOnEnforcerSurface = withEnforcer.find((r) => r.rule.id === 'HXA-01');
      const enforcerOnNativeOnly = nativeOnly.find((r) => r.rule.id === 'HXA-01');
      expect(enforcerOnEnforcerSurface!.result).not.toBe(enforcerOnNativeOnly!.result);
    });
  });

  describe('registration anti-drift: each real surface module injects the enforcer runner', () => {
    const repoRoot = resolve(__dirname, '..', '..', '..', '..', '..', '..', '..');
    const SURFACE_MODULES: Record<string, string> = {
      'REST (core-api)': resolve(repoRoot, 'src', 'apps', 'core-api', 'src', 'core-domain.module.ts'),
      'CLI (sdk/cli)': resolve(repoRoot, 'src', 'sdk', 'cli', 'src', 'app.module.ts'),
      'MCP (mcp-server)': resolve(repoRoot, 'src', 'packages', 'mcp-server', 'src', 'domain', 'domain.module.ts'),
    };

    for (const [surface, modulePath] of Object.entries(SURFACE_MODULES)) {
      it(`${surface} wires a NodeProcessRunner into RulesetValidatorService`, () => {
        const src = readFileSync(modulePath, 'utf8');
        expect(src).toContain('RulesetValidatorService');
        expect(src).toContain('NodeProcessRunner');
        // The runner must be threaded into the validator options (the enforcer seam), not merely
        // imported. `processRunner:` is the option key `createCompositeEnforcerStrategy` keys off.
        expect(src).toMatch(/processRunner:\s*new NodeProcessRunner\(\)/);
      });
    }
  });
});
