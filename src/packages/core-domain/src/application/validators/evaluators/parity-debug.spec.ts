import * as path from 'path';
import { NativeEvaluator } from './native-evaluator';
import { NormalizedRule } from '../../domain/models/normalized-rule';
import { IFileSystem, IConfigParser, ILogger } from '../../domain/interfaces';
import { WorkspaceEvaluationContext } from './evaluator.interface';

function createMockFileSystem(cfg: {
  existing?: string[];
  dirs?: Record<string, string[]>;
  files?: Record<string, string>;
  json?: Record<string, unknown>;
  directories?: string[];
}): IFileSystem {
  const existing = new Set(cfg.existing ?? []);
  const directories = new Set(cfg.directories ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    existsSync: jest.fn((p: string) => existing.has(p)),
    readFile: jest.fn(async (p: string) => cfg.files?.[p] ?? ''),
    readJson: jest.fn(async (p: string) => (cfg.json?.[p] ?? {}) as unknown),
    readdirNames: jest.fn(async (p: string) => cfg.dirs?.[p] ?? []),
    readdir: jest.fn(async (p: string) => {
      const names = cfg.dirs?.[p] ?? [];
      return names.map(n => ({
        name: n,
        isDirectory: () => directories.has(path.join(p, n)),
        isFile: () => !directories.has(path.join(p, n)),
      }));
    }),
    stat: jest.fn(async (p: string) => ({
      isDirectory: () => directories.has(p),
      isFile: () => !directories.has(p),
    })),
    writeFile: jest.fn(async () => {}),
    writeJson: jest.fn(async () => {}),
    mkdir: jest.fn(async () => {}),
    ensureDir: jest.fn(async () => {}),
    ensureFile: jest.fn(async () => {}),
    copy: jest.fn(async () => {}),
    remove: jest.fn(async () => {}),
    readFileBuffer: jest.fn(async () => Buffer.alloc(0)),
  } as unknown as IFileSystem;
}

const mockLogger: ILogger = {
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
};
const mockConfigParser: IConfigParser = {
  parse: jest.fn((c: string) => { try { return require('yaml').parse(c); } catch { return JSON.parse(c); } }),
  stringify: jest.fn((d: unknown) => JSON.stringify(d)),
};

function rule(id: string, cat = 'test'): NormalizedRule {
  return { id, severity: 'MUST', category: cat, title: id, description: id, blocking: true, sourceFile: 'test' };
}

describe('EVIDENCE handler deep debug', () => {
  const evDir = '/core/.harness/evidence';
  const ctx: WorkspaceEvaluationContext = { satellitePath: '/sat', corePath: '/core' };

  it('EVD-01 with complete manifest', async () => {
    const manifest = { id: 'ev-001', source: 'cli', generatedAt: 't', producer: 'p', relatedGateId: 'g', sourceRef: 'r', status: 'passed', evaluatedRules: 5, blockingFailures: 0, retentionPeriod: '90d', owner: 'team' };
    const fsMock = createMockFileSystem({
      existing: [evDir],
      dirs: { [evDir]: ['m.json'] },
      files: { [path.join(evDir, 'm.json')]: JSON.stringify(manifest) },
    });
    const evaluator = new NativeEvaluator(fsMock, mockLogger, mockConfigParser);
    const results = await evaluator.evaluateAll([rule('EVD-01')], ctx);
    console.log('EVD-01 result:', results[0].result, results[0].message);
    expect(results[0].result).toBe('passed');
  });
});

describe('CLI-RR handler deep debug', () => {
  const ctx: WorkspaceEvaluationContext = { satellitePath: '/sat', corePath: '/core' };

  it('CLI-RR-02 with dist/main.js', async () => {
    const distDir = path.join('/core', 'src', 'sdk', 'cli', 'dist');
    const fsMock = createMockFileSystem({
      existing: [distDir, path.join(distDir, 'main.js'), path.join(distDir, 'x.spec.js')],
      dirs: { [distDir]: ['main.js', 'x.spec.js'] },
      directories: [distDir],
    });
    const evaluator = new NativeEvaluator(fsMock, mockLogger, mockConfigParser);
    const results = await evaluator.evaluateAll([rule('CLI-RR-02')], ctx);
    console.log('CLI-RR-02 result:', results[0].result, results[0].message);
    expect(results[0].result).toBe('passed');
  });
});

