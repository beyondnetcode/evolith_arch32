#!/usr/bin/env node
/**
 * Release-drift guard (GT-451).
 *
 * The published npm artifact and the source drifted under the same 1.0.0: the
 * tarball satellites installed predated fixes already merged into src/ (batch
 * init, the gate path refactor, the evaluate DI wiring, the rulesets resolver).
 * This guard runs in `prepublishOnly` and fails the publish when the freshly
 * built `dist/` does NOT carry the known fixes, so a stale build can never ship.
 *
 * It is deterministic and offline: it asserts marker strings are present (or
 * absent) in the built output. Add a marker here whenever a fix must never
 * silently regress out of a release.
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** @type {{ file: string, mustContain?: string[], mustNotContain?: string[], gap: string }[]} */
const CHECKS = [
  {
    file: 'dist/commands/init/init.command.js',
    mustContain: ['resolveBatchInput', 'readSetupFile'],
    gap: 'GT-451/F-001 (batch/non-interactive init)',
  },
  {
    file: 'dist/commands/validate/validate.command.js',
    mustContain: ['resolveRulesets', 'GOV-CORE-UNRESOLVED'],
    gap: 'GT-456/GT-452 (Core resolution + no false-green)',
  },
  {
    file: 'dist/commands/docs/docs.command.js',
    mustContain: ['evolith.yaml'],
    mustNotContain: ['.evolith/evolith.yaml'],
    gap: 'GT-454 (docs writes root evolith.yaml)',
  },
  {
    file: 'dist/commands/api/api.catalog.js',
    mustContain: ['GENERATED_TOOLS'],
    gap: 'GT-460 (api surface from the live MCP registry)',
  },
  {
    file: 'templates/evolith.yaml.example',
    mustContain: ['apiVersion: evolith.dev/v1', 'kind: Satellite'],
    mustNotContain: ['currentPhase: "phase-2"'],
    gap: 'GT-453 (v1 satellite template)',
  },
];

const failures = [];

for (const check of CHECKS) {
  const full = resolve(pkgRoot, check.file);
  if (!existsSync(full)) {
    failures.push(`[${check.gap}] built artifact missing: ${check.file}`);
    continue;
  }
  const content = readFileSync(full, 'utf8');
  for (const marker of check.mustContain ?? []) {
    if (!content.includes(marker)) {
      failures.push(`[${check.gap}] ${check.file} is stale — missing marker: "${marker}"`);
    }
  }
  for (const marker of check.mustNotContain ?? []) {
    if (content.includes(marker)) {
      failures.push(`[${check.gap}] ${check.file} regressed — forbidden marker present: "${marker}"`);
    }
  }
}

if (failures.length > 0) {
  console.error('✗ Release-drift guard failed — do NOT publish this build:\n');
  for (const f of failures) console.error('  - ' + f);
  console.error('\nRebuild from current source (`npm run build`) before publishing.');
  process.exit(1);
}

console.log('✓ Release-drift guard passed — built dist carries the expected fixes.');
