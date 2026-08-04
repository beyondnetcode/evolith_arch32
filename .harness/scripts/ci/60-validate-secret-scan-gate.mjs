#!/usr/bin/env node

/**
 * GT-653 — the secret scan must be able to fail, and be seen failing.
 *
 * ## The defect
 *
 * `Secret Detection (gitleaks)` shipped as a job that could not stop anything.
 * It carried `continue-on-error: true` and was absent from the required contexts
 * on `main` and `develop`, so a leak produced a red tick that no gate consulted.
 * Separately it used `gitleaks/gitleaks-action@v2`, which requires an org licence
 * read from `secrets.GITLEAKS_LICENSE` — and Dependabot-triggered runs resolve
 * `secrets.*` against the Dependabot store, which was empty. The licence arrived
 * blank and the step failed before scanning, on every Dependabot pull request.
 *
 * The two halves hid each other. On human branches the job was green, so the
 * surface read as covered; the failure was confined to the one change class
 * written by an automated external actor. And because the job was
 * `continue-on-error`, a permanently failing scan was indistinguishable from a
 * scan nobody had wired up. Five Dependabot pull requests merged on 2026-08-03
 * with the check red and nothing objected — correctly, because nothing was
 * listening.
 *
 * ## What it checks
 *
 * Three properties, each pinned because each was individually absent:
 *
 *   1. **The job cannot be re-disarmed.** No `continue-on-error` on the job or
 *      any of its steps. Removing it once is a commit; keeping it removed is
 *      this assertion.
 *   2. **It does not depend on a licence.** No reference to `GITLEAKS_LICENSE`
 *      and no use of `gitleaks/gitleaks-action`, so the Dependabot store being
 *      empty cannot disable the scan again.
 *   3. **The command actually blocks.** The gitleaks invocation is EXTRACTED
 *      from the workflow and run against two sandboxes: one carrying a planted
 *      credential, which must exit non-zero, and one clean, which must exit 0.
 *
 * Property 3 is the point of the file. A green scan proves nothing on its own —
 * a scanner aimed at an empty directory is green too — and this repository has
 * already shipped one gate that could not fail (`GT-443`, the chaos drill whose
 * asserts were never armed). The command is read out of the YAML rather than
 * restated here, so a workflow edit that weakens the flags is exercised by this
 * guard instead of being described by it.
 *
 * ## The clean half is not decoration
 *
 * A gate wedged permanently red gets routed around within a week — which is the
 * whole history of the job this replaces. Asserting the clean sandbox exits 0
 * costs one more invocation and is what distinguishes "blocks leaks" from
 * "blocks everything".
 *
 * ## Anti-vacuous pass
 *
 * Zero fixtures exercised is a hard failure through `assertScanned`: a sandbox
 * that failed to materialise must not read as "the gate blocks". A missing
 * gitleaks binary is likewise an error and never a skip — unable to answer is
 * not the same as nothing to report, and a guard that quietly skips is how the
 * original hole survived.
 *
 * USAGE
 *   node .harness/scripts/ci/60-validate-secret-scan-gate.mjs
 *   node .harness/scripts/ci/60-validate-secret-scan-gate.mjs --verbose
 *
 * EXIT CODES
 *   0  the job is armed, licence-free, and observed rejecting a planted secret
 *   1  a disarmed job, a licence dependency, or a gate that did not block
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import yaml from 'js-yaml';

import { findRepoRoot } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';

const GUARD = '60-validate-secret-scan-gate';

export const WORKFLOW = '.github/workflows/sdk-cli-ci.yml';
export const JOB_ID = 'secret-detection';

/**
 * A key-SHAPED string that exists only in a temp file, never on disk here. It
 * is assembled from fragments so this file does not itself become a finding —
 * the scanner would otherwise flag the guard that proves the scanner works.
 *
 * It is deliberately NOT `AKIAIOSFODNN7EXAMPLE`. That is the canonical AWS
 * documentation key and gitleaks carries it as a stopword, so planting it
 * produced a green scan and a guard that certified a gate it had never seen
 * block. Measured, not assumed: the canonical example exits 0, this shape
 * exits 1. A fixture the scanner is built to ignore is not a fixture.
 */
export function plantedSecret() {
  return ['AKIA', 'QYTZ4NB7', 'XKLM2WVD'].join('');
}

/**
 * Pull the gitleaks command out of the workflow rather than restating it.
 *
 * Restating it is the failure this guard is meant to survive: the two copies
 * drift, the workflow loses `--exit-code 1`, and the guard goes on proving that
 * a command nobody runs would have blocked.
 */
export function extractScanCommand(workflowYaml, { jobId = JOB_ID } = {}) {
  const doc = yaml.load(workflowYaml);
  const job = doc?.jobs?.[jobId];
  if (!job) throw new Error(`${GUARD}: job "${jobId}" not found in ${WORKFLOW}`);

  const steps = Array.isArray(job.steps) ? job.steps : [];
  const commands = steps
    .map((step) => step?.run)
    .filter((run) => typeof run === 'string')
    .flatMap((run) => run.split('\n'))
    .map((line) => line.trim())
    .filter((line) => /^gitleaks\s+(dir|detect|git)\b/.test(line));

  if (commands.length !== 1) {
    throw new Error(
      `${GUARD}: expected exactly one gitleaks scan command in job "${jobId}", found ${commands.length}. ` +
        'The guard runs the workflow\'s own command; two of them means it would exercise the wrong one.',
    );
  }
  return commands[0];
}

/**
 * The disarming patterns, each named after what it would silently restore.
 */
