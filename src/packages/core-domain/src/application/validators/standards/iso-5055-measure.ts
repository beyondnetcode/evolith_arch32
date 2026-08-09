/**
 * GT-662 — CWE → ISO/IEC 5055:2021 measure, so a free analyser's findings
 * become a standards measurement.
 *
 * ## Why this shape and not a ruleset of 138 hand-written rules
 *
 * ISO/IEC 5055 does not describe processes; it names **138 structural weaknesses,
 * each one a CWE identifier**, across four measures. A native Evolith handler is
 * given a filesystem and no code parser, so it cannot decide «this switch has no
 * default» or «this credential comparison is not constant-time». Authoring 138
 * rules nothing can execute is not a conservative first step — GT-585 measured
 * what that produces here: **78 of 96 blocking outcomes were rules that could not
 * run**. A ruleset without something behind it is not a check; it is a claim.
 *
 * What CAN decide them already exists and is free: any analyser that emits SARIF
 * and tags its rules with CWEs — CodeQL (already running in this repository's
 * CI), semgrep, ESLint plugins. This module is the missing translation layer, and
 * deliberately nothing more:
 *
 *     analyser → SARIF → CWE → ISO 5055 weakness → measure
 *
 * It reads no files, runs no tool and reaches no verdict. It answers one
 * question — «does this CWE belong to ISO/IEC 5055, and to which measures» —
 * from the index that already ships in `src/rulesets/standards/`.
 *
 * ## What it deliberately does NOT do
 *
 * It does not score. A count of weaknesses is not a compliance verdict, and the
 * standard's own scoring is out of scope for a mapping. Turning findings into a
 * verdict is a policy decision that belongs to a tenant's selected ruleset, not
 * to a lookup table.
 */

/** The four ISO/IEC 5055:2021 automated source code quality measures. */
export type Iso5055Measure = 'Security' | 'Reliability' | 'Performance Efficiency' | 'Maintainability';

/** The weakness index as it ships in `src/rulesets/standards/iso-5055-weaknesses.json`. */
export interface Iso5055WeaknessIndex {
  readonly standard?: { readonly weaknessCount?: number };
  readonly measures: Readonly<Record<string, readonly number[]>>;
}

/** One CWE that ISO/IEC 5055 includes, with the measures that claim it. */
export interface Iso5055Weakness {
  readonly cwe: number;
  /** Measures containing this CWE. A weakness may belong to more than one. */
  readonly measures: readonly Iso5055Measure[];
}

const MEASURE_ORDER: readonly Iso5055Measure[] = [
  'Security',
  'Reliability',
  'Performance Efficiency',
  'Maintainability',
];

/**
 * Every spelling of a CWE this corpus has to survive, reduced to its number.
 *
 * Not defensive breadth for its own sake — each form below is one an analyser
 * actually emits, and the differences are not cosmetic. CodeQL tags rules
 * `external/cwe/cwe-079` (zero-padded, lowercase); semgrep writes
 * `CWE-79: Improper Neutralization…`; some SARIF producers put a bare number in
 * `properties.cwe`. A parser that handled only one of them would silently score
 * a repository at zero against the other two, which reads exactly like a clean
 * repository.
 */
const CWE_PATTERNS: readonly RegExp[] = [
  /^\s*cwe[-_ ]?0*(\d{1,4})\b/i,
  /^\s*external\/cwe\/cwe[-_]0*(\d{1,4})\b/i,
  /^\s*0*(\d{1,4})\s*$/,
];

/**
 * Parse one token into a CWE number, or `undefined`.
 *
 * @param token e.g. `CWE-79`, `external/cwe/cwe-079`, `79`, `CWE-79: XSS`
 */
export function parseCweToken(token: unknown): number | undefined {
  if (typeof token === 'number' && Number.isInteger(token) && token > 0) return token;
  if (typeof token !== 'string') return undefined;
  for (const pattern of CWE_PATTERNS) {
    const match = pattern.exec(token);
    if (match) {
      const n = Number(match[1]);
      if (Number.isInteger(n) && n > 0) return n;
    }
  }
  return undefined;
}

/**
 * Build a CWE → measures lookup from the shipped index.
 *
 * Pure and total: an index whose `measures` is missing or malformed yields an
 * EMPTY map rather than throwing. The caller decides what an empty map means —
 * and a caller that reports «zero ISO 5055 findings» off an empty map is making
 * the mistake this module's tests exist to catch, which is why
 * {@link Iso5055Index.size} is published.
 */
