#!/usr/bin/env node

/**
 * GT-585 — turn "hand-label a set of real diffs" into "fill in one column".
 *
 * ## Why this exists
 *
 * `evolith calibrate report --labels <path>` has existed since 2026-08-02 and has
 * never been run on anything, because the corpus it needs does not exist. The
 * organic source of labels — a human overriding a gate, recorded by the Tracker —
 * waits on GT-435/GT-448, and waiting is how a false-block rate stays unmeasured
 * for another year. This produces the UNLABELLED half mechanically, so the only
 * thing left is the part that genuinely requires a person.
 *
 * ## What a subject is, and what it is not
 *
 * A subject is a MERGED PULL REQUEST of this repository, evaluated at its merge
 * commit. Real changes that real people made and reviewed, which is what the
 * criterion asks for.
 *
 * **The merge is NOT a label.** "It merged, so blocking it was wrong" is the
 * tempting shortcut and it is false: a change can be correctly blocked and then
 * fixed. Merge status appears here only as a triage hint for which rows a human
 * should adjudicate first, never as `humanBlocked`.
 *
 * ## Two things this separates that would otherwise be averaged together
 *
 * 1. **`did-not-run` is not a calibration row.** Measured on 2026-08-08: of 96
 *    blocking outcomes on this repository, **78 were `blocking: true` rules that
 *    could not execute** — the engine reporting that it could not check, not a
 *    judgement about the change. Averaging those into a false-block rate produces
 *    a number that mostly measures rule COVERAGE while looking like it measures
 *    rule CORRECTNESS. They are written to a separate file, counted, and never
 *    silently dropped.
 *
 * 2. **Clean checkouts, not a developer's tree.** The same commit yields 227
 *    rules checked on a working tree with `dist/` and `node_modules` present and
 *    **94** on a fresh checkout, because many rules read build artifacts. CI
 *    evaluates fresh checkouts, so the corpus is built in throwaway worktrees.
 *    A corpus built on a developer's tree would calibrate a gate nobody runs.
 *
 * USAGE
 *   node .harness/scripts/build-calibration-corpus.mjs --prs 40 --out .harness/evidence/calibration
 *   node .harness/scripts/build-calibration-corpus.mjs --prs 5 --dry-run
 *
 * OUTPUT
 *   <out>/labels.todo.jsonl     rows to adjudicate: humanBlocked is null
 *   <out>/did-not-run.jsonl     blocking rules that could not execute (NOT calibration)
 *   <out>/corpus-summary.json   denominators, so the sheet can never be read without them
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const CLI = path.join(REPO_ROOT, 'node_modules/.bin/evolith');

function arg(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
}
const PR_COUNT = Number(arg('--prs', '20'));
const OUT_DIR = path.resolve(REPO_ROOT, arg('--out', '.harness/evidence/calibration'));
const DRY_RUN = process.argv.includes('--dry-run');

function die(lines) {
  console.error(`\n✗ build-calibration-corpus: ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(`  ${l}`);
  process.exit(1);
}

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'], ...opts,
  });
}

/**
 * Merged pull requests SPREAD ACROSS HISTORY, with the merge commit to evaluate at.
 *
 * The spread is the whole point and was learned the hard way. The first version
 * took the N most recent merged PRs and produced a corpus with NO variance: the
 * same eight rule ids blocked all five subjects, because this gate evaluates the
 * state of the repository and adjacent merges barely change it. 415 rows carrying
 * 8 distinct judgements is not a corpus, it is the same question asked five times.
 *
 * Sampling across history fixes it, and the fix was measured before being written.
 * Today's rulesets applied to the repository at six points between 2026-05-07 and
 * 2026-06-10 return DIFFERENT blocking sets, and the set as a whole turned over
 * completely by August: `CB-01..CB-05, CB-VAL-01, GIT-08, GOV-000, MTN-05` then,
 * `DEP-10, MM-R01, MM-R03..MM-R09, TAX-01, TAX-05` now. The core is held constant
 * (`--core` always points at this checkout), so that variation comes from the
 * subject and not from the rules changing underneath it — which is what makes it
 * calibration signal rather than an artefact.
 *
 * Dependabot is excluded: a lockfile bump is a real change but not one a human
 * ever judged on its merits, and padding the corpus with them would inflate the
 * denominator with rows nobody can honestly adjudicate.
 */
