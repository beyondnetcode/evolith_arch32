#!/usr/bin/env node
/**
 * @file 66-validate-bilingual-sync.mjs
 * @description A bilingual pair edited on ONE side only (GT-702).
 *
 * ## The defect class this closes
 *
 * `04-check-bilingual-parity.mjs` answers three questions: does every English doc
 * under `reference/` have an `.es.md` counterpart, do the two carry the same number
 * of headings, and is the Spanish file actually Spanish. All three are properties of
 * the files AS THEY STAND. None of them can see that the two files DISAGREE.
 *
 * Measured on 2026-08-16: `gap-reference-catalog.md` was corrected to say the OPA
 * corpus holds 266 violation literals and that `{id, message}` is not their complete
 * shape. `gap-reference-catalog.es.md` was left saying "las 251 literales ... llevan
 * esas dos y nada más, verificado por conteo" — a refuted claim, in the document the
 * board treats as the record of truth. The parity suite passed on every run in
 * between, correctly: the ES file existed, had matching headings, and was Spanish.
 *
 * ## Why this checks history and not content
 *
 * The obvious guard compares the two texts. That was PROTOTYPED FIRST and measured
 * before being proposed, and it does not work: comparing language-invariant tokens
 * (numerals, ids, inline code) across the 500 pairs under `reference/` produced 2136
 * findings, and the first ones triaged were noise — `GT-383…394` parses as the
 * cardinal `394`, table cells break inline-code pairing, and prose legitimately
 * spells quantities differently in the two languages. A guard with that signal-to-
 * noise ratio gets switched off, and a guard that is switched off is worse than none.
 *
 * The failure is not really "the texts differ" — two translations always differ. It
 * is "someone changed one side and not the other". Git answers exactly that, with no
 * language model and no tokenizer: over the same 400 commits the content check
 * produced 2136 findings, this one produces THREE, and all three are real edits to
 * one side of a pair.
 *
 * ## What it does NOT claim
 *
 * A commit that touches both sides can still put a wrong translation in the ES file.
 * This guard cannot see that and does not pretend to; it closes the specific hole
 * that a correction landed on one side and was never mirrored. Deliberate one-sided
 * repairs (fixing a status literal in the ES file alone) are real and are declared
 * in ALLOWED below, with a reason, rather than being silently tolerated.
 *
 * Usage:
 *   node .harness/scripts/ci/66-validate-bilingual-sync.mjs              # HEAD's range
 *   node .harness/scripts/ci/66-validate-bilingual-sync.mjs --since <ref>
 *   node .harness/scripts/ci/66-validate-bilingual-sync.mjs --self-test
 */

import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertScanned } from '../lib/coverage.mjs';

const GUARD = '66-validate-bilingual-sync';
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * Commits permitted to touch one side alone, each with the reason it is legitimate.
 * A bare sha is not enough: if the reason cannot be written down, the commit is a
 * defect and belongs in the fix, not in this list.
 */
const ALLOWED = new Map([
  ['1a04f031', 'ES-only repair of a status literal so 08-validate-tracking could parse it; no EN counterpart exists to change.'],
  ['0fb29909', 'The defect that motivated this guard: the EN catalog was corrected and the ES twin left asserting "las 251 literales". Mirrored in a follow-up; kept here so the audit sweep stays green without pretending it never happened.'],
  ['fa551a3a', 'EN tracking deferrals landed alone. Re-measured 2026-08-16: no surviving divergence — all 673 rows carry equivalent statuses in both files — so there is nothing left to mirror.'],
]);

