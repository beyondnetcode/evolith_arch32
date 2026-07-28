#!/usr/bin/env node

/**
 * GT-599 criterion 3 — measure the ATDM-derivable subset of the open board.
 *
 * WHAT THIS REPORTS
 * For every OPEN row: whether an ATDM-derived principal is computable, and if not, which of
 * the four inputs is missing. The answer today is a number, not an opinion, and it is
 * reproducible on a clean checkout with no network and no generated state.
 *
 * WHAT THIS DOES NOT DO
 * It never falls back to a default repair time, never infers a rule linkage from prose, and
 * never emits an interest — ATDM is a repair-cost model and has no carrying-cost term. A row
 * this tool cannot price is reported as unpriced, which is the correct result and not a
 * failure of the tool.
 *
 * Usage:
 *   node .harness/scripts/board/report-atdm-principal.mjs [--verbose] [--json]
 *   node .harness/scripts/board/report-atdm-principal.mjs --effort-table <file> --occurrences <file>
 *   node .harness/scripts/board/report-atdm-principal.mjs --emit-schema
 *
 * Exit codes:
 *   0  report produced (a derivable subset of zero is a result, not an error)
 *   1  a supplied input was malformed, or the scan was vacuous
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertScanned, ZeroCoverageError } from '../lib/coverage.mjs';
import { canonicalStatus, isOpen, parseBoardRows, parseCatalogSections } from './debt-economics.mjs';
import { buildAtdmReport, atdmInputSchemas, BLOCK_REASONS, ATDM_SPEC } from './atdm-principal.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOL = 'board-atdm-principal';

const BOARD_REL = 'reference/core/control-center/gaps/gap-tracking.md';
const CATALOG_REL = 'reference/core/control-center/gaps/gap-reference-catalog.md';
const MAPPING_REL = 'src/rulesets/standards/iso-5055-mapping.json';

function parseArgs(argv) {
  const at = (flag) => {
    const index = argv.indexOf(flag);
    return index !== -1 ? argv[index + 1] : null;
  };
  return {
    verbose: argv.includes('--verbose'),
    json: argv.includes('--json'),
    emitSchema: argv.includes('--emit-schema'),
    effortTable: at('--effort-table'),
    occurrences: at('--occurrences'),
    root: at('--root') ? resolve(process.cwd(), at('--root')) : resolve(__dirname, '../../..'),
  };
}

function readJson(path, label) {
  if (!path) return null;
  const resolved = resolve(process.cwd(), path);
  if (!existsSync(resolved)) throw new Error(`${TOOL}: ${label} does not exist: ${resolved}`);
  return JSON.parse(readFileSync(resolved, 'utf8'));
}

export function readReport(root, { effortTable = null, occurrences = null } = {}) {
  const board = join(root, BOARD_REL);
  const catalog = join(root, CATALOG_REL);
  const mappingPath = join(root, MAPPING_REL);

  for (const file of [board, catalog, mappingPath]) {
    if (!existsSync(file)) {
      throw new Error(
        `${TOOL}: required artifact does not exist: ${file}\n`
        + '  Refusing to report "no row is ATDM-derivable" over a file that is not there.',
      );
    }
  }

  const allRows = parseBoardRows(readFileSync(board, 'utf8'));
  assertScanned(allRows.length, { what: 'board rows', where: BOARD_REL });

  const sections = parseCatalogSections(readFileSync(catalog, 'utf8'));
  assertScanned(sections.size, { what: 'catalog sections', where: CATALOG_REL });

  const mapping = JSON.parse(readFileSync(mappingPath, 'utf8'));
  assertScanned(Array.isArray(mapping?.rules) ? mapping.rules.length : 0, {
    what: 'ISO/IEC 5055 rule mappings',
    where: MAPPING_REL,
  });

  const openRows = allRows.filter((row) => isOpen(canonicalStatus(row.status)));
  assertScanned(openRows.length, { what: 'OPEN board rows', where: `${BOARD_REL} (status column)` });

  return buildAtdmReport({
    openRows,
    sections,
    mapping,
    effortTableJson: effortTable,
    occurrencesJson: occurrences,
  });
}

function pad(label) {
  return `${label} ${'.'.repeat(Math.max(1, 32 - label.length))}`;
}

function printHuman(report, { verbose }) {
  const { inputs, denominators: d, coverage: c, reasonCounts } = report;

  console.log(`${TOOL} — is an ATDM-derived principal computable, row by row?`);
  console.log(`  ${ATDM_SPEC.id} ${ATDM_SPEC.version} — ${ATDM_SPEC.measures}`);
  console.log('');
  console.log(`  ${pad('OPEN rows (denominator)')} ${d.openRows}`);
  console.log(`  ${pad('corpus rules mapped (GT-598)')} ${inputs.corpusRules}`);
  console.log(`  ${pad('effort table supplied')} ${inputs.effortTable ? `${inputs.effortTable.weaknesses} weaknesses` : 'NO (--effort-table)'}`);
  console.log(`  ${pad('occurrence export supplied')} ${inputs.occurrences ? `${inputs.occurrences.gaps} gap(s)` : 'NO (--occurrences)'}`);
  console.log('');
  console.log(`  ${pad('ATDM-derivable principals')} ${c.derivable}`);
  console.log(`  ${pad('not derivable')} ${c.blocked}`);

  console.log('');
  console.log('  why not, per row:');
  for (const [reason, count] of Object.entries(reasonCounts)) {
    if (count === 0) continue;
    console.log(`    ${String(count).padStart(3)}  ${reason} — ${BLOCK_REASONS[reason]}`);
  }

  if (report.derived.length > 0) {
    console.log('');
    console.log('  derived (principal only — ATDM has no interest term):');
    for (const row of report.derived) {
      console.log(`    ${row.id}: ${row.principalHours} engineer-hours, basis atdm  [${row.analysers.join(', ')}]`);
      if (verbose) {
        for (const term of row.terms) {
          console.log(`        CWE-${term.cwe}: ${term.occurrences} × ${term.repairEffortHours}h = ${term.hours}h`);
        }
      }
    }
  }

  if (report.linkageCandidates.length > 0) {
    console.log('');
    console.log('  rows whose prose names corpus rules but which declare no linkage:');
    for (const row of report.linkageCandidates) {
      console.log(`    ${row.id}: candidates ${row.candidateRules.join(', ')}  (promote with `
        + '`- **Rules:** `…``, then this tool will price them)');
    }
  }

  console.log('');
  console.log(
    `  => ${c.derivable} of ${d.openRows} open row(s) can be priced by ATDM today; `
    + `${c.blocked} need a human figure (basis \`estimate\`).`,
  );
  console.log(
    '  ATDM prices occurrences of ISO/IEC 5055 weaknesses in source code. A board row that is a '
    + 'decision,\n  a document or a milestone is not a weakness occurrence, and no repair-time survey prices it.',
  );

  if (inputs.errors.length > 0) {
    console.error('');
    console.error(`✗ ${TOOL}: ${inputs.errors.length} malformed input(s):`);
    for (const error of inputs.errors) console.error(`  • ${error}`);
  }
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.emitSchema) {
    process.stdout.write(`${JSON.stringify(atdmInputSchemas(), null, 2)}\n`);
    return 0;
  }

  const report = readReport(options.root, {
    effortTable: readJson(options.effortTable, '--effort-table'),
    occurrences: readJson(options.occurrences, '--occurrences'),
  });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printHuman(report, options);
  }

  return report.inputs.errors.length > 0 ? 1 : 0;
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === entryPoint) {
  try {
    process.exit(main());
  } catch (error) {
    if (error instanceof ZeroCoverageError) {
      console.error(`\n✗ ${TOOL}: ${error.message}`);
      process.exit(1);
    }
    console.error(`\n✗ ${TOOL} crashed: ${error?.stack || error}`);
    process.exit(1);
  }
}

export { main, TOOL };
