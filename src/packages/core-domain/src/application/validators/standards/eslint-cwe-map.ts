/**
 * GT-664 — ESLint findings become an ISO/IEC 5055 measurement, and stay
 * labelled as the weaker evidence they are.
 *
 * ## The gap this closes, measured
 *
 * GT-662 built the translation `CWE → weakness → measure` and GT-663 gave it a
 * denominator. What neither could fix is that the translation needs an analyser
 * that TAGS its findings with CWEs, and the two free analysers already reachable
 * here leave most of the standard untouched. Against this repository: CodeQL
 * surfaces 10 of the 138 weaknesses (Security 10/74, Maintainability 2/31,
 * **Reliability 0/74, Performance Efficiency 0/18**), and semgrep `p/default`
 * adds exactly one weakness the standard names that CodeQL missed. Two of the
 * four measures had never been measured at all.
 *
 * ESLint is already installed in every JavaScript or TypeScript satellite, runs
 * offline, costs nothing, and can decide things a CWE-tagging scanner does not
 * look for — an omitted `break`, a `default` branch that is not there, a
 * function whose cyclomatic complexity is past the threshold the tenant chose.
 *
 * ## Why it needs a hand-written table, and what that costs
 *
 * ESLint declares no taxonomy identifier for any rule. Its metadata carries
 * `description`, `recommended` and `helpUri` — there is no CWE field to read,
 * from any rule, in any version. So the mapping cannot be harvested; it has to
 * be argued, one rule at a time, from what the rule documents itself to do
 * against what the CWE documents itself to be. `src/rulesets/standards/eslint-cwe-map.json`
 * is that argument, written down and reviewable.
 *
 * That is a genuinely weaker kind of evidence than `external/cwe/cwe-089` on a
 * CodeQL rule, where the analyser's own maintainers made the claim. This module
 * exists to keep the two apart:
 *
 *   - `analyser`           — the tool tagged its own finding. Read it as the tool's claim.
 *   - `evolith-eslint-map` — we inferred the CWE from the rule id. Read it as ours.
 *
 * Collapsing them would let a table written in an afternoon inherit the
 * authority of a static analyser's taxonomy work, and a tenant deciding whether
 * to act on a measurement is entitled to know which of the two they are looking
 * at. So the label survives into the violation message and into the coverage
 * advisory, and nothing in this package is allowed to average them together.
 *
 * ## What it still does NOT do
 *
 * Score. Same as GT-662: a count of weaknesses is not a compliance verdict, and
 * three of the mapped rules (`complexity`, `max-params`, `max-lines`) count
 * against a threshold the TENANT picked, so their findings are not even
 * comparable between two repositories unless the option is quoted with them.
 */

/** Where a CWE attributed to a finding came from. The distinction is the point. */
export type CweProvenance = 'analyser' | 'evolith-eslint-map';

/**
 * How much weight one row of the map carries.
 *
 * `exact`  — the rule's documented purpose and the CWE's Description name the
 *            same defect; a finding is an instance of the weakness.
 * `broad`  — the rule fires on a set that CONTAINS the weakness but is wider,
 *            or the CWE is phrased for a language family JavaScript is read into
 *            by analogy; a finding is evidence, not proof. Each such row records
 *            which way it is loose.
 */
export type CweMapConfidence = 'exact' | 'broad';

export interface EslintCweMapEntry {
  readonly ruleId: string;
  readonly cwe: number;
  readonly cweName: string;
  readonly confidence: CweMapConfidence;
}

/** The map as it ships in `src/rulesets/standards/eslint-cwe-map.json`. */
export interface EslintCweMapDocument {
  readonly entries?: readonly EslintCweMapEntry[];
  /** Rule ids whose findings are only readable next to the configured threshold. */
  readonly thresholdDependent?: readonly string[];
}

export interface EslintCweMap {
  /** Rule ids the table claims. `0` ⇒ the map did not load. */
  readonly size: number;
  /** Distinct CWEs the table can ever attribute — the map's REACH, not a finding count. */
  readonly reach: readonly number[];
  /** The rows for a rule id, or empty when the table says nothing about it. */
  entriesFor(ruleId: string): readonly EslintCweMapEntry[];
  /** Whether a finding for this rule id is only meaningful beside a configured threshold. */
  isThresholdDependent(ruleId: string): boolean;
}

/**
 * Build the lookup from the shipped table.
 *
 * Pure and total, exactly like {@link buildIso5055Index}: a malformed document
 * yields an EMPTY map rather than throwing. Emptiness is not silence, though —
 * `size` is published so a caller cannot report "ESLint found no ISO/IEC 5055
 * weakness" off a table that never loaded. The adapter checks it.
 */
