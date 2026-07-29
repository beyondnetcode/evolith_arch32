/**
 * GT-595 follow-on — `evolith init` must produce a repository that can pass its
 * own governance on the first run.
 *
 * GIT-08 gained a real handler in the config-shaped slice, and the first thing it
 * reported was that the scaffold mandates Conventional Commits and enforces them
 * with nothing. These tests assert the three legs GIT-08's handler actually reads
 * — config, installed package, and something that runs it — rather than just
 * "a file was written".
 *
 * The sibling half of that finding, MTN-05, is deliberately NOT here: it is not a
 * scaffold gap. See `rule-applicability.integration.spec.ts`.
 */

import { IFileSystem } from '../../domain/interfaces';
import { InitializeProjectUseCase } from './initialize-project.use-case';

const catalogLoader = {
  loadRuntimeCatalog: () => [{ id: 'typescript' }, { id: 'python' }, { id: 'dotnet' }],
  getMonorepoOptions: () => [{ id: 'nx' }],
  getArchitecturePatterns: () => [{ id: 'clean' }],
} as any;

/** A real in-memory tree: the devDependency merge needs write→read to round-trip. */
function memoryFs() {
  const files = new Map<string, string>();
  const dirs = new Set<string>();
  const fs = {
    files,
    dirs,
    exists: async (p: string) => files.has(p) || dirs.has(p),
    existsSync: (p: string) => files.has(p) || dirs.has(p),
    readFile: async (p: string) => {
      const content = files.get(p);
      if (content === undefined) throw new Error(`ENOENT: ${p}`);
      return content;
    },
    readJson: async (p: string) => JSON.parse(await fs.readFile(p)),
    writeFile: async (p: string, content: string) => { files.set(p, content); },
    writeJson: async (p: string, content: unknown) => { files.set(p, JSON.stringify(content, null, 2)); },
    ensureDir: async (p: string) => { dirs.add(p); },
    readdir: async () => [],
    readdirNames: async () => [],
    stat: async () => ({ isDirectory: () => false, isFile: () => true }),
    remove: async (p: string) => { files.delete(p); },
  };
  return fs as unknown as IFileSystem & typeof fs;
}

const INPUT = {
  name: 'my-sat',
  runtime: 'typescript',
  monorepo: 'nx',
  architecture: 'clean',
  database: 'postgres',
  apiProtocol: 'rest',
  ciCd: 'github-actions',
  observability: 'otel',
  features: ['adr', 'hooks', 'acl'],
  agents: [],
};

async function init(overrides: Partial<typeof INPUT> = {}) {
  const fs = memoryFs();
  const result = await new InitializeProjectUseCase(fs, catalogLoader).execute(
    { ...INPUT, ...overrides } as any,
    '/tmp',
  );
  expect(result.success).toBe(true);
  return { fs, result, root: `/tmp/${(overrides.name ?? INPUT.name)}` };
}

describe('InitializeProjectUseCase · GIT-08 — the scaffold enforces what it mandates', () => {
  it('writes a commitlint config carrying the commit types GIT-08 names', async () => {
    const { fs, root } = await init();

    const config = fs.files.get(`${root}/commitlint.config.mjs`);
    expect(config).toBeDefined();
    expect(config).toContain('@commitlint/config-conventional');
    // GIT-08's own `pattern` enumerates exactly these seven.
    for (const type of ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore']) {
      expect(config).toContain(`"${type}"`);
    }
  });

  it('declares the commitlint package, because a config nothing installs cannot run', async () => {
    // This is the GT-623 failure mode the handler encodes: a check that is
    // present, absent from node_modules, and therefore passes by shrugging.
    const { fs, root } = await init();

    const pkg = JSON.parse(fs.files.get(`${root}/package.json`)!);
    expect(pkg.devDependencies['@commitlint/cli']).toBeDefined();
    expect(pkg.devDependencies['@commitlint/config-conventional']).toBeDefined();
  });

  it('merges into the runtime scaffold\'s devDependencies instead of replacing them', async () => {
    const { fs, root } = await init();

    const pkg = JSON.parse(fs.files.get(`${root}/package.json`)!);
    expect(pkg.devDependencies.typescript).toBe('^5.0.0');
    expect(pkg.devDependencies.jest).toBe('^29.0.0');
    expect(pkg.name).toBe('my-sat');
  });

  it('installs a commit-msg hook that FAILS when commitlint is missing, never skips', async () => {
    const { fs, root } = await init();

    const hook = fs.files.get(`${root}/.husky/commit-msg`);
    expect(hook).toBeDefined();
    expect(hook).toContain('commitlint --edit');
    // `--no-install` is the whole point: without it npx would fetch-or-skip and
    // the hook would exit zero on a repository with no commitlint at all.
    expect(hook).toContain('--no-install');
    expect(hook).not.toMatch(/else/);
  });

  it('reports every artifact it wrote, exactly once', async () => {
    const { result } = await init();

    expect(result.artifacts).toContain('my-sat/commitlint.config.mjs');
    expect(result.artifacts).toContain('my-sat/.husky/commit-msg');
    expect(result.artifacts.filter(a => a === 'my-sat/package.json')).toHaveLength(1);
  });

  it('says so when nothing will run the config, rather than pretending it is enforced', async () => {
    const { fs, result, root } = await init({ features: ['adr'] });

    expect(fs.files.has(`${root}/commitlint.config.mjs`)).toBe(true);
    expect(fs.files.has(`${root}/.husky/commit-msg`)).toBe(false);
    expect(result.warnings.join('\n')).toMatch(/hooks.*not selected|not selected.*hook/i);
  });

  it('does not warn when the hook is installed', async () => {
    const { result } = await init();
    expect(result.warnings.join('\n')).not.toMatch(/commitlint/i);
  });

  it.each(['python', 'dotnet'])(
    'gives a %s satellite the tooling package.json GIT-08 reads',
    async (runtime) => {
      // commitlint is a Node tool; a polyglot repo that adopts it carries a
      // tooling-only package.json. Emitting the config without one would leave
      // GIT-08 failing for every runtime that is not Node.
      const { fs, root } = await init({ runtime, features: ['adr'] });

      expect(fs.files.has(`${root}/commitlint.config.mjs`)).toBe(true);
      const pkg = JSON.parse(fs.files.get(`${root}/package.json`)!);
      expect(pkg.private).toBe(true);
      expect(pkg.devDependencies['@commitlint/cli']).toBeDefined();
    },
  );
});
