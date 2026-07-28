#!/usr/bin/env node

/**
 * GT-629 — an OPEN row must have acceptance criteria to tick.
 *
 * The guard already refused to let a DONE row keep an unticked criterion. It
 * never asked the prior question — whether the row has any criteria at all —
 * so `GT-443` sat IN-PROGRESS for months carrying prose instead of a list,
 * structurally unclosable, and nothing said so.
 *
 * WHY THE FIXTURE IS A WHOLE FAKE BOARD
 * The check must be observed failing through the real entry point, not only
 * through the exported function: the value of a guard is what the CI process
 * exits with. `08-validate-tracking.mjs` reads its four documents and the
 * closure registry from `EVOLITH_TRACKING_ROOT`, so the fixture is a minimal
 * but COMPLETE board — EN/ES tracking tables, EN/ES catalogs, progress lines
 * and a closure record — that passes every other check in the file. That is
 * what makes the negative fixture meaningful: the baseline is green, one row
 * loses its criteria, and the ONLY thing that changed is the new check.
 *
 * Run: node --test .harness/scripts/ci/08-validate-tracking.test.mjs
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { validateTrackingState, countAcceptanceCriteria } from './08-validate-tracking.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(__dirname, '08-validate-tracking.mjs');
const GAPS_DIR = 'reference/core/control-center/gaps';
const EVIDENCE_DIR = 'reference/core/control-center/evidence';

const EN_LITERAL = {
  done: 'DONE', 'in-progress': 'IN-PROGRESS', pending: 'PENDING', deferred: 'DEFERRED',
};
const ES_LITERAL = {
  done: 'COMPLETADO', 'in-progress': 'EN-PROGRESO', pending: 'PENDIENTE', deferred: 'DIFERIDO',
};

let sandbox;

/**
 * `criteria: n` writes n task-list items; `criteria: 0` writes the GT-443 shape
 * instead — a `**Closure:**` sentence, which is prose and therefore nothing a
 * reviewer can tick.
 */
function catalogSection(gap, lang) {
  const literal = lang === 'EN' ? EN_LITERAL[gap.status] : ES_LITERAL[gap.status];
  const label = lang === 'EN' ? 'Status' : 'Estado';
  const box = gap.status === 'done' ? '[x]' : '[ ]';
  const count = lang === 'EN' ? gap.criteriaEn : gap.criteriaEs;

  const body = count > 0
    ? ['- **Acceptance criteria:**', ...Array.from({ length: count }, (_, i) => `  - ${box} criterion ${i + 1} is met`)]
    : ['**Closure:** prose that reads like a plan and cannot be ticked by anybody.'];

  return [`#### ${gap.id}`, '', `**Title:** fixture ${gap.id}`, '', `- **${label}:** \`${literal}\``, ...body, ''].join('\n');
}

function boardFile(gaps, lang) {
  const header = lang === 'EN'
    ? '| ID | Gap | What it means | Status |'
    : '| ID | Gap | Qué significa | Estado |';
  const counts = { done: 0, 'in-progress': 0, pending: 0, deferred: 0 };
  for (const gap of gaps) counts[gap.status] += 1;
  const progress = lang === 'EN'
    ? `**Progress:** ${counts.done} / ${gaps.length} done · ${counts['in-progress']} in progress `
      + `· ${counts.pending} pending · ${counts.deferred} deferred`
    : `**Progreso:** ${counts.done} / ${gaps.length} completados · ${counts['in-progress']} en progreso `
      + `· ${counts.pending} pendientes · ${counts.deferred} diferidos`;
  const catalog = lang === 'EN' ? 'gap-reference-catalog.md' : 'gap-reference-catalog.es.md';

  const rows = gaps.map((gap) => {
    const literal = lang === 'EN' ? EN_LITERAL[gap.status] : ES_LITERAL[gap.status];
    return `| [\`${gap.id}\`](./${catalog}#${gap.id.toLowerCase()}) | fixture | fixture | \`${literal}\` |`;
  });

  return ['# Fixture board', '', progress, '', header, '|---|---|---|:---:|', ...rows, ''].join('\n');
}

