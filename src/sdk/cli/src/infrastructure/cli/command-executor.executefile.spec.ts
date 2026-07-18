/**
 * GT-562 — `CommandExecutor.executeFile` is the SHELL-FREE execution path added
 * by GT-346 as an injection control: unlike `execute`, arguments are handed to
 * the binary directly, so shell metacharacters are literal data. None of its
 * branches were covered.
 *
 * Two classes of regression hide here, and neither one crashes:
 *   - the security property silently reverting (args reaching a shell), and
 *   - a failed subprocess reporting an empty error or exit code 0, which makes a
 *     gate that shells out read as passing.
 *
 * Strategy mirrors `command-executor.spec.ts`: mock child_process.execFile via
 * `util.promisify.custom`, so the `promisify(execFile)` captured at module load
 * resolves to a controlled async fn.
 */

const execAsync = jest.fn();
const execFileAsync = jest.fn();

jest.mock('child_process', () => {
  const { promisify: prom } = require('util');
  const exec = jest.fn();
  (exec as never as Record<symbol, unknown>)[prom.custom] = execAsync;
  const execFile = jest.fn();
  (execFile as never as Record<symbol, unknown>)[prom.custom] = execFileAsync;
  return { exec, execFile };
});

import { CommandExecutor } from './command-executor';

describe('executeFile — shell-free execution', () => {
  let executor: CommandExecutor;
  const originalPlatform = process.platform;

  function setPlatform(value: string): void {
    Object.defineProperty(process, 'platform', { value, configurable: true });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    executor = new CommandExecutor();
  });

  afterEach(() => {
    setPlatform(originalPlatform);
  });

  it('passes arguments to the binary as a separate array, never as an interpolated string', () => {
    // The security property: a metacharacter-laden argument must arrive intact
    // as ONE argv entry, not spliced into a command line.
    execFileAsync.mockResolvedValue({ stdout: 'ok', stderr: '' });

    return executor.executeFile('git', ['commit', '-m', 'fix; rm -rf /']).then(() => {
      expect(execFileAsync).toHaveBeenCalledWith(
        'git',
        ['commit', '-m', 'fix; rm -rf /'],
        expect.any(Object),
      );
    });
  });

  it('returns the captured stdout on success', async () => {
    execFileAsync.mockResolvedValue({ stdout: 'v1.2.3\n', stderr: '' });

    const result = await executor.executeFile('node', ['--version']);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe('v1.2.3\n');
    expect(result.exitCode).toBe(0);
  });

  it('includes cwd in the options when one is given', async () => {
    execFileAsync.mockResolvedValue({ stdout: '', stderr: '' });

    await executor.executeFile('npm', ['ci'], '/work/project');

    expect(execFileAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ cwd: '/work/project', timeout: 120000 }),
    );
  });

  it('omits cwd entirely when none is given, so the child inherits the parent directory', async () => {
    execFileAsync.mockResolvedValue({ stdout: '', stderr: '' });

    await executor.executeFile('npm', ['ci']);

    const options = execFileAsync.mock.calls[0][2] as Record<string, unknown>;
    expect(options).not.toHaveProperty('cwd');
    expect(options['timeout']).toBe(120000);
  });

  describe('failure reporting', () => {
    it('surfaces stderr and the real exit code so a caller can fail the gate', async () => {
      execFileAsync.mockRejectedValue({ code: 2, stderr: 'fatal: not a repository', message: 'ignored' });

      const result = await executor.executeFile('git', ['status']);

      expect(result.success).toBe(false);
      expect(result.stderr).toBe('fatal: not a repository');
      expect(result.exitCode).toBe(2);
    });

    it('falls back to the error message when the failure carries no stderr', async () => {
      execFileAsync.mockRejectedValue({ code: 127, message: 'spawn ENOENT' });

      const result = await executor.executeFile('missing-tool', []);

      // An empty report would read as "nothing went wrong" to the caller.
      expect(result.stderr).toBe('spawn ENOENT');
      expect(result.exitCode).toBe(127);
    });

    it('reports a non-zero exit code even when the failure carries none', async () => {
      // `code: undefined` must NOT collapse to 0 — that is the difference
      // between a gate that blocks and a gate that silently passes.
      execFileAsync.mockRejectedValue({ stderr: 'killed' });

      const result = await executor.executeFile('tool', []);

      expect(result.exitCode).toBe(1);
      expect(result.success).toBe(false);
    });

    it('never reports an empty reason, falling back to "Unknown error"', async () => {
      execFileAsync.mockRejectedValue({});

      const result = await executor.executeFile('tool', []);

      expect(result.stderr).toBe('Unknown error');
      expect(result.exitCode).toBe(1);
    });
  });

  describe('Windows shim resolution', () => {
    it('appends .cmd for Node-based CLIs on win32, which ship as shims', async () => {
      // Without the shim name, execFile (which does not use a shell) cannot find
      // `npm` on Windows at all — every shell-free npm call would fail ENOENT.
      setPlatform('win32');
      execFileAsync.mockResolvedValue({ stdout: '', stderr: '' });

      await executor.executeFile('npm', ['ci']);

      expect(execFileAsync).toHaveBeenCalledWith('npm.cmd', ['ci'], expect.any(Object));
    });

    it('leaves a non-shimmed binary untouched on win32', async () => {
      setPlatform('win32');
      execFileAsync.mockResolvedValue({ stdout: '', stderr: '' });

      await executor.executeFile('git', ['status']);

      expect(execFileAsync).toHaveBeenCalledWith('git', ['status'], expect.any(Object));
    });

    it('does not append .cmd off win32', async () => {
      setPlatform('linux');
      execFileAsync.mockResolvedValue({ stdout: '', stderr: '' });

      await executor.executeFile('npm', ['ci']);

      expect(execFileAsync).toHaveBeenCalledWith('npm', ['ci'], expect.any(Object));
    });
  });
});
