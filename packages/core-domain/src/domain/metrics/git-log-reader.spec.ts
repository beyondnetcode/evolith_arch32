import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readGitLog, isGitRepo } from './git-log-reader';

const execAsync = promisify(exec);

describe('git-log-reader', () => {
  let tmp: string;

  beforeAll(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'git-log-reader-'));
    await execAsync('git init -q', { cwd: tmp });
    await execAsync('git config user.email t@t', { cwd: tmp });
    await execAsync('git config user.name t', { cwd: tmp });
    await execAsync('git config commit.gpgsign false', { cwd: tmp });
    await fs.writeFile(path.join(tmp, 'a'), 'a');
    await execAsync('git add a && git commit -q -m "feat: first"', { cwd: tmp });
    await fs.writeFile(path.join(tmp, 'b'), 'b');
    await execAsync('git add b && git commit -q -m "fix: second"', { cwd: tmp });
  });

  afterAll(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('isGitRepo returns true inside a repo', async () => {
    expect(await isGitRepo(tmp)).toBe(true);
  });

  it('isGitRepo returns false outside a repo', async () => {
    const elsewhere = await fs.mkdtemp(path.join(os.tmpdir(), 'not-a-repo-'));
    try {
      expect(await isGitRepo(elsewhere)).toBe(false);
    } finally {
      await fs.rm(elsewhere, { recursive: true, force: true });
    }
  });

  it('readGitLog returns commits parsed with parents and merge flag', async () => {
    const commits = await readGitLog({ cwd: tmp, sinceDays: 365, maxCount: 10 });
    expect(commits.length).toBeGreaterThanOrEqual(2);
    const first = commits.find(c => c.subject === 'feat: first');
    const second = commits.find(c => c.subject === 'fix: second');
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first!.parents).toEqual([]);
    expect(first!.isMerge).toBe(false);
    expect(second!.parents.length).toBe(1);
    expect(second!.isMerge).toBe(false);
    expect(/^[0-9a-f]{7,40}$/.test(first!.hash)).toBe(true);
    expect(/\d{4}-\d{2}-\d{2}/.test(first!.date)).toBe(true);
  });

  it('readGitLog caps results via maxCount', async () => {
    const commits = await readGitLog({ cwd: tmp, sinceDays: 365, maxCount: 1 });
    expect(commits).toHaveLength(1);
  });
});
