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

import { readdirSync, readFileSync, existsSync, mkdtempSync, mkdirSync, rmSync, renameSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GUARD = 'check-install-smoke';
const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The workspace root — a third place `npm pack` may write the tarball. Found by
 * walking up to the lockfile rather than counting directory levels, because
 * `--pkg` points this script at packages at different depths.
 */
const REPO_ROOT = (() => {
  let dir = PKG_ROOT;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'package-lock.json'))) return dir;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return resolve(PKG_ROOT, '..', '..', '..');
})();

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

/**
 * Every child here must be immune to an ambient dry-run.
 *
 * This guard runs inside `prepublishOnly`, and `npm-release.yml`'s rehearsal mode
 * invokes `npm publish --dry-run`, which exports `npm_config_dry_run=true` to that
 * script. Inherited, it makes `npm pack` write no tarball and `npm install` install
 * nothing — while both still exit 0 — so the guard reported a good artifact as NOT
 * installable. Packing and installing into a throwaway directory is this guard's
 * measurement, not part of the publish being rehearsed, so the variable is stripped
 * for every child rather than at one call site.
 */
function run(cmd, args, opts = {}) {
  const env = { ...process.env, ...(opts.env || {}) };
  delete env.npm_config_dry_run;
  return spawnSync(cmd, args, { encoding: 'utf8', ...opts, env });
}

/**
 * Verify an installed tree. `treeDir` is a directory containing `node_modules`.
 *
 * @param {string} treeDir
 * @param {string} packageName
 * @param {boolean} boot whether to actually execute the binary
 */
/**
 * Non-code files a package cannot do its job without, per package.
 *
 * ## The defect this closes
 *
 * `@beyondnet/evolith-cli@1.2.2` shipped 87 `.rego` SOURCES and zero `policy.wasm`.
 * `--engine opa` therefore fails closed on every rule from a clean install: the CLI
 * boots, `--version` answers, every specifier resolves, and the one thing a user
 * installed it to do cannot happen. Every check in this guard passed on that tarball.
 *
 * The cause is that `src/rulesets/opa/policy.wasm` is gitignored (root .gitignore:154),
 * so a fresh CI checkout has no bundle, `copy-rulesets` copies the sources it can see,
 * and nothing in the publish path ever compiled one. It is invisible to the maintainer,
 * whose ignored working tree still holds a bundle from the last local build.
 *
 * ## Why a size floor and not just existence
 *
 * A zero-byte or truncated `policy.wasm` is the failure this would otherwise wave
 * through — an aborted compile leaves a file behind. The floor is deliberately far
 * below the real artifact (669 kB at the time of writing) so it catches "empty" and
 * "stub" without becoming a tripwire that fails on legitimate optimisation.
 */
const REQUIRED_RUNTIME_ASSETS = {
  '@beyondnet/evolith-cli': [
    {
      path: 'rulesets/opa/policy.wasm',
      minBytes: 50_000,
      why: 'the compiled Rego bundle. Without it `validate --engine opa` fails closed on every rule.',
    },
  ],
};

