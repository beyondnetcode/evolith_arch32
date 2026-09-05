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
import { ENTRY_SURFACE, isEntrySurface } from '../lib/bilingual-scope.mjs';

const GUARD = '66-validate-bilingual-sync';
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * Commits permitted to touch one side alone. EMPTY, and that is the design.
 *
 * It held three entries; all three are now cleared by `convergedAfter` instead — the
 * evidence that the other half moved, rather than a name on a list. The last one out
 * was `1a04f031`, an ES-only status-literal repair with no English counterpart to
 * change, and removing it is what exposed the limit documented on that function: its
 * pair is touched by 90 of the last 400 commits, so the "converged" verdict it earns
 * is traffic, not a mirror.
 *
 * That is why this stays empty rather than being deleted outright. A commit that is
 * genuinely and permanently one-sided — one whose counterpart will never move for any
 * reason — belongs here WITH its reason, because for that case the classifier has
 * nothing to observe. Nothing in this repository is currently in that position.
 */
const ALLOWED = new Map([]);

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
 * Did the pair CONVERGE after a one-sided edit?
 *
 * The per-commit view below asks "was this commit self-consistent", and for a REPAIR
 * the honest answer is no: mirroring a one-sided edit is itself one-sided. So the audit
 * sweep flagged `ba5fec8b` — the commit that fixed `0fb29909` by bringing the ES catalog
 * back in line — as a defect, when it is the cure. That was papered over with allowlist
 * entries, and the shape of that mistake is worth naming: a list that absorbs every
 * repair grows one entry per fix, forever, and each reads like a granted exception
 * rather than what it is — the guard unable to tell drift from its own remedy.
 *
 * `git log` returns newest-first, so a LOWER index is a LATER commit, and convergence
 * means the missing half moved AFTER the one-sided edit. A looser "touched anywhere in
 * the window" rule was written first and is wrong in a way only the negative test
 * showed: `gap-tracking.es.md` is touched by dozens of unrelated commits, so every
 * one-sided edit to its English half looked repaired — including one made deliberately
 * and never mirrored. A classifier that clears the case it exists to catch is worse
 * than no classifier.
 */
