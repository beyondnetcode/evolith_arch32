#!/usr/bin/env node

/**
 * GT-644 — a policy may only call builtins the SHIPPED wasm runtime can execute.
 *
 * ## The defect class
 *
 * `compile-opa-wasm.mjs` builds `src/rulesets/opa/` into `policy.wasm`, and
 * `OpaEvaluator` loads that wasm through `@open-policy-agent/opa-wasm`. Some OPA
 * builtins are compiled NATIVELY into the wasm module; the rest are HOST-DISPATCHED
 * — the module calls back into JavaScript, and the JS SDK ships implementations for
 * exactly six of them. Call a host-dispatched builtin the SDK does not implement and
 * the module loads fine, `opa test` is green, `opa build` is green, and then at
 * evaluation time the SDK throws:
 *
 *     not implemented: built-in function 24: time.parse_rfc3339_ns
 *
 * `OpaEvaluator.evaluateAll` catches that and maps it onto EVERY rule in the run:
 *
 *     OPA engine error — enforcement blocked: …
 *
 * So one builtin in one policy fails the entire OPA half of the gate, and the only
 * signal is a message that reads like an infrastructure hiccup. Found while closing
 * GT-584. A scan on 2026-07-31 found no other offender — this is prevention.
 *
 * ## Why the compiled wasm is the authority, and a source scan alone is not
 *
 * "Which builtins does the wasm runtime support?" has no sound answer in the source.
 * Two facts, both measured on this repository rather than assumed:
 *
 *   - The SDK's own `capabilities.json` is not it. It lists `time.diff` as supported;
 *     `time.diff` is host-dispatched and the SDK does NOT implement it. It omits
 *     `object.keys`; `object.keys` is compiled natively and works. Both directions
 *     are wrong, so a check built on that file would be both blind and noisy.
 *
 *   - Reachability is OPA's to decide, not ours. `json.patch` — host-dispatched and
 *     unimplemented — appears at 83 sites in this corpus, all of them in `*.test.rego`
 *     that OPA prunes out of the bundle. A scan that ignored pruning would open red
 *     with 83 false positives.
 *
 * The one authority that is neither blind nor noisy is the compiled artifact: the
 * wasm's `builtins()` export names exactly the builtins THIS bundle dispatches to the
 * host, after OPA's own pruning. Every name in it must exist in the SDK's dispatch
 * table. That is check 1, it has no false positives and no false negatives, and it
 * needs no list anyone has to maintain.
 *
 * ## Check 2 — the early warning, before anything is compiled
 *
 * Check 1 needs a wasm. `HOST_DISPATCHED_UNIMPLEMENTED` below is a curated set,
 * captured by probing the pinned toolchain, that turns the common cases red straight
 * from the `.rego` — no compiler, no network, on the developer's machine. It is
 * deliberately PARTIAL and says so: it is an early warning, not the denominator.
 * Check 1 remains the complete answer.
 *
 * It runs only over the files REACHABLE from the wasm entrypoints, for the
 * `json.patch` reason above, and it fails on a stale entry — a name the SDK has since
 * implemented — so the set cannot quietly rot into decoration.
 *
 * ## Anti-vacuous pass
 *
 * Zero `.rego` files scanned, zero files reachable from the entrypoints, an
 * entrypoint whose package no file declares, or a build command this guard cannot
 * parse are all hard failures. The source scan runs BEFORE any wasm work on purpose,
 * so an empty tree fails on its own denominator instead of downloading a compiler to
 * find that out.
 *
 * USAGE
 *   node .harness/scripts/ci/55-validate-wasm-builtin-support.mjs
 *   node .harness/scripts/ci/55-validate-wasm-builtin-support.mjs --verbose
 *   node .harness/scripts/ci/55-validate-wasm-builtin-support.mjs --require-wasm
 *   node .harness/scripts/ci/55-validate-wasm-builtin-support.mjs --no-compile
 *   node .harness/scripts/ci/55-validate-wasm-builtin-support.mjs --root <dir>
 *
 * EXIT CODES
 *   0  every builtin the bundle dispatches to the host is implemented by the SDK
 *   1  an unimplemented builtin, a stale curated entry, an unparseable build
 *      command, a vacuous scan, or (with --require-wasm) no wasm to check
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertScanned, ZeroCoverageError } from '../lib/coverage.mjs';

const GUARD = '55-validate-wasm-builtin-support';
const __dirname = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const VERBOSE = argv.includes('--verbose');
const REQUIRE_WASM = argv.includes('--require-wasm');
const NO_COMPILE = argv.includes('--no-compile');
const rootIdx = argv.indexOf('--root');
const ROOT = rootIdx !== -1 ? resolvePath(process.cwd(), argv[rootIdx + 1]) : resolvePath(__dirname, '../../..');

/** The build script this guard exists to keep honest. Its arguments ARE the subject. */
const COMPILE_SCRIPT = '.harness/scripts/compile-opa-wasm.mjs';

