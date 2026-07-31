import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * GT-643 — state capture for the no-effect oracle.
 *
 * The cross-surface tester compares what CLI, MCP and REST *answer*. A flag
 * whose entire observable contract is the ABSENCE of an effect is invisible to
 * an oracle that only reads replies: `evolith agents install --dry-run` reported
 * success, and was believed, while it wrote `rulesets/agents/<name>/` and
 * rewrote `agents-registry.json` under `process.cwd()` — for long enough that
 * one of those writes was committed as product data.
 *
 * So this module gives the tester the second thing it needs to compare: STATE.
 * A snapshot is a content fingerprint of a directory tree, taken before and
 * after an invocation, and the diff is the finding.
 */

export interface TreeSnapshot {
  root: string;
  /** Whether the root existed at capture time. Absent and empty are different. */
  existed: boolean;
  /** Relative path -> sha256 of the contents (`<dir>` for directories). */
  entries: Record<string, string>;
}

export interface TreeDiff {
  root: string;
  added: string[];
  removed: string[];
  modified: string[];
  /** The root itself appeared or disappeared. */
  rootChanged: boolean;
}

/**
 * Refuse rather than truncate. A snapshot that silently stops at N files is an
 * oracle with a blind spot exactly where a runaway write would show up, and it
 * would still report "no effect".
 */
const MAX_ENTRIES = 20000;

export function snapshotTree(root: string): TreeSnapshot {
  const entries: Record<string, string> = {};
  const existed = fs.existsSync(root);
  if (existed) walk(root, root, entries);
  return { root, existed, entries };
}

function walk(root: string, dir: string, out: Record<string, string>): void {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = path.relative(root, abs);
    let st: fs.Stats;
    try {
      st = fs.lstatSync(abs);
    } catch {
      // A file that vanished between readdir and lstat IS a change; record it
      // as such rather than dropping it.
      out[rel] = '<vanished>';
      continue;
    }
    if (Object.keys(out).length > MAX_ENTRIES) {
      throw new Error(
        `snapshotTree: more than ${MAX_ENTRIES} entries under ${root}. ` +
          'Refusing to truncate — a partial snapshot cannot support a no-effect claim.',
      );
    }
    if (st.isSymbolicLink()) {
      out[rel] = `<link:${fs.readlinkSync(abs)}>`;
      continue;
    }
    if (st.isDirectory()) {
      out[rel] = '<dir>';
      walk(root, abs, out);
      continue;
    }
    out[rel] = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  }
}

export function diffTrees(before: TreeSnapshot, after: TreeSnapshot): TreeDiff {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  for (const [rel, hash] of Object.entries(after.entries)) {
    if (!(rel in before.entries)) added.push(rel);
    else if (before.entries[rel] !== hash) modified.push(rel);
  }
  for (const rel of Object.keys(before.entries)) {
    if (!(rel in after.entries)) removed.push(rel);
  }
  return {
    root: before.root,
    added: added.sort(),
    removed: removed.sort(),
    modified: modified.sort(),
    rootChanged: before.existed !== after.existed,
  };
}

export function isEmptyDiff(d: TreeDiff): boolean {
  return !d.rootChanged && d.added.length === 0 && d.removed.length === 0 && d.modified.length === 0;
}

export function summarizeDiff(d: TreeDiff): string {
  const parts: string[] = [];
  if (d.rootChanged) parts.push('the root itself appeared or disappeared');
  if (d.added.length) parts.push(`+${d.added.length} added (${d.added.slice(0, 5).join(', ')})`);
  if (d.removed.length) parts.push(`-${d.removed.length} removed (${d.removed.slice(0, 5).join(', ')})`);
  if (d.modified.length) parts.push(`~${d.modified.length} modified (${d.modified.slice(0, 5).join(', ')})`);
  return parts.join('; ') || 'no change';
}
