/**
 * GT-599 criterion 2 — self-tests for the "a new open row must carry economics" rule.
 *
 * Run: node --test .harness/scripts/board/new-row-economics-guard.test.mjs
 *
 * The load-bearing assertion is `a new open row without economics is REJECTED`: nothing on
 * this board rejected that before, and it is the sentence the acceptance criterion is
 * written in. Everything else here exists to stop the rule from being satisfiable the cheap
 * ways — by exempting everything, by reading an empty board, or by grandfathering the new
 * row instead of pricing it.
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  checkNewOpenRowEconomics,
  loadBaseline,
  runFromDisk,
  BASELINE_PATH,
} from './new-row-economics-guard.mjs';
// Reused rather than re-implemented, so the fixtures track the real board format.
import { parseBoardRows, parseCatalogSections } from './debt-economics.mjs';
import { ZeroCoverageError } from '../lib/coverage.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');

const sandboxes = [];
function sandboxFile(name, content) {
  const dir = mkdtempSync(join(tmpdir(), 'gt599-guard-'));
  sandboxes.push(dir);
  const file = join(dir, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}
after(() => {
  for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true });
});

/** A catalog section with the economics line, or without it. */
function section(id, { priced = false, principal = 'M', interest = 'MED', basis = 'estimate' } = {}) {
  return [
    `#### ${id}`,
    '',
    `**Title:** ${id} exists`,
    '',
    '- **Component:** `Governance` · **Criticality:** P2 · **Complexity:** M',
    ...(priced ? [`- **Principal:** \`${principal}\` · **Interest:** \`${interest}\` · **Basis:** \`${basis}\``] : []),
    '',
  ].join('\n');
}

function board(rows) {
  return new Map(rows.map(([id, opts]) => [id, section(id, opts)]));
}

// --- The criterion itself ---------------------------------------------------

test('a NEW open row with no principal and no interest is rejected', () => {
  const { errors, stats } = checkNewOpenRowEconomics({
    enRows: [
      { id: 'GT-001', status: 'PENDING' },
      { id: 'GT-999', status: 'PENDING' },
    ],
    enSections: board([['GT-001', {}], ['GT-999', {}]]),
    baselineIds: new Set(['GT-001']),
  });

  assert.equal(stats.required, 1, 'exactly one row is subject to the requirement');
  assert.equal(stats.requiredMissing, 1);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^GT-999 is a new open row \(pending\) with no principal and no interest/);
  assert.ok(!errors[0].includes('GT-001'), 'the grandfathered row is not reported');
});

test('a NEW open row that carries the fields passes', () => {
  const { errors, stats } = checkNewOpenRowEconomics({
    enRows: [
      { id: 'GT-001', status: 'PENDING' },
      { id: 'GT-999', status: 'IN-PROGRESS' },
    ],
    enSections: board([['GT-001', {}], ['GT-999', { priced: true }]]),
    baselineIds: new Set(['GT-001']),
  });

  assert.deepEqual(errors, []);
  assert.equal(stats.required, 1);
  assert.equal(stats.requiredMissing, 0);
  assert.equal(stats.priced, 1);
});

test('every open status binds, including deferred — a deferral is a decision to keep paying interest', () => {
  for (const status of ['PENDING', 'IN-PROGRESS', 'DEFERRED', 'BLOCKED', 'PENDIENTE', 'EN-PROGRESO']) {
    const { errors } = checkNewOpenRowEconomics({
      enRows: [{ id: 'GT-001', status: 'PENDING' }, { id: 'GT-999', status }],
      enSections: board([['GT-001', {}], ['GT-999', {}]]),
      baselineIds: new Set(['GT-001']),
    });
    assert.equal(errors.length, 1, `status ${status} must bind the requirement`);
    assert.match(errors[0], /GT-999/);
  }
});

test('a DONE row is not asked for economics — a closed row\'s cost is history', () => {
  const { errors, stats } = checkNewOpenRowEconomics({
    enRows: [{ id: 'GT-001', status: 'PENDING' }, { id: 'GT-999', status: 'DONE' }],
    enSections: board([['GT-001', {}], ['GT-999', {}]]),
    baselineIds: new Set(['GT-001']),
  });
  assert.deepEqual(errors, []);
  assert.equal(stats.required, 0);
});

test('a new open row with a MALFORMED figure is rejected as loudly as one with none', () => {
  const { errors } = checkNewOpenRowEconomics({
    // "4h" is a rate with no period, which is not an interest.
    enRows: [{ id: 'GT-001', status: 'PENDING' }, { id: 'GT-999', status: 'PENDING' }],
    enSections: board([['GT-001', {}], ['GT-999', { priced: true, interest: '4h' }]]),
    baselineIds: new Set(['GT-001']),
  });
  assert.ok(errors.some((error) => /GT-999.*not an interest/s.test(error)), errors.join('\n'));
});

