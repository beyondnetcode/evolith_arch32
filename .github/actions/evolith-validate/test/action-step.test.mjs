/**
 * GT-577 — hermetic regression test for the `evolith-validate` composite action.
 *
 * The action is shell inside YAML, so nothing typechecks it and, until this
 * test existed, nothing executed it either: it read `.summary.violations` from
 * a report whose envelope has no `.summary`, and every run rendered
 * "Non-compliant -- 0 violation(s) found" while still (correctly) failing the
 * job. The counter was wrong for as long as the action existed because no
 * workflow ran it.
 *
 * What this test does: it lifts the REAL `run:` scripts out of action.yml and
 * executes them with bash exactly as GitHub would (`bash --noprofile --norc
 * -eo pipefail`), substituting the `inputs` context into the step's own `env:`
 * map, with a stub CLI that emits recorded envelopes captured from
 * `evolith-cli validate --format json`. It therefore fails if the jq path, the
 * output wiring, the exit-code propagation or the summary text regress.
 *
 * Run it with:  node --test .github/actions/evolith-validate/test/
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * The YAML parser comes from whatever the monorepo already installs (`yaml`
 * today, `js-yaml` as a fallback): this test must not add a dependency just to
 * read a 200-line action manifest.
 */
const parseYaml = (() => {
  try {
    const mod = require('yaml');
    return (src) => mod.parse(src);
  } catch {
    /* fall through */
  }
  try {
    const mod = require('js-yaml');
    return (src) => mod.load(src);
  } catch {
    throw new Error('neither `yaml` nor `js-yaml` is installed; run `npm ci` at the repository root');
  }
})();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ACTION_DIR = path.resolve(HERE, '..');
const ACTION_YML = path.join(ACTION_DIR, 'action.yml');
const FIXTURES = path.join(HERE, 'fixtures');
const STUB_CLI = path.join(FIXTURES, 'stub-cli.sh');

const action = parseYaml(readFileSync(ACTION_YML, 'utf8'));
const steps = action.runs.steps;
const validateStep = steps.find((s) => s.id === 'validate');
const summaryStep = steps.find((s) => s.name === 'Write governance summary');

/** Resolves `${{ inputs.foo }}` / `${{ steps.validate.outputs.bar }}` in a step's env map. */
function resolveEnv(envMap, { inputs = {}, outputs = {} }) {
  const resolved = {};
  for (const [key, raw] of Object.entries(envMap ?? {})) {
    resolved[key] = String(raw).replace(/\$\{\{\s*([^}]+?)\s*\}\}/g, (_m, expr) => {
      const asInput = /^inputs\.([\w-]+)$/.exec(expr);
      if (asInput) return String(inputs[asInput[1]] ?? action.inputs[asInput[1]]?.default ?? '');
      const asOutput = /^steps\.validate\.outputs\.([\w-]+)$/.exec(expr);
      if (asOutput) return String(outputs[asOutput[1]] ?? '');
      throw new Error(`unsupported expression in env: ${expr}`);
    });
  }
  return resolved;
}

/** Executes a composite step's `run:` body the way the Actions bash shell does. */
function runStep(step, { inputs = {}, outputs = {}, extraEnv = {} } = {}) {
  const work = mkdtempSync(path.join(tmpdir(), 'gt577-'));
  const githubOutput = path.join(work, 'github_output');
  const stepSummary = path.join(work, 'step_summary');
  execFileSync('touch', [githubOutput, stepSummary]);

  const result = spawnSync(
    'bash',
    ['--noprofile', '--norc', '-eo', 'pipefail', '-c', step.run],
    {
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        RUNNER_TEMP: work,
        GITHUB_OUTPUT: githubOutput,
        GITHUB_STEP_SUMMARY: stepSummary,
        ...resolveEnv(step.env, { inputs, outputs }),
        ...extraEnv,
      },
    },
  );

  const parsedOutputs = Object.fromEntries(
    readFileSync(githubOutput, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx), line.slice(idx + 1)];
      }),
  );

  return {
    exitCode: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    outputs: parsedOutputs,
    summary: readFileSync(stepSummary, 'utf8'),
  };
}

function runValidate({ fixture, cliExit, failOnViolation = 'true', satellite = '.' }) {
  return runStep(validateStep, {
    inputs: {
      'satellite-path': satellite,
      'cli-command': `bash ${STUB_CLI}`,
      'fail-on-violation': failOnViolation,
    },
    extraEnv: {
      STUB_FIXTURE: fixture ? path.join(FIXTURES, fixture) : '',
      STUB_EXIT: String(cliExit),
    },
  });
}

/** Independent oracle: count blocking issues in the fixture with plain JS. */
function expectedCounts(fixture) {
  const envelope = JSON.parse(readFileSync(path.join(FIXTURES, fixture), 'utf8'));
  const issues = envelope?.data?.issues ?? [];
  return {
    blocking: issues.filter((i) => i.blocking === true).length,
    total: issues.length,
  };
}

