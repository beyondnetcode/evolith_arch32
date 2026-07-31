#!/usr/bin/env node

/**
 * GT-639 — two sessions must not work the same gap without knowing.
 *
 * ## The defect
 *
 * On 2026-07-30 the same work was done twice, three separate times, by sessions
 * that could not see each other: GT-640 (then GT-633) was fixed by a standalone
 * capture script on `main` and by an independent in-spec renderer on `develop`;
 * the evidence guard's parser was fixed on both branches; and a GT id was
 * allocated twice. The cost was not the merge conflict — it was the duplicated
 * work before anyone reached it, plus a reconciliation that introduced a defect
 * of its own.
 *
 * A board row carries a STATUS but not who is working it or where. Two sessions
 * can both read `GT-640 · PENDING` and both start, correctly.
 *
 * ## What it checks
 *
 * The claim set is DERIVED from open pull requests — never hand-written, because
 * a hand-written claim is stale in the direction that matters (someone forgets to
 * remove it, and the next session works around a claim nobody holds).
 *
 * An id claimed by MORE THAN ONE open pull request is a contested claim, and this
 * guard fails naming both claimants.
 *
 * ## A MENTION IS NOT A CLAIM
 *
 * The first version read a claim from any `GT-*` anywhere in the title, the body
 * or the branch name. On run 30630343658 that produced three contested claims and
 * not one of them was real: #316 and #317 were failed for CITING GT-583 and GT-602
 * in a paragraph about what they had deliberately left to another pull request,
 * and #321 was failed for writing the name of the CI job it wired itself into —
 * `Governance guards (GT-578)`. The remedy the guard printed ("decide which pull
 * request owns the id") had no work to do, because only one claimant ever wanted
 * the id; the other was doing the thing this repository's pull requests do in
 * nearly every paragraph, which is to say where the neighbouring work lives.
 *
 * A guard that fires on the normal case is not strict, it is noise, and noise gets
 * routed around. So a claim must be DECLARED:
 *
 *   - the TITLE — every id in it. A title is the one line a session writes about
 *     what this pull request is; an id there is not an aside.
 *   - the BRANCH NAME — every id in it, case-insensitively, because this
 *     repository's branches are `feat/gt-639-claim-guard` and a `GT-`-only rule
 *     never fired on a single real one.
 *   - the BODY, only after an explicit marker: `Closes`/`Fixes`/`Resolves`/
 *     `Advances`/`Claims` immediately before the id, which is exactly how the
 *     bodies here already open ("Closes **GT-643**; advances **GT-583**"). The
 *     marker must OPEN a line or a `;`-clause: one floating mid-sentence describes
 *     someone else's claim ("#321 and #323 both title-claim GT-644") rather than
 *     making one. A marker takes a LIST, and `advances` counts: partial credit is
 *     still one session owning the row. A marker inside a FENCED block is not a claim —
 *     these bodies paste guard output and `--json` payloads, and quoting the
 *     evidence must not be a way to trip the guard that produced it.
 *
 * Everything else in a body is prose, and prose claims nothing. The ids a pull
 * request only mentions are still reported — narrowing the rule must not quietly
 * narrow what the reader is told.
 *
 * ## What it deliberately does NOT do
 *
 * It does not write a committed claim list. Such a file would be derived from
 * live GitHub state, so it would be stale the moment anyone opened a PR, and the
 * repository already has a guard (46) whose whole premise is that derived
 * artifacts must reach a fixed point. A perpetually-stale artifact in that chain
 * would be worse than none. The live view is this check's output, on the PR where
 * it matters.
 *
 * It also cannot see work that has no open PR. A branch someone is working on
 * privately claims nothing, and the guard says so rather than implying coverage.
 *
 * ## Anti-vacuous pass
 *
 * Zero open pull requests examined is reported, not silently passed: with no PRs
 * there is nothing to contest, and a run that found none because the query broke
 * looks identical unless it says which happened. A query that fails outright is a
 * hard failure — unable to answer is not the same as nothing to report.
 *
 * USAGE
 *   node .harness/scripts/ci/50-validate-gap-claim.mjs
 *   node .harness/scripts/ci/50-validate-gap-claim.mjs --json
 *   node .harness/scripts/ci/50-validate-gap-claim.mjs --fixture <file>   # offline
 *
 * EXIT CODES
 *   0  no id is claimed by more than one open pull request
 *   1  a contested claim, or the pull-request query could not be answered
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GUARD = '50-validate-gap-claim';

// ---------------------------------------------------------------------------
// Pure core — takes pull requests as data, returns the claim map. No network.
// ---------------------------------------------------------------------------

/** A gap id anywhere in a string, in either case. */
const ANY_ID = /gt-\d+/gi;

