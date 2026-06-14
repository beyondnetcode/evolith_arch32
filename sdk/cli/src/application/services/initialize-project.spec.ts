/**
 * Unit tests for InitializeProjectUseCase — covers all catalog runtimes
 * (nodejs, typescript, dotnet, python) plus the generic fallback path.
 */

import { InitializeProjectUseCase, InitProjectInput } from './index';

// ── mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../../infrastructure/catalog/catalog-loader', () => ({
  CatalogLoader: jest.fn().mockImplementation(() => ({
    loadRuntimeCatalog: jest.fn(() => [
      { id: 'nodejs',     name: 'Node.js',    defaultVersion: '20.x', language: 'JavaScript', databases: [{ id: 'postgresql', name: 'PostgreSQL', orm: 'TypeORM' }] },
      { id: 'typescript', name: 'TypeScript', defaultVersion: '5.x',  language: 'TypeScript', databases: [{ id: 'postgresql', name: 'PostgreSQL', orm: 'TypeORM' }] },
      { id: 'dotnet',     name: '.NET',       defaultVersion: '8.x',  language: 'C#',         databases: [{ id: 'sqlserver', name: 'SQL Server', orm: 'EF Core' }] },
      { id: 'python',     name: 'Python',     defaultVersion: '3.12', language: 'Python',     databases: [{ id: 'postgresql', name: 'PostgreSQL', orm: 'SQLAlchemy' }] },
      { id: 'java',       name: 'Java',       defaultVersion: '21',   language: 'Java',       databases: [{ id: 'postgresql', name: 'PostgreSQL', orm: 'Hibernate' }] },
    ]),
    getMonorepoOptions: jest.fn(() => [
      { id: 'none', name: 'None', description: 'No monorepo' },
    ]),
    getArchitecturePatterns: jest.fn(() => [
      { id: 'clean', name: 'Clean Architecture', description: '' },
    ]),
    getDefaultDatabase: jest.fn(() => 'postgresql'),
    getApiProtocols: jest.fn(() => [{ id: 'rest', name: 'REST', description: '' }]),
  }))
}));

jest.mock('../../infrastructure/cli/providers', () => ({
  npmProvider:    { isAvailable: jest.fn().mockResolvedValue(true) },
  dotnetProvider: { isAvailable: jest.fn().mockResolvedValue(true) },
  pythonProvider: { isAvailable: jest.fn().mockResolvedValue(true) },
  nxProvider:     { isAvailable: jest.fn().mockResolvedValue(true) },
}));

