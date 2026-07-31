#!/usr/bin/env node --test

/**
 * Negative fixtures for `55-validate-wasm-builtin-support.mjs` (GT-644).
 *
 * A guard nobody has watched fail is decoration, and this one has two independent
 * checks that must each be SEEN turning red:
 *
 *   - the source scan over the curated set, exercised end-to-end below against
 *     repo-SHAPED sandboxes (ROOT_MARKERS so `lib/paths.mjs` ascends to the sandbox,
 *     a synthetic build script, a synthetic `.rego` corpus, a synthetic runtime);
 *   - the compiled-bundle check, exercised through `unsupportedDispatch`, which is
 *     the whole of its decision. That half is deliberately NOT driven through a real
 *     wasm: compiling one needs a 40MB download and a network, and a fixture that
 *     cannot run offline is a fixture that gets skipped.
 *
 * The green cases are here on purpose. Without them a guard that failed
 * unconditionally would pass every red case and look thorough — and one of them
 * (`json.patch` in an unreachable test policy) is the exact false positive that made
 * a naive source scan unusable on this repository.
 *
 * Run: node --test .harness/scripts/ci/55-validate-wasm-builtin-support.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  callSites,
  entrypointPackage,
  importedPackages,
  maskLiterals,
  parseBuildCommand,
  reachablePackages,
  unsupportedDispatch,
  HOST_DISPATCHED_UNIMPLEMENTED,
} from './55-validate-wasm-builtin-support.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');
const GUARD_REL = '.harness/scripts/ci/55-validate-wasm-builtin-support.mjs';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

/** A build script shaped like the real one — the guard parses ITS arguments, not ours. */
function buildScript({ entrypoints = ['evolith/main/violations'], bundleDir = 'src/rulesets/opa', ignore = 'schemas' } = {}) {
  const flags = entrypoints.map((e) => `    '-e', '${e}',`).join('\n');
  return [
    "import { execSync } from 'child_process';",
    'const entrypoints = [',
    flags,
    '  ];',
    'export function compile(opaBinPath, rootDir) {',
    '  execSync(`${opaBinPath} build -t wasm ${entrypoints.join(\' \')}' +
      ` --ignore=${ignore} -o bundle.tar.gz ${bundleDir}/\`, { cwd: rootDir });`,
    '}',
  ].join('\n');
}

/**
 * The three builtins the real `@open-policy-agent/opa-wasm` dispatches that these
 * fixtures care about. Written as a real CJS module because the guard imports the
 * installed package rather than trusting a list of its own.
 */
function sdkModule(names = ['sprintf', 'json.is_valid', 'yaml.unmarshal']) {
  return `module.exports = { ${names.map((n) => `${JSON.stringify(n)}: () => null`).join(', ')} };\n`;
}

/**
 * A repo-shaped sandbox.
 *
 * @param {object} spec
 * @param {Record<string,string>} spec.rego  path under the bundle dir -> file contents
 * @param {string} [spec.build]              build script source
 * @param {string[]} [spec.sdk]              builtins the fake runtime implements
 * @param {Record<string,string>} [spec.extra] any other repo-relative file
 */
function sandbox(spec) {
  // realpath FIRST: on macOS os.tmpdir() is a symlink, and a script that compares
  // import.meta.url against process.argv[1] would skip its own main() and exit 0.
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gt644-wasm-builtins-')));

  const write = (rel, contents) => {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, contents);
  };

  // ROOT_MARKERS from lib/paths.mjs, so nothing ascends into this repository.
  write('package.json', `${JSON.stringify({ name: 'gt644-fixture', private: true }, null, 2)}\n`);
  write('evolith.yaml', 'version: 1\n');
  mkdirSync(join(root, '.harness/scripts'), { recursive: true });

  write('.harness/scripts/compile-opa-wasm.mjs', spec.build ?? buildScript());
  write('node_modules/@open-policy-agent/opa-wasm/src/builtins/index.js', sdkModule(spec.sdk));

  for (const [rel, contents] of Object.entries(spec.rego ?? {})) {
    write(join('src/rulesets/opa', rel), contents);
  }
  for (const [rel, contents] of Object.entries(spec.extra ?? {})) write(rel, contents);

  return root;
}

