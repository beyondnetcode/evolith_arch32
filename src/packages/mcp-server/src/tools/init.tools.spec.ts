import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { createInitTools } from './init.tools';

/**
 * Real-filesystem-backed {@link IFileSystem} test double. Every mutating call is
 * routed to `node:fs` under an OS temp dir, so the exercised
 * `InitializeProjectUseCase` scaffolding is hermetic (nothing is written outside
 * the temp dir) yet real enough to assert artifacts on disk.
 */
function makeFs(): IFileSystem {
  return {
    readFile: (p) => fs.readFile(p, 'utf-8'),
    readFileBuffer: (p) => fs.readFile(p),
    writeFile: async (p, content) => {
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, content, 'utf-8');
    },
    exists: async (p) => {
      try {
        await fs.access(p);
        return true;
      } catch {
        return false;
      }
    },
    existsSync: () => false,
    readJson: async (p) => JSON.parse(await fs.readFile(p, 'utf-8')),
    writeJson: async (p, content) => {
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, JSON.stringify(content, null, 2), 'utf-8');
    },
    mkdir: async (p) => {
      await fs.mkdir(p, { recursive: true });
    },
    readdir: async () => [],
    readdirNames: async () => [],
    copy: async () => undefined,
    ensureDir: async (p) => {
      await fs.mkdir(p, { recursive: true });
    },
    ensureFile: async (p) => {
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, '', { flag: 'a' });
    },
    stat: async (p) => fs.stat(p),
    remove: async (p) => {
      await fs.rm(p, { recursive: true, force: true });
    },
  } as IFileSystem;
}

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'evolith-init-'));
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

describe('createInitTools — evolith-init-batch', () => {
  it('exposes a single mutative write-scoped tool with the expected schema', () => {
    const tools = createInitTools(makeFs());
    expect(tools).toHaveLength(1);

    const [tool] = tools;
    expect(tool.schema.name).toBe('evolith-init-batch');
    expect(tool.mutative).toBe(true);
    expect(tool.scope).toBe('write');
    expect(tool.schema.inputSchema.required).toEqual(['name']);
    expect(typeof tool.execute).toBe('function');
  });

  it('resolves prompt-free defaults for a minimal (name-only) invocation and scaffolds on disk', async () => {
    const [tool] = createInitTools(makeFs());
    const dir = await tmpDir();

    const res: any = await tool.execute({ path: dir, name: 'AcmeSat' });

    // Every canonical field falls back to its safe default.
    expect(res.input).toMatchObject({
      name: 'AcmeSat',
      runtime: 'nodejs',
      monorepo: 'none',
      architecture: 'clean',
      database: 'postgresql',
      apiProtocol: 'rest',
      ciCd: 'github-actions',
      observability: 'opentelemetry',
      features: [],
      agents: [],
    });

    expect(res.result.success).toBe(true);
    expect(res.result.errors).toEqual([]);
    expect(res.result.artifacts).toEqual(
      expect.arrayContaining([
        'AcmeSat/evolith.yaml',
        'AcmeSat/README.md',
        'AcmeSat/README.es.md',
        'AcmeSat/package.json',
      ]),
    );

    // The delegated use-case really wrote the artifacts under the temp dir.
    expect(await pathExists(path.join(dir, 'AcmeSat', 'evolith.yaml'))).toBe(true);
    expect(await pathExists(path.join(dir, 'AcmeSat', 'package.json'))).toBe(true);
  });

  it('lets individual field arguments override an inline config base and scaffolds feature artifacts', async () => {
    const [tool] = createInitTools(makeFs());
    const dir = await tmpDir();

    const res: any = await tool.execute({
      path: dir,
      // Base config that individual arguments must override.
      config: { name: 'IgnoredName', ciCd: 'gitlab-ci', observability: 'jaeger' },
      name: 'FullSat',
      runtime: 'typescript',
      monorepo: 'nx',
      architecture: 'ddd',
      database: 'mongodb',
      apiProtocol: 'graphql',
      ciCd: 'circleci',
      observability: 'prometheus',
      features: ['adr', 'hooks', 'acl'],
      agents: ['analyst', 'architect'],
    });

    expect(res.input).toMatchObject({
      name: 'FullSat',
      runtime: 'typescript',
      monorepo: 'nx',
      architecture: 'ddd',
      database: 'mongodb',
      apiProtocol: 'graphql',
      ciCd: 'circleci',
      observability: 'prometheus',
      features: ['adr', 'hooks', 'acl'],
      agents: ['analyst', 'architect'],
    });

    expect(res.result.success).toBe(true);
    expect(res.result.artifacts).toEqual(
      expect.arrayContaining([
        'FullSat/reference/architecture/adrs/adr-matrix.json',
        'FullSat/.husky/pre-commit',
        'FullSat/rulesets/acl/anti-corruption-layer.rules.json',
      ]),
    );
    expect(await pathExists(path.join(dir, 'FullSat', '.husky', 'pre-commit'))).toBe(true);
  });

  it('accepts the CLI-style arch/db aliases, honours config precedence and ignores empty / non-array args', async () => {
    const [tool] = createInitTools(makeFs());
    const dir = await tmpDir();

    const res: any = await tool.execute({
      path: dir,
      config: { name: 'ConfigSat', runtime: 'python', features: ['adr'] },
      name: '', // empty string -> str() returns undefined -> config name wins
      arch: 'hexagonal', // alias -> architecture
      db: 'sqlite', // alias -> database
      features: 'not-an-array', // non-array -> arr() undefined -> config features win
    });

    expect(res.input.name).toBe('ConfigSat');
    expect(res.input.runtime).toBe('python');
    expect(res.input.architecture).toBe('hexagonal');
    expect(res.input.database).toBe('sqlite');
    expect(res.input.features).toEqual(['adr']);
    expect(res.result.success).toBe(true);
  });

  it('throws when no project name can be resolved (batch guard)', async () => {
    const [tool] = createInitTools(makeFs());
    const dir = await tmpDir();

    await expect(tool.execute({ path: dir })).rejects.toThrow(
      /Non-interactive init requires a project name/,
    );
  });

  it('propagates a use-case validation failure for an unknown runtime without throwing', async () => {
    const [tool] = createInitTools(makeFs());
    const dir = await tmpDir();

    const res: any = await tool.execute({ path: dir, name: 'BadRuntimeSat', runtime: 'ruby' });

    expect(res.result.success).toBe(false);
    expect(res.result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Runtime ruby not found')]),
    );
    expect(res.result.artifacts).toEqual([]);
  });

  it('defaults the scaffold cwd to process.cwd() when no path argument is supplied', async () => {
    const [tool] = createInitTools(makeFs());
    const dir = await tmpDir();
    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(dir);

    try {
      const res: any = await tool.execute({ name: 'CwdSat' });
      expect(res.result.success).toBe(true);
      expect(await pathExists(path.join(dir, 'CwdSat', 'evolith.yaml'))).toBe(true);
    } finally {
      cwdSpy.mockRestore();
    }
  });
});
