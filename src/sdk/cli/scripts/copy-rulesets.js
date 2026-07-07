#!/usr/bin/env node
/**
 * copy-rulesets — bundle the canonical rulesets into the CLI package so an
 * installed `@beyondnet/evolith-cli` is self-contained (no repo checkout needed).
 *
 * Copies `<repo root>/src/rulesets` → `<cli>/rulesets`, MERGING into the
 * existing `rulesets/` dir (which already holds agent fixtures) rather than
 * replacing it. Idempotent; safe to run on every build and before publish.
 */
const fs = require('fs');
const path = require('path');

const cliRoot = path.resolve(__dirname, '..');
// <cli> = src/sdk/cli  →  repo root is three levels up; canonical rulesets live
// at <repo>/src/rulesets.
const canonical = path.resolve(cliRoot, '..', '..', 'rulesets');
const dest = path.join(cliRoot, 'rulesets');

function copyDir(from, to) {
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dst);
    } else if (entry.isFile()) {
      fs.copyFileSync(src, dst);
    }
  }
}

if (!fs.existsSync(canonical)) {
  // In an installed/detached context there is no source tree to copy from; the
  // rulesets are expected to be already bundled. Do not fail the build.
  console.warn(`[copy-rulesets] canonical source not found at ${canonical}; skipping (already bundled?)`);
  process.exit(0);
}

copyDir(canonical, dest);
console.log(`[copy-rulesets] bundled canonical rulesets → ${path.relative(cliRoot, dest)}/`);