/** The runtime that executes the bundle, and the two files of it this guard reads. */
const SDK_PACKAGE = '@open-policy-agent/opa-wasm';
const SDK_BUILTINS = `node_modules/${SDK_PACKAGE}/src/builtins/index.js`;
const SDK_ENTRY = `node_modules/${SDK_PACKAGE}/src/index.mjs`;

/**
 * Resolve a file inside the installed runtime.
 *
 * The hoisted path under the repository root is tried first, because a `--root`
 * fixture must be able to substitute its own runtime — that is how the stale-entry
 * and empty-dispatch-table cases are exercised. Node's own resolution is the
 * fallback, so a layout that does not hoist (npm workspaces are free not to) fails
 * on a real finding rather than on "not installed".
 *
 * @returns {string|null} absolute path, or null when the package is not installed
 */
function resolveSdkFile(root, relPath) {
  const hoisted = join(root, relPath);
  if (existsSync(hoisted)) return hoisted;
  try {
    // Via the main entry, not `<pkg>/package.json`: the package declares an
    // `exports` map, and a subpath it does not list is not resolvable.
    const require = createRequire(import.meta.url);
    const pkg = dirname(dirname(require.resolve(SDK_PACKAGE)));
    const resolved = join(pkg, relPath.slice(`node_modules/${SDK_PACKAGE}/`.length));
    return existsSync(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

/** The two files that load the compiled bundle at runtime — see `assertNoCustomBuiltins`. */
const RUNTIME_LOADERS = [
  'src/packages/core-domain/src/application/validators/evaluators/opa-evaluator.ts',
  'src/packages/mcp-server/src/mcp/abac-evaluator.ts',
];

/**
 * Builtins that the pinned OPA compiles to a HOST CALL and the shipped JS SDK does
 * not implement. Calling any of them is a guaranteed `not implemented: built-in
 * function N` at evaluation time.
 *
 * PROVENANCE — this is measured, not copied from documentation. A probe policy
 * calling one representative per namespace was compiled with the pinned OPA
 * (`opa build -t wasm`) and its `builtins()` table read back through the SDK. What
 * appeared in the table and had no SDK implementation is what is listed here.
 * `object.*`, `array.*`, `strings.*`, `bits.*` and `json.is_valid` were in the probe
 * and did NOT appear — they are native, and listing them would be a false positive.
 *
 * A trailing `.` means the WHOLE namespace: every member probed was host-dispatched,
 * so `time.parse_ns` is as fatal as the `time.parse_rfc3339_ns` that started this.
 * Entries without one are exact names in namespaces that are only partly affected —
 * `json.patch` is fatal while `json.is_valid` is fine.
 *
 * This set is PARTIAL BY CONSTRUCTION: a partly-affected namespace can hide a member
 * the probe did not call. That gap is covered by the wasm check, which needs no list.
 * Do not grow this into a claim of completeness it cannot honour.
 */
export const HOST_DISPATCHED_UNIMPLEMENTED = [
  { pattern: 'time.', note: 'no clock and no date parsing in wasm — the case that started GT-644' },
  { pattern: 'crypto.', note: 'no hashing or certificate parsing in wasm' },
  { pattern: 'io.', note: 'io.jwt.* — no token decoding or verification in wasm' },
  { pattern: 'http.', note: 'http.send — the wasm runtime performs no I/O' },
  { pattern: 'opa.', note: 'opa.runtime — there is no runtime object to read' },
  { pattern: 'rand.', note: 'a verdict must be reproducible; there is no PRNG' },
  { pattern: 'uuid.', note: 'no identifier generation in wasm' },
  { pattern: 'semver.', note: 'no semver comparison in wasm' },
  { pattern: 'units.', note: 'no unit parsing in wasm' },
  { pattern: 'urlquery.', note: 'no URL query codec in wasm' },
  { pattern: 'hex.', note: 'no hex codec in wasm' },
  { pattern: 'graphql.', note: 'no GraphQL parser in wasm' },
  { pattern: 'providers.', note: 'providers.aws.* — cloud request signing performs I/O' },
  { pattern: 'json.patch', note: 'host-dispatched, unlike the rest of json.*' },
  { pattern: 'regex.globs_match', note: 'host-dispatched, unlike regex.match and regex.split' },
  { pattern: 'net.cidr_merge', note: 'host-dispatched, unlike net.cidr_contains' },
  { pattern: 'numbers.range_step', note: 'host-dispatched, unlike numbers.range' },
  { pattern: 'base64url.encode_no_pad', note: 'host-dispatched, unlike the padded variants' },
  { pattern: 'glob.quote_meta', note: 'host-dispatched, unlike glob.match' },
  { pattern: 'graph.reachable_paths', note: 'host-dispatched, unlike graph.reachable' },
  { pattern: 'indexof_n', note: 'host-dispatched despite being an unnamespaced builtin' },
];

// ---------------------------------------------------------------------------
// Failure reporting
// ---------------------------------------------------------------------------

function fail(lines) {
  console.error(`\n✗ ${GUARD}: ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(`  ${l}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// The build command is the single source of truth for what gets compiled
// ---------------------------------------------------------------------------

/**
 * Read the entrypoints, the bundle source directory and the ignored directories
 * out of the build script itself.
 *
 * Copying them into this file would create a second owner of the same fact, and the
 * two would drift the first time the build changed — which is precisely the failure
 * mode this repository keeps finding. Anything unparseable is a hard failure: a guard
 * that guesses the build's shape is checking a bundle nobody ships.
 *
 * @param {string} source contents of compile-opa-wasm.mjs
 * @returns {{entrypoints: string[], bundleDir: string, ignored: string[]}}
 */
export function parseBuildCommand(source) {
  const entrypoints = [...source.matchAll(/'-e',\s*'([^']+)'/g)].map((m) => m[1]);

  // `opa build -t wasm <flags…> -o <archive> <source dir>` inside a template literal.
  const build = /build\s+-t\s+wasm\b([^`]*)`/.exec(source);
  const tail = build?.[1] ?? '';
  const output = /-o\s+\S+\s+(\S+)/.exec(tail);
  const bundleDir = output?.[1]?.replace(/\/+$/, '') ?? null;
  const ignored = [...tail.matchAll(/--ignore=(\S+)/g)].map((m) => m[1]);

  return { entrypoints, bundleDir, ignored };
}

/** `evolith/main/violations` -> `evolith.main`: the package an entrypoint lives in. */
export function entrypointPackage(entrypoint) {
  return entrypoint.split('/').slice(0, -1).join('.');
}

// ---------------------------------------------------------------------------
// The .rego corpus, and which of it the entrypoints can reach
// ---------------------------------------------------------------------------

function listRegoFiles(dir, ignored, acc = [], base = dir) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignored.includes(entry.name)) listRegoFiles(full, ignored, acc, base);
    } else if (entry.name.endsWith('.rego')) {
      acc.push(full);
    }
  }
  return acc;
}

/** The `package` declared by a rego file, or null when it declares none. */
export function declaredPackage(source) {
  return /^\s*package\s+([\w.]+)/m.exec(source)?.[1] ?? null;
}

/**
 * The packages a rego file imports.
 *
 * `import data.evolith.dod.violations as dod_violations` imports a RULE inside
 * `evolith.dod`, so the reference is matched against the packages that exist rather
 * than split on a fixed depth — the longest declared package that prefixes the
 * reference is the one being imported.
 *
 * @param {string} source
 * @param {Set<string>} knownPackages
 * @returns {string[]}
 */
export function importedPackages(source, knownPackages) {
  const found = new Set();
  for (const m of source.matchAll(/^\s*import\s+data\.([\w.]+)/gm)) {
    const ref = m[1];
    const segments = ref.split('.');
    for (let n = segments.length; n > 0; n--) {
      const candidate = segments.slice(0, n).join('.');
      if (knownPackages.has(candidate)) {
        found.add(candidate);
        break;
      }
    }
  }
  return [...found];
}

/**
 * Transitive closure of `import data.…` from the entrypoint packages.
 *
 * This mirrors what OPA prunes, and it is why `json.patch` in 83 test files is not
 * reported: nothing imports a `*_test` package. It is an APPROXIMATION of OPA's
 * pruning, not a replica — OPA also links `test_*` rules it finds in the bundle. The
 * wasm check covers what this misses; a name that reaches the bundle by a route this
 * closure does not model still shows up in `builtins()`.
 *
 * @param {Map<string, string[]>} packageImports package -> packages it imports
 * @param {string[]} seeds entrypoint packages
 * @returns {Set<string>}
 */
export function reachablePackages(packageImports, seeds) {
  const seen = new Set();
  const queue = [...seeds];
  while (queue.length > 0) {
    const pkg = queue.pop();
    if (seen.has(pkg)) continue;
    seen.add(pkg);
    for (const next of packageImports.get(pkg) ?? []) {
      if (!seen.has(next)) queue.push(next);
    }
  }
  return seen;
}

/**
 * Blank out comments and string literals so a builtin name quoted in a message is
 * not mistaken for a call. Line count and column positions are preserved, so a hit
 * still reports the line it is really on.
 *
 * @param {string} source
 * @returns {string[]} one masked line per source line
 */
export function maskLiterals(source) {
  const masked = [];
  let inRawString = false;

  for (const line of source.split('\n')) {
    if (inRawString) {
      const close = line.indexOf('`');
      if (close === -1) {
        masked.push(' '.repeat(line.length));
        continue;
      }
      masked.push(' '.repeat(close + 1) + line.slice(close + 1));
      inRawString = false;
      continue;
    }

    let out = '';
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === '#') {
        out += ' '.repeat(line.length - i);
        break;
      }
      if (ch === '"') {
        out += ' ';
        i += 1;
        while (i < line.length) {
          if (line[i] === '\\') { out += '  '; i += 2; continue; }
          out += ' ';
          i += 1;
          if (line[i - 1] === '"') break;
        }
        continue;
      }
      if (ch === '`') {
        const close = line.indexOf('`', i + 1);
        if (close === -1) {
          inRawString = true;
          out += ' '.repeat(line.length - i);
          break;
        }
        out += ' '.repeat(close - i + 1);
        i = close + 1;
        continue;
      }
      out += ch;
      i += 1;
    }
    masked.push(out);
  }

  return masked;
}

/**
 * Every call site of `name` in a masked rego source.
 *
 * A namespace pattern (`time.`) matches any member; an exact pattern matches only
 * itself. The leading lookbehind keeps `data.evolith.time.foo(` — a rule reached
 * through `data` — from reading as a builtin call.
 *
 * @param {string[]} maskedLines
 * @param {string} pattern
 * @returns {Array<{line: number, call: string}>}
 */
export function callSites(maskedLines, pattern) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expr = pattern.endsWith('.')
    ? new RegExp(`(?<![\\w.])(${escaped}[a-z_][\\w.]*)\\s*\\(`, 'g')
    : new RegExp(`(?<![\\w.])(${escaped})\\s*\\(`, 'g');

  const hits = [];
  maskedLines.forEach((line, index) => {
    expr.lastIndex = 0;
    let m;
    while ((m = expr.exec(line)) !== null) hits.push({ line: index + 1, call: m[1] });
  });
  return hits;
}

