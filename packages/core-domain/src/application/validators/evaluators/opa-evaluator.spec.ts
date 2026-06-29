import { OpaEvaluator } from './opa-evaluator';
import { createMockFileSystem, createMockLogger } from '../../../test/mocks';
import { NormalizedRule } from '../../../domain/models/normalized-rule';
import { WorkspaceEvaluationContext } from './evaluator.interface';
import * as path from 'path';

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
    fs.setFile(wasmPath, 'fake-wasm');

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
    fs.setFile(wasmPath, 'fake-wasm-content');
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
    
    fs.setFile(wasmPath, 'fake-wasm-content');
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
    fs.setFile(wasmPath, 'fake-wasm');
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