jest.mock('../../infrastructure/observability', () => ({
  logger:         { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  Timed:          () => (_t: unknown, _k: unknown, desc: PropertyDescriptor) => desc,
  commandWatcher: { trackStart: jest.fn(), trackEnd: jest.fn() },
  errorReporter:  { report: jest.fn(), printSummary: jest.fn() },
  OperationTimer: jest.fn(() => ({ start: jest.fn(), end: jest.fn().mockReturnValue(0) })),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

function makeFs() {
  return {
    ensureDir:  jest.fn().mockResolvedValue(undefined),
    writeFile:  jest.fn().mockResolvedValue(undefined),
    writeJson:  jest.fn().mockResolvedValue(undefined),
    readJson:   jest.fn().mockResolvedValue({}),
    exists:     jest.fn().mockResolvedValue(false),
    existsSync: jest.fn().mockReturnValue(false),
    readFile:   jest.fn().mockResolvedValue(''),
  };
}

function makeInput(overrides: Partial<InitProjectInput> = {}): InitProjectInput {
  return {
    name:         'my-project',
    runtime:      'nodejs',
    monorepo:     'none',
    architecture: 'clean',
    database:     'postgresql',
    apiProtocol:  'rest',
    ciCd:         'github',
    observability:'minimal',
    features:     [],
    agents:       [],
    ...overrides,
  };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('InitializeProjectUseCase', () => {

  // ── nodejs / typescript ────────────────────────────────────────────────────

  describe('nodejs runtime', () => {
    it('returns success and creates evolith.yaml + README', async () => {
      const fs = makeFs();
      const uc = new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)());
      const result = await uc.execute(makeInput({ runtime: 'nodejs' }), '/tmp');
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.artifacts).toContain('my-project/evolith.yaml');
      expect(result.artifacts).toContain('my-project/README.md');
    });

    it('writes package.json for nodejs', async () => {
      const fs = makeFs();
      await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(makeInput({ runtime: 'nodejs' }), '/tmp');
      const writeJsonCalls = fs.writeJson.mock.calls.map((c: unknown[]) => c[0]);
      expect(writeJsonCalls.some((p: string) => p.endsWith('package.json'))).toBe(true);
    });

    it('writes tsconfig.json for typescript', async () => {
      const fs = makeFs();
      await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(makeInput({ runtime: 'typescript' }), '/tmp');
      const writeJsonCalls = fs.writeJson.mock.calls.map((c: unknown[]) => c[0]);
      expect(writeJsonCalls.some((p: string) => p.endsWith('tsconfig.json'))).toBe(true);
    });

    it('does NOT write tsconfig.json for plain nodejs', async () => {
      const fs = makeFs();
      await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(makeInput({ runtime: 'nodejs' }), '/tmp');
      const writeJsonCalls = fs.writeJson.mock.calls.map((c: unknown[]) => c[0]);
      expect(writeJsonCalls.some((p: string) => p.endsWith('tsconfig.json'))).toBe(false);
    });
  });

  // ── dotnet ─────────────────────────────────────────────────────────────────

  describe('dotnet runtime', () => {
    it('returns success', async () => {
      const fs = makeFs();
      const result = await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(makeInput({ runtime: 'dotnet' }), '/tmp');
      expect(result.success).toBe(true);
    });

    it('writes a .csproj file', async () => {
      const fs = makeFs();
      await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(makeInput({ runtime: 'dotnet' }), '/tmp');
      const writeFileCalls = fs.writeFile.mock.calls.map((c: unknown[]) => c[0]);
      expect(writeFileCalls.some((p: string) => p.endsWith('.csproj'))).toBe(true);
    });
  });

  // ── python ─────────────────────────────────────────────────────────────────

  describe('python runtime', () => {
    it('returns success', async () => {
      const fs = makeFs();
      const result = await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(makeInput({ runtime: 'python' }), '/tmp');
      expect(result.success).toBe(true);
    });

    it('writes requirements.txt', async () => {
      const fs = makeFs();
      await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(makeInput({ runtime: 'python' }), '/tmp');
      const writeFileCalls = fs.writeFile.mock.calls.map((c: unknown[]) => c[0]);
      expect(writeFileCalls.some((p: string) => p.endsWith('requirements.txt'))).toBe(true);
    });

    it('writes pyproject.toml', async () => {
      const fs = makeFs();
      await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(makeInput({ runtime: 'python' }), '/tmp');
      const writeJsonCalls = fs.writeJson.mock.calls.map((c: unknown[]) => c[0]);
      expect(writeJsonCalls.some((p: string) => p.endsWith('pyproject.toml'))).toBe(true);
    });
  });

  // ── generic fallback (P3-C) ────────────────────────────────────────────────

  describe('generic fallback for unknown runtimes', () => {
    it('returns success instead of throwing', async () => {
      const fs = makeFs();
      const result = await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(
        makeInput({ runtime: 'java' }), '/tmp',
      );
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('creates src/ directory', async () => {
      const fs = makeFs();
      await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(makeInput({ runtime: 'java' }), '/tmp');
      const ensureDirCalls = fs.ensureDir.mock.calls.map((c: unknown[]) => c[0]);
      expect(ensureDirCalls.some((p: string) => p.endsWith('/src'))).toBe(true);
    });

    it('writes SETUP.md with runtime name and next steps', async () => {
      const fs = makeFs();
      await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(makeInput({ runtime: 'java' }), '/tmp');
      const writeFileCalls: Array<[string, string]> = fs.writeFile.mock.calls;
      const setupCall = writeFileCalls.find(([p]) => p.endsWith('SETUP.md'));
      expect(setupCall).toBeDefined();
      expect(setupCall![1]).toContain('java');
      expect(setupCall![1]).toContain('evolith validate');
    });

    it('includes runtime name in SETUP.md capitalised scaffold method hint', async () => {
      const fs = makeFs();
      await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(makeInput({ runtime: 'java' }), '/tmp');
      const writeFileCalls: Array<[string, string]> = fs.writeFile.mock.calls;
      const setupCall = writeFileCalls.find(([p]) => p.endsWith('SETUP.md'));
      expect(setupCall![1]).toContain('scaffoldJava');
    });

    it('adds platform warning to result.warnings for unknown runtime', async () => {
      const fs = makeFs();
      const result = await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(
        makeInput({ runtime: 'java' }), '/tmp',
      );
      expect(result.warnings.some(w => w.includes('java'))).toBe(true);
    });

    it('installHint mentions the runtime (java is in catalog but has no provider)', async () => {
      const fs = makeFs();
      const result = await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(
        makeInput({ runtime: 'java' }), '/tmp',
      );
      // checkRuntimePlatform default returns installHint with runtime name
      expect(result.warnings.some(w => w.includes('java'))).toBe(true);
    });
  });

  // ── optional features ──────────────────────────────────────────────────────

  describe('optional features', () => {
    it('creates ADR matrix when feature adr is selected', async () => {
      const fs = makeFs();
      await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(
        makeInput({ features: ['adr'] }), '/tmp',
      );
      const writeJsonCalls = fs.writeJson.mock.calls.map((c: unknown[]) => c[0]);
      expect(writeJsonCalls.some((p: string) => p.includes('adr-matrix'))).toBe(true);
    });

    it('creates husky pre-commit hook when hooks feature selected', async () => {
      const fs = makeFs();
      await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(
        makeInput({ features: ['hooks'] }), '/tmp',
      );
      const writeFileCalls = fs.writeFile.mock.calls.map((c: unknown[]) => c[0]);
      expect(writeFileCalls.some((p: string) => p.includes('pre-commit'))).toBe(true);
    });

    it('creates ACL ruleset when acl feature selected', async () => {
      const fs = makeFs();
      await new InitializeProjectUseCase(fs, new (require("../../infrastructure/catalog/catalog-loader").CatalogLoader)()).execute(
        makeInput({ features: ['acl'] }), '/tmp',
      );
      const writeJsonCalls = fs.writeJson.mock.calls.map((c: unknown[]) => c[0]);
      expect(writeJsonCalls.some((p: string) => p.includes('anti-corruption-layer'))).toBe(true);
    });
  });

  // ── validation errors ─────────────────────────────────────────────────────

  describe('catalog validation', () => {
    it('returns failure when runtime not in catalog', async () => {
      const { CatalogLoader } = require('../../infrastructure/catalog/catalog-loader');
      const catalogLoader = new CatalogLoader();
      (catalogLoader.loadRuntimeCatalog as jest.Mock).mockReturnValueOnce([]);
      const fs = makeFs();
      const result = await new InitializeProjectUseCase(fs, catalogLoader).execute(
        makeInput({ runtime: 'nodejs' }), '/tmp',
      );
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('nodejs not found');
    });

    it('returns failure when monorepo not in catalog', async () => {
      const { CatalogLoader } = require('../../infrastructure/catalog/catalog-loader');
      const catalogLoader = new CatalogLoader();
      (catalogLoader.getMonorepoOptions as jest.Mock).mockReturnValueOnce([]);
      const fs = makeFs();
      const result = await new InitializeProjectUseCase(fs, catalogLoader).execute(
        makeInput({ monorepo: 'none' }), '/tmp',
      );
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('none not found');
    });

    it('returns failure when architecture not in catalog', async () => {
      const { CatalogLoader } = require('../../infrastructure/catalog/catalog-loader');
      const catalogLoader = new CatalogLoader();
      (catalogLoader.getArchitecturePatterns as jest.Mock).mockReturnValueOnce([]);
      const fs = makeFs();
      const result = await new InitializeProjectUseCase(fs, catalogLoader).execute(
        makeInput({ architecture: 'clean' }), '/tmp',
      );
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('clean not found');
    });
  });
});
