#!/usr/bin/env node

/**
 * GT-639 — fixtures for the gap-claim guard.
 *
 * The case that matters is the one this repository lived through: two open pull
 * requests working the same gap, neither aware of the other. If that fixture ever
 * goes green the guard is decoration — which is why GT-639's last criterion asks
 * for a fixture OBSERVED red rather than a guard someone believes works.
 *
 * The pull requests are supplied as data through `--fixture`, so nothing here
 * touches the network: the guard's core is pure by construction and the I/O edge
 * is one function.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { claimedIds, buildClaimMap, findContested } from './50-validate-gap-claim.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '50-validate-gap-claim.mjs');

let sandbox;
before(() => { sandbox = mkdtempSync(join(tmpdir(), 'gt639-')); });
after(() => { if (sandbox) rmSync(sandbox, { recursive: true, force: true }); });

const runWith = (prs, extra = []) => {
  const file = join(sandbox, `prs-${Math.abs(JSON.stringify(prs).length)}-${prs.length}.json`);
  writeFileSync(file, JSON.stringify(prs));
  const r = spawnSync(process.execPath, [GUARD, '--fixture', file, ...extra], {
    encoding: 'utf8', timeout: 60000,
  });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
};

describe('claimedIds', () => {
  it('reads a claim from the title, the body or the branch name', () => {
    assert.deepEqual(claimedIds({ title: 'fix(x): close GT-100' }), ['GT-100']);
    assert.deepEqual(claimedIds({ body: 'refs GT-101 and GT-102' }), ['GT-101', 'GT-102']);
    assert.deepEqual(claimedIds({ headRefName: 'feat/gt-103-thing' }), []); // lowercase is not an id
    assert.deepEqual(claimedIds({ headRefName: 'docs/GT-104-rows' }), ['GT-104']);
  });

  it('does not claim the same id twice from one pull request', () => {
    assert.deepEqual(claimedIds({ title: 'GT-105', body: 'GT-105 again', headRefName: 'x/GT-105' }), ['GT-105']);
  });

  it('claims nothing when a pull request names no gap', () => {
    assert.deepEqual(claimedIds({ title: 'chore: tidy', body: '', headRefName: 'chore/tidy' }), []);
  });
});

describe('findContested', () => {
  it('THE CASE: one id, two open pull requests', () => {
    const contested = findContested(buildClaimMap([
      { number: 1, title: 'fix: GT-200 via a capture script' },
      { number: 2, title: 'fix: GT-200 via an in-spec renderer' },
      { number: 3, title: 'docs: GT-201' },
    ]));
    assert.equal(contested.length, 1);
    assert.equal(contested[0].id, 'GT-200');
    assert.deepEqual(contested[0].prs.map((p) => p.number), [1, 2]);
  });

  it('one pull request claiming many ids is not contested', () => {
    assert.deepEqual(findContested(buildClaimMap([{ number: 1, title: 'GT-300 GT-301 GT-302' }])), []);
  });
});

describe('the guard end to end', () => {
  it('THE FIXTURE: two open PRs on one gap — RED, naming both', () => {
    const { status, out } = runWith([
      { number: 276, title: 'fix(standards): capture script', headRefName: 'claude/fervent', body: 'closes GT-640' },
      { number: 279, title: 'fix(standards): in-spec renderer for GT-640', headRefName: 'claude/nice-cohen', body: '' },
    ]);
    assert.equal(status, 1, out);
    assert.match(out, /1 gap id\(s\) are claimed by more than one open pull request/);
    assert.match(out, /#276/);
    assert.match(out, /#279/);
    // It must say why this is worth stopping for, and what to do.
    assert.match(out, /much cheaper to resolve now than after both have landed/);
    assert.match(out, /Decide which pull request owns the id/);
    // And it must not imply coverage it does not have.
    assert.match(out, /a branch with no open pull request claims nothing/);
  });

  it('distinct gaps across many PRs are green, and each claim is listed', () => {
    const { status, out } = runWith([
      { number: 10, title: 'GT-400', headRefName: 'a' },
      { number: 11, title: 'GT-401', headRefName: 'b' },
    ]);
    assert.equal(status, 0, out);
    assert.match(out, /ids claimed \.+ 2/);
    assert.match(out, /GT-400 — #10/);
  });

  it('says out loud when there is nothing to check', () => {
    // Zero open PRs is a legitimate state that looks identical to a broken query
    // unless it is named.
    const { status, out } = runWith([]);
    assert.equal(status, 0, out);
    assert.match(out, /No pull request is open, so nothing is claimed/);
  });

  it('--json reports the claim map and exits non-zero when contested', () => {
    const { status, out } = runWith(
      [{ number: 1, title: 'GT-500' }, { number: 2, title: 'GT-500' }],
      ['--json'],
    );
    assert.equal(status, 1, out);
    const payload = JSON.parse(out.trim().split('\n')[0]);
    assert.deepEqual(payload.contested, [{ id: 'GT-500', prs: [1, 2] }]);
  });
});

describe('anti-vacuous floor', () => {
  it('refuses to pass when the pull-request query cannot be answered', () => {
    // No --fixture, and `gh` unusable: the guard must fail rather than report a
    // clean run over a list it never got.
    const r = spawnSync(process.execPath, [GUARD], {
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, PATH: '/nonexistent' },
    });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    const out = `${r.stdout}\n${r.stderr}`;
    assert.match(out, /could not read the open pull requests/);
    assert.match(out, /Unable to answer is not the same as nothing to report/);
  });
});
