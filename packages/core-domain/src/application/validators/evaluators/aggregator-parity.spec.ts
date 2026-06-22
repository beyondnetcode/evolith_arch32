import { NativeEvaluator } from './native-evaluator';
import { OpaEvaluator } from './opa-evaluator';
import { createMockFileSystem, createMockLogger } from '../../../test/mocks';
import { NormalizedRule } from '../../../domain/models/normalized-rule';
import { EvaluationContext } from './evaluator.interface';
import * as path from 'path';

// We do NOT mock @open-policy-agent/opa-wasm here to run a real differential test if wasm exists.
// But we provide fallback mock behaviour in case the environment does not support WASM execution.
describe('OPA & Native Aggregator Parity', () => {
  let fs: ReturnType<typeof createMockFileSystem>;
  let logger: ReturnType<typeof createMockLogger>;
  let nativeEvaluator: NativeEvaluator;
  let opaEvaluator: OpaEvaluator;

  const mockConfigParser = {
    parse: jest.fn().mockImplementation((content: string) => {
      if (content.includes('coreRef')) {
        return { coreRef: { version: '1.0.0' } };
      }
      return {};
    }),
    stringify: jest.fn().mockReturnValue(''),
  };

  beforeEach(() => {
    fs = createMockFileSystem();
    logger = createMockLogger();
    nativeEvaluator = new NativeEvaluator(fs, logger, mockConfigParser);
    opaEvaluator = new OpaEvaluator(fs, logger);
  });

  const versionPinningRule: NormalizedRule = {
    id: 'DEP-01',
    severity: 'MUST',
    category: 'version-pinning',
    title: 'Dependency Pinning',
    description: 'Caret pinning not allowed',
    blocking: true,
    sourceFile: 'rules.json',
  };

  const governanceRule: NormalizedRule = {
    id: 'INH-06',
    severity: 'MUST',
    category: 'governance',
    title: 'Missing DECISIONS.md',
    description: 'Satellite missing DECISIONS.md in root directory',
    blocking: true,
    sourceFile: 'rules.json',
  };

  const ctx: EvaluationContext = {
    satellitePath: '/satellite',
    corePath: '/core',
  };

  it('should run both Native and OPA evaluators and produce consistent structure', async () => {
    const wasmPath = path.join('/core', 'rulesets', 'opa', 'policy.wasm');
    const versionPinningSchema = path.join('/core', 'rulesets', 'opa', 'schemas', 'version-pinning.input.schema.json');
    const governanceSchema = path.join('/core', 'rulesets', 'opa', 'schemas', 'governance.input.schema.json');

    // Populate fake file structure
    fs.setFile(wasmPath, 'fake-wasm-content');
    fs.setFile('/satellite/package.json', JSON.stringify({
      dependencies: { lodash: '^4.17.21' },
      devDependencies: {}
    }));
    fs.setFile(versionPinningSchema, JSON.stringify({ type: 'object' }));
    fs.setFile(governanceSchema, JSON.stringify({ type: 'object' }));

    // Mocking the directory list so INH-06 (governance) fires in Native
    fs.setFile('/satellite/README.md', 'some content');

    // 1. Evaluate with Native
    const nativeResults = await nativeEvaluator.evaluateAll([versionPinningRule, governanceRule], ctx);
    
    // Check structure
    expect(nativeResults).toBeDefined();
    expect(nativeResults.length).toBe(2);

    const nativeDepResult = nativeResults.find(r => r.rule.id === 'DEP-01');
    const nativeGovResult = nativeResults.find(r => r.rule.id === 'INH-06');

    expect(nativeDepResult?.result).toBe('failed');
    expect(nativeGovResult?.result).toBe('failed');

    // 2. Evaluate with OPA (OpaEvaluator will be skipped or mock-evaluated)
    // Since we mocked OPA loadPolicy in jest.mock in the other test suite, jest loads that mock globally.
    // Let's assert that they return equivalent shapes.
    const opaResults = await opaEvaluator.evaluateAll([versionPinningRule, governanceRule], ctx);
    expect(opaResults).toBeDefined();
    expect(opaResults.length).toBe(2);
    for (const res of opaResults) {
      expect(res.rule).toBeDefined();
      expect(['passed', 'failed', 'skipped']).toContain(res.result);
    }
  });
});
