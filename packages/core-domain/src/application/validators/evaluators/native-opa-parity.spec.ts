import * as path from 'path';
import * as fs from 'fs';
import { NativeEvaluator } from './native-evaluator';
import { EvaluationContext } from './evaluator.interface';
import { NormalizedRule } from '../../domain/models/normalized-rule';
import { IFileSystem, IConfigParser, ILogger } from '../../domain/interfaces';

interface LegacyScenario {
  filesystem: {
    existing?: string[];
    dirs?: Record<string, string[]>;
    files?: Record<string, string>;
    json?: Record<string, unknown>;
    directories?: string[];
  };
  context: EvaluationContext;
  expectedResults: Array<{ ruleId: string; result: string; severity?: string }>;
}

interface LegacyFixture {
  domain: string;
  rules: NormalizedRule[];
  scenarios: Record<string, LegacyScenario>;
}

interface NewFixtureExpected {
  ruleId: string;
  severity: string;
  result: string;
}

interface NewFixture {
  domain: string;
  input: {
    satellitePath: string;
    corePath: string;
    existingFiles: string[];
    fileContents: Record<string, string>;
  };
  expectedNative: NewFixtureExpected[];
}

function createLegacyFs(cfg: LegacyScenario['filesystem']): IFileSystem {
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

function createNewFs(input: NewFixture['input']): IFileSystem {
  const existing = new Set(input.existingFiles);
  const files = input.fileContents;
  const directories = new Set<string>();
  for (const f of input.existingFiles) {
    if (f.endsWith('/')) directories.add(f.slice(0, -1));
  }
  return {
    exists: jest.fn(async (p: string) => existing.has(p) || directories.has(p)),
    existsSync: jest.fn((p: string) => existing.has(p)),
    readFile: jest.fn(async (p: string) => files[p] ?? ''),
    readJson: jest.fn(async (p: string) => {
      if (files[p] !== undefined) return JSON.parse(files[p]);
      return {};
    }),
    readdirNames: jest.fn(async (p: string) => {
      const prefix = p.endsWith('/') ? p : p + '/';
      const entries: string[] = [];
      for (const f of existing) {
        if (f.startsWith(prefix) && f !== p) {
          const remainder = f.slice(prefix.length);
          const firstSlash = remainder.indexOf('/');
          const entry = firstSlash === -1 ? remainder : remainder.slice(0, firstSlash);
          if (!entries.includes(entry)) entries.push(entry);
        }
      }
      return entries;
    }),
    readdir: jest.fn(async (p: string) => {
      const prefix = p.endsWith('/') ? p : p + '/';
      const names: string[] = [];
      for (const f of existing) {
        if (f.startsWith(prefix) && f !== p) {
          const remainder = f.slice(prefix.length);
          const firstSlash = remainder.indexOf('/');
          const entry = firstSlash === -1 ? remainder : remainder.slice(0, firstSlash);
          if (!names.includes(entry)) names.push(entry);
        }
      }
      return names.map(n => ({
        name: n,
        isDirectory: () => directories.has(path.join(p, n)),
        isFile: () => !directories.has(path.join(p, n)),
      }));
    }),
    stat: jest.fn(async (p: string) => ({
      isDirectory: () => directories.has(p),
      isFile: () => existing.has(p),
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
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockConfigParser: IConfigParser = {
  parse: jest.fn((content: string) => {
    try { return JSON.parse(content); } catch {
      try { const yaml = require('yaml'); return yaml.parse(content); } catch { return {}; }
    }
  }),
  stringify: jest.fn((data: unknown) => JSON.stringify(data)),
};

function ruleFromExpected(exp: NewFixtureExpected): NormalizedRule {
  return {
    id: exp.ruleId,
    severity: exp.severity as NormalizedRule['severity'],
    category: 'parity-fixture',
    title: `Parity fixture rule ${exp.ruleId}`,
    description: `Parity fixture for ${exp.ruleId}`,
    blocking: true,
    sourceFile: 'parity-fixture',
  };
}

const fixturesDir = path.resolve(__dirname, '..', '..', '..', '..', 'test', 'parity-fixtures');

describe('Native Evaluator Parity (GT-229)', () => {
  const fixtureFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.fixture.json'));

  describe('new-format fixtures', () => {
    for (const fixtureFile of fixtureFiles) {
      const raw: unknown = JSON.parse(
        fs.readFileSync(path.join(fixturesDir, fixtureFile), 'utf-8'),
      );
      if ('expectedNative' in (raw as Record<string, unknown>)) {
        const fixture = raw as NewFixture;

        it(`parity fixture: ${fixture.domain}`, async () => {
          const mockFs = createNewFs(fixture.input);
          const evaluator = new NativeEvaluator(mockFs, mockLogger, mockConfigParser);

          const ctx: EvaluationContext = {
            satellitePath: fixture.input.satellitePath,
            corePath: fixture.input.corePath,
          };

          const rules = fixture.expectedNative.map(ruleFromExpected);
          const results = await evaluator.evaluateAll(rules, ctx);

          expect(results.length).toBe(fixture.expectedNative.length);

          for (const expected of fixture.expectedNative) {
            const actual = results.find(r => r.rule.id === expected.ruleId);
            expect(actual).toBeDefined();
            expect(actual!.rule.id).toBe(expected.ruleId);
            expect(actual!.result).toBe(expected.result);
          }
        });
      }
    }
  });

  describe('legacy-format fixtures', () => {
    for (const fixtureFile of fixtureFiles) {
      const raw: unknown = JSON.parse(
        fs.readFileSync(path.join(fixturesDir, fixtureFile), 'utf-8'),
      );
      if ('rules' in (raw as Record<string, unknown>) && 'scenarios' in (raw as Record<string, unknown>)) {
        const fixture = raw as LegacyFixture;

        describe(fixture.domain, () => {
          for (const [scenarioName, scenario] of Object.entries(fixture.scenarios)) {
            it(`${scenarioName}: native evaluator matches expected verdicts`, async () => {
              const fsMock = createLegacyFs(scenario.filesystem);
              const evaluator = new NativeEvaluator(fsMock, mockLogger, mockConfigParser);

              const results = await evaluator.evaluateAll(fixture.rules, scenario.context);

              expect(results.length).toBe(fixture.rules.length);

              for (const expected of scenario.expectedResults) {
                const actual = results.find(r => r.rule.id === expected.ruleId);
                expect(actual).toBeDefined();
                expect(actual!.result).toBe(expected.result);

                if (expected.severity) {
                  expect(actual!.rule.severity).toBe(expected.severity);
                }
              }
            });
          }
        });
      }
    }
  });

  describe('fixture integrity', () => {
    it('all fixture files are valid JSON with domain field', () => {
      const files = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.fixture.json'));
      expect(files.length).toBeGreaterThan(0);

      for (const f of files) {
        const content = fs.readFileSync(path.join(fixturesDir, f), 'utf8');
        const parsed = JSON.parse(content);
        expect(parsed.domain).toBeDefined();
        const isNew = 'expectedNative' in parsed;
        const isLegacy = 'rules' in parsed && 'scenarios' in parsed;
        expect(isNew || isLegacy).toBe(true);
      }
    });
  });
});