describe('GOV OCB-01 deep debug', () => {
  const sat = '/sat';
  const ctx: WorkspaceEvaluationContext = { satellitePath: sat, corePath: '/core' };

  it('OCB-01 with UNLICENSED package', async () => {
    const pkg = path.join(sat, 'package.json');
    const fsMock = createMockFileSystem({
      existing: [pkg],
      json: { [pkg]: { license: 'UNLICENSED' } },
    });
    const evaluator = new NativeEvaluator(fsMock, mockLogger, mockConfigParser);
    const results = await evaluator.evaluateAll([rule('OCB-01')], ctx);
    console.log('OCB-01 UNLICENSED result:', results[0].result, results[0].message);
    expect(results[0].result).toBe('failed');
  });
});

describe('TAX-05 deep debug', () => {
  const ctx: WorkspaceEvaluationContext = { satellitePath: '/sat', corePath: '/core' };

  it('TAX-05 with all core dirs', async () => {
    const dirs = ['reference', 'rulesets', 'sdk', '.harness'].map(d => path.join('/core', d));
    const fsMock = createMockFileSystem({ existing: dirs });
    const evaluator = new NativeEvaluator(fsMock, mockLogger, mockConfigParser);
    const results = await evaluator.evaluateAll([rule('TAX-05', 'directory-structure')], ctx);
    console.log('TAX-05 result:', results[0].result, results[0].message);
    expect(results[0].result).toBe('passed');
  });

  it('TAX-05 with missing dirs', async () => {
    const fsMock = createMockFileSystem({ existing: [path.join('/core', 'reference')] });
    const evaluator = new NativeEvaluator(fsMock, mockLogger, mockConfigParser);
    const results = await evaluator.evaluateAll([rule('TAX-05', 'directory-structure')], ctx);
    console.log('TAX-05 missing result:', results[0].result, results[0].message);
    expect(results[0].result).toBe('failed');
  });
});

describe('MM-R01 deep debug', () => {
  const ctx: WorkspaceEvaluationContext = { satellitePath: '/sat', corePath: '/core' };

  it('MM-R01 with workspace', async () => {
    const pkg = path.join('/sat', 'package.json');
    const fsMock = createMockFileSystem({
      existing: [pkg],
      json: { [pkg]: { workspaces: ['packages/*'] } },
    });
    const evaluator = new NativeEvaluator(fsMock, mockLogger, mockConfigParser);
    const results = await evaluator.evaluateAll([rule('MM-R01', 'topology')], ctx);
    console.log('MM-R01 workspace result:', results[0].result, results[0].message);
    expect(results[0].result).toBe('failed');
  });

  it('MM-R01 without workspace', async () => {
    const pkg = path.join('/sat', 'package.json');
    const fsMock = createMockFileSystem({
      existing: [pkg],
      json: { [pkg]: {} },
    });
    const evaluator = new NativeEvaluator(fsMock, mockLogger, mockConfigParser);
    const results = await evaluator.evaluateAll([rule('MM-R01', 'topology')], ctx);
    console.log('MM-R01 no-workspace result:', results[0].result, results[0].message);
    expect(results[0].result).toBe('passed');
  });
});

describe('MM-R03 deep debug', () => {
  const ctx: WorkspaceEvaluationContext = { satellitePath: '/sat', corePath: '/core' };

  it('MM-R03 without ports', async () => {
    const fsMock = createMockFileSystem({});
    const evaluator = new NativeEvaluator(fsMock, mockLogger, mockConfigParser);
    const results = await evaluator.evaluateAll([rule('MM-R03', 'hexagonal-architecture')], ctx);
    console.log('MM-R03 no-ports result:', results[0].result, results[0].message);
    expect(results[0].result).toBe('failed');
  });

  it('MM-R03 with ports', async () => {
    const fsMock = createMockFileSystem({ existing: [path.join('/sat', 'src', 'ports')] });
    const evaluator = new NativeEvaluator(fsMock, mockLogger, mockConfigParser);
    const results = await evaluator.evaluateAll([rule('MM-R03', 'hexagonal-architecture')], ctx);
    console.log('MM-R03 with-ports result:', results[0].result, results[0].message);
    expect(results[0].result).toBe('passed');
  });
});