function mergedPullRequests(limit) {
  const raw = sh('gh', [
    'pr', 'list', '--state', 'merged', '--limit', '1000',
    '--json', 'number,title,mergeCommit,author,mergedAt',
  ]);
  const all = JSON.parse(raw);
  const human = all
    .filter((pr) => !/dependabot/i.test(pr.author?.login ?? ''))
    .filter((pr) => pr.mergeCommit?.oid)
    .sort((a, b) => String(a.mergedAt).localeCompare(String(b.mergedAt)));

  if (human.length === 0) {
    die(['no merged pull requests found, so there is nothing to evaluate.',
      'A corpus of zero subjects must not be written as if it were a corpus.']);
  }
  if (human.length <= limit) return human;

  // Even stride over the whole timeline, oldest to newest, endpoints included.
  const step = (human.length - 1) / (limit - 1);
  const picked = [];
  for (let i = 0; i < limit; i += 1) picked.push(human[Math.round(i * step)]);
  return [...new Map(picked.map((pr) => [pr.number, pr])).values()];
}

/** Evaluate one commit in a throwaway worktree. Returns the ADR-0073 `data` payload. */
function evaluateAt(sha, index) {
  const wt = path.join(OUT_DIR, `.wt-${index}`);
  fs.rmSync(wt, { recursive: true, force: true });
  sh('git', ['worktree', 'add', '-q', '--detach', wt, sha]);
  try {
    let raw;
    try {
      // The CLI exits non-zero when the gate blocks, which is the normal case here.
      raw = sh(CLI, ['validate', '--satellite', wt, '--core', REPO_ROOT, '--format', 'json']);
    } catch (error) {
      raw = error.stdout;
    }
    if (!raw || !raw.trim()) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ?? null;
  } finally {
    sh('git', ['worktree', 'remove', '--force', wt], { stdio: 'ignore' });
  }
}

/**
 * The rule ids the engine actually EXECUTED at this subject.
 *
 * Derived by subtraction, because the payload reports the non-executed sets by id
 * and the executed ones only as a count. The corpus id list comes from the
 * rulesets on disk, so a rule that exists but is never mentioned anywhere in the
 * payload is visible rather than assumed away.
 */
function executedRuleIds(data, corpusIds) {
  const notExecuted = new Set([
    ...(data.skippedRuleIds ?? []),
    ...(data.notApplicableRuleIds ?? []),
    ...(data.nonExecutableRuleIds ?? []),
    ...(data.erroredRuleIds ?? []),
  ]);
  return corpusIds.filter((id) => !notExecuted.has(id));
}

/** Every rule id declared by the ruleset corpus on disk. */
function corpusRuleIds() {
  const ids = new Set();
  const root = path.join(REPO_ROOT, 'src/rulesets');
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.rules.json')) continue;
      let doc;
      try { doc = JSON.parse(fs.readFileSync(full, 'utf8')); } catch { continue; }
      for (const rule of doc?.rules ?? []) if (rule?.id) ids.add(rule.id);
    }
  };
  walk(root);
  if (ids.size === 0) {
    die(['parsed 0 rule ids from src/rulesets, so every subject would report every rule as executed.',
      'An empty corpus must stop the run, never read as "nothing to exclude".']);
  }
  return [...ids].sort();
}

/**
 * Expand an adjudicated judgement sheet into the per-row labels the report reads.
 *
 * A judgement is per RULE; the report counts per ROW, because a rule that wrongly
 * blocks 27 subjects is 27 false blocks and the rate has to say so. Propagation is
 * only sound while the rule blocked for the SAME reason each time, which is why
 * every expanded row keeps `expandedFrom` — a reader can always get back to the
 * one human decision that produced it, and disagree with it in one place.
 *
 * Clean rows are carried through as `humanBlocked: false` ONLY when the sheet says
 * so explicitly for their rule; a rule nobody adjudicated is dropped, never
 * defaulted. An unadjudicated row entered as a true negative drifts every figure.
 */
