/**
 * GT-626 criterion 2 — `init` and `scaffold` agree on the workspace root.
 *
 * The defect this pins: the README quickstart ran `evolith init` at step 2 and
 * `evolith scaffold --phase 1` at step 5, and step 5 exited 1 with
 * "<proj>/src exists but is not an Nx workspace". `init` writes the manifest at
 * the project ROOT and leaves `src/` empty; the Nx strategy runs `npm` and `nx`
 * INSIDE `src/`. Nothing in the product created that workspace, so the two
 * commands disagreed about what `init` produces and the documented sequence had
 * no workaround (`scaffold` takes no `--dir`).
 *
 * The test runs the two commands one after the other against a REAL temporary
 * directory and a REAL file system — no mock stands in for the disagreement,
 * because a mock is what let the guard drift from the strategy in the first
 * place. Only the Nx strategy itself is stubbed, so no `npm install` or `nx g`
 * is spawned: what is under test is the handover between the two commands, and
 * that the workspace `nx` would be run in actually exists afterwards.
 *
 * Reverting `ensureNxWorkspace()` in `scaffold.command.ts` turns every case here
 * red with the original refusal.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { NodeFileSystemProvider, NxWorkspaceStrategy } from '@beyondnet/evolith-infra-providers';
import { InitCommand } from '../../init/init.command';
import { ScaffoldCommand } from '../scaffold.command';
import { CatalogLoader } from '../../../infrastructure/catalog/catalog-loader';
import { PromptService } from '../../../infrastructure/prompts/prompt.service';

jest.mock('@beyondnet/evolith-infra-providers', () => {
  const actual = jest.requireActual('@beyondnet/evolith-infra-providers');
  return { ...actual, NxWorkspaceStrategy: jest.fn() };
});

const nxStrategy = {
  setDryRun: jest.fn(),
  installDependencies: jest.fn().mockResolvedValue(undefined),
  generateApiApp: jest.fn().mockResolvedValue(undefined),
  generateStandardWebApp: jest.fn().mockResolvedValue(undefined),
  generateHostApp: jest.fn().mockResolvedValue(undefined),
  generateLibrary: jest.fn().mockResolvedValue(undefined),
};

describe('GT-626 · init then scaffold, in one directory', () => {
  let workdir: string;
  let originalCwd: string;
  let logSpy: jest.SpyInstance;

  const runInit = async (): Promise<void> => {
    const init = new InitCommand(
      new CatalogLoader(),
      new NodeFileSystemProvider().createFileSystem() as never,
      new PromptService(),
    );
    await init.executeCommand([], { name: 'my-sat', yes: true, format: 'json' } as never);
  };

  const runScaffold = async (options: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
    logSpy.mockClear();
    const scaffold = new ScaffoldCommand();
    await scaffold.executeCommand([], {
      format: 'json',
      frontend: 'react',
      orm: 'prisma',
      phase: '1',
      ...options,
    });
    const envelopes = logSpy.mock.calls
      .map((call: unknown[]) => String(call[0]))
      .filter((line: string) => line.trim().startsWith('{'))
      .map((line: string) => JSON.parse(line) as Record<string, unknown>);
    expect(envelopes.length).toBeGreaterThan(0);
    return envelopes[envelopes.length - 1];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (NxWorkspaceStrategy as unknown as jest.Mock).mockImplementation(() => nxStrategy);
    originalCwd = process.cwd();
    workdir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'gt626-quickstart-')));
    process.chdir(workdir);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.chdir(originalCwd);
    fs.rmSync(workdir, { recursive: true, force: true });
  });

  it('the README sequence completes: scaffold no longer rejects what init produced', async () => {
    await runInit();
    // Exactly the tree the gap describes: manifest at the root, `src/` bare.
    expect(fs.existsSync(path.join(workdir, 'evolith.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(workdir, 'src', 'nx.json'))).toBe(false);

    const envelope = await runScaffold();

    expect(envelope.success).toBe(true);
    expect(envelope.data).toEqual(
      expect.objectContaining({
        status: 'scaffolded',
        nxWorkspace: expect.objectContaining({ action: 'created' }),
      }),
    );
    // The strategy was actually driven, rather than the run being short-circuited.
    expect(nxStrategy.installDependencies).toHaveBeenCalledWith('react', 'prisma');
  });

  it('leaves behind a workspace `nx` can really run in, not just a passing check', async () => {
    await runInit();
    await runScaffold();

    const workspace = path.join(workdir, 'src');
    // `nx.json` is the load-bearing file: without it `readNxJson()` returns null
    // and the generators die on `useInferencePlugins` AFTER a minutes-long install.
    const nxJson = JSON.parse(fs.readFileSync(path.join(workspace, 'nx.json'), 'utf8'));
    expect(nxJson.targetDefaults).toBeDefined();

    const manifest = JSON.parse(fs.readFileSync(path.join(workspace, 'package.json'), 'utf8'));
    expect(manifest.private).toBe(true);
    expect(manifest.devDependencies.nx).toBeDefined();
    // Measured, not guessed: TypeScript 7 breaks `nx g @nx/nest:library` with
    // "Cannot read properties of undefined (reading 'Latest')", so the template
    // must not float to `latest` here.
    expect(manifest.devDependencies.typescript).toBe('~5.9.0');

    expect(fs.existsSync(path.join(workspace, 'tsconfig.base.json'))).toBe(true);
  });

  it('is idempotent: a second scaffold reports the workspace as already present', async () => {
    await runInit();
    await runScaffold();
    const second = await runScaffold();

    expect((second.data as Record<string, unknown>).nxWorkspace).toEqual(
      expect.objectContaining({ action: 'already-present', files: [] }),
    );
  });

  it('does not convert a src/ that belongs to another project — it refuses, fast', async () => {
    await runInit();
    fs.mkdirSync(path.join(workdir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(workdir, 'src', 'package.json'), '{"name":"somebody-elses-app"}');

    const envelope = await runScaffold();

    expect(envelope.success).toBe(false);
    expect((envelope.error as Record<string, string>).code).toBe('NOT_A_SATELLITE');
    expect((envelope.error as Record<string, string>).message).toContain('belongs to');
    // No nx.json was forced on top of it, and no work was started.
    expect(fs.existsSync(path.join(workdir, 'src', 'nx.json'))).toBe(false);
    expect(nxStrategy.installDependencies).not.toHaveBeenCalled();
  });

  it('does not fabricate an Nx workspace for a .NET satellite', async () => {
    await runInit();

    const envelope = await runScaffold({ runtime: 'dotnet', dryRun: true, apiName: 'sat-api' });

    expect(envelope.success).toBe(true);
    expect((envelope.data as Record<string, string>).runtime).toBe('dotnet');
    expect(fs.existsSync(path.join(workdir, 'src', 'nx.json'))).toBe(false);
  });
});
