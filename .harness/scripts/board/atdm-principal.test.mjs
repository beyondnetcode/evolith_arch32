/**
 * GT-599 criterion 3 — self-tests for the ATDM derivation and its applicability measurement.
 *
 * Run: node --test .harness/scripts/board/atdm-principal.test.mjs
 *
 * Two claims are load-bearing and neither was true before this module:
 *
 *   1. Given a rule linkage, the GT-598 mapping, an occurrence count and a sourced repair-effort
 *      table, a principal is COMPUTED — Σ occurrences × effort — and labelled `atdm`.
 *   2. Given the board as it actually stands, the ATDM-derivable subset is measured rather than
 *      claimed, and every unpriced row names the input it is missing.
 *
 * The rest of the suite closes the ways a derivation could quietly become an invention: a
 * default repair time, a linkage inferred from prose, an effort table with no provenance, or an
 * interest emitted by a measure that has no interest term.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseRuleLinkage,
  loadEffortTable,
  loadOccurrences,
  indexMapping,
  deriveRowPrincipal,
  buildAtdmReport,
  atdmInputSchemas,
  BLOCK_REASONS,
  ATDM_SPEC,
} from './atdm-principal.mjs';
import { readReport } from './report-atdm-principal.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const MAPPING = JSON.parse(
  readFileSync(join(REPO_ROOT, 'src/rulesets/standards/iso-5055-mapping.json'), 'utf8'),
);

/** Real corpus rules, chosen because the GT-598 mapping gives them a CWE and a named analyser. */
const LINKED_SECTION = [
  '#### GT-901',
  '',
  '**Title:** Layer structure and command injection',
  '',
  '- **Component:** `Evolith Core` · **Criticality:** P1 · **Complexity:** M',
  '- **Rules:** `HXA-01`, `SEC-INJ-01`',
  '',
].join('\n');

const EFFORT_TABLE = {
  provenance: { source: 'test fixture, NOT the OMG figures', extractedOn: '2026-07-28', method: 'hand-written for this test' },
  repairEffortHoursByCwe: { 1054: 1.5, 78: 4 },
};

const OCCURRENCES = {
  provenance: { analyser: 'fixture', ranOn: '2026-07-28', scope: 'test' },
  occurrences: [
    { gapId: 'GT-901', cwe: 1054, count: 3 },
    { gapId: 'GT-901', cwe: 78, count: 2 },
  ],
};

function derive({ section = LINKED_SECTION, effortTableJson = EFFORT_TABLE, occurrencesJson = OCCURRENCES } = {}) {
  const report = buildAtdmReport({
    openRows: [{ id: 'GT-901', status: 'PENDING' }],
    sections: new Map([['GT-901', section]]),
    mapping: MAPPING,
    effortTableJson,
    occurrencesJson,
  });
  return report;
}

// --- The derivation ---------------------------------------------------------

test('with all four inputs, a principal is COMPUTED from ISO/IEC 5055 occurrences', () => {
  const report = derive();
  assert.equal(report.coverage.derivable, 1);
  const row = report.derived[0];
  // 3 occurrences of CWE-1054 at 1.5h + 2 of CWE-78 at 4h.
  assert.equal(row.principalHours, 3 * 1.5 + 2 * 4);
  assert.equal(row.basis, 'atdm');
  assert.deepEqual(
    row.terms.map((term) => term.cwe).sort((a, b) => a - b),
    [78, 1054],
  );
  assert.ok(row.analysers.length > 0, 'a derived principal names the analyser that counts the weaknesses');
});

test('ATDM emits a principal and never an interest — the measure has no carrying-cost term', () => {
  const row = derive().derived[0];
  assert.ok(!('interest' in row), 'an interest here would be invented, not derived');
  assert.match(ATDM_SPEC.doesNotMeasure, /carrying cost/);
});

test('no effort table means no principal — there is no default repair time anywhere', () => {
  const report = derive({ effortTableJson: null });
  assert.equal(report.coverage.derivable, 0);
  assert.equal(report.blocked[0].reason, 'no-effort-table');
});

test('no occurrence data means no principal — a weakness nobody counted costs nothing to nobody', () => {
  const report = derive({ occurrencesJson: null });
  assert.equal(report.coverage.derivable, 0);
  assert.equal(report.blocked[0].reason, 'no-occurrence-data');
});

test('an effort table missing an in-scope weakness blocks rather than silently dropping the term', () => {
  const report = derive({
    effortTableJson: { ...EFFORT_TABLE, repairEffortHoursByCwe: { 1054: 1.5 } },
  });
  assert.equal(report.coverage.derivable, 0);
  assert.equal(report.blocked[0].reason, 'effort-table-incomplete');
  assert.deepEqual(report.blocked[0].detail.missingEffortForCwes, [78]);
});

test('an effort table with no provenance is rejected — unsourced hours are not an ATDM figure', () => {
  const { table, errors } = loadEffortTable({ repairEffortHoursByCwe: { 78: 4 } });
  assert.equal(table, null);
  assert.ok(errors.some((error) => /provenance\.source is required/.test(error)), errors.join('\n'));
});

