import { OpaEvaluator, violationBelongsToRule } from './opa-evaluator';
import { createMockFileSystem, createMockLogger } from '../../../test/mocks';
import { NormalizedRule } from '../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext } from './evaluator.interface';
import * as path from 'path';
import * as fs from 'fs';

jest.mock('@open-policy-agent/opa-wasm', () => {
  return {
    loadPolicy: jest.fn().mockResolvedValue({
      evaluate: jest.fn().mockReturnValue([
        {
          result: [
            { id: 'DEP-01', message: 'package.json#dependencies.lodash=^4.17.21 (Caret pinning not allowed)' }
          ]
        }
      ])
    })
  };
});

describe('OpaEvaluator', () => {
  let fs: ReturnType<typeof createMockFileSystem>;
  let logger: ReturnType<typeof createMockLogger>;
  let evaluator: OpaEvaluator;

  let wasmCounter = 0;

  beforeEach(() => {
    fs = createMockFileSystem();
    logger = createMockLogger();
    evaluator = new OpaEvaluator(fs, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockRule: NormalizedRule = {
    id: 'DEP-01',
    severity: 'MUST',
    category: 'version-pinning',
    title: 'Dependency Pinning',
    description: 'All dependencies must be strictly pinned',
    blocking: true,
    sourceFile: 'rules.json',
  };

  const ctx: WorkspaceEvaluationContext = {
    satellitePath: '/satellite',
    corePath: '/core',
  };

  it('blocks (result: failed) when policy.wasm is absent — GT-362 enforcement', async () => {
    const results = await evaluator.evaluateAll([mockRule], ctx);
    expect(results).toHaveLength(1);
    expect(results[0].result).toBe('failed');
    expect(results[0].message).toMatch(/OPA policy not compiled — enforcement blocked/);

    const errorLogs = logger.getLogsByLevel('ERROR');
    expect(errorLogs.length).toBeGreaterThan(0);
    expect(errorLogs[0].message).toMatch(/OPA WebAssembly policy not found/);
  });

  it('blocks (result: failed) when OPA engine throws — GT-362 enforcement', async () => {
    const { loadPolicy } = require('@open-policy-agent/opa-wasm');
    (loadPolicy as jest.Mock).mockRejectedValueOnce(new Error('wasm engine crash'));

    const wasmPath = path.join('/core', 'rulesets', 'opa', 'policy.wasm');
    fs.setFile(wasmPath, `fake-wasm-error-${++wasmCounter}`);

    const results = await evaluator.evaluateAll([mockRule], ctx);
    expect(results).toHaveLength(1);
    expect(results[0].result).toBe('failed');
    expect(results[0].message).toMatch(/OPA engine error — enforcement blocked/);
    expect(results[0].message).toMatch(/wasm engine crash/);
  });

  it('should evaluate rules using the loaded Wasm policy if present and schema passes', async () => {
    const wasmPath = path.join('/core', 'rulesets', 'opa', 'policy.wasm');
    const schemaPath = path.join('/core', 'rulesets', 'opa', 'schemas', 'version-pinning.input.schema.json');
    
    // Write fake wasm bytes and valid schema
    fs.setFile(wasmPath, `fake-wasm-valid-${++wasmCounter}`);
    fs.setFile(schemaPath, JSON.stringify({
      type: 'object',
      properties: {
        satellite: { type: 'object' }
      }
    }));
    
    const results = await evaluator.evaluateAll([mockRule], ctx);
    
    expect(results).toHaveLength(1);
    expect(results[0].result).toBe('failed');
    expect(results[0].message).toContain('Caret pinning not allowed');
  });

  it('should fail validation if input schema validation fails', async () => {
    const wasmPath = path.join('/core', 'rulesets', 'opa', 'policy.wasm');
    const schemaPath = path.join('/core', 'rulesets', 'opa', 'schemas', 'version-pinning.input.schema.json');
    
    fs.setFile(wasmPath, `fake-wasm-schema-${++wasmCounter}`);
    // Require a field that doesn't exist on standard input builder output to force failure
    fs.setFile(schemaPath, JSON.stringify({
      type: 'object',
      required: ['nonExistentRequiredField']
    }));
    
    const results = await evaluator.evaluateAll([mockRule], ctx);

    expect(results).toHaveLength(1);
    expect(results[0].result).toBe('failed');
    expect(results[0].message).toContain('OPA Input Schema Validation Failed');
    expect(results[0].message).toContain('must have required property');
  });

  // --- GT-382: context-aware policies emit namespaced ids (DOD-*/CB-*/PG-*) that
  // never equal the path-derived rule id (opa-dod/...). A gate rule referencing the
  // policy file owns ALL of that policy's violations — matched by prefix. -----------

  const wasmPath = path.join('/core', 'rulesets', 'opa', 'policy.wasm');
  const sdlcRule = (id: string): NormalizedRule => ({
    id,
    severity: 'MUST',
    category: 'sdlc', // no sdlc.input.schema.json → schema validation skipped
    title: id,
    description: 'gate artifact rule',
    blocking: true,
    sourceFile: 'gate',
  });
  const withViolations = (vs: Array<{ id: string; message: string }>) => {
    const { loadPolicy } = require('@open-policy-agent/opa-wasm');
    (loadPolicy as jest.Mock).mockResolvedValueOnce({ evaluate: () => [{ result: vs }] });
    fs.setFile(wasmPath, `fake-wasm-viol-${++wasmCounter}`);
  };

  it('GT-382: opa-dod rule FAILS when the dod policy emits a DOD-* violation', async () => {
    withViolations([{ id: 'DOD-02', message: 'Test coverage must be >= 80%' }]);
    const results = await evaluator.evaluateAll([sdlcRule('opa-dod')], ctx);
    expect(results[0].result).toBe('failed');
    expect(results[0].message).toContain('coverage');
  });

  it('GT-382: opa-dod rule PASSES when no DOD-* violation is emitted (no false positive)', async () => {
    withViolations([{ id: 'GOV-001', message: 'unrelated' }]);
    const results = await evaluator.evaluateAll([sdlcRule('opa-dod')], ctx);
    expect(results[0].result).toBe('passed');
  });

  it('GT-382: opa-compliance-baseline rule FAILS on a CB-* violation', async () => {
    withViolations([{ id: 'CB-01', message: 'Agnostic Baseline missing' }]);
    const results = await evaluator.evaluateAll([sdlcRule('opa-compliance-baseline')], ctx);
    expect(results[0].result).toBe('failed');
  });

  it('GT-382: opa-phase-gates rule FAILS on a PG-* violation', async () => {
    withViolations([{ id: 'PG-EVIDENCE-MISSING', message: 'mandatory artifact missing' }]);
    const results = await evaluator.evaluateAll([sdlcRule('opa-phase-gates')], ctx);
    expect(results[0].result).toBe('failed');
  });

  it('GT-382: non-context-aware rules keep EXACT id matching (prefix map does not leak)', async () => {
    // A DOD-* violation must NOT satisfy an unrelated exact-id rule.
    withViolations([{ id: 'DOD-02', message: 'coverage' }]);
    const results = await evaluator.evaluateAll([sdlcRule('DEP-01')], ctx);
    expect(results[0].result).toBe('passed');
  });
});


/**
 * GT-688 AC5 — the criterion is "a policy can discriminate on a topology present
 * in the composition". `opa-wasm-composition.spec.ts` already proves `TPC-01`
 * fires in the compiled bundle for `event-driven` and stays silent without it.
 * What was missing is the last hop: the evaluator has to ATTRIBUTE that
 * violation to the gate rule that referenced the policy, and it could not.
 *
 * Before the entry existed, this case returned `passed` — the policy fired, the
 * violation matched no rule, and the run reported conformance over it.
 */
describe('TPC-01 reaches the verdict · GT-688 AC5', () => {
  const wasmMock = require('@open-policy-agent/opa-wasm');

  const tpcRule: NormalizedRule = {
    id: 'opa-topology-composition',
    severity: 'MUST',
    category: 'version-pinning', // any category with no input schema on the mock fs
    title: 'Topology composition',
    description: 'Gate rule referencing rulesets/opa/topology-composition.rego',
    blocking: true,
    sourceFile: 'gate.json',
  };

  it('ATTRIBUTES a TPC-01 violation to the rule that referenced the policy', async () => {
    const fs = createMockFileSystem();
    const logger = createMockLogger();
    fs.setFile(path.join('/core', 'rulesets', 'opa', 'policy.wasm'), 'fake-wasm-tpc');
    (wasmMock.loadPolicy as jest.Mock).mockResolvedValueOnce({
      evaluate: () => [{ result: [{ id: 'TPC-01', message: 'event-driven confirmed without an outbox' }] }],
    });

    const results = await new OpaEvaluator(fs, logger).evaluateAll([tpcRule], {
      satellitePath: '/satellite',
      corePath: '/core',
    });

    expect(results[0].result).toBe('failed');
    expect(results[0].message).toMatch(/event-driven confirmed without an outbox/);
  });

  it('stays PASSED when the policy emits nothing', async () => {
    const fs = createMockFileSystem();
    const logger = createMockLogger();
    fs.setFile(path.join('/core', 'rulesets', 'opa', 'policy.wasm'), 'fake-wasm-tpc-clean');
    (wasmMock.loadPolicy as jest.Mock).mockResolvedValueOnce({ evaluate: () => [{ result: [] }] });

    const results = await new OpaEvaluator(fs, logger).evaluateAll([tpcRule], {
      satellitePath: '/satellite',
      corePath: '/core',
    });

    expect(results[0].result).toBe('passed');
  });
});

/**
 * GT-693 — attribution is now DERIVED, not listed.
 *
 * The test this replaces pinned 27 policy names that the hand-maintained prefix
 * table did not cover, so that the rot at least failed loudly. Its premise is gone:
 * `main.rego` tags every aggregated violation with the policy that emitted it,
 * using exactly the id `deriveRuleId` builds from that policy's path, so a new
 * policy is attributed the moment it is aggregated and no list needs updating.
 *
 * What replaces it is the invariant that makes that true, asserted against the
 * real files: every aggregation rule carries a tag, and every tag equals the
 * derived id of the file declaring the package it aggregates. Adding an import to
 * `main.rego` without a tag — the one way to re-create the defect — fails here.
 */
describe('every policy in the bundle is attributable · GT-693', () => {
  const OPA_DIR = path.resolve(__dirname, '../../../../../../rulesets/opa');
  const MAIN = path.join(OPA_DIR, 'main.rego');

  /** `deriveRuleId`'s transform, from `satellite-evaluation-pipeline.service.ts`. */
  const deriveRuleId = (relPath: string) =>
    relPath.replace(/^.*rulesets\//, '').replace(/\.rego$/, '').replace(/[^a-zA-Z0-9_-]/g, '-');

  function packageToFile(): Map<string, string> {
    const out = new Map<string, string>();
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!entry.name.endsWith('.rego')) continue;
        const pkg = fs.readFileSync(full, 'utf8').split('\n').find((l) => l.startsWith('package '));
        if (pkg) out.set(pkg.slice('package '.length).trim(), full);
      }
    };
    walk(OPA_DIR);
    return out;
  }

  const main = () => fs.readFileSync(MAIN, 'utf8');
  const imports = () =>
    [...main().matchAll(/^import data\.evolith\.([\w.]+)\.violations as (\w+)$/gm)]
      .map((m) => ({ pkg: m[1], alias: m[2] }));
  const aggregations = () =>
    [...main().matchAll(/^violations contains (\{[^}]*\}|v) if \{\n\tv := (\w+)\[_\]\n\}$/gm)]
      .map((m) => ({ head: m[1], alias: m[2] }));

  it('reads the real bundle, so an empty scan cannot pass this vacuously', () => {
    expect(imports().length).toBeGreaterThanOrEqual(30);
    expect(aggregations().length).toBe(imports().length);
  });

  it('EVERY aggregated policy carries provenance — an untagged one is the old defect', () => {
    const untagged = aggregations().filter((a) => !a.head.includes('"policy"')).map((a) => a.alias);
    expect(untagged).toEqual([]);
  });

  it("every tag equals the id `deriveRuleId` builds from that policy's own path", () => {
    const files = packageToFile();
    const wrong: string[] = [];
    for (const { pkg, alias } of imports()) {
      const file = files.get(`evolith.${pkg}`);
      expect([pkg, file !== undefined]).toEqual([pkg, true]);
      const expected = deriveRuleId(file!);
      const agg = aggregations().find((a) => a.alias === alias);
      const tag = agg?.head.match(/"policy":\s*"([^"]+)"/)?.[1];
      if (tag !== expected) wrong.push(`${alias}: tagged ${tag ?? '<none>'}, derives to ${expected}`);
    }
    expect(wrong).toEqual([]);
  });
});