/** Materialise a complete, otherwise-valid board under `root`. */
function writeBoard(root, gaps) {
  mkdirSync(join(root, GAPS_DIR), { recursive: true });
  mkdirSync(join(root, EVIDENCE_DIR), { recursive: true });

  writeFileSync(join(root, GAPS_DIR, 'gap-tracking.md'), boardFile(gaps, 'EN'));
  writeFileSync(join(root, GAPS_DIR, 'gap-tracking.es.md'), boardFile(gaps, 'ES'));
  writeFileSync(
    join(root, GAPS_DIR, 'gap-reference-catalog.md'),
    ['# Fixture catalog', '', ...gaps.map((gap) => catalogSection(gap, 'EN'))].join('\n'),
  );
  writeFileSync(
    join(root, GAPS_DIR, 'gap-reference-catalog.es.md'),
    ['# Catálogo fixture', '', ...gaps.map((gap) => catalogSection(gap, 'ES'))].join('\n'),
  );
  writeFileSync(join(root, EVIDENCE_DIR, 'proof.md'), '# fixture evidence\n');
  writeFileSync(
    join(root, EVIDENCE_DIR, 'gap-closure-evidence.json'),
    JSON.stringify({
      version: '1.0.0',
      closures: gaps.filter((gap) => gap.status === 'done').map((gap) => ({
        id: gap.id,
        closedAt: '2026-01-01',
        closureCommit: 'a1b2c3d',
        evidence: [`${EVIDENCE_DIR}/proof.md`],
        validationCommands: ['node .harness/scripts/ci/08-validate-tracking.mjs'],
        dependencyDisposition: 'none',
      })),
    }, null, 2),
  );
}

function gap(id, status, { criteriaEn = 2, criteriaEs = 2 } = {}) {
  return { id, status, criteriaEn, criteriaEs };
}

/** Spawn the guard over a freshly built board and return its exit code + output. */
function runGuard(gaps, name) {
  const root = join(sandbox, name);
  mkdirSync(root, { recursive: true });
  writeBoard(root, gaps);
  const res = spawnSync(process.execPath, [GUARD], {
    encoding: 'utf8',
    env: { ...process.env, EVOLITH_TRACKING_ROOT: root },
    timeout: 60000,
  });
  return { status: res.status, out: `${res.stdout}\n${res.stderr}` };
}

// A board that is green in every respect: one closed row with its criteria
// ticked, two open rows that each declare criteria.
const HEALTHY = [
  gap('GT-001', 'done'),
  gap('GT-002', 'in-progress'),
  gap('GT-003', 'pending'),
];

before(() => {
  // realpath: on macOS os.tmpdir() is a symlink, and comparing argv[1] against
  // import.meta.url is how this guard decides to run at all.
  sandbox = realpathSync(mkdtempSync(join(tmpdir(), 'gt629-tracking-')));
});

after(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true });
});

// --- The criterion parser --------------------------------------------------

describe('countAcceptanceCriteria', () => {
  test('counts task-list items in either box state', () => {
    assert.equal(countAcceptanceCriteria('- [ ] one\n- [x] two\n  - [X] three\n'), 3);
  });

  test('prose is not a criterion — the GT-443 shape counts as zero', () => {
    assert.equal(
      countAcceptanceCriteria('**Closure:** breaker integration tests + K6 load/chaos + DR deploy.'),
      0,
    );
  });

  test('an empty box with no text is not a criterion', () => {
    assert.equal(countAcceptanceCriteria('- [ ]\n- [x]   \n'), 0);
  });

  test('a bullet that is not a checkbox is not a criterion', () => {
    assert.equal(countAcceptanceCriteria('- **Purpose:** make it closable\n- **Evidence:** none\n'), 0);
  });
});

// --- The rule, through the exported function --------------------------------

describe('validateTrackingState — open rows must carry criteria', () => {
  const sections = (bodies) => new Map(Object.entries(bodies));

  const state = (status, body, overrides = {}) => ({
    enRows: [{ id: 'GT-01', status }],
    esRows: [{ id: 'GT-01', status: ES_LITERAL[status === 'DONE' ? 'done' : 'in-progress'] }],
    enContent: '**Progress:** 0 / 1 done · 1 in progress · 0 pending · 0 deferred',
    esContent: '**Progreso:** 0 / 1 completados · 1 en progreso · 0 pendientes · 0 diferidos',
    enSections: sections({ 'GT-01': body }),
    esSections: sections({ 'GT-01': body }),
    registry: { closures: [] },
    ...overrides,
  });

  test('IN-PROGRESS with prose only is an error', () => {
    const errors = validateTrackingState(state('IN-PROGRESS', '#### GT-01\n\n**Closure:** someday.\n'));
    assert.ok(errors.some((e) => e.includes('GT-01 is IN-PROGRESS with NO acceptance criteria in the EN catalog')), errors.join('\n'));
    assert.ok(errors.some((e) => e.includes('in the ES catalog')), errors.join('\n'));
  });

  test('IN-PROGRESS with an unticked criterion is NOT an error — unmet is not missing', () => {
    const errors = validateTrackingState(state('IN-PROGRESS', '#### GT-01\n\n- [ ] the thing works\n'));
    assert.deepEqual(errors.filter((e) => e.includes('NO acceptance criteria')), []);
  });

  test('DEFERRED counts as open: non-DONE means non-DONE', () => {
    const errors = validateTrackingState({
      ...state('DEFERRED', '#### GT-01\n\n**Closure:** someday.\n'),
      esRows: [{ id: 'GT-01', status: 'DIFERIDO' }],
      enContent: '**Progress:** 0 / 1 done · 0 in progress · 0 pending · 1 deferred',
      esContent: '**Progreso:** 0 / 1 completados · 0 en progreso · 0 pendientes · 1 diferido',
    });
    assert.ok(errors.some((e) => e.includes('GT-01 is DEFERRED with NO acceptance criteria')), errors.join('\n'));
  });

  test('the check does not reach DONE rows — a closed row is judged on ticks, not on presence', () => {
    const errors = validateTrackingState({
      ...state('DONE', '#### GT-01\n\n**Closure:** it shipped.\n'),
      esRows: [{ id: 'GT-01', status: 'COMPLETADO' }],
      enContent: '**Progress:** 1 / 1 done · 0 in progress · 0 pending · 0 deferred',
      esContent: '**Progreso:** 1 / 1 completados · 0 en progreso · 0 pendientes · 0 diferidos',
    });
    assert.deepEqual(errors.filter((e) => e.includes('NO acceptance criteria')), []);
  });

  test('the number of rows examined is reported back, not just the failures', () => {
    const stats = {};
    validateTrackingState({ ...state('IN-PROGRESS', '#### GT-01\n\n- [ ] ok\n'), stats });
    assert.equal(stats.openRowsChecked, 1);
    assert.deepEqual(stats.openRowsMissingCriteria, []);
  });
});

