/**
 * GT-599 — self-tests for the debt-economics format and its reporter.
 *
 * Run: node --test .harness/scripts/board/debt-economics.test.mjs
 *
 * Every assertion here fails without the module: the format did not exist before it, so
 * "a value with no unit is rejected" and "the denominator is published" are both new
 * behaviour rather than a restatement of something already true.
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
  parsePrincipal,
  parseInterest,
  parseBasis,
  validateEconomics,
  extractEconomicsFields,
  parseBoardRows,
  parseCatalogSections,
  buildEconomicsReport,
  economicsJsonSchema,
  renderEconomicsLine,
  isOpen,
  canonicalStatus,
  PRINCIPAL_BANDS,
  INTEREST_BANDS,
  HOURS_PER_DAY,
} from './debt-economics.mjs';
import { readReport } from './report-debt-economics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');

/** Synthetic repo roots, removed at the end so the suite leaves no residue. */
const sandboxes = [];
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'gt599-'));
  sandboxes.push(dir);
  const gaps = join(dir, 'reference/core/control-center/gaps');
  mkdirSync(gaps, { recursive: true });
  return { dir, gaps };
}
after(() => {
  for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true });
});

// --- The unit is not optional ----------------------------------------------

test('a principal band resolves to a declared hour range', () => {
  const result = parsePrincipal('M');
  assert.equal(result.ok, true);
  assert.equal(result.value.band, 'M');
  assert.equal(result.value.minHours, PRINCIPAL_BANDS.M.minHours);
  assert.equal(result.value.maxHours, PRINCIPAL_BANDS.M.maxHours);
  assert.equal(result.value.unit, 'engineer-hours');
});

test('an explicit principal in days converts to hours at the declared rate', () => {
  const result = parsePrincipal('3d');
  assert.equal(result.ok, true);
  assert.equal(result.value.minHours, 3 * HOURS_PER_DAY);
  assert.equal(result.value.band, null);
});

test('a bare number is rejected as a principal — an unlabelled figure is the defect', () => {
  const result = parsePrincipal('12');
  assert.equal(result.ok, false);
  assert.match(result.error, /not a declared value/);
});

test('an interest without a period is rejected', () => {
  const bare = parseInterest('4h');
  assert.equal(bare.ok, false);
  assert.match(bare.error, /not an interest/);

  const withPeriod = parseInterest('4h/30d');
  assert.equal(withPeriod.ok, true);
  assert.equal(withPeriod.value.minHours, 4);
});

test('interest bands resolve to hours per 30-day period', () => {
  const result = parseInterest('HIGH');
  assert.equal(result.ok, true);
  assert.equal(result.value.minHours, INTEREST_BANDS.HIGH.minHours);
  assert.match(result.value.unit, /30-day period/);
});

test('the basis must be one of the three declared methods', () => {
  assert.equal(parseBasis('atdm').ok, true);
  assert.equal(parseBasis('sqale').ok, true);
  assert.equal(parseBasis('estimate').ok, true);
  assert.equal(parseBasis('vibes').ok, false);
});

test('a derived basis is flagged as derived, an estimate is not', () => {
  const derived = validateEconomics({ principal: '16h', interest: '2h/30d', basis: 'atdm' });
  assert.equal(derived.record.derived, true);
  const guessed = validateEconomics({ principal: 'M', interest: 'MED', basis: 'estimate' });
  assert.equal(guessed.record.derived, false);
});

test('a half-filled record is a violation, not a record', () => {
  const result = validateEconomics({ principal: 'M' });
  assert.equal(result.record, null);
  assert.ok(result.errors.some((e) => /interest is missing/.test(e)));
  assert.ok(result.errors.some((e) => /basis is missing/.test(e)));
});

test('an absent record is not an error — it is the thing being counted', () => {
  const result = validateEconomics({});
  assert.equal(result.record, null);
  assert.deepEqual(result.errors, []);
});

// --- Field extraction -------------------------------------------------------

test('the canonical field line round-trips through render and extract', () => {
  const { record } = validateEconomics({ principal: 'L', interest: 'HIGH', basis: 'sqale' });
  const line = renderEconomicsLine(record);
  const fields = extractEconomicsFields(`#### GT-1\n\n${line}\n`);
  assert.deepEqual(fields, { principal: 'L', interest: 'HIGH', basis: 'sqale' });
});

test('the Spanish labels are accepted', () => {
  const fields = extractEconomicsFields('- **Principal:** `S` · **Interés:** `LOW` · **Base:** `estimate`');
  assert.deepEqual(fields, { principal: 'S', interest: 'LOW', basis: 'estimate' });
});

