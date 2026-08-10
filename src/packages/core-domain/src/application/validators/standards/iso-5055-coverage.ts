import { classifySarifResult, cwesOfSarifResult, type Iso5055Index, type Iso5055Measure } from './iso-5055-measure';
import {
  attributeCwes,
  describeMapProvenance,
  isEslintDriver,
  withAttributedCwes,
  type EslintCweMap,
} from './eslint-cwe-map';

/**
 * GT-663 — the ISO/IEC 5055 measurement reports its own denominator.
 *
 * GT-662 made the measurement real: this repository's CodeQL findings map to
 * **34 violations across 10 distinct weaknesses**. What the report could not say
 * is *of how many*. The standard names **138**, so a run that finds none reads
 * identically whether the analyser looks for all 138 or for none of them — and
 * the second is the common case, because coverage here is the analyser's, never
 * the standard's.
 *
 * That is the exact shape GT-569 fixed for rule coverage: a count without its
 * denominator silently redefines what it counts. `rulesChecked: 0` looked like a
 * clean repository until the denominator travelled with it. This is the same
 * fix, one standard over.
 *
 * ## What it can and cannot know
 *
 * It reports what the analyser **DID** find, against what the standard names. It
 * does NOT claim to know what the analyser *could* have found — that would need
 * the scanner's own rule catalogue, which is a network call to a vendor for
 * CodeQL and a registry fetch for semgrep. Publishing a "could have" number
 * derived from anything less would be inventing the very assurance this file
 * exists to withhold.
 *
 * So `observed` is a floor, and it is labelled as one. A tenant reading it
 * learns «my analyser surfaced 10 of the 138 weaknesses this standard names»,
 * which is a true and useful sentence, and never «the other 128 are absent».
 */

/** Per-measure counts, all of them floors observed from one run. */
export interface Iso5055MeasureCoverage {
  readonly measure: Iso5055Measure;
  /** Distinct weaknesses of this measure the analyser reported. */
  readonly observed: number;
  /** Weaknesses this measure contains, per the standard. */
  readonly total: number;
  /** Individual findings attributed to this measure (one weakness can recur). */
  readonly findings: number;
}

export interface Iso5055Coverage {
  /** Distinct ISO/IEC 5055 weaknesses the analyser reported, across all measures. */
  readonly observedWeaknesses: number;
  /** Weaknesses the standard names. The denominator that was missing. */
  readonly standardWeaknesses: number;
  /** The observed CWE numbers, ascending — enumerable, not just counted. */
  readonly observedCwes: readonly number[];
  /** Findings that carried a CWE the standard does NOT name. */
  readonly outOfScopeFindings: number;
  /** Findings that carried no CWE at all — the analyser said nothing to map. */
  readonly untaggedFindings: number;
  readonly byMeasure: readonly Iso5055MeasureCoverage[];
  /**
   * GT-664 — how the in-scope findings got their CWEs, kept apart on purpose.
   *
   * `analyserAttributed` is what a tool tagged itself (CodeQL's
   * `external/cwe/cwe-089`, semgrep's `properties.cwe`). `mapAttributed` is what
   * Evolith's hand-written ESLint→CWE table inferred from a rule id, because
   * ESLint declares no CWE for any rule. The second is a weaker claim than the
   * first and a reader deciding whether to act on this measurement needs to see
   * which one it rests on, so the two are never summed into one number here.
   */
  readonly analyserAttributedFindings: number;
  readonly mapAttributedFindings: number;
  /** Of `mapAttributedFindings`, those from a row the table marks `broad`. */
  readonly broadlyMappedFindings: number;
  /** Of `mapAttributedFindings`, those from a rule counting against a tenant threshold. */
  readonly thresholdDependentFindings: number;
}

/** Optional producers a coverage run can take into account. */
export interface Iso5055CoverageOptions {
  /**
   * The ESLint→CWE table. Applied ONLY to a run whose driver is ESLint and only
   * to results the analyser left untagged — see `attributeCwes`.
   */
  readonly cweMap?: EslintCweMap;
}

const MEASURE_ORDER: readonly Iso5055Measure[] = [
  'Security',
  'Reliability',
  'Performance Efficiency',
  'Maintainability',
];

/**
 * Measure one SARIF log against the standard's denominator.
 *
 * Pure. Throws on an unloaded index for the same reason
 * `iso5055ViolationsFromSarif` does: reporting «0 of 138» from an index that is
 * not there is a compliance claim built on nothing.
 */
