/**
 * @file scope.test.mjs
 * @description Tests for the harness scope boundary (.harness/scripts/lib/scope.mjs).
 *
 * The load-bearing test is `resolveScope`: a resolver that throws must yield no scope at
 * all, never the declared one and never a broader one. That is the parity-gate defect.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  declareScope,
  activateScope,
  narrowScope,
  resolveScope,
  requireResolvedScope,
  evaluateScope,
  isInScope,
  isWithin,
  formatScopeContract,
  ScopeContractError,
  ScopeResolutionError,
} from './scope.mjs';

const spec = {
  id: 'test-scope',
  root: '/repo',
  include: ['a', 'b'],
  effects: ['read'],
  declaredBy: 'test',
  reason: 'because',
};

// ─── Declaration fails closed ───────────────────────────────────────────────

test('declareScope rejects an empty include list', () => {
  assert.throws(() => declareScope({ ...spec, include: [] }), ScopeContractError);
});

test('declareScope rejects effects that are empty or unknown', () => {
  assert.throws(() => declareScope({ ...spec, effects: [] }), ScopeContractError);
  assert.throws(() => declareScope({ ...spec, effects: ['sudo'] }), ScopeContractError);
});

test('declareScope rejects a selector that escapes the root', () => {
  assert.throws(() => declareScope({ ...spec, include: ['../elsewhere'] }), ScopeContractError);
  assert.throws(() => declareScope({ ...spec, include: ['/etc'] }), ScopeContractError);
});

test('declareScope requires id, declaredBy and reason', () => {
  for (const field of ['id', 'declaredBy', 'reason']) {
    assert.throws(() => declareScope({ ...spec, [field]: '  ' }), ScopeContractError, `missing ${field}`);
  }
});

test('declareScope anchors relative selectors under the root', () => {
  assert.deepEqual([...declareScope(spec).include], ['/repo/a', '/repo/b']);
});

// ─── Narrowing can only shrink ──────────────────────────────────────────────

test('narrowScope drops selectors that are not already inside the scope', () => {
  const scope = narrowScope(declareScope(spec), { include: ['a', 'c', '/elsewhere'] });
  assert.deepEqual([...scope.include], ['/repo/a'], 'c and /elsewhere must be dropped, not added');
});

test('narrowScope to nothing yields a scope that refuses everything', () => {
  const scope = narrowScope(declareScope(spec), { include: [] });
  assert.equal(scope.include.length, 0);
  assert.equal(isInScope(scope, { path: 'a', effect: 'read' }), false);
  assert.equal(evaluateScope(scope, { path: 'a', effect: 'read' }).rule, 'SC-R06');
});

test('narrowScope intersects effects and never adds one', () => {
  const scope = narrowScope(declareScope({ ...spec, effects: ['read', 'write'] }), { effects: ['write', 'delete'] });
  assert.deepEqual([...scope.effects], ['write'], 'delete was not declared, so it cannot appear');
});

// ─── The invariant: a failed resolution never widens ────────────────────────

test('resolveScope returns no scope when the resolver throws', () => {
  const declared = declareScope(spec);
  const resolution = resolveScope(declared, () => {
    throw new Error('git diff failed: not a git repository');
  });

  assert.equal(resolution.ok, false);
  assert.equal('scope' in resolution, false, 'the failure branch must carry NO scope to fall back to');
  assert.match(resolution.reason, /never falls back/);
});

test('resolveScope refuses a resolver that returns null rather than defaulting to declared', () => {
  const resolution = resolveScope(declareScope(spec), () => null);
  assert.equal(resolution.ok, false);
  assert.equal('scope' in resolution, false);
});

test('a successful resolution is never broader than the declaration', () => {
  const declared = declareScope(spec);
  const resolution = resolveScope(declared, () => ({ include: ['a', 'z'] }));
  assert.equal(resolution.ok, true);
  assert.deepEqual([...resolution.scope.include], ['/repo/a']);
  assert.ok(resolution.scope.include.length <= declared.include.length);
});

test('requireResolvedScope throws instead of yielding a scope', () => {
  assert.throws(
    () =>
      requireResolvedScope(declareScope(spec), () => {
        throw new Error('boom');
      }),
    ScopeResolutionError,
  );
});

// ─── The guard ──────────────────────────────────────────────────────────────

test('evaluateScope refuses paths outside the root (SC-R02)', () => {
  const scope = activateScope(declareScope(spec));
  assert.equal(evaluateScope(scope, { path: '/etc/passwd', effect: 'read' }).rule, 'SC-R02');
  assert.equal(evaluateScope(scope, { path: '../outside', effect: 'read' }).rule, 'SC-R02');
});

test('evaluateScope refuses an in-root path that was never included (SC-R03)', () => {
  const scope = activateScope(declareScope(spec));
  assert.equal(evaluateScope(scope, { path: 'c', effect: 'read' }).rule, 'SC-R03');
});

test('exclusions win over inclusions (SC-R04)', () => {
  const scope = activateScope(declareScope({ ...spec, exclude: ['a/secret'] }));
  assert.equal(evaluateScope(scope, { path: 'a/secret/x', effect: 'read' }).rule, 'SC-R04');
  assert.equal(evaluateScope(scope, { path: 'a/ok', effect: 'read' }).permitted, true);
});

test('effects do not imply one another (SC-R05)', () => {
  const scope = activateScope(declareScope(spec));
  assert.equal(evaluateScope(scope, { path: 'a', effect: 'delete' }).rule, 'SC-R05');
  assert.equal(evaluateScope(scope, { path: 'a', effect: 'read' }).permitted, true);
});

test('the module exposes no widening path at all', async () => {
  const mod = await import('./scope.mjs');
  assert.equal('widenScope' in mod, false, 'a CI script has no human to authorise a widening');
});

// ─── Containment ────────────────────────────────────────────────────────────

test('isWithin is prefix containment and rejects traversal', () => {
  assert.equal(isWithin('/a', '/a'), true);
  assert.equal(isWithin('/a', '/a/b'), true);
  assert.equal(isWithin('/a', '/ab'), false, 'sibling prefix must not match');
  assert.equal(isWithin('/a', '/a/../b'), false);
});

test('formatScopeContract reports drift after narrowing', () => {
  const narrowed = narrowScope(declareScope(spec), { include: ['a'] });
  assert.match(formatScopeContract(narrowed), /narrowed away 1 subtree\(s\): b/);
  assert.match(formatScopeContract(narrowed), /effective: 1 subtree\(s\): a/);
  assert.match(formatScopeContract(activateScope(declareScope(spec))), /drift:     none/);
});
