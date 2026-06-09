import { RuleEvaluationEngine, NormalizedRule } from './rule-evaluation-engine';
import { IFileSystem, ILogger } from '../abstractions';

const makeFs = (overrides: Partial<IFileSystem> = {}): IFileSystem =>
  ({
    exists: jest.fn().mockResolvedValue(false),
    existsSync: jest.fn().mockReturnValue(false),
    readFile: jest.fn().mockResolvedValue(''),
    readJson: jest.fn().mockResolvedValue({}),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readdirNames: jest.fn().mockResolvedValue([]),
    stat: jest.fn().mockResolvedValue({ isDirectory: () => false, isFile: () => true }),
    ...overrides,
  } as unknown as IFileSystem);

const makeLogger = (): ILogger =>
  ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as ILogger);

const ctx = { satellitePath: '/sat', corePath: '/core' };

const makeRule = (partial: Partial<NormalizedRule>): NormalizedRule => ({
  id: 'TEST-01',
  severity: 'MUST',
  category: 'test',
  title: 'Test rule',
  description: 'A test rule',
  blocking: true,
  sourceFile: 'test.rules.json',
  ...partial,
});

describe('RuleEvaluationEngine — normalisation', () => {
  it('normalises standard rules format', async () => {
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readdirNames: jest.fn().mockResolvedValue(['dep.rules.json']),
      stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
      readFile: jest.fn().mockResolvedValue(JSON.stringify({
        rules: [
          { id: 'DEP-01', severity: 'MUST NOT', category: 'version-pinning', title: 'No ^', description: 'No caret', blocking: true },
        ],
      })),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rules = await engine.loadAllRulesets('/core');
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('DEP-01');
    expect(rules[0].severity).toBe('MUST NOT');
  });

  it('normalises principles format (acl/governance style)', async () => {
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readdirNames: jest.fn().mockResolvedValue(['acl.rules.json']),
      stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
      readFile: jest.fn().mockResolvedValue(JSON.stringify({
        principles: [
          { id: 'ACL-01', principle: 'Validate', statement: 'Validate incoming data', severity: 'MUST', validationQuery: 'check', blocking: true },
        ],
      })),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rules = await engine.loadAllRulesets('/core');
    expect(rules[0].id).toBe('ACL-01');
    expect(rules[0].title).toBe('Validate');
    expect(rules[0].description).toBe('Validate incoming data');
  });

  it('skips engineering-manifesto (nested principles without top-level id)', async () => {
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readdirNames: jest.fn().mockResolvedValue(['manifesto.rules.json']),
      stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
      readFile: jest.fn().mockResolvedValue(JSON.stringify({
        principles: [
          { name: 'Quality', acronym: 'Q', rules: [{ text: 'do quality' }] },
        ],
      })),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rules = await engine.loadAllRulesets('/core');
    expect(rules).toHaveLength(0);
  });

  it('derives category from rule ID prefix when category field absent', async () => {
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readdirNames: jest.fn().mockResolvedValue(['inh.rules.json']),
      stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
      readFile: jest.fn().mockResolvedValue(JSON.stringify({
        principles: [
          { id: 'INH-01', principle: 'Immutability', statement: 'Core is immutable', enforcement: 'CLI validates' },
        ],
      })),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rules = await engine.loadAllRulesets('/core');
    expect(rules[0].category).toBe('inheritance');
  });
});

describe('RuleEvaluationEngine — version-pinning evaluator', () => {
  it('passes when no caret or tilde in dependencies', async () => {
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readJson: jest.fn().mockResolvedValue({ dependencies: { lodash: '4.17.21' } }),
      readdirNames: jest.fn().mockResolvedValue([]),
      stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rule = makeRule({ id: 'DEP-01', category: 'version-pinning' });
    const results = await engine.discoverAndEvaluate('/sat', '/core');
    expect(results.filter(r => r.rule.id === 'DEP-01')).toHaveLength(0); // no rulesets discovered, just check logic
    // Direct test via loadAllRulesets + evaluate path
    const result = await (engine as any).evalVersionPinning(rule, ctx);
    expect(result.result).toBe('passed');
  });

  it('fails when caret found in dependencies', async () => {
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readJson: jest.fn().mockResolvedValue({ dependencies: { lodash: '^4.17.21' } }),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rule = makeRule({ id: 'DEP-01', category: 'version-pinning' });
    const result = await (engine as any).evalVersionPinning(rule, ctx);
    expect(result.result).toBe('failed');
    expect(result.message).toContain('lodash');
  });

  it('fails DEP-02 when tilde found', async () => {
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readJson: jest.fn().mockResolvedValue({ devDependencies: { jest: '~29.0.0' } }),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rule = makeRule({ id: 'DEP-02', category: 'version-pinning' });
    const result = await (engine as any).evalVersionPinning(rule, ctx);
    expect(result.result).toBe('failed');
  });
});

