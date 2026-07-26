import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

// GT-556/557: `reference/core/sdlc/standards/vision` no longer exists — its three
// inputs split across control-center/{gaps,evidence,maturity-reports}, which is why this
// script crashed. It also counted `.rules.json` under `rulesets/`, a directory that
// still EXISTS but holds only `agents/` — so `rulesetCount` silently reported 0 instead
// of 145. That second bug is the reason a path check alone is not enough: the path was
// live, the corpus was empty, and the snapshot was quietly wrong.
import { REPO_ROOT, resolve as resolveKey, expected, relativeToRoot } from '../lib/paths.mjs';
import { assertScanned } from '../lib/coverage.mjs';

// GT-576: the living maturity assessment marked capabilities `Validated` — a state its own
// section 2 defines as "Passing all quality gates, tests, and active in CI/CD" — while the
// only thing under the "Evidence" bullet was a link to an approved ADR. Pillar 1 claimed
// Row-Level Security and CDC audit trails when no workspace in the tree declares a database
// driver; Pillar 4 claimed "deterministic monorepo builds via Nx" when there is no `nx.json`
// and no `nx` dependency. Both were falsifiable in ten minutes by a reader with a shell.
//
// An ADR is a decision. It is evidence that somebody intended a thing, never that the thing
// exists. So the rule below is deliberately crude and unarguable: to stand as `Validated` a
// capability must point at something a reader can execute or open at a line — a `file:line`
// reference, or a CI workflow/harness gate. Markdown link TARGETS are stripped before the
// check precisely so that a link to an ADR (or to anything else) can never satisfy it; the
// citation has to be legible in the prose.

/** States that assert the capability is live, in either language of the assessment. */
const EXECUTABLE_STATES = new Set(['validated', 'scaled', 'validado', 'escalado']);

/** `src/foo/bar.ts:17` or `sdk-cli-ci.yml:195` or `x.mjs:12-34` — openable at a line. */
const FILE_LINE_REFERENCE = /\b[\w./@-]+\.[A-Za-z0-9]{1,6}:\d+(?:-\d+)?\b/;

/** A CI workflow or harness gate — something that runs and can go red. */
const CI_JOB_REFERENCE = /\b[\w./@-]+\.(?:mjs|ya?ml)\b/;

/** The two language editions of the living assessment. Both are audited; neither is optional. */
const ASSESSMENT_DOCS = ['maturity-assessment.md', 'maturity-assessment.es.md'];

/**
 * Audit one assessment edition for `Validated` claims that rest on nothing executable.
 *
 * @param {string} markdown  raw document
 * @param {string} source    label used in violation messages
 * @returns {{scanned: number, validated: number, violations: {source: string, heading: string, state: string}[]}}
 */
