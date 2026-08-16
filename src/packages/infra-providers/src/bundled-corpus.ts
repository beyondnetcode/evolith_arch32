/**
 * GT-705 — where a surface finds the Core corpus when nobody told it.
 *
 * THE DEFECT THIS REPLACES, measured on the published artifact by GT-671's canary:
 * the MCP server resolved its core path as `path.join(process.cwd(), '..',
 * 'evolith')` — a SIBLING DIRECTORY NAMED `evolith`. That is the Evolith
 * monorepo's own layout, baked into the product in nine places across five files.
 * It works on a developer's machine and nowhere else, so `npx
 * @beyondnet/evolith-mcp` announced 50 tools and answered the 2 that need no
 * corpus, with `evolith-gate-evaluate` returning RULESET_NOT_FOUND and
 * `evolith-validate` "could not locate the Evolith ruleset corpus".
 *
 * The CLI already had the right answer — `resolveRulesets()` walks up from the
 * installed module to a package root that carries a bundled `rulesets/`, and
 * qualifies it BY CONTENT rather than by name. It was not shared, so the MCP
 * surface guessed instead. Copying it a second time is what GT-664 and GT-676 are
 * the record of: a seam duplicated is a seam that drifts, and both of those were
 * one copy of a construction silently losing what the other kept.
 *
 * Resolution order, and `process.cwd()` is deliberately NOT in it:
 *
 *   1. an explicit override — `--core`, `EVOLITH_CORE_PATH`, a tool argument;
 *   2. the corpus bundled inside the calling package.
 *
 * Self-sufficient with override: a published surface works out of the box, and a
 * tenant that supplies its own corpus always wins.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  RULESETS_CANDIDATE_SUBPATHS,
  RULESETS_CORPUS_MARKERS,
  probeRulesetsLocationSync,
  describeRulesetsResolutionFailure,
} from '@beyondnet/evolith-core-domain/application/paths/rulesets-location';

export interface ResolvedCorpus {
  /** The path to hand consumers as `corePath`. */
  readonly coreRoot: string;
  /** The qualified corpus directory beneath it. */
  readonly rulesetsRoot: string;
  /** Which arm of the resolution answered — surfaced so a startup line can say so. */
  readonly source: 'override' | 'bundled';
}

/**
 * Does this directory hold a ruleset corpus, judged by what is IN it?
 *
 * GT-566's rule, and the reason it is content and not existence: the Core repo
 * has a satellite-side `rulesets/agents` directory that shares the name and holds
 * no rules, and an existence check latches onto it and reports emptiness as an
 * answer.
 */
function looksLikeCorpus(dir: string): boolean {
  try {
    if (!fs.statSync(dir).isDirectory()) return false;
    return fs.readdirSync(dir).some((entry) => RULESETS_CORPUS_MARKERS.has(entry));
  } catch {
    return false;
  }
}

/**
 * Walk up from a start directory to the first package root that carries a
 * bundled corpus. Works from `dist/` (installed or built) and from `src/`
 * (ts-node), because it keys on `package.json` beside a qualified `rulesets/`.
 */
export function findBundledCorpus(startDir: string): string | undefined {
  let dir = startDir;
  // Bounded so the walk can never escape past the filesystem root.
  for (let i = 0; i < 12; i++) {
    // BOTH candidate layouts at every ancestor, not just `<dir>/rulesets`.
    //
    // Measured in CI, by my own error message: the mcp-server tests run in a
    // repository checkout where the package has no bundled copy and the corpus
    // lives at `<repo>/src/rulesets`. A walk that only probed `<dir>/rulesets`
    // found nothing and refused — correct about what it looked for, wrong about
    // where a corpus can be. The installed layout is `<pkg>/rulesets` and the
    // monorepo one is `<repo>/src/rulesets`; both are legitimate, which is why
    // `RULESETS_CANDIDATE_SUBPATHS` lists them.
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      for (const subpath of RULESETS_CANDIDATE_SUBPATHS) {
        const candidate = path.join(dir, ...subpath);
        if (looksLikeCorpus(candidate)) return candidate;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

/**
 * Resolve the Core corpus for a running surface.
 *
 * @param options.override explicit core path, if the caller was given one.
 * @param options.fromDir  where to start the bundled walk — pass the calling
 *                         module's `__dirname`, so the corpus found is the one
 *                         shipped with THAT package.
 * @throws when an override is supplied and holds no corpus, naming every path
 *         tried; and when no override is supplied and nothing is bundled.
 */
export function resolveCorpus(options: { override?: string; fromDir: string }): ResolvedCorpus {
  const override = options.override?.trim();
  if (override) {
    const coreRoot = path.resolve(override);
    const { rulesetsRoot, probes } = probeRulesetsLocationSync(
      coreRoot,
      { existsSync: (p) => fs.existsSync(p), readdirNamesSync: (p) => fs.readdirSync(p) },
      path.sep,
    );
    if (!rulesetsRoot) throw new Error(describeRulesetsResolutionFailure(coreRoot, probes));
    return { coreRoot, rulesetsRoot, source: 'override' };
  }

  const bundled = findBundledCorpus(options.fromDir);
  if (bundled) {
    // The core root is the ancestor the corpus hangs off — `<pkg>` for
    // `<pkg>/rulesets`, `<repo>` for `<repo>/src/rulesets`. Consumers probe both
    // subpaths under it, so trimming the matched subpath (rather than taking the
    // parent) keeps them working in either layout.
    const trimmed = RULESETS_CANDIDATE_SUBPATHS
      .map((sub) => ({ sub, suffix: path.sep + path.join(...sub) }))
      .find(({ suffix }) => bundled.endsWith(suffix));
    const coreRoot = trimmed ? bundled.slice(0, -trimmed.suffix.length) : path.dirname(bundled);
    return { coreRoot, rulesetsRoot: bundled, source: 'bundled' };
  }

  throw new Error(
    'Could not locate an Evolith ruleset corpus: this package ships none and no core path was supplied. '
    + 'Pass --core <path>, set EVOLITH_CORE_PATH, or install a build that bundles its corpus. '
    + 'Guessing a sibling directory is what this replaced (GT-705).',
  );
}

/**
 * The non-throwing form, for a surface that must still start when no corpus can
 * be found — so it can say so at startup instead of failing at call time inside
 * somebody else's agent.
 */
export function tryResolveCorpus(options: { override?: string; fromDir: string }): ResolvedCorpus | undefined {
  try {
    return resolveCorpus(options);
  } catch {
    return undefined;
  }
}