function applyJudgements(judgementsPath) {
  const rows = fs.readFileSync(path.join(OUT_DIR, 'labels.todo.jsonl'), 'utf8')
    .trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const judgements = fs.readFileSync(path.resolve(REPO_ROOT, judgementsPath), 'utf8')
    .trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

  const unadjudicated = judgements.filter((j) => typeof j.humanBlocked !== 'boolean');
  if (unadjudicated.length > 0) {
    die([
      `${unadjudicated.length} of ${judgements.length} judgement(s) still have humanBlocked: null.`,
      `  ${unadjudicated.map((j) => j.rulesetId).join(', ')}`,
      '',
      '  A partially adjudicated sheet must not be expanded. The missing rules would',
      '  simply vanish from the figures, which reads as agreement rather than as the',
      '  silence it is.',
    ]);
  }

  const verdict = new Map(judgements.map((j) => [j.rulesetId, j.humanBlocked]));
  const labelled = rows
    .filter((r) => verdict.has(r.rulesetId))
    .map((r) => ({
      subject: r.subject,
      rulesetId: r.rulesetId,
      gateBlocked: r.gateBlocked,
      humanBlocked: verdict.get(r.rulesetId),
      expandedFrom: 'judgements.todo.jsonl',
    }));

  const out = path.join(OUT_DIR, 'labels.jsonl');
  fs.writeFileSync(out, labelled.map((r) => JSON.stringify(r)).join('\n') + '\n');
  console.log(`✓ expanded ${judgements.length} judgement(s) into ${labelled.length} label(s)`);
  console.log(`  dropped ${rows.length - labelled.length} row(s) whose rule was never adjudicated — dropped, not defaulted`);
  console.log(`\n  Now run:  ./node_modules/.bin/evolith calibrate report --labels ${path.relative(REPO_ROOT, out)}`);
  return 0;
}

