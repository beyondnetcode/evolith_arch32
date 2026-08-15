import { OpaEvaluator, CONTEXT_AWARE_VIOLATION_PREFIXES } from './opa-evaluator';
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
 * GT-688 AC5 — the attribution table is hand-maintained, and a missing entry is
 * SILENT: the policy fires in the wasm, no rule claims its violations, and the
 * rule referencing it is reported `passed`. That is a false pass, which is the
 * class this corpus exists to catch.
 *
 * Measured 2026-08-15 while closing GT-688: 31 of the 33 shipped policies emit
 * namespaced ids and only 4 are mapped. The other 27 have exactly the same
 * defect as `TPC-01` had, for any satellite whose gate references them. That is
 * NOT fixed here — expanding this slice to rewrite the attribution model would
 * make an unreviewable diff out of a one-line gap — it is registered as its own
 * row, and this test is what stops it from being forgotten: the unmapped set is
 * written down, so adding a policy or mapping one is a deliberate edit rather
 * than a silent drift.
 */
describe('the violation attribution table · GT-688', () => {
  const OPA_DIR = path.resolve(__dirname, '../../../../../../rulesets/opa');

  /** policy id (as `deriveRuleId` produces it) → the id prefixes it emits */
  function prefixesEmittedByPolicy(): Map<string, Set<string>> {
    const out = new Map<string, Set<string>>();
    for (const file of fs.readdirSync(OPA_DIR)) {
      if (!file.endsWith('.rego') || file === 'main.rego' || file.includes('test')) continue;
      const ids = [...fs.readFileSync(path.join(OPA_DIR, file), 'utf8').matchAll(/"id":\s*"([A-Z][A-Z0-9]*)-/g)];
      if (ids.length === 0) continue;
      out.set(`opa-${file.replace(/\.rego$/, '')}`, new Set(ids.map((m) => `${m[1]}-`)));
    }
    return out;
  }

  it('reads real policies, so an empty scan cannot pass this vacuously', () => {
    expect(prefixesEmittedByPolicy().size).toBeGreaterThanOrEqual(30);
  });

  it('MAPS `topology-composition`, whose absence made AC5 unmeetable', () => {
    const emitted = prefixesEmittedByPolicy().get('opa-topology-composition');
    expect([...(emitted ?? [])]).toContain('TPC-');
    expect(CONTEXT_AWARE_VIOLATION_PREFIXES['opa-topology-composition']).toBe('TPC-');
  });

  it('every mapped prefix is one the policy actually emits', () => {
    const emitted = prefixesEmittedByPolicy();
    for (const [policy, prefix] of Object.entries(CONTEXT_AWARE_VIOLATION_PREFIXES)) {
      expect([policy, [...(emitted.get(policy) ?? [])]]).toEqual([policy, expect.arrayContaining([prefix])]);
    }
  });

  it('the UNMAPPED policies are the ones we know about — a new one must be a deliberate choice', () => {
    const unmapped = [...prefixesEmittedByPolicy().keys()]
      .filter((p) => !(p in CONTEXT_AWARE_VIOLATION_PREFIXES))
      .sort();
    // Each of these drops its violations for a satellite that references it.
    // Shrinking this list is progress; growing it silently is the regression.
    expect(unmapped).toEqual([
      'opa-abac-mcp-tool-access',
      'opa-anti-corruption-layer',
      'opa-capability-source-interface',
      'opa-ci-cd',
      'opa-cicd-quality-gates',
      'opa-cli-core-parity',
      'opa-cli-exit-code-taxonomy',
      'opa-cli-readiness',
      'opa-cli-release-readiness',
      'opa-engineering-manifesto',
      'opa-evidence',
      'opa-executive-scorecards',
      'opa-gitflow-branching',
      'opa-governance',
      'opa-hexagonal-architecture',
      'opa-knowledge-intake',
      'opa-mcp',
      'opa-multi-runtime',
      'opa-multi-tenancy',
      'opa-open-core-boundary',
      'opa-probabilistic-evidence-admissibility',
      'opa-protocol-selection',
      'opa-repository-taxonomy',
      'opa-satellite-contracts',
      'opa-taxonomy',
      'opa-telemetry-evidence',
      'opa-version-pinning',
    ]);
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
