import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolved rulesets location.
 *
 * - `coreRoot` is the root a Core-shaped consumer appends its own subpath to
 *   (e.g. the TopologyCatalogService probes `${coreRoot}/rulesets/topologies`
 *   and `${coreRoot}/src/rulesets/topologies`).
 * - `rulesetsRoot` is the concrete directory that directly contains the
 *   canonical ruleset families (`architecture/`, `topologies/`, `opa/`, …).
 * - `source` records which strategy resolved the path (for diagnostics/tests).
 */
export interface ResolvedRulesets {
  coreRoot: string;
  rulesetsRoot: string;
  source: 'override' | 'bundled';
}

/** A directory qualifies as a rulesets root when it holds a canonical family. */
function looksLikeRulesetsRoot(dir: string): boolean {
  if (!dir) return false;
  return (
    fs.existsSync(path.join(dir, 'architecture')) ||
    fs.existsSync(path.join(dir, 'topologies'))
  );
}

/**
 * Walk up from a start directory looking for the CLI package root — the first
 * ancestor that has both a `package.json` and a bundled `rulesets/` directory.
 * Works whether we run from `dist/` (installed / built) or `src/` (ts-node).
 */
function findBundledRulesets(startDir: string): string | undefined {
  let dir = startDir;
  // Bound the walk so we never escape past the filesystem root.
  for (let i = 0; i < 12; i++) {
    const candidate = path.join(dir, 'rulesets');
    if (
      fs.existsSync(path.join(dir, 'package.json')) &&
      looksLikeRulesetsRoot(candidate)
    ) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

/**
 * Resolve the canonical rulesets root for the running CLI.
 *
 * Resolution order (never falls back to `process.cwd()`):
 *   1. An explicit `--core` / `profile.core` override → `${core}/src/rulesets`.
 *   2. The rulesets bundled inside this CLI package (relative to `__dirname`),
 *      which works both in dev (running from `dist/`) and when installed.
 *
 * @param coreOverride explicit Core checkout path (`--core` or `profile.core`).
 * @throws when an override is given but has no `src/rulesets`, or when no
 *         bundled rulesets can be located — with an actionable message.
 */
export function resolveRulesets(coreOverride?: string): ResolvedRulesets {
  if (coreOverride && coreOverride.trim().length > 0) {
    const coreRoot = path.resolve(coreOverride);
    const rulesetsRoot = path.join(coreRoot, 'src', 'rulesets');
    if (!fs.existsSync(rulesetsRoot)) {
      throw new Error(
        `Core path has no rulesets at "${rulesetsRoot}". ` +
          `Point --core (or \`smart-cli profile\`) at a valid Evolith Core checkout, ` +
          `or omit --core to use the rulesets bundled with the CLI.`,
      );
    }
    return { coreRoot, rulesetsRoot, source: 'override' };
  }

  const bundled = findBundledRulesets(__dirname);
  if (bundled) {
    // The package root is the parent of the bundled `rulesets/` dir; the
    // TopologyCatalogService probes `${coreRoot}/rulesets/...`, so returning the
    // package root as `coreRoot` keeps that consumer working unchanged.
    return { coreRoot: path.dirname(bundled), rulesetsRoot: bundled, source: 'bundled' };
  }

  throw new Error(
    'Rulesets not found: the CLI could not locate its bundled rulesets and no ' +
      '--core override was provided. Reinstall the CLI, or pass --core pointing ' +
      'at an Evolith Core checkout.',
  );
}
