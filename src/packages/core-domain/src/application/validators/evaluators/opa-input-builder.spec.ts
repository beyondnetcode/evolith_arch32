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

/**
 * GT-694 — the satellite facet was disk-only, with no way for a caller to supply a
 * fact the Core cannot observe.
 *
 * Measured 2026-08-15: 14 facets that shipped OPA input schemas REQUIRE are never
 * emitted here, across 13 categories, so every one of them failed input-schema
 * validation and never reached its policy. `multi-tenancy` returned the literal
 * `OPA Input Schema Validation Failed: data/satellite must have required property
 * 'multiTenancy'` instead of a verdict.
 *
 * Most of those facts are not the Core's to derive. Whether a CI pipeline requires
 * a review before merge, whether tenant filtering is applied, what the DORA numbers
 * are — none of that is visible in a directory listing, and `ADR-0101` makes the
 * Core a stateless engine that receives its context rather than one that goes
 * looking. The gap was therefore not "write 13 collectors": it was that the channel
 * for supplying them stopped at the top level of the input document.
 *
 * PRECEDENCE IS DELIBERATE AND ASYMMETRIC: what the Core OBSERVED on disk beats what
 * a caller DECLARED. A satellite that says it has no lockfile while a lockfile sits
 * in the tree must not be believed — that is `GT-683`'s lesson applied to the input
 * side rather than re-learned later.
 */
describe('a caller can supply satellite facts the Core cannot observe · GT-694', () => {
  it('merges facts.satellite into input.satellite', async () => {
    const input = (await new OpaInputBuilder(mockFs()).build(
      makeContext({ facts: { satellite: { multiTenancy: { applicationFiltering: false } } } } as any),
    )) as any;

    expect(input.satellite.multiTenancy).toEqual({ applicationFiltering: false });
  });

  it('does NOT let a declared fact overwrite one the Core observed', async () => {
    const withLockfile = mockFs({ exists: async (p: string) => p.endsWith('package-lock.json') });

    const input = (await new OpaInputBuilder(withLockfile).build(
      makeContext({ facts: { satellite: { hasPackageLock: false } } } as any),
    )) as any;

    // The lockfile is on disk. A caller claiming otherwise is not believed.
    expect(input.satellite.hasPackageLock).toBe(true);
  });

  it('is byte-identical to the disk-only build when no satellite facts are supplied', async () => {
    const before = await new OpaInputBuilder(mockFs()).build(makeContext());
    const after = await new OpaInputBuilder(mockFs()).build(makeContext({ facts: { tenantId: 't1' } } as any));

    expect((after as any).satellite).toEqual((before as any).satellite);
  });
});

/**
 * GT-694 — `governance.files` is the one dead facet the Core can honestly observe.
 *
 * `governance.rego` builds `{file | file := input.satellite.files[_]}` and asks
 * whether `DECISIONS.md` is among them (INH-04, INH-06). That is a top-level file
 * listing and nothing more, so asking a caller to declare it would be asking them
 * to tell us what is already in front of us.
 *
 * The sibling facets were classified `supplied` instead, and `layers` is the reason
 * the line is drawn here: `hexagonal-architecture.rego` wants
 * `core.hasFrameworkImports`, `application.hasInfrastructureImports` and
 * `hasBackwardImports` — real static analysis. Hand-rolling that in an input builder
 * would produce confident wrong verdicts, which is worse than a category that says
 * it cannot run.
 */
describe('the Core observes the files it can see · GT-694', () => {
  it('collects top-level FILE names, not directories', async () => {
    // Scoped to the satellite root: an `exists`/`readdirNames` that answers for
    // EVERY path makes the recursive source-file walk infinite.
    const ROOT = '/test/satellite';
    const fs = mockFs({
      exists: async (p: string) => p === ROOT,
      readdirNames: async (p: string) => (p === ROOT ? ['DECISIONS.md', 'src', 'package.json'] : []),
      stat: async (p: string) =>
        ({ isDirectory: () => p === `${ROOT}/src`, isFile: () => p !== `${ROOT}/src` }) as any,
    });

    const input = (await new OpaInputBuilder(fs).build(makeContext())) as any;

    expect(input.satellite.files).toEqual(['DECISIONS.md', 'package.json']);
    // …and the directory listing is unchanged, so the two are not conflated.
    expect(input.satellite.directories).toEqual(['src']);
  });

  it('is an empty array, never absent, for a satellite with no files', async () => {
    const fs = mockFs({ exists: async (p: string) => p === '/test/satellite', readdirNames: async () => [] });
    const input = (await new OpaInputBuilder(fs).build(makeContext())) as any;

    // Absent and empty are different things to a Rego comprehension: an absent key
    // makes the rule undefined rather than false.
    expect(input.satellite.files).toEqual([]);
  });
});