export function buildEslintCweMap(raw: unknown): EslintCweMap {
  const byRule = new Map<string, EslintCweMapEntry[]>();
  const entries = (raw as EslintCweMapDocument | undefined)?.entries;
  const thresholdDependent = new Set<string>(
    ((raw as EslintCweMapDocument | undefined)?.thresholdDependent ?? []).filter(
      (id): id is string => typeof id === 'string',
    ),
  );

  if (Array.isArray(entries)) {
    for (const entry of entries) {
      const ruleId = typeof entry?.ruleId === 'string' ? entry.ruleId.trim() : '';
      const cwe = Number(entry?.cwe);
      if (ruleId === '' || !Number.isInteger(cwe) || cwe <= 0) continue;
      const row: EslintCweMapEntry = {
        ruleId,
        cwe,
        cweName: typeof entry.cweName === 'string' ? entry.cweName : '',
        confidence: entry.confidence === 'broad' ? 'broad' : 'exact',
      };
      const bucket = byRule.get(ruleId);
      if (bucket) bucket.push(row);
      else byRule.set(ruleId, [row]);
    }
  }

  const reach = [...new Set([...byRule.values()].flat().map((e) => e.cwe))].sort((a, b) => a - b);

  return {
    size: byRule.size,
    reach,
    entriesFor: (ruleId) => byRule.get(ruleId) ?? [],
    isThresholdDependent: (ruleId) => thresholdDependent.has(ruleId),
  };
}

/**
 * Does this SARIF run come from ESLint?
 *
 * The map is applied only to runs ESLint produced. Every row is a claim about
 * an ESLint CORE rule id and about nothing else, so resolving another tool's
 * rule id through it would attribute a CWE on the strength of an argument that
 * was never made about that tool. `@microsoft/eslint-formatter-sarif` writes
 * `tool.driver.name: "ESLint"`; a tenant whose producer writes something else
 * says so with `enforce.config.analyser`.
 */
export function isEslintDriver(driverName: unknown): boolean {
  return typeof driverName === 'string' && /eslint/i.test(driverName);
}

/** One finding's CWEs, with where each side of the attribution came from. */
export interface AttributedCwes {
  /** CWEs the analyser declared for itself (rule tags, result properties). */
  readonly analyser: readonly number[];
  /** CWEs our hand-written table inferred from the rule id. */
  readonly mapped: readonly EslintCweMapEntry[];
  /** The union, ascending — what the ISO/IEC 5055 classification is run over. */
  readonly all: readonly number[];
  /**
   * How this finding got its CWEs at all. `undefined` ⇒ it has none, which is a
   * third state and must not be folded into either of the other two.
   */
  readonly provenance?: CweProvenance;
}

/**
 * Attribute CWEs to one SARIF result, keeping the two sources separable.
 *
 * The map is consulted ONLY when the analyser declared nothing. A tool that
 * tagged its own finding has said something more authoritative than our table
 * can, and overwriting or padding that with our inference would destroy the
 * distinction this module exists to preserve.
 *
 * @param analyserCwes what `cwesOfSarifResult` harvested from the SARIF itself
 */
export function attributeCwes(
  ruleId: string,
  analyserCwes: readonly number[],
  map?: EslintCweMap,
): AttributedCwes {
  if (analyserCwes.length > 0) {
    return { analyser: [...analyserCwes], mapped: [], all: [...analyserCwes], provenance: 'analyser' };
  }
  const mapped = map?.entriesFor(ruleId) ?? [];
  if (mapped.length === 0) return { analyser: [], mapped: [], all: [] };
  const all = [...new Set(mapped.map((e) => e.cwe))].sort((a, b) => a - b);
  return { analyser: [], mapped: [...mapped], all, provenance: 'evolith-eslint-map' };
}

/**
 * A copy of `result` carrying the attributed CWEs where `cwesOfSarifResult`
 * already looks for them.
 *
 * Written this way so `classifySarifResult` — the translation GT-662 built and
 * tested — is reused verbatim rather than reimplemented for a second producer.
 * One translation, many producers, is the property that made the ISO/IEC 5055
 * work worth doing.
 */
export function withAttributedCwes(result: unknown, cwes: readonly number[]): unknown {
  const existing = (result as { properties?: unknown } | undefined)?.properties;
  const properties = existing && typeof existing === 'object' ? { ...(existing as object) } : {};
  return { ...(result as object), properties: { ...properties, cwe: [...cwes] } };
}

/**
 * The sentence a report carries when part of a measurement rests on our table.
 *
 * Written here, once, so no rendering surface can drop it: a reader who is told
 * «Reliability 1/74» is entitled to know, in the same breath, that the CWE
 * behind it was inferred by Evolith from an ESLint rule id and not declared by
 * ESLint, which declares none.
 */
export function describeMapProvenance(
  mappedFindings: number,
  broadFindings: number,
  thresholdFindings: number,
): string {
  return (
    `${mappedFindings} finding(s) were attributed to a CWE by Evolith's hand-written ESLint→CWE ` +
    'table, NOT by the analyser — ESLint declares no CWE for any rule, so those rows are a human ' +
    'claim about documented rule behaviour and are weaker evidence than a finding a tool tagged ' +
    `itself. Of them, ${broadFindings} came from a row marked \`broad\` (the rule fires on a wider ` +
    `set than the weakness, or the CWE is read into JavaScript by analogy), and ${thresholdFindings} ` +
    'came from a rule that counts against a threshold the tenant configured, so their number is not ' +
    'comparable across repositories unless that option is quoted with it.'
  );
}
