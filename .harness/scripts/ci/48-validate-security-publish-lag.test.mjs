#!/usr/bin/env node

/**
 * GT-624 — fixtures for the security-publish-lag gate.
 *
 * The case that matters is the one this repository actually lived through: a
 * commit that says `security(...)` sits in `main` while the registry serves an
 * older version. If that fixture ever goes green, the gate is decoration — which
 * is the whole reason GT-624's third criterion asks for a fixture that has been
 * OBSERVED red rather than a guard someone believes works.
 *
 * The fixtures build real git repositories in a sandbox, because the boundary the
 * guard computes is git archaeology (`git log -S` over a manifest) and a mock of
 * that would only prove the mock. They run `--offline`, so the manifest version
 * stands in for the registry and no test touches the network.
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';

import { securityMarker, auditSecurityPublishLag } from './48-validate-security-publish-lag.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '48-validate-security-publish-lag.mjs');

let sandbox;
before(() => { sandbox = mkdtempSync(join(tmpdir(), 'gt624-')); });
after(() => { if (sandbox) rmSync(sandbox, { recursive: true, force: true }); });

const run = (root, extra = []) => {
  const r = spawnSync(process.execPath, [GUARD, '--root', root, '--offline', ...extra], {
    encoding: 'utf8', timeout: 120000,
  });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
};

// ---------------------------------------------------------------------------
// The marker, on its own. This is where the line between structure and prose is
// drawn, so it is pinned rather than left to the integration fixtures.
// ---------------------------------------------------------------------------

describe('securityMarker', () => {
  it('accepts the type this repository actually used', () => {
    assert.equal(securityMarker('security(fase-7): add Docker/K8s hardening checklist').marker, 'type');
    assert.equal(securityMarker('security: patch the shell runner').marker, 'type');
  });

  it('accepts a security scope on any type', () => {
    assert.equal(securityMarker('fix(security): timing-safe key comparison').marker, 'scope');
    assert.equal(securityMarker('chore(sec): rotate the signing key').marker, 'scope');
    assert.equal(securityMarker('feat(Security)!: enforce ABAC').marker, 'scope');
  });

  it('REFUSES prose, which is the whole point', () => {
    // The commit that shipped 1.2.2 mentions the security wave and is a dependency
    // fix. If prose counted, this gate would fire on anything that discusses
    // security, and a gate that cries wolf gets switched off.
    assert.equal(securityMarker('fix(deps)!: resolve the SDK that carries the security wave (GT-634)'), null);
    assert.equal(securityMarker('docs(gaps): register the security audit findings'), null);
    assert.equal(securityMarker('not a conventional subject at all'), null);
  });
});

describe('auditSecurityPublishLag', () => {
  it('counts what it examined, not only what it found', () => {
    const audit = auditSecurityPublishLag([
      { pkg: 'a', publishedVersion: '1.0.0', commits: [
        { sha: 'aaa', subject: 'fix(security): x' },
        { sha: 'bbb', subject: 'docs: y' },
      ] },
    ]);
    assert.equal(audit.scanned, 2);
    assert.equal(audit.findings.length, 1);
    assert.equal(audit.byMarker.scope, 1);
    assert.equal(audit.byMarker.type, 0);
  });

  it('is empty for an empty input rather than throwing — the caller decides', () => {
    const audit = auditSecurityPublishLag([]);
    assert.deepEqual(audit.findings, []);
    assert.equal(audit.scanned, 0);
  });
});

// ---------------------------------------------------------------------------
// Integration, over real git history.
// ---------------------------------------------------------------------------

/**
 * A miniature repository with one publishable workspace.
 *
 * `subjects` land AFTER the commit that sets the manifest to `version`, so they
 * are unpublished by construction — the exact shape of the GT-570 window.
 */
const miniRepo = (name, { version, subjects }) => {
  const root = join(sandbox, name);
  const dir = join(root, 'src', 'sdk', 'cli');
  mkdirSync(dir, { recursive: true });
  const g = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });

  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 'fixture@example.com');
  g('config', 'user.name', 'fixture');

  writeFileSync(join(root, 'README.md'), '# fixture\n');
  g('add', '-A');
  g('commit', '-q', '-m', 'chore: seed');

  const manifest = (v) => JSON.stringify({ name: '@beyondnet/evolith-cli', version: v }, null, 2) + '\n';
  writeFileSync(join(dir, 'package.json'), manifest('0.0.1'));
  g('add', '-A');
  g('commit', '-q', '-m', 'chore(release): 0.0.1');

  // The published boundary.
  writeFileSync(join(dir, 'package.json'), manifest(version));
  g('add', '-A');
  g('commit', '-q', '-m', `chore(release): ${version}`);

  // Everything after it is unreleased.
  subjects.forEach((subject, i) => {
    writeFileSync(join(dir, `change-${i}.ts`), `// ${subject}\n`);
    g('add', '-A');
    g('commit', '-q', '-m', subject);
  });

  return root;
};

