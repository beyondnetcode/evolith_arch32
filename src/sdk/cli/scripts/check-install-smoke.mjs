#!/usr/bin/env node
/**
 * Clean-room install smoke (GT-571).
 *
 * WHY THIS EXISTS
 * `@beyondnet/evolith-cli@1.2.0` was published on 2026-07-27 and is completely
 * unusable: every invocation, including `--version` and `--help`, dies with
 *
 *   Cannot find module '.../@beyondnet/evolith-core-domain/dist/application/paths/rulesets-location.js'
 *
 * The shipped `dist` deep-imports `@beyondnet/evolith-core-domain/application/paths/rulesets-location`,
 * the manifest declares `"@beyondnet/evolith-core-domain": "^1.1.0"`, and the newest
 * core-domain the registry serves is 1.1.0 — published 2026-07-18, before that module
 * existed. In the workspace the same specifier resolves fine, because `node_modules/@beyondnet/*`
 * are symlinks to the locally built siblings. That is the whole failure mode: the
 * publish was validated against a tree that no consumer will ever have.
 *
 * `check-release-drift.mjs` could not see it. It asserts marker strings inside our own
 * `dist` and, since 1.0.2, that every `@beyondnet/*` PACKAGE imported by `dist` is a
 * declared dependency. Both were true here. What was false is one rung deeper: the
 * SUBPATH exists in the local sibling but not in the version the declared range resolves
 * to on the registry. No offline check can know that — the answer lives in the registry.
 *
 * So this guard is deliberately online and deliberately dumb: install the artifact the
 * way a user does, into a directory that has never seen this workspace, and run it. If
 * the binary cannot print its own version, the release is broken, whatever the unit
 * tests said. When the boot does fail, it diagnoses WHY by resolving every `@beyondnet/*`
 * specifier the shipped `dist` imports against the freshly installed tree, so the report
 * names the unresolvable module instead of leaving a stack trace.
 *
 * ANTI-VACUOUS PASS
 * A tree in which zero `@beyondnet/*` specifiers were found was not scanned; that is a
 * hard failure, not "no violations".
 *
 * Usage:
 *   node scripts/check-install-smoke.mjs                     # pack THIS package, install it clean, boot it
 *   node scripts/check-install-smoke.mjs --pkg ../../packages/core-domain   # any workspace (GT-625)
 *   node scripts/check-install-smoke.mjs --spec @beyondnet/evolith-cli@1.2.0
 *   node scripts/check-install-smoke.mjs --tree <dir> [--no-boot]   # offline: verify an existing install
 *   node scripts/check-install-smoke.mjs --keep                # keep the temp dir for inspection
 *
 * Exit codes:
 *   0 - the artifact installs from a clean tree and boots
 *   1 - an unresolvable specifier, a boot failure, a pack/install failure, or a vacuous scan
 */

import { readdirSync, readFileSync, existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GUARD = 'check-install-smoke';
const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Both module systems, because a future build may emit ESM. */
const SPECIFIER_RE = /(?:require\(|from\s*)["'](@beyondnet\/[^"']+)["']/g;

/**
 * Every `@beyondnet/*` specifier the built JavaScript imports, subpaths included.
 * Subpaths are the point: the package name alone is what the existing release-drift
 * guard already checks, and it is not what broke 1.2.0.
 *
 * @param {string} dir directory to walk
 * @returns {Set<string>}
 */
export function collectWorkspaceSpecifiers(dir) {
  const found = new Set();
  if (!existsSync(dir)) return found;
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(full);
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.cjs') || entry.name.endsWith('.mjs')) {
        const src = readFileSync(full, 'utf8');
        let m;
        while ((m = SPECIFIER_RE.exec(src)) !== null) found.add(m[1]);
      }
    }
  };
  walk(dir);
  return found;
}

/**
 * Resolve each specifier exactly the way Node will at runtime: from inside the
 * installed package directory, so nested `node_modules` and `exports` maps apply.
 *
 * @param {Iterable<string>} specifiers
 * @param {string} packageDir installed package root
 * @param {string} selfName package name to skip (a package may import itself)
 * @returns {string[]} unresolvable specifiers
 */
export function findUnresolvableSpecifiers(specifiers, packageDir, selfName) {
  const req = createRequire(join(packageDir, 'noop.js'));
  const bad = [];
  for (const spec of specifiers) {
    if (selfName && (spec === selfName || spec.startsWith(`${selfName}/`))) continue;
    try {
      req.resolve(spec);
    } catch {
      bad.push(spec);
    }
  }
  return bad.sort();
}

function fail(lines) {
  console.error(`✗ ${GUARD} failed — this artifact is NOT installable:\n`);
  for (const l of lines) console.error('  - ' + l);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', ...opts });
}

/**
 * Verify an installed tree. `treeDir` is a directory containing `node_modules`.
 *
 * @param {string} treeDir
 * @param {string} packageName
 * @param {boolean} boot whether to actually execute the binary
 */