function convergedAfter(commits) {
  return (missingHalf, index) => {
    for (let i = 0; i < index; i++) if (commits[i].files.includes(missingHalf)) return true;
    return false;
  };
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
  // The allowlist must SUPPRESS, or it is decoration. It is EMPTY by design now, so
  // the case injects an entry rather than leaning on a live one — a mechanism that is
  // only exercised while some real commit happens to need it is a mechanism that
  // breaks unnoticed the moment the list is cleaned, which is exactly what happened
  // here the first time.
  ALLOWED.set('deadbeef', 'self-test only');
  const suppressed = oneSidedEdits(
    [{ sha: 'deadbeef', subject: 'allowed', files: ['reference/a.es.md'] }], pairExists).length;
  ALLOWED.delete('deadbeef');
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

  // ADR-0126: the narrowing itself, pinned against the REAL predicate rather than the
  // injected one. Every case above uses a fixture `pairExists` and would keep passing if
  // `isEntrySurface` were deleted from `main` — which is precisely the shape of change
  // that would silently re-widen the guard, so it gets its own assertions.
  const realScope = (en, es) => isEntrySurface(en) && Boolean(es);
  const inSurface = oneSidedInRange(
    [{ sha: 'eeeeeeee', subject: 'edit EN only', files: ['README.md'] }],
    realScope,
  );
  ok = inSurface.length === 1;
  if (!ok) failed++;
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} an ENTRY-SURFACE pair edited on one side is caught (expected 1, got ${inSurface.length})`);

  const released = oneSidedInRange(
    [{ sha: 'ffffffff', subject: 'edit EN only', files: ['reference/core/sdlc/q-and-a.md'] }],
    realScope,
  );
  ok = released.length === 0;
  if (!ok) failed++;
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} a pair OUTSIDE the entry surface is released (expected 0, got ${released.length})`);

  if (failed > 0) fail([`${failed} self-test case(s) failed — the guard does not detect what it claims.`]);
  console.log(`\n\x1b[32m✓\x1b[0m ${GUARD}: self-test passed (10 cases).`);
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

  // ADR-0126 narrows this guard to the entry surface. The scope test comes FIRST and is
  // the cheap one, so a range touching a thousand released pairs costs a set lookup each
  // rather than two stat() calls each.
  //
  // The narrowing is not only about cost. This guard's escape hatch is a commit-sha-keyed
  // ALLOWED map, and an outside contributor cannot populate it: the sha does not exist
  // until after they have committed, and editing this file to add it is not something a
  // first PR should have to do. Applied to 783 released pairs that hatch made the guard a
  // wall for exactly the people the project is trying to attract. Applied to seventeen
  // documents the maintainer edits deliberately, it is a reasonable ask.
  const pairExists = (en, es) =>
    isEntrySurface(en) &&
    existsSync(path.join(REPO_ROOT, en)) && existsSync(path.join(REPO_ROOT, es));

  const tail = [
    '',
    'Both halves are the record of truth; correcting one leaves the other asserting',
    'the thing you just refuted. Mirror the change, or — if the edit is genuinely',
    'one-sided — add the sha to ALLOWED in this file WITH its reason.',
    '',
    `Scope: the ${ENTRY_SURFACE.length}-document entry surface declared in`,
    '.harness/scripts/lib/bilingual-scope.mjs (ADR-0126). Pairs outside it are not checked.',
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
      `\x1b[32m✓\x1b[0m ${GUARD}: ${commits.length} commit(s) in ${range}, no ENTRY-SURFACE pair ` +
      `left half-updated (${ENTRY_SURFACE.length} document(s) in scope, ADR-0126). ` +
      `Pairs outside the surface were not examined.`,
    );
    return;
  }

  // Split per-commit findings by whether the pair converged afterwards. A repair is
  // one-sided BY CONSTRUCTION, so counting it as a defect makes the sweep permanently
  // red — which is what it was, unnoticed, because only range mode runs in CI.
  const converged = convergedAfter(commits);
  const open = [];
  const healed = [];
  for (const v of oneSidedEdits(commits, pairExists)) {
    const index = commits.findIndex((c) => c.sha === v.sha);
    const stillOpen = v.offenders.filter((o) => {
      const file = o.split(' ')[0];
      const en = englishHalf(file);
      const es = `${en.slice(0, -3)}.es.md`;
      // The half this commit did NOT touch is the one that must move later.
      return !converged(o.startsWith(en) ? es : en, index);
    });
    (stillOpen.length ? open : healed).push({ ...v, offenders: stillOpen.length ? stillOpen : v.offenders });
  }

  if (healed.length > 0) {
    console.log(`  ${healed.length} one-sided commit(s) CONVERGED afterwards (not defects):`);
    for (const v of healed) {
      const i = commits.findIndex((c) => c.sha === v.sha);
      const missing = v.offenders[0].split(' ')[0];
      const en = englishHalf(missing);
      const other = v.offenders[0].startsWith(en) ? `${en.slice(0, -3)}.es.md` : en;
      let gap = 0;
      for (let k = i - 1; k >= 0; k--) { gap++; if (commits[k].files.includes(other)) break; }
      console.log(`    ${v.sha}  +${gap} commit(s) later  ${v.subject}`);
    }
    // The distance is printed as CONTEXT, not as a signal — and that distinction was
    // measured, not assumed. The first version of this line claimed a small gap meant a
    // real mirror and a large one meant traffic. It does not: `gap-tracking.{md,es.md}`
    // is touched by 90 of the last 400 commits, so the expected gap to the next touch
    // is ~4 whatever the intent. `1a04f031` reports +3 and its +3 is `a63205ce`,
    // unrelated GT-647 work that happened to touch both halves.
    //
    // So CONVERGED means precisely one thing: the other half moved later, and the pair
    // was not left dangling. It does NOT mean the change was mirrored. On a
    // high-traffic pair no cheap test can tell those apart, and pretending otherwise
    // would put a confident label on a weak inference — which is the failure this
    // guard was written to stop, one level up.
    console.log('    (CONVERGED = the other half moved later, NOT that the edit was mirrored;');
    console.log('     on a pair touched every ~4 commits the distance is noise, not evidence)');
  }

  if (open.length > 0) {
    fail([
      `${open.length} commit(s) left a bilingual pair one-sided, and nothing after it mirrored the other half.`,
      '',
      ...open.flatMap((v) => [`${v.sha}  ${v.subject}`, ...v.offenders.map((o) => `    ${o}`)]),
      ...tail,
    ]);
  }

  console.log(
    `\x1b[32m✓\x1b[0m ${GUARD}: ${commits.length} commit(s) scanned, no one-sided edits to the ` +
    `${ENTRY_SURFACE.length}-document entry surface (ADR-0126). Pairs outside it were not examined.`,
  );
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