/**
 * GT-693 AC4 — the two id ranges that no id-based scheme can resolve.
 *
 * `CLI-RR-01..05` are emitted by BOTH `cli-readiness` and `cli-release-readiness`;
 * `TAX-05..11` by both `taxonomy` and `repository-taxonomy`. 10 of the corpus's 197
 * ids collide. Under the old prefix scheme a gate referencing one of them would have
 * claimed the other's findings and reported them under the wrong rule — a verdict
 * that names the wrong policy is worse than a missing one, because it sends the
 * operator to the wrong file.
 */
describe('colliding ids resolve to the policy that emitted them · GT-693 AC4', () => {
  const readiness = { id: 'CLI-RR-01', message: 'from cli-readiness', policy: 'opa-cli-readiness' };
  const release = { id: 'CLI-RR-01', message: 'from cli-release-readiness', policy: 'opa-cli-release-readiness' };

  it('attributes each to its own policy and NOT to the other', () => {
    expect(violationBelongsToRule(readiness, 'opa-cli-readiness')).toBe(true);
    expect(violationBelongsToRule(readiness, 'opa-cli-release-readiness')).toBe(false);
    expect(violationBelongsToRule(release, 'opa-cli-release-readiness')).toBe(true);
    expect(violationBelongsToRule(release, 'opa-cli-readiness')).toBe(false);
  });

  it('does the same for the TAX- range', () => {
    const tax = { id: 'TAX-05', message: 'x', policy: 'opa-taxonomy' };
    expect(violationBelongsToRule(tax, 'opa-taxonomy')).toBe(true);
    expect(violationBelongsToRule(tax, 'opa-repository-taxonomy')).toBe(false);
  });

  it('falls back to the legacy scheme ONLY when a violation carries no provenance', () => {
    // A bundle compiled before GT-693. The four legacy entries still work…
    expect(violationBelongsToRule({ id: 'DOD-01', message: 'x' }, 'opa-dod')).toBe(true);
    // …and everything else still fails to attribute, which is the defect this
    // fallback deliberately does NOT paper over: a stale wasm must not look healthy.
    expect(violationBelongsToRule({ id: 'DEP-01', message: 'x' }, 'opa-version-pinning')).toBe(false);
  });
});

