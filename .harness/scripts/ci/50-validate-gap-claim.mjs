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
 * ## AND A CLAIM IS ALSO WHAT THE DIFF DID (GT-645)
 *
 * Narrowing the prose rule fixed the noise and left the other half untouched: a
 * pull request that resolves gaps without saying so in the prescribed shape still
 * claimed nothing. PR #315 — "Board reconciliation: credit the eleven gaps this
 * wave merged", branch `chore/reconcile-board-wave` — flipped ELEVEN rows to DONE
 * and wrote eleven closure-evidence records with no `GT-*` in its title and none
 * in its branch. It is the single pull request that moved the board most in its
 * wave, and under the declared-only rule it claimed nothing at all. Measured, not
 * predicted: run 30633517559 reported `ids claimed .. 1` on a pull request that
 * resolved six rows, and exited ✓.
 *
 * The diff says exactly what a change touched, in machine-readable form, and it
 * cannot be answered by editing a sentence. So it is the second input:
 *
 *   - a board ROW whose STATUS the diff moves — including a row it adds, which is
 *     a session allocating the id and starting on it;
 *   - a CLOSURE-EVIDENCE record the diff writes.
 *
 * A row whose status is unchanged is editorial work on the board, not work on the
 * gap, and a `GT-*` in the patch of ordinary source is a comment — this file's own
 * header cites four. Neither is a claim.
 *
 * ## WHEN PROSE AND DIFF DISAGREE
 *
 * Reported as its own finding, and resolved toward NEITHER side, because both
 * sides have already been wrong here — the prose contested nine ids nobody
 * claimed, the diff was never read at all. A body declaring an id whose row its
 * board edits never touch, or a diff working a row the body never even names, is
 * the case a human should look at.
 *
 * The prose direction fires only when the change touches the board at all. Most
 * pull requests close a gap by changing code and never go near it; their diff is
 * SILENT about the id, not in conflict with it, and a guard that called every one
 * of those a disagreement would fire on the ordinary case. That is the failure
 * mode this file already carries a section about.
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
 * The same rule now covers the diff: a pull request whose diff cannot be read is a
 * hard failure naming it, never a run that quietly checked the prose alone. An
 * ABSENT diff is likewise not an empty diff — `claimsOf` carries `diffKnown` so
 * "we did not look" can never be reported as "there was nothing there".
 *
 * NETWORK
 * Both inputs come from `gh`, which needs `GH_TOKEN` in CI. With no network and no
 * `--fixture`, `gh pr list` fails and the guard exits 1 saying so; it never
 * degrades to a green run over a list it did not get. With `--fixture` it makes no
 * network call at all — fixture entries carry the diff as a `diff` string — which
 * is how the self-tests and `43-validate-guard-negative-fixtures` exercise it.
 *
 * USAGE
 *   node .harness/scripts/ci/50-validate-gap-claim.mjs
 *   node .harness/scripts/ci/50-validate-gap-claim.mjs --json
 *   node .harness/scripts/ci/50-validate-gap-claim.mjs --claims-markdown
 *   node .harness/scripts/ci/50-validate-gap-claim.mjs --fixture <file>   # offline
 *
 * EXIT CODES
 *   0  no id is claimed by more than one open pull request, and no pull request's
 *      prose and diff disagree
 *   1  a contested claim, a prose/diff disagreement, or an input that could not be
 *      read (the pull-request list, or one pull request's diff)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PATH_KEYS } from '../lib/paths.mjs';

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

// ---------------------------------------------------------------------------
// GT-645 — the DIFF half. A claim is what the change DID.
// ---------------------------------------------------------------------------

/**
 * The two board surfaces a claim is legible in. Read out of `lib/paths.mjs`
 * rather than restated, so a move of the board is a one-line fix there and not a
 * guard that silently stops finding anything.
 */
const TRACKING_FILES = new Set([PATH_KEYS.gapTracking, PATH_KEYS.gapTrackingEs]);
const CLOSURE_FILE = PATH_KEYS.gapClosureEvidence;

/** A board row: `| [`GT-646`](./gap-reference-catalog.md#gt-646) | … | `DONE` |`. */
const BOARD_ROW = /^\|\s*\[`(GT-\d+)`\]/i;
/** Its LAST cell, which is the status. Both languages write it in backticks. */
const ROW_STATUS = /\|\s*`([^`]+)`\s*\|\s*$/;
/** A closure-evidence record's id line. */
const CLOSURE_ID = /^\s*"id"\s*:\s*"(GT-\d+)"/i;

/**
 * A unified diff, split per file, with the added and removed lines of each.
 *
 * `+++`/`---` headers are dropped: they start with the same characters as content
 * and reading them as content makes every file look like an added line.
 */
export function parseDiffFiles(diff) {
  const files = [];
  let current = null;
  for (const line of (diff ?? '').split('\n')) {
    const header = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (header) {
      current = { path: header[2], added: [], removed: [] };
      files.push(current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith('+++ ') || line.startsWith('--- ')) continue;
    if (line.startsWith('+')) current.added.push(line.slice(1));
    else if (line.startsWith('-')) current.removed.push(line.slice(1));
  }
  return files;
}

/** id -> status, for the board rows among these lines. */
function rowStatuses(lines) {
  const out = new Map();
  for (const line of lines) {
    const id = BOARD_ROW.exec(line)?.[1];
    if (!id) continue;
    const status = ROW_STATUS.exec(line)?.[1];
    if (status) out.set(id.toUpperCase(), status);
  }
  return out;
}

/**
 * What a diff CLAIMS: the rows whose status it moves and the closure records it
 * writes.
 *
 * Two deliberate narrowings, both of them about not becoming noise:
 *
 *   - a row whose STATUS is unchanged is not a claim. Rewriting a row's evidence
 *     prose is editorial work on the board, not work on the gap, and half the
 *     commits that touch this board do exactly that.
 *   - a `GT-*` in the patch of ordinary source is not a claim. Comments in this
 *     repository cite gap ids in nearly every header — including this file's.
 *     Only a board ROW or a closure RECORD counts.
 *
 * An ADDED row counts: its status moved from "no row at all" to whatever it now
 * says, which is a session allocating the id and starting on it (GT-638's
 * subject). A row the diff DELETES counts for the same reason in reverse.
 */
export function diffClaimedIds(diff) {
  const statusChanges = [];
  const closures = [];

  for (const file of parseDiffFiles(diff)) {
    if (TRACKING_FILES.has(file.path)) {
      const before = rowStatuses(file.removed);
      const after = rowStatuses(file.added);
      for (const [id, to] of after) {
        if (before.get(id) !== to) statusChanges.push({ id, from: before.get(id) ?? null, to, file: file.path });
      }
      for (const [id, from] of before) {
        if (!after.has(id)) statusChanges.push({ id, from, to: null, file: file.path });
      }
    } else if (file.path === CLOSURE_FILE) {
      const removed = new Set(file.removed.flatMap((l) => CLOSURE_ID.exec(l)?.[1]?.toUpperCase() ?? []));
      const added = new Set(file.added.flatMap((l) => CLOSURE_ID.exec(l)?.[1]?.toUpperCase() ?? []));
      // A record that is only MOVED shows up on both sides; only new ones count.
      for (const id of added) if (!removed.has(id)) closures.push({ id, file: file.path });
    }
  }

  const ids = [...new Set([...statusChanges.map((s) => s.id), ...closures.map((c) => c.id)])].sort();
  // GT-464 — `boardTouched` is what ARMS the prose direction below, so it must mean
  // "this diff did something that could BE a claim", not "this diff opened a board
  // file". It used to mean the second, and the difference is a false positive with
  // a name: a change that corrects a row's DESCRIPTION without moving its status.
  //
  // GT-464's own row said the two alerts "do not exist yet". Delivering them made
  // that sentence false while the status legitimately stayed `DEFERRED`, because the
  // row's second criterion needs a cluster nobody has. Under the old meaning, fixing
  // the false sentence armed the guard and the only ways to quiet it were to leave a
  // lie on the board or to move a status that had not moved — both worse than the
  // noise. Note the shape of that: a guard answerable by editing a sentence is the
  // exact failure #324 is the record of, and this had become one.
  //
  // Neither real direction weakens. `diffOnly` never consulted this flag, so the
  // eleven rows #315 flipped without naming are caught the same way. And a diff that
  // moves ANY status still arms the prose direction, because `statusChanges` is then
  // non-empty — declaring X while flipping Y is still adjudicated.
  return { ids, boardTouched: statusChanges.length > 0 || closures.length > 0, statusChanges, closures };
}

/**
 * Everything one pull request claims, and by which route.
 *
 * `diffKnown` is not cosmetic: an ABSENT diff is not an empty diff. A fixture
 * that supplies none carries no information about what the change did, and
 * reporting that as "the diff claims nothing" would be a vacuous pass one layer
 * below the one this repository already guards against.
 */
/**
 * A `develop` -> `main` promotion TRANSPORTS rows; it does not work them.
 *
 * Its diff is, by construction, every board change since the last promotion — so
 * without this it claims every id currently in flight and contests each one
 * against the pull request that is actually doing the work. Measured when this
 * was added: promotion #537 (GT-675 + GT-702) was reported as contesting GT-703
 * with #536, the PR closing GT-703, purely because GT-703's already-merged
 * registration row travelled inside it.
 *
 * This narrows the DIFF side only. A promotion that DECLARES an id — in its
 * title, its branch, or after a `Closes`/`Advances`/`Claims` marker — still
 * claims it and is still held to the rule that the row must have moved. So a
 * promotion cannot use this to smuggle a claim past the guard; it can only stop
 * being blamed for carrying somebody else's row.
 */
export function isPromotion(pr) {
  return pr?.baseRefName === 'main' && pr?.headRefName === 'develop';
}

export function claimsOf(pr) {
  const prose = claimedIds(pr);
  const diffKnown = typeof pr.diff === 'string' && !isPromotion(pr);
  const d = diffKnown
    ? diffClaimedIds(pr.diff)
    : { ids: [], boardTouched: false, statusChanges: [], closures: [] };
  return {
    prose,
    diff: d.ids,
    all: [...new Set([...prose, ...d.ids])].sort(),
    diffKnown,
    boardTouched: d.boardTouched,
    statusChanges: d.statusChanges,
    closures: d.closures,
  };
}

/**
 * Where prose and diff DISAGREE — reported, never resolved toward either side.
 *
 * Silently trusting one of them is how both halves of this defect happened: the
 * prose-only rule contested nine ids nobody claimed, and it missed eleven rows a
 * diff had already flipped. Whichever side is right, a human is the one who
 * knows which.
 *
 * The `boardTouched` condition on the prose side is the ANTI-NOISE rule and it is
 * the whole design. Most pull requests close a gap by changing code and never
 * touch the board; their diff is SILENT about the id, not in conflict with it.
 * Only when a change MOVES a row's status or writes a closure record — and the
 * rows it moved are not the ones it declared — is there something to adjudicate.
 * A guard that fired on the ordinary case would be answered by editing a
 * sentence, which is exactly the failure #324 is the record of.
 *
 * GT-464 narrowed that flag from "opened a board file" to "did something that
 * could be a claim". Correcting a row's DESCRIPTION is neither a claim nor a
 * conflict, and treating it as one made the guard answerable by leaving a stale
 * sentence in place. See `diffClaimedIds`.
 */
export function findDivergences(prs) {
  const out = [];
  for (const pr of prs) {
    const c = claimsOf(pr);
    if (!c.diffKnown) continue;
    const named = new Set(idsIn(`${pr.title ?? ''}\n${pr.body ?? ''}\n${pr.headRefName ?? ''}`));
    const proseOnly = c.boardTouched ? c.prose.filter((id) => !c.diff.includes(id)) : [];
    // Only ids the prose does not even MENTION. Naming a row in an evidence table
    // is not a claim, but it is not silence either — there is nothing to adjudicate.
    const diffOnly = c.diff.filter((id) => !named.has(id));
    if (proseOnly.length > 0 || diffOnly.length > 0) out.push({ pr, proseOnly, diffOnly });
  }
  return out;
}

/** Ids the pull request names somewhere without claiming them. Reported, never contested. */
export function mentionedIds(pr) {
  const claimed = new Set(claimsOf(pr).all);
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
    const c = claimsOf(pr);
    for (const id of c.all) {
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(pr);
    }
  }
  return map;
}

/** id -> which route each claimant took to it. Printed so a reader can check the guard. */
export function claimSources(prs) {
  const map = new Map();
  for (const pr of prs) {
    const c = claimsOf(pr);
    for (const id of c.all) {
      if (!map.has(id)) map.set(id, []);
      map.get(id).push({ number: pr.number, prose: c.prose.includes(id), diff: c.diff.includes(id) });
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

const markdownCell = (value) => String(value ?? '').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();

function prLabel(pr) {
  if (pr.url) return `[#${pr.number}](${pr.url})`;
  return `#${pr.number}`;
}

