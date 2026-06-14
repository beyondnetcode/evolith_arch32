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

  it('should skip evaluation if policy.wasm is not present', async () => {
    const results = await evaluator.evaluateAll([mockRule], ctx);
    expect(results).toHaveLength(1);
    expect(results[0].result).toBe('skipped');
    expect(results[0].message).toMatch(/OPA Wasm policy not compiled yet/);
    
    const warnLogs = logger.getLogsByLevel('WARN');
    expect(warnLogs.length).toBeGreaterThan(0);
    expect(warnLogs[0].message).toMatch(/OPA WebAssembly policy not found/);
  });

  it('should evaluate rules using the loaded Wasm policy if present', async () => {
    const wasmPath = path.join('/core', 'rulesets', 'opa', 'policy.wasm');
    
    // Write fake wasm bytes
    fs.setFile(wasmPath, 'fake-wasm-content');
    
    const results = await evaluator.evaluateAll([mockRule], ctx);
    
    expect(results).toHaveLength(1);
    expect(results[0].result).toBe('failed');
    expect(results[0].message).toContain('Caret pinning not allowed');
  });
});
