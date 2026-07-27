import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  dependencyOrder,
  planRelease,
  readWorkspacePackages,
} from './plan-npm-release.mjs';

const pkg = (name, version, internalDeps = []) => ({ name, version, dir: `src/packages/${name}`, internalDeps });

describe('dependencyOrder', () => {
  test('puts a dependency before its consumer', () => {
    const order = dependencyOrder([
      pkg('@beyondnet/evolith-cli', '1.0.0', ['@beyondnet/evolith-core-domain']),
      pkg('@beyondnet/evolith-core-domain', '1.0.0'),
    ]).map((p) => p.name);

    assert.deepEqual(order, ['@beyondnet/evolith-core-domain', '@beyondnet/evolith-cli']);
  });

  test('handles a diamond without duplicating a node', () => {
    const order = dependencyOrder([
      pkg('d', '1.0.0', ['b', 'c']),
      pkg('b', '1.0.0', ['a']),
      pkg('c', '1.0.0', ['a']),
      pkg('a', '1.0.0'),
    ]).map((p) => p.name);

    assert.equal(order.length, 4, 'every node exactly once');
    assert.equal(order[0], 'a');
    assert.equal(order[3], 'd');
    assert.ok(order.indexOf('b') < order.indexOf('d'));
    assert.ok(order.indexOf('c') < order.indexOf('d'));
  });

  test('THROWS on a cycle instead of guessing an order', () => {
    // Guessing would produce a release that publishes a consumer against a
    // dependency version that does not exist yet.
    assert.throws(
      () => dependencyOrder([pkg('a', '1.0.0', ['b']), pkg('b', '1.0.0', ['a'])]),
      /dependency cycle/,
    );
  });

  test('ignores an external dependency that is not in the workspace set', () => {
    const order = dependencyOrder([pkg('a', '1.0.0', ['@beyondnet/evolith-not-here'])]).map((p) => p.name);
    assert.deepEqual(order, ['a']);
  });
});

describe('planRelease', () => {
  const set = [
    pkg('@beyondnet/evolith-core-domain', '1.2.0'),
    pkg('@beyondnet/evolith-mcp', '1.2.0', ['@beyondnet/evolith-core-domain']),
  ];

  test('publishes what the registry does not have, in dependency order', () => {
    const plan = planRelease(set, () => false);
    assert.deepEqual(plan.toPublish.map((p) => p.name), [
      '@beyondnet/evolith-core-domain',
      '@beyondnet/evolith-mcp',
    ]);
    assert.equal(plan.alreadyPublished.length, 0);
    assert.equal(plan.denominator, 2);
  });

  test('is idempotent: an already-published version is skipped, not republished', () => {
    const plan = planRelease(set, (name) => name === '@beyondnet/evolith-core-domain');
    assert.deepEqual(plan.toPublish.map((p) => p.name), ['@beyondnet/evolith-mcp']);
    assert.deepEqual(plan.alreadyPublished.map((p) => p.name), ['@beyondnet/evolith-core-domain']);
  });

  test('a fully-published set yields an empty publish list but a non-zero denominator', () => {
    // This is the legitimate "nothing to do" state and must be distinguishable
    // from the vacuous one below.
    const plan = planRelease(set, () => true);
    assert.equal(plan.toPublish.length, 0);
    assert.equal(plan.denominator, 2);
  });

  test('NEGATIVE — an empty package set throws instead of reporting an empty plan', () => {
    // The vacuous case. A release pipeline that resolves nothing must not print
    // green; that is the defect this repository keeps finding in its own guards.
    assert.throws(() => planRelease([], () => false), /zero publishable packages/);
    assert.throws(() => planRelease(null, () => false), /zero publishable packages/);
  });

  test('matches on the exact version, so a bump is publishable even if the name exists', () => {
    const isPublished = (name, version) => version === '1.1.0';
    const plan = planRelease([pkg('@beyondnet/evolith-mcp', '1.2.0')], isPublished);
    assert.equal(plan.toPublish.length, 1, '1.2.0 is not 1.1.0');
  });
});

describe('readWorkspacePackages (against the real repository)', () => {
  const real = readWorkspacePackages();

  test('finds the publishable packages and excludes private ones', () => {
    assert.ok(real.length >= 8, `expected at least 8 publishable packages, got ${real.length}`);
    assert.ok(real.every((p) => p.name.startsWith('@beyondnet/evolith-')));
    assert.ok(!real.some((p) => p.name === 'core-api'), 'core-api is private and must not appear');
  });

  test('the real graph is acyclic and orders core-domain first, cli last', () => {
    const order = dependencyOrder(real).map((p) => p.name);
    assert.equal(order[0], '@beyondnet/evolith-core-domain');
    assert.equal(order[order.length - 1], '@beyondnet/evolith-cli');
    assert.ok(
      order.indexOf('@beyondnet/evolith-core-domain') < order.indexOf('@beyondnet/evolith-mcp'),
      'mcp depends on core-domain and must follow it',
    );
  });
});