export function findDisarms(workflowYaml, { jobId = JOB_ID } = {}) {
  const doc = yaml.load(workflowYaml);
  const job = doc?.jobs?.[jobId];
  if (!job) throw new Error(`${GUARD}: job "${jobId}" not found in ${WORKFLOW}`);

  const problems = [];

  if (job['continue-on-error']) {
    problems.push(
      `job "${jobId}" carries continue-on-error — its verdict would reach no gate, which is the defect GT-653 records`,
    );
  }

  const steps = Array.isArray(job.steps) ? job.steps : [];
  for (const [i, step] of steps.entries()) {
    if (step?.['continue-on-error']) {
      problems.push(`step ${i + 1} (${step.name ?? 'unnamed'}) carries continue-on-error`);
    }
    if (typeof step?.uses === 'string' && step.uses.startsWith('gitleaks/gitleaks-action')) {
      problems.push(
        `step ${i + 1} uses gitleaks/gitleaks-action, which requires an org licence — the Dependabot secret store is separate and empty, so the scan would fail before scanning on every Dependabot pull request`,
      );
    }
  }

  // Comments are stripped first. The job's own header EXPLAINS why the licence
  // is gone, and a raw substring match failed on that explanation — a guard that
  // fires on its own documentation gets the documentation deleted, not the
  // defect fixed.
  const executable = workflowYaml
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');
  if (/GITLEAKS_LICENSE/.test(executable)) {
    problems.push(
      'the workflow still references GITLEAKS_LICENSE outside a comment — the scanner binary is MIT and needs no licence; the reference can only reintroduce the Dependabot blind spot',
    );
  }

  const scanLine = extractScanCommand(workflowYaml, { jobId });
  if (!/--exit-code\s+1\b/.test(scanLine)) {
    problems.push(`the scan command does not pass --exit-code 1, so a finding is a log line: ${scanLine}`);
  }

  return problems;
}

/** Materialise a sandbox and run the workflow's command inside it. */
function runAgainstSandbox(command, { planted }) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'gt653-')));
  try {
    fs.writeFileSync(
      path.join(dir, 'config.env'),
      planted ? `AWS_ACCESS_KEY_ID=${plantedSecret()}\n` : 'AWS_REGION=us-east-1\n',
    );
    // The command scans `.`; the sandbox is the cwd, so it scans the sandbox.
    const result = spawnSync('sh', ['-c', command], { cwd: dir, encoding: 'utf8' });
    if (result.error) throw result.error;
    return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function main(argv = process.argv.slice(2)) {
  const verbose = argv.includes('--verbose');
  // Marker-based ascent, not cwd: guard 43 spawns every guard from a sandbox,
  // and a cwd-derived root would make this one answer about the wrong tree.
  const root = findRepoRoot();
  const workflowPath = path.join(root, WORKFLOW);

  if (!fs.existsSync(workflowPath)) {
    console.error(`✗ ${GUARD}: ${WORKFLOW} not found. The gate cannot be verified, which is not the same as passing.`);
    process.exit(1);
  }
  const workflowYaml = fs.readFileSync(workflowPath, 'utf8');

  const probe = spawnSync('gitleaks', ['version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    console.error(
      `✗ ${GUARD}: gitleaks is not on PATH. This guard runs the scanner; without it the answer is unknown, and unknown is not a pass.\n` +
        '    CI installs it in the same job. Locally: brew install gitleaks',
    );
    process.exit(1);
  }

  const problems = findDisarms(workflowYaml);
  const command = extractScanCommand(workflowYaml);

  const fixtures = [
    { name: 'planted credential', planted: true, mustBlock: true },
    { name: 'clean tree', planted: false, mustBlock: false },
  ];

  const results = [];
  for (const fixture of fixtures) {
    const run = runAgainstSandbox(command, fixture);
    const blocked = run.status !== 0;
    results.push({ ...fixture, status: run.status, blocked });

    if (fixture.mustBlock && !blocked) {
      problems.push(
        `the gate did NOT block a planted ${plantedSecret().slice(0, 4)}… credential (exit ${run.status}). ` +
          `A scan that cannot fail is a report: ${command}`,
      );
    }
    if (!fixture.mustBlock && blocked) {
      problems.push(
        `the gate rejected a CLEAN tree (exit ${run.status}). A gate wedged red gets routed around, which is how the original hole survived.\n${run.stdout}${run.stderr}`,
      );
    }
  }

  assertScanned(results.length, {
    what: 'secret-scan fixtures',
    where: [WORKFLOW],
  });

  console.log(`${GUARD} — the secret scan must be able to fail`);
  console.log(`  workflow ........... ${WORKFLOW} · job "${JOB_ID}"`);
  console.log(`  scanner ............ ${probe.stdout.trim()}`);
  console.log(`  command ............ ${command}`);
  console.log(`  fixtures exercised . ${results.length}`);
  if (verbose) {
    for (const r of results) {
      console.log(`    • ${r.name.padEnd(20)} exit ${r.status} — ${r.blocked ? 'blocked' : 'allowed'} (expected ${r.mustBlock ? 'blocked' : 'allowed'})`);
    }
  }

  if (problems.length > 0) {
    console.error(`\n✗ ${GUARD}: ${problems.length} problem(s) with the secret-detection gate:\n`);
    for (const p of problems) console.error(`  • ${p}`);
    console.error('\n  Context: reference/core/control-center/gaps/gap-reference-catalog.md#gt-653');
    process.exit(1);
  }

  console.log(`\n✓ ${GUARD}: the gate is armed, licence-free, and observed rejecting a planted credential.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