// ---------------------------------------------------------------------------
// The shipped runtime's dispatch table
// ---------------------------------------------------------------------------

/**
 * The builtins `@open-policy-agent/opa-wasm` can dispatch — read from the installed
 * package, so a version bump that adds or drops one is picked up with no edit here.
 */
async function sdkDispatchTable(root) {
  const abs = resolveSdkFile(root, SDK_BUILTINS);
  if (!abs) {
    fail([
      `the shipped wasm runtime is not installed: ${SDK_BUILTINS}`,
      'This guard reads its dispatch table from the package that actually executes the',
      'bundle. Without it there is nothing to compare against — run `npm ci`.',
    ]);
  }
  const mod = await import(pathToFileURL(abs).href);
  const table = mod.default ?? mod;
  const names = Object.keys(table);
  if (names.length === 0) {
    fail([`${SDK_BUILTINS} exports an EMPTY dispatch table — refusing to certify a bundle against nothing.`]);
  }
  return new Set(names);
}

/**
 * The runtime loaders must not register custom builtins.
 *
 * `loadPolicy(wasm, memory, customBuiltins)` widens what the host can dispatch. If a
 * loader ever passes that third argument, the SDK table stops being the whole answer
 * and this guard would report failures that do not happen. Fail rather than mislead.
 */
