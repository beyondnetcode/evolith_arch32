#!/usr/bin/env node

/**
 * GT-591 criterion 3 — the pinned OPA version is DECLARED ONCE, is on the v1 line,
 * and any drift from it is a red build.
 *
 * ## Why a pin needs a guard at all
 *
 * The pin sat at `0.65.0` from May 2024 until 2026-07-31 and nothing said so. That is
 * not an oversight anyone repeats deliberately; it is what happens when the only thing
 * holding a version is a string literal nobody is asked about. Worse, there were TWO
 * literals: `opa-runtime.mjs` exported `OPA_VERSION` for the test guards, and
 * `compile-opa-wasm.mjs` spelled `v0.65.0` again inside a download URL for the wasm
 * bundle. Two owners of one pin is a drift generator with a delay fuse — bump one and
 * the policies are TESTED by one compiler and COMPILED by another, and every suite
 * stays green while the artifact that actually enforces in production is built by an
 * unpinned toolchain.
 *
 * ## The v1 line makes the corpus part of the pin
 *
 * OPA v1 made `if` and `contains` MANDATORY rather than optional. So on this line the
 * version pin and the Rego dialect are one fact, not two: a policy that loses its v1
 * form is not a style regression, it is a file the pinned binary refuses to parse — and
 * it fails at load time, which for a fail-closed evaluator means a DENIAL. Rule 3 below
 * therefore belongs to this guard and not to a linter.
 *
 * ## What it checks (three rules, each able to go red on its own)
 *
 *   1. **One owner, on the v1 line.** `OPA_VERSION` in `.harness/scripts/opa-runtime.mjs`
 *      must parse as `MAJOR.MINOR.PATCH` with MAJOR >= 1. A pin that drifts back to the
 *      v0 line silently un-mandates `if`/`contains` and re-admits v0 policies.
 *   2. **No second spelling.** Every OPA version literal anywhere in the scanned corpus
 *      — download URLs, container image tags, prose in the READMEs, Dockerfile comments,
 *      Helm values — must equal the pin. This is the rule that would have caught the
 *      `compile-opa-wasm.mjs` divergence, and it is why that file now IMPORTS the
 *      constant instead of restating it.
 *   3. **The corpus stays v1-parseable.** Every `.rego` file under the ruleset roots and
 *      the reference topology root must declare `import rego.v1`. Deliberately a TEXT
 *      rule and not `opa check`: this guard must be able to fail on a machine with no
 *      network and no binary, and a check that can only run when a download succeeded is
 *      a check that quietly does not run. `29-test-core-opa.mjs` and
 *      `28-test-topology-opa.mjs` execute the real parser; this one pins the invariant
 *      that keeps them loadable.
 *
 * The declaration is redundant under a v1 binary, which is the point: it keeps each file
 * parseable by BOTH lines, so the pin can move in either direction without a flag day.
 *
 * ## Anti-vacuous pass
 *
 * Zero version references scanned, or zero `.rego` files found, is a hard exit 1 through
 * the repository's own `assertScannedPerSource` — never "nothing to check, all good".
 * Per-source, not per-total, because the two rego roots mask each other: the reference
 * root held the last six v0 files in the repository while the `src/` root was fully
 * migrated, and a combined count would have looked healthy throughout.
 * `resolve()` is fail-closed, so a moved root is a loud error rather than an empty corpus.
 *
 * There is deliberately no `--root`: every location comes from `PATH_KEYS`, so the guard
 * answers the same way from any cwd, and `43-validate-guard-negative-fixtures.mjs` gets
 * it red by running it inside a repo-shaped tree with no `src/rulesets` at all.
 *
 * Usage:
 *   node .harness/scripts/ci/53-validate-opa-pin.mjs
 *   node .harness/scripts/ci/53-validate-opa-pin.mjs --verbose
 *
 * Exit codes:
 *   0 - one pin, on the v1 line, and every rego file declares the v1 dialect
 *   1 - a v0-line pin, a version literal that disagrees with it, a v0-style rego file,
 *       a missing root, or a vacuous scan
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { assertScanned, assertScannedPerSource } from '../lib/coverage.mjs';
import { PATH_KEYS, resolve, relativeToRoot } from '../lib/paths.mjs';
import { OPA_VERSION } from '../opa-runtime.mjs';

const GUARD = '53-validate-opa-pin';
const VERBOSE = process.argv.slice(2).includes('--verbose');

/** The single owner of the pin, named by PATH KEY so a move is loud. */
const PIN_MODULE_KEY = 'opaRuntimeModule';

