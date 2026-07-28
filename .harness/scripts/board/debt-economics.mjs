/**
 * @file debt-economics.mjs
 * @description GT-599 — the two fields a technical-debt item needs, with the unit declared.
 *
 * ## Why this exists
 *
 * The gap board is a technical-debt registry with 624 rows and no economics: every row
 * carries a criticality (P0-P3) and a complexity (XS-XL), and neither of those is a cost.
 * The SEI technical-debt item model (Kruchten, Nord, Ozkaya, *Managing Technical Debt*)
 * defines the two that are:
 *
 *   PRINCIPAL  what it costs to repay the item, once.
 *   INTEREST   what it costs to keep NOT repaying it, per period.
 *
 * Principal alone ranks nothing — it is just an estimate of work, which `Complexity`
 * already approximates. Interest is what makes the ranking an economic decision instead
 * of an opinion: a 40-hour repayment that costs 1 hour a month to carry loses to a 4-hour
 * repayment that costs 8.
 *
 * ## The unit is part of the value
 *
 * An unlabelled number is the defect this audit keeps finding, so nothing here is
 * dimensionless:
 *
 *   principal -> ENGINEER-HOURS (a single person's working hours, not calendar time)
 *   interest  -> ENGINEER-HOURS PER 30-DAY PERIOD
 *
 * "Per sprint" is deliberately NOT the interest period: sprint length is a local
 * convention (1, 2 or 3 weeks here depending on who is asked) and would make two rows
 * incomparable. The period is fixed at 30 days and is written into the rendered value.
 *
 * ## Bands, not point estimates
 *
 * A point estimate on an un-started item is false precision. The canonical form is a
 * t-shirt band that maps to a DECLARED hour range, so a reader can always recover the
 * number and never mistakes it for a measurement. An explicit value (`12h`, `3d`) is
 * accepted where a real figure exists — an ATDM-derived principal, for instance, is a
 * computed number and should not be flattened into a band.
 *
 * ## Basis: how the figure was obtained
 *
 * Required, because "derived from ATDM" and "someone guessed" are not interchangeable and
 * the board cannot tell them apart after the fact:
 *
 *   atdm      OMG Automated Technical Debt Measure V2 v1.0 (Aug 2024), repair effort
 *             derived from ISO/IEC 5055 weakness occurrences (composes with GT-598)
 *   sqale     SQALE remediation-cost model — the method behind the technical-debt ratio
 *   estimate  human estimate; honest, and marked as such
 *
 * ## Where the fields live
 *
 * Canonical carrier: a single field line in the ENGLISH gap reference catalog, in the
 * `#### GT-NNN` section, alongside `- **Component:**`:
 *
 *   - **Principal:** `M` · **Interest:** `MED` · **Basis:** `estimate`
 *
 * The Spanish catalog MAY mirror it (`- **Principal:** ... · **Interés:** ... ·
 * **Base:** ...`). A number is language-independent, so the mirror is optional — but if
 * it is present and disagrees with the English one, that is a violation, not a preference.
 *
 * The board table (`gap-tracking.md`) MAY additionally carry `Principal` and `Interest`
 * columns; the parser below reads them when the header declares them. Same rule: present
 * and disagreeing is a violation. This keeps the format forward-compatible without
 * requiring a 624-row edit today.
 *
 * NOTE: this module never writes. Back-filling the open rows is a human act — inventing
 * 56 estimates and committing them would be manufacturing exactly the kind of unsourced
 * figure this gap exists to eliminate.
 */

// --- Units ------------------------------------------------------------------

export const HOURS_PER_DAY = 8;
export const INTEREST_PERIOD_DAYS = 30;
export const PRINCIPAL_UNIT = 'engineer-hours';
export const PRINCIPAL_UNIT_SHORT = 'h';
export const INTEREST_UNIT = `engineer-hours per ${INTEREST_PERIOD_DAYS}-day period`;
export const INTEREST_UNIT_SHORT = `h/${INTEREST_PERIOD_DAYS}d`;

