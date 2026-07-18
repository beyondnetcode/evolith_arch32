import * as fs from 'fs';
import * as path from 'path';
import {
  describeRulesetsResolutionFailure,
  entriesLookLikeCorpus,
  probeRulesetsLocationSync,
} from '@beyondnet/evolith-core-domain/application/paths/rulesets-location';

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

/**
 * A directory qualifies as a rulesets root when it holds a canonical family.
 *
 * GT-566: the family list is now the shared one in core-domain, so this
 * resolver, `DiskRulesetRepository` and the validators agree on what a corpus
 * IS. Previously this predicate existed but was applied only to the bundled
 * walk — the `--core` override branch below qualified candidates by mere
 * directory existence, which is how `--core <core checkout>` selected the
 * satellite-side `rulesets/agents` tree instead of `src/rulesets`.
 */
function looksLikeRulesetsRoot(dir: string): boolean {
  if (!dir || !fs.existsSync(dir)) return false;
  try {
    return entriesLookLikeCorpus(fs.readdirSync(dir));
  } catch {
    return false;
  }
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
 *   1. An explicit `--core` / `profile.core` override → `${core}/rulesets` or
 *      `${core}/src/rulesets`, whichever exists.
 *   2. The rulesets bundled inside this CLI package (relative to `__dirname`),
 *      which works both in dev (running from `dist/`) and when installed.
 *
 * GT-474: the override probes the SAME candidate list as `DiskRulesetRepository`
 * and `ruleset-id-loader`. When this resolver knew only `src/rulesets` and the
 * repository knew only `rulesets`, `--core <checkout>` resolved a path the
 * repository then failed to read — validating zero rules without saying so.
 *
 * @param coreOverride explicit Core checkout path (`--core` or `profile.core`).
 * @throws when an override is given but holds no rulesets at either candidate,
 *         or when no bundled rulesets can be located — with an actionable message.
 */
export function resolveRulesets(coreOverride?: string): ResolvedRulesets {
  if (coreOverride && coreOverride.trim().length > 0) {
    const coreRoot = path.resolve(coreOverride);
    // GT-566: content-qualified probe, shared with DiskRulesetRepository — a
    // directory that merely exists at `<core>/rulesets` no longer shadows a real
    // corpus at `<core>/src/rulesets`, and a total miss reports every path
    // tried plus what was found there.
    const { rulesetsRoot, probes } = probeRulesetsLocationSync(
      coreRoot,
      {
        existsSync: (p) => fs.existsSync(p),
        readdirNamesSync: (p) => fs.readdirSync(p),
      },
      path.sep,
    );
    if (!rulesetsRoot) {
      throw new Error(describeRulesetsResolutionFailure(coreRoot, probes));
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