// --- The rule, through the process (the negative fixture) -------------------

describe('guard process', () => {
  test('baseline: a board whose open rows all declare criteria is green', () => {
    const { status, out } = runGuard(HEALTHY, 'healthy');
    assert.equal(status, 0, out);
    assert.match(out, /Tracking validation passed/);
  });

  test('NEGATIVE FIXTURE: stripping the criteria from ONE open row turns it red', () => {
    const stripped = HEALTHY.map((g) => (g.id === 'GT-003' ? { ...g, criteriaEn: 0, criteriaEs: 0 } : g));
    const { status, out } = runGuard(stripped, 'stripped');
    assert.equal(status, 1, out);
    assert.match(out, /GT-003 is PENDING with NO acceptance criteria in the EN catalog/);
    assert.match(out, /GT-003 is PENDING with NO acceptance criteria in the ES catalog/);
    // and nothing else moved: the other two rows are not implicated
    assert.ok(!/GT-001 is|GT-002 is/.test(out), out);
  });

  test('one language is enough: criteria present in EN, missing in ES', () => {
    const half = HEALTHY.map((g) => (g.id === 'GT-002' ? { ...g, criteriaEs: 0 } : g));
    const { status, out } = runGuard(half, 'half-es');
    assert.equal(status, 1, out);
    assert.match(out, /GT-002 is IN-PROGRESS with NO acceptance criteria in the ES catalog/);
    assert.ok(!/GT-002 is IN-PROGRESS with NO acceptance criteria in the EN/.test(out), out);
  });

  test('a DONE row with no criteria stays green — the check must not overreach', () => {
    const doneBare = HEALTHY.map((g) => (g.id === 'GT-001' ? { ...g, criteriaEn: 0, criteriaEs: 0 } : g));
    const { status, out } = runGuard(doneBare, 'done-bare');
    assert.equal(status, 0, out);
  });

  test('the denominator is printed on the GREEN path, where a zero-row scan would hide', () => {
    const { out } = runGuard(HEALTHY, 'denominator-green');
    assert.match(out, /Acceptance-criteria audit: 2 non-DONE GT row\(s\) checked/);
    assert.match(out, /0 with no criteria at all/);
  });

  test('the denominator is printed on the RED path too, and counts every miss', () => {
    const stripped = HEALTHY.map((g) => (g.status === 'done' ? g : { ...g, criteriaEn: 0, criteriaEs: 0 }));
    const { status, out } = runGuard(stripped, 'denominator-red');
    assert.equal(status, 1, out);
    assert.match(out, /Acceptance-criteria audit: 2 non-DONE GT row\(s\) checked/);
    assert.match(out, /4 with no criteria at all/);
  });

  test('the denominator tracks the board: more open rows, larger count', () => {
    const bigger = [...HEALTHY, gap('GT-004', 'pending'), gap('GT-005', 'deferred')];
    const { status, out } = runGuard(bigger, 'bigger');
    assert.equal(status, 0, out);
    assert.match(out, /Acceptance-criteria audit: 4 non-DONE GT row\(s\) checked/);
  });

  test('vacuous: a catalog with zero checkboxes anywhere is red, not "no unmet criteria"', () => {
    // If the `- [ ]` shape ever moves, BOTH criteria checks go quiet in the
    // direction of a pass. This board would otherwise be green: its only row is
    // DONE, so neither check has anything to say.
    const { status, out } = runGuard([gap('GT-001', 'done', { criteriaEn: 0, criteriaEs: 0 })], 'no-checkboxes');
    assert.equal(status, 1, out);
    assert.match(out, /ZERO acceptance-criteria checkboxes in the EN catalog/);
  });
});
