#!/usr/bin/env node

/**
 * @file new-row-economics-guard.mjs
 * @description GT-599, acceptance criterion 2 — "the tracking guard rejects a new open row
 * without them".
 *
 * ## Why this is a separate module
 *
 * The criterion names `.harness/scripts/ci/08-validate-tracking.mjs`, and that file is the
 * right place for the *call*. It is not the right place for the *rule*: the tracking guard
 * is already 400 lines of board invariants, and the economics rule needs a checked-in
 * exemption list, a schema and its own tests. So the rule lives here, next to the format it
 * enforces, and `08` gets a two-line wiring:
 *
 *     import { checkNewOpenRowEconomics } from '../board/new-row-economics-guard.mjs';
 *     // …inside validateTrackingState(), after the existing checks:
 *     errors.push(...checkNewOpenRowEconomics({ enRows, enSections, esSections }).errors);
 *
 * The signature is deliberately the shape `08` already has in hand — `enRows` as
 * `{ id, status }[]` and `enSections` / `esSections` as `Map<id, sectionBody>` — so the
 * wiring needs no adapter and no re-parsing.
 *
 * ## Forward-only, on purpose
 *
 * A guard that demanded economics on all 47 currently-open rows would be unsatisfiable
 * today, and the only way to satisfy it would be to invent 47 estimates. That is the failure
 * this gap exists to prevent, so the requirement is armed forward-only against a checked-in
 * baseline of the rows that were already open (`debt-economics-baseline.json`). A row opened
 * after that baseline was recorded must carry a principal and an interest; a row that was
 * already open is exempt until a human prices it.
 *
 * This is not a soft mode: it fails, today, for any row not on that list. What it is not is
 * retroactive.
 *
 * ## What counts as a failure
 *
 *   - a non-grandfathered OPEN row with no economics line               -> error
 *   - a non-grandfathered OPEN row with a malformed one (bad band, an   -> error
 *     interest with no period, an undeclared basis)
 *   - ANY row, grandfathered or not, whose economics line is malformed  -> error
 *     (a broken figure is worse than an absent one, and being exempt
 *     from providing a number is not licence to provide a wrong one)
 *   - the baseline file missing, unparseable or empty                   -> error
 *   - a baseline id that is not a board row at all                      -> error
 *   - zero open rows examined                                           -> ZeroCoverageError
 *
 * A grandfathered row that has SINCE been priced is not an error and not a warning: it is
 * the outcome the baseline is waiting for.
 *
 * Usage (standalone; the CI path is the import above):
 *   node .harness/scripts/board/new-row-economics-guard.mjs [--root <dir>] [--json]
 *
 * Exit codes: 0 clean · 1 violation, vacuous scan or unreadable input.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertScanned, ZeroCoverageError } from '../lib/coverage.mjs';
import {
  canonicalStatus,
  isOpen,
  extractEconomicsFields,
  validateEconomics,
  parseBoardRows,
  parseCatalogSections,
} from './debt-economics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOL = 'board-new-row-economics';

export const BASELINE_PATH = join(__dirname, 'debt-economics-baseline.json');

const BOARD_REL = 'reference/core/control-center/gaps/gap-tracking.md';
const CATALOG_REL = 'reference/core/control-center/gaps/gap-reference-catalog.md';
const ES_CATALOG_REL = 'reference/core/control-center/gaps/gap-reference-catalog.es.md';

const CONVENTION_HINT =
  'Add to the row\'s section in reference/core/control-center/gaps/gap-reference-catalog.md:\n'
  + '      - **Principal:** `M` · **Interest:** `MED` · **Basis:** `estimate`\n'
  + '    Convention and bands: reference/core/control-center/README.md § Debt economics';

/**
 * Read the checked-in exemption list.
 *
 * Absence is an error rather than an empty set: "no baseline" would silently turn the guard
 * into a demand for economics on every open row, which no one can satisfy and everyone would
 * therefore disable.
 *
 * @param {string} [path]
 * @returns {{ ids: Set<string>, recordedOn: string|null, errors: string[] }}
 */
