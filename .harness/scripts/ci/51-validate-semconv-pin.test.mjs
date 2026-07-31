#!/usr/bin/env node --test

/**
 * Negative fixtures for `51-validate-semconv-pin.mjs` (GT-587 criterion 3).
 *
 * A pin check that has never been observed failing is decoration. Each case below
 * materialises a repo-SHAPED sandbox — the three ROOT_MARKERS so `lib/paths.mjs`
 * ascends to the sandbox and not to this repository, a copy of `.harness/scripts`, a
 * synthetic `package-lock.json`, and one synthetic `semconv.ts` — and asserts the guard's
 * exit code. The green case is included deliberately: without it, a guard that failed
 * unconditionally would pass every red test and look thorough.
 *
 * Run: node --test .harness/scripts/ci/51-validate-semconv-pin.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');
const GUARD_REL = '.harness/scripts/ci/51-validate-semconv-pin.mjs';

/** The version the fixture lockfile claims, matching the fixture module unless a case says otherwise. */
const PINNED = '1.41.1';

/**
 * A minimal but REAL semconv module: same export shapes the guard parses, and values
 * that genuinely match `@opentelemetry/semantic-conventions@1.41.1`. Using fake values
 * would make the green case pass for the wrong reason.
 */
function semconvModule({ version = PINNED, nameValue = 'gen_ai.evaluation.name', extraConstant = '' } = {}) {
  return [
    `export const SEMCONV_VERSION = '${version}';`,
    `export const EVENT_GEN_AI_EVALUATION_RESULT = 'gen_ai.evaluation.result';`,
    `export const ATTR_GEN_AI_EVALUATION_NAME = '${nameValue}';`,
    `export const ATTR_MCP_TOOL_NAME = 'mcp.tool.name';`,
    extraConstant,
    `export interface PinnedSemconvSymbol {`,
    `  readonly exportName: string;`,
    `  readonly value: string;`,
    `  readonly upstream: 'exported' | 'registry-only';`,
    `}`,
    `export const PINNED_SEMCONV_ATTRIBUTES: readonly PinnedSemconvSymbol[] = [`,
    `  { exportName: 'EVENT_GEN_AI_EVALUATION_RESULT', value: EVENT_GEN_AI_EVALUATION_RESULT, upstream: 'exported' },`,
    `  { exportName: 'ATTR_GEN_AI_EVALUATION_NAME', value: ATTR_GEN_AI_EVALUATION_NAME, upstream: 'exported' },`,
    `  { exportName: 'ATTR_MCP_TOOL_NAME', value: ATTR_MCP_TOOL_NAME, upstream: 'registry-only' },`,
    `];`,
  ].join('\n');
}

function sandbox(moduleSource, lockedVersion = PINNED) {
  // realpath: on macOS os.tmpdir() is a symlink, and a guard comparing import.meta.url
  // against process.argv[1] would then skip its own main() and exit 0 in silence.
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gt587-semconv-')));

  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture', private: true }));
  writeFileSync(join(root, 'evolith.yaml'), 'name: fixture\n');
  writeFileSync(
    join(root, 'package-lock.json'),
    JSON.stringify({
      packages: lockedVersion
        ? { 'node_modules/@opentelemetry/semantic-conventions': { version: lockedVersion } }
        : {},
    }),
  );

  mkdirSync(join(root, '.harness'), { recursive: true });
  cpSync(join(REPO_ROOT, '.harness/scripts'), join(root, '.harness/scripts'), { recursive: true });

  const modulePath = join(root, 'src/packages/core-domain/src/evaluation/telemetry/semconv.ts');
  mkdirSync(dirname(modulePath), { recursive: true });
  writeFileSync(modulePath, moduleSource);

  const realNodeModules = join(REPO_ROOT, 'node_modules');
  if (existsSync(realNodeModules)) symlinkSync(realNodeModules, join(root, 'node_modules'), 'dir');

  return root;
}

function run(root) {
  const res = spawnSync(process.execPath, [join(root, GUARD_REL)], { cwd: root, encoding: 'utf8' });
  return { code: res.status, out: `${res.stdout}${res.stderr}` };
}

function withSandbox(moduleSource, lockedVersion, fn) {
  const root = sandbox(moduleSource, lockedVersion);
  try {
    fn(run(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('PASSES on a pin that agrees with the lockfile and with upstream', () => {
  withSandbox(semconvModule(), PINNED, ({ code, out }) => {
    assert.equal(code, 0, out);
    assert.match(out, /pinned revision/);
  });
});

test('FAILS when the declared revision drifts from the lockfile', () => {
  withSandbox(semconvModule({ version: '1.99.0' }), PINNED, ({ code, out }) => {
    assert.equal(code, 1, out);
    assert.match(out, /SEMCONV_VERSION drift/);
  });
});

test('FAILS when a pinned literal no longer matches upstream', () => {
  withSandbox(semconvModule({ nameValue: 'gen_ai.eval.name' }), PINNED, ({ code, out }) => {
    assert.equal(code, 1, out);
    assert.match(out, /ATTR_GEN_AI_EVALUATION_NAME drift/);
  });
});

test('FAILS when a constant is exported but left out of the manifest', () => {
  const extra = `export const ATTR_GEN_AI_REQUEST_MODEL = 'gen_ai.request.model';`;
  withSandbox(semconvModule({ extraConstant: extra }), PINNED, ({ code, out }) => {
    assert.equal(code, 1, out);
    assert.match(out, /absent from PINNED_SEMCONV_ATTRIBUTES/);
  });
});

test('FAILS when the package is absent from the lockfile — an unverifiable pin is not a pin', () => {
  withSandbox(semconvModule(), null, ({ code, out }) => {
    assert.equal(code, 1, out);
    assert.match(out, /not present in package-lock\.json/);
  });
});

test('FAILS on an empty manifest rather than reporting a vacuous pass', () => {
  const empty = [
    `export const SEMCONV_VERSION = '${PINNED}';`,
    `export const PINNED_SEMCONV_ATTRIBUTES: readonly { exportName: string; value: string; upstream: string }[] = [];`,
  ].join('\n');
  withSandbox(empty, PINNED, ({ code, out }) => {
    assert.equal(code, 1, out);
    assert.match(out, /pinned semconv symbols/);
  });
});
