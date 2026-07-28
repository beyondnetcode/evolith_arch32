/**
 * @file atdm-principal.mjs
 * @description GT-599, acceptance criterion 3 — "the automatable subset is derived from ATDM
 * rather than hand-estimated".
 *
 * ## What ATDM actually prices, and why that is the whole story here
 *
 * The OMG **Automated Technical Debt Measure** computes one thing:
 *
 *     debt = Σ over weaknesses w of ( occurrences(w) × repairEffortHours(w) )
 *
 * where `w` ranges over the 138 structural weaknesses of ISO/IEC 5055 and
 * `repairEffortHours` comes from CISQ's developer survey of how long each weakness takes to
 * fix in well-constructed code. Every term in that expression is about **source code that
 * already contains a weakness**.
 *
 * A gap board row is not that. `GT-616` ("Tracker telemetry returns early by default") is a
 * design decision to reverse; `GT-628` is nineteen documents in the wrong language slot;
 * `GT-448` is a milestone. None of them is "N occurrences of CWE-89 remain in the code", and
 * no repair-time survey prices them. ATDM composes with GT-598 exactly where GT-598 said it
 * would and nowhere else: on rules whose predicate IS a 5055 weakness an analyser can count.
 *
 * So this module does not "apply ATDM to the board". It **decides, per open row, whether an
 * ATDM-derived principal is computable at all**, computes it where it is, and names the
 * missing input where it is not. The number it reports today is the honest one, and the
 * measurement is reproducible rather than asserted.
 *
 * ## The four inputs, and which of them this repository has
 *
 *   1. rule linkage      which corpus rules a row must repay.  DECLARED BY A HUMAN in the
 *                        row's catalog section: `- **Rules:** \`HXA-01\`, \`SEC-INJ-01\``.
 *                        A rule merely MENTIONED in the prose is reported as a candidate and
 *                        never used to compute — guessing the linkage would reintroduce
 *                        exactly the invention this gap forbids.
 *   2. 5055 mapping      rule -> CWE + named analyser. PRESENT:
 *                        src/rulesets/standards/iso-5055-mapping.json (GT-598).
 *   3. occurrence counts how many times each weakness occurs in the scope of that row.
 *                        ABSENT: no analyser has been integrated yet, so no occurrence
 *                        export exists. Supplied via --occurrences.
 *   4. effort table      hours to repair one occurrence of each weakness. ABSENT and
 *                        deliberately NOT vendored: the figures are the substance of a
 *                        copyrighted OMG specification, and a table of invented hours wearing
 *                        an `atdm` basis label would be worse than no table at all. Supplied
 *                        via --effort-table by whoever holds the spec, with provenance.
 *
 * Two of the four are missing, and their absence is reported per row rather than defaulted.
 * There is no fallback constant anywhere in this file. If you find yourself adding one, the
 * basis you are producing is `estimate`, not `atdm`.
 *
 * ## ATDM prices a principal. It has nothing to say about interest.
 *
 * The measure is a repair-cost model. The *carrying* cost — GT-599's interest — is not in
 * it, and this module never emits one. Interest stays a human judgement on every row,
 * including any row whose principal becomes derivable.
 */

/** What the `atdm` basis means, recorded so a derived figure carries its own provenance. */
export const ATDM_SPEC = Object.freeze({
  id: 'OMG Automated Technical Debt Measure (ATDM)',
  version: 'V2 v1.0',
  url: 'https://www.omg.org/spec/ATDM2/',
  measures: 'repair effort for occurrences of the 138 ISO/IEC 5055 structural weaknesses',
  doesNotMeasure: 'the carrying cost of not repairing them (GT-599 interest), nor any work item that is not a weakness occurrence',
  weaknessSource: 'src/rulesets/standards/iso-5055-mapping.json (GT-598)',
});

/** Why a row's principal could not be derived. Ordered from "furthest from derivable". */
export const BLOCK_REASONS = Object.freeze({
  'no-rule-linkage': 'the row declares no `- **Rules:**` line, so there is no set of weaknesses to price',
  'rules-not-mapped': 'every declared rule has no ISO/IEC 5055 equivalent, so ATDM has no weakness to cost',
  'no-named-analyser': 'the mapped rules have no off-the-shelf analyser, so their occurrences cannot be counted',
  'no-occurrence-data': 'no analyser run supplies occurrence counts for the in-scope weaknesses',
  'no-effort-table': 'no ATDM repair-effort table was supplied, so an occurrence has no price',
  'effort-table-incomplete': 'the supplied effort table has no entry for an in-scope weakness',
});

