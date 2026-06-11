import { RuleEvaluationEngine, NormalizedRule } from './rule-evaluation-engine';
import { NativeEvaluator } from './evaluators/native-evaluator';
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
      readFile: jest.fn().mockImplementation(async (p: string) => {
        if (p.endsWith('.schema.json')) return JSON.stringify({ type: 'object' });
        return JSON.stringify({
          rules: [
            { id: 'DEP-01', severity: 'MUST NOT', category: 'version-pinning', title: 'No ^', description: 'No caret', blocking: true },
          ],
        });
      }),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
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
      readFile: jest.fn().mockImplementation(async (p: string) => {
        if (p.endsWith('.schema.json')) return JSON.stringify({ type: 'object' });
        return JSON.stringify({
          principles: [
            { id: 'ACL-01', principle: 'Validate', statement: 'Validate incoming data', severity: 'MUST', validationQuery: 'check', blocking: true },
          ],
        });
      }),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
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
      readFile: jest.fn().mockImplementation(async (p: string) => {
        if (p.endsWith('.schema.json')) return JSON.stringify({ type: 'object' });
        return JSON.stringify({
          principles: [
            { name: 'Quality', acronym: 'Q', rules: [{ text: 'do quality' }] },
          ],
        });
      }),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rules = await engine.loadAllRulesets('/core');
    expect(rules).toHaveLength(0);
  });

  it('derives category from rule ID prefix when category field absent', async () => {
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readdirNames: jest.fn().mockResolvedValue(['inh.rules.json']),
      stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
      readFile: jest.fn().mockImplementation(async (p: string) => {
        if (p.endsWith('.schema.json')) return JSON.stringify({ type: 'object' });
        return JSON.stringify({
          principles: [
            { id: 'INH-01', principle: 'Immutability', statement: 'Core is immutable', enforcement: 'CLI validates' },
          ],
        });
      }),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
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
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'DEP-01', category: 'version-pinning' });
    const results = await engine.discoverAndEvaluate('/sat', '/core');
    expect(results.filter(r => r.rule.id === 'DEP-01')).toHaveLength(0); // no rulesets discovered, just check logic
    // Direct test via loadAllRulesets + evaluate path
    const result = await (strategy as any).evalVersionPinning(rule, ctx);
    expect(result.result).toBe('passed');
  });

  it('fails when caret found in dependencies', async () => {
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readJson: jest.fn().mockResolvedValue({ dependencies: { lodash: '^4.17.21' } }),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'DEP-01', category: 'version-pinning' });
    const result = await (strategy as any).evalVersionPinning(rule, ctx);
    expect(result.result).toBe('failed');
    expect(result.message).toContain('lodash');
  });

  it('fails DEP-02 when tilde found', async () => {
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readJson: jest.fn().mockResolvedValue({ devDependencies: { jest: '~29.0.0' } }),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'DEP-02', category: 'version-pinning' });
    const result = await (strategy as any).evalVersionPinning(rule, ctx);
    expect(result.result).toBe('failed');
  });
});

