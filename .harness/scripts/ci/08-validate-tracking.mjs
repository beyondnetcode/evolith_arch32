import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(process.env.EVOLITH_TRACKING_ROOT || '.');
const EN_FILE = path.join(ROOT, 'reference/core/control-center/gaps/gap-tracking.md');
const ES_FILE = path.join(ROOT, 'reference/core/control-center/gaps/gap-tracking.es.md');
const EN_CATALOG = path.join(ROOT, 'reference/core/control-center/gaps/gap-reference-catalog.md');
const ES_CATALOG = path.join(ROOT, 'reference/core/control-center/gaps/gap-reference-catalog.es.md');
const CLOSURE_REGISTRY = path.join(
  ROOT,
  'reference/core/control-center/evidence/gap-closure-evidence.json',
);

const STATUS_MAP = new Map([
  ['DONE', 'done'],
  ['COMPLETADO', 'done'],
  ['OPEN', 'pending'],
  ['ABIERTO', 'pending'],
  ['PENDING', 'pending'],
  ['PENDIENTE', 'pending'],
  ['DEFERRED', 'deferred'],
  ['DIFERIDO', 'deferred'],
  ['IN-PROGRESS', 'in-progress'],
  ['EN-PROGRESO', 'in-progress'],
  ['EN PROGRESO', 'in-progress'],
  ['REVISION', 'pending'],
  ['REVISIÓN', 'pending'],
]);

const DEPENDENCY_DISPOSITIONS = new Set([
  'none',
  'satisfied',
  'accepted-scope',
  'deferred',
]);


/**
 * Split a Markdown table row into its cells.
 *
 * The previous implementation used `.filter(Boolean)`, which drops EMPTY cells
 * rather than just the empties produced by the leading and trailing pipes. That
 * silently shifts every column after a blank one, so a row with an unfilled cell
 * had its status read from the wrong column -- or as `undefined`. It also made
 * any incremental schema change impossible: a half-migrated board would misparse
 * rather than fail loudly.
 *
 * Only the outer empties are dropped now; interior blanks are preserved and keep
 * their position.
 */
