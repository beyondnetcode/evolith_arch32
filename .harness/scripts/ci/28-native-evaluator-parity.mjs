#!/usr/bin/env node
/**
 * @file 28-native-evaluator-parity.mjs
 * @description CI Step: parity fixture COVERAGE gate (GT-229)
 *
 * ┌─ WHAT THIS SCRIPT DOES NOT DO ─────────────────────────────────────────┐
 * │ It does NOT instantiate NativeEvaluator and it does NOT compare a       │
 * │ single verdict. It never has. The header used to claim it did.          │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * The REAL parity evaluation lives in, and only in:
 *
 *   src/packages/core-domain/src/application/validators/evaluators/
 *     native-opa-parity.spec.ts
 *
 * That spec imports the real NativeEvaluator, discovers this same fixture
 * directory with readdirSync, and asserts fixture-declared verdicts against
 * actual evaluator output. It runs in the core-domain jest suite
 * (ci-cd.yml -> test-core-domain), a required check on main. Re-implementing
 * that evaluation here in .mjs would be a degraded duplicate of logic that
 * already exists and works, so this gate deliberately does not.
 *
 * What this gate DOES check is the one question the spec cannot ask about
 * itself: is every fixture on disk actually exercised? Because the spec
 * generates its test cases by iterating fixture contents, a fixture that is
 * malformed, empty, or shaped wrong produces ZERO test cases and the spec
 * still goes green. It cannot detect a fixture it silently ignored.
 *
 * Concretely, this gate fails closed when:
 *   1. the fixture directory is missing        (dead path reported as "no drift")
 *   2. the directory holds zero fixtures       (vacuous pass)
 *   3. a fixture matches NEITHER fixture shape (spec skips it entirely -> orphan)
 *   4. a fixture yields zero spec test cases   (on disk, never exercised)
 *   5. a scenario asserts zero verdicts        (test case runs, proves nothing)
 *   6. a legacy fixture declares zero rules    (evaluates an empty rule set)
 *   7. the spec file is absent, or reads a DIFFERENT fixture directory
 *      than this gate does (the two would drift apart silently)
 *   8. the core-domain jest suite is not wired into CI (the real evaluation
 *      would stop running and nothing would say so)
 *
 * Fixture-shape discrimination below MUST mirror the spec's own branching
 * ('expectedNative' => new format; 'rules' + 'scenarios' => legacy format).
 * If the spec's branching changes, change it here too, or check 7 is the only
 * thing standing between you and a silent coverage hole.
 *
 * Runs in sdk-cli-ci.yml -> architecture-validation, a job that intentionally
 * does no `npm ci`. That is why this gate is dependency-free node: it cannot
 * shell out to jest, because there is no node_modules in that job.
 *
 * Exit 0 = every fixture on disk is genuinely exercised by the spec.
 * Exit 1 = a fixture is orphaned/vacuous, or the real evaluation is unwired.
 * Emits a machine-readable NATIVE_PARITY_COVERAGE report with telemetry.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const FIXTURES_DIR = 'src/packages/core-domain/test/parity-fixtures';
const SPEC_FILE =
  'src/packages/core-domain/src/application/validators/evaluators/native-opa-parity.spec.ts';
const CI_WORKFLOW = '.github/workflows/ci-cd.yml';

function loadFixtures() {
  const dir = resolve(ROOT, FIXTURES_DIR);
  if (!existsSync(dir)) {
    throw new Error(
      `Parity fixture directory does not exist: ${FIXTURES_DIR}\n` +
      `Refusing to report coverage over a corpus that is not there -- ` +
      `a dead path must never be reported as "fully exercised".`
    );
  }
  return readdirSync(dir)
    .filter(f => f.endsWith('.fixture.json'))
    .map(f => {
      const raw = readFileSync(resolve(dir, f), 'utf8');
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        throw new Error(
          `Fixture ${f} is not valid JSON: ${e.message}\n` +
          `The spec would crash on it -- fix the fixture.`
        );
      }
      return { file: f, data };
    });
}

/**
 * Mirrors the spec's fixture-shape branching and counts how many `it` cases
 * the spec would generate for this fixture, plus how many verdicts each
 * asserts. A fixture with cases === 0 is on disk but never exercised.
 */