describe('RuleEvaluationEngine — lock-file evaluator', () => {
  it('passes when package-lock.json exists at corePath', async () => {
    const fs = makeFs({
      exists: jest.fn().mockImplementation(async (p: string) => p.endsWith('package-lock.json')),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'DEP-04', category: 'lock-file' });
    const result = await (strategy as any).evalLockFile(rule, ctx);
    expect(result.result).toBe('passed');
  });

  it('fails when no package-lock.json anywhere', async () => {
    const fs = makeFs({ exists: jest.fn().mockResolvedValue(false) });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'DEP-04', category: 'lock-file' });
    const result = await (strategy as any).evalLockFile(rule, ctx);
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
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'EVD-01', category: 'identity' });
    const result = await (strategy as any).evalEvidence(rule, { ...ctx, corePath: '/core' });
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
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'EVD-01', category: 'identity' });
    const result = await (strategy as any).evalEvidence(rule, { ...ctx, corePath: '/core' });
    expect(result.result).toBe('failed');
    expect(result.message).toContain('id');
  });

  it('fails EVD-01 when no evidence files exist', async () => {
    const fs = makeFs({
      exists: jest.fn().mockImplementation(async (p: string) => p === evidencePath),
      readdirNames: jest.fn().mockResolvedValue([]),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'EVD-01', category: 'identity' });
    const result = await (strategy as any).evalEvidence(rule, { ...ctx, corePath: '/core' });
    expect(result.result).toBe('failed');
  });

  it('fails EVD-02 when sourceRef missing', async () => {
    const manifest = JSON.stringify({ id: 'x', source: 'x', generatedAt: 'x', producer: 'x', evaluatedRules: [] });
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readdirNames: jest.fn().mockResolvedValue(['ev.json']),
      readFile: jest.fn().mockResolvedValue(manifest),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'EVD-02', category: 'traceability' });
    const result = await (strategy as any).evalEvidence(rule, { ...ctx, corePath: '/core' });
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
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'CLI-RR-01', category: 'build' });
    const result = await (strategy as any).evalBuild(rule, { ...ctx, corePath: '/core' });
    expect(result.result).toBe('passed');
  });

  it('fails when dist/main.js missing', async () => {
    const fs = makeFs({ exists: jest.fn().mockResolvedValue(false) });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'CLI-RR-01', category: 'build' });
    const result = await (strategy as any).evalBuild(rule, { ...ctx, corePath: '/core' });
    expect(result.result).toBe('failed');
  });
});

describe('RuleEvaluationEngine — toValidationIssues', () => {
  it('maps failed results to ValidationIssues', () => {
    const strategy = new NativeEvaluator(makeFs(), makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: makeFs(), logger: makeLogger(), strategy });
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
    const strategy = new NativeEvaluator(makeFs(), makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: makeFs(), logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'DEP-01', severity: 'MUST NOT', blocking: true });
    const issues = engine.toValidationIssues([{ rule, result: 'failed', message: 'x' }]);
    expect(issues[0].severity).toBe('MUST');
  });
});

// ── discoverAndEvaluate — ALREADY_CHECKED and unknown rule dispatch ────────────

describe('RuleEvaluationEngine — discoverAndEvaluate dispatch', () => {
  it('skips rules in ALREADY_CHECKED set (GOV-01, INH-02, ACL-01, OCB-01)', async () => {
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readdirNames: jest.fn().mockResolvedValue(['gov.rules.json']),
      stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
      readFile: jest.fn().mockImplementation(async (p: string) => {
        if (p.endsWith('.schema.json')) return JSON.stringify({ type: 'object' });
        return JSON.stringify({
          rules: [
            { id: 'GOV-01', severity: 'MUST', title: 'G', description: '', blocking: true },
            { id: 'INH-02', severity: 'MUST', title: 'I', description: '', blocking: true },
            { id: 'ACL-01', severity: 'MUST', title: 'A', description: '', blocking: true },
          ],
        });
      }),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const results = await engine.discoverAndEvaluate('/sat', '/core');
    expect(results).toHaveLength(0);
  });

  it('returns skipped for rule with no evaluator (unknown id)', async () => {
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readdirNames: jest.fn().mockResolvedValue(['custom.rules.json']),
      stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
      readFile: jest.fn().mockImplementation(async (p: string) => {
        if (p.endsWith('.schema.json')) return JSON.stringify({ type: 'object' });
        return JSON.stringify({
          rules: [{ id: 'CUSTOM-99', severity: 'SHOULD', title: 'Custom', description: '', blocking: false }],
        });
      }),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const results = await engine.discoverAndEvaluate('/sat', '/core');
    expect(results[0].result).toBe('skipped');
    expect(results[0].message).toContain('external system');
  });

  it('logs warn and returns skipped when evaluator throws', async () => {
    const logger = makeLogger();
    const fs = makeFs({
      exists: jest.fn().mockImplementation(async (p: string) => {
        if (p.endsWith('rulesets')) return true;
        if (p.endsWith('.rules.json')) return true;
        throw new Error('disk error');
      }),
      readdirNames: jest.fn().mockResolvedValue(['dep.rules.json']),
      stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
      readFile: jest.fn().mockImplementation(async (p: string) => {
        if (p.endsWith('.schema.json')) return JSON.stringify({ type: 'object' });
        return JSON.stringify({
          rules: [{ id: 'DEP-04', severity: 'MUST', category: 'version-pinning', title: 'L', description: '', blocking: true }],
        });
      }),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: logger as any });
    const results = await engine.discoverAndEvaluate('/sat', '/core');
    const dep = results.find(r => r.rule.id === 'DEP-04');
    expect(dep?.result).toBe('skipped');
    expect(logger.warn).toHaveBeenCalled();
  });
});