/**
 * Roots whose `.rego` files must be v1-style. BOTH topology roots are here on
 * purpose — see the anti-vacuous note above.
 */
const REGO_ROOT_KEYS = ['rulesets', 'topologiesReference'];

/**
 * Where an OPA version literal is allowed to appear at all. Anything matching
 * `OPA_VERSION_PATTERNS` inside these roots must equal the pin.
 *
 * `reference/core/control-center/` is excluded below: the gap board and its closure
 * evidence are a HISTORICAL record, and a sentence describing what a past wave pinned
 * is not drift. Rewriting history to keep a guard green is the failure mode this
 * exclusion prevents.
 */
const VERSION_SCAN_ROOT_KEYS = ['harnessScripts', 'rulesets', 'githubWorkflows', 'productInfra', 'packages'];

const VERSION_SCAN_EXTENSIONS = ['.mjs', '.js', '.ts', '.md', '.yml', '.yaml', '.json', '.sh'];
const VERSION_SCAN_SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', 'bin']);
const VERSION_SCAN_SKIP_FILES = new Set(['package-lock.json']);

/**
 * Every shape in which this repository has ever written an OPA version.
 *
 * The examples below are deliberately spelled with a `<major>.<minor>.<patch>`
 * placeholder rather than a real version: this file is INSIDE the scanned corpus, and a
 * guard whose own documentation trips it teaches the next author to add an exclusion for
 * it — which is a hole in the only rule that catches a second spelling.
 */
const OPA_VERSION_PATTERNS = [
  // openpolicyagent.org/downloads/v<major>.<minor>.<patch>/opa_linux_amd64_static
  { label: 'download URL', re: /openpolicyagent\.org\/downloads\/v(\d+\.\d+\.\d+)/g },
  // image: openpolicyagent/opa:<major>.<minor>.<patch>
  { label: 'container image tag', re: /openpolicyagent\/opa:v?(\d+\.\d+\.\d+)/g },
  // "downloads OPA `v<major>.<minor>.<patch>`" in prose, comments and docs
  { label: 'prose reference', re: /\bOPA\s+`?v?(\d+\.\d+\.\d+)`?/g },
];

/** Dockerfiles carry the pin in comments and RUN lines but have no extension. */
const EXTRA_VERSION_SCAN_BASENAMES = new Set(['Dockerfile']);

function walkFiles(dir, keep) {
  const out = [];
  const visit = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        if (VERSION_SCAN_SKIP_DIRS.has(entry.name)) continue;
        visit(full);
        continue;
      }
      if (keep(entry.name)) out.push(full);
    }
  };
  visit(dir);
  return out;
}

const isVersionScanFile = (name) =>
  !VERSION_SCAN_SKIP_FILES.has(name) &&
  (EXTRA_VERSION_SCAN_BASENAMES.has(name) ||
    name.startsWith('Dockerfile.') ||
    VERSION_SCAN_EXTENSIONS.some((ext) => name.endsWith(ext)));