function analyzeFixture(file, data) {
  const isNew = data !== null && typeof data === 'object' && 'expectedNative' in data;
  const isLegacy =
    data !== null && typeof data === 'object' && 'rules' in data && 'scenarios' in data;

  const problems = [];
  let cases = 0;
  let assertions = 0;
  let ruleCount = 0;

  if (!isNew && !isLegacy) {
    problems.push(
      `matches neither fixture shape (no 'expectedNative', no 'rules'+'scenarios'). ` +
      `The spec skips it entirely -- it is an orphan on disk.`
    );
    return { isNew, isLegacy, cases, assertions, ruleCount, problems };
  }

  if (isNew) {
    const expected = Array.isArray(data.expectedNative) ? data.expectedNative : [];
    cases += 1; // the spec emits exactly one `it` per new-format fixture
    assertions += expected.length;
    ruleCount += expected.length;
    if (expected.length === 0) {
      problems.push(
        `new-format fixture declares an empty 'expectedNative' -- the spec's ` +
        `test case runs but asserts no verdict at all (vacuous).`
      );
    }
  }

  if (isLegacy) {
    const rules = Array.isArray(data.rules) ? data.rules : [];
    ruleCount += rules.length;
    if (rules.length === 0) {
      problems.push(`legacy fixture declares zero rules -- it evaluates an empty rule set.`);
    }
    const scenarios = Object.entries(data.scenarios ?? {});
    if (scenarios.length === 0) {
      problems.push(
        `legacy fixture declares zero scenarios -- the spec generates NO test ` +
        `cases for it. It sits on disk completely un-exercised.`
      );
    }
    for (const [name, scenario] of scenarios) {
      cases += 1;
      const expected = Array.isArray(scenario?.expectedResults) ? scenario.expectedResults : [];
      assertions += expected.length;
      if (expected.length === 0) {
        problems.push(
          `scenario "${name}" asserts zero expected results -- the test case runs ` +
          `but proves nothing about any verdict.`
        );
      }
    }
  }

  return { isNew, isLegacy, cases, assertions, ruleCount, problems };
}

/**
 * Check 7: the spec exists AND reads the same directory this gate reads.
 * Without this, the gate could certify coverage of a corpus the spec no
 * longer looks at -- exactly the dead-path failure mode we are fixing.
 */
function verifySpecLink() {
  const specPath = resolve(ROOT, SPEC_FILE);
  if (!existsSync(specPath)) {
    throw new Error(
      `The real parity evaluation is missing: ${SPEC_FILE}\n` +
      `This gate only measures fixture COVERAGE. If the spec is gone, nothing ` +
      `evaluates NativeEvaluator verdicts at all and this gate must not pass.`
    );
  }
  const src = readFileSync(specPath, 'utf8');

  if (!/NativeEvaluator/.test(src) || !/evaluateAll/.test(src)) {
    throw new Error(
      `${SPEC_FILE} no longer instantiates NativeEvaluator / calls evaluateAll.\n` +
      `The real verdict comparison has been gutted; fixture coverage alone is ` +
      `not parity.`
    );
  }

  // Resolve the spec's own fixturesDir expression and compare to ours.
  const m = src.match(/fixturesDir\s*=\s*path\.resolve\(([^)]*)\)/);
  if (!m) {
    throw new Error(
      `Could not locate the 'fixturesDir = path.resolve(...)' declaration in ` +
      `${SPEC_FILE}. This gate cannot confirm the spec reads the same corpus ` +
      `it certifies. Update this gate to match the spec's discovery mechanism.`
    );
  }
  const segments = [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1]);
  const specDir = resolve(
    ROOT,
    'src/packages/core-domain/src/application/validators/evaluators',
    ...segments,
  );
  const ourDir = resolve(ROOT, FIXTURES_DIR);
  if (specDir !== ourDir) {
    throw new Error(
      `Fixture directory drift.\n` +
      `  this gate reads: ${ourDir}\n` +
      `  the spec reads:  ${specDir}\n` +
      `Coverage measured over one corpus says nothing about the other.`
    );
  }
  return true;
}

/**
 * Check 8: the suite carrying the real evaluation still runs in CI.
 * Fixture coverage is worthless if nothing executes the spec.
 */