export function auditValidatedEvidence(markdown, source = '<memory>') {
  const violations = [];
  let scanned = 0;
  let validated = 0;
  let heading = null;
  let body = [];

  const flush = () => {
    if (heading !== null) {
      const block = body.join('\n');
      const state = block.match(/^\s*\*\s+\*\*(?:State|Estado):\*\*\s*`([^`]+)`/m)?.[1];
      if (state) {
        scanned += 1;
        if (EXECUTABLE_STATES.has(state.trim().toLowerCase())) {
          validated += 1;
          // Strip markdown link targets: `[ADR-0010](.../0010-x.md)` -> `[ADR-0010]`.
          const prose = block.replace(/\]\([^)]*\)/g, ']');
          if (!FILE_LINE_REFERENCE.test(prose) && !CI_JOB_REFERENCE.test(prose)) {
            violations.push({ source, heading, state: state.trim() });
          }
        }
      }
    }
    heading = null;
    body = [];
  };

  for (const line of markdown.split('\n')) {
    const match = line.match(/^###\s+(.*\S)\s*$/);
    if (match) {
      flush();
      heading = match[1];
      continue;
    }
    if (/^##\s+/.test(line)) {
      flush();
      continue;
    }
    if (heading !== null) body.push(line);
  }
  flush();

  return { scanned, validated, violations };
}

/**
 * Negative self-test for the rule above.
 *
 * This runs on EVERY invocation, not in a test file somebody may forget to wire up. The
 * defect this whole gap is about is a control that has never been observed failing, so the
 * rule is fed a deliberately bad input on every run and must reject it. If the assertions
 * below stop holding — a regex loosened, the parser skipping ES, the auditor quietly
 * scanning zero blocks — the gate goes red here, before it ever looks at the real document.
 *
 * @throws {Error} when the rule fails to behave as specified
 */
export function selfTestValidatedEvidenceRule() {
  const failures = [];
  const check = (label, condition) => { if (!condition) failures.push(label); };

  // (1) RED: `Validated` backed by an ADR link alone. This is the exact shape that shipped.
  const adrOnly = [
    '### Pillar 1: Security & Compliance — **Level 4 (Managed)**',
    '* **State:** `Validated`',
    '* **Evidence:**',
    '  * Multi-tenant data isolation via Row-Level Security ([ADR-0010](../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md)).',
    '  * Immutable audit trails via CDC ([ADR-0016](../../architecture/adrs/core/0016-immutable-business-audit-trail.md)).',
  ].join('\n');
  const red = auditValidatedEvidence(adrOnly, 'self-test:adr-only');
  check('an ADR-only `Validated` capability must be rejected', red.violations.length === 1);
  check('the rejection must name the capability', /Pillar 1/.test(red.violations[0]?.heading ?? ''));

  // (2) RED in Spanish too — the ES edition is a published surface, not a translation artifact.
  const adrOnlyEs = [
    '### Pilar 1: Seguridad y Compliance — **Nivel 4 (Gestionado)**',
    '* **Estado:** `Validado`',
    '* **Evidencia:**',
    '  * Aislamiento multi-tenant vía RLS ([ADR-0010](../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.es.md)).',
  ].join('\n');
  check('an ADR-only `Validado` capability must be rejected',
    auditValidatedEvidence(adrOnlyEs, 'self-test:adr-only-es').violations.length === 1);

  // (3) GREEN: a `file:line` reference satisfies the rule.
  const withFileLine = adrOnly.replace(
    '* **Evidence:**',
    '* **Evidence:** `src/apps/core-api/src/tracing.ts:7`',
  );
  check('a `file:line` reference must satisfy `Validated`',
    auditValidatedEvidence(withFileLine, 'self-test:file-line').violations.length === 0);

  // (4) GREEN: a CI job reference satisfies the rule.
  const withCiJob = adrOnly.replace(
    '* **Evidence:**',
    '* **Evidence:** job `codeql-analysis` in `.github/workflows/sdk-cli-ci.yml`',
  );
  check('a CI job reference must satisfy `Validated`',
    auditValidatedEvidence(withCiJob, 'self-test:ci-job').violations.length === 0);

  // (5) The `.md` target of an ADR link must NOT be mistaken for a file reference, even when
  //     the filename is full of digits. This is the loophole that would silently reopen the gap.
  const digitsInAdrTarget = adrOnly.replace(
    '* **Evidence:**',
    '* **Evidence:** see [ADR-0010](../../architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md)',
  );
  check('an ADR link target must never count as evidence',
    auditValidatedEvidence(digitsInAdrTarget, 'self-test:adr-target').violations.length === 1);

  // (6) Non-`Validated` states are not policed — the rule must not turn `Designed` red.
  check('a `Designed` capability with only an ADR must pass',
    auditValidatedEvidence(adrOnly.replace('`Validated`', '`Designed`'), 'self-test:designed').violations.length === 0);

  // (7) Anti-vacuous pass: an auditor that parsed no capability blocks has not audited anything.
  check('a document with no capability blocks must scan zero, and be reported as such',
    auditValidatedEvidence('# Narrative only\n\nNo capabilities here.', 'self-test:empty').scanned === 0);

  if (failures.length) {
    throw new Error(
      'GT-576 evidence rule self-test FAILED — the guard no longer detects the defect it exists for:\n- '
      + failures.join('\n- '),
    );
  }
  return { assertions: 7 };
}

/**
 * Run the rule over both editions of the living assessment.
 *
 * @returns {{scanned: number, validated: number, violations: object[]}}
 */
export function auditAssessments() {
  const violations = [];
  let scanned = 0;
  let validated = 0;

  for (const name of ASSESSMENT_DOCS) {
    // resolveKey fail-closes: a moved assessment must not read as "nothing to audit".
    const file = resolveKey('maturityReports', name);
    const result = auditValidatedEvidence(fs.readFileSync(file, 'utf8'), name);
    scanned += result.scanned;
    validated += result.validated;
    violations.push(...result.violations);
  }

  // A zero-block scan means the document structure moved, not that the document is clean.
  assertScanned(scanned, { what: 'maturity capability blocks', where: ASSESSMENT_DOCS });
  return { scanned, validated, violations };
}

const ROOT = REPO_ROOT;
const BOARD = resolveKey('gapTracking');
const REGISTRY = resolveKey('gapClosureEvidence');
const CLI_PACKAGE = resolveKey('cliPackageJson');
const RUNTIME_EVIDENCE = resolveKey('maturityEvidence');
const OUTPUT = expected('maturityReports', 'maturity-reconciliation.json');
// PASS: green observed run. BLOCKED: failing/unmet, must map to an active gap.
// RESOLVED: the blocking gap is closed in code (cites its closure commit) and the
// only residual is a runtime re-run; it maps to a closed gap and does not require a
// workflow-run URL, because that run is what is still pending.
const EVIDENCE_STATUSES = new Set(['PASS', 'BLOCKED', 'RESOLVED']);
const REQUIRED_CHECKS = new Set(['cli-baseline', 'coverage', 'documentation', 'release']);

function countFiles(directory, pattern, excludePattern) {
  if (!fs.existsSync(directory)) return 0;
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return total + countFiles(target, pattern, excludePattern);
    return total + Number(pattern.test(entry.name) && (!excludePattern || !excludePattern.test(entry.name)));
  }, 0);
}

export function parseBoard(content) {
  const lastUpdated = content.match(/\*\*Last Updated:\*\* (\d{4}-\d{2}-\d{2})/)?.[1];
  const statuses = [...content.matchAll(/^\| \[`(?:GT-\d+|MT-A\d+)`]\([^)]*\) .*\| `(DONE|OPEN|PENDING|DEFERRED|IN-PROGRESS)` \|$/gm)]
    .map((match) => (match[1] === 'OPEN' ? 'PENDING' : match[1]));
  const counts = {
    total: statuses.length,
    done: statuses.filter((status) => status === 'DONE').length,
    pending: statuses.filter((status) => status === 'PENDING').length,
    inProgress: statuses.filter((status) => status === 'IN-PROGRESS').length,
    deferred: statuses.filter((status) => status === 'DEFERRED').length,
  };
  if (!lastUpdated || counts.total === 0) throw new Error('Could not parse the canonical gap board');
  return { lastUpdated, counts };
}

function commitExists(root, commit) {
  try {
    execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`], {
      cwd: root,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

export function validateRuntimeEvidence(evidence, board, root = ROOT, now = new Date()) {
  const errors = [];
  const checks = Array.isArray(evidence?.checks) ? evidence.checks : [];
  const activeGaps = new Set(
    [...board.content.matchAll(/^\| \[`(GT-\d+|MT-A\d+)`]\([^)]*\) .*\| `(OPEN|PENDING|DEFERRED|IN-PROGRESS)` \|$/gm)]
      .map((match) => match[1]),
  );
  const closedGaps = new Set(
    [...board.content.matchAll(/^\| \[`(GT-\d+|MT-A\d+)`]\([^)]*\) .*\| `DONE` \|$/gm)]
      .map((match) => match[1]),
  );
  const ids = new Set();

  if (evidence?.schemaVersion !== '1.0.0') errors.push('Unsupported maturity evidence schemaVersion');
  if (evidence?.asOf !== board.lastUpdated) errors.push('Maturity evidence date differs from the gap board');

  for (const check of checks) {
    if (!check?.id || ids.has(check.id)) errors.push(`Invalid or duplicate maturity check: ${check?.id || '<missing>'}`);
    ids.add(check?.id);
    if (!EVIDENCE_STATUSES.has(check?.status)) errors.push(`${check?.id} has unsupported status`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(check?.observedAt || '')) {
      errors.push(`${check?.id} has invalid observedAt`);
    } else {
      const ageDays = Math.floor((now - new Date(`${check.observedAt}T00:00:00Z`)) / 86400000);
      if (ageDays < 0 || ageDays > 30) errors.push(`${check.id} evidence is stale or future-dated`);
    }
    if (!/^[0-9a-f]{7,40}$/i.test(check?.commit || '') || !commitExists(root, check.commit)) {
      errors.push(`${check?.id} references an unavailable commit`);
    }
    if (check?.status !== 'RESOLVED'
      && !/^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+$/.test(check?.source || '')) {
      errors.push(`${check?.id} has an invalid workflow source`);
    }
    if (typeof check?.summary !== 'string' || !check.summary.trim()) errors.push(`${check?.id} lacks a summary`);
    if (check?.status === 'BLOCKED' && (!check.gap || !activeGaps.has(check.gap))) {
      errors.push(`${check?.id} must map BLOCKED evidence to an active gap`);
    }
    if (check?.status === 'RESOLVED' && (!check.gap || !closedGaps.has(check.gap))) {
      errors.push(`${check?.id} must map RESOLVED evidence to a closed gap`);
    }
    if (check?.status === 'PASS' && check?.gap) errors.push(`${check.id} PASS evidence cannot declare a blocking gap`);
  }

  for (const required of REQUIRED_CHECKS) {
    if (!ids.has(required)) errors.push(`Missing required maturity check: ${required}`);
  }
  return errors;
}

