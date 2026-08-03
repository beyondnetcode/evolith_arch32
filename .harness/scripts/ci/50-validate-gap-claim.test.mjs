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
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  claimedIds,
  buildClaimMap,
  findContested,
  diffClaimedIds,
  claimsOf,
  findDivergences,
  renderClaimsMarkdown,
} from './50-validate-gap-claim.mjs';

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

  it('--claims-markdown renders a live board-readable table with PR and branch', () => {
    const { status, out } = runWith(
      [{
        number: 10,
        title: 'GT-501: close the thing',
        headRefName: 'feat/gt-501-close-the-thing',
        url: 'https://example.test/pull/10',
      }],
      ['--claims-markdown'],
    );
    assert.equal(status, 0, out);
    assert.match(out, /# Live In-Flight Gap Claims/);
    assert.match(
      out,
      /\| GT-501 \| \[#10\]\(https:\/\/example\.test\/pull\/10\) \| feat\/gt-501-close-the-thing \| declared \| claimed \|/,
    );
  });

  it('--claims-markdown keeps the guard red for contested claims', () => {
    const { status, out } = runWith(
      [
        { number: 10, title: 'GT-502', headRefName: 'feat/gt-502-a' },
        { number: 11, title: 'GT-502', headRefName: 'feat/gt-502-b' },
      ],
      ['--claims-markdown'],
    );
    assert.equal(status, 1, out);
    assert.match(out, /\| GT-502 \| #10 \| feat\/gt-502-a \| declared \| contested \|/);
    assert.match(out, /\| GT-502 \| #11 \| feat\/gt-502-b \| declared \| contested \|/);
  });

  it('renderClaimsMarkdown escapes table-breaking branch names', () => {
    const out = renderClaimsMarkdown([{ number: 12, title: 'GT-503', headRefName: 'feat/gt-503|pipe' }]);
    assert.match(out, /feat\/gt-503\\\|pipe/);
  });
});

// ---------------------------------------------------------------------------
// GT-645 — the DIFF half. A claim is what the change DID, not what it said.
// ---------------------------------------------------------------------------

const TRACKING = 'reference/core/control-center/gaps/gap-tracking.md';
const TRACKING_ES = 'reference/core/control-center/gaps/gap-tracking.es.md';
const CLOSURES = 'reference/core/control-center/evidence/gap-closure-evidence.json';

/** A board row in the shape `gap-tracking.md` really writes them. */
const row = (id, status, file = TRACKING) =>
  `| [\`${id}\`](./gap-reference-catalog${file === TRACKING_ES ? '.es' : ''}.md#${id.toLowerCase()}) | ` +
  `**Evidence prose that mentions nothing.** | \`Governance\` | Cross | P2 | M | \`${status}\` |`;

const fileDiff = (file, lines) =>
  [
    `diff --git a/${file} b/${file}`,
    'index 1111111..2222222 100644',
    `--- a/${file}`,
    `+++ b/${file}`,
    '@@ -20,8 +20,8 @@',
    ...lines,
  ].join('\n');

/** @param {Array<[string,string,string]>} flips [id, from, to] */
const boardDiff = (flips, file = TRACKING) =>
  fileDiff(file, flips.flatMap(([id, from, to]) => [`-${row(id, from, file)}`, `+${row(id, to, file)}`]));

/** Closure-evidence records ADDED by the diff. */
const closureDiff = (ids) =>
  fileDiff(
    CLOSURES,
    ids.flatMap((id) => [
      '+    {',
      `+      "id": "${id}",`,
      '+      "closedAt": "2026-07-30",',
      '+      "closureCommit": "abc1234",',
      '+    },',
    ]),
  );

/** A pull request that touches only source code — the ordinary case. */
const codeDiff = fileDiff('src/packages/core-domain/src/domain/gate-evidence.ts', [
  '-export const X = 1;',
  '+export const X = 2;',
]);

const THE_ELEVEN = ['GT-580', 'GT-587', 'GT-589', 'GT-597', 'GT-604', 'GT-606', 'GT-608', 'GT-614', 'GT-615', 'GT-616', 'GT-617'];

/**
 * PR #315, reproduced: no id in the title, none in the branch, eleven rows flipped
 * to DONE and eleven closure records written. Its body names the eleven in an
 * evidence table — a MENTION, which #324 correctly stopped reading as a claim.
 *
 * MEASURED, NOT ASSUMED, and one half came back different from the record. The
 * live #315 body was replayed through the merged implementation and it claims all
 * eleven, because that body happens to open a line with `**Closed:** GT-580, …` —
 * a marker clause. So #315 is the right SHAPE and the wrong instance: the row's
 * prediction that "under the narrowed rule it would claim nothing at all" does not
 * survive contact with its own body.
 *
 * The live instance is #326, replayed the same way: merged implementation
 * `ids claimed .. 1`, this one `ids claimed .. 9`. `PR_326` below is that case,
 * and it is the one that proves the class rather than the shape.
 */
const PR_315 = {
  number: 315,
  title: 'Board reconciliation: credit the eleven gaps this wave merged',
  headRefName: 'chore/reconcile-board-wave',
  body: [
    'The wave landed and the board never moved. This credits what merged.',
    '',
    '| gap | merged in |',
    '|---|---|',
    ...THE_ELEVEN.map((id, i) => `| \`${id}\` | #${300 + i} |`),
  ].join('\n'),
  diff: [
    boardDiff(THE_ELEVEN.map((id) => [id, 'IN-PROGRESS', 'DONE'])),
    boardDiff(THE_ELEVEN.map((id) => [id, 'EN-PROGRESO', 'COMPLETADO']), TRACKING_ES),
    closureDiff(THE_ELEVEN),
  ].join('\n'),
};

/**
 * PR #326, the instance run 30633517559 measured: it declares GT-645 (title,
 * branch and a marker), registers that row, and flips EIGHT other rows plus six
 * closure records that its body only cites. The merged implementation read one
 * claim from it and exited ✓ — a green check on a pull request that resolved six
 * rows and claimed none of them.
 */
const PR_326_WORKED = ['GT-582', 'GT-583', 'GT-584', 'GT-588', 'GT-591', 'GT-642', 'GT-643', 'GT-644'];
const PR_326 = {
  number: 326,
  title: 'Board reconciliation for this wave, and GT-645 registered',
  headRefName: 'chore/gt-645-board-reconciliation',
  body: [
    'Closes **GT-645** — the row this registers.',
    '',
    'Everything else here is the wave being credited, and is cited, not claimed:',
    ...PR_326_WORKED.map((id) => `- \`${id}\` landed earlier in the wave.`),
  ].join('\n'),
  diff: [
    boardDiff(PR_326_WORKED.map((id) => [id, 'IN-PROGRESS', 'DONE'])),
    fileDiff(TRACKING, [`+${row('GT-645', 'PENDING')}`]),
    closureDiff(PR_326_WORKED.slice(0, 6)),
  ].join('\n'),
};

describe('diffClaimedIds — the diff is the record of what was worked', () => {
  it('THE LIVE FALSE NEGATIVE (PR #326, run 30633517559): one claim declared, nine worked', () => {
    // Replayed against the real pull request, the merged implementation prints
    // `ids claimed .. 1` and exits ✓. The eight rows it flipped were invisible.
    assert.deepEqual(claimedIds(PR_326), ['GT-645']);
    assert.deepEqual(claimsOf(PR_326).all, [...PR_326_WORKED, 'GT-645'].sort());
  });

  it('THE FIXTURE (PR #315): eleven rows flipped and eleven closures, zero ids in title or branch', () => {
    // Observed red before the fix: the merged implementation reads title, branch and
    // marker clauses only, so this pull request — the one that moved the board most
    // in its wave — claimed NOTHING.
    assert.deepEqual(claimedIds(PR_315), [], 'prose alone still claims nothing — that is #324 working');
    assert.deepEqual(diffClaimedIds(PR_315.diff).ids, THE_ELEVEN);
    assert.deepEqual(claimsOf(PR_315).all, THE_ELEVEN);
  });

  it('a row whose STATUS did not change is not a claim', () => {
    // Rewriting a row's evidence prose is editorial work on the board, not work on
    // the gap. Only the status cell moving counts.
    const diff = fileDiff(TRACKING, [
      `-| [\`GT-700\`](./gap-reference-catalog.md#gt-700) | **Old prose.** | \`Governance\` | Cross | P2 | M | \`PENDING\` |`,
      `+| [\`GT-700\`](./gap-reference-catalog.md#gt-700) | **New prose, same status.** | \`Governance\` | Cross | P2 | M | \`PENDING\` |`,
    ]);
    assert.deepEqual(diffClaimedIds(diff).ids, []);
  });

  it('a row the diff ADDS is a claim — registering a gap is allocating its id', () => {
    assert.deepEqual(diffClaimedIds(fileDiff(TRACKING, [`+${row('GT-701', 'PENDING')}`])).ids, ['GT-701']);
  });

  it('a closure record the diff adds is a claim; one it merely moves is not', () => {
    assert.deepEqual(diffClaimedIds(closureDiff(['GT-702'])).ids, ['GT-702']);
    const moved = fileDiff(CLOSURES, ['-      "id": "GT-703",', '+      "id": "GT-703",']);
    assert.deepEqual(diffClaimedIds(moved).ids, []);
  });

  it('a diff that touches no board file claims nothing and reports the board untouched', () => {
    const d = diffClaimedIds(codeDiff);
    assert.deepEqual(d.ids, []);
    assert.equal(d.boardTouched, false);
  });

  it('a `GT-*` in the diff of ordinary source is not a claim', () => {
    // Comments cite gap ids constantly ("GT-639 — two sessions must not…"). The claim
    // comes from a board ROW or a closure RECORD, never from a gap id in a patch.
    const d = diffClaimedIds(fileDiff('src/x.ts', ['+// GT-999 — this is why', '-// nothing']));
    assert.deepEqual(d.ids, []);
  });

  it('an absent diff is not an empty diff', () => {
    // A fixture that supplies no diff carries no diff information. Reporting it as
    // "the diff claims nothing" would be the vacuous pass this repository keeps
    // finding, one layer down.
    assert.equal(claimsOf({ title: 'GT-800' }).diffKnown, false);
    assert.equal(claimsOf({ title: 'GT-800', diff: '' }).diffKnown, true);
  });
});

describe('the diff half, end to end', () => {
  it('THE FIXTURE (PR #315) through the guard: eleven claims where there were none', () => {
    const { status, out } = runWith([PR_315], ['--json']);
    assert.equal(status, 0, out);
    const payload = JSON.parse(out.trim().split('\n')[0]);
    assert.deepEqual(Object.keys(payload.claims).sort(), THE_ELEVEN);
    for (const id of THE_ELEVEN) assert.deepEqual(payload.claims[id], [315]);
    // And it says WHERE each claim came from, so a reader can check it.
    assert.deepEqual(payload.claimSources['GT-580'], [{ number: 315, prose: false, diff: true }]);
  });

  it('THE FALSE POSITIVE (run 30631939629): documenting six gaps claims none of them', () => {
    // #324's body names GT-578, GT-582, GT-583, GT-588, GT-591 and GT-602 in an
    // evidence table and claims not one. The guard contested three of them against
    // #320 — nine attributions whose honest count was zero. Its diff touches the
    // guard's own source and no board row, so neither half of the check may claim.
    const { status, out } = runWith(
      [
        {
          number: 324,
          title: 'fix(ci): a mention is not a claim',
          headRefName: 'fix/claim-guard-prose-mentions',
          body: [
            'Run `30630343658` failed three times over. None of them was real:',
            '',
            '| contested | worked it | only cited it |',
            '|---|---|---|',
            '| GT-583 | #320 | #316 |',
            '| GT-602 | #320 | #317 |',
            '| GT-578 | — | #321, naming the job `Governance guards (GT-578)` |',
            '| GT-582 | #316 | — |',
            '| GT-588 | #319 | — |',
            '| GT-591 | #317 | — |',
            '',
            'This body names six gaps and claims none of them.',
          ].join('\n'),
          diff: codeDiff,
        },
        {
          number: 320,
          title: 'GT-583 + GT-643: one registry generates the operation schemas',
          headRefName: 'feat/gt-583-643-generated-schemas',
          body: 'Closes **GT-643**; advances **GT-583**.',
          diff: codeDiff,
        },
      ],
      ['--json'],
    );
    assert.equal(status, 0, out);
    const payload = JSON.parse(out.trim().split('\n')[0]);
    assert.deepEqual(payload.contested, []);
    assert.deepEqual(Object.keys(payload.claims).sort(), ['GT-583', 'GT-643']);
    assert.deepEqual(payload.claims['GT-583'], [320]);
    assert.deepEqual(payload.divergent, []);
  });

  it('a diff-only claim makes a contest the prose rule could not see', () => {
    // Two pull requests on one gap, one of which never says the id out loud. Under
    // the prose rule this is a clean run; the duplicated work lands anyway.
    const { status, out } = runWith([
      { number: 1, title: 'fix: close it properly', headRefName: 'chore/board', body: 'GT-900 is done.', diff: closureDiff(['GT-900']) },
      { number: 2, title: 'fix(x): GT-900 for real', headRefName: 'feat/gt-900', body: '', diff: codeDiff },
    ]);
    assert.equal(status, 1, out);
    assert.match(out, /GT-900/);
    assert.match(out, /claimed by more than one open pull request/);
  });
});

describe('prose and diff disagreeing is its own finding', () => {
  it('a body claiming an id its board edits do not touch is REPORTED, not resolved', () => {
    const { status, out } = runWith([
      {
        number: 40,
        title: 'Closes GT-910',
        headRefName: 'feat/gt-910',
        body: 'Closes GT-910.',
        diff: boardDiff([['GT-911', 'PENDING', 'DONE']]),
      },
    ]);
    assert.equal(status, 1, out);
    assert.match(out, /PROSE AND DIFF DISAGREE/);
    // BOTH directions are named, and neither is silently preferred.
    assert.match(out, /GT-910/);
    assert.match(out, /GT-911/);
  });

  it('a diff touching a row the body never names is REPORTED', () => {
    const { status, out } = runWith([
      {
        number: 41,
        title: 'chore: tidy the board',
        headRefName: 'chore/tidy',
        body: 'Nothing to see here.',
        diff: boardDiff([['GT-912', 'PENDING', 'DONE']]),
      },
    ]);
    assert.equal(status, 1, out);
    assert.match(out, /GT-912/);
    assert.match(out, /PROSE AND DIFF DISAGREE/);
  });

  it('the ordinary case is QUIET: a title claim whose diff is source code only', () => {
    // The anti-noise rule. Most pull requests close a gap by changing code and never
    // touch the board — a guard that called every one of those a disagreement would
    // fire on the normal case, and #324 is the record of what happens then.
    const { status, out } = runWith([
      { number: 42, title: 'GT-913: fix the thing', headRefName: 'feat/gt-913', body: 'Closes GT-913.', diff: codeDiff },
    ]);
    assert.equal(status, 0, out);
    assert.doesNotMatch(out, /disagree/i);
  });

  it('GT-464: correcting a row DESCRIPTION without moving its status is not a disagreement', () => {
    // The false positive this narrowing removes. GT-464's row said the two alerts "do
    // not exist yet"; delivering them made that sentence false while the status
    // legitimately stayed DEFERRED, because the row's other criterion needs a cluster.
    // The old rule armed on "a board file was opened", so the only ways to quiet it
    // were to leave a lie on the board or to fake a status move.
    const stale = row('GT-914', 'DEFERRED').replace('mentions nothing', 'says the alerts do not exist yet');
    const fixed = row('GT-914', 'DEFERRED').replace('mentions nothing', 'says the alerts now exist');
    const { status, out } = runWith([
      {
        number: 43,
        title: 'feat(ops): the two GT-914 alerts',
        headRefName: 'feat/gt-914-alerts',
        body: 'Advances GT-914 criterion 1.',
        diff: fileDiff(TRACKING, [`-${stale}`, `+${fixed}`]),
      },
    ]);
    assert.equal(status, 0, out);
    assert.doesNotMatch(out, /disagree/i);
  });

  it('GT-464: the narrowing does NOT let an OVERCLAIM through', () => {
    // The negative direction, and the reason the flag became `statusChanges || closures`
    // instead of being dropped. Dropping it would look like it worked — the mismatch
    // tests all still pass, because they are caught by the DIFF side, which never
    // consulted this flag. The case that separates the two is an overclaim: both ids
    // are named, so the diff side is silent, and only the prose side can see that one
    // of the two rows never moved.
    const { status, out } = runWith([
      {
        number: 44,
        title: 'Closes GT-915 and GT-916',
        headRefName: 'feat/gt-915',
        body: 'Closes GT-915 and GT-916.',
        diff: boardDiff([['GT-916', 'PENDING', 'DONE']]),
      },
    ]);
    assert.equal(status, 1, out);
    assert.match(out, /PROSE AND DIFF DISAGREE/);
    assert.match(out, /do not touch: GT-915/);
  });

  it('a body that NAMES the id its diff worked is agreement, not divergence', () => {
    // PR #315 again: it mentions all eleven. Mentioning is not claiming, but it is
    // also not silence — there is nothing here for a human to adjudicate.
    const { status, out } = runWith([PR_315]);
    assert.equal(status, 0, out);
    assert.doesNotMatch(out, /disagree/i);
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

  it('refuses to pass when a pull request LISTS but its diff cannot be read', () => {
    // The half GT-645 adds needs the same floor as the half GT-639 built. A `gh`
    // that can answer `pr list` and not `pr diff` — a token scoped to metadata, a
    // patch too large — must not silently degrade to checking the prose alone,
    // because prose-alone IS the defect.
    const bin = join(sandbox, 'bin-listonly');
    mkdirSync(bin, { recursive: true });
    const shim = join(bin, 'gh');
    writeFileSync(
      shim,
      '#!/bin/sh\n' +
        'if [ "$2" = "list" ]; then\n' +
        '  echo \'[{"number":7,"title":"chore: tidy","body":"","headRefName":"chore/tidy"}]\'\n' +
        '  exit 0\n' +
        'fi\n' +
        'exit 1\n',
    );
    chmodSync(shim, 0o755);

    const r = spawnSync(process.execPath, [GUARD], {
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, PATH: bin },
    });
    const out = `${r.stdout}\n${r.stderr}`;
    assert.equal(r.status, 1, out);
    assert.match(out, /could not read the diff of 1 open pull request/);
    assert.match(out, /#7/);
  });
});