test('an occurrence export with no analyser and no date is rejected', () => {
  const { byGap, errors } = loadOccurrences({ occurrences: [{ gapId: 'GT-901', cwe: 78, count: 1 }] });
  assert.equal(byGap, null);
  assert.ok(errors.some((error) => /provenance\.analyser is required/.test(error)), errors.join('\n'));
});

test('a non-positive repair effort is rejected', () => {
  const { errors } = loadEffortTable({ ...EFFORT_TABLE, repairEffortHoursByCwe: { 78: 0 } });
  assert.ok(errors.some((error) => /non-positive/.test(error)), errors.join('\n'));
});

// --- The linkage is declared, never inferred --------------------------------

test('a rule mentioned in the prose is a candidate, never a priced linkage', () => {
  const prose = [
    '#### GT-902',
    '',
    '**Title:** Something about `SEC-INJ-01` in passing',
    '',
  ].join('\n');
  const linkage = parseRuleLinkage(prose, new Set(MAPPING.rules.map((rule) => rule.ruleId)));
  assert.deepEqual(linkage.declared, []);
  assert.deepEqual(linkage.candidates, ['SEC-INJ-01']);

  const report = buildAtdmReport({
    openRows: [{ id: 'GT-902', status: 'PENDING' }],
    sections: new Map([['GT-902', prose]]),
    mapping: MAPPING,
    effortTableJson: EFFORT_TABLE,
    occurrencesJson: {
      provenance: OCCURRENCES.provenance,
      occurrences: [{ gapId: 'GT-902', cwe: 78, count: 99 }],
    },
  });
  assert.equal(report.coverage.derivable, 0, 'prose must not be enough to produce a number');
  assert.equal(report.blocked[0].reason, 'no-rule-linkage');
  assert.deepEqual(report.linkageCandidates, [{ id: 'GT-902', candidateRules: ['SEC-INJ-01'] }]);
});

test('a typo on the Rules line is surfaced instead of shrinking the principal', () => {
  const linkage = parseRuleLinkage(
    '#### GT-903\n- **Rules:** `HXA-01`, `HXA-0l`\n',
    new Set(MAPPING.rules.map((rule) => rule.ruleId)),
  );
  assert.deepEqual(linkage.declared, ['HXA-01']);
  assert.deepEqual(linkage.unknown, ['HXA-0l']);
});

test('rules with no ISO/IEC 5055 equivalent block with the reason that says so', () => {
  const byRule = indexMapping(MAPPING);
  // ABAC-03 is mapped in GT-598 as having no international equivalent.
  assert.equal(byRule.get('ABAC-03').strength, 'none');
  const row = deriveRowPrincipal({
    id: 'GT-904',
    section: '#### GT-904\n- **Rules:** `ABAC-03`\n',
    byRule,
    effortTable: new Map([[78, 4]]),
    occurrences: new Map([['GT-904', new Map([[78, 1]])]]),
  });
  assert.equal(row.derivable, false);
  assert.equal(row.reason, 'rules-not-mapped');
});

test('a mapped rule with no named analyser blocks — nothing can count its occurrences', () => {
  const byRule = indexMapping(MAPPING);
  // ABAC-01 maps partially to CWE-732 but GT-598 records no off-the-shelf analyser for it.
  assert.equal(byRule.get('ABAC-01').adoptable, 'no');
  const row = deriveRowPrincipal({
    id: 'GT-905',
    section: '#### GT-905\n- **Rules:** `ABAC-01`\n',
    byRule,
    effortTable: new Map([[732, 4]]),
    occurrences: new Map([['GT-905', new Map([[732, 1]])]]),
  });
  assert.equal(row.derivable, false);
  assert.equal(row.reason, 'no-named-analyser');
});

// --- The measurement against the real board ---------------------------------

test('the derivable subset of the live board is measured, with a reason for every unpriced row', () => {
  const report = readReport(REPO_ROOT);

  assert.ok(report.denominators.openRows > 0, 'a zero denominator would be a broken parser, not a clean board');
  assert.equal(
    report.coverage.derivable + report.coverage.blocked,
    report.denominators.openRows,
    'every open row is either derivable or blocked with a stated reason',
  );
  assert.equal(
    Object.values(report.reasonCounts).reduce((total, count) => total + count, 0),
    report.coverage.blocked,
    'no blocked row is missing its reason',
  );
  for (const reason of Object.keys(report.reasonCounts)) {
    assert.ok(reason in BLOCK_REASONS, `reason ${reason} must be documented`);
  }
  assert.equal(report.inputs.errors.length, 0);
  assert.ok(report.inputs.corpusRules > 300, 'the GT-598 mapping must actually be loaded');

  // The finding, pinned so it cannot drift silently: with neither an ATDM effort table nor an
  // analyser run in this repository, and with no row declaring a rule linkage, nothing on the
  // open board is ATDM-derivable. If this ever fails because a row became derivable, that is
  // the good outcome — update the number and the README together.
  assert.equal(report.coverage.derivable, 0);
  assert.equal(report.reasonCounts['no-rule-linkage'], report.denominators.openRows);
});

test('the two inputs this repository does not hold are specified, so they can be supplied', () => {
  const schemas = atdmInputSchemas();
  assert.equal(schemas.effortTable.required.includes('provenance'), true);
  assert.equal(schemas.occurrences.required.includes('provenance'), true);
  assert.match(schemas.effortTable.description, /Not checked into this repository/);
});