/**
 * A body marker, ANCHORED to the start of a clause.
 *
 * A marker floating mid-sentence is a description of somebody else's claim, not
 * one of your own: "#321 and #323 both title-claim GT-644", "PR #316 closes
 * GT-582". Found the hard way — the first version of this fix's own pull request
 * body contained the first of those sentences and claimed GT-644 with it.
 *
 * So a marker counts at the start of a line (past list bullets, blockquotes, task
 * boxes and markdown emphasis) or at the start of a `;`-separated clause, which is
 * the second-marker style these bodies use: "Closes **GT-643**; advances …".
 */
const MARKER =
  /^[\s>*_`~\-+#]*(?:\[[ xX]\][\s*_`~]*)?(?:close[sd]?|closing|fix(?:e[sd]|ing)?|resolve[sd]?|resolving|advance[sd]?|advancing|claim(?:s|ed)?)\b[\s:*_`~]*/i;

/**
 * The run of ids a marker introduces. Tolerates the markdown these bodies are
 * written in (`**GT-583**`, `` `GT-583` ``) and the separators they use, and stops
 * at the first token that is not another id — so `Closes GT-700 and later, once
 * GT-701 lands` claims GT-700 alone.
 */
const CLAIM_RUN = /^(?:[*_`~]*gt-\d+[*_`~]*(?:\s*(?:,|and|&|\+)\s*)?)+/i;

const idsIn = (text) => (text ?? '').match(ANY_ID)?.map((id) => id.toUpperCase()) ?? [];

/**
 * A fenced block is a transcript, not a declaration.
 *
 * These bodies paste guard output, `--json` payloads and command lines, and this
 * guard's OWN failure output names ids next to the word "claimed". Reading a claim
 * out of pasted evidence would make quoting the guard a way to trip it. Inline code
 * spans are left alone: `` Closes `GT-201` `` is a claim people really write.
 */
const withoutFencedBlocks = (body) => (body ?? '').replace(/^[ \t]*(```|~~~)[\s\S]*?^[ \t]*\1[ \t]*$/gm, '');

/**
 * The ids a pull request DECLARES it is working: every id in the title or the
 * branch name, plus the ids the body introduces with an explicit marker.
 *
 * A `GT-*` that appears in the body as prose is a cross-reference, not a claim —
 * see the header. `mentionedIds` is the other half.
 */
export function claimedIds(pr) {
  const fromBody = withoutFencedBlocks(pr.body)
    .split('\n')
    .flatMap((line) => line.split(';'))
    .flatMap((clause) => {
      const marker = MARKER.exec(clause);
      if (!marker) return [];
      return idsIn(CLAIM_RUN.exec(clause.slice(marker[0].length))?.[0]);
    });
  return [...new Set([...idsIn(pr.title), ...idsIn(pr.headRefName), ...fromBody])].sort();
}

/** Ids the pull request names somewhere without claiming them. Reported, never contested. */
export function mentionedIds(pr) {
  const claimed = new Set(claimedIds(pr));
  const all = idsIn(`${pr.title ?? ''}\n${pr.body ?? ''}\n${pr.headRefName ?? ''}`);
  return [...new Set(all.filter((id) => !claimed.has(id)))].sort();
}

/**
 * id -> the open pull requests claiming it.
 *
 * @param {Array<{number:number,title?:string,body?:string,headRefName?:string,url?:string}>} prs
 * @returns {Map<string, Array<object>>}
 */
export function buildClaimMap(prs) {
  const map = new Map();
  for (const pr of prs) {
    for (const id of claimedIds(pr)) {
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(pr);
    }
  }
  return map;
}

