#!/usr/bin/env node

/**
 * GT-647 — a runner stage must ship the WHOLE workspace closure it will require.
 *
 * ## The defect
 *
 * Every deployable image here is a two-stage monorepo build: the builder runs
 * `npm ci` + `tsc -b` over the whole workspace, and the runner copies
 * `node_modules` plus a HAND-WRITTEN list of `<pkg>/dist` + `<pkg>/package.json`
 * pairs. That hand-written list is the bug surface. `node_modules/@beyondnet/*`
 * are workspace SYMLINKS into `src/packages/*`, so copying `node_modules` copies
 * the links, not the packages — a link whose target was left out of the list
 * dangles, and Node fails at `require` time, inside the container, at startup.
 *
 * It is silent until it is fatal. The image builds green, `docker push` is green,
 * and the process exits on its first require:
 *
 *     Error: Cannot find module '@beyondnet/evolith-contracts/ingest'
 *     Require stack:
 *     - /repo/src/packages/infra-providers/dist/tracker/evaluation-ingest.client.js
 *     - /repo/src/packages/infra-providers/dist/index.js
 *     - /repo/src/apps/core-api/dist/core-domain.module.js
 *
 * Observed on 2026-07-31: `evolith-core-api:local` crash-looped and the
 * `Chaos drill` job of `reliability.yml` failed three consecutive times on
 * `develop` (runs 30628493705, 30630994704, 30632498438), each time as
 * `[wait-for-target] TIMEOUT after 180s`. Three images were wrong — core-api,
 * mcp-server and cli all omitted `contracts`.
 *
 * ## Why the omission is TRANSITIVE, and why that is the whole point
 *
 * Nobody forgot a direct dependency. `core-api` depends on `core-domain` and
 * `infra-providers`, and both were copied. `contracts` is reached one hop
 * further — `infra-providers` requires `@beyondnet/evolith-contracts/ingest` and
 * re-exports the module that does it from its own index, so it is on the boot
 * path of every consumer. A reviewer comparing the Dockerfile against the app's
 * `dependencies` sees a complete list, because at that depth it IS complete.
 *
 * So the closure has to be computed, not read. GT-604 added that one import and
 * silently invalidated three Dockerfiles that nobody touched.
 *
 * ## Check 1 — the runner ships the transitive closure
 *
 * Walk `dependencies` + `peerDependencies` restricted to workspace names from the
 * package that owns the Dockerfile, transitively, and require the FINAL stage to
 * copy `dist` AND `package.json` for every member (the entrypoint included).
 * Declared dependencies are an over-approximation of what is required at runtime,
 * which is the safe direction: copying a package the image never loads costs a few
 * KB, omitting one costs the service.
 *
 * The FINAL stage is the subject, not a stage named `runner`. The stage that
 * becomes the image is the last `FROM`, whatever it is called — `src/sdk/cli`
 * called it `runtime` until 2026-07-31 — and a guard keyed on the name would have
 * skipped it.
 *
 * ## Check 2 — a workspace import is a DECLARED dependency
 *
 * Check 1 trusts `package.json`. That trust is exactly what breaks in the
 * neighbouring failure class (GT-625): npm workspaces hoist every workspace
 * package into the root `node_modules`, so an UNDECLARED workspace import resolves
 * fine on a developer's machine, in jest, and in the builder stage — and is absent
 * from the closure this guard computes, which would make check 1 confidently
 * wrong. So every `@beyondnet/evolith-*` specifier imported for its VALUES by a
 * package's own sources must appear in that package's manifest.
 *
 * Type-only imports are excluded on purpose: they leave no `require` in the emitted
 * JavaScript, so they cannot dangle at runtime and a `devDependency` is a legitimate
 * home for them. Tests are excluded for the same reason — a spec never ships.
 *
 * ## Anti-vacuous pass
 *
 * Zero workspace packages, zero Dockerfiles, a Dockerfile whose final stage has no
 * `COPY --from=` at all, or a closure that came out empty are all hard failures.
 * "Nothing to check" is what this guard would report if the tree were reorganised
 * out from under it, and that must never read as a pass — the omission it exists to
 * catch reached `develop` precisely because everything upstream was green.
 *
 * USAGE
 *   node .harness/scripts/ci/56-validate-docker-workspace-closure.mjs
 *   node .harness/scripts/ci/56-validate-docker-workspace-closure.mjs --verbose
 *   node .harness/scripts/ci/56-validate-docker-workspace-closure.mjs --root <dir>
 *
 * EXIT CODES
 *   0  every runner stage ships its full closure, and every value import is declared
 *   1  a missing closure member, an undeclared workspace import, or a vacuous scan
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertScanned, ZeroCoverageError } from '../lib/coverage.mjs';

const GUARD = '56-validate-docker-workspace-closure';
const __dirname = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const VERBOSE = argv.includes('--verbose');
const rootIdx = argv.indexOf('--root');
export const DEFAULT_ROOT = resolvePath(__dirname, '../../..');
const ROOT = rootIdx !== -1 ? resolvePath(process.cwd(), argv[rootIdx + 1]) : DEFAULT_ROOT;

/** Workspace packages all share this npm scope prefix. */
const SCOPE = '@beyondnet/evolith-';