function assertNoCustomBuiltins(root) {
  for (const rel of RUNTIME_LOADERS) {
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    const source = readFileSync(abs, 'utf8');
    for (const m of source.matchAll(/loadPolicy\(([^)]*)\)/g)) {
      const args = m[1].split(',').map((a) => a.trim()).filter(Boolean);
      if (args.length > 2) {
        fail([
          `${rel} calls loadPolicy() with custom builtins: ${m[0]}`,
          'This guard assumes the host can dispatch exactly what the SDK implements. A',
          'custom builtin widens that set, so the comparison below would report failures',
          'that cannot happen. Teach this guard about the registered names before shipping',
          'the call.',
        ]);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The compiled bundle
// ---------------------------------------------------------------------------

/**
 * Locate a usable `policy.wasm`, compiling one if that is the only way.
 *
 * A wasm OLDER than any `.rego` is treated as absent: checking a stale artifact and
 * reporting on the sources is how a guard certifies something nobody built.
 *
 * @returns {{path: string|null, compiled: boolean, reason: string}}
 */
function obtainWasm(root, bundleDir, regoFiles) {
  const wasmPath = join(root, bundleDir, 'policy.wasm');
  const newestRego = Math.max(...regoFiles.map((f) => statSync(f).mtimeMs));

  if (existsSync(wasmPath)) {
    if (statSync(wasmPath).mtimeMs >= newestRego) {
      return { path: wasmPath, compiled: false, reason: 'existing bundle is newer than every .rego' };
    }
    if (NO_COMPILE) {
      return { path: null, compiled: false, reason: 'existing bundle is STALE and --no-compile forbids rebuilding it' };
    }
  } else if (NO_COMPILE) {
    return { path: null, compiled: false, reason: 'no bundle on disk and --no-compile forbids building one' };
  }

  const script = join(root, COMPILE_SCRIPT);
  if (!existsSync(script)) {
    return { path: null, compiled: false, reason: `${COMPILE_SCRIPT} is missing` };
  }

  const res = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', timeout: 300000 });
  if (res.status !== 0 || !existsSync(wasmPath)) {
    const tail = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim().split('\n').slice(-3).join(' | ');
    return { path: null, compiled: false, reason: `compiling the bundle failed: ${tail || res.error?.message || 'unknown error'}` };
  }
  return { path: wasmPath, compiled: true, reason: 'compiled from source' };
}

/**
 * The builtins this bundle dispatches to the host, straight out of the artifact.
 *
 * `builtins()` returns a name -> id map for exactly the builtins OPA did NOT compile
 * natively, after its own pruning. `opa_json_dump` renders it into linear memory as a
 * NUL-terminated string; both are part of the stable OPA wasm ABI the SDK itself uses.
 *
 * @returns {Promise<Record<string, number>>}
 */
export async function bundleHostBuiltins(wasmBuffer, root) {
  const sdkEntry = resolveSdkFile(root, SDK_ENTRY);
  if (!sdkEntry) fail([`cannot load ${SDK_PACKAGE} to read the compiled bundle — run \`npm ci\`.`]);
  const { loadPolicy } = await import(pathToFileURL(sdkEntry).href);
  const policy = await loadPolicy(wasmBuffer);

  const instance = policy.wasmInstance;
  const readJson = (address) => {
    const start = instance.exports.opa_json_dump(address);
    const memory = new Uint8Array(policy.mem.buffer);
    let end = start;
    while (memory[end] !== 0) end += 1;
    return JSON.parse(new TextDecoder().decode(memory.slice(start, end)));
  };

  return {
    builtins: readJson(instance.exports.builtins()),
    entrypoints: readJson(instance.exports.entrypoints()),
  };
}

/**
 * Check 1's whole decision, as a pure function of two tables.
 *
 * Kept separate from the wasm plumbing so it can be exercised without a compiler:
 * the fixture that proves this guard fails cannot depend on a 40MB download and a
 * network, and a decision nobody has watched make the wrong call is not tested.
 *
 * @param {Record<string, number>} hostBuiltins name -> builtin id, from `builtins()`
 * @param {Set<string>} sdkTable what the shipped runtime can dispatch
 * @returns {Array<{name: string, id: number}>} sorted, empty when the bundle is safe
 */
export function unsupportedDispatch(hostBuiltins, sdkTable) {
  return Object.keys(hostBuiltins)
    .filter((name) => !sdkTable.has(name))
    .sort()
    .map((name) => ({ name, id: hostBuiltins[name] }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const compileScript = join(ROOT, COMPILE_SCRIPT);
  if (!existsSync(compileScript)) {
    fail([
      `the build script is missing: ${COMPILE_SCRIPT}`,
      'Its arguments are what this guard checks. Without it there is no bundle to',
      'describe, and reporting a pass would certify a build that does not exist.',
    ]);
  }

  const { entrypoints, bundleDir, ignored } = parseBuildCommand(readFileSync(compileScript, 'utf8'));
  if (entrypoints.length === 0 || !bundleDir) {
    fail([
      `could not read the wasm build command out of ${COMPILE_SCRIPT}.`,
      `  entrypoints parsed .. ${entrypoints.length}`,
      `  bundle directory .... ${bundleDir ?? '(not found)'}`,
      'The build changed shape. Fix the parser rather than letting this guard check a',
      'bundle assembled from arguments it invented.',
    ]);
  }

  // ---- the source corpus, and its denominators, BEFORE any wasm work --------
  // Deliberately first: an empty tree must fail on its own coverage instead of
  // downloading a 40MB compiler to discover there is nothing to compile.

  const regoFiles = listRegoFiles(join(ROOT, bundleDir), ignored);
  assertScanned(regoFiles.length, { what: '.rego policies in the wasm bundle', where: bundleDir });

  const files = regoFiles.map((abs) => {
    const source = readFileSync(abs, 'utf8');
    return { abs, rel: relative(ROOT, abs), pkg: declaredPackage(source), source };
  });

  const knownPackages = new Set(files.map((f) => f.pkg).filter(Boolean));
  const packageImports = new Map();
  for (const file of files) {
    if (!file.pkg) continue;
    const existing = packageImports.get(file.pkg) ?? [];
    packageImports.set(file.pkg, [...existing, ...importedPackages(file.source, knownPackages)]);
  }

  const seeds = entrypoints.map(entrypointPackage);
  const orphans = seeds.filter((pkg) => !knownPackages.has(pkg));
  if (orphans.length > 0) {
    fail([
      `${orphans.length} wasm entrypoint(s) name a package no .rego declares: ${orphans.join(', ')}`,
      `  entrypoints: ${entrypoints.join(', ')}`,
      'Reachability computed from a package that does not exist is empty, and an empty',
      'reachable set would report a clean scan over nothing.',
    ]);
  }

  const reachable = reachablePackages(packageImports, seeds);
  const reachableFiles = files.filter((f) => f.pkg && reachable.has(f.pkg));
  assertScanned(reachableFiles.length, {
    what: 'policies reachable from the wasm entrypoints',
    where: `${bundleDir} (import closure of ${seeds.join(', ')})`,
  });

  console.log(`${GUARD} — the bundle may only call builtins the shipped wasm runtime implements`);
  console.log(`  entrypoints ........ ${entrypoints.join(', ')}`);
  console.log(`  .rego scanned ...... ${regoFiles.length} under ${bundleDir}${ignored.length ? ` (ignoring ${ignored.join(', ')})` : ''}`);
  console.log(`  reachable .......... ${reachableFiles.length} (import closure; the rest is pruned by OPA)`);

  const sdkTable = await sdkDispatchTable(ROOT);
  assertNoCustomBuiltins(ROOT);
  console.log(`  runtime dispatches . ${sdkTable.size} builtin(s): ${[...sdkTable].sort().join(', ')}`);

  const violations = [];

  // ---- check 2: the curated early warning, over the reachable sources -------

  const stale = HOST_DISPATCHED_UNIMPLEMENTED.filter((e) => !e.pattern.endsWith('.') && sdkTable.has(e.pattern));
  for (const entry of stale) {
    violations.push(
      `${entry.pattern} is listed in HOST_DISPATCHED_UNIMPLEMENTED, but the installed\n` +
      `      runtime now implements it. A curated entry that is no longer true makes the\n` +
      `      rest of the set look reviewed when it is not — delete this one.`,
    );
  }

  let curatedHits = 0;
  for (const file of reachableFiles) {
    const masked = maskLiterals(file.source);
    for (const entry of HOST_DISPATCHED_UNIMPLEMENTED) {
      for (const hit of callSites(masked, entry.pattern)) {
        curatedHits += 1;
        violations.push(
          `${file.rel}:${hit.line} calls ${hit.call}() — ${entry.note}.\n` +
          `      The bundle compiles and \`opa test\` stays green; the SDK then throws\n` +
          `      "not implemented: built-in function N: ${hit.call}" at evaluation time, and\n` +
          `      OpaEvaluator turns that into "OPA engine error — enforcement blocked" for\n` +
          `      EVERY rule in the run. Compute it from \`input\` instead, or move the fact to\n` +
          `      the native evaluator.`,
        );
      }
    }
  }
  console.log(`  curated set ........ ${HOST_DISPATCHED_UNIMPLEMENTED.length} pattern(s), ${curatedHits} call site(s) found`);

  // ---- check 1: the compiled bundle, which is the authority ----------------

  const wasm = obtainWasm(ROOT, bundleDir, regoFiles);
  if (!wasm.path) {
    const message = [
      `no compiled bundle to check — ${wasm.reason}.`,
      'The source scan above ran, but it is an early warning over a curated set, not the',
      'complete answer. Only the compiled wasm names every builtin this bundle dispatches',
      'to the host.',
      '  build one with: npm run build:policy',
    ];
    if (REQUIRE_WASM) fail(message);
    console.log('');
    console.log(`  ⚠ wasm cross-check SKIPPED — ${wasm.reason}`);
    console.log('    This run did NOT verify the compiled bundle. Pass --require-wasm where');
    console.log('    that must be fatal (CI compiles the bundle, so it does).');
  } else {
    const { builtins, entrypoints: compiledEntrypoints } = await bundleHostBuiltins(readFileSync(wasm.path), ROOT);
    const dispatched = Object.keys(builtins);

    if (Object.keys(compiledEntrypoints).length === 0) {
      fail([
        `${relative(ROOT, wasm.path)} exposes NO entrypoints.`,
        'An empty bundle dispatches no builtins, so the check below would pass over',
        'nothing. Rebuild it with `npm run build:policy`.',
      ]);
    }

    console.log(`  bundle ............. ${relative(ROOT, wasm.path)} (${wasm.reason})`);
    console.log(`  host-dispatched .... ${dispatched.length}: ${dispatched.sort().join(', ') || '(none)'}`);

    for (const { name, id } of unsupportedDispatch(builtins, sdkTable)) {
      const sites = files.flatMap((f) =>
        callSites(maskLiterals(f.source), name).map((hit) => `${f.rel}:${hit.line}`),
      );
      violations.push(
        `the compiled bundle dispatches ${name}() to the host, and the shipped runtime\n` +
        `      (@open-policy-agent/opa-wasm) does not implement it — built-in id ${id}.\n` +
        `      Every evaluation that reaches this call throws "not implemented: built-in\n` +
        `      function ${id}: ${name}", which OpaEvaluator reports as "OPA engine error —\n` +
        `      enforcement blocked" for EVERY rule in the run.\n` +
        (sites.length > 0
          ? `      called at:\n${sites.map((s) => `        • ${s}`).join('\n')}`
          : `      No call site found in ${bundleDir} — it is reached through a rule this scan\n` +
            `      cannot attribute. Search the bundle for ${name} before rebuilding.`),
      );
    }
  }

  if (VERBOSE) {
    console.log('');
    console.log('  reachable policies:');
    for (const file of reachableFiles) console.log(`    • ${file.rel}  [${file.pkg}]`);
    const pruned = files.filter((f) => !f.pkg || !reachable.has(f.pkg));
    console.log(`  pruned (${pruned.length}) — not reachable from any entrypoint, so not in the bundle:`);
    for (const file of pruned) console.log(`    · ${file.rel}  [${file.pkg ?? 'no package'}]`);
  }

  if (violations.length > 0) {
    console.error('');
    console.error(`✗ ${GUARD}: ${violations.length} finding(s):\n`);
    for (const v of violations) console.error(`  • ${v}\n`);
    process.exit(1);
  }

  console.log('');
  console.log(
    `✓ ${GUARD}: every builtin the bundle hands to the host is one the shipped runtime ` +
    `implements${wasm.path ? '' : ' (source scan only — see the warning above)'}.`,
  );
  process.exit(0);
}

const invokedDirectly = process.argv[1] && resolvePath(process.argv[1]) === resolvePath(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  main().catch((error) => {
    if (error instanceof ZeroCoverageError) {
      console.error(`\n✗ ${GUARD}: ${error.message}`);
      process.exit(1);
    }
    console.error(`\n✗ ${GUARD} crashed: ${error?.stack || error}`);
    process.exit(1);
  });
}