function splitRow(line) {
  const cells = line.split(/(?<!\\)\|/).map((cell) => cell.trim());
  if (cells.length && cells[0] === '') cells.shift();
  if (cells.length && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

function parseTableRows(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const rows = [];
  let statusColIndex = -1;
  let inTable = false;
  const localePatterns = ['Status', 'State', 'Estado', 'Estat'];

  for (const line of content.split('\n')) {
    if (line.startsWith('| ID |')) {
      inTable = true;
      const headers = splitRow(line);
      statusColIndex = headers.findIndex((header) => localePatterns.some((pattern) => header.includes(pattern)));
      if (statusColIndex === -1) statusColIndex = headers.length - 1;
      continue;
    }
    if (!inTable) continue;
    if (line.startsWith('|---|')) continue;
    // The board may span more than one table (e.g. an active table plus an
    // expandable <details> archive). A non-table line ends the current table
    // but must not stop parsing — a later "| ID |" header re-opens parsing.
    if (!line.trim().startsWith('|')) { inTable = false; continue; }

    const cols = splitRow(line);
    const idMatch = cols[0]?.match(/`(GT-\d+|MT-A\d+)`/);
    if (idMatch && statusColIndex !== -1 && cols.length > statusColIndex) {
      rows.push({
        id: idMatch[1],
        status: cols[statusColIndex].replaceAll('`', '').toUpperCase(),
      });
    }
  }

  return { rows, content };
}

function parseCatalogSections(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const sections = new Map();
  const matches = [...content.matchAll(/^#### (GT-\d+)\s*$/gm)];

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    sections.set(
      current[1],
      content.slice(current.index, next?.index ?? content.length),
    );
  }

  return sections;
}

function parseProgress(content, isEs) {
  const pattern = isEs
    ? /\*\*Progreso:\*\* (\d+) \/ (\d+) completados · (\d+) en progreso · (\d+) pendientes · (\d+) diferidos?/
    : /\*\*Progress:\*\* (\d+) \/ (\d+) done · (\d+) in progress · (\d+) pending · (\d+) deferred/;
  const match = content.match(pattern);
  if (!match) return null;

  return {
    done: Number(match[1]),
    total: Number(match[2]),
    inProgress: Number(match[3]),
    pending: Number(match[4]),
    deferred: Number(match[5]),
  };
}

// UP-001 §7.2: el estado es canonico e independiente del idioma, el literal es
// su representacion en el idioma de la superficie. `STATUS_MAP` de arriba
// normaliza ambos para que la paridad EN/ES funcione -- y precisamente por eso
// no puede detectar que una superficie use el literal del idioma equivocado:
// para el, `DONE` y `COMPLETADO` son el mismo estado. Esa ceguera es la razon de
// que 6 filas `DONE` sobrevivieran meses en el board ES y 45 en su catalogo.
const LOCALE_LITERALS = {
  EN: new Set(['PENDING', 'IN-PROGRESS', 'BLOCKED', 'DEFERRED', 'DONE']),
  ES: new Set(['PENDIENTE', 'EN-PROGRESO', 'BLOQUEADO', 'DIFERIDO', 'COMPLETADO']),
};

/**
 * Verifica que una superficie use SOLO los literales de su propio idioma, tanto
 * en la columna Estado del board como en el campo `**Status:**` del catalogo.
 * Comprobar el estado canonico no basta: ahi es donde vivia el punto ciego.
 */
function validateStatusLocale(lang, rows, sections, errors) {
  const allowed = LOCALE_LITERALS[lang];
  const other = lang === 'EN' ? 'ES' : 'EN';

  for (const row of rows) {
    if (!row.status || allowed.has(row.status)) continue;
    const hint = LOCALE_LITERALS[other].has(row.status)
      ? ` — es el literal ${other}; usa el ${lang} equivalente`
      : ' — no pertenece al vocabulario de UP-001 §7.2';
    errors.push(`${row.id} board ${lang}: literal de estado "${row.status}" fuera de idioma${hint}`);
  }

  for (const [id, body] of sections) {
    const match = body.match(/^- \*\*Status:\*\* `([^`]+)`/m);
    if (!match) continue;
    const literal = match[1].toUpperCase();
    if (allowed.has(literal)) continue;
    const hint = LOCALE_LITERALS[other].has(literal)
      ? ` — es el literal ${other}; usa el ${lang} equivalente`
      : ' — no pertenece al vocabulario de UP-001 §7.2';
    errors.push(`${id} catalogo ${lang}: literal de estado "${literal}" fuera de idioma${hint}`);
  }
}

function canonicalStatus(status) {
  return STATUS_MAP.get(status);
}

function commitExists(commit) {
  try {
    execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`], {
      cwd: ROOT,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function validateClosureRecord(record, knownIds, errors) {
  const prefix = record?.id || '<missing-id>';

  if (!/^(GT-\d+|MT-A\d+)$/.test(record?.id || '')) {
    errors.push(`Closure record has invalid ID: ${prefix}`);
    return;
  }
  if (!knownIds.has(record.id)) {
    errors.push(`${prefix} closure record does not match a board gap`);
  }

  const date = new Date(`${record.closedAt}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.closedAt || '') || Number.isNaN(date.valueOf())) {
    errors.push(`${prefix} has an invalid closedAt date`);
  } else if (date > new Date()) {
    errors.push(`${prefix} has a future closedAt date`);
  }

  if (!/^[0-9a-f]{7,40}$/i.test(record.closureCommit || '')) {
    errors.push(`${prefix} has an invalid closureCommit`);
  } else if (!commitExists(record.closureCommit)) {
    // NON-FATAL (GT-476): this repo's history was rewritten (taxonomy refactor, resets), so many
    // legitimate historical closureCommit SHAs are orphaned/unreachable in a fresh CI checkout.
    // A malformed SHA is still a hard error above; a merely-unreachable one is a warning so the
    // armed guard stays green in CI while the real structural invariants (paths, EN/ES parity,
    // counts, DONE-subset-of-records) remain fatal.
    console.warn(`\u26a0\ufe0f  [WARN] ${prefix} closureCommit not reachable in this checkout (history rewrite?): ${record.closureCommit}`);
  }

  if (!Array.isArray(record.evidence) || record.evidence.length === 0) {
    errors.push(`${prefix} must declare at least one evidence artifact`);
  } else {
    for (const evidence of record.evidence) {
      const relativePath = String(evidence).split('#')[0];
      const resolved = path.resolve(ROOT, relativePath);
      if (!resolved.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(resolved)) {
        errors.push(`${prefix} evidence does not resolve: ${evidence}`);
      }
    }
  }

  if (
    !Array.isArray(record.validationCommands)
    || record.validationCommands.length === 0
    || record.validationCommands.some((command) => typeof command !== 'string' || !command.trim())
  ) {
    errors.push(`${prefix} must declare reproducible validationCommands`);
  }

  if (!DEPENDENCY_DISPOSITIONS.has(record.dependencyDisposition)) {
    errors.push(`${prefix} has unsupported dependencyDisposition`);
  }
  if (
    record.dependencyDisposition !== 'none'
    && (typeof record.dependencyRationale !== 'string' || !record.dependencyRationale.trim())
  ) {
    errors.push(`${prefix} requires dependencyRationale`);
  }
}

export function validateTrackingState({
  enRows,
  esRows,
  enContent,
  esContent,
  enSections,
  esSections,
  registry,
}) {
  const errors = [];
  const seen = new Set();

  for (const row of enRows) {
    if (seen.has(row.id)) errors.push(`Duplicate ID found: ${row.id}`);
    seen.add(row.id);
    if (row.id.startsWith('GT-') && !enSections.has(row.id)) errors.push(`${row.id} is missing from the English catalog`);
  }

  if (enRows.length !== esRows.length) {
    errors.push(`Mismatched row counts between EN (${enRows.length}) and ES (${esRows.length})`);
  }

  enRows.forEach((row, index) => {
    const esRow = esRows[index];
    if (!esRow) return;
    if (row.id !== esRow.id) {
      errors.push(`Row ${index + 1} ID mismatch: EN has ${row.id}, ES has ${esRow.id}`);
    }
    if (canonicalStatus(row.status) !== canonicalStatus(esRow.status)) {
      errors.push(`${row.id} status mismatch: EN=${row.status}, ES=${esRow.status}`);
    }
    if (!canonicalStatus(row.status)) errors.push(`${row.id} has unsupported EN status: ${row.status}`);
    if (!canonicalStatus(esRow.status)) errors.push(`${row.id} has unsupported ES status: ${esRow.status}`);
    if (row.id.startsWith('GT-') && !esSections.has(row.id)) errors.push(`${row.id} is missing from the Spanish catalog`);
  });

  const counts = { done: 0, pending: 0, deferred: 0, 'in-progress': 0 };
  for (const row of enRows) {
    const status = canonicalStatus(row.status);
    if (status) counts[status] += 1;
  }

  for (const [content, isEs] of [[enContent, false], [esContent, true]]) {
    const progress = parseProgress(content, isEs);
    if (!progress) {
      errors.push(`Could not parse ${isEs ? 'Spanish' : 'English'} progress line`);
      continue;
    }
    if (progress.total !== enRows.length) errors.push(`${isEs ? 'ES' : 'EN'} total mismatch`);
    if (progress.done !== counts.done) errors.push(`${isEs ? 'ES' : 'EN'} DONE count mismatch`);
    if (progress.inProgress !== counts['in-progress']) {
      errors.push(`${isEs ? 'ES' : 'EN'} IN-PROGRESS count mismatch`);
    }
    if (progress.pending !== counts.pending) errors.push(`${isEs ? 'ES' : 'EN'} PENDING count mismatch`);
    if (progress.deferred !== counts.deferred) errors.push(`${isEs ? 'ES' : 'EN'} DEFERRED count mismatch`);
  }

  const records = Array.isArray(registry?.closures) ? registry.closures : [];
  const recordsById = new Map();
  for (const record of records) {
    if (recordsById.has(record.id)) errors.push(`Duplicate closure record: ${record.id}`);
    recordsById.set(record.id, record);
    validateClosureRecord(record, seen, errors);
  }

  for (const row of enRows) {
    const status = canonicalStatus(row.status);
    const record = recordsById.get(row.id);
    if (status === 'done') {
      if (!record && row.id.startsWith('GT-')) errors.push(`${row.id} is DONE without a closure evidence record`);
      for (const [language, sections] of [['EN', enSections], ['ES', esSections]]) {
        if (/- \[ \]/.test(sections.get(row.id) || '')) {
          errors.push(`${row.id} is DONE with unchecked closure criteria in ${language}`);
        }
      }
    } else if (record) {
      errors.push(`${row.id} has closure evidence but status is ${status}`);
    }
  }

  // UP-001 §7.4 pedia esto explicitamente: hasta ahora nada fallaba cuando una
  // superficie usaba el literal del idioma equivocado, asi que la enmienda era
  // una convencion documentada y no aplicada. Con esto pasa a ser aplicada.
  validateStatusLocale('EN', enRows, enSections, errors);
  validateStatusLocale('ES', esRows, esSections, errors);

  return errors;
}

function run() {
  const requiredFiles = [EN_FILE, ES_FILE, EN_CATALOG, ES_CATALOG, CLOSURE_REGISTRY];
  const missing = requiredFiles.filter((file) => !fs.existsSync(file));
  if (missing.length) {
    console.error(`❌ [ERROR] Missing tracking artifacts:\n${missing.join('\n')}`);
    process.exit(1);
  }

  console.log('\nValidating semantic gap closure...');
  const en = parseTableRows(EN_FILE);
  const es = parseTableRows(ES_FILE);
  const registry = JSON.parse(fs.readFileSync(CLOSURE_REGISTRY, 'utf8'));
  const errors = validateTrackingState({
    enRows: en.rows,
    esRows: es.rows,
    enContent: en.content,
    esContent: es.content,
    enSections: parseCatalogSections(EN_CATALOG),
    esSections: parseCatalogSections(ES_CATALOG),
    registry,
  });

  if (errors.length) {
    for (const error of errors) console.error(`❌ [ERROR] ${error}`);
    console.error('\n❌ Tracking validation failed.');
    process.exit(1);
  }

  console.log(`Validated ${en.rows.length} gaps and ${registry.closures.length} closure records.`);
  console.log('\n✅ Tracking validation passed.');
}

const entryPoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === entryPoint) run();