describe('RuleEvaluationEngine — lock-file evaluator', () => {
  it('passes when package-lock.json exists at corePath', async () => {
    const fs = makeFs({
      exists: jest.fn().mockImplementation(async (p: string) => p.endsWith('package-lock.json')),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rule = makeRule({ id: 'DEP-04', category: 'lock-file' });
    const result = await (engine as any).evalLockFile(rule, ctx);
    expect(result.result).toBe('passed');
  });

  it('fails when no package-lock.json anywhere', async () => {
    const fs = makeFs({ exists: jest.fn().mockResolvedValue(false) });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rule = makeRule({ id: 'DEP-04', category: 'lock-file' });
    const result = await (engine as any).evalLockFile(rule, ctx);
    expect(result.result).toBe('failed');
  });
});

describe('RuleEvaluationEngine — evidence evaluator', () => {
  const evidencePath = '/core/.harness/evidence';

  it('passes EVD-01 when all required fields present', async () => {
    const manifest = JSON.stringify({
      id: 'evd-001', source: 'test', generatedAt: '2026-01-01', producer: 'harness',
      evaluatedRules: ['EVD-01'], status: 'passed', blockingFailures: [],
      retentionPeriod: '90d', owner: 'team', sourceRef: 'sdk/cli',
    });
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readdirNames: jest.fn().mockResolvedValue(['smoke.json']),
      readFile: jest.fn().mockResolvedValue(manifest),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rule = makeRule({ id: 'EVD-01', category: 'identity' });
    const result = await (engine as any).evalEvidence(rule, { ...ctx, corePath: '/core' });
    expect(result.result).toBe('passed');
  });

  it('fails EVD-01 when id field missing', async () => {
    const manifest = JSON.stringify({
      source: 'test', generatedAt: '2026-01-01', producer: 'harness', evaluatedRules: ['EVD-01'],
    });
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readdirNames: jest.fn().mockResolvedValue(['smoke.json']),
      readFile: jest.fn().mockResolvedValue(manifest),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rule = makeRule({ id: 'EVD-01', category: 'identity' });
    const result = await (engine as any).evalEvidence(rule, { ...ctx, corePath: '/core' });
    expect(result.result).toBe('failed');
    expect(result.message).toContain('id');
  });

  it('fails EVD-01 when no evidence files exist', async () => {
    const fs = makeFs({
      exists: jest.fn().mockImplementation(async (p: string) => p === evidencePath),
      readdirNames: jest.fn().mockResolvedValue([]),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rule = makeRule({ id: 'EVD-01', category: 'identity' });
    const result = await (engine as any).evalEvidence(rule, { ...ctx, corePath: '/core' });
    expect(result.result).toBe('failed');
  });

  it('fails EVD-02 when sourceRef missing', async () => {
    const manifest = JSON.stringify({ id: 'x', source: 'x', generatedAt: 'x', producer: 'x', evaluatedRules: [] });
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readdirNames: jest.fn().mockResolvedValue(['ev.json']),
      readFile: jest.fn().mockResolvedValue(manifest),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rule = makeRule({ id: 'EVD-02', category: 'traceability' });
    const result = await (engine as any).evalEvidence(rule, { ...ctx, corePath: '/core' });
    expect(result.result).toBe('failed');
    expect(result.message).toContain('sourceRef');
  });
});

describe('RuleEvaluationEngine — build evaluator', () => {
  it('passes when dist/main.js exists', async () => {
    const fs = makeFs({
      exists: jest.fn().mockImplementation(async (p: string) =>
        p.endsWith('dist/main.js')),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rule = makeRule({ id: 'CLI-RR-01', category: 'build' });
    const result = await (engine as any).evalBuild(rule, { ...ctx, corePath: '/core' });
    expect(result.result).toBe('passed');
  });

  it('fails when dist/main.js missing', async () => {
    const fs = makeFs({ exists: jest.fn().mockResolvedValue(false) });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger() });
    const rule = makeRule({ id: 'CLI-RR-01', category: 'build' });
    const result = await (engine as any).evalBuild(rule, { ...ctx, corePath: '/core' });
    expect(result.result).toBe('failed');
  });
});

describe('RuleEvaluationEngine — toValidationIssues', () => {
  it('maps failed results to ValidationIssues', () => {
    const engine = new RuleEvaluationEngine({ fileSystem: makeFs(), logger: makeLogger() });
    const rule = makeRule({ id: 'DEP-01', severity: 'MUST', blocking: true });
    const issues = engine.toValidationIssues([
      { rule, result: 'failed', message: 'caret found' },
      { rule: makeRule({ id: 'DEP-02' }), result: 'passed' },
      { rule: makeRule({ id: 'DEP-03' }), result: 'skipped' },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('DEP-01');
    expect(issues[0].description).toBe('caret found');
    expect(issues[0].blocking).toBe(true);
  });

  it('converts MUST NOT severity to MUST for ValidationIssue', () => {
    const engine = new RuleEvaluationEngine({ fileSystem: makeFs(), logger: makeLogger() });
    const rule = makeRule({ id: 'DEP-01', severity: 'MUST NOT', blocking: true });
    const issues = engine.toValidationIssues([{ rule, result: 'failed', message: 'x' }]);
    expect(issues[0].severity).toBe('MUST');
  });
});