function verifyRuntimeAssets(packageDir, packageName) {
  const required = REQUIRED_RUNTIME_ASSETS[packageName];
  if (!required) return;

  const missing = [];
  for (const asset of required) {
    const full = join(packageDir, asset.path);
    if (!existsSync(full)) {
      missing.push(`${asset.path} is ABSENT — ${asset.why}`);
      continue;
    }
    const bytes = statSync(full).size;
    if (bytes < asset.minBytes) {
      missing.push(
        `${asset.path} is ${bytes} byte(s), below the ${asset.minBytes} floor — ` +
        `a truncated or stub artifact. ${asset.why}`,
      );
    }
  }

  if (missing.length > 0) {
    fail([
      `${packageName} installs and boots, but ships without ${missing.length} required runtime asset(s):`,
      ...missing.map((m) => `    ${m}`),
      '',
      'A package that boots and cannot do its job is the failure this guard exists to catch:',
      'every other check here passed on the 1.2.2 tarball that had no policy.wasm.',
      'Run `npm run build:policy` before packing — the release workflow now does.',
    ]);
  }

  console.log(`✓ ${required.length} required runtime asset(s) present and non-trivial.`);
}

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

  verifyRuntimeAssets(packageDir, packageName);

  if (!boot) return;

  const bin = join(packageDir, 'dist', 'main.js');
  if (!existsSync(bin)) fail([`entry point missing from the installed package: ${bin}`]);

  // The exit status alone is not evidence that `--version` answered.
  //
  // This check used to assert only `status === 0` and then PRINT the stdout it
  // never inspected. Release run 31986300098 logged, verbatim:
  //
  //     ✓ the installed binary boots: --version prints
  //
  // — an empty observable, reported as a pass. `@beyondnet/evolith-mcp@1.3.2`
  // was ignoring the flag and booting the MCP server; the stdio transport read
  // EOF from the closed stdin this spawn gives it, exited 0, and the gate agreed.
  // With stdin held open the same command never returns at all.
  //
  // So: a timeout, because a binary that hangs must fail rather than hang CI, and
  // an assertion that the output actually carries the version the manifest
  // declares. That last part is what makes it non-vacuous — it would still pass
  // on any non-empty string otherwise, including an error message.
  const res = run(process.execPath, [bin, '--version'], { cwd: treeDir, timeout: 30_000 });
  if (res.error && res.error.code === 'ETIMEDOUT') {
    fail([
      '`node dist/main.js --version` did not answer within 30s from a clean install.',
      'A binary that hangs on --version is one that never parsed the flag: asking a tool',
      'its version is the first thing anyone does after installing it.',
    ]);
  }
  if (res.status !== 0) {
    fail([
      `\`node dist/main.js --version\` exited ${res.status} from a clean install.`,
      ...String(res.stderr || res.stdout || '').split('\n').slice(0, 6).map((l) => `    ${l}`),
    ]);
  }
  const printed = String(res.stdout || '').trim();
  const expected = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')).version;
  if (!printed) {
    fail([
      '`--version` exited 0 and printed NOTHING on stdout.',
      `Expected output carrying ${expected}. An exit code is not an answer: a binary that`,
      'ignores the flag and starts a server exits 0 too, which is exactly how this went',
      'unnoticed until it was already on the registry.',
    ]);
  }
  if (!printed.includes(expected)) {
    fail([
      `\`--version\` printed ${JSON.stringify(printed)}, which does not contain ${expected}.`,
      'The reported version must match the manifest being published, or the binary is',
      'answering for a different build than the one in this tarball.',
    ]);
  }
  console.log(`✓ the installed binary answers --version: ${printed} (matches manifest ${expected})`);
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
    // In --tree mode the artifact under test is the TREE, not this workspace.
    // `boot` above is decided from `pkgRoot/dist/main.js` — the local build — so
    // on a checkout that has not been built it came out false, the boot check
    // never ran, and the guard still printed a pass. The strongest signal it has
    // must not depend on unrelated local state.
    const treeDir = resolve(existingTree);
    const treeBoot = !has('--no-boot')
      && existsSync(join(treeDir, 'node_modules', ...packageName.split('/'), 'dist', 'main.js'));
    verifyTree(treeDir, packageName, treeBoot, declaredSiblingDeps);
    console.log(`✓ ${GUARD} passed (offline, existing tree).`);
    return;
  }

  const temp = mkdtempSync(join(tmpdir(), 'evolith-install-smoke-'));
  try {
    let spec = opt('--spec');
    if (!spec) {
      // Pack THIS package. --ignore-scripts so a prepublishOnly that calls this
      // guard cannot recurse into itself.
      // THIS GUARD COULD NOT RUN UNDER THE RELEASE REHEARSAL, AND SAID SO WRONGLY.
      //
      // `npm-release.yml`'s dry_run mode runs `npm publish --dry-run`, which puts
      // `npm_config_dry_run=true` in the environment of `prepublishOnly` — and
      // this guard runs there. The nested `npm pack` below INHERITS it, so npm
      // printed the tarball name and wrote no file, and the guard reported "this
      // artifact is NOT installable" about a perfectly good artifact. Measured, not
      // guessed: `npm_config_dry_run=true npm pack --pack-destination <dir>` prints
      // the filename and leaves <dir> empty, on both npm 10 and npm 11.
      //
      // So the pack is made immune to an ambient dry-run: the variable is stripped
      // from the child environment AND `--dry-run=false` is passed. Packing into a
      // temp directory is not the operation the rehearsal is rehearsing, and it
      // must happen for the rehearsal to mean anything.
      //
      // Two earlier explanations were wrong and are recorded so they are not
      // re-attempted: it is not that `--pack-destination` is ignored on the runner,
      // and not that npm majors disagree about the destination. npm 10 honours it.
      //
      // The location is still DISCOVERED rather than predicted — snapshot the
      // candidate directories, pack, take whatever appeared — and a failure prints
      // what each directory actually holds, because a slow CI loop must not be
      // spent discovering one more location.
      const candidates = [temp, pkgRoot, REPO_ROOT];
      const tgzIn = (dir) => {
        try {
          return new Set(readdirSync(dir).filter((f) => f.endsWith('.tgz')));
        } catch {
          return new Set();
        }
      };
      const before = candidates.map(tgzIn);

      const packed = run(
        'npm',
        ['pack', '--ignore-scripts', '--silent', '--dry-run=false', '--pack-destination', temp],
        { cwd: pkgRoot },
      );
      if (packed.status !== 0) {
        fail([`npm pack failed (${packed.status}):`, String(packed.stderr).trim()]);
      }
      const reported = String(packed.stdout).trim().split('\n').pop();

      let found = null;
      candidates.forEach((dir, i) => {
        if (found) return;
        for (const f of tgzIn(dir)) {
          if (!before[i].has(f)) { found = { dir, file: f }; return; }
        }
      });

      if (!found) {
        fail([
          `npm pack reported "${reported}" and no new tarball appeared in any candidate directory:`,
          ...candidates.map((d, i) => `  ${d}\n      holds: ${[...tgzIn(d)].join(', ') || '(no .tgz)'} · before: ${[...before[i]].join(', ') || '(no .tgz)'}`),
          'npm prints the filename regardless of where it writes, so the name alone proves nothing.',
        ]);
      }

      spec = join(temp, found.file);
      // Move it out of the repository if that is where npm put it, rather than
      // leaving it for the root-cleanliness guard to trip over.
      if (found.dir !== temp) renameSync(join(found.dir, found.file), spec);
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