/** Repayment effort, in engineer-hours. Ranges are inclusive. */
export const PRINCIPAL_BANDS = Object.freeze({
  XS: Object.freeze({ minHours: 1, maxHours: 2 }),
  S: Object.freeze({ minHours: 2, maxHours: 8 }),
  M: Object.freeze({ minHours: 8, maxHours: 24 }),
  L: Object.freeze({ minHours: 24, maxHours: 80 }),
  XL: Object.freeze({ minHours: 80, maxHours: 240 }),
});

/** Carrying cost, in engineer-hours per 30-day period. Ranges are inclusive. */
export const INTEREST_BANDS = Object.freeze({
  NONE: Object.freeze({ minHours: 0, maxHours: 0 }),
  LOW: Object.freeze({ minHours: 0.5, maxHours: 2 }),
  MED: Object.freeze({ minHours: 2, maxHours: 8 }),
  HIGH: Object.freeze({ minHours: 8, maxHours: 24 }),
  SEVERE: Object.freeze({ minHours: 24, maxHours: 80 }),
});

/** How the figure was obtained. */
export const BASES = Object.freeze({
  atdm: 'OMG Automated Technical Debt Measure V2 v1.0 (2024-08), repair effort derived from ISO/IEC 5055 weakness occurrences',
  sqale: 'SQALE remediation-cost model (the method behind the technical-debt ratio)',
  estimate: 'human estimate, recorded as such',
});

/** Bases whose figures are computed rather than judged — the ATDM subset of GT-599. */
export const DERIVED_BASES = Object.freeze(['atdm', 'sqale']);

const PRINCIPAL_EXPLICIT = /^(\d+(?:\.\d+)?)\s*(h|d)$/i;
const INTEREST_EXPLICIT = new RegExp(String.raw`^(\d+(?:\.\d+)?)\s*h\s*/\s*${INTEREST_PERIOD_DAYS}d$`, 'i');

// --- Value parsing ----------------------------------------------------------

/**
 * @typedef {object} Magnitude
 * @property {string} raw          the value exactly as written
 * @property {string|null} band    band token when the value is a band, else null
 * @property {number} minHours     lower bound in hours (per period, for interest)
 * @property {number} maxHours     upper bound in hours (per period, for interest)
 * @property {string} unit         the declared unit, carried with the value
 */

/**
 * Parse a principal value: a band token (XS|S|M|L|XL) or an explicit `Nh` / `Nd`.
 * @param {unknown} raw
 * @returns {{ ok: true, value: Magnitude } | { ok: false, error: string }}
 */
export function parsePrincipal(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, error: 'principal is empty' };
  }
  const text = raw.trim();
  const band = text.toUpperCase();
  if (Object.hasOwn(PRINCIPAL_BANDS, band)) {
    const { minHours, maxHours } = PRINCIPAL_BANDS[band];
    return { ok: true, value: { raw: text, band, minHours, maxHours, unit: PRINCIPAL_UNIT } };
  }
  const explicit = text.match(PRINCIPAL_EXPLICIT);
  if (explicit) {
    const amount = Number(explicit[1]);
    const hours = explicit[2].toLowerCase() === 'd' ? amount * HOURS_PER_DAY : amount;
    if (!(hours > 0)) return { ok: false, error: `principal "${text}" must be greater than zero` };
    return { ok: true, value: { raw: text, band: null, minHours: hours, maxHours: hours, unit: PRINCIPAL_UNIT } };
  }
  return {
    ok: false,
    error:
      `principal "${text}" is not a declared value — use a band (${Object.keys(PRINCIPAL_BANDS).join('|')}) ` +
      `or an explicit effort in ${PRINCIPAL_UNIT} ("12h", "3d"; 1d = ${HOURS_PER_DAY}h)`,
  };
}

/**
 * Parse an interest value: a band token (NONE|LOW|MED|HIGH|SEVERE) or an explicit
 * `Nh/30d`. A bare `Nh` is rejected on purpose: interest without a period is not
 * interest, it is a second principal.
 * @param {unknown} raw
 * @returns {{ ok: true, value: Magnitude } | { ok: false, error: string }}
 */