/** Source trees are excluded from check 2 when they cannot ship. */
const TEST_FILE = /\.(spec|test)\.[cm]?tsx?$/;

// ---------------------------------------------------------------------------
// Workspace discovery
// ---------------------------------------------------------------------------

/**
 * Expand the root manifest's `workspaces` globs.
 *
 * Only the single trailing `*` form is supported, because that is the only form
 * this repository uses (`src/sdk/*`, `src/apps/*`, `src/packages/*`). Any other
 * pattern throws rather than silently matching nothing — a glob this cannot expand
 * would shrink the denominator, which is the vacuous pass in disguise.
 *
 * @returns {string[]} repo-relative package directories, sorted
 */
export function expandWorkspaceGlobs(root, globs) {
  const dirs = [];
  for (const glob of globs) {
    if (!glob.endsWith('/*') || glob.slice(0, -2).includes('*')) {
      throw new Error(`${GUARD}: unsupported workspaces glob "${glob}" — expand it here rather than matching nothing`);
    }
    const parent = glob.slice(0, -2);
    const abs = join(root, parent);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs)) {
      const dir = `${parent}/${entry}`;
      if (existsSync(join(root, dir, 'package.json'))) dirs.push(dir);
    }
  }
  return dirs.sort();
}

/**
 * Read every workspace package.
 *
 * @returns {{ byName: Map<string, object>, all: object[] }} packages keyed by npm name
 */
export function readWorkspace(root) {
  const rootManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const globs = rootManifest.workspaces ?? [];
  const byName = new Map();
  const all = [];
  for (const dir of expandWorkspaceGlobs(root, globs)) {
    const manifest = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'));
    if (!manifest.name) continue;
    const pkg = {
      name: manifest.name,
      dir,
      deps: { ...(manifest.dependencies ?? {}), ...(manifest.peerDependencies ?? {}) },
      devDeps: { ...(manifest.devDependencies ?? {}) },
    };
    byName.set(pkg.name, pkg);
    all.push(pkg);
  }
  return { byName, all };
}

/**
 * Transitive closure of workspace dependencies, entrypoint included.
 *
 * A dependency naming a workspace package that does not exist is reported rather
 * than skipped: it means the manifest and the tree disagree, and the closure
 * computed from it cannot be trusted.
 *
 * @returns {{ members: object[], unresolved: string[] }}
 */
export function workspaceClosure(entry, byName) {
  const seen = new Map();
  const unresolved = new Set();
  const queue = [entry];
  while (queue.length > 0) {
    const pkg = queue.shift();
    if (seen.has(pkg.name)) continue;
    seen.set(pkg.name, pkg);
    for (const dep of Object.keys(pkg.deps)) {
      if (!dep.startsWith(SCOPE)) continue;
      const next = byName.get(dep);
      if (!next) {
        unresolved.add(dep);
        continue;
      }
      if (!seen.has(next.name)) queue.push(next);
    }
  }
  return {
    members: [...seen.values()].sort((a, b) => a.dir.localeCompare(b.dir)),
    unresolved: [...unresolved].sort(),
  };
}

// ---------------------------------------------------------------------------
// Dockerfile parsing
// ---------------------------------------------------------------------------

