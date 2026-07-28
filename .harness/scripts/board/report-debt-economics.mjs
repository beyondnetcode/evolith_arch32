#!/usr/bin/env node

/**
 * GT-599 — measure the economics gap before anyone fills it.
 *
 * WHAT THIS REPORTS
 * How many OPEN rows of the gap board carry a principal and an interest, out of how many
 * open rows there are. The denominator is the point: "3 rows have economics" is a number
 * nobody can act on; "3 of 56" is.
 *
 * WHAT THIS DOES NOT DO
 * It does not write to the board. Back-filling 56 rows with invented estimates would be
 * manufacturing evidence — the exact failure mode this backlog exists to catch. The
 * mechanism and the measurement are automatable; the figures are a human act.
 *
 * MODES
 *   default        reporting. Prints the coverage, exits 0. Malformed values still fail.
 *   --strict       fails when any open row lacks its economics. This is the flag the
 *                  tracking guard should call once the back-fill has landed, which is how
 *                  GT-599's second acceptance criterion ("the guard rejects a new open row
 *                  without them") gets enforced without blocking the repository today.
 *   --json         machine-readable report on stdout, nothing else.
 *   --emit-schema  print the JSON Schema for the two fields.
 *
 * ANTI-VACUOUS PASS
 * A zero-row board, a zero-section catalog or a zero-row denominator is a hard failure via
 * lib/coverage.mjs: this script matches a hand-written Markdown shape, so "0 of 0 rows are
 * missing economics" is what a broken parser looks like, not a clean board.
 *
 * Usage:
 *   node .harness/scripts/board/report-debt-economics.mjs [--verbose] [--strict] [--json]
 *   node .harness/scripts/board/report-debt-economics.mjs --root <dir>
 *   node .harness/scripts/board/report-debt-economics.mjs --emit-schema
 *
 * Exit codes:
 *   0  report produced; open rows may still be missing economics (unless --strict)
 *   1  a malformed or contradictory economics value, a vacuous scan, or --strict with a
 *      remaining gap
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertScanned, ZeroCoverageError } from '../lib/coverage.mjs';
import {
  buildEconomicsReport,
  economicsJsonSchema,
  PRINCIPAL_UNIT,
  INTEREST_UNIT,
  INTEREST_UNIT_SHORT,
  BASES,
} from './debt-economics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOL = 'board-debt-economics';

const BOARD_REL = 'reference/core/control-center/gaps/gap-tracking.md';
const CATALOG_REL = 'reference/core/control-center/gaps/gap-reference-catalog.md';
const ES_CATALOG_REL = 'reference/core/control-center/gaps/gap-reference-catalog.es.md';
const SCHEMA_PATH = join(__dirname, 'debt-economics.schema.json');

function parseArgs(argv) {
  const rootIdx = argv.indexOf('--root');
  const writeSchema = argv.includes('--write-schema');
  return {
    verbose: argv.includes('--verbose'),
    strict: argv.includes('--strict'),
    json: argv.includes('--json'),
    emitSchema: argv.includes('--emit-schema') || writeSchema,
    writeSchema,
    root: rootIdx !== -1 ? resolve(process.cwd(), argv[rootIdx + 1]) : resolve(__dirname, '../../..'),
  };
}

function pct(ratio) {
  return ratio === null ? 'n/a' : `${(ratio * 100).toFixed(1)}%`;
}

function pad(label) {
  return `${label} ${'.'.repeat(Math.max(1, 30 - label.length))}`;
}

export function readReport(root) {
  const board = join(root, BOARD_REL);
  const catalog = join(root, CATALOG_REL);
  const esCatalog = join(root, ES_CATALOG_REL);

  for (const file of [board, catalog]) {
    if (!existsSync(file)) {
      throw new Error(
        `${TOOL}: required board artifact does not exist: ${file}\n`
        + '  Refusing to report "no rows are missing economics" over a file that is not there.',
      );
    }
  }

  const report = buildEconomicsReport({
    boardContent: readFileSync(board, 'utf8'),
    catalogContent: readFileSync(catalog, 'utf8'),
    esCatalogContent: existsSync(esCatalog) ? readFileSync(esCatalog, 'utf8') : null,
  });

  assertScanned(report.denominators.boardRows, { what: 'board rows', where: BOARD_REL });
  assertScanned(report.denominators.catalogSections, { what: 'catalog sections', where: CATALOG_REL });
  assertScanned(report.denominators.openRows, {
    what: 'OPEN board rows',
    where: `${BOARD_REL} (status column)`,
  });

  return report;
}

function printHuman(report, { verbose }) {
  const { denominators: d, coverage: c, totals, basisCounts, violations } = report;

  console.log(`${TOOL} — SEI principal/interest coverage across the gap board`);
  console.log(`  ${pad('board rows scanned')} ${d.boardRows}`);
  console.log(`  ${pad('catalog sections')} ${d.catalogSections} EN / ${d.esCatalogSections} ES`);
  console.log(
    `  ${pad('OPEN rows (denominator)')} ${d.openRows}`
    + `  [${Object.entries(d.byStatus).filter(([s]) => s !== 'done').map(([s, n]) => `${s} ${n}`).join(' · ') || 'none'}]`,
  );
  console.log(`  ${pad('with principal + interest')} ${c.covered}`);
  console.log(`  ${pad('missing economics')} ${c.missing}`);
  console.log(
    `  ${pad('basis breakdown')} `
    + Object.keys(BASES).map((key) => `${key} ${basisCounts[key]}`).join(' · ')
    + `  (derived ${c.derived}/${c.covered}, ${pct(c.derivedRatio)})`,
  );
  console.log('');
  console.log(`  units: principal = ${PRINCIPAL_UNIT}; interest = ${INTEREST_UNIT} (${INTEREST_UNIT_SHORT})`);
  console.log(`  => ${c.covered}/${d.openRows} open row(s) carry an economics record (${pct(c.ratio)})`);

  if (c.covered > 0) {
    console.log(
      `  => recorded debt so far: principal ${totals.principal.minHours}-${totals.principal.maxHours} h, `
      + `growing ${totals.interest.minHours}-${totals.interest.maxHours} ${INTEREST_UNIT_SHORT}`,
    );
  }

  if (c.missing > 0) {
    const ids = report.missing.map((entry) => entry.id);
    const shown = verbose ? ids : ids.slice(0, 20);
    console.log('');
    console.log(`  ${c.missing} open row(s) without a principal and an interest:`);
    console.log(`    ${shown.join(', ')}${shown.length < ids.length ? `, … (+${ids.length - shown.length}, use --verbose)` : ''}`);
    console.log('    A human fills these. Add to the row\'s catalog section:');
    console.log('      - **Principal:** `M` · **Interest:** `MED` · **Basis:** `estimate`');
    console.log('    Convention: reference/core/control-center/README.md § Debt economics');
  }

  if (violations.length > 0) {
    console.error('');
    console.error(`✗ ${TOOL}: ${violations.length} malformed or contradictory economics value(s):`);
    for (const violation of violations) console.error(`  • ${violation}`);
  }
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);

  if (options.emitSchema) {
    const schema = `${JSON.stringify(economicsJsonSchema(), null, 2)}\n`;
    if (options.writeSchema) {
      writeFileSync(SCHEMA_PATH, schema);
      console.log(`${TOOL}: wrote ${SCHEMA_PATH}`);
    } else {
      process.stdout.write(schema);
    }
    return 0;
  }

  const report = readReport(options.root);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printHuman(report, options);
  }

  if (report.violations.length > 0) return 1;

  if (options.strict && report.coverage.missing > 0) {
    console.error('');
    console.error(
      `✗ ${TOOL}: --strict and ${report.coverage.missing} of ${report.denominators.openRows} open row(s) `
      + 'still have no principal and no interest.',
    );
    return 1;
  }

  if (!options.json) {
    console.log('');
    if (report.coverage.missing > 0) {
      console.log(
        `⚠️  REPORTING MODE — THIS IS NOT A PASS. ${report.coverage.missing} of ${report.denominators.openRows} `
        + 'open rows are still prioritised without an economic figure. Run with --strict once they are filled.',
      );
    } else {
      console.log(`✓ All ${report.denominators.openRows} open row(s) carry a principal and an interest.`);
    }
  }

  return 0;
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

export { main };
