import * as fs from 'fs';
import * as path from 'path';

/**
 * GT-632 — locate the workspace root `evolith sdlc handoff` should evaluate.
 *
 * The root is recognised by two markers: the SDLC artifact templates and the
 * rulesets tree. Both markers MOVED and the walk-up was never updated, so on
 * every current layout the conjunction was unsatisfiable and the loop always
 * ran to the filesystem root and returned `startPath` — i.e. `process.cwd()`.
 * That value is handed to `PhaseTransitionUseCase.execute(..., cwd)` and is
 * where gate evidence is looked up, so running the command from a
 * subdirectory silently graded the wrong tree.
 *
 *   - `reference/governance/sdlc/04-artifact-templates` became
 *     `reference/core/sdlc/04-artifact-templates` (e16120e9, taxonomy move).
 *   - root `rulesets/` became `src/rulesets/` (the `src/` refactor); the flat
 *     `rulesets/` still exists in a bundled/installed core and in satellites,
 *     which is why it stays a candidate rather than being replaced.
 *
 * Each marker is therefore probed at every location it is known to live, in
 * current-first order — the same dual-probe idiom `resolveRulesetFilePath`,
 * `TopologyCatalogService` and `PatternCatalogService` already use. The
 * candidate set is a strict SUPERSET of the pre-fix one, so no layout that
 * resolved before can stop resolving now.
 */

/** Where the SDLC artifact templates live, current location first. */
export const TEMPLATE_DIR_CANDIDATES: readonly string[] = [
  path.join('reference', 'core', 'sdlc', '04-artifact-templates'),
  path.join('reference', 'governance', 'sdlc', '04-artifact-templates'),
];

/** Where the rulesets tree lives, source checkout first, then bundled/satellite. */
export const RULESETS_DIR_CANDIDATES: readonly string[] = [
  path.join('src', 'rulesets'),
  'rulesets',
];

/** Injectable existence probe — the default is the real filesystem. */
export type ExistsProbe = (candidate: string) => boolean;

function hasAnyMarker(dir: string, candidates: readonly string[], exists: ExistsProbe): boolean {
  return candidates.some((rel) => exists(path.join(dir, rel)));
}

/**
 * Walk up from `startPath` until a directory carries BOTH markers.
 *
 * @returns the marked ancestor, or `startPath` unchanged when there is none —
 *          the pre-existing fallback, deliberately kept so a workspace that
 *          genuinely has no markers behaves exactly as before.
 */
export function findProjectRoot(startPath: string, exists: ExistsProbe = fs.existsSync): string {
  let current = path.resolve(startPath);

  for (;;) {
    if (
      hasAnyMarker(current, TEMPLATE_DIR_CANDIDATES, exists) &&
      hasAnyMarker(current, RULESETS_DIR_CANDIDATES, exists)
    ) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) return startPath;
    current = parent;
  }
}
