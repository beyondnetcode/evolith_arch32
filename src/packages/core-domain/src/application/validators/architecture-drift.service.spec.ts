import { ArchitectureDriftService, DriftDetectionOptions } from './architecture-drift.service';
import type { IFileSystem, ILogger, IConfigParser } from '../../domain/interfaces';

function mockFs(overrides: Partial<IFileSystem> = {}): IFileSystem {
  return {
    readFile: async () => '',
    readFileBuffer: async () => Buffer.alloc(0),
    writeFile: async () => {},
    exists: async () => false,
    existsSync: () => false,
    readJson: async () => ({}),
    writeJson: async () => {},
    mkdir: async () => {},
    readdir: async () => [],
    readdirNames: async () => [],
    copy: async () => {},
    ensureDir: async () => {},
    ensureFile: async () => {},
    stat: async () => ({ isDirectory: () => false, isFile: () => true }),
    remove: async () => {},
    ...overrides,
  };
}

function mockConfigParser(): IConfigParser {
  return { parse: (s: string) => JSON.parse(s), stringify: (d: unknown) => JSON.stringify(d) };
}

function mockLogger(): ILogger {
  return { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
}

function mockValidator(): any {
  return { validate: async () => ({ passed: true, rulesChecked: 0, issues: [] }) };
}

describe('ArchitectureDriftService', () => {
  it('requires IFileSystem', () => {
    expect(() => new ArchitectureDriftService('/core', {})).toThrow('IFileSystem is required');
  });

  it('requires ILogger', () => {
    expect(() => new ArchitectureDriftService('/core', { fileSystem: mockFs() })).toThrow('ILogger is required');
  });

  it('creates service with required dependencies', () => {
    const service = new ArchitectureDriftService('/core', {
      fileSystem: mockFs(),
      logger: mockLogger(),
      validator: mockValidator(),
      configParser: mockConfigParser(),
    });
    expect(service).toBeDefined();
  });

  it('has detectDrift method', () => {
    const service = new ArchitectureDriftService('/core', {
      fileSystem: mockFs(),
      logger: mockLogger(),
      validator: mockValidator(),
      configParser: mockConfigParser(),
    });
    expect(typeof service.detectDrift).toBe('function');
  });

  it('has getDriftHistory method', () => {
    const service = new ArchitectureDriftService('/core', {
      fileSystem: mockFs(),
      logger: mockLogger(),
      validator: mockValidator(),
      configParser: mockConfigParser(),
    });
    expect(typeof service.getDriftHistory).toBe('function');
  });

  it('has getDriftTrend method', () => {
    const service = new ArchitectureDriftService('/core', {
      fileSystem: mockFs(),
      logger: mockLogger(),
      validator: mockValidator(),
      configParser: mockConfigParser(),
    });
    expect(typeof service.getDriftTrend).toBe('function');
  });

  it('has detectLevelDrift method', () => {
    const service = new ArchitectureDriftService('/core', {
      fileSystem: mockFs(),
      logger: mockLogger(),
      validator: mockValidator(),
      configParser: mockConfigParser(),
    });
    expect(typeof service.detectLevelDrift).toBe('function');
  });
});