/** Run the REAL guard against a sandbox. `--no-compile` keeps every case offline. */
function runGuard(root, args = []) {
  const res = spawnSync(process.execPath, [join(REPO_ROOT, GUARD_REL), '--root', root, '--no-compile', ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, NO_COLOR: '1' },
  });
  return { status: res.status, output: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

const MAIN_POLICY = [
  'package evolith.main',
  '',
  'import rego.v1',
  '',
  'import data.evolith.evidence.violations as evidence_violations',
  '',
  'violations contains v if {',
  '\tv := evidence_violations[_]',
  '}',
].join('\n');

const CLEAN_EVIDENCE = [
  'package evolith.evidence',
  '',
  'import rego.v1',
  '',
  'violations contains v if {',
  '\tnot input.evidence.measured',
  '\tv := {"id": "EV-01", "message": sprintf("unmeasured: %v", [input.evidence.id])}',
  '}',
].join('\n');

/** Same policy, plus the call that started GT-644. */
const DATED_EVIDENCE = [
  CLEAN_EVIDENCE,
  '',
  'violations contains v if {',
  '\tns := time.parse_rfc3339_ns(input.evidence.measuredAt)',
  '\tns < input.limit',
  '\tv := {"id": "EV-02", "message": "stale"}',
  '}',
].join('\n');

const CLEAN_FIXTURE = { 'main.rego': MAIN_POLICY, 'evidence.rego': CLEAN_EVIDENCE };

// ---------------------------------------------------------------------------
// The guard, end to end
// ---------------------------------------------------------------------------

test('GREEN: a corpus that calls only supported builtins passes', () => {
  const root = sandbox({ rego: CLEAN_FIXTURE });
  try {
    const { status, output } = runGuard(root);
    assert.equal(status, 0, output);
    assert.match(output, /\.rego scanned \.+ 2/);
    assert.match(output, /reachable \.+ 2/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('RED: a reachable policy calling time.parse_rfc3339_ns is named with its line', () => {
  const root = sandbox({ rego: { 'main.rego': MAIN_POLICY, 'evidence.rego': DATED_EVIDENCE } });
  try {
    const { status, output } = runGuard(root);
    assert.equal(status, 1, output);
    assert.match(output, /src\/rulesets\/opa\/evidence\.rego:11 calls time\.parse_rfc3339_ns\(\)/);
    assert.match(output, /enforcement blocked/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('GREEN: the same call in a policy no entrypoint reaches is NOT reported', () => {
  // This is the `json.patch` case: 83 real sites live in *.test.rego that OPA prunes
  // out of the bundle. A scan blind to reachability opens red and gets switched off.
  const root = sandbox({
    rego: {
      ...CLEAN_FIXTURE,
      'evidence.test.rego': ['package evolith.evidence_test', '', 'import rego.v1', '', 'x := time.now_ns()'].join('\n'),
    },
  });
  try {
    const { status, output } = runGuard(root);
    assert.equal(status, 0, output);
    assert.match(output, /\.rego scanned \.+ 3/);
    assert.match(output, /reachable \.+ 2/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('GREEN: a builtin name inside a string or a comment is not a call', () => {
  const root = sandbox({
    rego: {
      'main.rego': MAIN_POLICY,
      'evidence.rego': [
        CLEAN_EVIDENCE,
        '',
        '# time.parse_rfc3339_ns(x) is exactly what this policy must NOT do.',
        'note := "call time.now_ns() and the whole gate fails"',
      ].join('\n'),
    },
  });
  try {
    const { status, output } = runGuard(root);
    assert.equal(status, 0, output);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('RED: an empty bundle directory is a zero-coverage failure, not a pass', () => {
  const root = sandbox({ rego: {} });
  try {
    const { status, output } = runGuard(root);
    assert.equal(status, 1, output);
    assert.match(output, /ZERO \.rego policies in the wasm bundle scanned/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('RED: an entrypoint whose package no .rego declares fails instead of scanning nothing', () => {
  const root = sandbox({
    build: buildScript({ entrypoints: ['evolith/moved/violations'] }),
    rego: CLEAN_FIXTURE,
  });
  try {
    const { status, output } = runGuard(root);
    assert.equal(status, 1, output);
    assert.match(output, /entrypoint\(s\) name a package no \.rego declares: evolith\.moved/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('RED: a build command this guard cannot parse fails rather than inventing one', () => {
  const root = sandbox({ build: 'export const nothing = true;\n', rego: CLEAN_FIXTURE });
  try {
    const { status, output } = runGuard(root);
    assert.equal(status, 1, output);
    assert.match(output, /could not read the wasm build command/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('RED: --require-wasm makes a missing bundle fatal instead of a warning', () => {
  const root = sandbox({ rego: CLEAN_FIXTURE });
  try {
    const skipped = runGuard(root);
    assert.equal(skipped.status, 0, skipped.output);
    assert.match(skipped.output, /wasm cross-check SKIPPED/);

    const required = runGuard(root, ['--require-wasm']);
    assert.equal(required.status, 1, required.output);
    assert.match(required.output, /no compiled bundle to check/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('RED: a curated entry the runtime now implements is reported as stale', () => {
  // `json.patch` is host-dispatched and unimplemented today. If a future
  // @open-policy-agent/opa-wasm ships it, the entry becomes a claim that is no longer
  // true — and an untrue entry makes the rest of the set look reviewed.
  const root = sandbox({ rego: CLEAN_FIXTURE, sdk: ['sprintf', 'json.patch'] });
  try {
    const { status, output } = runGuard(root);
    assert.equal(status, 1, output);
    assert.match(output, /json\.patch is listed in HOST_DISPATCHED_UNIMPLEMENTED, but the installed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('RED: a runtime loader registering custom builtins invalidates the comparison', () => {
  const loader = 'src/packages/core-domain/src/application/validators/evaluators/opa-evaluator.ts';
  const root = sandbox({
    rego: CLEAN_FIXTURE,
    extra: { [loader]: 'const policy = await loadPolicy(wasmBuffer, memory, { "time.now_ns": () => 0 });\n' },
  });
  try {
    const { status, output } = runGuard(root);
    assert.equal(status, 1, output);
    assert.match(output, /calls loadPolicy\(\) with custom builtins/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('RED: a runtime that dispatches nothing is refused rather than trusted', () => {
  const root = sandbox({ rego: CLEAN_FIXTURE, sdk: [] });
  try {
    const { status, output } = runGuard(root);
    assert.equal(status, 1, output);
    assert.match(output, /EMPTY dispatch table/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// The compiled-bundle check, as a decision
// ---------------------------------------------------------------------------

test('unsupportedDispatch reports exactly what the runtime cannot execute', () => {
  const sdk = new Set(['sprintf', 'json.is_valid', 'regex.split', 'yaml.marshal', 'yaml.unmarshal', 'yaml.is_valid']);

  // The bundle as it stands on 2026-07-31: one host call, and the SDK has it.
  assert.deepEqual(unsupportedDispatch({ sprintf: 16 }, sdk), []);

  // The GT-584 bundle: the id in the message is the id the SDK actually throws.
  assert.deepEqual(unsupportedDispatch({ sprintf: 16, 'time.parse_rfc3339_ns': 24 }, sdk), [
    { name: 'time.parse_rfc3339_ns', id: 24 },
  ]);

  // A builtin outside the curated set — the reason this check is the authority and
  // the curated set is only an early warning.
  assert.deepEqual(unsupportedDispatch({ 'net.cidr_expand': 10, 'crypto.md5': 3 }, sdk), [
    { name: 'crypto.md5', id: 3 },
    { name: 'net.cidr_expand', id: 10 },
  ]);
});

test('a natively compiled builtin never reaches the host, so it is never reported', () => {
  // `object.keys` is absent from the SDK's own capabilities.json and works fine: OPA
  // compiles it into the module. It is therefore absent from builtins(), which is why
  // that table — and not capabilities.json — is what this guard reads.
  assert.deepEqual(unsupportedDispatch({}, new Set(['sprintf'])), []);
});

// ---------------------------------------------------------------------------
// Parsing and reachability
// ---------------------------------------------------------------------------

test('parseBuildCommand reads the real build script', () => {
  const parsed = parseBuildCommand(buildScript({ entrypoints: ['evolith/main/violations', 'evolith/abac/violations'] }));
  assert.deepEqual(parsed.entrypoints, ['evolith/main/violations', 'evolith/abac/violations']);
  assert.equal(parsed.bundleDir, 'src/rulesets/opa');
  assert.deepEqual(parsed.ignored, ['schemas']);
  assert.equal(entrypointPackage('evolith/abac/violations'), 'evolith.abac');
});

test('an import of a RULE resolves to the package that declares it', () => {
  const known = new Set(['evolith.dod', 'evolith.infrastructure.helm']);
  const source = [
    'import data.evolith.dod.violations as dod_violations',
    'import data.evolith.infrastructure.helm.violations as helm_violations',
    'import data.evolith.not_a_package.violations as ghost',
  ].join('\n');
  assert.deepEqual(importedPackages(source, known).sort(), ['evolith.dod', 'evolith.infrastructure.helm']);
});

test('reachability is transitive and terminates on a cycle', () => {
  const imports = new Map([
    ['evolith.main', ['evolith.a']],
    ['evolith.a', ['evolith.b']],
    ['evolith.b', ['evolith.a']],
    ['evolith.orphan', []],
  ]);
  const reached = reachablePackages(imports, ['evolith.main']);
  assert.deepEqual([...reached].sort(), ['evolith.a', 'evolith.b', 'evolith.main']);
  assert.equal(reached.has('evolith.orphan'), false);
});

test('maskLiterals blanks strings and comments while keeping line numbers', () => {
  const masked = maskLiterals(['a := 1', '# time.now_ns()', 'b := "time.now_ns()"', 'c := time.now_ns()'].join('\n'));
  assert.equal(masked.length, 4);
  assert.deepEqual(callSites(masked, 'time.'), [{ line: 4, call: 'time.now_ns' }]);
});

test('a rule reached through data is not mistaken for a builtin call', () => {
  const masked = maskLiterals('x := data.evolith.time.window(input.a)');
  assert.deepEqual(callSites(masked, 'time.'), []);
});

test('the curated set carries a reason for every entry and no duplicates', () => {
  assert.ok(HOST_DISPATCHED_UNIMPLEMENTED.length > 0, 'an empty curated set checks nothing');
  const patterns = HOST_DISPATCHED_UNIMPLEMENTED.map((e) => e.pattern);
  assert.equal(new Set(patterns).size, patterns.length, 'duplicate pattern');
  for (const entry of HOST_DISPATCHED_UNIMPLEMENTED) {
    assert.ok(entry.note && entry.note.trim().length > 0, `${entry.pattern} has no reason`);
  }
});

test('the guard file the workflows name is the one this suite exercises', () => {
  assert.ok(existsSync(join(REPO_ROOT, GUARD_REL)), `${GUARD_REL} is missing`);
});
