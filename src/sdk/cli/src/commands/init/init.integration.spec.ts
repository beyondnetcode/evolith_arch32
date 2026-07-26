/**
 * GT-571 -- `init` against the real file system, no mocks.
 *
 * The unit spec asserts the wiring; this one asserts the outcome the README
 * promises: after `evolith init`, `evolith.yaml` is in the directory the user is
 * standing in, so the `evolith validate` that follows finds a satellite instead
 * of raising GOV-000 against the parent.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { NodeFileSystemProvider } from '@beyondnet/evolith-infra-providers';
import { InitCommand } from './init.command';
import { CatalogLoader } from '../../infrastructure/catalog/catalog-loader';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

describe('init on a real file system (GT-571)', () => {
  let workdir: string;
  let originalCwd: string;
  let command: InitCommand;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    originalCwd = process.cwd();
    workdir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-init-real-')));
    process.chdir(workdir);
    command = new InitCommand(
      new CatalogLoader(),
      new NodeFileSystemProvider().createFileSystem() as never,
      new PromptService(),
    );
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.chdir(originalCwd);
    fs.rmSync(workdir, { recursive: true, force: true });
  });

  it('writes evolith.yaml into the current directory, not into a subdirectory', async () => {
    await command.executeCommand([], { name: 'my-sat', yes: true } as never);

    expect(fs.existsSync(path.join(workdir, 'evolith.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(workdir, 'my-sat'))).toBe(false);
    // The scaffolded manifest still carries the project NAME, which is what
    // `--name` means now that it no longer doubles as the directory.
    expect(fs.readFileSync(path.join(workdir, 'evolith.yaml'), 'utf-8')).toContain('my-sat');
  });

  it('writes into the positional target directory when one is given', async () => {
    await command.executeCommand(['nested'], { name: 'my-sat', yes: true } as never);

    expect(fs.existsSync(path.join(workdir, 'nested', 'evolith.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(workdir, 'evolith.yaml'))).toBe(false);
  });

  it('--dry-run leaves the directory untouched', async () => {
    await command.executeCommand([], { name: 'my-sat', yes: true, dryRun: true } as never);

    expect(fs.readdirSync(workdir)).toEqual([]);
  });

  it('--format json emits one envelope naming the directory it initialized', async () => {
    // Nothing may reach stdout except the envelope: the real structured logger
    // is live here and must stay on stderr for a machine read to survive.
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
    try {
      await command.executeCommand([], { name: 'my-sat', yes: true, format: 'json' } as never);
      expect(stdoutSpy).not.toHaveBeenCalled();
    } finally {
      stdoutSpy.mockRestore();
    }

    expect(logSpy).toHaveBeenCalledTimes(1);
    const envelope = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(envelope.success).toBe(true);
    expect(envelope.data.targetDir).toBe(workdir);
    expect(envelope.data.artifacts).toContain('evolith.yaml');
    expect(fs.existsSync(path.join(workdir, 'evolith.yaml'))).toBe(true);
  });
});
