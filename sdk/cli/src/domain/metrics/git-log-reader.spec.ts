/**
 * Tests for git-log-reader.ts
 *
 * Strategy: mock child_process.exec with util.promisify.custom so that
 * promisify(exec) returns our controlled async function — matching how
 * Node's real exec exposes { stdout, stderr } via the custom symbol.
 */

import { promisify } from 'util';

// Shared async mock — must be declared before jest.mock factory runs
const execAsync = jest.fn();

jest.mock('child_process', () => {
  // Attach promisify.custom so promisify(exec) === execAsync
  const { promisify: prom } = require('util');
  const exec = jest.fn();
  (exec as unknown)[prom.custom] = execAsync;
  return { exec };
});

// Import AFTER mocks are set up
import { readGitLog, isGitRepo } from './git-log-reader';

// ── helpers ───────────────────────────────────────────────────────────────────

function mockStdout(stdout: string) {
  execAsync.mockResolvedValue({ stdout, stderr: '' });
}

function mockError(message: string) {
  execAsync.mockRejectedValue(new Error(message));
}

beforeEach(() => jest.clearAllMocks());

// ── readGitLog ────────────────────────────────────────────────────────────────

describe('readGitLog', () => {
  it('returns empty array when stdout is blank', async () => {
    mockStdout('   ');
    expect(await readGitLog({ cwd: '/repo' })).toEqual([]);
  });

  it('parses a single commit correctly', async () => {
    const iso = '2026-06-01T10:00:00+00:00';
    mockStdout(`abc123|${iso}|feat: add login|parent1`);
    const [commit] = await readGitLog({ cwd: '/repo' });
    expect(commit).toMatchObject({
      hash: 'abc123',
      date: iso,
      subject: 'feat: add login',
      parents: ['parent1'],
      isMerge: false,
    });
  });

  it('parses multiple commits', async () => {
    const iso = '2026-06-01T10:00:00+00:00';
    mockStdout([
      `h1|${iso}|feat: a|p1`,
      `h2|${iso}|fix: b|p2`,
      `h3|${iso}|chore: c|p3`,
    ].join('\n'));
    const result = await readGitLog({ cwd: '/repo' });
    expect(result).toHaveLength(3);
    expect(result[1].hash).toBe('h2');
  });

  it('marks isMerge=true for two-parent commits', async () => {
    const iso = '2026-06-01T10:00:00+00:00';
    mockStdout(`merge1|${iso}|Merge branch feature|mainHash featureHash`);
    const [commit] = await readGitLog({ cwd: '/repo' });
    expect(commit.isMerge).toBe(true);
    expect(commit.parents).toEqual(['mainHash', 'featureHash']);
  });

  it('marks isMerge=false for single-parent commit', async () => {
    const iso = '2026-06-01T10:00:00+00:00';
    mockStdout(`c1|${iso}|feat: x|parentOnly`);
    const [commit] = await readGitLog({ cwd: '/repo' });
    expect(commit.isMerge).toBe(false);
  });

  it('handles initial commit with no parents', async () => {
    const iso = '2026-06-01T10:00:00+00:00';
    mockStdout(`root|${iso}|initial commit|`);
    const [commit] = await readGitLog({ cwd: '/repo' });
    expect(commit.parents).toEqual([]);
    expect(commit.isMerge).toBe(false);
  });

  it('trims whitespace from all fields', async () => {
    const iso = '2026-06-01T10:00:00+00:00';
    mockStdout(` abc | ${iso} | feat: trimmed | p1 `);
    const [commit] = await readGitLog({ cwd: '/repo' });
    expect(commit.hash).toBe('abc');
    expect(commit.subject).toBe('feat: trimmed');
  });

  it('passes --since flag with sinceDays', async () => {
    mockStdout('');
    await readGitLog({ cwd: '/repo', sinceDays: 30 });
    const cmd = execAsync.mock.calls[0][0] as string;
    expect(cmd).toContain('--since="30 days ago"');
  });

  it('passes --max-count flag', async () => {
    mockStdout('');
    await readGitLog({ cwd: '/repo', maxCount: 100 });
    const cmd = execAsync.mock.calls[0][0] as string;
    expect(cmd).toContain('--max-count=100');
  });

  it('uses provided cwd in exec options', async () => {
    mockStdout('');
    await readGitLog({ cwd: '/my/project' });
    expect(execAsync.mock.calls[0][1]).toMatchObject({ cwd: '/my/project' });
  });

  it('defaults sinceDays=90 and maxCount=500', async () => {
    mockStdout('');
    await readGitLog({ cwd: '/repo' });
    const cmd = execAsync.mock.calls[0][0] as string;
    expect(cmd).toContain('--since="90 days ago"');
    expect(cmd).toContain('--max-count=500');
  });
});

// ── isGitRepo ─────────────────────────────────────────────────────────────────

describe('isGitRepo', () => {
  it('returns true when git rev-parse succeeds', async () => {
    execAsync.mockResolvedValue({ stdout: '.git', stderr: '' });
    expect(await isGitRepo('/repo')).toBe(true);
  });

  it('returns false when exec throws', async () => {
    mockError('not a git repository');
    expect(await isGitRepo('/not-a-repo')).toBe(false);
  });
});
