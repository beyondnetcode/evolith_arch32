import { OpaInputBuilder } from './opa-input-builder';
import type { IFileSystem } from '../../../domain/interfaces';
import type { WorkspaceEvaluationContext } from './evaluator.interface';

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

function makeContext(overrides: Partial<WorkspaceEvaluationContext> = {}): WorkspaceEvaluationContext {
  return {
    satellitePath: '/test/satellite',
    corePath: '/test/core',
    ...overrides,
  } as WorkspaceEvaluationContext;
}

describe('OpaInputBuilder', () => {
  it('can be instantiated', () => {
    const builder = new OpaInputBuilder(mockFs());
    expect(builder).toBeDefined();
  });

  it('has a build method', () => {
    const builder = new OpaInputBuilder(mockFs());
    expect(typeof builder.build).toBe('function');
  });

  it('returns an object with satellite and core sections', async () => {
    const fs = mockFs({
      exists: async () => false,
      readdirNames: async () => [],
      readdir: async () => [],
      readJson: async () => ({}),
    });
    const builder = new OpaInputBuilder(fs);
    const result = await builder.build(makeContext());

    expect(result).toHaveProperty('satellitePath');
    expect(result).toHaveProperty('corePath');
    expect(result).toHaveProperty('satellite');
    expect(result).toHaveProperty('core');
  });

  it('includes satellite path in output', async () => {
    const builder = new OpaInputBuilder(mockFs());
    const result = await builder.build(makeContext({ satellitePath: '/my/satellite' }));
    expect((result as any).satellitePath).toBe('/my/satellite');
  });

  it('includes core path in output', async () => {
    const builder = new OpaInputBuilder(mockFs());
    const result = await builder.build(makeContext({ corePath: '/my/core' }));
    expect((result as any).corePath).toBe('/my/core');
  });

  it('detects package.json existence', async () => {
    const fs = mockFs({
      exists: async (p) => String(p).includes('package.json'),
      readJson: async () => ({ name: 'test-package', version: '1.0.0' }),
      readdirNames: async () => [],
      readdir: async () => [],
    });
    const builder = new OpaInputBuilder(fs);
    const result = await builder.build(makeContext());

    const satellite = (result as any).satellite;
    expect(satellite.hasPackageLock).toBe(false); // package-lock.json not in exists mock
    expect(satellite.packageJson).toEqual({ name: 'test-package', version: '1.0.0' });
  });

  it('detects Dockerfile existence', async () => {
    const fs = mockFs({
      exists: async (p) => String(p).includes('Dockerfile'),
      readdirNames: async () => [],
      readdir: async () => [],
    });
    const builder = new OpaInputBuilder(fs);
    const result = await builder.build(makeContext());

    expect((result as any).satellite.hasDockerfile).toBe(true);
  });

  it('handles missing files gracefully', async () => {
    const fs = mockFs({
      exists: async () => false,
      readdirNames: async () => [],
      readdir: async () => [],
      readJson: async () => ({}),
    });
    const builder = new OpaInputBuilder(fs);
    const result = await builder.build(makeContext());

    expect(result).toBeDefined();
    expect((result as any).satellite.hasDockerfile).toBe(false);
  });
});
