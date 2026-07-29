import * as fs from 'fs';
import * as path from 'path';

/**
 * Absolute path of the Evolith Core checkout this test process is running from.
 *
 * GT-632: several core-api specs must assert against the REAL repository layout
 * rather than a fixture. The failure this closes was a path built with
 * `path.join(corePath, …)` that pointed at a directory the `src/` refactor had
 * moved: the code and its fixtures agreed with each other and neither agreed
 * with the repository, so every test stayed green while the query returned
 * nothing.
 *
 * Resolution walks up looking for the workspace root manifest (the one that
 * declares `workspaces`) instead of counting `..` segments, so moving this file
 * within core-api does not silently retarget it at the wrong tree.
 *
 * It THROWS when the root cannot be found. It must never return a fallback and
 * it must never let a caller skip: a spec that quietly opts out in CI is the
 * same false green in a different costume.
 */
export function findRepoRoot(from: string = __dirname): string {
  let dir = path.resolve(from);
  const tried: string[] = [];

  for (;;) {
    const manifest = path.join(dir, 'package.json');
    tried.push(manifest);
    if (fs.existsSync(manifest)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(manifest, 'utf8')) as {
          name?: string;
          workspaces?: unknown;
        };
        if (parsed.workspaces) return dir;
      } catch {
        // A malformed manifest is not the root we are looking for; keep walking.
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        'Could not locate the Evolith workspace root (a package.json declaring "workspaces") ' +
          `starting from "${from}". Tried:\n  ${tried.join('\n  ')}`,
      );
    }
    dir = parent;
  }
}

/** The workspace root, resolved once. */
export const REPO_ROOT = findRepoRoot();