const RULES_FIELD = /^[-*]\s+\*\*(?:Rules|Reglas):\*\*\s*(.+)$/im;
const BACKTICKED = /`([^`]+)`/g;

// --- Input parsing ----------------------------------------------------------

/**
 * Read the rule linkage out of a catalog section.
 *
 * @param {string} body           the `#### GT-NNN` section
 * @param {Set<string>} knownRuleIds  rule ids present in the 5055 mapping
 * @returns {{ declared: string[], unknown: string[], candidates: string[] }}
 *   `declared` — rule ids on the `- **Rules:**` line that exist in the corpus. Only these
 *   are ever priced.
 *   `unknown` — tokens on that line that are not corpus rules; a typo must not silently
 *   shrink a principal.
 *   `candidates` — corpus rule ids mentioned anywhere else in the section. Reported so a
 *   human can promote them to a declaration; never priced.
 */
export function parseRuleLinkage(body, knownRuleIds) {
  const out = { declared: [], unknown: [], candidates: [] };
  if (typeof body !== 'string') return out;

  const line = body.match(RULES_FIELD);
  if (line) {
    for (const [, token] of line[1].matchAll(BACKTICKED)) {
      const id = token.trim();
      if (knownRuleIds.has(id)) {
        if (!out.declared.includes(id)) out.declared.push(id);
      } else if (!out.unknown.includes(id)) {
        out.unknown.push(id);
      }
    }
  }

  const declaredLine = line ? line[0] : '';
  for (const [, token] of body.replace(declaredLine, '').matchAll(BACKTICKED)) {
    const id = token.trim();
    if (knownRuleIds.has(id) && !out.declared.includes(id) && !out.candidates.includes(id)) {
      out.candidates.push(id);
    }
  }

  return out;
}

/**
 * Validate an ATDM repair-effort table. Nothing is defaulted: a table without provenance is
 * indistinguishable from a table someone typed, which is the whole distinction the `atdm`
 * basis exists to record.
 *
 * @param {unknown} raw
 * @returns {{ table: Map<number, number>|null, provenance: object|null, errors: string[] }}
 */
export function loadEffortTable(raw) {
  const errors = [];
  if (raw === null || raw === undefined) return { table: null, provenance: null, errors };
  if (typeof raw !== 'object') return { table: null, provenance: null, errors: ['effort table must be an object'] };

  const provenance = raw.provenance;
  for (const field of ['source', 'extractedOn', 'method']) {
    if (typeof provenance?.[field] !== 'string' || provenance[field].trim() === '') {
      errors.push(`effort table provenance.${field} is required — an unsourced repair time is not an ATDM figure`);
    }
  }

  const entries = raw.repairEffortHoursByCwe;
  if (typeof entries !== 'object' || entries === null || Object.keys(entries).length === 0) {
    errors.push('effort table must declare repairEffortHoursByCwe as a non-empty { "<cwe>": <hours> } map');
    return { table: null, provenance: provenance ?? null, errors };
  }

  const table = new Map();
  for (const [key, value] of Object.entries(entries)) {
    const cwe = Number(String(key).replace(/^cwe-?/i, ''));
    if (!Number.isInteger(cwe) || cwe <= 0) {
      errors.push(`effort table key "${key}" is not a CWE identifier`);
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      errors.push(`effort table CWE-${cwe} has a non-positive or non-numeric repair effort: ${JSON.stringify(value)}`);
      continue;
    }
    table.set(cwe, value);
  }

  return { table: errors.length > 0 ? null : table, provenance: provenance ?? null, errors };
}

/**
 * Validate an occurrence export: how many times each weakness occurs within the scope of a
 * given board row, as counted by a named analyser run.
 *
 * @param {unknown} raw
 * @returns {{ byGap: Map<string, Map<number, number>>|null, provenance: object|null, errors: string[] }}
 */