/**
 * A live board-readable view of who claims which gap.
 *
 * This is intentionally produced at read time from open pull requests, not
 * committed as board state. Committing it would make the board stale the moment
 * another PR opened, which is the design constraint GT-639 records.
 */
export function renderClaimsMarkdown(prs) {
  const claimMap = buildClaimMap(prs);
  const sources = claimSources(prs);
  const contestedIds = new Set(findContested(claimMap).map((c) => c.id));

  const lines = [
    '# Live In-Flight Gap Claims',
    '',
    'Generated from open pull requests at run time. This table is a live view, not committed board state.',
    '',
    '| Gap | Pull request | Branch | Source | Claim status |',
    '|---|---:|---|---|---|',
  ];

  if (claimMap.size === 0) {
    lines.push('| _none_ | _none_ | _none_ | _none_ | _none_ |');
    return `${lines.join('\n')}\n`;
  }

  for (const [id, prsForId] of [...claimMap].sort()) {
    for (const pr of prsForId) {
      const via = sources.get(id)?.find((entry) => entry.number === pr.number);
      const route = via ? [via.prose && 'declared', via.diff && 'diff'].filter(Boolean).join('+') : '?';
      lines.push(
        `| ${id} | ${prLabel(pr)} | ${markdownCell(pr.headRefName ?? '?')} | ${route} | ${
          contestedIds.has(id) ? 'contested' : 'claimed'
        } |`,
      );
    }
  }

  return `${lines.join('\n')}\n`;
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
      ['pr', 'list', '--state', 'open', '--limit', '200', '--json', 'number,title,body,headRefName,baseRefName,url'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * One pull request's unified diff, from `gh`. Returns null when it cannot be read.
 *
 * `gh pr diff` rather than the `/files` API on purpose: the API omits `patch` for
 * files it considers too large, and the gap board is the largest file in this
 * repository. A silently patch-less board file would make this guard blind in
 * exactly the case it exists for.
 */
export function fetchPullRequestDiff(number) {
  try {
    return execFileSync('gh', ['pr', 'diff', String(number)], {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function main(argv) {
  const asJson = argv.includes('--json');
  const asClaimsMarkdown = argv.includes('--claims-markdown');
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

  // The DIFF is the other input (GT-645). Offline, `--fixture` entries carry it
  // as a `diff` string; live, it is one `gh pr diff` per open pull request.
  if (fixtureIdx === -1) {
    const unreadable = [];
    for (const pr of prs) {
      const diff = fetchPullRequestDiff(pr.number);
      if (diff === null) unreadable.push(pr.number);
      else pr.diff = diff;
    }
    if (unreadable.length > 0) {
      fail([
        `could not read the diff of ${unreadable.length} open pull request(s): ${unreadable.map((n) => `#${n}`).join(', ')}.`,
        '  `gh pr diff <n>` failed — in CI that usually means GH_TOKEN is not set on the step.',
        '',
        '  The diff is half of what a claim is: a row this pull request flipped, or a',
        '  closure record it wrote, is a claim whatever its prose says. Checking the',
        '  prose alone and reporting a clean run would be the false negative this',
        '  check exists to close (GT-645).',
      ]);
    }
  }

  const claimMap = buildClaimMap(prs);
  const contested = findContested(claimMap);
  const sources = claimSources(prs);
  const divergent = findDivergences(prs);

  if (asClaimsMarkdown) {
    process.stdout.write(renderClaimsMarkdown(prs));
    return contested.length > 0 || divergent.length > 0 ? 1 : 0;
  }

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
      claimSources: Object.fromEntries(sources),
      divergent: divergent.map((d) => ({ pr: d.pr.number, proseOnly: d.proseOnly, diffOnly: d.diffOnly })),
    }) + '\n');
    return contested.length > 0 || divergent.length > 0 ? 1 : 0;
  }

  console.log(`${GUARD} — one gap, one claim`);
  console.log(`  open pull requests .. ${prs.length}`);
  console.log(`  ids claimed ......... ${claimMap.size}`);
  console.log(`  mentioned, not claimed ${mentions.size}`);
  console.log(`  contested ........... ${contested.length}`);
  console.log(`  prose vs diff ....... ${divergent.length}`);

  if (prs.length === 0) {
    // Said out loud: with no open PRs there is nothing to contest, which is a
    // legitimate state and looks identical to a broken query unless named.
    console.log('\n  No pull request is open, so nothing is claimed and nothing can be contested.');
  }

  for (const [id, list] of [...claimMap].sort()) {
    if (list.length !== 1) continue;
    // Say WHICH input carried the claim, so a reader can check the guard instead
    // of trusting it — the routes answer to different evidence.
    const via = sources.get(id)?.[0];
    const route = via ? [via.prose && 'declared', via.diff && 'diff'].filter(Boolean).join('+') : '?';
    console.log(`  · ${id} — #${list[0].number} ${list[0].headRefName ?? ''} (${route})`);
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

  if (divergent.length > 0) {
    // Its OWN finding. Neither side is silently preferred: the prose-only rule
    // contested nine ids nobody claimed, and it missed eleven rows a diff had
    // already flipped, so "trust the prose" and "trust the diff" are both how
    // this went wrong. Whichever is right, a human is the one who knows.
    console.log('\n  PROSE AND DIFF DISAGREE — reported, not resolved:');
    for (const d of divergent) {
      console.log(`  • #${d.pr.number}  ${d.pr.headRefName ?? '?'}`);
      if (d.proseOnly.length > 0) {
        console.log(`      declared, but its board edits do not touch: ${d.proseOnly.join(', ')}`);
      }
      if (d.diffOnly.length > 0) {
        console.log(`      its diff worked, and the body never names: ${d.diffOnly.join(', ')}`);
      }
    }
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
      '  Each of these either DECLARED the id — in a title, in a branch name, or after',
      '  a `Closes`/`Advances`/`Claims` marker — or WORKED it: flipped its row on the',
      '  board, or wrote its closure-evidence record. The list above says which. Merely',
      '  citing a gap in prose is not a claim and never reaches this list.',
      '',
      '  NOT COVERED by this check: a branch with no open pull request claims nothing.',
      '  Opening the PR early — draft is enough — is what makes the claim visible.',
    ]);
  }

  if (divergent.length > 0) {
    fail([
      `${divergent.length} pull request(s) say one thing and do another (listed above).`,
      '',
      '  This is not resolved automatically in either direction, because both',
      '  directions have already been wrong here: reading the prose alone contested',
      '  nine ids nobody claimed (run 30631939629), and it missed the eleven rows',
      '  PR #315 flipped to DONE without naming one of them in its title or branch.',
      '',
      '  Either say what you did — `Closes GT-NNN` — or explain the board edit that',
      '  is not yours to claim. Both are one sentence; guessing for you is not.',
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
