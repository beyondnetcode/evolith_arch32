/**
 * @file paths.mjs
 * @description Fail-closed, cwd-independent resolution of well-known repo paths (GT-556).
 *
 * ## Why this exists
 *
 * Harness CI scripts used to derive the repo root from `process.cwd()` and then join
 * hardcoded relative paths onto it. Two failure modes followed:
 *
 *   1. **cwd dependence.** `30-validate-phase-topology-disjoint.mjs` reported 8 topology
 *      ids from the repo root and 5 from `src/` — and exited 0 both times. A guard that
 *      answers differently depending on where it was invoked is not a guard.
 *   2. **Silent dead paths.** When a directory moved (`reference/products` ->
 *      `product/products`), the `existsSync` short-circuits every walker carries turned the
 *      miss into "nothing to scan", which reads as "nothing wrong". The check believed it
 *      ran, and did not.
 *
 * The fix is structural, not cosmetic:
 *
 *   - the repo root is found by **marker-based ascent** from this module's own location,
 *     so it is the same path no matter the cwd;
 *   - `resolve(key)` **throws** when the resolved path is absent, so a layout change is a
 *     loud failure at the first call instead of a quiet zero downstream;
 *   - the catalogue of well-known paths lives here once, so a move is a one-line fix
 *     rather than a grep across 17 scripts.
 *
 * Pair this with `coverage.mjs` — `resolve` catches paths that vanished, `assertScanned`
 * catches the residual case where the path exists but yields nothing.
 */

import { existsSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve as resolvePath, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Files/directories that, present together, identify the Evolith repo root.
 * All three must be present — `package.json` alone matches every workspace package,
 * and `.harness` alone would match a stray copy.
 */
export const ROOT_MARKERS = ['package.json', '.harness', 'evolith.yaml'];

/**
 * The catalogue of well-known repo paths. Keys are stable identifiers; values are
 * repo-root-relative POSIX-ish paths.
 *
 * Adding a key here is the supported way to teach a script about a new location.
 * Editing a value here is the supported way to record that something moved.
 */
export const PATH_KEYS = Object.freeze({
  // --- repo skeleton -------------------------------------------------------
  rootPackageJson: 'package.json',
  rootPackageLock: 'package-lock.json',
  evolithManifest: 'evolith.yaml',
  masterIndex: 'MASTER_INDEX.md',

  // --- harness -------------------------------------------------------------
  harness: '.harness',
  harnessScripts: '.harness/scripts',
  harnessScriptsLib: '.harness/scripts/lib',
  harnessCiScripts: '.harness/scripts/ci',
  harnessSchemas: '.harness/schemas',
  harnessManifest: '.harness/manifest.yaml',
  // GT-591: the SINGLE declaration of the pinned OPA version. Everything else derives.
  opaRuntimeModule: '.harness/scripts/opa-runtime.mjs',

  // --- CI / deployment surfaces that can name a pinned tool version --------
  githubWorkflows: '.github/workflows',
  productInfra: 'product/infra',

  // --- topologies ----------------------------------------------------------
  // GT-329: the progressive axis lives under reference/, advanced topologies under
  // src/rulesets/. Both roots are real; scanning only one silently halves the corpus.
  topologiesReference: 'reference/core/architecture/topologies',
  topologiesRulesets: 'src/rulesets/topologies',
  topologiesCli: 'src/sdk/cli/rulesets/topologies',

  // --- rulesets ------------------------------------------------------------
  rulesets: 'src/rulesets',
  rulesetSchemas: 'src/rulesets/schema',
  topologyCompositionSchema: 'src/rulesets/schema/topology-composition.schema.json',
  contractsManifest: 'src/rulesets/contracts/evolith-machine-contracts.json',
  phaseGateRules: 'src/rulesets/sdlc/phase-gates.rules.json',
  infrastructureOpa: 'src/rulesets/infrastructure/opa',

  // --- product surfaces ----------------------------------------------------
  // Formerly `reference/products` — moved, and the old literal survived in scripts 11/19.
  products: 'product/products',
  // Formerly `reference/knowledge/demo/examples` — moved; script 22 kept the old literal.
  demoExamples: 'product/research/demo/examples',
  // Formerly `reference/infrastructure/helm` — moved; script 29 kept the old literal.
  helmCharts: 'product/infra/helm',

  // --- control center ------------------------------------------------------
  // The former `reference/core/sdlc/standards/vision` split across these three.
  controlCenter: 'reference/core/control-center',
  gaps: 'reference/core/control-center/gaps',
  gapTracking: 'reference/core/control-center/gaps/gap-tracking.md',
  gapTrackingEs: 'reference/core/control-center/gaps/gap-tracking.es.md',
  gapCatalog: 'reference/core/control-center/gaps/gap-reference-catalog.md',
  gapCatalogEs: 'reference/core/control-center/gaps/gap-reference-catalog.es.md',
  evidence: 'reference/core/control-center/evidence',
  gapClosureEvidence: 'reference/core/control-center/evidence/gap-closure-evidence.json',
  maturityReports: 'reference/core/control-center/maturity-reports',
  maturityEvidence: 'reference/core/control-center/maturity-reports/maturity-evidence.json',
  taxonomy: 'reference/core/control-center/taxonomy',

  // --- sdlc / docs ---------------------------------------------------------
  sdlc: 'reference/core/sdlc',
  adrs: 'reference/core/architecture/adrs',
  adrsCore: 'reference/core/architecture/adrs/core',
  agentSkills: 'reference/core/foundations/agent-skills',
  agentSkillsManifest: 'reference/core/foundations/agent-skills/manifest.json',
  artifactTemplates: 'reference/core/sdlc/04-artifact-templates',

  // --- source packages -----------------------------------------------------
  src: 'src',
  packages: 'src/packages',
  cliPackageJson: 'src/sdk/cli/package.json',
  cli: 'src/sdk/cli',
  coreApi: 'src/apps/core-api',
  // Formerly referenced as `apps/core-api/...` (missing the `src/` prefix) in script 19.
  coreApiControllers: 'src/apps/core-api/src/presentation/controllers',
  coreApiChangelog: 'product/products/core-api/changelog.md',
  agentRuntime: 'src/packages/agent-runtime',
  agentRuntimeAdapters: 'src/packages/agent-runtime/src/adapters',
  // Formerly referenced as `packages/agent-runtime/...` (missing `src/`) in script 33.
  agentRuntimeAdaptersBarrel: 'src/packages/agent-runtime/src/adapters/index.ts',
  agentRuntimeInteractionAdapters: 'src/packages/agent-runtime/src/adapters/interaction',
  // GT-587: the single declaration of the pinned OpenTelemetry semconv vocabulary.
  semconvPin: 'src/packages/core-domain/src/evaluation/telemetry/semconv.ts',
});

/**
 * Ascend from `startDir` looking for a directory containing every ROOT_MARKER.
 *
 * This deliberately does NOT consult `process.cwd()`. The default start is this
 * module's own directory, which is inside the repo by construction, so the answer is
 * identical whether the caller ran from the repo root, from `src/`, or from `/`.
 *
 * @param {string} [startDir] directory to start ascending from
 * @returns {string} absolute path to the repo root
 * @throws {Error} when no ancestor carries all markers
 */
export function findRepoRoot(startDir = dirname(fileURLToPath(import.meta.url))) {
  let current = resolvePath(startDir);
  const visited = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    visited.push(current);
    if (ROOT_MARKERS.every((marker) => existsSync(join(current, marker)))) return current;

    const parent = dirname(current);
    if (parent === current) break; // reached the filesystem root
    current = parent;
  }

  throw new Error(
    `[paths] Could not locate the Evolith repo root.\n` +
      `  Ascended from: ${resolvePath(startDir)}\n` +
      `  Looked for a directory containing all of: ${ROOT_MARKERS.join(', ')}\n` +
      `  Checked ${visited.length} director${visited.length === 1 ? 'y' : 'ies'} up to the filesystem root.\n` +
      `  This module must live inside the repository it describes.`,
  );
}

/**
 * The repo root, computed once. Cwd-independent by construction.
 * @type {string}
 */
export const REPO_ROOT = findRepoRoot();

