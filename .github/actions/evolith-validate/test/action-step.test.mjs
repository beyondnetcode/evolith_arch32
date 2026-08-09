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
/**
 * GT-651: the manifest moved to the repository ROOT, because that is the only
 * place GitHub Marketplace reads one from. Its README, this test and the
 * fixtures stayed here — so this is the one path that had to follow it. Resolved
 * from `ACTION_DIR` rather than hard-coded so the relationship stays visible:
 * `.github/actions/evolith-validate/` → repository root.
 */
const REPO_ROOT = path.resolve(ACTION_DIR, '..', '..', '..');
const ACTION_YML = path.join(REPO_ROOT, 'action.yml');
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

    const run = runValidate({ fixture: 'envelope-noncompliant.json', cliExit: 2 });

    assert.equal(run.outputs['violations-count'], String(blocking));
    assert.notEqual(run.outputs['violations-count'], '0');
    assert.equal(run.outputs['issues-count'], String(total));
    assert.equal(run.outputs['compliance-status'], 'non-compliant');
    // The gate itself must keep blocking.
    assert.equal(run.exitCode, 1);
  });

  test('the job summary renders the real count, not "0 violation(s)"', () => {
    const validate = runValidate({ fixture: 'envelope-noncompliant.json', cliExit: 2 });
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
      cliExit: 2,
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

  // GT-580, the fourth value of the taxonomy. A bad invocation must not be
  // laundered into a verdict: the action reports `invalid-input` and fails the
  // step regardless of `fail-on-violation`, because that input governs what to
  // do with a VERDICT and there is none here.
  test('an invalid invocation is not reported as a verdict', () => {
    const run = runValidate({
      fixture: '',
      cliExit: 3,
      failOnViolation: 'false',
    });

    assert.equal(run.outputs['compliance-status'], 'invalid-input');
    assert.equal(run.outputs['exit-code'], '3');
    assert.notEqual(run.outputs['compliance-status'], 'non-compliant');
    assert.equal(run.exitCode, 3, 'fail-on-violation=false must NOT swallow a bad invocation');

    const summary = runStep(summaryStep, {
      inputs: { 'satellite-path': '.' },
      outputs: run.outputs,
    });
    assert.match(summary.summary, /Not evaluated/);
    assert.match(summary.summary, /not.*a finding about this repository/i);
  });

  // The distinction the taxonomy exists for, asserted directly: a blocked
  // verdict and a tool failure must not produce the same status.
  test('blocked and tool-failure do not collapse onto the same status', () => {
    const blocked = runValidate({ fixture: 'envelope-noncompliant.json', cliExit: 2 });
    const broken = runValidate({ fixture: 'envelope-error.json', cliExit: 1 });

    assert.equal(blocked.outputs['compliance-status'], 'non-compliant');
    assert.equal(broken.outputs['compliance-status'], 'error');
    assert.notEqual(
      blocked.outputs['compliance-status'],
      broken.outputs['compliance-status'],
      'collapsing these is the defect GT-580 fixed',
    );
  });

  test('keys added to the envelope do not move the counter', () => {
    const { blocking, total } = expectedCounts('envelope-extra-keys.json');
    const run = runValidate({ fixture: 'envelope-extra-keys.json', cliExit: 2 });

    // The fixture carries a decoy `data.summary.violations: 999` plus extra
    // top-level, data, issue and meta keys: the expression must depend only on
    // `data.issues[].blocking`.
    assert.equal(run.outputs['violations-count'], String(blocking));
    assert.equal(run.outputs['issues-count'], String(total));
    assert.equal(run.outputs['violations-count'], '2');
  });

  // GT-580: an error envelope means the CLI could NOT produce a verdict. Exit 1
  // is a tool failure, and the action must say `error` — not `non-compliant`,
  // which would assert something about the repository that was never evaluated.
  test('an error envelope is handled without crashing, and the summary says so', () => {
    const validate = runValidate({ fixture: 'envelope-error.json', cliExit: 1 });

    assert.equal(validate.exitCode, 1);
    assert.equal(validate.outputs['violations-count'], '0');
    assert.equal(validate.outputs['compliance-status'], 'error');

    const summary = runStep(summaryStep, {
      inputs: { 'satellite-path': '.' },
      outputs: validate.outputs,
    });
    assert.match(summary.summary, /see the validation log/);
    assert.equal(/0 blocking violation\(s\)/.test(summary.summary), false);
  });

  // Same reasoning: no report written means no verdict, so `error`, not a
  // silent claim of non-compliance.
  test('a run that produced no report degrades safely', () => {
    const run = runValidate({ fixture: '', cliExit: 1 });

    assert.equal(run.exitCode, 1);
    assert.equal(run.outputs['violations-count'], '0');
    assert.equal(run.outputs['issues-count'], '0');
    assert.equal(run.outputs['compliance-status'], 'error');
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
          STUB_EXIT: '2',
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

  // --------------------------------------------------------------------------
  // GT-651 · `select` — the tenant-selection capability, reachable from the
  // surface a tenant installs.
  //
  // GT-659 made the engine evaluate only what the caller asked for on CLI, MCP
  // and REST. The action is the fourth way a tenant reaches it and the only one
  // most of them will ever use, so it had to carry the argument too. What is
  // asserted here is the argv the CLI would RECEIVE, because the translation
  // from one YAML string to a repeatable flag is shell, and shell in YAML is
  // exactly what this file exists to stop being unverified.
  // --------------------------------------------------------------------------

  /** Runs the validate step and returns the argv the stub CLI was invoked with. */
  function argvFor(select) {
    const work = mkdtempSync(path.join(tmpdir(), 'gt651-'));
    const argvOut = path.join(work, 'argv');
    const run = runStep(validateStep, {
      inputs: {
        'satellite-path': '.',
        'cli-command': `bash ${STUB_CLI}`,
        'fail-on-violation': 'false',
        ...(select === undefined ? {} : { select }),
      },
      extraEnv: {
        STUB_FIXTURE: path.join(FIXTURES, 'envelope-compliant.json'),
        STUB_EXIT: '0',
        STUB_ARGV_OUT: argvOut,
      },
    });
    assert.equal(run.exitCode, 0, run.stderr);
    return readFileSync(argvOut, 'utf8').split('\n').filter(Boolean);
  }

  test('GT-651: `select` declares an input, so a tenant can reach GT-659 from the action', () => {
    const input = action.inputs?.select;
    assert.ok(input, 'action.yml must declare a `select` input');
    assert.equal(input.default, '', 'the default must be empty — naming nothing means the full corpus');
    assert.equal(input.required, false);
  });

  test('GT-651: one ref becomes one --select flag', () => {
    assert.deepEqual(argvFor('standards/ssdf-v1.1.rules.json').slice(0, 3), [
      'validate',
      '--select',
      'standards/ssdf-v1.1.rules.json',
    ]);
  });

  test('GT-651: newline- and comma-separated lists both become repeated flags', () => {
    const expected = ['--select', 'a/one.rules.json', '--select', 'b/two.rules.json'];
    for (const form of ['a/one.rules.json\nb/two.rules.json', 'a/one.rules.json,b/two.rules.json']) {
      const argv = argvFor(form);
      assert.deepEqual(argv.slice(1, 5), expected, `form: ${JSON.stringify(form)}`);
    }
  });

  test('THE DISTINCTION: nothing named sends NO --select at all, never an empty one', () => {
    // A YAML block scalar leaves a trailing newline; a template that resolved
    // to nothing leaves whitespace. Both must mean "the caller named nothing".
    // `--select ""` would be a selection OF nothing: zero rules evaluated, zero
    // violations found, reported as a pass over a repository nobody examined.
    for (const nothing of [undefined, '', '\n', '   ', ',,', ' , \n ,']) {
      const argv = argvFor(nothing);
      assert.equal(
        argv.includes('--select'),
        false,
        `select=${JSON.stringify(nothing)} produced a --select flag: ${JSON.stringify(argv)}`,
      );
    }
  });

  test('GT-651: a blank entry among real refs is dropped, not forwarded', () => {
    const argv = argvFor('a/one.rules.json\n\n   \nb/two.rules.json\n');
    assert.deepEqual(argv.filter((a, i) => argv[i - 1] === '--select'), [
      'a/one.rules.json',
      'b/two.rules.json',
    ]);
    assert.equal(argv.filter((a) => a === '--select').length, 2);
  });

  test('GT-651: the summary distinguishes a selected run from a full-corpus run', () => {
    const selected = runStep(summaryStep, {
      inputs: { select: 'standards/ssdf-v1.1.rules.json' },
      outputs: { 'compliance-status': 'compliant', 'violations-count': '0', 'issues-count': '0' },
    });
    assert.match(selected.summary, /\| Selection \| `standards\/ssdf-v1\.1\.rules\.json` \|/);

    const full = runStep(summaryStep, {
      outputs: { 'compliance-status': 'compliant', 'violations-count': '0', 'issues-count': '0' },
    });
    assert.match(full.summary, /\| Selection \| none -- the full corpus this Core carries \|/);
  });
});
