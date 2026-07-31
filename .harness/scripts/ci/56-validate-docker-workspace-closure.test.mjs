#!/usr/bin/env node --test

/**
 * Negative fixtures for `56-validate-docker-workspace-closure.mjs` (GT-647).
 *
 * The guard has two independent checks and a parser, and each has to be SEEN
 * turning red — `lib/coverage.mjs` is explicit that a test which passes against the
 * unfixed code proves nothing. So the end-to-end cases below run the real guard
 * against sandbox repositories built to be wrong in one specific way, and the
 * headline case is the actual 2026-07-31 outage: a transitive workspace dependency
 * missing from a runner stage.
 *
 * The green cases are here on purpose. A guard that failed unconditionally would
 * pass every red case and look thorough; two of these — a type-only import of an
 * undeclared package, and a stage named something other than `runner` — are the
 * exact false positives a naive version of each check would raise.
 *
 * Run: node --test .harness/scripts/ci/56-validate-docker-workspace-closure.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  copiesPath,
  expandWorkspaceGlobs,
  parseFinalStage,
  readWorkspace,
  valueImportsOf,
  workspaceClosure,
} from './56-validate-docker-workspace-closure.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = join(__dirname, '56-validate-docker-workspace-closure.mjs');

// ---------------------------------------------------------------------------
// Sandbox: a repository shaped like this one, wrong only where a case says so
// ---------------------------------------------------------------------------

function writeFile(root, rel, content) {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

/**
 * Build a sandbox workspace.
 *
 * Defaults reproduce the real topology in miniature: an app that depends on
 * `providers`, which depends on `contracts` — so `contracts` is TRANSITIVE and is
 * exactly the hop the outage lost.
 */
function sandbox({ appCopies, providerDeps, appSource, stageName = 'runner' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'closure-guard-'));
  writeFile(root, 'package.json', JSON.stringify({ name: 'root', workspaces: ['src/apps/*', 'src/packages/*'] }));

  writeFile(
    root,
    'src/packages/contracts/package.json',
    JSON.stringify({ name: '@beyondnet/evolith-contracts', dependencies: {} }),
  );
  writeFile(root, 'src/packages/contracts/src/index.ts', 'export const CONTRACT = 1;\n');

  writeFile(
    root,
    'src/packages/providers/package.json',
    JSON.stringify({
      name: '@beyondnet/evolith-infra-providers',
      dependencies: providerDeps ?? { '@beyondnet/evolith-contracts': '^1.1.0' },
    }),
  );
  writeFile(
    root,
    'src/packages/providers/src/ingest.ts',
    "import { CONTRACT } from '@beyondnet/evolith-contracts/ingest';\nexport const x = CONTRACT;\n",
  );

  writeFile(
    root,
    'src/apps/api/package.json',
    JSON.stringify({ name: 'api', dependencies: { '@beyondnet/evolith-infra-providers': '^1.1.0' } }),
  );
  writeFile(root, 'src/apps/api/src/main.ts', appSource ?? "export const boot = () => 'ok';\n");

  const copies = appCopies ?? [
    'src/packages/contracts',
    'src/packages/providers',
    'src/apps/api',
  ];
  writeFile(
    root,
    'src/apps/api/Dockerfile',
    [
      'FROM node:20-alpine AS builder',
      'WORKDIR /repo',
      'RUN npm ci',
      '',
      `FROM node:20-alpine AS ${stageName}`,
      'WORKDIR /repo',
      'COPY --from=builder /repo/node_modules ./node_modules',
      ...copies.flatMap((dir) => [
        `COPY --from=builder /repo/${dir}/dist ./${dir}/dist`,
        `COPY --from=builder /repo/${dir}/package.json ./${dir}/package.json`,
      ]),
      'CMD ["node", "dist/main"]',
      '',
    ].join('\n'),
  );
  return root;
}