export function loadOccurrences(raw) {
  const errors = [];
  if (raw === null || raw === undefined) return { byGap: null, provenance: null, errors };
  if (typeof raw !== 'object') return { byGap: null, provenance: null, errors: ['occurrence export must be an object'] };

  const provenance = raw.provenance;
  for (const field of ['analyser', 'ranOn', 'scope']) {
    if (typeof provenance?.[field] !== 'string' || provenance[field].trim() === '') {
      errors.push(`occurrence export provenance.${field} is required — a count with no analyser and no date is a guess`);
    }
  }

  if (!Array.isArray(raw.occurrences) || raw.occurrences.length === 0) {
    errors.push('occurrence export must declare a non-empty occurrences array of { gapId, cwe, count }');
    return { byGap: null, provenance: provenance ?? null, errors };
  }

  const byGap = new Map();
  for (const entry of raw.occurrences) {
    const gapId = entry?.gapId;
    const cwe = Number(String(entry?.cwe ?? '').replace(/^cwe-?/i, ''));
    const count = entry?.count;
    if (typeof gapId !== 'string' || !/^(GT-\d+|MT-A\d+)$/.test(gapId)) {
      errors.push(`occurrence entry has an invalid gapId: ${JSON.stringify(entry?.gapId)}`);
      continue;
    }
    if (!Number.isInteger(cwe) || cwe <= 0) {
      errors.push(`${gapId}: occurrence entry has an invalid cwe: ${JSON.stringify(entry?.cwe)}`);
      continue;
    }
    if (!Number.isInteger(count) || count < 0) {
      errors.push(`${gapId}: occurrence count for CWE-${cwe} must be a non-negative integer`);
      continue;
    }
    if (!byGap.has(gapId)) byGap.set(gapId, new Map());
    byGap.get(gapId).set(cwe, (byGap.get(gapId).get(cwe) || 0) + count);
  }

  return { byGap: errors.length > 0 ? null : byGap, provenance: provenance ?? null, errors };
}

// --- Derivation -------------------------------------------------------------

/**
 * Index the GT-598 mapping by rule id.
 * @param {object} mapping parsed src/rulesets/standards/iso-5055-mapping.json
 */
export function indexMapping(mapping) {
  const byRule = new Map();
  for (const rule of mapping?.rules ?? []) {
    byRule.set(rule.ruleId, {
      cwes: Array.isArray(rule.iso5055?.cwes) ? rule.iso5055.cwes : [],
      strength: rule.iso5055?.strength ?? 'none',
      adoptable: rule.analyser?.adoptable ?? 'no',
      analysers: Array.isArray(rule.analyser?.examples) ? rule.analyser.examples : [],
    });
  }
  return byRule;
}

/**
 * Decide, for ONE row, whether an ATDM principal is computable — and compute it if so.
 *
 * @returns {{ id: string, derivable: boolean, reason: string|null, principalHours: number|null, detail: object }}
 */
export function deriveRowPrincipal({ id, section, byRule, effortTable, occurrences }) {
  const linkage = parseRuleLinkage(section ?? '', new Set(byRule.keys()));
  const detail = {
    declaredRules: linkage.declared,
    unknownRuleTokens: linkage.unknown,
    candidateRules: linkage.candidates,
    cwes: [],
    analysers: [],
  };

  const block = (reason) => ({ id, derivable: false, reason, principalHours: null, detail });

  if (linkage.declared.length === 0) return block('no-rule-linkage');

  const cwes = new Set();
  const analysers = new Set();
  for (const ruleId of linkage.declared) {
    const rule = byRule.get(ruleId);
    if (!rule || rule.strength === 'none') continue;
    for (const cwe of rule.cwes) cwes.add(cwe);
    if (rule.adoptable !== 'no') for (const analyser of rule.analysers) analysers.add(analyser);
  }
  detail.cwes = [...cwes].sort((a, b) => a - b);
  detail.analysers = [...analysers];

  if (cwes.size === 0) return block('rules-not-mapped');
  if (analysers.size === 0) return block('no-named-analyser');

  const rowOccurrences = occurrences?.get(id);
  if (!rowOccurrences) return block('no-occurrence-data');
  const inScope = detail.cwes.filter((cwe) => rowOccurrences.has(cwe));
  if (inScope.length === 0) return block('no-occurrence-data');

  if (!effortTable) return block('no-effort-table');
  const missing = inScope.filter((cwe) => !effortTable.has(cwe));
  if (missing.length > 0) {
    detail.missingEffortForCwes = missing;
    return block('effort-table-incomplete');
  }

  let hours = 0;
  const terms = [];
  for (const cwe of inScope) {
    const count = rowOccurrences.get(cwe);
    const effort = effortTable.get(cwe);
    hours += count * effort;
    terms.push({ cwe, occurrences: count, repairEffortHours: effort, hours: count * effort });
  }
  detail.terms = terms;

  return {
    id,
    derivable: true,
    reason: null,
    // ATDM produces a principal only. Interest is not in the measure and is never invented here.
    principalHours: Math.round(hours * 10) / 10,
    detail,
  };
}

/**
 * Build the applicability report over the OPEN rows of the board.
 *
 * @param {object} input
 * @param {{id: string, status: string}[]} input.openRows
 * @param {Map<string,string>} input.sections    catalog sections by id (EN, canonical)
 * @param {object} input.mapping                 parsed iso-5055-mapping.json
 * @param {object|null} [input.effortTableJson]
 * @param {object|null} [input.occurrencesJson]
 */