export interface Iso5055Index {
  /** Distinct CWEs the standard names. `0` ⇒ the index did not load. */
  readonly size: number;
  /** Measures for a CWE; empty when the CWE is not part of ISO/IEC 5055. */
  measuresFor(cwe: number): readonly Iso5055Measure[];
  /** Every weakness, ascending by CWE, for enumeration and reporting. */
  weaknesses(): readonly Iso5055Weakness[];
}

export function buildIso5055Index(raw: unknown): Iso5055Index {
  const byCwe = new Map<number, Iso5055Measure[]>();
  const measures = (raw as Iso5055WeaknessIndex | undefined)?.measures;

  if (measures && typeof measures === 'object') {
    for (const measure of MEASURE_ORDER) {
      const cwes = (measures as Record<string, unknown>)[measure];
      if (!Array.isArray(cwes)) continue;
      for (const entry of cwes) {
        const cwe = parseCweToken(entry);
        if (cwe === undefined) continue;
        const bucket = byCwe.get(cwe);
        if (bucket) {
          if (!bucket.includes(measure)) bucket.push(measure);
        } else {
          byCwe.set(cwe, [measure]);
        }
      }
    }
  }

  return {
    size: byCwe.size,
    measuresFor: (cwe) => byCwe.get(cwe) ?? [],
    weaknesses: () =>
      [...byCwe.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([cwe, ms]) => ({ cwe, measures: [...ms] })),
  };
}

/**
 * Every CWE a SARIF result carries, from any of the places producers put them.
 *
 * SARIF has no single field for this. CodeQL puts them in the RULE's
 * `properties.tags` (`external/cwe/cwe-079`), which lives in
 * `run.tool.driver.rules[]` and NOT on the result — so a reader that only looks
 * at results finds nothing, which is why `ruleMetadata` is a parameter here
 * rather than an afterthought. semgrep puts them in the result's own
 * `properties.cwe`. Both are read; duplicates collapse.
 *
 * @param result   one entry of `run.results[]`
 * @param ruleMeta the matching entry of `run.tool.driver.rules[]`, when resolvable
 */
export function cwesOfSarifResult(result: unknown, ruleMeta?: unknown): number[] {
  const found = new Set<number>();

  const harvest = (value: unknown): void => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      for (const item of value) harvest(item);
      return;
    }
    const cwe = parseCweToken(value);
    if (cwe !== undefined) found.add(cwe);
  };

  const props = (node: unknown): Record<string, unknown> | undefined => {
    const p = (node as { properties?: unknown } | undefined)?.properties;
    return p && typeof p === 'object' ? (p as Record<string, unknown>) : undefined;
  };

  // The rule's tags — where CodeQL puts them, and the reason this function takes
  // the rule metadata at all.
  harvest(props(ruleMeta)?.tags);
  harvest(props(ruleMeta)?.cwe);
  // The result's own properties — where semgrep puts them.
  harvest(props(result)?.cwe);
  harvest(props(result)?.tags);

  return [...found].sort((a, b) => a - b);
}

/** A SARIF finding, reduced to what ISO/IEC 5055 cares about. */
export interface Iso5055Finding {
  readonly ruleId: string;
  readonly cwes: readonly number[];
  /** The subset of `cwes` that ISO/IEC 5055 actually names. */
  readonly iso5055Cwes: readonly number[];
  /** Measures those weaknesses belong to; empty ⇒ out of scope for the standard. */
  readonly measures: readonly Iso5055Measure[];
}

/**
 * Classify one SARIF result against ISO/IEC 5055.
 *
 * A finding with CWEs the standard does not name is NOT dropped — it is returned
 * with `iso5055Cwes: []` and `measures: []`. Dropping it would make «this scan
 * found nothing ISO 5055 cares about» indistinguishable from «this scan found
 * nothing», and those are different reports.
 */
export function classifySarifResult(
  index: Iso5055Index,
  result: unknown,
  ruleMeta?: unknown,
): Iso5055Finding {
  const ruleId = String(
    (result as { ruleId?: unknown } | undefined)?.ruleId ??
      (ruleMeta as { id?: unknown } | undefined)?.id ??
      '',
  );
  const cwes = cwesOfSarifResult(result, ruleMeta);
  const inScope = cwes.filter((cwe) => index.measuresFor(cwe).length > 0);

  const measures: Iso5055Measure[] = [];
  for (const cwe of inScope) {
    for (const measure of index.measuresFor(cwe)) {
      if (!measures.includes(measure)) measures.push(measure);
    }
  }
  measures.sort((a, b) => MEASURE_ORDER.indexOf(a) - MEASURE_ORDER.indexOf(b));

  return { ruleId, cwes, iso5055Cwes: inScope, measures };
}
