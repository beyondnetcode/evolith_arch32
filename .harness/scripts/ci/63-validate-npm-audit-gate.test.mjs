#!/usr/bin/env node

/**
 * GT-657 — fixtures for the npm-audit gate.
 *
 * The case that matters is the one that makes this guard worth having over a
 * plain `npm audit --audit-level=high`: an advisory that is NOT declared must
 * still be red. A gate whose exception list can swallow anything is a green
 * button, and the situation it was built for — a high advisory with no upstream
 * fix — is exactly when someone is tempted to build one.
 *
 * The audit report is injected with `--audit-json` rather than run for real:
 * the guard's job is reconciling a report against declarations, and running npm
 * here would test npm.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  blockingAdvisories,
  advisoryId,
  reconcile,
  validateException,
  EXCEPTIONS,
} from './63-validate-npm-audit-gate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '63-validate-npm-audit-gate.mjs');

let sandbox;
before(() => { sandbox = mkdtempSync(join(tmpdir(), 'gt657-')); });
after(() => { if (sandbox) rmSync(sandbox, { recursive: true, force: true }); });

const GHSA = 'GHSA-pm4m-ph32-ghv5';
const NESTED = 'node_modules/@nestjs/swagger/node_modules/js-yaml';

const report = (vulns, totals = {}) => ({
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0, total: 1, ...totals } },
  vulnerabilities: vulns,
});

const jsYamlHigh = {
  'js-yaml': {
    severity: 'high',
    nodes: [NESTED],
    via: [{ title: 'Exponential parsing time', url: `https://github.com/advisories/${GHSA}`, severity: 'high' }],
  },
};

const exception = (over = {}) => ({
  id: GHSA,
  package: 'js-yaml',
  path: NESTED,
  declaredAt: '2026-08-08',
  noUpstreamFix: 'every published release pins a vulnerable version',
  reason: 'the parser is never pointed at untrusted input here',
  ...over,
});

/** A tree carrying an exceptions file and an audit report on disk. */
const treeWith = (name, exceptions, auditReport) => {
  const root = join(sandbox, name);
  mkdirSync(join(root, dirname(EXCEPTIONS)), { recursive: true });
  if (exceptions !== undefined) {
    writeFileSync(join(root, EXCEPTIONS), typeof exceptions === 'string' ? exceptions : JSON.stringify(exceptions, null, 2));
  }
  const json = join(root, 'audit.json');
  writeFileSync(json, JSON.stringify(auditReport));
  return { root, json };
};

const run = ({ root, json }, extra = []) => {
  const r = spawnSync(process.execPath, [GUARD, '--root', root, '--audit-json', json, ...extra], {
    encoding: 'utf8', timeout: 120000,
  });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
};

// ---------------------------------------------------------------------------
// Pure core
// ---------------------------------------------------------------------------

describe('advisoryId', () => {
  it('prefers the GHSA id in the advisory URL', () => {
    assert.equal(advisoryId({ url: `https://github.com/advisories/${GHSA}` }), GHSA);
  });

  it('falls back to the npm source id, and says so rather than inventing one', () => {
    assert.equal(advisoryId({ source: 1234 }), 'npm:1234');
    assert.equal(advisoryId({}), 'unknown');
  });
});

describe('blockingAdvisories', () => {
  it('keeps high and critical, drops the rest', () => {
    const rows = blockingAdvisories(report({
      ...jsYamlHigh,
      hono: { severity: 'moderate', nodes: ['node_modules/hono'], via: [{ title: 'ReDoS', url: 'x' }] },
    }));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].package, 'js-yaml');
  });

  it('keeps a parent reached only through another vulnerable package', () => {
    const rows = blockingAdvisories(report({
      '@nestjs/swagger': { severity: 'high', nodes: ['node_modules/@nestjs/swagger'], via: ['js-yaml'] },
    }));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, 'via:js-yaml');
  });

  it('an empty report yields nothing to block on', () => {
    assert.deepEqual(blockingAdvisories(report({}, { high: 0, total: 0 })), []);
  });
});

