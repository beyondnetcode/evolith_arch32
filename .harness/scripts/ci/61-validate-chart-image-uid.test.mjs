#!/usr/bin/env node --test

/**
 * Negative fixtures for `61-validate-chart-image-uid.mjs`.
 *
 * The guard exists because a hand-corrected value with nothing watching it is
 * one edit away from the same outage. A guard nobody has watched fail is the
 * same shape of promise, so every rejection below was run against the predicate
 * and seen to turn it red.
 *
 * The green case is not decoration: a predicate that rejected everything would
 * pass all the red cases and look thorough. Its first version did exactly the
 * opposite — the `adduser` regex required every token before `-u` to be a flag,
 * so it read all three real Dockerfiles as unparseable and failed for its own
 * reason rather than the repository's.
 *
 * Run: node --test .harness/scripts/ci/61-validate-chart-image-uid.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { findRepoRoot } from '../lib/paths.mjs';
import { imageUid, chartUids, checkPair, PAIRS } from './61-validate-chart-image-uid.mjs';

// The real shape: the username is POSITIONAL, between the flags.
const DOCKERFILE = `FROM node:20-alpine
RUN addgroup -g 1001 -S evolith && \\
    adduser -S evolith -u 1001 -G evolith && \\
    chown -R evolith:evolith /repo /app
USER evolith
CMD ["node", "dist/main"]
`;

const VALUES_OK = `podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  fsGroup: 1001
containerSecurityContext:
  runAsUser: 1001
`;

test('the positional username does not hide the uid — the bug the first regex had', () => {
  assert.equal(imageUid(DOCKERFILE), 1001);
});

test('the matching pair is accepted, or every rejection below proves nothing', () => {
  assert.deepEqual(checkPair(DOCKERFILE, VALUES_OK).problems, []);
});

test('runAsUser 1000 against an image built at 1001 is rejected — the exact shape that shipped', () => {
  const bad = VALUES_OK.replace('  runAsUser: 1001\n  runAsGroup', '  runAsUser: 1000\n  runAsGroup');
  const { problems } = checkPair(DOCKERFILE, bad);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /podSecurityContext\.runAsUser = 1000 but the image creates uid 1001/);
});

test('fsGroup alone is rejected — the side door a partial fix leaves open', () => {
  // Getting three of four right reproduces the failure through volume ownership.
  const bad = VALUES_OK.replace('fsGroup: 1001', 'fsGroup: 1000');
  const { problems } = checkPair(DOCKERFILE, bad);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /fsGroup = 1000/);
});

test('the container-level override is checked too, not just the pod level', () => {
  const bad = VALUES_OK.replace(
    'containerSecurityContext:\n  runAsUser: 1001',
    'containerSecurityContext:\n  runAsUser: 1000',
  );
  const { problems } = checkPair(DOCKERFILE, bad);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /containerSecurityContext\.runAsUser = 1000/);
});

test('a chart pinning nothing is REPORTED, not passed', () => {
  // It inherits the image's USER and is right today — and unanchored tomorrow.
  const { problems } = checkPair(DOCKERFILE, 'replicaCount: 1\n');
  assert.equal(problems.length, 1);
  assert.match(problems[0], /pins no uid/);
});

test('a Dockerfile whose uid cannot be read is an error, never a pass', () => {
  const { problems } = checkPair('FROM node:20-alpine\nUSER node\n', VALUES_OK);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /cannot be read here/);
});

test('a root image is an error too — there is nothing to compare against', () => {
  const { problems } = checkPair('FROM node:20-alpine\nCMD ["node"]\n', VALUES_OK);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /runs as root/);
});

test('chartUids reads all four fields', () => {
  assert.deepEqual(chartUids(VALUES_OK), {
    'podSecurityContext.runAsUser': 1001,
    'podSecurityContext.runAsGroup': 1001,
    'podSecurityContext.fsGroup': 1001,
    'containerSecurityContext.runAsUser': 1001,
  });
});

test('every real pair in the repository agrees', () => {
  const root = findRepoRoot();
  for (const pair of PAIRS) {
    const { problems } = checkPair(
      readFileSync(join(root, pair.dockerfile), 'utf8'),
      readFileSync(join(root, pair.chart, 'values.yaml'), 'utf8'),
    );
    assert.deepEqual(problems, [], `${pair.chart}: ${problems.join(' · ')}`);
  }
});