describe('the GT-570 window', () => {
  it('THE FIXTURE: a security commit after the published version turns it RED', () => {
    const root = miniRepo('unpublished-security', {
      version: '1.1.0',
      subjects: [
        'docs: unrelated',
        'security(fase-6): add executable security rulesets',
      ],
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /1 security-marked commit\(s\) are NOT in any published version/);
    assert.match(out, /add executable security rulesets/);
    // It must name the consequence, not just the count.
    assert.match(out, /SECURITY\.md claimed the line was "actively patched"/);
    // And the release-please trap, because `security(...)` cannot bump a version.
    assert.match(out, /NOT a\n?\s*Conventional Commits type/);
  });

  it('a security commit INSIDE the published version is green', () => {
    // Same subject, but the manifest bump comes after it, so it shipped.
    const root = join(sandbox, 'published-security');
    const dir = join(root, 'src', 'sdk', 'cli');
    mkdirSync(dir, { recursive: true });
    const g = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    g('init', '-q', '-b', 'main');
    g('config', 'user.email', 'f@example.com');
    g('config', 'user.name', 'f');
    const manifest = (v) => JSON.stringify({ name: '@beyondnet/evolith-cli', version: v }, null, 2) + '\n';
    writeFileSync(join(dir, 'package.json'), manifest('1.0.0'));
    g('add', '-A'); g('commit', '-q', '-m', 'chore(release): 1.0.0');
    writeFileSync(join(dir, 'fix.ts'), '// fix\n');
    g('add', '-A'); g('commit', '-q', '-m', 'security(core): patch the shell runner');
    writeFileSync(join(dir, 'package.json'), manifest('1.1.0'));
    g('add', '-A'); g('commit', '-q', '-m', 'chore(release): 1.1.0');

    const { status, out } = run(root);
    assert.equal(status, 0, out);
    assert.match(out, /is inside a version the registry serves/);
  });

  it('REGRESSION: a version bumped past the published one must not hide the window', () => {
    // The false negative the first implementation had. `git log -S` matches the
    // commit that DELETED the version string as well as the one that added it, so
    // on a package already bumped to 1.2.2 the boundary landed on the bump and the
    // security commit sitting between 1.2.1 and that bump was never scanned.
    // Registry (offline: the manifest) says 1.2.1 is published — but here the
    // manifest has moved on, so the fixture pins the version explicitly.
    const root = join(sandbox, 'bumped-past');
    const dir = join(root, 'src', 'sdk', 'cli');
    mkdirSync(dir, { recursive: true });
    const g = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
    g('init', '-q', '-b', 'main');
    g('config', 'user.email', 'f@example.com');
    g('config', 'user.name', 'f');
    const manifest = (v) => JSON.stringify({ name: '@beyondnet/evolith-cli', version: v }, null, 2) + '\n';

    writeFileSync(join(dir, 'package.json'), manifest('1.2.1'));
    g('add', '-A'); g('commit', '-q', '-m', 'chore(release): 1.2.1');   // <- published
    writeFileSync(join(dir, 'patch.ts'), '// patch\n');
    g('add', '-A'); g('commit', '-q', '-m', 'security(mcp): redact the secret from the log');
    // A later manifest edit that KEEPS the version — a dependency bump, the common
    // case. This is what the second implementation tripped over: it moved the
    // boundary forward to here and hid the security commit above. The edit must be
    // a real content change, or git records no manifest commit at all and the
    // fixture proves nothing.
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: '@beyondnet/evolith-cli', version: '1.2.1', dependencies: { chalk: '^5.0.0' } }, null, 2) + '\n',
    );
    g('add', '-A'); g('commit', '-q', '-m', 'chore(deps): bump chalk');

    // Offline mode reads the manifest as published (1.2.1). The boundary must be
    // where 1.2.1 was SET — the first commit — not the later dep bump that also
    // declares 1.2.1, so the security commit is inside the window and reported.
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /redact the secret from the log/);
  });

  it('an unpublished NON-security commit is green — the gate is narrow on purpose', () => {
    const root = miniRepo('unpublished-ordinary', {
      version: '1.1.0',
      subjects: ['fix(deps)!: resolve the SDK that carries the security wave', 'docs: notes'],
    });
    const { status, out } = run(root);
    assert.equal(status, 0, out);
    assert.match(out, /commits examined \.+ 2/);
  });
});

describe('anti-vacuous floor', () => {
  it('refuses a root with no publishable package', () => {
    const root = join(sandbox, 'empty');
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'placeholder.txt'), 'x');
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /resolved ZERO publishable packages/);
    assert.match(out, /must not report a pass/);
  });

  it('refuses a package it cannot place in history', () => {
    // A manifest with no git history at all: "unable to answer" must not read as
    // "nothing to report".
    const root = join(sandbox, 'no-history');
    const dir = join(root, 'src', 'sdk', 'cli');
    mkdirSync(dir, { recursive: true });
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root, stdio: 'ignore' });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: '@beyondnet/evolith-cli', version: '9.9.9' }) + '\n');
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /could establish a publish boundary for NONE of them/);
  });

  it('does not count a private workspace as publishable', () => {
    const root = join(sandbox, 'private-only');
    const dir = join(root, 'src', 'sdk', 'cli');
    mkdirSync(dir, { recursive: true });
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root, stdio: 'ignore' });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0', private: true }) + '\n');
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /resolved ZERO publishable packages/);
  });
});
