/**
 * GT-572 — proof that the MCP smoke's gate assertion CAN FAIL.
 *
 * The gap being closed is not "the smoke was wrong", it is "the smoke could not
 * be wrong": `assert(envelope.success !== undefined)` holds for every response
 * the server is capable of emitting. Replacing it with a stricter assertion is
 * only progress if the stricter assertion is itself demonstrably falsifiable, so
 * every failure mode below is a payload this server has actually produced:
 *
 *   - FORBIDDEN / ABAC-02 ......... GT-572's original symptom, 47 tools denied
 *   - FORBIDDEN / ABAC_POLICY_MISSING  the packed tarball under NODE_ENV=production
 *   - RULESET_NOT_FOUND ........... what the smoke was silently receiving on stdio
 *
 * Run: node --test src/sdk/cli/examples/gate-verdict.assert.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { assertGateVerdict } = require('./gate-verdict.assert.js');

/** Wrap an envelope the way the MCP server wraps it in a tools/call result. */
const asResult = (envelope, isError = false) => ({
  content: [{ type: 'text', text: JSON.stringify(envelope) }],
  ...(isError ? { isError: true } : {}),
});

const VERDICT = {
  success: true,
  data: {
    gateId: 'business-sign-off',
    phase: 'discovery',
    verdict: 'failed',
    violations: [],
    summary: { errors: 6, warnings: 0 },
  },
  meta: { tool: 'evolith-gate-evaluate' },
};

test('accepts a real verdict and returns it', () => {
  const observed = assertGateVerdict(asResult(VERDICT), 'stdio');
  assert.equal(observed.verdict, 'failed');
  assert.equal(observed.gateId, 'business-sign-off');
});

test('accepts a passing verdict', () => {
  const passing = { ...VERDICT, data: { ...VERDICT.data, verdict: 'passed' } };
  assert.equal(assertGateVerdict(asResult(passing), 'stdio').verdict, 'passed');
});

test('accepts the canonical GT-316 vocabulary', () => {
  const canonical = { ...VERDICT, data: { ...VERDICT.data, verdict: 'PASS' } };
  assert.equal(assertGateVerdict(asResult(canonical), 'stdio').verdict, 'PASS');
});

test('REJECTS an ABAC denial (GT-572: 47 tools announced, 47 refused)', () => {
  const denied = {
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Access denied. ABAC check failed. Native: [ABAC-02: No roles present on user context].',
    },
  };
  assert.throws(() => assertGateVerdict(asResult(denied, true), 'stdio'), /DENIED by ABAC \(FORBIDDEN\)/);
});

test('REJECTS the production fail-closed denial the packed tarball produces', () => {
  const denied = {
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Access denied. ABAC check failed. OPA: [ABAC_POLICY_MISSING: ABAC policy not found].',
    },
  };
  assert.throws(() => assertGateVerdict(asResult(denied, true), 'stdio'), /ABAC_POLICY_MISSING/);
});

test('REJECTS RULESET_NOT_FOUND — the response the old assertion called OK', () => {
  const notFound = {
    success: false,
    error: { code: 'RULESET_NOT_FOUND', message: "ENOENT: no such file or directory, scandir '/repo/src/reference/governance/sdlc/gates'" },
  };
  // The exact payload the stdio smoke was receiving while printing OK.
  assert.doesNotThrow(() => JSON.parse(asResult(notFound).content[0].text));
  assert.throws(() => assertGateVerdict(asResult(notFound, true), 'stdio'), /no verdict was produced|isError/);
});

test('REJECTS the bare `success` field the old assertion accepted', () => {
  // This is literally what `success !== undefined` let through.
  assert.throws(() => assertGateVerdict(asResult({ success: false }), 'stdio'), /no verdict was produced/);
});

test('REJECTS success:true with no verdict in it', () => {
  const shapeOnly = { success: true, data: { gateId: 'business-sign-off' }, meta: {} };
  assert.throws(() => assertGateVerdict(asResult(shapeOnly), 'stdio'), /data\.verdict is undefined/);
});

test('REJECTS an unknown verdict word', () => {
  const bogus = { ...VERDICT, data: { ...VERDICT.data, verdict: 'probably-fine' } };
  assert.throws(() => assertGateVerdict(asResult(bogus), 'stdio'), /expected one of/);
});

test('REJECTS a verdict that names no gate', () => {
  const anonymous = { ...VERDICT, data: { ...VERDICT.data, gateId: undefined } };
  assert.throws(() => assertGateVerdict(asResult(anonymous), 'stdio'), /must name the gate/);
});

test('REJECTS a malformed or empty tools/call result', () => {
  assert.throws(() => assertGateVerdict(undefined, 'stdio'), /no result object/);
  assert.throws(() => assertGateVerdict({ content: [] }, 'stdio'), /non-empty array/);
  assert.throws(() => assertGateVerdict({ content: [{ type: 'text', text: 'not json' }] }, 'stdio'), /not JSON/);
});
