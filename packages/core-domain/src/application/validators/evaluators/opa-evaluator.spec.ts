import { OpaEvaluator } from './opa-evaluator';
import { createMockFileSystem, createMockLogger } from '../../../test/mocks';
import { NormalizedRule } from '../../../domain/models/normalized-rule';
import { EvaluationContext } from './evaluator.interface';
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

  const ctx: EvaluationContext = {
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
});