/** Ids claimed by more than one open pull request. */
export function findContested(claimMap) {
  return [...claimMap.entries()]
    .filter(([, prs]) => prs.length > 1)
    .map(([id, prs]) => ({ id, prs }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

// ---------------------------------------------------------------------------
// I/O edges
// ---------------------------------------------------------------------------

function fail(lines) {
  console.error(`\n✗ ${GUARD}: ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(`  ${l}`);
  process.exit(1);
}

/** Open pull requests, from `gh`. Returns null when the query cannot be answered. */
export function fetchOpenPullRequests() {
  try {
    const raw = execFileSync(
      'gh',
      ['pr', 'list', '--state', 'open', '--limit', '200', '--json', 'number,title,body,headRefName,url'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function main(argv) {
  const asJson = argv.includes('--json');
  const fixtureIdx = argv.indexOf('--fixture');

  const prs = fixtureIdx !== -1
    ? JSON.parse(fs.readFileSync(path.resolve(process.cwd(), argv[fixtureIdx + 1]), 'utf8'))
    : fetchOpenPullRequests();

  if (prs === null) {
    fail([
      'could not read the open pull requests, so no claim was checked.',
      '  `gh pr list` failed — in CI that usually means GH_TOKEN is not set on the step.',
      '',
      '  Unable to answer is not the same as nothing to report. This guard exists',
      '  because two sessions could not see each other; a version of it that stays',
      '  quiet when it cannot look would reproduce exactly that.',
    ]);
  }

  const claimMap = buildClaimMap(prs);
  const contested = findContested(claimMap);

  // Ids nobody declared, named in prose by at least one open PR. Not contestable —
  // but printed, because a rule that got narrower must not also get quieter.
  const mentions = new Map();
  for (const pr of prs) {
    for (const id of mentionedIds(pr)) {
      if (claimMap.has(id)) continue;
      if (!mentions.has(id)) mentions.set(id, []);
      mentions.get(id).push(pr);
    }
  }

  if (asJson) {
    process.stdout.write(JSON.stringify({
      pullRequests: prs.length,
      claims: Object.fromEntries([...claimMap].map(([id, list]) => [id, list.map((p) => p.number)])),
      mentioned: Object.fromEntries([...mentions].map(([id, list]) => [id, list.map((p) => p.number)])),
      contested: contested.map((c) => ({ id: c.id, prs: c.prs.map((p) => p.number) })),
    }) + '\n');
    return contested.length > 0 ? 1 : 0;
  }

  console.log(`${GUARD} — one gap, one claim`);
  console.log(`  open pull requests .. ${prs.length}`);
  console.log(`  ids claimed ......... ${claimMap.size}`);
  console.log(`  mentioned, not claimed ${mentions.size}`);
  console.log(`  contested ........... ${contested.length}`);

  if (prs.length === 0) {
    // Said out loud: with no open PRs there is nothing to contest, which is a
    // legitimate state and looks identical to a broken query unless named.
    console.log('\n  No pull request is open, so nothing is claimed and nothing can be contested.');
  }

  for (const [id, list] of [...claimMap].sort()) {
    if (list.length === 1) console.log(`  · ${id} — #${list[0].number} ${list[0].headRefName ?? ''}`);
  }

  if (mentions.size > 0) {
    console.log('\n  Mentioned in prose by an open pull request, claimed by none:');
    for (const [id, list] of [...mentions].sort()) {
      console.log(`  · ${id} — cited by ${list.map((p) => `#${p.number}`).join(', ')}`);
    }
    console.log('    A cross-reference is not a claim. If one of these is the gap you are');
    console.log('    working, say so in the title, the branch name, or with a marker:');
    console.log('    `Closes GT-NNN`, `Advances GT-NNN`, `Claims: GT-NNN, GT-MMM`.');
  }

  if (contested.length > 0) {
    fail([
      `${contested.length} gap id(s) are claimed by more than one open pull request:`,
      ...contested.flatMap((c) => [
        `  • ${c.id}`,
        ...c.prs.map((p) => `      #${p.number}  ${p.headRefName ?? '?'}  ${p.title ?? ''}`),
      ]),
      '',
      '  Two sessions are working the same gap. That is not a merge conflict yet, and',
      '  it is much cheaper to resolve now than after both have landed: on 2026-07-30',
      '  the same fix was written twice and a third session spent a full reconciliation',
      '  collapsing them (GT-639).',
      '',
      '  Decide which pull request owns the id, and say so in the other one.',
      '',
      '  Both of these DECLARED the id — in a title, in a branch name, or after a',
      '  `Closes`/`Advances`/`Claims` marker. Merely citing a gap in prose is not a',
      '  claim and never reaches this list, so a pull request named here asked for it.',
      '',
      '  NOT COVERED by this check: a branch with no open pull request claims nothing.',
      '  Opening the PR early — draft is enough — is what makes the claim visible.',
    ]);
  }

  console.log(
    `\n✓ ${GUARD}: ${claimMap.size} claimed id(s) across ${prs.length} open pull request(s), none contested.`,
  );
  return 0;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
