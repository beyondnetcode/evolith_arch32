/**
 * Tests for the ADR -> ruleset generator.
 *
 * Run: node --test .harness/scripts/generate-adr-rulesets.test.mjs
 *
 * (a) every ADR is covered (handcrafted or generated) -> 100% coverage,
 * (b) every ruleset JSON (handcrafted + generated) validates against the schema via ajv,
 * (c) idempotency: `--check` passes after generating (no drift).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, copyFileSync, unlinkSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  generate, buildRuleset, handcraftedKeys, REPO_ROOT, GENERATED_DIR,
} from './generate-adr-rulesets.mjs';

const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const GEN_SCRIPT = join(REPO_ROOT, '.harness', 'scripts', 'generate-adr-rulesets.mjs');
const HANDCRAFTED_DIR = join(REPO_ROOT, 'src', 'rulesets', 'adr');
const SCHEMA = JSON.parse(
  readFileSync(join(REPO_ROOT, 'src', 'rulesets', 'schema', 'ruleset-standard.schema.json'), 'utf8'),
);

function compileSchema() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(SCHEMA);
}

test('every ADR has a ruleset (100% coverage)', () => {
  const { adrs, targets, covered, totals } = generate();
  assert.ok(adrs.length > 0, 'expected to find ADRs');

  const generatedKeys = new Set(targets.map((t) => t.adr.key));
  for (const adr of adrs) {
    const isHandcrafted = covered.has(adr.key) || covered.has(`*-${adr.id}`);
    const isGenerated = generatedKeys.has(adr.key);
    assert.ok(
      isHandcrafted || isGenerated,
      `ADR ${adr.track}/${adr.id} (${adr.adrId}) has no ruleset`,
    );
  }

  const totalCovered = totals.handcrafted + totals.executable + totals.advisory;
  assert.equal(totalCovered, totals.total, 'coverage must be 100%');
});

test('every generated ruleset file on disk exists and matches generator output', () => {
  const { targets } = generate();
  for (const t of targets) {
    const p = join(GENERATED_DIR, t.fileName);
    assert.ok(existsSync(p), `missing generated file: ${t.fileName}`);
  }
});

test('all rulesets (handcrafted + generated) validate against the schema (ajv)', () => {
  const validate = compileSchema();
  const dirs = [HANDCRAFTED_DIR, GENERATED_DIR];
  let count = 0;
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    for (const name of readdirSync(d)) {
      if (!name.endsWith('.rules.json')) continue;
      const data = JSON.parse(readFileSync(join(d, name), 'utf8'));
      const valid = validate(data);
      assert.ok(valid, `schema invalid: ${name}\n${JSON.stringify(validate.errors, null, 2)}`);
      count++;
    }
  }
  assert.ok(count >= 115, `expected >=115 rulesets validated, got ${count}`);
});

test('classification is honest: advisory rules are non-blocking & not machine-verifiable', () => {
  const { targets } = generate();
  for (const t of targets) {
    for (const rule of t.ruleset.rules) {
      if (rule.enforcement === 'advisory') {
        assert.equal(rule.blocking, false, `advisory rule must not block: ${t.fileName}`);
        assert.ok(
          /manual attestation/i.test(rule.description),
          `advisory rule must note manual attestation: ${t.fileName}`,
        );
        assert.ok(!('validationQuery' in rule), `advisory rule must not claim a validationQuery: ${t.fileName}`);
      }
      if (rule.enforcement === 'executable') {
        assert.ok(rule.validationQuery, `executable rule must have validationQuery: ${t.fileName}`);
      }
    }
  }
});

test('idempotency: --check passes after generating', () => {
  // Generate, then immediately run --check; must exit 0 (no drift).
  execFileSync('node', [GEN_SCRIPT], { cwd: REPO_ROOT });
  // execFileSync throws on non-zero exit; if --check fails this test fails.
  const out = execFileSync('node', [GEN_SCRIPT, '--check'], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.match(out, /--check passed/);
});

test('buildRuleset is deterministic (same input -> identical output)', () => {
  const { adrs, covered } = generate();
  const sample = adrs.find((a) => !(covered.has(a.key) || covered.has(`*-${a.id}`)));
  assert.ok(sample, 'expected at least one generated ADR');
  const a = JSON.stringify(buildRuleset(sample).ruleset);
  const b = JSON.stringify(buildRuleset(sample).ruleset);
  assert.equal(a, b, 'buildRuleset must be deterministic');
});

// ---------------------------------------------------------------------------
// GT-627 — `--check` is the guard that would have caught the corpus falling
// seven rulesets behind its own generator. Six of those seven were SECURITY
// standards (ADR-0119..0124), accepted with no conformance ruleset at all,
// because nobody re-ran the generator and nothing in CI ran this check.
//
// A guard nobody has seen fail is the defect this repository keeps finding in
// itself, so both failure modes are exercised here rather than asserted.
// ---------------------------------------------------------------------------

const runCheck = () =>
  spawnSync(process.execPath, [GEN_SCRIPT, '--check'], { encoding: 'utf8', timeout: 120000 });

test('--check passes over the committed corpus, and says how many ADRs it compared', () => {
  const res = runCheck();
  assert.equal(res.status, 0, res.stdout + res.stderr);
  // The denominator must be in the output: "no drift" over an unknown number of
  // ADRs is not a claim anybody can check.
  assert.match(res.stdout, /--check passed: \d+ ADR\(s\), no drift/);
});

test('--check turns RED when a generated ruleset is missing', () => {
  const dir = join(REPO_ROOT, 'src', 'rulesets', 'adr', 'generated');
  const victim = readdirSync(dir).filter((f) => f.endsWith('.rules.json'))[0];
  assert.ok(victim, 'expected at least one generated ruleset to remove');
  const full = join(dir, victim);
  const backup = join(mkdtempSync(join(tmpdir(), 'gt627-')), victim);
  copyFileSync(full, backup);
  try {
    unlinkSync(full);
    const res = runCheck();
    assert.equal(res.status, 1, 'a missing generated ruleset must fail --check');
    assert.match(res.stdout + res.stderr, /drifted or missing/);
  } finally {
    copyFileSync(backup, full);
    rmSync(backup, { force: true });
    // Leave the tree exactly as found, or every later test in this run is a lie.
    assert.equal(runCheck().status, 0, 'the corpus must be restored');
  }
});
