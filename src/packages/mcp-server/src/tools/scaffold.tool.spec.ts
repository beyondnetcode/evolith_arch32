import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Mock `node:child_process` so the embedded NodeCommandExecutor never spawns a
 * real process. `scaffold.tool.ts` builds `promisify(exec)` / `promisify(execFile)`
 * at module load, so we attach a `util.promisify.custom` implementation to both
 * mocks: promisify returns it directly. Behaviour is switched per-test through a
 * global flag (jest.mock factories cannot close over test-scoped variables).
 * The strategy runs shell-free, so `execFile` is the one that actually fires;
 * every invocation is recorded in `__EVOLITH_EXEC_CALLS__` for the argv assertions.
 */
jest.mock('node:child_process', () => {
  const util = require('node:util') as typeof import('node:util');
  const respond = (shown: string) => {
    const mode = (globalThis as any).__EVOLITH_EXEC_MODE__ ?? 'ok';
    if (mode === 'fail') {
      return Promise.reject(
        Object.assign(new Error('spawn boom'), { stdout: '', stderr: 'nx exploded', code: 2 }),
      );
    }
    return Promise.resolve({ stdout: `ran: ${shown}`, stderr: '' });
  };
  const exec: any = jest.fn();
  exec[util.promisify.custom] = (command: string) => respond(command);
  const execFile: any = jest.fn();
  execFile[util.promisify.custom] = (file: string, args: string[]) => {
    const calls = ((globalThis as any).__EVOLITH_EXEC_CALLS__ ??= []) as Array<{ file: string; args: string[] }>;
    calls.push({ file, args });
    return respond([file, ...args].join(' '));
  };
  return { exec, execFile };
});

// Imported AFTER jest.mock so the mocked child_process is in place.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { createScaffoldTools } from './scaffold.tool';

function setExecMode(mode: 'ok' | 'fail'): void {
  (globalThis as any).__EVOLITH_EXEC_MODE__ = mode;
}

function execCalls(): Array<{ file: string; args: string[] }> {
  return ((globalThis as any).__EVOLITH_EXEC_CALLS__ ?? []) as Array<{ file: string; args: string[] }>;
}

async function tmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'evolith-scaffold-'));
}

describe('createScaffoldTools — evolith-scaffold', () => {
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    setExecMode('ok');
    // Progress messages are routed to stderr; silence them for clean test output.
    stderrSpy = jest.spyOn(process.stderr, 'write').mockReturnValue(true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    delete (globalThis as any).__EVOLITH_EXEC_MODE__;
    delete (globalThis as any).__EVOLITH_EXEC_CALLS__;
  });

  it('exposes a single mutative write-scoped tool with the expected schema', () => {
    const tools = createScaffoldTools();
    expect(tools).toHaveLength(1);

    const [tool] = tools;
    expect(tool.schema.name).toBe('evolith-scaffold');
    expect(tool.mutative).toBe(true);
    expect(tool.scope).toBe('write');
    expect(tool.schema.inputSchema.required).toEqual(['frontend', 'orm', 'phase']);
    expect(typeof tool.execute).toBe('function');
  });

  it('reports the planned phase-1 (modular-monolith) commands on a dry run without spawning', async () => {
    const [tool] = createScaffoldTools();
    const dir = await tmpDir();

    const res: any = await tool.execute({
      path: dir,
      frontend: 'react',
      orm: 'typeorm',
      phase: '1',
      dryRun: true,
    });

    expect(res).toEqual({
      status: 'dry-run',
      frontendFramework: 'react',
      orm: 'typeorm',
      phase: '1',
      apiName: 'tracker-api',
      domains: [],
      baseDir: dir,
    });
  });

  it('handles a phase-2 dry run with a progressive-axis id, array remotes and a comma-separated domains string', async () => {
    const [tool] = createScaffoldTools();
    const dir = await tmpDir();

    const res: any = await tool.execute({
      path: dir,
      frontend: 'angular',
      orm: 'prisma',
      phase: 'distributed-modules',
      apiName: 'orders-api',
      hostName: 'shell-host',
      remotes: ['catalog', 'checkout'],
      domains: 'sales, billing , ,fulfilment',
      dryRun: true,
    });

    expect(res).toMatchObject({
      status: 'dry-run',
      frontendFramework: 'angular',
      orm: 'prisma',
      phase: '2',
      apiName: 'orders-api',
      // parseList trims entries and drops empty tokens.
      domains: ['sales', 'billing', 'fulfilment'],
      baseDir: dir,
    });
  });

  it('actually drives the Nx strategy end-to-end when not a dry run (commands mocked)', async () => {
    setExecMode('ok');
    const [tool] = createScaffoldTools();
    const dir = await tmpDir();

    const res: any = await tool.execute({
      path: dir,
      frontend: 'react',
      orm: 'typeorm',
      phase: 'modular-monolith',
      webAppName: 'web-spa',
      domains: ['identity'],
      dryRun: false,
    });

    expect(res).toMatchObject({
      status: 'scaffolded',
      frontendFramework: 'react',
      orm: 'typeorm',
      phase: '1',
      apiName: 'tracker-api',
      domains: ['identity'],
      baseDir: dir,
    });

    // CWE-78: every command goes out as argv through execFile — never a shell line.
    const calls = execCalls();
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((c) => c.file === 'npx' || c.file === 'npm')).toBe(true);
    expect(calls).toContainEqual({
      file: 'npx',
      args: ['nx', 'g', '@nx/react:app', '--name=web-spa', '--directory=apps/web-spa', '--no-interactive'],
    });
    expect(calls).toContainEqual({
      file: 'npx',
      args: ['nx', 'g', '@nx/nest:library', '--name=identity', '--directory=libs/domain/identity', '--no-interactive'],
    });
  });

  it('refuses a caller-supplied name that is not a plain identifier before spawning anything', async () => {
    const [tool] = createScaffoldTools();
    const dir = await tmpDir();

    await expect(
      tool.execute({
        path: dir,
        frontend: 'react',
        orm: 'typeorm',
        phase: '1',
        apiName: 'api; rm -rf /',
        dryRun: false,
      }),
    ).rejects.toThrow(/Invalid API app name/);
    expect(execCalls().filter((c) => c.args.includes('g'))).toHaveLength(0);

    await expect(
      tool.execute({
        path: dir,
        frontend: 'react',
        orm: 'typeorm',
        phase: '2',
        remotes: ['catalog', '../../escape'],
        dryRun: false,
      }),
    ).rejects.toThrow(/Invalid remote name/);
  });

  it('surfaces a command failure as a thrown error (NodeCommandExecutor.executeOrThrow)', async () => {
    setExecMode('fail');
    const [tool] = createScaffoldTools();
    const dir = await tmpDir();

    await expect(
      tool.execute({ path: dir, frontend: 'react', orm: 'typeorm', phase: '1', dryRun: false }),
    ).rejects.toThrow(/Command failed \(exit 2\)/);
  });

  it('requires frontend, orm and phase', async () => {
    const [tool] = createScaffoldTools();

    await expect(tool.execute({ orm: 'typeorm', phase: '1' })).rejects.toThrow('frontend is required');
    await expect(tool.execute({ frontend: 'react', phase: '1' })).rejects.toThrow('orm is required');
    await expect(tool.execute({ frontend: 'react', orm: 'typeorm' })).rejects.toThrow('phase is required');
  });

  it('rejects an unrecognised phase value', async () => {
    const [tool] = createScaffoldTools();

    await expect(
      tool.execute({ frontend: 'react', orm: 'typeorm', phase: '99' }),
    ).rejects.toThrow(/Unknown phase "99"/);
  });
});