describe('reconcile', () => {
  const advisories = blockingAdvisories(report(jsYamlHigh));

  it('an exact declaration covers its advisory', () => {
    const r = reconcile(advisories, [exception()]);
    assert.equal(r.covered.length, 1);
    assert.deepEqual(r.undeclared, []);
    assert.deepEqual(r.stale, []);
  });

  it('THE ABUSE CASE: a declaration for a different PATH covers nothing', () => {
    // Otherwise one exception excuses the same advisory wherever it later appears.
    const r = reconcile(advisories, [exception({ path: 'node_modules/js-yaml' })]);
    assert.equal(r.undeclared.length, 1);
    assert.equal(r.stale.length, 1);
  });

  it('a declaration for a different advisory id covers nothing', () => {
    const r = reconcile(advisories, [exception({ id: 'GHSA-somethingelse' })]);
    assert.equal(r.undeclared.length, 1);
  });

  it('an advisory that has gone away leaves its declaration STALE', () => {
    const r = reconcile([], [exception()]);
    assert.equal(r.stale.length, 1);
  });
});

describe('validateException', () => {
  it('accepts a complete declaration', () => {
    assert.deepEqual(validateException(exception(), 0), []);
  });

  it('rejects one with no reason, and one with no upstream-fix evidence', () => {
    assert.match(validateException(exception({ reason: ' ' }), 0)[0], /reason must be a non-empty string/);
    assert.match(validateException(exception({ noUpstreamFix: '' }), 0)[0], /noUpstreamFix must be a non-empty string/);
  });

  it('rejects a missing or malformed date', () => {
    assert.match(validateException(exception({ declaredAt: 'soon' }), 0)[0], /declaredAt must be YYYY-MM-DD/);
  });
});

// ---------------------------------------------------------------------------
// End to end
// ---------------------------------------------------------------------------

describe('the gate', () => {
  it('THE FIXTURE: an undeclared high advisory is RED', () => {
    const { status, out } = run(treeWith('undeclared', { exceptions: [] }, report(jsYamlHigh)));
    assert.equal(status, 1, out);
    assert.match(out, /neither fixed nor declared/);
    assert.match(out, new RegExp(GHSA));
    // It must not merely say "no": it must say what would make it a yes.
    assert.match(out, /Declare it ONLY when no upstream fix exists/);
  });

  it('a declared advisory is green, and the reason is printed', () => {
    const { status, out } = run(treeWith('declared', { exceptions: [exception()] }, report(jsYamlHigh)));
    assert.equal(status, 0, out);
    assert.match(out, /0 undeclared high\/critical/);
    assert.match(out, /never pointed at untrusted input here/);
  });

  it('THE GOOD NEWS AS A RED CHECK: a declaration whose advisory is gone fails', () => {
    const clean = report({}, { high: 0, total: 0 });
    const { status, out } = run(treeWith('stale', { exceptions: [exception()] }, clean));
    assert.equal(status, 1, out);
    assert.match(out, /no longer match any advisory/);
    assert.match(out, /An exception list that outlives what it excused/);
  });

  it('no exceptions file at all means no exemptions', () => {
    const { status } = run(treeWith('absent', undefined, report(jsYamlHigh)));
    assert.equal(status, 1);
  });

  it('an unreadable registry stops the run rather than reading as "no exemptions"', () => {
    const { status, out } = run(treeWith('broken', '{ not json', report(jsYamlHigh)));
    assert.equal(status, 1, out);
    assert.match(out, /is not valid JSON/);
  });

  it('a clean tree with no declarations is green', () => {
    const { status, out } = run(treeWith('clean', { exceptions: [] }, report({}, { high: 0, total: 0 })));
    assert.equal(status, 0, out);
  });

  it('a report of an unknown shape must not read as a clean tree', () => {
    const { status, out } = run(treeWith('shapeless', { exceptions: [] }, { totals: 'moved' }));
    assert.equal(status, 1, out);
    assert.match(out, /denominator is unknown/);
  });
});