function main() {
  const judgementsPath = arg('--apply-judgements');
  if (judgementsPath) return applyJudgements(judgementsPath);

  if (!fs.existsSync(CLI)) {
    die([`the CLI is not built at ${path.relative(REPO_ROOT, CLI)}.`,
      'Run `npm run build --workspace src/sdk/cli` first — an unbuilt CLI would',
      'produce an empty corpus that looks like a clean one.']);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const corpusIds = corpusRuleIds();
  const prs = mergedPullRequests(PR_COUNT);
  console.log(`build-calibration-corpus — ${prs.length} merged PR(s), ${corpusIds.length} rule id(s) in the corpus`);
  if (DRY_RUN) {
    for (const pr of prs) console.log(`  #${pr.number} ${pr.mergeCommit.oid.slice(0, 8)} ${pr.title.slice(0, 70)}`);
    return 0;
  }

  const toLabel = [];
  const didNotRun = [];
  const perSubject = [];

  prs.forEach((pr, index) => {
    const data = evaluateAt(pr.mergeCommit.oid, index);
    if (!data) {
      console.log(`  #${pr.number} — evaluation produced nothing; recorded as unevaluable, not as clean`);
      perSubject.push({ pr: pr.number, sha: pr.mergeCommit.oid, evaluated: false });
      return;
    }

    const subject = `PR-${pr.number}`;
    const blockingIssues = (data.issues ?? []).filter((i) => i.blocking === true);
    const nonExecutable = new Set([
      ...(data.blockingSkippedRuleIds ?? []),
      ...(data.blockingNonExecutableRuleIds ?? []),
    ]);

    // A blocking rule that could not run is a COVERAGE fact, not a calibration one.
    for (const ruleId of nonExecutable) {
      didNotRun.push({ subject, prNumber: pr.number, rulesetId: ruleId, reason: 'did-not-run' });
    }

    const blockedByViolation = new Set(
      blockingIssues.filter((i) => !nonExecutable.has(i.ruleId)).map((i) => i.ruleId),
    );
    const executed = executedRuleIds(data, corpusIds);

    for (const ruleId of executed) {
      // `humanBlocked: null` on purpose. The parser refuses a row without it rather
      // than defaulting to false, so an unadjudicated row cannot enter the figures
      // as a true negative.
      toLabel.push({
        subject,
        prNumber: pr.number,
        subjectUrl: `https://github.com/beyondnetcode/evolith_arch32/pull/${pr.number}`,
        rulesetId: ruleId,
        gateBlocked: blockedByViolation.has(ruleId),
        reason: blockedByViolation.has(ruleId) ? 'violation' : 'clean',
        humanBlocked: null,
      });
    }

    perSubject.push({
      pr: pr.number, sha: pr.mergeCommit.oid, evaluated: true,
      executed: executed.length,
      blockedByViolation: blockedByViolation.size,
      blockingCouldNotRun: nonExecutable.size,
      blockingSetKey: [...blockedByViolation].sort().join(","),
    });
    console.log(
      `  #${pr.number} — ${executed.length} executed, ${blockedByViolation.size} blocked on a violation, ` +
      `${nonExecutable.size} blocking rule(s) could not run`,
    );
  });

  const blocks = toLabel.filter((r) => r.gateBlocked).length;
  const summary = {
    generatedFor: 'GT-585',
    subjects: perSubject.length,
    subjectsEvaluated: perSubject.filter((s) => s.evaluated).length,
    rowsToLabel: toLabel.length,
    rowsBlocked: blocks,
    rowsClean: toLabel.length - blocks,
    distinctBlockingSets: new Set(perSubject.filter((s) => s.evaluated).map((s) => s.blockingSetKey)).size,
    didNotRunRows: didNotRun.length,
    corpusRuleIds: corpusIds.length,
    perSubject,
    caveats: [
      'humanBlocked is null on every row: nothing here is a label yet.',
      'Merge status is NOT a label. A change can be correctly blocked and then fixed.',
      'did-not-run rows are excluded from labels.todo.jsonl: a rule that never looked at the change cannot be adjudicated as a block, and averaging them into a false-block rate measures coverage while looking like it measures correctness.',
      'Subjects are evaluated in clean worktrees. The same commit yields materially more rules checked on a tree carrying dist/ and node_modules, and CI has neither.',
      'The human-to-human agreement ceiling is NOT measured by this corpus: secondHumanBlocked is absent, so a high kappa from these labels cannot be interpreted.',
    ],
  };

  const write = (name, rows) =>
    fs.writeFileSync(path.join(OUT_DIR, name), rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
  write('labels.todo.jsonl', toLabel);
  write('did-not-run.jsonl', didNotRun);

  // The sheet a person actually fills in.
  //
  // 30 subjects produced 260 blocking rows from TWENTY distinct rules: eight of
  // them block 27-28 of the 30, because they are standing conditions of the
  // repository rather than anything a given change did. Asking a human to
  // adjudicate 2413 rows when there are 20 judgements in them is how a corpus
  // goes unlabelled forever. One row per rule, with the count it stands for, so
  // the cost of a judgement is visible: saying MM-R01 blocks wrongly is 27 false
  // blocks in one keystroke, and that should be said deliberately.
  const judgements = [...new Set(toLabel.filter((r) => r.gateBlocked).map((r) => r.rulesetId))]
    .sort()
    .map((rulesetId) => {
      const rows = toLabel.filter((r) => r.gateBlocked && r.rulesetId === rulesetId);
      return {
        rulesetId,
        occurrences: rows.length,
        subjects: rows.map((r) => r.subject),
        humanBlocked: null,
        note: '',
      };
    });
  write('judgements.todo.jsonl', judgements);
  fs.writeFileSync(path.join(OUT_DIR, 'corpus-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  console.log(`\n✓ ${toLabel.length} row(s) to adjudicate (${blocks} blocked / ${toLabel.length - blocks} clean)`);
  console.log(`  ${didNotRun.length} did-not-run row(s) held separately — coverage, not calibration`);
  console.log(`  ${summary.distinctBlockingSets} distinct blocking set(s) across ${summary.subjectsEvaluated} subject(s)`);
  if (summary.distinctBlockingSets <= 1 && summary.subjectsEvaluated > 1) {
    console.log(
      `\n⚠️  Every subject produced the SAME blocking set, so this sheet carries one judgement\n` +
      `   repeated ${summary.subjectsEvaluated} times, not ${summary.subjectsEvaluated} judgements. A rate needs variation. Widen the\n` +
      `   spread (more --prs, or a repository whose state actually changed between them)\n` +
      `   before spending anyone's labelling time on it.`,
    );
  }
  console.log(`  written to ${path.relative(REPO_ROOT, OUT_DIR)}`);

  // The UNLABELLED sheet is regenerable and belongs in the ignored evidence tree.
  // The LABELLED one is not: it is hours of human judgement that exists nowhere
  // else, and `.harness/evidence/` is gitignored. Losing it to a `git clean` would
  // be the single most expensive mistake this corpus makes possible.
  if (OUT_DIR.includes(`${path.sep}.harness${path.sep}evidence${path.sep}`)) {
    console.log(
      `\n⚠️  ${path.relative(REPO_ROOT, OUT_DIR)} is GITIGNORED, which is right for the unlabelled sheet\n` +
      `   and wrong for a labelled one. Once \`humanBlocked\` is filled in, move the file\n` +
      `   somewhere tracked before committing — the labels are human judgement that\n` +
      `   exists nowhere else and a \`git clean\` would take them with it.`,
    );
  }
  return 0;
}

process.exit(main());