// A count of zero from a directory that exists means the corpus moved, not that it is
// empty — the exact shape of the `rulesets/` regression above.
function counted(what, where, n) {
  return assertScanned(n, { what, where });
}

export function buildSnapshot(root = ROOT) {
  const boardContent = fs.readFileSync(path.join(root, 'reference/core/control-center/gaps/gap-tracking.md'), 'utf8');
  const board = { ...parseBoard(boardContent), content: boardContent };
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'reference/core/control-center/evidence/gap-closure-evidence.json'), 'utf8'));
  const cliPackage = JSON.parse(fs.readFileSync(path.join(root, 'src/sdk/cli/package.json'), 'utf8'));
  const runtimeEvidence = JSON.parse(fs.readFileSync(path.join(root, 'reference/core/control-center/maturity-reports/maturity-evidence.json'), 'utf8'));
  const closures = registry.closures || [];

  const gtDoneCount = [...board.content.matchAll(/^\| \[`GT-\d+`]\([^)]*\) .*\| `DONE` \|$/gm)].length;
  const mtClosureCount = closures.filter((c) => c.id && c.id.startsWith('MT-')).length;
  const expectedClosures = gtDoneCount + mtClosureCount;

  if (closures.length !== expectedClosures) {
    throw new Error(`Closure evidence count (${closures.length}) differs from required closures (${expectedClosures})`);
  }
  const evidenceErrors = validateRuntimeEvidence(runtimeEvidence, board, root);
  if (evidenceErrors.length) throw new Error(`Invalid runtime maturity evidence:\n- ${evidenceErrors.join('\n- ')}`);

  return {
    schemaVersion: '1.0.0',
    scope: 'evolith-core',
    asOf: board.lastUpdated,
    gaps: board.counts,
    evidence: {
      closureRecords: closures.length,
      cliPackage: `${cliPackage.name}@${cliPackage.version}`,
      adrCount: counted('ADRs', 'adrs', countFiles(resolveKey('adrs'), /^\d{4}-.*\.md$/, /\.es\.md$/)),
      // `rulesets` (no `src/` prefix) resolved to a real but unrelated directory, so this
      // counted 0 for months without failing. Now it counts the real corpus and asserts it.
      rulesetCount: counted('rulesets', 'topologiesRulesets', countFiles(resolveKey('rulesets'), /\.rules\.json$/)),
      schemaCount: counted('ruleset schemas', 'rulesetSchemas', countFiles(resolveKey('rulesetSchemas'), /\.schema\.json$/)),
    },
    readiness: runtimeEvidence.checks,
    externalProducts: [
      { name: 'Evolith Tracker', maturityIncluded: false, reason: 'Independent product repository and evidence lifecycle' },
      { name: 'Evolith Product Suite', maturityIncluded: false, reason: 'Product strategy scope is not Core implementation evidence' },
    ],
    sources: [
      'reference/core/control-center/gaps/gap-tracking.md',
      'reference/core/control-center/evidence/gap-closure-evidence.json',
      'reference/core/control-center/maturity-reports/maturity-evidence.json',
      'reference/core/control-center/maturity-reports/inventory-summary.md',
      'src/sdk/cli/package.json',
    ],
    validationCommands: [
      'node .harness/scripts/ci/09-reconcile-maturity.mjs --check',
      'node .harness/scripts/ci/08-validate-tracking.mjs',
      'npm test --workspace src/sdk/cli -- --runInBand',
    ],
  };
}

