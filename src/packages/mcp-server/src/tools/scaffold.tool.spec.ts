import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Mock `node:child_process` so the embedded NodeCommandExecutor never spawns a
 * real process. `scaffold.tool.ts` builds `execAsync = promisify(exec)` at module
 * load, so we attach a `util.promisify.custom` implementation to the mocked
 * `exec`: promisify returns it directly. Behaviour is switched per-test through a
 * global flag (jest.mock factories cannot close over test-scoped variables).
 */
jest.mock('node:child_process', () => {
  const util = require('node:util') as typeof import('node:util');
  const exec: any = jest.fn();
  exec[util.promisify.custom] = (command: string) => {
    const mode = (globalThis as any).__EVOLITH_EXEC_MODE__ ?? 'ok';
    if (mode === 'fail') {
      return Promise.reject(
        Object.assign(new Error('spawn boom'), { stdout: '', stderr: 'nx exploded', code: 2 }),
      );
    }
    return Promise.resolve({ stdout: `ran: ${command}`, stderr: '' });
  };
  return { exec };
});

// Imported AFTER jest.mock so the mocked child_process is in place.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { createScaffoldTools } from './scaffold.tool';

function setExecMode(mode: 'ok' | 'fail'): void {
  (globalThis as any).__EVOLITH_EXEC_MODE__ = mode;
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
