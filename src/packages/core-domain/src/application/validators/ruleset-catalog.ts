import { NormalizedRule } from './rule-evaluation-engine';
import { ruleMatchesRef } from './ruleset-selection';

/**
 * GT-660 — what this Core can evaluate, published so a caller can choose.
 *
 * `--select` has shipped since GT-659 with help text reading «by the id the
 * catalogue publishes». No surface published a catalogue. Selecting was possible
 * only for a caller who already knew a filename by heart, which is not a
 * configurable product — it is a product with a secret.
 *
 * The owner's principle is the shape of this module: **the Core PROPOSES; the
 * Tracker, CLI and MCP configure and select.** A proposal nobody can read is not
 * a proposal, so the menu has to be a first-class output rather than something
 * inferred from a directory listing.
 *
 * ## Derived, never written down
 *
 * The catalogue is built from the SAME `NormalizedRule[]` the engine evaluates,
 * so it cannot describe a pack the engine does not carry, and it cannot omit one
 * it does. A hand-maintained list of packs would drift within a month — this
 * repository has closed that defect enough times to know. Every entry's `ref` is
 * additionally proven, at build time, to actually select its own pack through
 * `ruleMatchesRef`: publishing a ref that `--select` then rejects would be worse
 * than publishing nothing.
 */

/** One selectable pack, as a caller sees it. */
export interface CatalogEntry {
  /** The ref to pass to `--select` / `policyRefs`. Proven to match this pack. */
  readonly ref: string;
  /** Rules in the pack. */
  readonly rules: number;
  /**
   * How many of them can FAIL a run.
   *
   * Published because it is the difference between a pack that reports and a
   * pack that blocks, and a tenant deciding what to adopt is entitled to know
   * which one it is signing up for BEFORE the first red build.
   */
  readonly blocking: number;
  /** Distinct severities present, in corpus order of first appearance. */
  readonly severities: readonly string[];
  /** Distinct rule categories present. */
  readonly categories: readonly string[];
}

export interface RulesetCatalog {
  readonly entries: readonly CatalogEntry[];
  /** Packs published. */
  readonly packs: number;
  /** Rules across every pack — the denominator a selection narrows. */
  readonly rules: number;
  /** Rules that can fail a run, across every pack. */
  readonly blocking: number;
}

/** Distinct values of `pick` across `items`, first-appearance order, blanks dropped. */
function distinct<T>(items: readonly T[], pick: (item: T) => string | undefined): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    const value = pick(item);
    if (typeof value === 'string' && value.trim() !== '') seen.add(value.trim());
  }
  return [...seen];
}

/**
 * Build the catalogue from a loaded corpus.
 *
 * Pure: no filesystem, no clock, no throwing — the same contract as
 * `selectRules`, and for the same reason. The caller decides how to render it
 * and what an empty corpus means; the domain refuses to guess.
 *
 * @param rules the corpus, exactly as `IRulesetRepository.loadAllRulesets` returns it
 */
export function buildRulesetCatalog(rules: readonly NormalizedRule[]): RulesetCatalog {
  const byRef = new Map<string, NormalizedRule[]>();

  for (const rule of rules) {
    // `sourceFile` IS the ref `--select` matches on (see `ruleMatchesRef`). A
    // rule with no source cannot be selected by anything, so publishing a ref
    // for it would advertise a choice that does not work.
    const ref = String(rule.sourceFile ?? '').trim();
    if (!ref) continue;
    const bucket = byRef.get(ref);
    if (bucket) bucket.push(rule);
    else byRef.set(ref, [rule]);
  }

  const entries: CatalogEntry[] = [];
  for (const [ref, packRules] of byRef) {
    // The published ref must select its own pack. This is not defensive
    // programming — it is the one property a catalogue exists to guarantee, and
    // asserting it here means a divergence between the two functions shows up as
    // a missing entry rather than as a caller's `SEL-01` on a ref we told them
    // to use.
    if (!packRules.some((rule) => ruleMatchesRef(rule, ref))) continue;

    entries.push({
      ref,
      rules: packRules.length,
      blocking: packRules.filter((rule) => rule.blocking === true).length,
      severities: distinct(packRules, (rule) => rule.severity),
      categories: distinct(packRules, (rule) => rule.category),
    });
  }

  entries.sort((a, b) => a.ref.localeCompare(b.ref));

  return {
    entries,
    packs: entries.length,
    rules: entries.reduce((sum, entry) => sum + entry.rules, 0),
    blocking: entries.reduce((sum, entry) => sum + entry.blocking, 0),
  };
}