test('prose containing the word principal is not mistaken for a declared value', () => {
  // GT-609's real evidence text, which says "with no principal, tenant or scope in it".
  const body = '#### GT-609\n\n- **Evidence:** a single literal key, with no principal, tenant or scope in it.\n';
  assert.deepEqual(extractEconomicsFields(body), { principal: null, interest: null, basis: null });
});

// --- Board parsing ----------------------------------------------------------

const BOARD_HEADER = '| ID | Gap | What it means | Example | Component | Phase | Criticality | Complexity | Status |';
const BOARD_SEP = '|---|---|---|---|:---:|:---:|:---:|:---:|:---:|';

function board(rows) {
  return [BOARD_HEADER, BOARD_SEP, ...rows].join('\n');
}

test('open means everything that is not done, deferred included', () => {
  assert.equal(isOpen(canonicalStatus('PENDING')), true);
  assert.equal(isOpen(canonicalStatus('IN-PROGRESS')), true);
  assert.equal(isOpen(canonicalStatus('DEFERRED')), true);
  assert.equal(isOpen(canonicalStatus('BLOCKED')), true);
  assert.equal(isOpen(canonicalStatus('DONE')), false);
  assert.equal(isOpen(canonicalStatus('COMPLETADO')), false);
});

test('the board parser reads optional Principal/Interest columns when the header declares them', () => {
  const content = [
    '| ID | Gap | Component | Principal | Interest | Basis | Status |',
    '|---|---|---|---|---|---|---|',
    '| [`GT-1`](x) | text | `Core` | `M` | `MED` | `estimate` | `PENDING` |',
  ].join('\n');
  const [row] = parseBoardRows(content);
  assert.equal(row.id, 'GT-1');
  assert.equal(row.principal, 'M');
  assert.equal(row.interest, 'MED');
  assert.equal(row.hasEconomicsColumns, true);
});

test('the board parser tolerates the current 9-column board with no economics columns', () => {
  const rows = parseBoardRows(board(['| [`GT-1`](x) | g | | | `Core` | Cross | P2 | M | `PENDING` |']));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'PENDING');
  assert.equal(rows[0].principal, null);
  assert.equal(rows[0].hasEconomicsColumns, false);
});

// --- The report -------------------------------------------------------------

function fixture({ rows, catalog, esCatalog = null }) {
  return buildEconomicsReport({
    boardContent: board(rows),
    catalogContent: catalog,
    esCatalogContent: esCatalog,
  });
}

test('the report publishes its denominator and counts only OPEN rows', () => {
  const report = fixture({
    rows: [
      '| [`GT-1`](x) | g | | | `Core` | Cross | P0 | M | `PENDING` |',
      '| [`GT-2`](x) | g | | | `Core` | Cross | P1 | S | `IN-PROGRESS` |',
      '| [`GT-3`](x) | g | | | `Core` | Cross | P2 | S | `DONE` |',
    ],
    catalog: [
      '#### GT-1',
      '',
      '- **Principal:** `M` · **Interest:** `MED` · **Basis:** `estimate`',
      '',
      '#### GT-2',
      '',
      '- **Component:** `Core`',
      '',
      '#### GT-3',
      '',
      '- **Component:** `Core`',
      '',
    ].join('\n'),
  });

  assert.equal(report.denominators.boardRows, 3);
  assert.equal(report.denominators.openRows, 2, 'the DONE row leaves the denominator');
  assert.equal(report.coverage.covered, 1);
  assert.equal(report.coverage.missing, 1);
  assert.equal(report.coverage.ratio, 0.5);
  assert.deepEqual(report.missing.map((m) => m.id), ['GT-2']);
  assert.deepEqual(report.violations, []);
});

test('the report totals the recorded debt as an hour range, so the sentence has numbers', () => {
  const report = fixture({
    rows: [
      '| [`GT-1`](x) | g | | | `Core` | Cross | P0 | M | `PENDING` |',
      '| [`GT-2`](x) | g | | | `Core` | Cross | P1 | S | `PENDING` |',
    ],
    catalog: [
      '#### GT-1',
      '- **Principal:** `16h` · **Interest:** `4h/30d` · **Basis:** `atdm`',
      '#### GT-2',
      '- **Principal:** `8h` · **Interest:** `2h/30d` · **Basis:** `atdm`',
    ].join('\n'),
  });

  assert.equal(report.totals.principal.minHours, 24);
  assert.equal(report.totals.principal.maxHours, 24);
  assert.equal(report.totals.interest.minHours, 6);
  assert.equal(report.coverage.derived, 2);
  assert.equal(report.coverage.derivedRatio, 1);
  assert.equal(report.basisCounts.atdm, 2);
});

