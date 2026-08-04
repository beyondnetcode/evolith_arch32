#!/usr/bin/env node --test

/**
 * Negative fixtures for `60-validate-secret-scan-gate.mjs` (GT-653).
 *
 * The guard exists because a gate nobody watched fail is decoration. The same
 * rule applies one level up, so every rejection below was written against a
 * workflow shaped like the one that shipped — `continue-on-error`, the licensed
 * action, a scan without `--exit-code` — and each was confirmed to turn the
 * predicate red rather than merely to look wrong.
 *
 * The green case is not decoration either: a predicate that rejected everything
 * would pass all four red cases and read as thorough.
 *
 * Run: node --test .harness/scripts/ci/60-validate-secret-scan-gate.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { findRepoRoot } from '../lib/paths.mjs';
import { findDisarms, extractScanCommand, plantedSecret, WORKFLOW } from './60-validate-secret-scan-gate.mjs';

const ARMED = `
jobs:
  secret-detection:
    name: Secret Detection (gitleaks)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Run gitleaks
        run: gitleaks dir . --no-banner --redact --exit-code 1
`;

test('the armed shape is accepted — otherwise every rejection below is meaningless', () => {
  assert.deepEqual(findDisarms(ARMED), []);
});

test('a job carrying continue-on-error is rejected — the exact shape that shipped', () => {
  const disarmed = ARMED.replace('    runs-on: ubuntu-latest', '    runs-on: ubuntu-latest\n    continue-on-error: true');
  const problems = findDisarms(disarmed);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /continue-on-error/);
});

test('a STEP carrying continue-on-error is rejected — moving it down a level must not evade the guard', () => {
  const disarmed = ARMED.replace(
    '      - name: Run gitleaks',
    '      - name: Run gitleaks\n        continue-on-error: true',
  );
  const problems = findDisarms(disarmed);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /step 2 \(Run gitleaks\) carries continue-on-error/);
});

test('the licensed action is rejected, because the Dependabot store cannot satisfy it', () => {
  const licensed = `
jobs:
  secret-detection:
    runs-on: ubuntu-latest
    steps:
      - name: Run gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITLEAKS_LICENSE: \${{ secrets.GITLEAKS_LICENSE }}
      - name: Scan
        run: gitleaks dir . --exit-code 1
`;
  const problems = findDisarms(licensed);
  assert.equal(problems.length, 2, 'both the action and the licence reference are reported');
  assert.ok(problems.some((p) => /gitleaks-action/.test(p)));
  assert.ok(problems.some((p) => /GITLEAKS_LICENSE/.test(p)));
});

test('a scan without --exit-code 1 is rejected — a finding that is only a log line', () => {
  const advisory = ARMED.replace(' --exit-code 1', '');
  const problems = findDisarms(advisory);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /--exit-code 1/);
});

test('GITLEAKS_LICENSE inside a COMMENT is allowed — the guard must not fire on its own rationale', () => {
  const documented = ARMED.replace(
    'jobs:',
    '# The licence is gone on purpose: secrets.GITLEAKS_LICENSE is unreadable by Dependabot.\njobs:',
  );
  assert.deepEqual(findDisarms(documented), []);
});

test('two gitleaks commands are a hard error — the guard would exercise the wrong one', () => {
  const ambiguous = ARMED.replace(
    '        run: gitleaks dir . --no-banner --redact --exit-code 1',
    '        run: |\n          gitleaks dir . --exit-code 1\n          gitleaks dir docs --exit-code 1',
  );
  assert.throws(() => extractScanCommand(ambiguous), /found 2/);
});

test('a missing job is a hard error, never an empty pass', () => {
  assert.throws(() => findDisarms('jobs:\n  build:\n    runs-on: ubuntu-latest\n'), /not found/);
});

test('the planted credential is not a gitleaks stopword', () => {
  // The first version planted AKIAIOSFODNN7EXAMPLE, which gitleaks ignores by
  // design, and the guard passed having never seen the gate block. Pinning the
  // negation is cheaper than rediscovering it.
  assert.notEqual(plantedSecret(), 'AKIAIOSFODNN7EXAMPLE');
  assert.match(plantedSecret(), /^AKIA[A-Z0-9]{16}$/);
});

test('the real workflow satisfies the predicate', () => {
  const yamlText = readFileSync(join(findRepoRoot(), WORKFLOW), 'utf8');
  assert.deepEqual(findDisarms(yamlText), []);
  assert.match(extractScanCommand(yamlText), /^gitleaks dir \. .*--exit-code 1$/);
});
