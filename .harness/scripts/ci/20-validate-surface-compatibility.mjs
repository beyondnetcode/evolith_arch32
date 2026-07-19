#!/usr/bin/env node
// GT-174 — Surface compatibility matrix check.
//
// Verifies that:
// 1. The matrix file conforms to surface-compatibility.schema.json.
// 2. Each surface entry points to a module that exists and exports the
//    declared schemaVersion constant.
// 3. The constant value matches the FIRST entry in `produces` (the current
//    pinned version).
// 4. Every multi-version `produces` list is accompanied by an explicit
//    migration entry per consecutive version transition. A producer change
//    that retires a prior version without a documented migration is rejected
//    so consumers can react before the corpus accepts the new contract.

import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import process from 'node:process';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ROOT = resolve(process.cwd());
const MATRIX_PATH = join(
  ROOT,
  'reference/core/control-center/audits/surface-compatibility.json',
);
const SCHEMA_PATH = join(
  ROOT,
  'reference/core/control-center/audits/surface-compatibility.schema.json',
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

function validateSchema(matrix) {
  if (!existsSync(SCHEMA_PATH)) {
    return [];
  }
  try {
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    if (!validate(matrix)) {
      return [
        `matrix violates surface-compatibility.schema.json: ${ajv.errorsText(validate.errors, { separator: '; ' })}`,
      ];
    }
    return [];
  } catch (err) {
    return [`failed to compile surface-compatibility.schema.json: ${err.message}`];
  }
}

function checkMigrations(matrix) {
  const failures = [];
  const migrations = matrix.migrations ?? [];
  const key = (surface, from, to) => `${surface}|${from}->${to}`;
  const migrationIndex = new Set(migrations.map(m => key(m.surface, m.from, m.to)));

  for (const [surface, entry] of Object.entries(matrix.surfaces ?? {})) {
    const produces = entry.produces ?? [];
    for (let i = 0; i < produces.length - 1; i++) {
      const next = produces[i];
      const prev = produces[i + 1];
      if (!migrationIndex.has(key(surface, prev, next))) {
        failures.push(
          `[${surface}] producer transition ${prev} → ${next} is not documented in migrations[]. ` +
          'Add an entry {surface, from, to, summary} so consumers can react before the corpus accepts the new contract.',
        );
      }
    }
  }
  return failures;
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
  const failures = [
    ...validateSchema(matrix),
    ...check(matrix),
    ...checkMigrations(matrix),
  ];
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
