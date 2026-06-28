/**
 * Tests for CommandExecutor
 *
 * Strategy: mock child_process.exec with util.promisify.custom so that
 * promisify(exec) at module load time resolves to our controlled async fn.
 */

// Shared async mocks — declared before jest.mock factory
const execAsync = jest.fn();
const execFileAsync = jest.fn();

jest.mock('child_process', () => {
  const { promisify: prom } = require('util');
  const exec = jest.fn();
  (exec as any)[prom.custom] = execAsync;
  const execFile = jest.fn();
  (execFile as any)[prom.custom] = execFileAsync;
  return { exec, execFile };
});

import { CommandExecutor, CommandResult } from './command-executor';

// ── helpers ───────────────────────────────────────────────────────────────────

function mockSuccess(stdout: string) {
  execAsync.mockResolvedValue({ stdout, stderr: '' });
}

function mockFailure(stderr: string, code: number) {
  execAsync.mockRejectedValue({ code, stderr, message: stderr });
}

beforeEach(() => jest.clearAllMocks());

// ── CommandResult ─────────────────────────────────────────────────────────────

describe('CommandResult', () => {
  it('CommandResult.ok builds a successful result', () => {
    const r = CommandResult.ok('hello');
    expect(r.success).toBe(true);
    expect(r.stdout).toBe('hello');
    expect(r.exitCode).toBe(0);
  });

  it('CommandResult.err builds a failure result', () => {
    const r = CommandResult.err('boom', 2);
    expect(r.success).toBe(false);
    expect(r.stderr).toBe('boom');
    expect(r.exitCode).toBe(2);
  });
});

// ── execute ───────────────────────────────────────────────────────────────────

describe('execute', () => {
  it('returns success result with stdout on success', async () => {
    mockSuccess('output');
    const result = await new CommandExecutor().execute('ls');
    expect(result.success).toBe(true);
    expect(result.stdout).toBe('output');
  });

  it('returns failure result on exec error', async () => {
    mockFailure('command not found', 127);
    const result = await new CommandExecutor().execute('bad-cmd');
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(127);
  });

  it('passes cwd option when provided', async () => {
    mockSuccess('');
    await new CommandExecutor().execute('ls', '/my/dir');
    expect(execAsync.mock.calls[0][1]).toMatchObject({ cwd: '/my/dir' });
  });

  it('omits cwd when not provided', async () => {
    mockSuccess('');
    await new CommandExecutor().execute('pwd');
    const opts = execAsync.mock.calls[0][1] as Record<string, unknown>;
    expect(opts.cwd).toBeUndefined();
  });

  it('includes a 120s timeout in options', async () => {
    mockSuccess('');
    await new CommandExecutor().execute('sleep 1');
    expect(execAsync.mock.calls[0][1]).toMatchObject({ timeout: 120000 });
  });

  it('falls back to message when stderr is absent on error', async () => {
    execAsync.mockRejectedValue({ code: 1, message: 'ENOMEM' });
    const result = await new CommandExecutor().execute('something');
    expect(result.stderr).toBe('ENOMEM');
  });

  it('uses exit code 1 when code property is absent', async () => {
    execAsync.mockRejectedValue({ message: 'oops' });
    const result = await new CommandExecutor().execute('something');
    expect(result.exitCode).toBe(1);
  });
});

// ── executeOrThrow ────────────────────────────────────────────────────────────

describe('executeOrThrow', () => {
  it('returns stdout on success', async () => {
    mockSuccess('hello world\n');
    const out = await new CommandExecutor().executeOrThrow('echo hello world');
    expect(out).toBe('hello world\n');
  });

  it('throws CommandExecutionError on failure', async () => {
    mockFailure('permission denied', 126);
    await expect(new CommandExecutor().executeOrThrow('chmod +x /root/secret'))
      .rejects.toThrow();
  });

  it('error message includes the failed command', async () => {
    mockFailure('not found', 127);
    await expect(new CommandExecutor().executeOrThrow('badcmd'))
      .rejects.toThrow(/badcmd/);
  });
});

// ── checkTool ─────────────────────────────────────────────────────────────────

describe('checkTool', () => {
  it('returns available=true when command succeeds', async () => {
    mockSuccess('v20.1.0');
    const check = await new CommandExecutor().checkTool('node', 'node --version');
    expect(check.available).toBe(true);
    expect(check.name).toBe('node');
  });

  it('parses semver from stdout as version', async () => {
    mockSuccess('18.17.1\n');
    const check = await new CommandExecutor().checkTool('node', 'node --version');
    expect(check.version).toBe('18.17.1');
  });

  it('returns undefined version when stdout has no semver', async () => {
    mockSuccess('some-tool ready');
    const check = await new CommandExecutor().checkTool('mytool', 'mytool --version');
    expect(check.version).toBeUndefined();
  });

  it('returns available=false when command fails', async () => {
    mockFailure('not found', 127);
    const check = await new CommandExecutor().checkTool('nx', 'npx nx --version');
    expect(check.available).toBe(false);
  });

  it('includes an installHint when tool is unavailable', async () => {
    mockFailure('not found', 127);
    const check = await new CommandExecutor().checkTool('docker', 'docker --version');
    expect(check.installHint).toBeDefined();
    expect(check.installHint).toContain('docker');
  });

  it('caches result so exec is only called once per tool', async () => {
    mockSuccess('v16.0.0');
    const svc = new CommandExecutor();
    await svc.checkTool('npm', 'npm --version');
    await svc.checkTool('npm', 'npm --version');
    expect(execAsync).toHaveBeenCalledTimes(1);
  });

  it('returns cached result on second call', async () => {
    mockSuccess('v1.0.0');
    const svc = new CommandExecutor();
    const first  = await svc.checkTool('npm', 'npm --version');
    const second = await svc.checkTool('npm', 'npm --version');
    expect(second.available).toBe(first.available);
    expect(second.version).toBe(first.version);
  });

  it('provides fallback installHint for unknown tool', async () => {
    mockFailure('not found', 127);
    const check = await new CommandExecutor().checkTool('weirdtool', 'weirdtool --version');
    expect(check.installHint).toContain('weirdtool');
  });
});

// ── clearCache ────────────────────────────────────────────────────────────────

describe('clearCache', () => {
  it('forces a fresh exec after clearing', async () => {
    mockSuccess('v1.0.0');
    const svc = new CommandExecutor();
    await svc.checkTool('npm', 'npm --version');
    svc.clearCache();
    mockSuccess('v2.0.0');
    await svc.checkTool('npm', 'npm --version');
    expect(execAsync).toHaveBeenCalledTimes(2);
  });
});
