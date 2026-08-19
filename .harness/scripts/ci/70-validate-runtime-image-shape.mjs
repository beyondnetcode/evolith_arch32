#!/usr/bin/env node

/**
 * GT-692 — a deployable image must not ship the tree its BUILD needed.
 *
 * ## What this exists to stop happening again
 *
 * Every one of this repository's four images copied the whole workspace
 * `node_modules` — 659 MB, `typescript`, `eslint`, `jest` and `@types/*` included —
 * into its runtime stage, and then ran a recursive `chown -R` over it, which in
 * Docker rewrites every file into a NEW layer. Measured on `core-api`: that single
 * `RUN` was **586 MB**, a byte-for-byte duplicate of everything above it.
 *
 * The cost was not hypothetical and it was not paid here. The Tracker's
 * `Deploy (kind + Helm + smoke)` job died importing `evolith-core-api` into a kind
 * node with `ctr: failed to extract layer … no space left on device`, on paths that
 * name the cause outright — `@types/node/quic.d.ts`, `@sinonjs/commons/…` and
 * `get-intrinsic/CHANGELOG.md`: two declaration trees and a test-double library
 * being unpacked into a production image.
 *
 * ## What it checks, and what it deliberately does not
 *
 * It checks the SHAPE of every deployable Dockerfile, which is the cause:
 *
 *   1. the builder prunes development dependencies before the runner copies them;
 *   2. no recursive `chown` over a copied tree — ownership is set by `COPY --chown`.
 *
 * It does NOT check image size, and that gap is deliberate rather than overlooked.
 * A size budget requires building four images, which needs Docker and minutes; this
 * guard runs in seconds anywhere. Shape is what regresses when someone adds an image
 * by copying an existing Dockerfile — size is the symptom of exactly these two lines.
 * The measured sizes are recorded in `runtime-image-budgets.json` so the day a
 * Docker-building job wants a budget, the baseline is already written down and not
 * re-derived from memory.
 *
 * ## Anti-vacuous pass
 *
 * The Dockerfile set is discovered, never listed, and asserted through
 * `assertScannedPerSource`: zero Dockerfiles found is a hard failure, because a guard
 * that scanned nothing has certified nothing.
 *
 * Usage:
 *   node .harness/scripts/ci/70-validate-runtime-image-shape.mjs
 *   node .harness/scripts/ci/70-validate-runtime-image-shape.mjs --verbose
 *
 * Exit codes:
 *   0 - every deployable image prunes, and none rewrites a copied tree with chown -R
 *   1 - an image ships development dependencies, duplicates a tree, or none was found
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPO_ROOT } from '../lib/paths.mjs';
import { assertScannedPerSource, ZeroCoverageError } from '../lib/coverage.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const BUDGETS_PATH = resolve(HERE, 'runtime-image-budgets.json');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.claude']);

/** Every Dockerfile in the tree, discovered rather than listed. */
export function findDockerfiles(root) {
  const found = [];
  (function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        // A nested checkout is not part of this repository's tree (see guard 64).
        if (existsSync(join(full, '.git'))) continue;
        walk(full);
      } else if (entry.name === 'Dockerfile') {
        found.push(relative(root, full));
      }
    }
  })(root);
  return found.sort();
}

/**
 * The two shape rules, applied to one Dockerfile's text.
 *
 * Pure so the unit test can drive it with strings instead of scaffolding images.
 */
export function inspectShape(text) {
  const lines = text.split('\n');
  const findings = [];

  const multiStage = /^FROM\s+\S+\s+AS\s+\w+/im.test(text);
  if (!multiStage) {
    // A single-stage image has no builder to prune; it is a different shape and this
    // guard has nothing to say about it. Reported so the denominator stays honest.
    return { findings, applicable: false, prunes: false };
  }

  const prunes = /npm\s+prune\s+--omit=dev|npm\s+ci\s+[^\n]*--omit=dev|npm\s+install\s+[^\n]*--omit=dev/.test(text);
  if (!prunes) {
    findings.push({
      rule: 'prune',
      message:
        'the runner receives the build tree unpruned — add `RUN npm prune --omit=dev` at the end of the ' +
        'builder stage, or install with `--omit=dev`. Shipping `typescript`, `eslint` and `jest` into a ' +
        'runtime image is what exhausted a consumer\'s kind node.',
    });
  }

  for (const [i, line] of lines.entries()) {
    // `chown -R` inside a RUN duplicates every file it touches into a new layer.
    // Ownership belongs on the COPY that writes the files.
    if (/^\s*(RUN|&&)?\s*.*\bchown\s+-R\b/.test(line) && !/^\s*#/.test(line)) {
      findings.push({
        rule: 'chown',
        line: i + 1,
        message:
          `recursive chown at line ${i + 1} — it rewrites every file into a NEW layer (586 MB on core-api). ` +
          'Create the user before the copies and use `COPY --chown=<user>:<group>` instead.',
      });
    }
  }

  return { findings, applicable: true, prunes };
}

function main() {
  const verbose = process.argv.includes('--verbose');
  const root = REPO_ROOT;

  console.log('🐳 Runtime image shape — a deployable image must not ship its build tree (GT-692)');

  const dockerfiles = findDockerfiles(root);
  const budgets = existsSync(BUDGETS_PATH) ? JSON.parse(readFileSync(BUDGETS_PATH, 'utf8')) : { images: [] };

  try {
    assertScannedPerSource(
      { Dockerfiles: dockerfiles.length, 'recorded budgets': (budgets.images ?? []).length },
      { what: 'deployable image inputs' },
    );
  } catch (err) {
    if (err instanceof ZeroCoverageError) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const problems = [];
  let multiStage = 0;

  for (const rel of dockerfiles) {
    const { findings, applicable } = inspectShape(readFileSync(resolve(root, rel), 'utf8'));
    if (applicable) multiStage += 1;
    for (const f of findings) problems.push({ file: rel, ...f });
    if (verbose) {
      console.log(`   · ${rel}: ${applicable ? (findings.length ? `${findings.length} finding(s)` : 'clean') : 'single-stage, not applicable'}`);
    }
  }

  console.log(`   ${dockerfiles.length} Dockerfile(s) scanned, ${multiStage} multi-stage; ${problems.length} finding(s).`);
  console.log(
    `   recorded sizes (${budgets.measuredOn ?? 'undated'}): ` +
      (budgets.images ?? []).map((i) => `${i.id} ${i.after}`).join(' · '),
  );

  if (problems.length > 0) {
    console.error(`❌ ${problems.length} deployable image(s) ship or duplicate what they should not:`);
    for (const p of problems) console.error(`   - ${p.file}: ${p.message}`);
    process.exit(1);
  }

  console.log('✓ 70-validate-runtime-image-shape: every multi-stage image prunes, and none rewrites a copied tree.');
  process.exit(0);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}
