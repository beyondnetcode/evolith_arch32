import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  compileRule,
  compileRuleset,
  toDependencyCruiserConfig,
  type CompilableRule,
  type CompiledCheck,
  type EnforceBlock,
} from './policy-compiler';

function rule(id: string, enforce?: EnforceBlock, extra: Partial<CompilableRule> = {}): CompilableRule {
  return { id, enforce, ...extra };
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

describe('PolicyCompiler — dependency-cruiser compilation (GT-516 AC1: compile + normalize)', () => {
  it('lowers an author-supplied boundary rule to a depcruise `forbidden` fragment', () => {
    const enforce: EnforceBlock = {
      engine: 'enforcer',
      tool: 'dependency-cruiser',
      toolRuleId: 'hxa-04-no-backward-imports',
      runtime: 'node',
      mode: 'block',
      config: { from: { path: '^src/(domain|core)/' }, to: { path: '^src/(application|infrastructure)/' } },
    };
    const out = compileRule(rule('HXA-04', enforce, { category: 'dependency-direction', title: 'Dependency direction', blocking: true }));

    expect(out.kind).toBe('compiled');
    const c = out as CompiledCheck;
    expect(c.tool).toBe('dependency-cruiser');
    expect(c.runtime).toBe('node');
    expect(c.toolRuleId).toBe('hxa-04-no-backward-imports');
    expect(c.mode).toBe('block');
    expect(c.check).toMatchObject({
      name: 'hxa-04-no-backward-imports',
      severity: 'error',
      from: { path: '^src/(domain|core)/' },
      to: { path: '^src/(application|infrastructure)/' },
    });
  });

  it('compiles a cycle rule with no author config (to.circular)', () => {
    const enforce: EnforceBlock = { engine: 'enforcer', tool: 'dependency-cruiser', toolRuleId: 'no-circular', runtime: 'node' };
    const out = compileRule(rule('ARCH-CYCLE', enforce, { category: 'cycle', blocking: true }));
    const c = out as CompiledCheck;
    expect(c.kind).toBe('compiled');
    expect(c.check).toMatchObject({ name: 'no-circular', severity: 'error', to: { circular: true } });
  });

  it('derives warn severity from mode: warn', () => {
    const enforce: EnforceBlock = {
      engine: 'enforcer',
      tool: 'dependency-cruiser',
      runtime: 'node',
      mode: 'warn',
      config: { from: {}, to: { path: 'sentry' } },
    };
    const c = compileRule(rule('HXA-05', enforce, { category: 'aop-isolation' })) as CompiledCheck;
    expect(c.check.severity).toBe('warn');
    expect(c.mode).toBe('warn');
  });

  it('defaults mode from the rule.blocking flag when enforce.mode is absent', () => {
    const enforce: EnforceBlock = { engine: 'enforcer', tool: 'dependency-cruiser', runtime: 'node', config: { from: {}, to: { path: 'x' } } };
    const blocking = compileRule(rule('R1', enforce, { blocking: true })) as CompiledCheck;
    const advisory = compileRule(rule('R2', enforce, { blocking: false })) as CompiledCheck;
    expect(blocking.mode).toBe('block');
    expect(blocking.check.severity).toBe('error');
    expect(advisory.mode).toBe('warn');
    expect(advisory.check.severity).toBe('warn');
  });
});

describe('PolicyCompiler — per-rule fallback, never throws (GT-516 AC2)', () => {
  it('degrades a dependency-cruiser boundary rule with no config to native (not a throw)', () => {
    const enforce: EnforceBlock = { engine: 'enforcer', tool: 'dependency-cruiser', runtime: 'node' };
    const out = compileRule(rule('HXA-03', enforce, { category: 'layer-structure' }));
    expect(out.kind).toBe('fallback');
    expect(out).toMatchObject({ fallback: 'native' });
    expect((out as any).reason).toMatch(/from\/to config/i);
  });

  it('degrades a non-graph rule (testing) to native', () => {
    const enforce: EnforceBlock = { engine: 'enforcer', tool: 'dependency-cruiser', runtime: 'node' };
    const out = compileRule(rule('HXA-07', enforce, { category: 'testing' }));
    expect(out).toMatchObject({ kind: 'fallback', fallback: 'native' });
  });

  it('NetArchTest compiles a cycle rule but falls back to native on a non-cycle rule', () => {
    const cycle: EnforceBlock = { engine: 'enforcer', tool: 'NetArchTest', runtime: 'dotnet' };
    const layer: EnforceBlock = { engine: 'enforcer', tool: 'NetArchTest', runtime: 'dotnet' };
    expect(compileRule(rule('NAT-CYC', cycle, { category: 'cycle' })).kind).toBe('compiled');
    const out = compileRule(rule('NAT-LAYER', layer, { category: 'layer-structure' }));
    expect(out).toMatchObject({ kind: 'fallback', fallback: 'native' });
    expect((out as any).reason).toMatch(/cycle/i);
  });

  it('Deptrac (PHP-only) skips when the runtime is not php', () => {
    const enforce: EnforceBlock = { engine: 'enforcer', tool: 'Deptrac', runtime: 'node' };
    const out = compileRule(rule('DEP-1', enforce, { category: 'layer-structure' }));
    expect(out).toMatchObject({ kind: 'fallback', fallback: 'skip' });
    expect((out as any).reason).toMatch(/php/i);
  });

  it('Deptrac compiles a php layer rule', () => {
    const enforce: EnforceBlock = { engine: 'enforcer', tool: 'Deptrac', runtime: 'php' };
    expect(compileRule(rule('DEP-2', enforce, { category: 'layer-structure', layer: 'Domain' })).kind).toBe('compiled');
  });

  it('Conftest (IaC-only) skips when the runtime is not iac', () => {
    const enforce: EnforceBlock = { engine: 'enforcer', tool: 'Conftest', runtime: 'node' };
    const out = compileRule(rule('CFT-1', enforce, { category: 'iac' }));
    expect(out).toMatchObject({ kind: 'fallback', fallback: 'skip' });
    expect((out as any).reason).toMatch(/iac|config manifest/i);
  });

  it('skips an unknown tool rather than throwing', () => {
    const enforce: EnforceBlock = { engine: 'enforcer', tool: 'archunit', runtime: 'shell' };
    const out = compileRule(rule('X-1', enforce));
    expect(out).toMatchObject({ kind: 'fallback', fallback: 'skip' });
    expect((out as any).reason).toMatch(/no compiler registered/i);
  });

  it('treats a non-enforcer-routed rule as a native fallback', () => {
    const out = compileRule(rule('GOV-1', { engine: 'native', tool: 'native' }));
    expect(out).toMatchObject({ kind: 'fallback', fallback: 'native' });
    const noEnforce = compileRule(rule('GOV-2'));
    expect(noEnforce).toMatchObject({ kind: 'fallback', fallback: 'native' });
  });
});

describe('PolicyCompiler — compileRuleset partitions and never wholesale-fails', () => {
  it('partitions compiled vs fallbacks and ignores native rules', () => {
    const rules: CompilableRule[] = [
      rule('GOV-1'), // native → ignored entirely
      rule('C1', { engine: 'enforcer', tool: 'dependency-cruiser', runtime: 'node', config: { from: {}, to: { path: 'x' } } }, { category: 'layer-structure' }),
      rule('F1', { engine: 'enforcer', tool: 'Deptrac', runtime: 'node' }, { category: 'layer-structure' }), // skip fallback
      rule('C2', { engine: 'enforcer', tool: 'dependency-cruiser', runtime: 'node' }, { category: 'cycle' }),
    ];
    const { compiled, fallbacks } = compileRuleset(rules);
    expect(compiled.map((c) => c.ruleId).sort()).toEqual(['C1', 'C2']);
    expect(fallbacks.map((f) => f.ruleId)).toEqual(['F1']);
    // native GOV-1 appears in NEITHER bucket
    expect([...compiled, ...fallbacks].some((o) => o.ruleId === 'GOV-1')).toBe(false);
  });

  it('aggregates node checks into a .dependency-cruiser {forbidden:[...]} config', () => {
    const rules: CompilableRule[] = [
      rule('C1', { engine: 'enforcer', tool: 'dependency-cruiser', runtime: 'node', config: { from: {}, to: { path: 'x' } } }),
      rule('C2', { engine: 'enforcer', tool: 'NetArchTest', runtime: 'dotnet' }, { category: 'cycle' }),
    ];
    const { compiled } = compileRuleset(rules);
    const cfg = toDependencyCruiserConfig(compiled);
    expect(cfg.forbidden).toHaveLength(1); // NetArchTest check excluded
    expect(cfg.forbidden[0]).toMatchObject({ name: 'C1' });
  });
});

describe('PolicyCompiler ⇄ ADR-0002 pilot (GT-516 AC1: HXA rules compile/fallback)', () => {
  it('routes the import-graph-expressible HXA rules through the enforcer and partitions compile vs per-rule fallback', () => {
    const ruleset = JSON.parse(readFileSync(findUp('src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json'), 'utf8'));
    const rules: CompilableRule[] = ruleset.rules;
    const enforced = rules.filter((r) => r.enforce?.engine === 'enforcer');

    // HXA-03 ("Infrastructure IMPLEMENTS Core ports") is a POSITIVE/structural assertion.
    // dependency-cruiser is a forbidden-dependency tool and cannot express "X implements Y",
    // so HXA-03 carries NO enforce block and is left on the native engine — routing it through
    // the enforcer would only ever degrade to a native fallback (or, with a config, false-positive).
    // The remaining six HXA rules are enforcer-routed.
    expect(enforced.map((r) => r.id).sort()).toEqual(['HXA-01', 'HXA-02', 'HXA-04', 'HXA-05', 'HXA-06', 'HXA-07']);

    const { compiled, fallbacks } = compileRuleset(rules);

    // The five import-graph-expressible rules lower to a dependency-cruiser check.
    expect(compiled.map((c) => c.ruleId).sort()).toEqual(['HXA-01', 'HXA-02', 'HXA-04', 'HXA-05', 'HXA-07']);
    // HXA-06 (AOP-in-infra-only) is enforcer-routed but not import-graph-expressible → it takes the
    // documented per-rule NATIVE fallback rather than emitting an all-matching (false-positive-prone)
    // rule, and never fails the run. (HXA-03 is native-only and never enters the enforcer partition.)
    expect(fallbacks.map((f) => f.ruleId).sort()).toEqual(['HXA-06']);
    for (const f of fallbacks) {
      expect(f.fallback).toBe('native');
      expect(f.tool).toBe('dependency-cruiser');
    }
    for (const c of compiled) {
      expect(c.tool).toBe('dependency-cruiser');
      expect(c.runtime).toBe('node');
      expect(c.check.name).toBeTruthy();
      expect(['error', 'warn', 'info']).toContain(c.check.severity);
    }
  });
});