test('a malformed value is a violation even in reporting mode', () => {
  const report = fixture({
    rows: ['| [`GT-1`](x) | g | | | `Core` | Cross | P0 | M | `PENDING` |'],
    catalog: '#### GT-1\n- **Principal:** `2 weeks` · **Interest:** `a lot` · **Basis:** `estimate`\n',
  });
  assert.equal(report.coverage.covered, 0);
  assert.ok(report.violations.some((v) => /principal "2 weeks" is not a declared value/.test(v)));
  assert.ok(report.violations.some((v) => /interest "a lot"/.test(v)));
});

test('two figures for one debt item is a violation: board column vs catalog', () => {
  const report = buildEconomicsReport({
    boardContent: [
      '| ID | Gap | Principal | Interest | Basis | Status |',
      '|---|---|---|---|---|---|',
      '| [`GT-1`](x) | g | `L` | `MED` | `estimate` | `PENDING` |',
    ].join('\n'),
    catalogContent: '#### GT-1\n- **Principal:** `M` · **Interest:** `MED` · **Basis:** `estimate`\n',
  });
  assert.ok(report.violations.some((v) => /board column principal="L" contradicts catalog principal="M"/.test(v)));
});

test('a Spanish mirror that disagrees with the English canon is a violation', () => {
  const report = fixture({
    rows: ['| [`GT-1`](x) | g | | | `Core` | Cross | P0 | M | `PENDING` |'],
    catalog: '#### GT-1\n- **Principal:** `M` · **Interest:** `MED` · **Basis:** `estimate`\n',
    esCatalog: '#### GT-1\n- **Principal:** `XL` · **Interés:** `MED` · **Base:** `estimate`\n',
  });
  assert.ok(report.violations.some((v) => /ES catalog principal="XL" contradicts EN "M"/.test(v)));
});

test('an absent Spanish mirror is NOT a violation — a number does not need translating', () => {
  const report = fixture({
    rows: ['| [`GT-1`](x) | g | | | `Core` | Cross | P0 | M | `PENDING` |'],
    catalog: '#### GT-1\n- **Principal:** `M` · **Interest:** `MED` · **Basis:** `estimate`\n',
    esCatalog: '#### GT-1\n- **Componente:** `Core`\n',
  });
  assert.deepEqual(report.violations, []);
  assert.equal(report.coverage.covered, 1);
});

// --- Anti-vacuous pass ------------------------------------------------------

test('a board whose row shape stopped matching fails instead of reporting full coverage', () => {
  const { dir, gaps } = sandbox();
  // A board the parser cannot read: no `| ID |` header at all.
  writeFileSync(join(gaps, 'gap-tracking.md'), '# Board\n\nno table here\n');
  writeFileSync(join(gaps, 'gap-reference-catalog.md'), '#### GT-1\n\n- **Component:** `Core`\n');

  assert.throws(() => readReport(dir), (error) => {
    assert.equal(error.name, 'ZeroCoverageError');
    assert.match(error.message, /ZERO board rows scanned/);
    return true;
  });
});

test('a board with rows but zero OPEN rows also fails — that is what a broken status column looks like', () => {
  const { dir, gaps } = sandbox();
  writeFileSync(
    join(gaps, 'gap-tracking.md'),
    board(['| [`GT-1`](x) | g | | | `Core` | Cross | P0 | M | `DONE` |']),
  );
  writeFileSync(join(gaps, 'gap-reference-catalog.md'), '#### GT-1\n\n- **Component:** `Core`\n');

  assert.throws(() => readReport(dir), (error) => {
    assert.match(error.message, /ZERO OPEN board rows scanned/);
    return true;
  });
});

// --- Schema anti-drift ------------------------------------------------------

test('the checked-in JSON Schema is exactly what the module generates', () => {
  const path = join(__dirname, 'debt-economics.schema.json');
  assert.ok(existsSync(path), 'debt-economics.schema.json must be checked in');
  const onDisk = JSON.parse(readFileSync(path, 'utf8'));
  assert.deepEqual(
    onDisk,
    economicsJsonSchema(),
    'the schema file drifted from debt-economics.mjs — regenerate it with --write-schema',
  );
});

test('the schema declares the unit of both fields', () => {
  const schema = economicsJsonSchema();
  assert.equal(schema.$defs.principal.unit, 'engineer-hours');
  assert.match(schema.$defs.interest.unit, /30-day period/);
});

// --- Against the real board -------------------------------------------------

test('the reporter runs against the real board and publishes a non-zero denominator', () => {
  const report = readReport(REPO_ROOT);
  assert.ok(report.denominators.boardRows > 100, `expected a populated board, got ${report.denominators.boardRows}`);
  assert.ok(report.denominators.openRows > 0);
  assert.equal(
    report.coverage.covered + report.coverage.missing,
    report.denominators.openRows,
    'covered + missing must equal the denominator, or the report is not a partition',
  );
});