describe('evolith-validate composite action', () => {
  test('the step scripts are executable outside Actions (no inline ${{ }})', () => {
    assert.ok(validateStep, 'action.yml must keep a step with id: validate');
    assert.ok(summaryStep, 'action.yml must keep the summary step');
    for (const step of [validateStep, summaryStep]) {
      assert.equal(
        /\$\{\{/.test(step.run),
        false,
        `step "${step.name}" interpolates an Actions expression into its script body; ` +
          'pass inputs through env: so the script stays testable and injection-free',
      );
    }
    assert.ok(existsSync(STUB_CLI), 'stub CLI fixture is missing');
  });

  test('GT-577: a non-conforming satellite reports a NON-ZERO blocking count', () => {
    const { blocking, total } = expectedCounts('envelope-noncompliant.json');
    // Recorded from a real `evolith-cli validate --format json` run against the
    // deliberately non-conforming satellite fixture.
    assert.equal(blocking, 31);
    assert.equal(total, 36);

    const run = runValidate({ fixture: 'envelope-noncompliant.json', cliExit: 1 });

    assert.equal(run.outputs['violations-count'], String(blocking));
    assert.notEqual(run.outputs['violations-count'], '0');
    assert.equal(run.outputs['issues-count'], String(total));
    assert.equal(run.outputs['compliance-status'], 'non-compliant');
    // The gate itself must keep blocking.
    assert.equal(run.exitCode, 1);
  });

  test('the job summary renders the real count, not "0 violation(s)"', () => {
    const validate = runValidate({ fixture: 'envelope-noncompliant.json', cliExit: 1 });
    const summary = runStep(summaryStep, {
      inputs: { 'satellite-path': '.', 'cli-command': `bash ${STUB_CLI}` },
      outputs: validate.outputs,
    });

    assert.match(summary.summary, /31 blocking violation\(s\) of 36 issue\(s\) found/);
    assert.equal(/-- 0 violation\(s\) found/.test(summary.summary), false);
    assert.equal(summary.exitCode, 0);
  });

  test('fail-on-violation=false surfaces the count without failing the job', () => {
    const run = runValidate({
      fixture: 'envelope-noncompliant.json',
      cliExit: 1,
      failOnViolation: 'false',
    });

    assert.equal(run.exitCode, 0);
    assert.equal(run.outputs['violations-count'], '31');
    assert.equal(run.outputs['compliance-status'], 'non-compliant');
  });

  test('a compliant satellite reports zero and passes', () => {
    const run = runValidate({ fixture: 'envelope-compliant.json', cliExit: 0 });

    assert.equal(run.exitCode, 0);
    assert.equal(run.outputs['compliance-status'], 'compliant');
    assert.equal(run.outputs['violations-count'], '0');
    assert.equal(run.outputs['issues-count'], '0');
  });

  test('advisory-only issues are not counted as violations', () => {
    const run = runValidate({ fixture: 'envelope-advisory-only.json', cliExit: 0 });

    assert.equal(run.outputs['violations-count'], '0');
    assert.equal(run.outputs['issues-count'], '2');
    assert.equal(run.outputs['compliance-status'], 'compliant');
  });

  test('keys added to the envelope do not move the counter', () => {
    const { blocking, total } = expectedCounts('envelope-extra-keys.json');
    const run = runValidate({ fixture: 'envelope-extra-keys.json', cliExit: 1 });

    // The fixture carries a decoy `data.summary.violations: 999` plus extra
    // top-level, data, issue and meta keys: the expression must depend only on
    // `data.issues[].blocking`.
    assert.equal(run.outputs['violations-count'], String(blocking));
    assert.equal(run.outputs['issues-count'], String(total));
    assert.equal(run.outputs['violations-count'], '2');
  });

  test('an error envelope is handled without crashing, and the summary says so', () => {
    const validate = runValidate({ fixture: 'envelope-error.json', cliExit: 1 });

    assert.equal(validate.exitCode, 1);
    assert.equal(validate.outputs['violations-count'], '0');
    assert.equal(validate.outputs['compliance-status'], 'non-compliant');

    const summary = runStep(summaryStep, {
      inputs: { 'satellite-path': '.' },
      outputs: validate.outputs,
    });
    assert.match(summary.summary, /see the validation log/);
    assert.equal(/0 blocking violation\(s\)/.test(summary.summary), false);
  });

  test('a run that produced no report degrades safely', () => {
    const run = runValidate({ fixture: '', cliExit: 1 });

    assert.equal(run.exitCode, 1);
    assert.equal(run.outputs['violations-count'], '0');
    assert.equal(run.outputs['issues-count'], '0');
    assert.equal(run.outputs['compliance-status'], 'non-compliant');
  });

  test('a stale report from a previous step is not counted', () => {
    // The step writes to ${RUNNER_TEMP}/evolith-report.json; two runs in one
    // job must not let the first report answer for the second.
    const work = mkdtempSync(path.join(tmpdir(), 'gt577-stale-'));
    const stale = path.join(work, 'evolith-report.json');
    execFileSync('cp', [path.join(FIXTURES, 'envelope-noncompliant.json'), stale]);

    const githubOutput = path.join(work, 'github_output');
    execFileSync('touch', [githubOutput]);
    const result = spawnSync(
      'bash',
      ['--noprofile', '--norc', '-eo', 'pipefail', '-c', validateStep.run],
      {
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          RUNNER_TEMP: work,
          GITHUB_OUTPUT: githubOutput,
          ...resolveEnv(validateStep.env, {
            inputs: { 'cli-command': `bash ${STUB_CLI}`, 'fail-on-violation': 'false' },
          }),
          STUB_FIXTURE: '',
          STUB_EXIT: '1',
        },
      },
    );

    const outputs = Object.fromEntries(
      readFileSync(githubOutput, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
    );
    assert.equal(result.status, 0);
    assert.equal(outputs['violations-count'], '0');
  });

  test('the npm install step is skipped when a local CLI command is given', () => {
    const installStep = steps.find((s) => String(s.name).startsWith('Install @beyondnet'));
    assert.ok(installStep, 'install step is missing');
    assert.match(String(installStep.if), /inputs\.cli-command\s*==\s*''/);
  });
});
