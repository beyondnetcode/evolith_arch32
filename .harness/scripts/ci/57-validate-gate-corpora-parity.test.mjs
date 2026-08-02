#!/usr/bin/env node
/**
 * Self-tests for `57-validate-gate-corpora-parity.mjs`.
 *
 * All but two are NEGATIVE. A guard that has only ever been seen to pass is indistinguishable
 * from one that is broken, and this repository has paid for that confusion more than once.
 *
 * Two tests are about the guard NOT firing, and they matter as much: the two corpora spell
 * `schemaRef` relative to their own depth, so a verbatim string comparison would report a
 * difference that is not one — and a guard that cries wolf gets silenced, which is worse than
 * no guard. The last one refuses the empty-repository pass.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, '57-validate-gate-corpora-parity.mjs');

/**
 * Build a throwaway repository holding both corpora and run the guard inside it.
 * `evaluator` and `served` are `[{ phase, artifacts: [{ artifact, schemaRef?, producedBy? }] }]`.
 */
function runIn(evaluator, served) {
  const root = mkdtempSync(join(tmpdir(), 'gate-parity-'));
  try {
    mkdirSync(join(root, 'reference/governance/sdlc/gates'), { recursive: true });
    mkdirSync(join(root, 'src/rulesets/sdlc'), { recursive: true });
    mkdirSync(join(root, '.harness/scripts/ci'), { recursive: true });
    copyFileSync(GUARD, join(root, '.harness/scripts/ci/guard.mjs'));

    for (const g of evaluator) {
      writeFileSync(
        join(root, `reference/governance/sdlc/gates/gate-f${g.phase}.json`),
        JSON.stringify({ id: `gate-f${g.phase}`, phase: `f${g.phase}`, requiredArtifacts: g.artifacts }),
      );
    }
    writeFileSync(
      join(root, 'src/rulesets/sdlc/phase-gates.rules.json'),
      JSON.stringify({ gates: served.map((g) => ({ phase: g.phase, mandatoryEvidence: g.artifacts })) }),
    );

    try {
      const out = execFileSync(process.execPath, ['.harness/scripts/ci/guard.mjs'], {
        cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { code: 0, out };
    } catch (err) {
      return { code: err.status ?? 1, out: `${err.stdout ?? ''}${err.stderr ?? ''}` };
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const PRD = { artifact: 'PRD', schemaRef: 'src/rulesets/schema/prd.schema.json' };
const PRD_RELATIVE = { artifact: 'PRD', schemaRef: '../schema/prd.schema.json' };

test('identical corpora pass', () => {
  const r = runIn([{ phase: 1, artifacts: [PRD] }], [{ phase: 1, artifacts: [PRD] }]);
  assert.equal(r.code, 0, r.out);
});

test('the same schema spelled at two depths is NOT a difference', () => {
  // The whole reason the comparison is by basename. Both paths resolve to the same file from
  // their own file's location; flagging this would train everyone to ignore the guard.
  const r = runIn([{ phase: 1, artifacts: [PRD] }], [{ phase: 1, artifacts: [PRD_RELATIVE] }]);
  assert.equal(r.code, 0, r.out);
});

test('a schema wired in one copy and not the other fails', () => {
  // The exact shape found on 2026-08-02: #378 wired four schemas into the evaluator's copy and
  // none of them reached the copy served over HTTP.
  const r = runIn(
    [{ phase: 1, artifacts: [PRD] }],
    [{ phase: 1, artifacts: [{ artifact: 'PRD' }] }],
  );
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /schema differs/);
});

test('two different schemas for one artifact fail', () => {
  const r = runIn(
    [{ phase: 1, artifacts: [PRD] }],
    [{ phase: 1, artifacts: [{ artifact: 'PRD', schemaRef: '../schema/other.schema.json' }] }],
  );
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /schema differs/);
});

test('a tool-output declaration in one copy only fails', () => {
  const r = runIn(
    [{ phase: 3, artifacts: [{ artifact: 'CI Pipeline', producedBy: { format: 'provider-native' } }] }],
    [{ phase: 3, artifacts: [{ artifact: 'CI Pipeline' }] }],
  );
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /tool output/);
});

test('an artifact served but never evaluated fails', () => {
  const r = runIn(
    [{ phase: 1, artifacts: [PRD] }],
    [{ phase: 1, artifacts: [PRD, { artifact: 'Invented Artifact' }] }],
  );
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /never evaluated/);
});

test('an artifact evaluated but never served fails', () => {
  const r = runIn(
    [{ phase: 1, artifacts: [PRD, { artifact: 'Discovery Canvas' }] }],
    [{ phase: 1, artifacts: [PRD] }],
  );
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /never served/);
});

test('two empty corpora do NOT pass', () => {
  // Zero compared is the shape every vacuous guard takes. It must be a failure, not a tick.
  const r = runIn([{ phase: 1, artifacts: [] }], [{ phase: 1, artifacts: [] }]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /Zero artifacts compared/);
});