function main() {
  const violations = [];

  // --- Rule 1: one owner, and it is on the v1 line -------------------------------
  const pinModule = resolve(PIN_MODULE_KEY);
  const pinSource = readFileSync(pinModule, 'utf8');
  const declared = /export const OPA_VERSION\s*=\s*'([^']+)'/.exec(pinSource)?.[1];

  if (declared === undefined) {
    violations.push(
      `${relativeToRoot(pinModule)} no longer exports a literal OPA_VERSION.\n` +
        `      This guard reads the SOURCE, not the imported value, so that a pin computed at\n` +
        `      runtime — from an env var, a fetch, a "latest" lookup — fails here instead of\n` +
        `      passing as whatever the machine happened to resolve.`,
    );
  } else if (declared !== OPA_VERSION) {
    violations.push(
      `${relativeToRoot(pinModule)} declares '${declared}' in source but exports '${OPA_VERSION}'.\n` +
        `      The pin is being rewritten between declaration and export.`,
    );
  }

  const parsed = /^(\d+)\.(\d+)\.(\d+)$/.exec(OPA_VERSION);
  if (!parsed) {
    violations.push(
      `OPA_VERSION '${OPA_VERSION}' is not a MAJOR.MINOR.PATCH version.\n` +
        `      A pin that cannot be compared cannot be checked for drift.`,
    );
  } else if (Number(parsed[1]) < 1) {
    violations.push(
      `OPA_VERSION '${OPA_VERSION}' is on the v0 line, which upstream has left behind.\n` +
        `      On v0 the 'if' and 'contains' keywords are OPTIONAL, so a v0-style policy loads\n` +
        `      without complaint and this repository slowly re-accumulates the dialect it just\n` +
        `      migrated off. Pin a 1.x release (GT-591).`,
    );
  }

  // --- Rule 2: no second spelling of the pin -------------------------------------
  const scanned = [];
  for (const key of VERSION_SCAN_ROOT_KEYS) {
    const root = resolve(key);
    if (!statSync(root).isDirectory()) continue;
    scanned.push(...walkFiles(root, isVersionScanFile));
  }
  const uniqueFiles = [...new Set(scanned)].sort();

  const references = [];
  for (const file of uniqueFiles) {
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    for (const { label, re } of OPA_VERSION_PATTERNS) {
      for (const match of text.matchAll(re)) {
        const line = text.slice(0, match.index).split('\n').length;
        references.push({
          file: relativeToRoot(file),
          line,
          label,
          version: match[1],
          text: (lines[line - 1] ?? '').trim(),
        });
      }
    }
  }

  for (const ref of references) {
    if (ref.version !== OPA_VERSION) {
      violations.push(
        `${ref.file}:${ref.line} names OPA ${ref.version}, the pin is ${OPA_VERSION} (${ref.label}).\n` +
          `      ${ref.text}\n` +
          `      A version spelled a second time is a second pin. Derive it from OPA_VERSION in\n` +
          `      ${PATH_KEYS[PIN_MODULE_KEY]} — or, where a literal is unavoidable (an image tag in\n` +
          `      a Helm values file), update it in the same commit that moves the pin.`,
      );
    }
  }

  // --- Rule 3: every rego file still declares the v1 dialect ----------------------
  const regoByRoot = {};
  const v0Files = [];
  for (const key of REGO_ROOT_KEYS) {
    const root = resolve(key);
    const files = walkFiles(root, (name) => name.endsWith('.rego'));
    regoByRoot[key] = files.length;
    for (const file of files) {
      if (!/^\s*import\s+rego\.v1\s*$/m.test(readFileSync(file, 'utf8'))) {
        v0Files.push(relativeToRoot(file));
      }
    }
  }

  for (const file of v0Files) {
    violations.push(
      `${file} does not declare 'import rego.v1'.\n` +
        `      Under the pinned OPA ${OPA_VERSION} this file may fail to PARSE, and a policy that\n` +
        `      fails to load is a fail-closed denial, not a skipped check. Convert it with\n` +
        `      \`opa fmt --rego-v1 -w <file>\` and re-run the policy tests before and after.`,
    );
  }

  // --- Anti-vacuous ---------------------------------------------------------------
  assertScanned(references.length, {
    what: 'OPA version references',
    where: VERSION_SCAN_ROOT_KEYS.map((k) => PATH_KEYS[k]),
  });
  assertScannedPerSource(regoByRoot, { what: 'rego policy files' });

  if (violations.length > 0) {
    console.error(`✗ ${GUARD}: ${violations.length} finding(s)\n`);
    for (const v of violations) console.error(`  • ${v}\n`);
    process.exit(1);
  }

  const totalRego = Object.values(regoByRoot).reduce((a, b) => a + b, 0);
  console.log(`✅ ${GUARD}`);
  console.log(`  pinned OPA ......... ${OPA_VERSION} (v1 line)`);
  console.log(`  files scanned ...... ${uniqueFiles.length}`);
  console.log(`  version references . ${references.length}, all agreeing with the pin`);
  console.log(`  rego files ......... ${totalRego}, all declaring 'import rego.v1'`);
  for (const [key, count] of Object.entries(regoByRoot)) {
    console.log(`    • ${PATH_KEYS[key]} ${'.'.repeat(Math.max(1, 34 - PATH_KEYS[key].length))} ${count}`);
  }
  if (VERBOSE) {
    for (const ref of references) console.log(`    • ${ref.file}:${ref.line} [${ref.label}] ${ref.version}`);
  }
}

main();