export function buildAtdmReport({ openRows, sections, mapping, effortTableJson = null, occurrencesJson = null }) {
  const byRule = indexMapping(mapping);
  const effort = loadEffortTable(effortTableJson);
  const occ = loadOccurrences(occurrencesJson);
  const inputErrors = [...effort.errors, ...occ.errors];

  const rows = openRows.map((row) => deriveRowPrincipal({
    id: row.id,
    section: sections.get(row.id) ?? null,
    byRule,
    effortTable: effort.table,
    occurrences: occ.byGap,
  }));

  const derived = rows.filter((row) => row.derivable);
  const blocked = rows.filter((row) => !row.derivable);
  const reasonCounts = Object.fromEntries(Object.keys(BLOCK_REASONS).map((key) => [key, 0]));
  for (const row of blocked) reasonCounts[row.reason] += 1;

  return {
    spec: ATDM_SPEC,
    inputs: {
      corpusRules: byRule.size,
      effortTable: effort.table ? { weaknesses: effort.table.size, provenance: effort.provenance } : null,
      occurrences: occ.byGap ? { gaps: occ.byGap.size, provenance: occ.provenance } : null,
      errors: inputErrors,
    },
    denominators: { openRows: openRows.length },
    coverage: {
      derivable: derived.length,
      blocked: blocked.length,
      ratio: openRows.length === 0 ? null : derived.length / openRows.length,
    },
    reasonCounts,
    // A row nobody has linked but whose prose names corpus rules: the cheapest human act that
    // would move it toward derivable.
    linkageCandidates: rows
      .filter((row) => row.detail.declaredRules.length === 0 && row.detail.candidateRules.length > 0)
      .map((row) => ({ id: row.id, candidateRules: row.detail.candidateRules })),
    derived: derived.map((row) => ({
      id: row.id,
      principalHours: row.principalHours,
      basis: 'atdm',
      terms: row.detail.terms,
      analysers: row.detail.analysers,
    })),
    blocked: blocked.map((row) => ({ id: row.id, reason: row.reason, detail: row.detail })),
  };
}

/** JSON Schemas for the two inputs this repository does not hold, so they can be supplied. */
export function atdmInputSchemas() {
  return {
    effortTable: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://evolith.dev/schemas/board/atdm-effort-table.schema.json',
      title: 'ATDM repair-effort table (input, not vendored)',
      description:
        'Hours to repair ONE occurrence of an ISO/IEC 5055 weakness, per CWE, as published by the OMG '
        + 'Automated Technical Debt Measure. Not checked into this repository: the figures are the '
        + 'substance of a copyrighted specification, and an invented table carrying an `atdm` label '
        + 'would be indistinguishable from a derived one. Supply it with --effort-table.',
      type: 'object',
      required: ['provenance', 'repairEffortHoursByCwe'],
      properties: {
        provenance: {
          type: 'object',
          required: ['source', 'extractedOn', 'method'],
          properties: {
            source: { type: 'string', description: 'e.g. "OMG ATDM2 v1.0, Table N"' },
            extractedOn: { type: 'string', format: 'date' },
            method: { type: 'string' },
          },
        },
        repairEffortHoursByCwe: {
          type: 'object',
          minProperties: 1,
          patternProperties: { '^(CWE-)?\\d+$': { type: 'number', exclusiveMinimum: 0 } },
          additionalProperties: false,
        },
      },
    },
    occurrences: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://evolith.dev/schemas/board/atdm-occurrences.schema.json',
      title: 'ISO/IEC 5055 weakness occurrences, scoped to a board row (input, not vendored)',
      description:
        'Counted by a named analyser run. Absent from this repository because no analyser adapter has '
        + 'been integrated yet (see GT-598 § adoption). Supply it with --occurrences.',
      type: 'object',
      required: ['provenance', 'occurrences'],
      properties: {
        provenance: {
          type: 'object',
          required: ['analyser', 'ranOn', 'scope'],
          properties: {
            analyser: { type: 'string', description: 'e.g. "CodeQL 2.x", "Semgrep 1.x"' },
            ranOn: { type: 'string', format: 'date' },
            scope: { type: 'string', description: 'what was analysed — paths, package, commit' },
          },
        },
        occurrences: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['gapId', 'cwe', 'count'],
            properties: {
              gapId: { type: 'string', pattern: '^(GT-\\d+|MT-A\\d+)$' },
              cwe: { type: ['integer', 'string'] },
              count: { type: 'integer', minimum: 0 },
            },
          },
        },
      },
    },
  };
}