/**
 * Source paths copied in the FINAL stage of a Dockerfile.
 *
 * Line continuations are joined first so a wrapped `COPY` is not read as two
 * fragments. The final stage is everything after the last `FROM`, because that is
 * the stage that becomes the image regardless of what it is named.
 *
 * @returns {{ sources: string[], stageName: string|null, copyFromCount: number }}
 */
export function parseFinalStage(text) {
  const logical = [];
  let buffer = '';
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (/^\s*#/.test(line) && buffer === '') continue;
    if (/\\\s*$/.test(line)) {
      buffer += line.replace(/\\\s*$/, ' ');
      continue;
    }
    logical.push(buffer + line);
    buffer = '';
  }
  if (buffer !== '') logical.push(buffer);

  let lastFrom = -1;
  let stageName = null;
  logical.forEach((line, i) => {
    const m = /^\s*FROM\s+\S+(?:\s+AS\s+(\S+))?\s*$/i.exec(line);
    if (m) {
      lastFrom = i;
      stageName = m[1] ?? null;
    }
  });

  const sources = [];
  let copyFromCount = 0;
  for (const line of logical.slice(lastFrom + 1)) {
    const m = /^\s*COPY\s+(.*)$/i.exec(line);
    if (!m) continue;
    const tokens = m[1].trim().split(/\s+/);
    const isFrom = tokens.some((t) => /^--from=/i.test(t));
    const operands = tokens.filter((t) => !t.startsWith('--'));
    if (operands.length < 2) continue;
    if (isFrom) copyFromCount += 1;
    // The last operand is the destination; everything before it is a source.
    for (const src of operands.slice(0, -1)) sources.push(src);
  }
  return { sources, stageName, copyFromCount };
}

/**
 * Does the final stage copy `<dir>/<leaf>` from the builder?
 *
 * Matched on the path SUFFIX so `/repo/src/packages/contracts/dist` and
 * `src/packages/contracts/dist` are the same statement — the builder's WORKDIR is
 * a detail of the Dockerfile, not of the closure.
 */
export function copiesPath(sources, dir, leaf) {
  const want = `${dir}/${leaf}`;
  return sources.some((src) => {
    const normalised = src.replace(/\/+$/, '');
    return normalised === want || normalised.endsWith(`/${want}`);
  });
}

// ---------------------------------------------------------------------------
// Check 2 — workspace imports are declared
// ---------------------------------------------------------------------------

/** Recursively list shippable TypeScript sources under a package's `src`. */
function shippableSources(absDir) {
  const out = [];
  const srcRoot = join(absDir, 'src');
  if (!existsSync(srcRoot)) return out;
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) {
        if (entry === 'node_modules' || entry === 'dist' || entry === '__fixtures__') continue;
        walk(abs);
        continue;
      }
      if (!/\.[cm]?tsx?$/.test(entry) || entry.endsWith('.d.ts')) continue;
      if (TEST_FILE.test(entry)) continue;
      out.push(abs);
    }
  };
  walk(srcRoot);
  return out;
}

/**
 * Workspace packages a file imports for their VALUES.
 *
 * `import type { X } from '…'` and `export type { … }` emit no `require`, so they
 * cannot dangle in a container and are deliberately not reported. A mixed import
 * (`import { fn, type T }`) does emit one and is reported.
 *
 * @returns {Set<string>} bare package names, subpaths stripped
 */