export function iso5055CoverageFromSarif(
  log: string,
  index: Iso5055Index,
  options: Iso5055CoverageOptions = {},
): Iso5055Coverage {
  if (index.size === 0) {
    throw new Error(
      'ISO/IEC 5055 weakness index did not load (size 0). Refusing to report coverage ' +
        'against an index that is not there.',
    );
  }

  const totals = new Map<Iso5055Measure, number>(MEASURE_ORDER.map((m) => [m, 0]));
  for (const weakness of index.weaknesses()) {
    for (const measure of weakness.measures) totals.set(measure, (totals.get(measure) ?? 0) + 1);
  }

  const observed = new Map<Iso5055Measure, Set<number>>(MEASURE_ORDER.map((m) => [m, new Set()]));
  const findings = new Map<Iso5055Measure, number>(MEASURE_ORDER.map((m) => [m, 0]));
  const allObserved = new Set<number>();
  let outOfScope = 0;
  let untagged = 0;
  let analyserAttributed = 0;
  let mapAttributed = 0;
  let broadlyMapped = 0;
  let thresholdDependent = 0;

  let parsed: { runs?: unknown[] };
  try {
    parsed = JSON.parse(log || '{}');
  } catch {
    parsed = {};
  }

  for (const run of (parsed.runs ?? []) as Array<Record<string, unknown>>) {
    const driver = (run.tool as { driver?: { name?: string; rules?: unknown[] } } | undefined)?.driver;
    const rules = new Map<string, unknown>();
    for (const meta of (driver?.rules ?? []) as Array<{ id?: string }>) {
      if (meta?.id) rules.set(meta.id, meta);
    }
    // GT-664 — the table is a set of claims about ESLint core rule ids and about
    // nothing else, so it is consulted only for a run ESLint produced.
    const map = isEslintDriver(driver?.name) ? options.cweMap : undefined;

    for (const result of (run.results ?? []) as Array<Record<string, unknown>>) {
      const ruleId = String(result.ruleId ?? '');
      const ruleMeta = rules.get(ruleId);
      const attributed = attributeCwes(ruleId, cwesOfSarifResult(result, ruleMeta), map);
      const finding = classifySarifResult(
        index,
        withAttributedCwes(result, attributed.all),
        ruleMeta,
      );

      if (finding.cwes.length === 0) {
        // Counted separately on purpose. A finding the analyser never tagged is
        // not evidence the standard is satisfied — it is evidence the analyser
        // told us nothing we could map, and a reader deciding whether to trust
        // this measurement needs to see how much of that there was.
        untagged += 1;
        continue;
      }
      if (finding.iso5055Cwes.length === 0) {
        outOfScope += 1;
        continue;
      }

      // GT-664 — counted here, on the in-scope findings only, because this is
      // the number that stands behind the per-measure figures a reader acts on.
      if (attributed.provenance === 'evolith-eslint-map') {
        mapAttributed += 1;
        if (attributed.mapped.some((e) => e.confidence === 'broad')) broadlyMapped += 1;
        if (map?.isThresholdDependent(ruleId)) thresholdDependent += 1;
      } else {
        analyserAttributed += 1;
      }

      for (const cwe of finding.iso5055Cwes) allObserved.add(cwe);
      for (const measure of finding.measures) {
        findings.set(measure, (findings.get(measure) ?? 0) + 1);
        for (const cwe of finding.iso5055Cwes) {
          if (index.measuresFor(cwe).includes(measure)) observed.get(measure)!.add(cwe);
        }
      }
    }
  }

  return {
    observedWeaknesses: allObserved.size,
    standardWeaknesses: index.size,
    observedCwes: [...allObserved].sort((a, b) => a - b),
    outOfScopeFindings: outOfScope,
    untaggedFindings: untagged,
    byMeasure: MEASURE_ORDER.map((measure) => ({
      measure,
      observed: observed.get(measure)!.size,
      total: totals.get(measure) ?? 0,
      findings: findings.get(measure) ?? 0,
    })),
    analyserAttributedFindings: analyserAttributed,
    mapAttributedFindings: mapAttributed,
    broadlyMappedFindings: broadlyMapped,
    thresholdDependentFindings: thresholdDependent,
  };
}

/**
 * The sentence a report carries next to the verdict.
 *
 * Written here rather than at each call site so all three surfaces say the same
 * thing, and so the caveat cannot be dropped by whoever renders it: the floor is
 * named as a floor, every time.
 */
export function describeIso5055Coverage(coverage: Iso5055Coverage): string {
  const per = coverage.byMeasure
    .filter((m) => m.observed > 0)
    .map((m) => `${m.measure} ${m.observed}/${m.total}`)
    .join(', ');

  // GT-664 — appended only when part of the measurement rests on Evolith's own
  // table. A run whose CWEs all came from the analyser reads exactly as it did
  // before, and a run that leans on our inference says so in the same breath as
  // the number, where it cannot be read past.
  const provenance =
    coverage.mapAttributedFindings > 0
      ? ' ' +
        describeMapProvenance(
          coverage.mapAttributedFindings,
          coverage.broadlyMappedFindings,
          coverage.thresholdDependentFindings,
        )
      : '';

  return (
    `ISO/IEC 5055: the configured analyser reported ${coverage.observedWeaknesses} of the ` +
    `${coverage.standardWeaknesses} weaknesses this standard names` +
    (per ? ` (${per})` : '') +
    `. That is a FLOOR, not coverage: it counts what was FOUND, and says nothing about how many ` +
    `of the remaining ${coverage.standardWeaknesses - coverage.observedWeaknesses} the analyser ` +
    `even looks for. ${coverage.outOfScopeFindings} finding(s) carried a CWE outside the standard ` +
    `and ${coverage.untaggedFindings} carried none at all.` +
    provenance
  );
}