function runGuard(root) {
  const r = spawnSync(process.execPath, [GUARD, '--root', root, '--verbose'], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

// ---------------------------------------------------------------------------
// Check 1 — the outage itself
// ---------------------------------------------------------------------------

test('RED: a TRANSITIVE workspace dep missing from the runner stage fails (the 2026-07-31 outage)', () => {
  // Exactly the shipped mistake: both DIRECT deps copied, the one reached through
  // providers omitted. A reviewer reading the app manifest sees a complete list.
  const root = sandbox({ appCopies: ['src/packages/providers', 'src/apps/api'] });
  try {
    const { code, out } = runGuard(root);
    assert.equal(code, 1);
    assert.match(out, /src\/apps\/api\/Dockerfile: final stage does not ship 2 closure path\(s\)/);
    assert.match(out, /src\/packages\/contracts\/dist \(@beyondnet\/evolith-contracts\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('RED: copying dist but not package.json still fails — the symlink needs its manifest', () => {
  const root = sandbox({ appCopies: ['src/packages/providers', 'src/apps/api'] });
  writeFile(
    root,
    'src/apps/api/Dockerfile',
    [
      'FROM node:20-alpine AS builder',
      'FROM node:20-alpine AS runner',
      'COPY --from=builder /repo/node_modules ./node_modules',
      'COPY --from=builder /repo/src/packages/contracts/dist ./src/packages/contracts/dist',
      'COPY --from=builder /repo/src/packages/providers/dist ./src/packages/providers/dist',
      'COPY --from=builder /repo/src/packages/providers/package.json ./src/packages/providers/package.json',
      'COPY --from=builder /repo/src/apps/api/dist ./src/apps/api/dist',
      'COPY --from=builder /repo/src/apps/api/package.json ./src/apps/api/package.json',
      '',
    ].join('\n'),
  );
  try {
    const { code, out } = runGuard(root);
    assert.equal(code, 1);
    assert.match(out, /contracts\/package\.json/);
    assert.doesNotMatch(out, /contracts\/dist \(/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('GREEN: the full closure copied passes', () => {
  const root = sandbox();
  try {
    const { code, out } = runGuard(root);
    assert.equal(code, 0, out);
    assert.match(out, /ship their full workspace closure/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('GREEN: the final stage is found by POSITION, not by the name "runner"', () => {
  // src/sdk/cli called its final stage `runtime` until 2026-07-31; a guard keyed on
  // the name would have skipped the very file that was broken.
  const root = sandbox({ stageName: 'runtime' });
  try {
    const { code, out } = runGuard(root);
    assert.equal(code, 0, out);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('RED: a final stage with no COPY --from is reported, not silently skipped', () => {
  const root = sandbox();
  writeFile(
    root,
    'src/apps/api/Dockerfile',
    ['FROM node:20-alpine AS builder', 'FROM node:20-alpine AS runner', 'CMD ["node"]', ''].join('\n'),
  );
  try {
    const { code, out } = runGuard(root);
    assert.equal(code, 1);
    assert.match(out, /has no `COPY --from=`/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Check 2 — the undeclared workspace import (GT-625 class)
// ---------------------------------------------------------------------------

test('RED: a VALUE import of an undeclared workspace package fails', () => {
  // The hoisting trap: providers imports contracts but declares nothing, so the
  // closure computed for the app would silently omit it and check 1 would be
  // confidently green about a broken image.
  const root = sandbox({ providerDeps: {}, appCopies: ['src/packages/providers', 'src/apps/api'] });
  try {
    const { code, out } = runGuard(root);
    assert.equal(code, 1);
    assert.match(out, /value-imports @beyondnet\/evolith-contracts, which is not declared at all/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('GREEN: a TYPE-only import of an undeclared workspace package does not fail', () => {
  // No require is emitted, so it cannot dangle in a container. This is the false
  // positive that would make the check unusable.
  const root = sandbox({ providerDeps: {} });
  writeFile(
    root,
    'src/packages/providers/src/ingest.ts',
    "import type { Contract } from '@beyondnet/evolith-contracts/ingest';\nexport type X = Contract;\n",
  );
  try {
    const { code, out } = runGuard(root);
    assert.equal(code, 0, out);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('GREEN: a spec file may import anything — it never ships', () => {
  const root = sandbox({ providerDeps: {} });
  writeFile(root, 'src/packages/providers/src/ingest.ts', 'export const x = 1;\n');
  writeFile(
    root,
    'src/packages/providers/src/ingest.spec.ts',
    "import { CONTRACT } from '@beyondnet/evolith-contracts/ingest';\nexport const y = CONTRACT;\n",
  );
  try {
    const { code, out } = runGuard(root);
    assert.equal(code, 0, out);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Anti-vacuous
// ---------------------------------------------------------------------------

test('RED: a workspace whose globs match nothing fails instead of passing empty', () => {
  const root = mkdtempSync(join(tmpdir(), 'closure-guard-empty-'));
  writeFile(root, 'package.json', JSON.stringify({ name: 'root', workspaces: ['src/apps/*'] }));
  try {
    const { code, out } = runGuard(root);
    assert.equal(code, 1);
    assert.match(out, /ZERO workspace packages scanned/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('RED: a workspace with packages but no Dockerfile fails as vacuous', () => {
  const root = sandbox();
  rmSync(join(root, 'src/apps/api/Dockerfile'));
  try {
    const { code, out } = runGuard(root);
    assert.equal(code, 1);
    assert.match(out, /ZERO workspace Dockerfiles scanned/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

test('workspaceClosure is transitive and includes the entrypoint', () => {
  const root = sandbox();
  try {
    const { byName, all } = readWorkspace(root);
    const app = all.find((p) => p.name === 'api');
    const { members, unresolved } = workspaceClosure(app, byName);
    assert.deepEqual(
      members.map((m) => m.name).sort(),
      ['@beyondnet/evolith-contracts', '@beyondnet/evolith-infra-providers', 'api'],
    );
    assert.deepEqual(unresolved, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('workspaceClosure reports a dep that names no workspace package', () => {
  const root = sandbox({ providerDeps: { '@beyondnet/evolith-ghost': '^1.0.0' } });
  try {
    const { byName, all } = readWorkspace(root);
    const app = all.find((p) => p.name === 'api');
    assert.deepEqual(workspaceClosure(app, byName).unresolved, ['@beyondnet/evolith-ghost']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('workspaceClosure terminates on a dependency cycle', () => {
  const byName = new Map();
  const a = { name: '@beyondnet/evolith-a', dir: 'a', deps: { '@beyondnet/evolith-b': '1' } };
  const b = { name: '@beyondnet/evolith-b', dir: 'b', deps: { '@beyondnet/evolith-a': '1' } };
  byName.set(a.name, a).set(b.name, b);
  assert.equal(workspaceClosure(a, byName).members.length, 2);
});

test('parseFinalStage reads only the LAST stage, and joins line continuations', () => {
  const { sources, stageName, copyFromCount } = parseFinalStage(
    [
      'FROM node AS builder',
      'COPY --from=other /repo/src/packages/decoy/dist ./decoy',
      'FROM node AS runner',
      'COPY --from=builder \\',
      '  /repo/src/packages/contracts/dist \\',
      '  ./src/packages/contracts/dist',
      '# COPY --from=builder /repo/commented/dist ./x',
      'COPY reference /app/corpus/reference',
    ].join('\n'),
  );
  assert.equal(stageName, 'runner');
  assert.equal(copyFromCount, 1);
  assert.ok(sources.includes('/repo/src/packages/contracts/dist'));
  assert.ok(!sources.some((s) => s.includes('decoy')));
  assert.ok(!sources.some((s) => s.includes('commented')));
  assert.ok(sources.includes('reference'));
});

test('copiesPath matches on the path suffix, so the builder WORKDIR is irrelevant', () => {
  const dir = 'src/packages/contracts';
  assert.ok(copiesPath(['/repo/src/packages/contracts/dist'], dir, 'dist'));
  assert.ok(copiesPath(['src/packages/contracts/dist'], dir, 'dist'));
  assert.ok(copiesPath(['/repo/src/packages/contracts/dist/'], dir, 'dist'));
  // A different package whose directory merely ENDS with the same word must not match.
  assert.ok(!copiesPath(['/repo/src/packages/other-contracts/dist'], dir, 'dist'));
  assert.ok(!copiesPath(['/repo/src/packages/contracts/dist'], dir, 'package.json'));
});

test('valueImportsOf strips subpaths and ignores type-only forms', () => {
  assert.deepEqual([...valueImportsOf("import { a } from '@beyondnet/evolith-contracts/ingest';")], [
    '@beyondnet/evolith-contracts',
  ]);
  assert.deepEqual([...valueImportsOf("import { a } from '@beyondnet/evolith-contracts';")], [
    '@beyondnet/evolith-contracts',
  ]);
  assert.deepEqual([...valueImportsOf("import type { A } from '@beyondnet/evolith-contracts';")], []);
  assert.deepEqual([...valueImportsOf("import { type A, type B } from '@beyondnet/evolith-contracts';")], []);
  // Mixed: one value binding is enough to emit a require.
  assert.deepEqual([...valueImportsOf("import { fn, type A } from '@beyondnet/evolith-contracts';")], [
    '@beyondnet/evolith-contracts',
  ]);
  // A namespace import has no braces at all and is a value import.
  assert.deepEqual([...valueImportsOf("import * as c from '@beyondnet/evolith-contracts';")], [
    '@beyondnet/evolith-contracts',
  ]);
  assert.deepEqual([...valueImportsOf("import { a } from './local';")], []);
});

test('expandWorkspaceGlobs refuses a pattern it cannot expand rather than matching nothing', () => {
  assert.throws(() => expandWorkspaceGlobs('/tmp', ['src/**/pkg']), /unsupported workspaces glob/);
});