/**
 * GT-693 AC2 — a violation that no evaluated rule claims must be SURFACED, not
 * dropped. Before this, `violations.filter(...)` simply matched nothing and the
 * finding ceased to exist: there was no way, from any output, to tell "the policy
 * found nothing" apart from "the policy found something and we lost it".
 *
 * Reported at debug rather than warn on purpose. For a partial rule selection most
 * violations legitimately belong to policies the run never asked about, so warning
 * would fire on every healthy run and be muted within a week. What AC2 requires is
 * that the information EXIST and name its policy, which it now does.
 */
describe('an unclaimed violation is named, not dropped · GT-693 AC2', () => {
  const wasmMock = require('@open-policy-agent/opa-wasm');

  const ruleFor = (id: string): NormalizedRule => ({
    id, severity: 'MUST', category: 'version-pinning', title: id,
    description: 'gate rule', blocking: true, sourceFile: 'gate.json',
  });

  it('names the orphan AND the policy that emitted it', async () => {
    const fs = createMockFileSystem();
    const logger = createMockLogger();
    fs.setFile(path.join('/core', 'rulesets', 'opa', 'policy.wasm'), 'fake-wasm-orphan');
    (wasmMock.loadPolicy as jest.Mock).mockResolvedValueOnce({
      evaluate: () => [{ result: [
        { id: 'DEP-01', message: 'claimed', policy: 'opa-version-pinning' },
        { id: 'MTN-04', message: 'nobody asked about this one', policy: 'opa-multi-tenancy' },
      ] }],
    });

    const results = await new OpaEvaluator(fs, logger).evaluateAll(
      [ruleFor('opa-version-pinning')],
      { satellitePath: '/satellite', corePath: '/core' },
    );

    // The rule that WAS asked about gets its own violation and only its own.
    expect(results[0].result).toBe('failed');
    expect(results[0].message).toBe('claimed');

    const debug = logger.getLogsByLevel('DEBUG').map((l) => l.message).join(' ');
    expect(debug).toMatch(/matched no evaluated rule/);
    expect(debug).toMatch(/opa-multi-tenancy: MTN-04/);
    // …and it must NOT claim the one that was attributed.
    expect(debug).not.toMatch(/DEP-01/);
  });

  it('says nothing when every violation found an owner', async () => {
    const fs = createMockFileSystem();
    const logger = createMockLogger();
    fs.setFile(path.join('/core', 'rulesets', 'opa', 'policy.wasm'), 'fake-wasm-no-orphan');
    (wasmMock.loadPolicy as jest.Mock).mockResolvedValueOnce({
      evaluate: () => [{ result: [{ id: 'DEP-01', message: 'claimed', policy: 'opa-version-pinning' }] }],
    });

    await new OpaEvaluator(fs, logger).evaluateAll(
      [ruleFor('opa-version-pinning')],
      { satellitePath: '/satellite', corePath: '/core' },
    );

    expect(logger.getLogsByLevel('DEBUG').map((l) => l.message).join(' ')).not.toMatch(/matched no evaluated rule/);
  });
});

