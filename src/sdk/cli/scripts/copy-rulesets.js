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
  // In an installed/detached context there genuinely is no source tree to copy
  // from and the rulesets are already bundled, so skipping is correct there.
  // But the previous version SKIPPED ON FAITH: it warned "already bundled?" --
  // with a question mark -- and exited 0 without checking whether anything was
  // in fact bundled. Running inside `prepublishOnly`, that publishes whatever
  // happened to be on disk, or nothing at all, and reports success either way.
  //
  // So the assumption is now verified rather than trusted, and publishing is
  // held to a stricter rule than building: a release must never ship a corpus
  // no one confirmed.
  const bundled = fs.existsSync(dest) ? fs.readdirSync(dest).length : 0;
  const lifecycle = process.env.npm_lifecycle_event ?? '(none)';

  if (bundled === 0) {
    console.error(
      `[copy-rulesets] canonical source not found at ${canonical}, and nothing is bundled at ${dest}.\n` +
        '  The "already bundled" assumption is false: there is no ruleset corpus to ship or to validate against.\n' +
        '  Run this from a full monorepo checkout containing src/rulesets.',
    );
    process.exit(1);
  }

  if (lifecycle === 'prepublishOnly') {
    console.error(
      `[copy-rulesets] refusing to publish: canonical source not found at ${canonical}.\n` +
        `  ${bundled} pre-existing entr(ies) are present at ${dest}, but nothing verified they match the canonical\n` +
        '  rulesets, and the CLI reads this corpus at runtime. Publish from a checkout that contains src/rulesets.',
    );
    process.exit(1);
  }

  console.warn(
    `[copy-rulesets] canonical source not found at ${canonical}; using the ${bundled} already-bundled entr(ies).\n` +
      `  This is expected in an installed/detached context (lifecycle: ${lifecycle}). It is NOT a refresh --\n` +
      '  the bundled corpus may be older than the canonical one.',
  );
  process.exit(0);
}

copyDir(canonical, dest);
console.log(`[copy-rulesets] bundled canonical rulesets → ${path.relative(cliRoot, dest)}/`);