test('being grandfathered exempts a row from stating a number, not from stating it correctly', () => {
  const { errors } = checkNewOpenRowEconomics({
    enRows: [{ id: 'GT-001', status: 'PENDING' }],
    enSections: board([['GT-001', { priced: true, principal: 'HUGE' }]]),
    baselineIds: new Set(['GT-001']),
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /GT-001: principal "HUGE" is not a declared value/);
});

test('a new open row missing from the catalog cannot hide behind the absent section', () => {
  const { errors } = checkNewOpenRowEconomics({
    enRows: [{ id: 'GT-001', status: 'PENDING' }, { id: 'GT-999', status: 'PENDING' }],
    enSections: board([['GT-001', {}]]),
    baselineIds: new Set(['GT-001']),
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /GT-999 is open \(pending\) and has no section in the English catalog/);
});

test('an ES mirror that contradicts the canonical EN figure is a violation', () => {
  const { errors } = checkNewOpenRowEconomics({
    enRows: [{ id: 'GT-001', status: 'PENDING' }],
    enSections: board([['GT-001', { priced: true, principal: 'M' }]]),
    esSections: new Map([['GT-001', [
      '#### GT-001',
      '- **Principal:** `L` · **Interés:** `MED` · **Base:** `estimate`',
    ].join('\n')]]),
    baselineIds: new Set(['GT-001']),
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /ES catalog principal="L" contradicts EN "M"/);
});

// --- The cheap ways to satisfy it, all closed -------------------------------

test('a board with no open rows is a vacuous scan, not a pass', () => {
  assert.throws(
    () => checkNewOpenRowEconomics({
      enRows: [{ id: 'GT-001', status: 'DONE' }],
      enSections: board([['GT-001', {}]]),
      baselineIds: new Set(),
    }),
    ZeroCoverageError,
  );
});

test('a missing baseline file fails instead of exempting nobody or everybody', () => {
  const result = loadBaseline(join(tmpdir(), 'gt599-baseline-that-does-not-exist.json'));
  assert.equal(result.ids.size, 0);
  assert.match(result.errors[0], /baseline file is missing/);

  const { errors } = checkNewOpenRowEconomics({
    enRows: [{ id: 'GT-001', status: 'PENDING' }],
    enSections: board([['GT-001', {}]]),
    baselinePath: join(tmpdir(), 'gt599-baseline-that-does-not-exist.json'),
  });
  assert.match(errors[0], /baseline file is missing/);
});

test('an empty exemption list fails — it is a parse error wearing a green tick', () => {
  const path = sandboxFile('baseline.json', JSON.stringify({ grandfatheredOpenRows: [] }));
  const result = loadBaseline(path);
  assert.match(result.errors[0], /declares no grandfatheredOpenRows/);
});

test('a baseline id that is not a board row is reported as drift', () => {
  const { errors } = checkNewOpenRowEconomics({
    enRows: [{ id: 'GT-001', status: 'PENDING' }],
    enSections: board([['GT-001', {}]]),
    baselineIds: new Set(['GT-001', 'GT-404']),
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /baseline grandfathers GT-404, which is not a row on the board/);
});

test('a row whose status is unreadable is not silently treated as closed', () => {
  // 08-validate-tracking.mjs owns the "unsupported status" error; this guard must simply not
  // let an unparseable status become an exemption.
  const { stats } = checkNewOpenRowEconomics({
    enRows: [{ id: 'GT-001', status: 'PENDING' }, { id: 'GT-999', status: 'HALF-DONE' }],
    enSections: board([['GT-001', {}], ['GT-999', {}]]),
    baselineIds: new Set(['GT-001']),
  });
  assert.equal(stats.openRows, 1, 'the unreadable row is not counted as open…');
  assert.equal(stats.required, 0, '…and is not counted as satisfied either');
});

// --- Against the real board -------------------------------------------------

test('the checked-in baseline matches the board it was recorded from', () => {
  const { errors, stats } = runFromDisk(REPO_ROOT);
  assert.deepEqual(errors, [], `the live board must be clean under this rule:\n${errors.join('\n')}`);
  assert.ok(stats.openRows > 0, 'the live board must have open rows or the scan was vacuous');
  assert.equal(
    stats.grandfathered + stats.required,
    stats.openRows,
    'every open row is either exempt or subject to the requirement',
  );
});

test('the exemption list only ever shrinks — its size is pinned', () => {
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  assert.equal(baseline.recordedOn, '2026-07-28');
  assert.ok(
    baseline.grandfatheredOpenRows.length > 0,
    'the baseline must stay non-empty until the forward-only guard no longer needs an exemption list',
  );
  assert.ok(
    baseline.grandfatheredOpenRows.length <= 47,
    'the baseline recorded 47 already-open rows on 2026-07-28. Growing it grants a NEW row the '
    + 'exemption GT-599 exists to remove; if a row genuinely predates the baseline, correct the '
    + 'recordedOn date and this number together, in a reviewable diff.',
  );
  assert.equal(
    new Set(baseline.grandfatheredOpenRows).size,
    baseline.grandfatheredOpenRows.length,
    'no duplicates',
  );
});

test('the live board would reject a row added today without economics', () => {
  // The forward-looking claim, exercised rather than asserted: take the real board, append the
  // row a future wave would write, and watch the rule fire.
  const boardPath = join(REPO_ROOT, 'reference/core/control-center/gaps/gap-tracking.md');
  const catalogPath = join(REPO_ROOT, 'reference/core/control-center/gaps/gap-reference-catalog.md');
  const boardContent = readFileSync(boardPath, 'utf8');
  const catalogContent = readFileSync(catalogPath, 'utf8');

  const NEW_ID = 'GT-901';
  assert.ok(!boardContent.includes(NEW_ID), 'fixture id must not already exist on the board');

  const enRows = [...parseBoardRows(boardContent), { id: NEW_ID, status: 'PENDING' }];
  const enSections = parseCatalogSections(catalogContent);
  enSections.set(NEW_ID, section(NEW_ID, {}));

  const { errors, stats } = checkNewOpenRowEconomics({ enRows, enSections });
  assert.equal(stats.required, 1);
  assert.equal(errors.length, 1, errors.join('\n'));
  assert.match(errors[0], /GT-901 is a new open row/);

  // …and priced, it passes. Same board, one field line different.
  enSections.set(NEW_ID, section(NEW_ID, { priced: true }));
  const priced = checkNewOpenRowEconomics({ enRows, enSections });
  assert.deepEqual(priced.errors, []);
});