/**
 * GT-700 — a regression GT-693 shipped, found by an adversarial probe on GT-675.
 *
 * GT-693 gave every aggregated violation a `policy` tag so a GATE rule referencing
 * `rulesets/opa/<file>.rego` could claim it. The predicate was written as a
 * short-circuit:
 *
 *     if (typeof provenance === 'string') return provenance === ruleId;
 *     ...
 *     return violation.id === ruleId;      // ← became unreachable
 *
 * Because `main.rego` now tags EVERY violation, the exact-id branch is dead code.
 * A corpus rule stopped being able to claim the violation that carries its own id:
 * `ACL-02` no longer matches `{ id: 'ACL-02', policy: 'opa-anti-corruption-layer' }`.
 *
 * MEASURED: 184 corpus rules are decidable by exact id from the shipped policies, and
 * all 184 lost their attribution the day the tag landed. The whole-corpus OPA run
 * reports 4 issues where the native engine reports 112.
 *
 * The two claims are ADDITIVE, not alternative. One violation legitimately answers to
 * two different rules: the corpus rule that shares its id, and the gate rule that
 * pulled the policy in. Making provenance exclusive silently deleted the first.
 */
describe('provenance ADDS a claimant, it does not replace one · GT-700', () => {
  const tagged = { id: 'ACL-02', message: 'x', policy: 'opa-anti-corruption-layer' };

  it('a CORPUS rule still claims the violation carrying its own id', () => {
    // This is what GT-693 broke: before the tag existed, exact-id matching worked.
    expect(violationBelongsToRule(tagged, 'ACL-02')).toBe(true);
  });

  it('and the GATE rule that pulled in the policy still claims it too', () => {
    expect(violationBelongsToRule(tagged, 'opa-anti-corruption-layer')).toBe(true);
  });

  it('a rule that is neither claims nothing', () => {
    expect(violationBelongsToRule(tagged, 'MTN-01')).toBe(false);
    expect(violationBelongsToRule(tagged, 'opa-multi-tenancy')).toBe(false);
  });

  it('an untagged violation is unaffected — legacy bundles keep working', () => {
    expect(violationBelongsToRule({ id: 'ACL-02', message: 'x' }, 'ACL-02')).toBe(true);
    expect(violationBelongsToRule({ id: 'DOD-01', message: 'x' }, 'opa-dod')).toBe(true);
  });
});