// ── evalCiWorkflowContains (DEP-05/DEP-06) ───────────────────────────────────

describe('RuleEvaluationEngine — CI workflow evaluators', () => {
  it('skips DEP-05 when .github/workflows directory absent', async () => {
    const fs = makeFs({ exists: jest.fn().mockResolvedValue(false) });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'DEP-05', category: 'version-pinning' });
    const result = await (strategy as any).evalCiInstall(rule, ctx);
    expect(result.result).toBe('skipped');
  });

  it('passes DEP-05 when workflow contains "npm ci"', async () => {
    const fs = makeFs({
      exists: jest.fn().mockImplementation(async (p: string) => p.endsWith('workflows')),
      readdirNames: jest.fn().mockResolvedValue(['ci.yml']),
      readFile: jest.fn().mockResolvedValue('run: npm ci\n'),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'DEP-05', category: 'version-pinning' });
    const result = await (strategy as any).evalCiInstall(rule, ctx);
    expect(result.result).toBe('passed');
  });

  it('fails DEP-06 when workflow lacks "npm audit"', async () => {
    const fs = makeFs({
      exists: jest.fn().mockImplementation(async (p: string) => p.endsWith('workflows')),
      readdirNames: jest.fn().mockResolvedValue(['ci.yml']),
      readFile: jest.fn().mockResolvedValue('run: npm install\n'),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'DEP-06', category: 'version-pinning' });
    const result = await (strategy as any).evalCiAudit(rule, ctx);
    expect(result.result).toBe('failed');
  });
});

// ── evalDependabot ────────────────────────────────────────────────────────────

describe('RuleEvaluationEngine — evalDependabot (DEP-09)', () => {
  it('passes when .github/dependabot.yml found', async () => {
    const fs = makeFs({
      exists: jest.fn().mockImplementation(async (p: string) => p.endsWith('dependabot.yml')),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'DEP-09', category: 'version-pinning' });
    const result = await (strategy as any).evalDependabot(rule, ctx);
    expect(result.result).toBe('passed');
  });

  it('fails when no dependabot or renovate config found', async () => {
    const fs = makeFs({ exists: jest.fn().mockResolvedValue(false) });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'DEP-09', category: 'version-pinning' });
    const result = await (strategy as any).evalDependabot(rule, ctx);
    expect(result.result).toBe('failed');
  });
});

// ── evalDirectoryStructure ────────────────────────────────────────────────────

describe('RuleEvaluationEngine — evalDirectoryStructure', () => {
  it('passes TAX-05 when all core top-level dirs exist', async () => {
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'TAX-05', category: 'naming-conventions' });
    const result = await (strategy as any).evalDirectoryStructure(rule, ctx);
    expect(result.result).toBe('passed');
  });

  it('fails TAX-05 when some core dirs are missing', async () => {
    const fs = makeFs({
      exists: jest.fn().mockImplementation(async (p: string) => p.endsWith('reference')),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'TAX-05', category: 'naming-conventions' });
    const result = await (strategy as any).evalDirectoryStructure(rule, ctx);
    expect(result.result).toBe('failed');
    expect(result.message).toContain('Missing');
  });

  it('skips TAX-06 when satellitePath === corePath', async () => {
    const strategy = new NativeEvaluator(makeFs(), makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: makeFs(), logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'TAX-06', category: 'naming-conventions' });
    const result = await (strategy as any).evalDirectoryStructure(rule, { satellitePath: '/core', corePath: '/core' });
    expect(result.result).toBe('skipped');
  });

  it('skips TAX-06 when satellite has no package.json', async () => {
    const fs = makeFs({ exists: jest.fn().mockResolvedValue(false) });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'TAX-06', category: 'naming-conventions' });
    const result = await (strategy as any).evalDirectoryStructure(rule, ctx);
    expect(result.result).toBe('skipped');
  });

  it('passes TAX-06 when satellite has src/tests/docs', async () => {
    const fs = makeFs({ exists: jest.fn().mockResolvedValue(true) });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'TAX-06', category: 'naming-conventions' });
    const result = await (strategy as any).evalDirectoryStructure(rule, ctx);
    expect(result.result).toBe('passed');
  });
});

