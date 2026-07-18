import assert from 'node:assert/strict';
import test from 'node:test';
import { ZeroCoverageError, assertScanned, assertScannedPerSource, scanned } from './coverage.mjs';

// --- The core rule: zero scanned is a failure --------------------------------

test('zero scanned throws, and says the check did not run rather than that it passed', () => {
  assert.throws(
    () => assertScanned(0, { what: 'topology manifests', where: 'src/rulesets/topologies' }),
    (err) => {
      assert.ok(err instanceof ZeroCoverageError);
      assert.match(err.message, /ZERO topology manifests scanned/);
      assert.match(err.message, /did not run/);
      assert.match(err.message, /not a pass/);
      assert.match(err.message, /src\/rulesets\/topologies/, 'must name where it looked');
      return true;
    },
  );
});

test('a non-zero count passes through unchanged', () => {
  assert.equal(assertScanned(8, { what: 'manifests', where: 'a' }), 8);
  assert.equal(assertScanned(1, { what: 'manifests', where: ['a', 'b'] }), 1);
});

test('the failure enumerates every location searched', () => {
  try {
    assertScanned(0, { what: 'manifests', where: ['reference/core/architecture/topologies', 'src/rulesets/topologies'] });
    assert.fail('should have thrown');
  } catch (err) {
    assert.match(err.message, /reference\/core\/architecture\/topologies/);
    assert.match(err.message, /src\/rulesets\/topologies/);
    assert.deepEqual(err.details.where.length, 2);
    assert.equal(err.details.count, 0);
  }
});

// --- The opt-out must be explicit and justified ------------------------------

test('allowEmpty with a reason permits zero', () => {
  assert.equal(
    assertScanned(0, { what: 'bundles', where: 'dist/', allowEmpty: true, reason: 'compiled in CI only; absent locally' }),
    0,
  );
});

test('allowEmpty without a reason is itself an error', () => {
  assert.throws(
    () => assertScanned(0, { what: 'bundles', where: 'dist/', allowEmpty: true }),
    (err) => {
      assert.ok(err instanceof TypeError);
      assert.match(err.message, /requires an explicit `reason`/);
      return true;
    },
  );
  assert.throws(() => assertScanned(0, { what: 'b', where: 'd', allowEmpty: true, reason: '   ' }), TypeError);
});

// --- Input contract -----------------------------------------------------------

test('`what` and `where` are mandatory — a nameless failure is not actionable', () => {
  assert.throws(() => assertScanned(0, { where: 'x' }), /requires `what`/);
  assert.throws(() => assertScanned(0, { what: 'things' }), /requires `where`/);
  assert.throws(() => assertScanned(0, { what: 'things', where: [] }), /requires `where`/);
});

test('the count must be a non-negative integer', () => {
  for (const bad of [-1, 1.5, '3', null, undefined, NaN]) {
    assert.throws(() => assertScanned(bad, { what: 't', where: 'x' }), TypeError, `accepted bad count: ${String(bad)}`);
  }
});

// --- Per-source coverage: a live root must not mask a dead one ----------------

test('a populated source does not excuse an empty one', () => {
  assert.throws(
    () =>
      assertScannedPerSource(
        { 'reference/core/architecture/topologies': 8, 'src/rulesets/topologies': 0 },
        { what: 'topology manifests' },
      ),
    (err) => {
      assert.ok(err instanceof ZeroCoverageError);
      assert.match(err.message, /1 of 2 source\(s\)/);
      assert.match(err.message, /src\/rulesets\/topologies/);
      assert.match(err.message, /mask this/);
      return true;
    },
  );
});

test('all sources populated returns the total', () => {
  assert.equal(assertScannedPerSource({ a: 8, b: 5 }, { what: 'manifests' }), 13);
});

test('a bucket may be exempted, but only with a reason', () => {
  assert.equal(assertScannedPerSource({ a: 3, b: 0 }, { what: 'm', allowEmptyBuckets: ['b'], reason: 'not yet adopted' }), 3);
  assert.throws(() => assertScannedPerSource({ a: 3, b: 0 }, { what: 'm', allowEmptyBuckets: ['b'] }), TypeError);
});

test('assertScannedPerSource requires at least one bucket', () => {
  assert.throws(() => assertScannedPerSource({}, { what: 'm' }), TypeError);
});

// --- scanned() wrapper --------------------------------------------------------

test('scanned() returns the items when non-empty and throws when empty', () => {
  assert.deepEqual(scanned(() => [1, 2, 3], { what: 'items', where: 'x' }), [1, 2, 3]);
  assert.throws(() => scanned(() => [], { what: 'items', where: 'x' }), ZeroCoverageError);
  assert.throws(() => scanned(() => 'nope', { what: 'items', where: 'x' }), TypeError);
});