function fail(lines) {
  console.error(`\n\x1b[31m✗\x1b[0m ${GUARD}: ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(`  ${l}`);
  process.exit(1);
}

const git = (args) =>
  execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** The English half of a pair, or null when the path is not part of one. */
function englishHalf(file) {
  if (!file.endsWith('.md')) return null;
  return file.endsWith('.es.md') ? `${file.slice(0, -6)}.md` : file;
}

/** Parse `git log --name-only` into commits. Exported shape kept flat for the test. */
export function parseLog(raw) {
  const commits = [];
  let cur = null;
  for (const line of raw.split('\n')) {
    if (line.startsWith('@@')) {
      if (cur) commits.push(cur);
      const [sha, subject] = line.slice(2).split('|', 2);
      cur = { sha: sha.slice(0, 8), subject, files: [] };
    } else if (line.trim() && cur) {
      cur.files.push(line.trim());
    }
  }
  if (cur) commits.push(cur);
  return commits;
}

/**
 * The NET effect of a range: a pair whose English half moved somewhere in the range
 * while its Spanish half moved nowhere in it (or the reverse).
 *
 * Judging each commit alone was the first implementation and it was wrong in a way
 * only testing showed: editing EN in one commit and mirroring it in the next — an
 * entirely normal way to work — failed the guard, and a guard that fails correct work
 * teaches people to reach for the allowlist. What a reviewer merges is the range, so
 * the range is what gets judged. `--audit` keeps the per-commit view, where the
 * question is genuinely "was this commit self-consistent".
 */
export function oneSidedInRange(commits, pairExists) {
  const touched = new Set();
  for (const c of commits) {
    if (ALLOWED.has(c.sha)) continue;
    for (const f of c.files) touched.add(f);
  }
  const offenders = [];
  for (const file of touched) {
    const en = englishHalf(file);
    if (!en) continue;
    const es = `${en.slice(0, -3)}.es.md`;
    if (touched.has(en) && touched.has(es)) continue;
    if (!pairExists(en, es)) continue;
    offenders.push(touched.has(en) ? `${en} (EN moved, ES did not)` : `${es} (ES moved, EN did not)`);
  }
  return [...new Set(offenders)].sort();
}

/**
 * One-sided edits, per commit. `pairExists` is injected so the self-test can run
 * without a tree.
 */
export function oneSidedEdits(commits, pairExists) {
  const out = [];
  for (const commit of commits) {
    const files = new Set(commit.files);
    const offenders = [];
    for (const file of files) {
      const en = englishHalf(file);
      if (!en) continue;
      const es = `${en.slice(0, -3)}.es.md`;
      // Both halves in the same commit is the correct shape — nothing to report.
      if (files.has(en) && files.has(es)) continue;
      // Only a pair can be half-edited: a doc with no twin is not bilingual.
      if (!pairExists(en, es)) continue;
      offenders.push(files.has(en) ? `${en} (EN only)` : `${es} (ES only)`);
    }
    if (offenders.length > 0 && !ALLOWED.has(commit.sha)) {
      out.push({ ...commit, offenders: [...new Set(offenders)] });
    }
  }
  return out;
}

function selfTest() {
  const pairExists = (en) => en.startsWith('reference/');
  const cases = [
    { name: 'both halves in one commit passes',
      files: ['reference/a.md', 'reference/a.es.md'], expect: 0 },
    { name: 'EN alone is caught', files: ['reference/a.md'], expect: 1 },
    { name: 'ES alone is caught', files: ['reference/a.es.md'], expect: 1 },
    { name: 'a doc with no twin is ignored', files: ['CHANGELOG.md'], expect: 0 },
    { name: 'non-markdown is ignored', files: ['reference/a.ts'], expect: 0 },
  ];
  let failed = 0;
  for (const c of cases) {
    const got = oneSidedEdits([{ sha: 'deadbeef', subject: c.name, files: c.files }], pairExists).length;
    const ok = got === c.expect;
    if (!ok) failed++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${c.name} (expected ${c.expect}, got ${got})`);
  }
  // The allowlist must SUPPRESS, or it is decoration.
  const suppressed = oneSidedEdits(
    [{ sha: '1a04f031', subject: 'allowed', files: ['reference/a.es.md'] }], pairExists).length;
  let ok = suppressed === 0;
  if (!ok) failed++;
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} an ALLOWED sha is suppressed (expected 0, got ${suppressed})`);

  // Range mode judges the NET effect. These two cases are the reason it exists: the
  // split-across-commits shape must PASS, and the never-mirrored shape must FAIL.
  const split = oneSidedInRange([
    { sha: 'aaaaaaaa', subject: 'edit EN', files: ['reference/a.md'] },
    { sha: 'bbbbbbbb', subject: 'mirror ES', files: ['reference/a.es.md'] },
  ], pairExists);
  ok = split.length === 0;
  if (!ok) failed++;
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} EN and ES in SEPARATE commits of one range passes (expected 0, got ${split.length})`);

  const never = oneSidedInRange([
    { sha: 'cccccccc', subject: 'edit EN', files: ['reference/a.md'] },
    { sha: 'dddddddd', subject: 'unrelated', files: ['src/x.ts'] },
  ], pairExists);
  ok = never.length === 1;
  if (!ok) failed++;
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} a range that never mirrors is caught (expected 1, got ${never.length})`);

  if (failed > 0) fail([`${failed} self-test case(s) failed — the guard does not detect what it claims.`]);
  console.log(`\n\x1b[32m✓\x1b[0m ${GUARD}: self-test passed (8 cases).`);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) return selfTest();

  // What a PR introduces is the thing worth blocking on. Scoping to the branch's own
  // range keeps historical one-sided commits out of every future PR's way — a guard
  // that fails for something the author did not do is one people learn to skip.
  // `--audit` sweeps the last 400 instead, for asking the question of the repo itself.
  const sinceIdx = argv.indexOf('--since');
  let range = sinceIdx !== -1 ? `${argv[sinceIdx + 1]}..HEAD` : null;
  if (!range && !argv.includes('--audit')) {
    for (const base of ['origin/develop', 'origin/main']) {
      try {
        git(['rev-parse', '--verify', '--quiet', base]);
        range = `${base}..HEAD`;
        break;
      } catch { /* base not present locally; fall through to the sweep */ }
    }
  }
  const args = ['log', '--name-only', '--pretty=format:@@%H|%s'];
  if (range) args.push(range);
  else args.push('-400');

  // An empty PR range is legitimate (a branch level with its base), and is NOT the
  // shallow-clone failure `assertScanned` guards against. Say so and stop.
  if (range) {
    const probe = parseLog(git(args));
    if (probe.length === 0) {
      console.log(`\x1b[32m✓\x1b[0m ${GUARD}: ${range} contains no commits — nothing to check.`);
      return;
    }
  }

  const commits = parseLog(git(args));

  // A range that resolves to nothing would otherwise report a clean pass over an
  // empty corpus — the exact shape GT-557 exists to stop.
  assertScanned(commits.length, {
    what: `commits in ${range ?? 'the last 400'}`,
    // A shallow clone is the realistic way this goes empty: `fetch-depth: 1` leaves
    // one commit and the guard would report a clean pass over a history it cannot see.
    where: [`git log ${range ?? '-400'} (repo root ${REPO_ROOT})`],
  });

  const pairExists = (en, es) =>
    existsSync(path.join(REPO_ROOT, en)) && existsSync(path.join(REPO_ROOT, es));

  const tail = [
    '',
    'Both halves are the record of truth; correcting one leaves the other asserting',
    'the thing you just refuted. Mirror the change, or — if the edit is genuinely',
    'one-sided — add the sha to ALLOWED in this file WITH its reason.',
  ];

  if (range) {
    const offenders = oneSidedInRange(commits, pairExists);
    if (offenders.length > 0) {
      fail([
        `${offenders.length} bilingual pair(s) moved on one side only across ${range}.`,
        '',
        ...offenders.map((o) => `    ${o}`),
        ...tail,
      ]);
    }
    console.log(
      `\x1b[32m✓\x1b[0m ${GUARD}: ${commits.length} commit(s) in ${range}, no pair left half-updated.`,
    );
    return;
  }

  const violations = oneSidedEdits(commits, pairExists);
  if (violations.length > 0) {
    fail([
      `${violations.length} commit(s) changed ONE side of a bilingual pair.`,
      '',
      ...violations.flatMap((v) => [`${v.sha}  ${v.subject}`, ...v.offenders.map((o) => `    ${o}`)]),
      ...tail,
    ]);
  }

  console.log(`\x1b[32m✓\x1b[0m ${GUARD}: ${commits.length} commit(s) scanned, no one-sided bilingual edits.`);
}

// realpathSync, not resolve: on macOS `/tmp` is a symlink to `/private/tmp`, so a
// guard invoked through a symlinked path compares two spellings of the same file,
// decides it was imported rather than run, and EXITS 0 HAVING CHECKED NOTHING. Found
// by staging this file under /tmp to test it — the silent-pass it produces is exactly
// the failure `assertScanned` exists to prevent, one level up.
const real = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return path.resolve(p);
  }
};
const invokedDirectly =
  process.argv[1] && real(process.argv[1]) === real(fileURLToPath(import.meta.url));
if (invokedDirectly) main();