export function parseInterest(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, error: 'interest is empty' };
  }
  const text = raw.trim();
  const band = text.toUpperCase();
  if (Object.hasOwn(INTEREST_BANDS, band)) {
    const { minHours, maxHours } = INTEREST_BANDS[band];
    return { ok: true, value: { raw: text, band, minHours, maxHours, unit: INTEREST_UNIT } };
  }
  const explicit = text.match(INTEREST_EXPLICIT);
  if (explicit) {
    const hours = Number(explicit[1]);
    return { ok: true, value: { raw: text, band: null, minHours: hours, maxHours: hours, unit: INTEREST_UNIT } };
  }
  return {
    ok: false,
    error:
      `interest "${text}" is not a declared value — use a band (${Object.keys(INTEREST_BANDS).join('|')}) ` +
      `or an explicit rate in ${INTEREST_UNIT} ("4h/${INTEREST_PERIOD_DAYS}d"). ` +
      'A value without a period is not an interest.',
  };
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, value: string } | { ok: false, error: string }}
 */
export function parseBasis(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return { ok: false, error: 'basis is empty' };
  const text = raw.trim().toLowerCase();
  if (Object.hasOwn(BASES, text)) return { ok: true, value: text };
  return {
    ok: false,
    error: `basis "${raw.trim()}" is not declared — use one of ${Object.keys(BASES).join('|')}`,
  };
}

/**
 * Validate a full economics triple.
 * @param {{ principal?: unknown, interest?: unknown, basis?: unknown }} fields
 * @returns {{ record: object|null, errors: string[], partial: boolean }}
 */
export function validateEconomics(fields = {}) {
  const errors = [];
  const present = ['principal', 'interest', 'basis'].filter(
    (key) => typeof fields[key] === 'string' && fields[key].trim() !== '',
  );
  if (present.length === 0) return { record: null, errors, partial: false };

  const principal = parsePrincipal(fields.principal);
  const interest = parseInterest(fields.interest);
  const basis = parseBasis(fields.basis);

  for (const [label, result] of [['principal', principal], ['interest', interest], ['basis', basis]]) {
    if (!result.ok) errors.push(result.error === `${label} is empty` ? `${label} is missing` : result.error);
  }

  if (errors.length > 0) return { record: null, errors, partial: present.length < 3 };

  return {
    record: {
      principal: principal.value,
      interest: interest.value,
      basis: basis.value,
      derived: DERIVED_BASES.includes(basis.value),
    },
    errors,
    partial: false,
  };
}

/** Render a record back to the canonical field line, so the format has one writer. */
export function renderEconomicsLine(record, { lang = 'EN' } = {}) {
  const labels = lang === 'ES'
    ? { principal: 'Principal', interest: 'Interés', basis: 'Base' }
    : { principal: 'Principal', interest: 'Interest', basis: 'Basis' };
  return (
    `- **${labels.principal}:** \`${record.principal.raw}\` · ` +
    `**${labels.interest}:** \`${record.interest.raw}\` · ` +
    `**${labels.basis}:** \`${record.basis}\``
  );
}

// --- Field extraction -------------------------------------------------------

