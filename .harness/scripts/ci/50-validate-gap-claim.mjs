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
 * remove it, and the next session works around a claim nobody holds). Every open
 * PR claims the `GT-*` ids that appear in its title, its body or its branch name.
 *
 * An id claimed by MORE THAN ONE open pull request is a contested claim, and this
 * guard fails naming both claimants.
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

/** Every `GT-NNN` mentioned in a pull request's title, body or branch name. */
export function claimedIds(pr) {
  const haystack = `${pr.title ?? ''}\n${pr.body ?? ''}\n${pr.headRefName ?? ''}`;
  return [...new Set(haystack.match(/GT-\d+/g) ?? [])].sort();
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

  if (asJson) {
    process.stdout.write(JSON.stringify({
      pullRequests: prs.length,
      claims: Object.fromEntries([...claimMap].map(([id, list]) => [id, list.map((p) => p.number)])),
      contested: contested.map((c) => ({ id: c.id, prs: c.prs.map((p) => p.number) })),
    }) + '\n');
    return contested.length > 0 ? 1 : 0;
  }

  console.log(`${GUARD} — one gap, one claim`);
  console.log(`  open pull requests .. ${prs.length}`);
  console.log(`  ids claimed ......... ${claimMap.size}`);
  console.log(`  contested ........... ${contested.length}`);

  if (prs.length === 0) {
    // Said out loud: with no open PRs there is nothing to contest, which is a
    // legitimate state and looks identical to a broken query unless named.
    console.log('\n  No pull request is open, so nothing is claimed and nothing can be contested.');
  }

  for (const [id, list] of [...claimMap].sort()) {
    if (list.length === 1) console.log(`  · ${id} — #${list[0].number} ${list[0].headRefName ?? ''}`);
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
