#!/usr/bin/env node --test

/**
 * Negative fixtures for `62-validate-health-envelope.mjs` (GT-654).
 *
 * Every rejection below was run against the predicate and seen to turn it red;
 * the green case is here so a reject-everything predicate cannot masquerade as
 * thorough. Its first version did the opposite and failed all three real
 * surfaces for its own reasons — see the note on comment stripping.
 *
 * Run: node --test .harness/scripts/ci/62-validate-health-envelope.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { findRepoRoot } from '../lib/paths.mjs';
import { checkSurface, SURFACES } from './62-validate-health-envelope.mjs';

const GOOD = `
const ENVELOPE_SCHEMA_VERSION = '1.0.0';
function envelope(command, data) {
  return { success: true, data, meta: { command, schemaVersion: ENVELOPE_SCHEMA_VERSION } };
}
health() { return envelope('http GET /health', { status: 'OK', service: 'x' }); }
`;

test('the enveloped shape is accepted, or every rejection below proves nothing', () => {
  assert.deepEqual(checkSurface('x', GOOD), []);
});

test('a bare object is rejected — the exact shape two surfaces shipped', () => {
  const bare = `health() { return { status: 'OK', service: 'x' }; }`;
  const problems = checkSurface('x', bare);
  assert.equal(problems.length, 2, 'no envelope AND no schemaVersion');
  assert.ok(problems.some((p) => /builds no ADR-0073 envelope/.test(p)));
});

test('an envelope with no schemaVersion is rejected — a shape nobody can version', () => {
  const unversioned = `health() { return { success: true, data: { status: 'OK' }, meta: {} }; }`;
  const problems = checkSurface('x', unversioned);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /schemaVersion/);
});

test('a lowercase verdict INSIDE a correct envelope is still rejected', () => {
  // This is the literal that made a cross-cluster probe call two healthy
  // services unreachable. A correct envelope does not excuse it.
  const problems = checkSurface('x', GOOD.replace("status: 'OK'", "status: 'ok'"));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /lowercase/);
});

test('schemaVersion may live in the imported envelope module, not the handler', () => {
  // The MCP calls `success()` from `common/envelopes`; requiring the constant in
  // the handler file would fail a surface that is entirely correct.
  const handler = `res.end(JSON.stringify(success({ status: 'OK' }, meta)));`;
  assert.deepEqual(checkSurface('mcp', handler, 'export const MCP_ENVELOPE_SCHEMA_VERSION = "1.0.0";'), []);
});

test('a comment describing the OLD bare shape does not fail the file', () => {
  // The first version scanned raw text and fired on the handler's own header,
  // which explains `{status: 'ok', …}` as the shape it replaced. A guard that
  // flags its own documentation gets the documentation deleted, not the defect
  // fixed — the same trap already hit once this session on GITLEAKS_LICENSE.
  const documented = `/**\n * These used to return \`{status: 'ok', service}\`.\n */\n` + GOOD;
  assert.deepEqual(checkSurface('x', documented), []);
});

test('every real surface satisfies the predicate', () => {
  const root = findRepoRoot();
  for (const s of SURFACES) {
    const abs = join(root, s.file);
    assert.ok(existsSync(abs), `${s.file} is registered but missing`);
    const versionText = s.version && existsSync(join(root, s.version))
      ? readFileSync(join(root, s.version), 'utf8')
      : undefined;
    assert.deepEqual(
      checkSurface(s.name, readFileSync(abs, 'utf8'), versionText),
      [],
      `${s.name} does not emit the envelope`,
    );
  }
});

test('all three surfaces are registered — a dropped one must not read as agreement', () => {
  assert.deepEqual(SURFACES.map((s) => s.name).sort(), ['agent-runtime', 'core-api', 'mcp']);
});
