#!/usr/bin/env node

/**
 * GT-630 — negative fixtures for the derived-artifact order guard.
 *
 * The defect this guard exists for is subtle and cost three red required checks
 * in one day: every artifact passes its own `--check`, and the composite is still
 * wrong, because a downstream artifact was generated before its input settled.
 *
 * So the case that matters here is the one where **each link is individually
 * current and the chain is still not at a fixed point**. If that test ever goes
 * green for the wrong reason, the guard is decoration.
 */

import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '46-validate-derived-artifact-order.mjs');

let sandbox;
before(() => { sandbox = mkdtempSync(join(tmpdir(), 'gt630-')); });
after(() => { if (sandbox) rmSync(sandbox, { recursive: true, force: true }); });

const run = (root, extra = []) => {
  const r = spawnSync(process.execPath, [GUARD, '--root', root, ...extra], {
    encoding: 'utf8', timeout: 120000,
  });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
};

test('the real repository is current and at a fixed point', () => {
  const { status, out } = run(resolve(__dirname, '../../..'));
  assert.equal(status, 0, out);
  assert.match(out, /at a fixed point/);
  assert.match(out, /links declared \.+ 2/);
});

test('the guard leaves the real tree byte-identical', () => {
  // The fixed-point pass regenerates in place. If it did not restore exactly, it
  // would "fix" the very drift it is meant to report — and every later run would
  // pass for the wrong reason.
  const repo = resolve(__dirname, '../../..');
  const artifacts = [
    'reference/core/control-center/maturity-reports/maturity-reconciliation.json',
    'reference/core/control-center/maturity-reports/executive-summary.md',
    'reference/core/control-center/maturity-reports/executive-summary.es.md',
  ];
  const before = artifacts.map((a) => readFileSync(join(repo, a)));
  run(repo);
  artifacts.forEach((a, i) => {
    assert.ok(readFileSync(join(repo, a)).equals(before[i]), `${a} was left modified`);
  });
});

// --- the shape of the declaration itself ------------------------------------

describe('chain declaration (anti-vacuous)', () => {
  const fixture = (name, files) => {
    const root = join(sandbox, name);
    for (const [rel, body] of Object.entries(files)) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), body);
      if (rel.endsWith('.mjs')) chmodSync(join(root, rel), 0o755);
    }
    return root;
  };

  it('refuses a root whose declared producer does not exist', () => {
    const root = fixture('no-producer', { 'placeholder.txt': 'x' });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /declared producer does not exist/);
    // The message must point at the declaration, not invite deleting the link.
    assert.match(out, /fix the declaration rather than deleting the link/);
  });

  it('refuses a root where a declared artifact is missing', () => {
    // Producers present, artifact absent: the chain describes something that is
    // not there, and a "pass" would mean nothing was compared.
    const root = fixture('no-artifact', {
      '.harness/scripts/ci/09-reconcile-maturity.mjs': 'process.exit(0)\n',
      '.harness/scripts/generate-executive-summary.mjs': 'process.exit(0)\n',
      'reference/core/control-center/gaps/gap-tracking.md': '# board\n',
      'reference/core/control-center/maturity-reports/maturity-assessment.md': '# a\n',
    });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /declared artifact is missing/);
  });
});

// --- the two failures the guard exists to tell apart -------------------------