const FIELD_PATTERNS = {
  // Anchored to a list-item line so prose containing the word "principal" (GT-609's
  // evidence says "with no principal, tenant or scope in it") can never be mistaken
  // for a declared value.
  principal: /^[-*]\s+\*\*Principal:\*\*\s*`([^`]*)`/im,
  interest: /^[-*]\s+\*\*(?:Interest|Inter[ée]s):\*\*\s*`([^`]*)`/im,
  basis: /^[-*]\s+\*\*(?:Basis|Base):\*\*\s*`([^`]*)`/im,
};

/**
 * Extract the economics fields from a catalog section body. The three fields are
 * normally written on one line, but each is matched independently so a line break
 * does not silently drop one.
 * @param {string} body
 * @returns {{ principal: string|null, interest: string|null, basis: string|null }}
 */
export function extractEconomicsFields(body) {
  const out = { principal: null, interest: null, basis: null };
  if (typeof body !== 'string') return out;
  // The `interest` and `basis` labels only count when they appear on the SAME line as a
  // Principal field, or on their own field line; both shapes are covered by matching each
  // label independently against list-item lines.
  for (const [key, pattern] of Object.entries(FIELD_PATTERNS)) {
    const match = body.match(pattern);
    if (match) out[key] = match[1].trim();
  }
  if (out.principal !== null && (out.interest === null || out.basis === null)) {
    // Same-line form: `- **Principal:** \`M\` · **Interest:** \`MED\` · **Basis:** \`estimate\``
    const line = body.split('\n').find((l) => /^[-*]\s+\*\*Principal:\*\*/i.test(l.trim())) || '';
    if (out.interest === null) {
      const m = line.match(/\*\*(?:Interest|Inter[ée]s):\*\*\s*`([^`]*)`/i);
      if (m) out.interest = m[1].trim();
    }
    if (out.basis === null) {
      const m = line.match(/\*\*(?:Basis|Base):\*\*\s*`([^`]*)`/i);
      if (m) out.basis = m[1].trim();
    }
  }
  return out;
}

// --- Board / catalog parsing ------------------------------------------------

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
  ['BLOCKED', 'blocked'],
  ['BLOQUEADO', 'blocked'],
  ['REVISION', 'pending'],
  ['REVISIÓN', 'pending'],
]);

export function canonicalStatus(status) {
  return STATUS_MAP.get(String(status || '').replaceAll('`', '').trim().toUpperCase()) || null;
}

/**
 * A row is OPEN when it is anything other than `done`.
 *
 * `deferred` counts as open on purpose: a deferral is a decision to keep paying the
 * interest, so it is precisely the row that needs the interest written down. Excluding
 * it would let the most expensive rows leave the denominator by being postponed.
 */
export function isOpen(canonical) {
  return canonical !== null && canonical !== 'done';
}

