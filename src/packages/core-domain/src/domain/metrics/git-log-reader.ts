/**
 * Thin wrapper around `git log` for reading commit history.
 * Uses child_process.execFile so it works without any git library dependency
 * and without a shell: the options travel as argv, never as a command line.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface GitCommit {
  hash: string;
  /** ISO-8601 author date */
  date: string;
  subject: string;
  /** Parent hashes (space-separated from git, split here) */
  parents: string[];
  isMerge: boolean;
}

export interface GitLogOptions {
  /** Working directory (git repo root) */
  cwd: string;
  /** Days to look back (default 90) */
  sinceDays?: number;
  /** Max commits to read (default 500) */
  maxCount?: number;
}

/**
 * Returns commits reachable from HEAD on the current branch.
 * Throws if the directory is not a git repo.
 */
export async function readGitLog(opts: GitLogOptions): Promise<GitCommit[]> {
  const { cwd, sinceDays = 90, maxCount = 500 } = opts;

  const since = `${sinceDays} days ago`;
  // format: hash|ISO-date|subject|parent1 parent2...
  const format = '%H|%aI|%s|%P';

  const { stdout } = await execFileAsync(
    'git',
    ['log', `--format=${format}`, `--since=${since}`, `--max-count=${maxCount}`],
    { cwd },
  );

  if (!stdout.trim()) return [];

  return stdout
    .trim()
    .split('\n')
    .map(line => {
      const [hash, date, subject, parentsRaw] = line.split('|');
      const parents = parentsRaw ? parentsRaw.trim().split(/\s+/).filter(Boolean) : [];
      return {
        hash: hash.trim(),
        date: date.trim(),
        subject: subject.trim(),
        parents,
        isMerge: parents.length > 1,
      };
    });
}

/**
 * Returns true if the cwd is inside a git repo.
 */
export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--git-dir'], { cwd });
    return true;
  } catch {
    return false;
  }
}