export function valueImportsOf(text) {
  const found = new Set();
  const re = /(?:^|\n)\s*(import|export)\s+([\s\S]*?)\sfrom\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const [, , clause, specifier] = m;
    if (!specifier.startsWith(SCOPE)) continue;
    if (/^\s*type\s/.test(clause)) continue; // `import type { … } from`
    const hasBraces = /\{[\s\S]*\}/.test(clause);
    if (hasBraces) {
      const bindings = clause.replace(/^[\s\S]*?\{([\s\S]*)\}[\s\S]*$/, '$1');
      const names = bindings
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      // Every named binding prefixed with `type` erases the require too.
      if (names.length > 0 && names.every((n) => /^type\s/.test(n))) continue;
    }
    const parts = specifier.split('/');
    found.add(parts.length > 2 ? `${parts[0]}/${parts[1]}` : specifier);
  }
  return found;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const failures = [];
  const { byName, all } = readWorkspace(ROOT);

  assertScanned(all.length, {
    what: 'workspace packages',
    where: (JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).workspaces ?? []).map(
      (g) => `${g} (root package.json workspaces)`,
    ),
  });

  // ---- Check 2 first: it is a pure read of the tree and grounds check 1's input.
  let filesScanned = 0;
  for (const pkg of all) {
    const abs = join(ROOT, pkg.dir);
    for (const file of shippableSources(abs)) {
      filesScanned += 1;
      for (const imported of valueImportsOf(readFileSync(file, 'utf8'))) {
        if (imported === pkg.name) continue;
        if (pkg.deps[imported]) continue;
        const where = pkg.devDeps[imported] ? 'declared only as a devDependency' : 'not declared at all';
        failures.push(
          `${relative(ROOT, file)}: value-imports ${imported}, which is ${where} in ${pkg.dir}/package.json — ` +
            `it hoists at build time and is missing from every image's computed closure`,
        );
      }
    }
  }

  assertScanned(filesScanned, {
    what: 'shippable TypeScript sources',
    where: all.map((p) => `${p.dir}/src`),
  });

  // ---- Check 1: every Dockerfile's final stage ships its closure.
  const dockerfiles = all
    .filter((pkg) => existsSync(join(ROOT, pkg.dir, 'Dockerfile')))
    .map((pkg) => ({ pkg, path: `${pkg.dir}/Dockerfile` }));

  assertScanned(dockerfiles.length, {
    what: 'workspace Dockerfiles',
    where: all.map((p) => `${p.dir}/Dockerfile`),
  });

  for (const { pkg, path } of dockerfiles) {
    const { members, unresolved } = workspaceClosure(pkg, byName);
    for (const dep of unresolved) {
      failures.push(`${path}: ${pkg.name} depends on ${dep}, which is not a workspace package — closure is unreliable`);
    }
    if (members.length === 0) {
      failures.push(`${path}: computed an EMPTY closure for ${pkg.name}`);
      continue;
    }

    const { sources, stageName, copyFromCount } = parseFinalStage(readFileSync(join(ROOT, path), 'utf8'));
    if (copyFromCount === 0) {
      failures.push(
        `${path}: final stage (${stageName ?? 'unnamed'}) has no \`COPY --from=\` — either it is not a ` +
          `multi-stage workspace image or this guard cannot parse it; both need a human`,
      );
      continue;
    }

    const missing = [];
    for (const member of members) {
      for (const leaf of ['dist', 'package.json']) {
        if (!copiesPath(sources, member.dir, leaf)) missing.push(`${member.dir}/${leaf} (${member.name})`);
      }
    }
    if (missing.length > 0) {
      failures.push(
        `${path}: final stage does not ship ${missing.length} closure path(s) required by ${pkg.name}:\n` +
          missing.map((m) => `      - ${m}`).join('\n') +
          `\n      node_modules/@beyondnet/* are workspace symlinks; an uncopied target dangles at runtime.`,
      );
    }

    if (VERBOSE) {
      const status = missing.length === 0 ? 'ok' : 'MISSING';
      console.log(`  ${status.padEnd(7)} ${path} — closure ${members.length}: ${members.map((m) => m.name).join(', ')}`);
    }
  }

  if (VERBOSE) {
    console.log(
      `\n[${GUARD}] scanned ${all.length} workspace packages, ${dockerfiles.length} Dockerfiles, ${filesScanned} sources`,
    );
  }

  if (failures.length > 0) {
    console.error(`\n[${GUARD}] FAIL — ${failures.length} finding(s):\n`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error(
      '\n  Fix: add the missing `COPY --from=builder /repo/<dir>/dist` and `/package.json` pairs to the\n' +
        '  final stage, or declare the workspace import in the package manifest.\n',
    );
    process.exit(1);
  }

  console.log(
    `[${GUARD}] OK — ${dockerfiles.length} image(s) ship their full workspace closure; ` +
      `${filesScanned} sources import no undeclared workspace package`,
  );
}

const invokedDirectly = process.argv[1] && resolvePath(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    main();
  } catch (err) {
    if (err instanceof ZeroCoverageError) {
      console.error(`\n[${GUARD}] FAIL — ${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }
}