/** Split a Markdown table row, dropping only the outer empties (interior blanks keep position). */
export function splitRow(line) {
  const cells = line.split(/(?<!\\)\|/).map((cell) => cell.trim());
  if (cells.length && cells[0] === '') cells.shift();
  if (cells.length && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

/**
 * Parse the board table(s). Returns one entry per `GT-*` / `MT-A*` row, with the
 * optional Principal/Interest columns when the header declares them.
 * @param {string} content
 */
export function parseBoardRows(content) {
  const rows = [];
  let inTable = false;
  let statusCol = -1;
  let principalCol = -1;
  let interestCol = -1;
  let basisCol = -1;

  for (const line of String(content).split('\n')) {
    if (line.startsWith('| ID |')) {
      inTable = true;
      const headers = splitRow(line).map((h) => h.replaceAll('*', '').trim());
      const find = (patterns) => headers.findIndex((h) => patterns.some((p) => p.test(h)));
      statusCol = find([/^status$/i, /^state$/i, /^estado$/i]);
      if (statusCol === -1) statusCol = headers.length - 1;
      principalCol = find([/^principal$/i]);
      interestCol = find([/^inter[ée]s(t)?$/i]);
      basisCol = find([/^basis$/i, /^base$/i]);
      continue;
    }
    if (!inTable) continue;
    if (line.startsWith('|---')) continue;
    if (!line.trim().startsWith('|')) { inTable = false; continue; }

    const cols = splitRow(line);
    const idMatch = cols[0]?.match(/`(GT-\d+|MT-A\d+)`/);
    if (!idMatch || statusCol === -1 || cols.length <= statusCol) continue;

    const cell = (index) => (index !== -1 && index < cols.length ? cols[index].replaceAll('`', '').trim() || null : null);
    rows.push({
      id: idMatch[1],
      status: cols[statusCol].replaceAll('`', '').trim().toUpperCase(),
      principal: cell(principalCol),
      interest: cell(interestCol),
      basis: cell(basisCol),
      hasEconomicsColumns: principalCol !== -1 || interestCol !== -1,
    });
  }

  return rows;
}

/** Parse `#### GT-NNN` sections of a reference catalog into id -> body. */
export function parseCatalogSections(content) {
  const sections = new Map();
  const matches = [...String(content).matchAll(/^#### (GT-\d+)\s*$/gm)];
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    sections.set(current[1], String(content).slice(current.index, next?.index ?? content.length));
  }
  return sections;
}

// --- Report -----------------------------------------------------------------

const EMPTY_TOTALS = () => ({ minHours: 0, maxHours: 0 });

/**
 * Build the coverage report. Pure: takes already-read content, returns numbers.
 *
 * @param {object} input
 * @param {string} input.boardContent      gap-tracking.md
 * @param {string} input.catalogContent    gap-reference-catalog.md (EN — canonical)
 * @param {string} [input.esCatalogContent] gap-reference-catalog.es.md (optional mirror)
 */
export function buildEconomicsReport({ boardContent, catalogContent, esCatalogContent = null }) {
  const rows = parseBoardRows(boardContent);
  const sections = parseCatalogSections(catalogContent);
  const esSections = esCatalogContent ? parseCatalogSections(esCatalogContent) : new Map();

  const violations = [];
  const byStatus = {};
  const open = [];
  const covered = [];
  const missing = [];
  const basisCounts = Object.fromEntries(Object.keys(BASES).map((key) => [key, 0]));
  const principalTotals = EMPTY_TOTALS();
  const interestTotals = EMPTY_TOTALS();

  for (const row of rows) {
    const canonical = canonicalStatus(row.status);
    if (canonical === null) {
      violations.push(`${row.id}: unsupported status "${row.status}" — cannot tell whether the row is open`);
      continue;
    }
    byStatus[canonical] = (byStatus[canonical] || 0) + 1;

    const section = sections.get(row.id);
    const fromCatalog = section ? extractEconomicsFields(section) : { principal: null, interest: null, basis: null };
    const fromBoard = { principal: row.principal, interest: row.interest, basis: row.basis };

    // Board columns are an optional mirror of the catalog. Present-and-disagreeing is a
    // violation: two numbers for one debt item is worse than none.
    for (const key of ['principal', 'interest', 'basis']) {
      if (
        fromBoard[key] && fromCatalog[key]
        && fromBoard[key].toUpperCase() !== fromCatalog[key].toUpperCase()
      ) {
        violations.push(
          `${row.id}: board column ${key}="${fromBoard[key]}" contradicts catalog ${key}="${fromCatalog[key]}"`,
        );
      }
    }

    const fields = {
      principal: fromCatalog.principal || fromBoard.principal,
      interest: fromCatalog.interest || fromBoard.interest,
      basis: fromCatalog.basis || fromBoard.basis,
    };

    // The Spanish catalog may mirror the figures. A mirror that disagrees is a defect;
    // an absent mirror is not, because a number does not need translating.
    const esSection = esSections.get(row.id);
    if (esSection) {
      const es = extractEconomicsFields(esSection);
      for (const key of ['principal', 'interest', 'basis']) {
        if (es[key] && fields[key] && es[key].toUpperCase() !== fields[key].toUpperCase()) {
          violations.push(`${row.id}: ES catalog ${key}="${es[key]}" contradicts EN "${fields[key]}"`);
        }
        if (es[key] && !fields[key]) {
          violations.push(`${row.id}: ES catalog declares ${key}="${es[key]}" but the EN catalog declares nothing`);
        }
      }
    }

    const { record, errors, partial } = validateEconomics(fields);
    for (const error of errors) violations.push(`${row.id}: ${error}`);
    if (partial && errors.length === 0) violations.push(`${row.id}: incomplete economics record`);

    if (!isOpen(canonical)) {
      // A closed row does not need economics; a MALFORMED one still gets reported above.
      continue;
    }

    open.push(row.id);
    if (record) {
      covered.push({ id: row.id, ...record });
      basisCounts[record.basis] += 1;
      principalTotals.minHours += record.principal.minHours;
      principalTotals.maxHours += record.principal.maxHours;
      interestTotals.minHours += record.interest.minHours;
      interestTotals.maxHours += record.interest.maxHours;
    } else {
      missing.push({ id: row.id, status: canonical });
    }
  }

  const derived = covered.filter((entry) => entry.derived).length;

  return {
    denominators: {
      boardRows: rows.length,
      catalogSections: sections.size,
      esCatalogSections: esSections.size,
      openRows: open.length,
      byStatus,
    },
    coverage: {
      covered: covered.length,
      missing: missing.length,
      ratio: open.length === 0 ? null : covered.length / open.length,
      derived,
      derivedRatio: covered.length === 0 ? null : derived / covered.length,
    },
    basisCounts,
    totals: {
      principal: { ...principalTotals, unit: PRINCIPAL_UNIT },
      interest: { ...interestTotals, unit: INTEREST_UNIT },
    },
    covered,
    missing,
    violations,
  };
}

/** The machine-readable declaration of the format, emitted as JSON Schema. */
export function economicsJsonSchema() {
  const principalBandDoc = Object.entries(PRINCIPAL_BANDS)
    .map(([band, range]) => `${band}=${range.minHours}-${range.maxHours}h`)
    .join(', ');
  const interestBandDoc = Object.entries(INTEREST_BANDS)
    .map(([band, range]) => `${band}=${range.minHours}-${range.maxHours}${INTEREST_UNIT_SHORT}`)
    .join(', ');

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://evolith.dev/schemas/board/debt-economics.schema.json',
    title: 'Gap board debt economics (GT-599)',
    description:
      'SEI technical-debt item economics for a gap board row: principal (cost to repay, once) and '
      + 'interest (cost of not repaying, per period). Units are part of the schema, not a convention: '
      + `principal is measured in ${PRINCIPAL_UNIT}; interest in ${INTEREST_UNIT}. `
      + 'Generated from .harness/scripts/board/debt-economics.mjs — do not hand-edit.',
    type: 'object',
    additionalProperties: false,
    required: ['id', 'principal', 'interest', 'basis'],
    properties: {
      id: { type: 'string', pattern: '^(GT-\\d+|MT-A\\d+)$' },
      principal: {
        $ref: '#/$defs/principal',
        description: `Cost to repay, once, in ${PRINCIPAL_UNIT}. Bands: ${principalBandDoc}. 1d = ${HOURS_PER_DAY}h.`,
      },
      interest: {
        $ref: '#/$defs/interest',
        description: `Cost of NOT repaying, in ${INTEREST_UNIT}. Bands: ${interestBandDoc}.`,
      },
      basis: {
        type: 'string',
        enum: Object.keys(BASES),
        description: Object.entries(BASES).map(([key, text]) => `${key}: ${text}`).join(' | '),
      },
      asOf: { type: 'string', format: 'date', description: 'ISO date the figures were last reviewed.' },
      source: { type: 'string', description: 'Where a derived figure came from (report path, tool run, analysis id).' },
    },
    $defs: {
      principal: {
        type: 'string',
        unit: PRINCIPAL_UNIT,
        anyOf: [
          { enum: Object.keys(PRINCIPAL_BANDS) },
          { pattern: '^\\d+(\\.\\d+)?\\s*(h|d)$' },
        ],
      },
      interest: {
        type: 'string',
        unit: INTEREST_UNIT,
        anyOf: [
          { enum: Object.keys(INTEREST_BANDS) },
          { pattern: `^\\d+(\\.\\d+)?\\s*h\\s*/\\s*${INTEREST_PERIOD_DAYS}d$` },
        ],
      },
    },
    $comment:
      'A bare hour figure is rejected for interest on purpose: an interest without a period is not an '
      + 'interest. The period is fixed at 30 days rather than "a sprint" so two rows stay comparable.',
  };
}