describe('stale versus out-of-order', () => {
  /**
   * A miniature repository with the same SHAPE as the real chain: a reconciler
   * that copies a counter out of the board, and a summary that copies it out of
   * the reconciliation. `--check` on each compares its own output to what it
   * would write now.
   */
  const miniRepo = (name, { boardCount, reconCount, summaryCount }) => {
    const root = join(sandbox, name);
    const w = (rel, body) => {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), body);
    };
    w('reference/core/control-center/gaps/gap-tracking.md', `count: ${boardCount}\n`);
    w('reference/core/control-center/maturity-reports/maturity-assessment.md', '# assessment\n');
    w('reference/core/control-center/maturity-reports/maturity-reconciliation.json', `{"count":${reconCount}}\n`);
    w('reference/core/control-center/maturity-reports/executive-summary.md', `summary count: ${summaryCount}\n`);
    w('reference/core/control-center/maturity-reports/executive-summary.es.md', `resumen count: ${summaryCount}\n`);

    w('.harness/scripts/ci/09-reconcile-maturity.mjs', `
import fs from 'node:fs';
const root = process.cwd();
const board = fs.readFileSync(root + '/reference/core/control-center/gaps/gap-tracking.md', 'utf8');
const n = Number(board.match(/count: (\\d+)/)[1]);
const out = root + '/reference/core/control-center/maturity-reports/maturity-reconciliation.json';
const next = JSON.stringify({ count: n }) + '\\n';
if (process.argv.includes('--check')) {
  process.exit(fs.readFileSync(out, 'utf8') === next ? 0 : 1);
}
fs.writeFileSync(out, next);
`);
    w('.harness/scripts/generate-executive-summary.mjs', `
import fs from 'node:fs';
const root = process.cwd();
const dir = root + '/reference/core/control-center/maturity-reports/';
const n = JSON.parse(fs.readFileSync(dir + 'maturity-reconciliation.json', 'utf8')).count;
const en = 'summary count: ' + n + '\\n', es = 'resumen count: ' + n + '\\n';
if (process.argv.includes('--check')) {
  const ok = fs.readFileSync(dir + 'executive-summary.md', 'utf8') === en
          && fs.readFileSync(dir + 'executive-summary.es.md', 'utf8') === es;
  process.exit(ok ? 0 : 1);
}
fs.writeFileSync(dir + 'executive-summary.md', en);
fs.writeFileSync(dir + 'executive-summary.es.md', es);
`);
    return root;
  };

  it('passes when the chain really was run in order', () => {
    const root = miniRepo('in-order', { boardCount: 7, reconCount: 7, summaryCount: 7 });
    const { status, out } = run(root);
    assert.equal(status, 0, out);
    assert.match(out, /at a fixed point/);
  });

  it('names the FIRST stale link, and the inputs it must wait for', () => {
    // The board moved and nothing was regenerated: ordinary staleness. The guard
    // must stop at the reconciliation, not blame the summary downstream of it.
    const root = miniRepo('stale-upstream', { boardCount: 9, reconCount: 7, summaryCount: 7 });
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /maturity reconciliation is STALE \(link 1 of 2\)/);
    assert.match(out, /Stopping at the FIRST stale link on purpose/);
    assert.doesNotMatch(out, /executive governance summary is STALE/);
  });

  it('THE defect: every link is individually current, and the chain is still wrong', () => {
    // The exact mistake this guard was written for, reproduced. The summary was
    // generated FIRST, against the old reconciliation, and only then was the
    // reconciliation refreshed. Both `--check` calls now pass — the summary
    // matches what it would write from the value it read — and the composite is
    // still not what running the chain in order produces.
    const root = miniRepo('out-of-order', { boardCount: 9, reconCount: 9, summaryCount: 7 });

    // Prove the premise rather than assume it: currency alone says nothing.
    const currency = run(root, ['--no-fixed-point']);
    assert.equal(currency.status, 1, 'the mini-repo must have a genuinely stale summary for this fixture');

    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /executive governance summary/);
  });

  it('the fixed point catches a NON-DETERMINISTIC generator, which currency cannot', () => {
    // Worth stating plainly, because it bounds what this guard is worth: with
    // deterministic generators, currency-in-order already subsumes the fixed
    // point — if every link matches what it would write now, replaying changes
    // nothing. The fixed point earns its place on the OTHER failure: a generator
    // whose output does not depend only on its declared inputs. Then `--check`
    // passes against whatever was last written, and only a replay disagrees.
    const root = miniRepo('nondeterministic', { boardCount: 7, reconCount: 7, summaryCount: 7 });
    writeFileSync(join(root, '.harness/scripts/generate-executive-summary.mjs'), `
import fs from 'node:fs';
const root = process.cwd();
const dir = root + '/reference/core/control-center/maturity-reports/';
const n = JSON.parse(fs.readFileSync(dir + 'maturity-reconciliation.json', 'utf8')).count;
// The defect: an undeclared input. A run counter nobody listed in \`consumes\`.
const counterFile = root + '/.harness/runs.txt';
let runs = 0;
try { runs = Number(fs.readFileSync(counterFile, 'utf8')); } catch {}
// Increment BEFORE stamping, so a --check straight after a write agrees with
// itself: the artifact and the counter must describe the same run.
if (!process.argv.includes('--check')) { runs += 1; fs.writeFileSync(counterFile, String(runs)); }
const en = 'summary count: ' + n + ' run ' + runs + '\\n';
const es = 'resumen count: ' + n + ' run ' + runs + '\\n';
if (process.argv.includes('--check')) {
  const ok = fs.readFileSync(dir + 'executive-summary.md', 'utf8') === en
          && fs.readFileSync(dir + 'executive-summary.es.md', 'utf8') === es;
  process.exit(ok ? 0 : 1);
}
fs.writeFileSync(dir + 'executive-summary.md', en);
fs.writeFileSync(dir + 'executive-summary.es.md', es);
`);
    // Bring it to a state where BOTH links are individually current.
    spawnSync(process.execPath, [join(root, '.harness/scripts/generate-executive-summary.mjs')], { cwd: root });
    const currency = run(root, ['--no-fixed-point']);
    assert.equal(currency.status, 0, `premise: both links must be current\n${currency.out}`);

    // The replay moves the undeclared counter, so the artifact differs.
    const { status, out } = run(root);
    assert.equal(status, 1, out);
    assert.match(out, /differ after replaying the chain IN ORDER/);
    assert.match(out, /Fix by regenerating in the declared order/);
    assert.match(out, /1\. node \.harness\/scripts\/ci\/09-reconcile-maturity\.mjs/);
  });
});