export function loadBaseline(path = BASELINE_PATH) {
  if (!existsSync(path)) {
    return {
      ids: new Set(),
      recordedOn: null,
      errors: [`${TOOL}: baseline file is missing: ${path} — refusing to guess which rows are exempt`],
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    return { ids: new Set(), recordedOn: null, errors: [`${TOOL}: baseline file is not valid JSON: ${error.message}`] };
  }
  const list = parsed?.grandfatheredOpenRows;
  if (!Array.isArray(list) || list.length === 0) {
    return {
      ids: new Set(),
      recordedOn: null,
      errors: [`${TOOL}: baseline declares no grandfatheredOpenRows — an empty exemption list is almost certainly a parse or path error, not a priced board`],
    };
  }
  const errors = [];
  const ids = new Set();
  for (const id of list) {
    if (typeof id !== 'string' || !/^(GT-\d+|MT-A\d+)$/.test(id)) {
      errors.push(`${TOOL}: baseline contains a malformed id: ${JSON.stringify(id)}`);
      continue;
    }
    if (ids.has(id)) errors.push(`${TOOL}: baseline lists ${id} twice`);
    ids.add(id);
  }
  return { ids, recordedOn: parsed?.recordedOn ?? null, errors };
}

/**
 * The rule itself. Pure over already-parsed board state, so `08-validate-tracking.mjs` can
 * call it with what it already holds and the tests can call it with fixtures.
 *
 * @param {object} input
 * @param {{id: string, status: string}[]} input.enRows   board rows, EN
 * @param {Map<string,string>} input.enSections           EN catalog sections by id
 * @param {Map<string,string>} [input.esSections]         ES catalog sections by id (mirror check)
 * @param {Set<string>} [input.baselineIds]               override the checked-in baseline (tests)
 * @param {string} [input.baselinePath]                   read the baseline from elsewhere (tests)
 * @returns {{ errors: string[], stats: object }}
 */
export function checkNewOpenRowEconomics({
  enRows,
  enSections,
  esSections = new Map(),
  baselineIds = null,
  baselinePath = BASELINE_PATH,
}) {
  const errors = [];
  const stats = {
    boardRows: Array.isArray(enRows) ? enRows.length : 0,
    openRows: 0,
    grandfathered: 0,
    required: 0,
    requiredMissing: 0,
    priced: 0,
    malformed: 0,
  };

  if (!Array.isArray(enRows)) {
    return { errors: [`${TOOL}: enRows must be an array`], stats };
  }

  let ids = baselineIds;
  if (ids === null) {
    const baseline = loadBaseline(baselinePath);
    errors.push(...baseline.errors);
    ids = baseline.ids;
    if (baseline.errors.length > 0) return { errors, stats };
  }

  const boardIds = new Set(enRows.map((row) => row.id));
  for (const id of ids) {
    if (!boardIds.has(id)) {
      errors.push(
        `${TOOL}: baseline grandfathers ${id}, which is not a row on the board — `
        + 'the exemption list has drifted from gap-tracking.md and must be pruned',
      );
    }
  }

  for (const row of enRows) {
    const canonical = canonicalStatus(row.status);
    // An unsupported status is 08's own error to raise; this guard must not double-report it,
    // and must not silently treat an unreadable status as "closed, therefore exempt".
    if (canonical === null) continue;

    const section = enSections?.get(row.id) ?? null;
    const fields = section ? extractEconomicsFields(section) : { principal: null, interest: null, basis: null };
    const { record, errors: fieldErrors, partial } = validateEconomics(fields);

    // A malformed figure is reported for every row, open or closed, exempt or not: an
    // exemption from stating a number is not an exemption from stating it correctly.
    for (const message of fieldErrors) {
      errors.push(`${row.id}: ${message}`);
      stats.malformed += 1;
    }
    if (partial && fieldErrors.length === 0) {
      errors.push(`${row.id}: incomplete economics record — principal, interest and basis are one unit`);
      stats.malformed += 1;
    }

    // The ES catalog may mirror the line; a mirror that contradicts the canonical EN one is a
    // defect, and an ES-only figure is a figure the canonical catalog does not carry.
    const esSection = esSections?.get(row.id);
    if (esSection) {
      const es = extractEconomicsFields(esSection);
      for (const key of ['principal', 'interest', 'basis']) {
        if (es[key] && fields[key] && es[key].toUpperCase() !== fields[key].toUpperCase()) {
          errors.push(`${row.id}: ES catalog ${key}="${es[key]}" contradicts EN "${fields[key]}"`);
        } else if (es[key] && !fields[key]) {
          errors.push(`${row.id}: ES catalog declares ${key}="${es[key]}" but the EN catalog declares nothing`);
        }
      }
    }

    if (!isOpen(canonical)) continue;
    stats.openRows += 1;

    if (record) stats.priced += 1;

    if (ids.has(row.id)) {
      stats.grandfathered += 1;
      continue;
    }

    stats.required += 1;
    if (record) continue;

    stats.requiredMissing += 1;
    if (!section) {
      errors.push(
        `${row.id} is open (${canonical}) and has no section in the English catalog, so it can carry `
        + 'no principal and no interest. ' + CONVENTION_HINT,
      );
      continue;
    }
    errors.push(
      `${row.id} is a new open row (${canonical}) with no principal and no interest, and is not `
      + `grandfathered by ${BASELINE_PATH.split('/').slice(-3).join('/')}. `
      + 'A row opened after the economics format landed states what it costs to repay and what it '
      + 'costs not to.\n    ' + CONVENTION_HINT,
    );
  }

  assertScanned(stats.openRows, {
    what: 'OPEN board rows',
    where: `${BOARD_REL} (status column)`,
  });

  return { errors, stats };
}

/** Read the board off disk and run the rule. Used by the standalone CLI and by the tests. */
export function runFromDisk(root) {
  const board = join(root, BOARD_REL);
  const catalog = join(root, CATALOG_REL);
  const esCatalog = join(root, ES_CATALOG_REL);

  for (const file of [board, catalog]) {
    if (!existsSync(file)) {
      throw new Error(
        `${TOOL}: required board artifact does not exist: ${file}\n`
        + '  Refusing to report "no new open row is missing economics" over a file that is not there.',
      );
    }
  }

  const enRows = parseBoardRows(readFileSync(board, 'utf8'));
  assertScanned(enRows.length, { what: 'board rows', where: BOARD_REL });
  const enSections = parseCatalogSections(readFileSync(catalog, 'utf8'));
  assertScanned(enSections.size, { what: 'catalog sections', where: CATALOG_REL });
  const esSections = existsSync(esCatalog)
    ? parseCatalogSections(readFileSync(esCatalog, 'utf8'))
    : new Map();

  return checkNewOpenRowEconomics({ enRows, enSections, esSections });
}

function main(argv = process.argv.slice(2)) {
  const rootIdx = argv.indexOf('--root');
  const root = rootIdx !== -1 ? resolve(process.cwd(), argv[rootIdx + 1]) : resolve(__dirname, '../../..');
  const asJson = argv.includes('--json');

  const { errors, stats } = runFromDisk(root);

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ tool: TOOL, stats, errors }, null, 2)}\n`);
  } else {
    console.log(`${TOOL} — economics required on rows opened after the baseline`);
    console.log(`  board rows ................ ${stats.boardRows}`);
    console.log(`  open rows ................. ${stats.openRows}`);
    console.log(`  grandfathered (exempt) .... ${stats.grandfathered}`);
    console.log(`  required to carry both .... ${stats.required}`);
    console.log(`  of those, missing ......... ${stats.requiredMissing}`);
    console.log(`  open rows already priced .. ${stats.priced}`);
    if (errors.length > 0) {
      console.error('');
      console.error(`✗ ${TOOL}: ${errors.length} violation(s):`);
      for (const error of errors) console.error(`  • ${error}`);
    } else if (stats.required === 0) {
      // Green on an empty docket is the shape of a guard that never ran. Say so: the
      // requirement is armed, but nothing has yet been opened for it to bind on, and the
      // evidence that it bites lives in new-row-economics-guard.test.mjs, not here.
      console.log('');
      console.log(
        `⚠️  ARMED, NOT YET EXERCISED — THIS IS NOT A PASS. No row has been opened since the `
        + `baseline of ${stats.grandfathered} exempt row(s), so the requirement checked 0 rows. `
        + 'It rejects the next one.',
      );
    } else {
      console.log('');
      console.log(
        `✓ ${TOOL}: every open row opened since the baseline carries a principal and an interest `
        + `(${stats.required} row(s) checked; ${stats.grandfathered} still awaiting a human figure).`,
      );
    }
  }

  return errors.length > 0 ? 1 : 0;
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
