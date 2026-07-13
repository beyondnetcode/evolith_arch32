/**
 * PolicyCompiler round-trip (GT-516 AC3: compile → run → normalize to Violation, 0 FP).
 *
 * Closes the loop the {@link compileRuleset PolicyCompiler} opens: it lowers ADR-0002's
 * `enforce:` blocks into the dependency-cruiser `forbidden` config, and this test feeds
 * that SAME config's rule ids back through the GT-515 {@link createDependencyCruiserAdapter}
 * over a deterministic {@link StubProcessRunner} — so a compiled rule id round-trips all the
 * way to a canonical {@link Violation} whose `ruleId` is what the tool reports.
 *
 * The zero-false-positive assertion runs against a CLEAN fixture corpus (a
 * `depcruise --output-type json` report with no violations): the pipeline yields ZERO
 * Violations, never a spurious one. A DIRTY fixture confirms every compiled rule
 * normalizes to exactly one Violation.
 *
 * A real cross-runtime EXECUTION (spawning depcruise/NetArchTest/Deptrac/Conftest on a
 * restored workspace) is GT-512-sandbox-gated; this exercises the compile→normalize
 * contract with a stubbed runner + fixture reports, which is the deterministic slice.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { compileRuleset, toDependencyCruiserConfig, type CompilableRule } from './policy-compiler';
import { createDependencyCruiserAdapter, DEPENDENCY_CRUISER_TOOL } from './adapters/dependency-cruiser-adapter';
import { StubProcessRunner, type EnforcerAnalysisContext, type ProcessResult } from './enforcer.types';

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

/** A minimal analysis context — the adapter only reads `satellitePath` (for cwd). */
const CTX: EnforcerAnalysisContext = { satellitePath: '/repo', corePath: '/core', rules: [] };

/** Seed a StubProcessRunner with a canned `depcruise --output-type json` report. */
function seedRunner(report: unknown): StubProcessRunner {
  const result: ProcessResult = { exitCode: 0, stdout: JSON.stringify(report), stderr: '' };
  return new StubProcessRunner(undefined, { [DEPENDENCY_CRUISER_TOOL]: result });
}

describe('PolicyCompiler round-trip — ADR-0002 compile → normalize to Violation (GT-516 AC3)', () => {
  const ruleset = JSON.parse(readFileSync(findUp('src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json'), 'utf8'));
  const rules: CompilableRule[] = ruleset.rules;
  const { compiled } = compileRuleset(rules);
  const config = toDependencyCruiserConfig(compiled);
  const compiledRuleNames = compiled.map((c) => c.toolRuleId).sort();

  it('lowers the compiled checks into the depcruise forbidden config the runner will apply', () => {
    // Every compiled node rule appears in the emitted `.dependency-cruiser` config under
    // the tool rule id the analyzer will later report — the compile → tool-config half.
    expect(config.forbidden.map((r) => r.name).sort()).toEqual(compiledRuleNames);
    expect(config.forbidden.length).toBeGreaterThanOrEqual(5);
  });

  it('a CLEAN corpus normalizes to ZERO violations (0 false positives)', async () => {
    // A codebase that OBEYS every HXA rule → depcruise reports no violations.
    const adapter = createDependencyCruiserAdapter(seedRunner({ summary: { violations: [] } }));
    const violations = await adapter.analyze(CTX);
    expect(violations).toEqual([]);
  });

  it('each compiled rule round-trips to a canonical Violation carrying its rule id', async () => {
    // A DIRTY corpus that trips every compiled rule: one violation per compiled tool rule id.
    const dirty = {
      summary: {
        violations: compiled.map((c) => ({
          from: `src/domain/offender-${c.toolRuleId}.ts`,
          to: 'node_modules/@nestjs/common/index.js',
          rule: { name: c.toolRuleId, severity: c.mode === 'block' ? 'error' : 'warn' },
        })),
      },
    };
    const adapter = createDependencyCruiserAdapter(seedRunner(dirty));
    const violations = await adapter.analyze(CTX);

    // Every compiled rule id surfaces as exactly one Violation — the full round-trip.
    expect(violations.map((v) => v.ruleId).sort()).toEqual(compiledRuleNames);
    for (const v of violations) {
      expect(v.tool).toBe(DEPENDENCY_CRUISER_TOOL);
      expect(v.file).toMatch(/^src\/domain\/offender-/);
      expect(['error', 'warning']).toContain(v.severity);
      expect(v.fingerprint).toBeTruthy();
    }
  });

  it('a malformed tool report yields no spurious violations (0 FP on garbage)', async () => {
    // Non-empty, unparseable stdout → the parser returns [] rather than inventing findings.
    const runner = new StubProcessRunner(undefined, {
      [DEPENDENCY_CRUISER_TOOL]: { exitCode: 0, stdout: '{ this is : not valid json', stderr: '' },
    });
    const adapter = createDependencyCruiserAdapter(runner);
    await expect(adapter.analyze(CTX)).resolves.toEqual([]);
  });
});