function verifySpecRunsInCi() {
  const wf = resolve(ROOT, CI_WORKFLOW);
  if (!existsSync(wf)) {
    throw new Error(
      `${CI_WORKFLOW} not found -- cannot confirm the core-domain suite ` +
      `(which carries the real parity evaluation) still runs in CI.`
    );
  }
  const src = readFileSync(wf, 'utf8');
  const runsCoreDomainTests =
    /(test|test:cov)\s+--workspace\s+@beyondnet\/evolith-core-domain/.test(src);
  if (!runsCoreDomainTests) {
    throw new Error(
      `${CI_WORKFLOW} no longer runs the core-domain jest suite.\n` +
      `${SPEC_FILE} is where NativeEvaluator verdicts are actually compared; ` +
      `if that suite stops running in CI, parity is unverified no matter how ` +
      `well-covered the fixtures are.`
    );
  }
  return true;
}

function main() {
  console.log('⚖️  Parity Fixture COVERAGE Gate (GT-229)');
  console.log('   This gate does NOT evaluate verdicts. It verifies that every');
  console.log('   fixture on disk is genuinely exercised by the real evaluation in:');
  console.log(`   ${SPEC_FILE}`);

  const fixtures = loadFixtures();

  const report = {
    schemaVersion: '2.0',
    gate: 'fixture-coverage',
    evaluatesVerdicts: false,
    verdictEvaluationOwnedBy: SPEC_FILE,
    fixtureFiles: fixtures.length,
    totalRules: 0,
    totalSpecCases: 0,
    totalAssertions: 0,
    domains: [],
    timestamp: new Date().toISOString(),
  };

  if (fixtures.length === 0) {
    console.log(`NATIVE_PARITY_COVERAGE ${JSON.stringify(report)}`);
    throw new Error(
      `Scanned ${FIXTURES_DIR} and found zero *.fixture.json parity fixtures.\n` +
      `A zero-fixture scan must never be reported as "coverage holds" -- ` +
      `that is a vacuous pass and it hid this gate's dead path for weeks.`
    );
  }

  const failures = [];
  const rows = [];

  for (const { file, data } of fixtures) {
    const a = analyzeFixture(file, data);
    report.totalRules += a.ruleCount;
    report.totalSpecCases += a.cases;
    report.totalAssertions += a.assertions;
    report.domains.push(data?.domain ?? file.replace('.fixture.json', ''));

    if (a.cases === 0 && a.problems.length === 0) {
      a.problems.push(`generates zero spec test cases -- un-exercised on disk.`);
    }
    for (const p of a.problems) failures.push(`${file}: ${p}`);

    const shape = a.isNew ? 'new' : a.isLegacy ? 'legacy' : 'UNKNOWN';
    rows.push(
      `   ${a.problems.length ? '✗' : '✓'} ${file.padEnd(38)} ` +
      `shape=${shape.padEnd(7)} specCases=${String(a.cases).padStart(2)} ` +
      `verdictAssertions=${String(a.assertions).padStart(3)}`
    );
  }

  for (const r of rows) console.log(r);

  verifySpecLink();
  verifySpecRunsInCi();
  report.specLinkVerified = true;
  report.specWiredInCi = true;

  console.log(
    `   ${fixtures.length} fixture(s), ${report.totalRules} rule(s), ` +
    `${report.totalSpecCases} spec test case(s), ${report.totalAssertions} verdict assertion(s).`
  );

  if (failures.length > 0) {
    console.log(`NATIVE_PARITY_COVERAGE ${JSON.stringify({ ...report, failures })}`);
    throw new Error(
      `${failures.length} fixture coverage failure(s):\n` +
      failures.map(f => `  - ${f}`).join('\n') +
      `\n\nA fixture the spec never exercises is not covered, and the spec ` +
      `cannot detect a fixture it silently ignored -- that is this gate's job.`
    );
  }

  console.log(`NATIVE_PARITY_COVERAGE ${JSON.stringify(report)}`);
  console.log('   ✓ every fixture on disk is exercised by the real evaluation.');
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error('❌ Parity fixture coverage gate failed:', err.message);
  process.exit(1);
}
