#!/usr/bin/env node

/**
 * GT-707 — bundle the one ESM-only dependency into CommonJS, for the snapshot.
 *
 * `pkg`'s bootstrap has no ESM loader, so a packaged binary cannot `require()`
 * `@clack/prompts/dist/index.mjs` and every one of them died on `--help`. This writes
 * `dist/vendor/clack.cjs` — the same library, bundled to CJS by esbuild — which
 * `src/infrastructure/prompts/clack.ts` falls back to when the package itself cannot
 * be required.
 *
 * It runs as part of `npm run build`, so the fallback can never be older than the
 * code that reaches for it.
 *
 * ANTI-VACUOUS: a bundle that is written but does not LOAD is worse than no bundle at
 * all, because the fallback would then throw a second, more confusing error inside a
 * binary nobody can debug. So the output is required back in a child process with
 * `--no-experimental-require-module`, which is the closest an ordinary Node process
 * gets to the snapshot's no-ESM contract, and its export surface is compared against
 * the real package. Zero exports, or a missing entry point, fails the build.
 */

import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, rmSync, existsSync, statSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const CLI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(CLI_ROOT, 'dist', 'vendor');

/**
 * Every ESM-only dependency the packaged CLI loads, and the export each shim needs.
 *
 * The list is not a guess: `package.json` was read FROM DISK for all 25 direct
 * dependencies, because `require('<dep>/package.json')` is refused by an `exports`
 * gate on eight of them and answers ERR_PACKAGE_PATH_NOT_EXPORTED — which reads like
 * "fine" and is not. Three came back `"type": "module"`, and
 * `@modelcontextprotocol/sdk` is not one of these two because the CLI only carries a
 * `.d.ts` for it: no runtime import, so it never enters the snapshot.
 */
const VENDORED = [
  {
    specifier: '@clack/prompts',
    outfile: 'clack.cjs',
    entry: "export * from '@clack/prompts';\n",
    // The names the CLI actually calls; a bundle missing any of them is not usable.
    required: ['intro', 'outro', 'spinner', 'isCancel', 'text', 'select', 'confirm', 'log'],
    // The compiled shim that falls back to this bundle. Its relative require is
    // resolved from HERE and asserted to exist — see `verifyShimPath`.
    shim: 'dist/infrastructure/prompts/clack.js',
  },
  {
    specifier: 'conf',
    outfile: 'conf.cjs',
    entry: "export { default } from 'conf';\n",
    // `conf` is a default export — a class. The shim re-exports it as `default`.
    required: ['default'],
    shim: 'dist/infrastructure/config/conf-module.js',
  },
];

/**
 * The check that would have caught the bug this script's first version shipped with.
 *
 * `clack.ts` lives in `src/infrastructure/prompts/` and compiles to
 * `dist/infrastructure/prompts/`, while the bundle is written to `dist/vendor/`. The
 * fallback said `./vendor/clack.cjs`, which resolves to
 * `dist/infrastructure/prompts/vendor/clack.cjs` — absent. Nothing failed at build
 * time; the binary failed at RUN time, with the package's own error, because the
 * fallback's MODULE_NOT_FOUND was swallowed by the rethrow.
 *
 * So the relative path each shim requires is now read out of the compiled file and
 * resolved against that file's own directory. A shim that points at nothing fails the
 * build.
 */
function verifyShimPath(spec) {
  const shimFile = join(CLI_ROOT, spec.shim);
  if (!existsSync(shimFile)) {
    throw new Error(`${spec.specifier}: expected a compiled shim at ${spec.shim} and found none.`);
  }
  const source = readFileSync(shimFile, 'utf8');
  const match = source.match(new RegExp(`require\\((['"])((?:\\.\\.?/)[^'"]*${spec.outfile})\\1\\)`));
  if (!match) {
    throw new Error(
      `${spec.specifier}: ${spec.shim} does not require a relative path ending in ${spec.outfile}. ` +
        'The fallback is what makes the packaged binary work; a shim without it is a binary that dies on --help.',
    );
  }
  const resolved = resolve(dirname(shimFile), match[2]);
  if (!existsSync(resolved)) {
    throw new Error(
      `${spec.specifier}: ${spec.shim} falls back to '${match[2]}', which resolves to ${resolved} — absent. ` +
        'Relative to the COMPILED file, not the source one.',
    );
  }
}

async function bundleOne(spec) {
  const outFile = join(OUT_DIR, spec.outfile);
  const entry = join(CLI_ROOT, `.vendor-entry-${spec.outfile}.mjs`);
  mkdirSync(OUT_DIR, { recursive: true });
  // The entry has to live inside the package: esbuild resolves the specifier from the
  // entry file's directory, not from cwd, and npm workspaces hoist dependencies to the
  // repository root.
  writeFileSync(entry, spec.entry, 'utf8');
  try {
    // The JS API rather than the `esbuild` binary: `node_modules/esbuild/bin/esbuild`
    // is a native executable, so spawning it through `process.execPath` fails with
    // "Invalid or unexpected token" — measured, not guessed.
    await build({
      entryPoints: [entry],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: outFile,
      logLevel: 'warning',
      absWorkingDir: CLI_ROOT,
    });
  } finally {
    rmSync(entry, { force: true });
  }
  return outFile;
}

function verifyOne(spec, outFile) {
  if (!existsSync(outFile)) throw new Error(`esbuild reported success but ${outFile} is absent.`);

  // Load it the way the snapshot will: as CommonJS, with require(esm) switched OFF.
  // If the bundle still reaches for an ESM file this fails here, at build time, rather
  // than inside a binary on a user's machine.
  const probe = execFileSync(
    process.execPath,
    [
      '--no-experimental-require-module',
      '-e',
      `const m = require(${JSON.stringify(outFile)}); console.log(Object.keys(m).length);`,
    ],
    { encoding: 'utf8' },
  );
  const exported = Number(probe.trim());
  if (!Number.isInteger(exported) || exported === 0) {
    throw new Error(`${spec.specifier}: the vendored bundle loaded but exported nothing (${probe.trim()}).`);
  }

  const require_ = createRequire(import.meta.url);
  const real = require_(spec.specifier);
  const vendored = require_(outFile);
  const missing = spec.required.filter((name) => typeof vendored[name] !== typeof real[name]);
  if (missing.length > 0) {
    throw new Error(`${spec.specifier}: the vendored bundle does not match the package on: ${missing.join(', ')}`);
  }

  const kb = Math.round(statSync(outFile).size / 1024);
  console.log(
    `[vendor-esm] dist/vendor/${spec.outfile} — ${kb} kB, ${exported} export(s), ` +
      `loads with require(esm) disabled (GT-707, ${spec.specifier}).`,
  );
}

for (const spec of VENDORED) {
  verifyOne(spec, await bundleOne(spec));
  verifyShimPath(spec);
}