function verifyTree(treeDir, packageName, boot, declaredSiblingDeps = null) {
  const packageDir = join(treeDir, 'node_modules', ...packageName.split('/'));
  if (!existsSync(packageDir)) {
    fail([`${packageName} is not present in ${treeDir}/node_modules — the install did not produce the package.`]);
  }
  const distDir = join(packageDir, 'dist');
  const specifiers = collectWorkspaceSpecifiers(distDir);

  // Anti-vacuous, with the one distinction that matters once this guard runs over
  // every workspace instead of just the CLI (GT-625): a LEAF package legitimately
  // imports no sibling, and calling that "nothing scanned" would fail four packages
  // for being correctly shaped. So the denominator is the manifest, not the scan —
  // if the package DECLARES sibling dependencies and its dist imports none of them,
  // the scan broke and that is still a hard failure.
  if (specifiers.size === 0) {
    if (declaredSiblingDeps && declaredSiblingDeps.length === 0) {
      // Not applicable, and said out loud rather than reported as a pass. The boot
      // check below is what this package is actually verified by.
      console.log(`· no @beyondnet/* dependency declared, so there is no cross-package resolution to verify.`);
    } else {
      fail([
        `scanned ${distDir} and found ZERO @beyondnet/* specifiers, but the manifest declares ${
          declaredSiblingDeps ? declaredSiblingDeps.length : 'some'
        }: ${declaredSiblingDeps ? declaredSiblingDeps.join(', ') : '(unknown)'}.`,
        'Either the build output moved or the package shipped without its dist; either way this guard did not verify anything.',
      ]);
    }
  }

  const unresolvable = findUnresolvableSpecifiers(specifiers, packageDir, packageName);
  if (unresolvable.length > 0) {
    fail([
      `${unresolvable.length} of ${specifiers.size} @beyondnet/* specifier(s) imported by the shipped dist do NOT resolve in a clean install:`,
      ...unresolvable.map((s) => `    ${s}`),
      'The declared dependency range resolves, on the registry, to a version that does not ship that module.',
      'Publish the sibling package at a version that contains it, and tighten the range in package.json.',
    ]);
  }

  console.log(`✓ ${specifiers.size} @beyondnet/* specifier(s) resolve in the clean install.`);

  if (!boot) return;

  const bin = join(packageDir, 'dist', 'main.js');
  if (!existsSync(bin)) fail([`entry point missing from the installed package: ${bin}`]);
  const res = run(process.execPath, [bin, '--version'], { cwd: treeDir });
  if (res.status !== 0) {
    fail([
      `\`node dist/main.js --version\` exited ${res.status} from a clean install.`,
      ...String(res.stderr || res.stdout || '').split('\n').slice(0, 6).map((l) => `    ${l}`),
    ]);
  }
  console.log(`✓ the installed binary boots: --version prints ${String(res.stdout).trim()}`);
}

function main(argv) {
  const args = argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(name);
    return i === -1 ? undefined : args[i + 1];
  };
  const has = (name) => args.includes(name);

  // GT-625: the defect this guard found is NOT specific to the CLI. `dist` of any
  // published package can deep-import a module that exists in the local sibling and
  // not in the version its declared range resolves to on the registry — the CLI is
  // simply where it surfaced first, because the CLI is the one with a binary a human
  // runs. `--pkg` lets the release path point this at every workspace it is about to
  // publish, which is the only way the check can gate a release rather than one package.
  const pkgRoot = opt('--pkg') ? resolve(opt('--pkg')) : PKG_ROOT;
  const manifestPath = join(pkgRoot, 'package.json');
  if (!existsSync(manifestPath)) fail([`no package.json at ${pkgRoot} — --pkg must name a package directory.`]);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  const packageName = opt('--package') ?? manifest.name;
  // A library has no binary to boot. Booting is the strongest signal available, so it
  // stays the default wherever there is something to boot, rather than being opt-in.
  const boot = !has('--no-boot') && existsSync(join(pkgRoot, 'dist', 'main.js'));
  const keep = has('--keep');

  const declaredSiblingDeps = Object.keys(manifest.dependencies ?? {}).filter((d) => d.startsWith('@beyondnet/'));

  const existingTree = opt('--tree');
  if (existingTree) {
    verifyTree(resolve(existingTree), packageName, boot, declaredSiblingDeps);
    console.log(`✓ ${GUARD} passed (offline, existing tree).`);
    return;
  }

  const temp = mkdtempSync(join(tmpdir(), 'evolith-install-smoke-'));
  try {
    let spec = opt('--spec');
    if (!spec) {
      // Pack THIS package. --ignore-scripts so a prepublishOnly that calls this
      // guard cannot recurse into itself.
      const packed = run('npm', ['pack', '--ignore-scripts', '--silent', '--pack-destination', temp], { cwd: pkgRoot });
      if (packed.status !== 0) {
        fail([`npm pack failed (${packed.status}):`, String(packed.stderr).trim()]);
      }
      const tarball = String(packed.stdout).trim().split('\n').pop();
      spec = join(temp, tarball);
      if (!existsSync(spec)) fail([`npm pack reported "${tarball}" but no such tarball exists in ${temp}.`]);
    }

    const installDir = join(temp, 'consumer');
    mkdirSync(installDir, { recursive: true });
    const installed = run('npm', ['install', spec, '--no-audit', '--no-fund', '--ignore-scripts', '--silent'], {
      cwd: installDir,
    });
    if (installed.status !== 0) {
      fail([`npm install ${spec} failed (${installed.status}) in a clean directory:`, String(installed.stderr).trim()]);
    }

    verifyTree(installDir, packageName, boot, declaredSiblingDeps);
    console.log(`✓ ${GUARD} passed — ${packageName} installs clean from a tree that has never seen this workspace.`);
  } finally {
    if (!keep) rmSync(temp, { recursive: true, force: true });
    else console.log(`(kept ${temp})`);
  }
}

// Only run when executed directly, so the helpers stay importable from tests.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main(process.argv);
}
