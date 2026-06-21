#!/usr/bin/env node
// GT-174 — Surface compatibility matrix check.
//
// Verifies that:
// 1. Each surface entry in surface-compatibility.json points to a module that
//    exists and exports the declared schemaVersion constant.
// 2. The constant value matches the FIRST entry in `produces` (the current
//    pinned version).
// 3. Bumping a constant without adding a migration entry triggers a hint
//    (we cannot enforce migrations without a git-aware diff, but we can
//    enforce that the matrix and source agree at HEAD).

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import process from 'node:process';

const ROOT = resolve(process.cwd());
const MATRIX_PATH = join(
  ROOT,
  'reference/governance/standards/vision/surface-compatibility.json',
);

const SEMVER = /^\d+\.\d+\.\d+$/;

function loadMatrix() {
  try {
    return JSON.parse(readFileSync(MATRIX_PATH, 'utf8'));
  } catch (err) {
    console.error(`✗ Failed to read surface-compatibility.json: ${err.message}`);
    process.exit(1);
  }
}

function extractConstant(source, name) {
  const re = new RegExp(
    `export\\s+const\\s+${name}\\s*=\\s*['"]([^'"]+)['"]`,
    'm',
  );
  const m = re.exec(source);
  return m ? m[1] : null;
}

function check(matrix) {
  const failures = [];

  for (const [surface, entry] of Object.entries(matrix.surfaces ?? {})) {
    const modulePath = join(ROOT, entry.module);
    let source;
    try {
      source = readFileSync(modulePath, 'utf8');
    } catch {
      failures.push(`[${surface}] declared module not found: ${entry.module}`);
      continue;
    }
    const value = extractConstant(source, entry.constant);
    if (!value) {
      failures.push(
        `[${surface}] constant ${entry.constant} not found (or non-literal) in ${entry.module}`,
      );
      continue;
    }
    if (!SEMVER.test(value)) {
      failures.push(
        `[${surface}] ${entry.constant} = "${value}" is not semver`,
      );
      continue;
    }
    const produces = entry.produces ?? [];
    if (produces[0] !== value) {
      failures.push(
        `[${surface}] source constant ${entry.constant}="${value}" does not match matrix produces[0]="${produces[0] ?? 'undefined'}". ` +
          'Either revert the source bump or prepend the new version and add a migration entry.',
      );
    }
  }

  return failures;
}

function main() {
  const matrix = loadMatrix();
  const failures = check(matrix);
  if (failures.length === 0) {
    const count = Object.keys(matrix.surfaces ?? {}).length;
    console.log(`✓ Surface compatibility matrix (GT-174) consistent for ${count} surfaces.`);
    process.exit(0);
  }
  console.error('✗ Surface compatibility matrix check failed:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

main();