function keyOrThrow(key) {
  if (!Object.prototype.hasOwnProperty.call(PATH_KEYS, key)) {
    throw new Error(
      `[paths] Unknown path key '${key}'.\n` +
        `  Known keys: ${Object.keys(PATH_KEYS).sort().join(', ')}\n` +
        `  Add the key to PATH_KEYS in .harness/scripts/lib/paths.mjs rather than hardcoding a literal.`,
    );
  }
  return PATH_KEYS[key];
}

/**
 * Resolve a well-known path to an absolute path, **failing closed** if it is absent.
 *
 * A missing well-known path means the repo layout changed underneath the harness. That
 * is a defect to surface immediately, not a reason to scan nothing and report success.
 *
 * @param {string} key a key from PATH_KEYS
 * @param {...string} segments optional extra path segments joined onto the result
 * @returns {string} absolute path, guaranteed to exist at call time
 * @throws {Error} when the resolved path does not exist
 */
export function resolve(key, ...segments) {
  const rel = keyOrThrow(key);
  const abs = join(REPO_ROOT, rel, ...segments);

  if (!existsSync(abs)) {
    throw new Error(
      `[paths] FAIL-CLOSED: path key '${key}' does not exist on disk.\n` +
        `  Resolved to: ${abs}\n` +
        `  Repo root:   ${REPO_ROOT}\n` +
        `  Declared as: ${rel}${segments.length ? ` (+ ${segments.join('/')})` : ''}\n` +
        `  The repository layout has most likely changed. Update PATH_KEYS in\n` +
        `  .harness/scripts/lib/paths.mjs to point at the new location — do NOT\n` +
        `  guard this call with existsSync, which would turn a moved directory into\n` +
        `  a silently-passing check. If the path is genuinely optional, use optional('${key}').`,
    );
  }

  return abs;
}

/**
 * Resolve a well-known path without requiring it to exist.
 *
 * This is the legitimate escape hatch for genuinely-optional inputs (build outputs,
 * generated bundles, locally-absent artifacts). It exists so that authors facing an
 * optional path reach for a purpose-built API instead of weakening `resolve`.
 *
 * Callers are expected to handle `null` explicitly — typically by skipping with a
 * message that names what was skipped and why.
 *
 * @param {string} key a key from PATH_KEYS
 * @param {...string} segments optional extra path segments
 * @returns {string|null} absolute path, or null when absent
 */
export function optional(key, ...segments) {
  const abs = join(REPO_ROOT, keyOrThrow(key), ...segments);
  return existsSync(abs) ? abs : null;
}

/**
 * Resolve a well-known path without touching the filesystem at all.
 * Useful for error messages, reporting, and asserting on layout in tests.
 *
 * @param {string} key a key from PATH_KEYS
 * @param {...string} segments optional extra path segments
 * @returns {string} absolute path, existence not checked
 */
export function expected(key, ...segments) {
  return join(REPO_ROOT, keyOrThrow(key), ...segments);
}

/**
 * Repo-root-relative, POSIX-separated form of an absolute path — for stable log output
 * that does not leak the machine's directory layout.
 *
 * @param {string} absolutePath
 * @returns {string}
 */
export function relativeToRoot(absolutePath) {
  const abs = isAbsolute(absolutePath) ? absolutePath : join(REPO_ROOT, absolutePath);
  const rel = abs.startsWith(REPO_ROOT + sep) ? abs.slice(REPO_ROOT.length + 1) : abs;
  return rel.split(sep).join('/');
}

/**
 * Audit every catalogued key against the filesystem. Intended for tests and for a
 * standalone "is the catalogue still true?" check.
 *
 * @returns {{ key: string, path: string, exists: boolean }[]}
 */
export function auditCatalogue() {
  return Object.keys(PATH_KEYS)
    .sort()
    .map((key) => {
      const path = expected(key);
      return { key, path, exists: existsSync(path) };
    });
}

/**
 * Recursively collect files with a given basename under one or more path keys.
 *
 * Centralised because five separate scripts had near-identical walkers, each with its
 * own `existsSync` short-circuit — which is exactly how a dead root became invisible.
 * Here a dead root is an exception via `resolve`, not a silent skip.
 *
 * @param {string[]} keys path keys to walk
 * @param {string} basename exact file name to collect
 * @returns {string[]} absolute file paths
 */
export function collectFiles(keys, basename) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === basename) out.push(full);
    }
  };
  for (const key of keys) walk(resolve(key));
  return out;
}