// ── evalInheritance ───────────────────────────────────────────────────────────

describe('RuleEvaluationEngine — evalInheritance (INH-01)', () => {
  it('fails when satellite has its own rulesets/ directory', async () => {
    const fs = makeFs({
      exists: jest.fn().mockImplementation(async (p: string) => p === '/sat/rulesets'),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'INH-01' });
    const result = await (strategy as any).evalInheritance(rule, ctx);
    expect(result.result).toBe('failed');
  });

  it('passes when satellite does not have its own rulesets/', async () => {
    const fs = makeFs({ exists: jest.fn().mockResolvedValue(false) });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'INH-01' });
    const result = await (strategy as any).evalInheritance(rule, ctx);
    expect(result.result).toBe('passed');
  });

  it('passes when satellitePath === corePath (Core self-validation)', async () => {
    const fs = makeFs({ exists: jest.fn().mockResolvedValue(true) });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'INH-01' });
    const result = await (strategy as any).evalInheritance(rule, { satellitePath: '/core', corePath: '/core' });
    expect(result.result).toBe('passed');
  });
});

// ── evalMcpSecurity ───────────────────────────────────────────────────────────

describe('RuleEvaluationEngine — evalMcpSecurity (MCP-04)', () => {
  it('skips when server.ts not found', async () => {
    const fs = makeFs({ exists: jest.fn().mockResolvedValue(false) });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'MCP-04' });
    const result = await (strategy as any).evalMcpSecurity(rule, ctx);
    expect(result.result).toBe('skipped');
  });

  it('passes when server.ts contains "localhost"', async () => {
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readFile: jest.fn().mockResolvedValue('bind: localhost'),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'MCP-04' });
    const result = await (strategy as any).evalMcpSecurity(rule, ctx);
    expect(result.result).toBe('passed');
  });
});

// ── evalCliDocs ───────────────────────────────────────────────────────────────

describe('RuleEvaluationEngine — evalCliDocs (CLI-RR-05)', () => {
  it('passes when README.md found', async () => {
    const fs = makeFs({
      exists: jest.fn().mockImplementation(async (p: string) => p.endsWith('README.md')),
    });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'CLI-RR-05' });
    const result = await (strategy as any).evalCliDocs(rule, ctx);
    expect(result.result).toBe('passed');
  });

  it('fails when neither README.md nor ARCHITECTURE.md found', async () => {
    const fs = makeFs({ exists: jest.fn().mockResolvedValue(false) });
    const strategy = new NativeEvaluator(fs, makeLogger());
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: makeLogger(), strategy });
    const rule = makeRule({ id: 'CLI-RR-05' });
    const result = await (strategy as any).evalCliDocs(rule, ctx);
    expect(result.result).toBe('failed');
  });
});

// ── loadAllRulesets — JSON parse warn ─────────────────────────────────────────

describe('RuleEvaluationEngine — parse error handling', () => {
  it('logs warn and skips file on JSON parse error', async () => {
    const logger = makeLogger();
    const fs = makeFs({
      exists: jest.fn().mockResolvedValue(true),
      readdirNames: jest.fn().mockResolvedValue(['bad.rules.json']),
      stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
      readFile: jest.fn().mockImplementation(async (p: string) => {
        if (p.endsWith('.schema.json')) return JSON.stringify({ type: 'object' });
        return 'not valid json {{{';
      }),
    });
    const engine = new RuleEvaluationEngine({ fileSystem: fs, logger: logger as any });
    await expect(engine.loadAllRulesets('/core')).rejects.toThrow('Ruleset validation error');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('bad.rules.json'));
  });
});