function serialize(snapshot) {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

function run() {
  // GT-576: prove the rule still bites BEFORE trusting its verdict on the real document.
  const { assertions } = selfTestValidatedEvidenceRule();

  const audit = auditAssessments();
  if (audit.violations.length) {
    console.error(
      `❌ ${audit.violations.length} capability/capabilities are marked as live with no executable evidence.\n`
      + `   "Validated" means passing quality gates, tests and active in CI/CD. An approved ADR proves\n`
      + `   intent, never implementation — cite a file:line or a CI job, or downgrade the state.\n`
      + audit.violations.map((v) => `   - [${v.source}] ${v.heading} — state \`${v.state}\``).join('\n'),
    );
    process.exit(1);
  }
  console.log(
    `✅ Evidence rule: ${audit.validated}/${audit.scanned} capability blocks claim a live state, `
    + `all backed by a file:line or a CI job (${assertions} self-test assertions passed).`,
  );

  const expected = serialize(buildSnapshot());
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== expected) {
      console.error('❌ Maturity reconciliation is stale. Run: node .harness/scripts/ci/09-reconcile-maturity.mjs');
      process.exit(1);
    }
    console.log('✅ Maturity reconciliation matches the canonical Core evidence.');
    return;
  }
  fs.writeFileSync(OUTPUT, expected, 'utf8');
  console.log(`✅ Generated ${path.relative(ROOT, OUTPUT)}`);
}

// `process.argv[1]` is undefined under `node -e` / `--input-type=module`; guard it so the
// module can be imported by an ad-hoc harness without crashing in pathToFileURL.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
