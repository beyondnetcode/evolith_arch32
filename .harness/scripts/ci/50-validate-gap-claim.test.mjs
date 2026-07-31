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
  it('reads a claim from the title or the branch name', () => {
    assert.deepEqual(claimedIds({ title: 'fix(x): close GT-100' }), ['GT-100']);
    assert.deepEqual(claimedIds({ headRefName: 'docs/GT-104-rows' }), ['GT-104']);
    // This repository's branches are lowercase (`feat/gt-639-claim-guard`). A rule
    // that reads claims "from the branch name" and then only accepts `GT-` never
    // fires on a single real branch here.
    assert.deepEqual(claimedIds({ headRefName: 'feat/gt-103-thing' }), ['GT-103']);
  });

  it('does not claim the same id twice from one pull request', () => {
    assert.deepEqual(claimedIds({ title: 'GT-105', body: 'GT-105 again', headRefName: 'x/GT-105' }), ['GT-105']);
  });

  it('claims nothing when a pull request names no gap', () => {
    assert.deepEqual(claimedIds({ title: 'chore: tidy', body: '', headRefName: 'chore/tidy' }), []);
  });
});

describe('claimedIds — a mention in the body is not a claim', () => {
  // THE DEFECT, observed on run 30630343658: this repository's pull request bodies
  // cross-reference neighbouring gaps in nearly every paragraph, so a rule of "any
  // GT-* in the body" makes every cross-reference a hijack of that gap's number.

  it('OBSERVED: naming the CI job claims the job\'s gap', () => {
    // PR #321's body said this, and the guard contested GT-578 against #317.
    assert.deepEqual(claimedIds({ body: 'Wired into `Governance guards (GT-578)`' }), []);
  });

  it('OBSERVED: a cross-reference to a neighbouring gap claims nothing', () => {
    // PR #316, on GT-583: "that is **GT-583**, already in flight".
    assert.deepEqual(claimedIds({
      title: 'GT-582: serve the 2026-07-28 revision',
      body: 'the spec pins 2020-12 while this repo pins draft-07 — that is **GT-583**, already in flight',
    }), ['GT-582']);
  });

  it('plain prose references claim nothing', () => {
    assert.deepEqual(claimedIds({ body: 'refs GT-101 and GT-102' }), []);
    assert.deepEqual(claimedIds({ body: 'see GT-107 for the record' }), []);
    assert.deepEqual(claimedIds({ body: 'GT-602 introduced the rename-install' }), []);
  });

  it('OBSERVED: a marker mid-sentence describes someone ELSE\'s claim', () => {
    // The first version of THIS fix's pull request body said exactly this, and
    // claimed GT-644 — contesting it against the two PRs the sentence was about.
    assert.deepEqual(claimedIds({ body: 'Right now #321 and #323 both title-claim GT-644.' }), []);
    assert.deepEqual(claimedIds({ body: 'PR #316 closes GT-582, which is why this one does not.' }), []);
    // Opening a line, or a `;`-clause, is a claim. That is the difference.
    assert.deepEqual(claimedIds({ body: 'Some preamble.\n\n- [x] Closes GT-582' }), ['GT-582']);
  });

  it('a verb AFTER the id is prose, not a claim', () => {
    // PR #317: "`core-domain` reads 0 because GT-641 fixed it".
    assert.deepEqual(claimedIds({ body: 'core-domain reads 0 because GT-641 fixed it' }), []);
  });
});

describe('claimedIds — the explicit body markers', () => {
  // REGRESSION, not proof: these three pass against the OLD rule too, which claimed
  // every id in the body — including the ones after a marker. They pin the half of
  // the behaviour that had to SURVIVE the narrowing, and are labelled so the count
  // is not read as coverage of the fix. The seven that were observed red against the
  // old `claimedIds` are the two blocks above and the `THE FALSE POSITIVE` fixture.

  it('the closing keyword this repository actually writes', () => {
    assert.deepEqual(claimedIds({ body: 'Closes **GT-582** (P1, `MCP Server`).' }), ['GT-582']);
    assert.deepEqual(claimedIds({ body: 'Fixes GT-200.' }), ['GT-200']);
    assert.deepEqual(claimedIds({ body: 'Resolves `GT-201`' }), ['GT-201']);
  });

  it('`advances` is a claim — partial credit is still one session owning the row', () => {
    // PR #319: "Advances **GT-588** … criterion 1 explicitly NOT met".
    assert.deepEqual(claimedIds({ body: 'Advances **GT-588** (P2, complexity L).' }), ['GT-588']);
  });

  it('several ids after one marker, and several markers on one line', () => {
    assert.deepEqual(
      claimedIds({ body: 'Closes **GT-643**; advances **GT-583**. One commit each.' }),
      ['GT-583', 'GT-643'],
    );
    assert.deepEqual(claimedIds({ body: 'Closes **GT-591** and **GT-642**, one commit each.' }), ['GT-591', 'GT-642']);
    assert.deepEqual(claimedIds({ body: 'Claims: GT-583, GT-643' }), ['GT-583', 'GT-643']);
  });

  it('a marker inside a fenced block is quoted evidence, not a claim', () => {
    // This guard's own failure output names ids next to the word "claimed", and
    // these bodies paste it. Found while writing the pull request for this very
    // fix: its body quoted `Closes **GT-643**; advances **GT-583**` as an EXAMPLE
    // of the new syntax, and would have contested both ids against #320.
    assert.deepEqual(claimedIds({
      body: 'The marker looks like this:\n\n```\nCloses **GT-643**; advances **GT-583**\n```\n\nAnd that is all.',
    }), []);
    // The fence closes, so a claim after it still counts.
    assert.deepEqual(claimedIds({ body: '```\nCloses GT-900\n```\n\nCloses GT-901' }), ['GT-901']);
    // An inline code span is not a fence — people write `Closes \`GT-201\``.
    assert.deepEqual(claimedIds({ body: 'Closes `GT-201`' }), ['GT-201']);
  });

  it('the list stops at the first thing that is not an id', () => {
    assert.deepEqual(claimedIds({ body: 'Closes GT-700 and later, once GT-701 lands, the rest.' }), ['GT-700']);
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

  it('THE FALSE POSITIVE: one PR works the gap, another only cites it — GREEN', () => {
    // Run 30630343658, verbatim in shape: #320 works GT-583, #316 mentions it in a
    // paragraph explaining what it deliberately left out. Contesting those two
    // failed `Governance guards` for everyone, and the answer — "decide which PR
    // owns the id" — had no work to do, because only one of them ever wanted it.
    const { status, out } = runWith([
      {
        number: 320,
        title: 'GT-583 + GT-643: one registry generates the operation schemas',
        headRefName: 'feat/gt-583-643-generated-schemas',
        body: 'Closes **GT-643**; advances **GT-583**.',
      },
      {
        number: 316,
        title: 'GT-582: serve the 2026-07-28 revision alongside the one the SDK still speaks',
        headRefName: 'feat/gt-582-mcp-2026-07-28',
        body: 'the spec pins 2020-12 while this repo pins draft-07 — that is **GT-583**, already in flight',
      },
      {
        number: 321,
        title: 'GT-644: a policy may only call OPA builtins the shipped wasm runtime can execute',
        headRefName: 'feat/gt-wasm-builtin-guard',
        body: 'Wired into `Governance guards (GT-578)`.',
      },
    ]);
    assert.equal(status, 0, out);
    // And the mentions are still SAID, so nobody reads the narrow rule as coverage.
    assert.match(out, /mentioned, not claimed/);
    assert.match(out, /GT-578/);
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
