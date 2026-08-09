import { NormalizedRule } from '../../domain/models/normalized-rule';

/**
 * GT-659 — the Core evaluates what the caller ASKED FOR, not everything it owns.
 *
 * ## The defect
 *
 * `EvaluationContext` has carried `rulesetRef`, `rulesetVersion` and `policyRefs`
 * since the contract was written, and the orchestrator copies `rulesetRef` into
 * the result as provenance. **Nothing has ever filtered by it.** A caller that
 * asked for one ruleset got all 402 rules and a result stamped with the ref it
 * requested — a selection that is recorded and disobeyed, which is worse than one
 * that is refused, because the answer looks tailored.
 *
 * The consequence is the whole per-tenant story: no tenant can be evaluated at a
 * different level from another, and none can adopt a standards pack without also
 * adopting this repository's opinions about hexagonal architecture. It surfaced
 * when GT-600 added eight SSDF rules and they applied to every satellite
 * immediately — not because that pack was special, but because everything is.
 *
 * ## The shape of the fix
 *
 * ADDITIVE, and that is not a nicety. Absent selection means "everything", which
 * is exactly today's behaviour, so every existing caller and every recorded
 * verdict is unchanged; a filter that defaulted to "nothing" would turn a missing
 * field into a silently green evaluation. The rule is:
 *
 *   no selection          -> every rule, unchanged
 *   selection that matches -> only the matching rules
 *   selection that matches NOTHING -> an error, never an empty pass
 *
 * That last line is the one that matters. An unknown ruleset ref is a caller
 * asking for something this Core does not have, and answering "0 violations" to
 * that question is a false clean bill of health.
 */

/** What a caller may name. Both forms are what the reference catalogue publishes. */
export interface RulesetSelection {
  /** A single canonical ruleset id (`$id`) or a corpus-relative path fragment. */
  readonly rulesetRef?: string;
  /** Additional refs, same id space. */
  readonly policyRefs?: readonly string[];
}

export interface SelectionOutcome {
  /** The rules that will be evaluated. */
  readonly selected: readonly NormalizedRule[];
  /** Every rule the corpus holds, so a report can state both numbers. */
  readonly corpusTotal: number;
  /** The refs that matched at least one rule. */
  readonly matched: readonly string[];
  /** Refs that matched nothing — a caller asked for something absent. */
  readonly unmatched: readonly string[];
  /** True when no selection was supplied and the whole corpus applies. */
  readonly unrestricted: boolean;
}

/** Refs a caller supplied, deduplicated and trimmed; empty when none. */
export function refsOf(selection: RulesetSelection | undefined): readonly string[] {
  const raw = [selection?.rulesetRef, ...(selection?.policyRefs ?? [])];
  return [...new Set(raw.filter((r): r is string => typeof r === 'string' && r.trim() !== '').map((r) => r.trim()))];
}

/**
 * Does this rule belong to the ruleset named by `ref`?
 *
 * Matching is deliberately forgiving about FORM and strict about IDENTITY. The
 * catalogue publishes `$id` as a URL (`https://evolith.dev/rulesets/standards/
 * ssdf-v1.1.rules.json`) while a rule remembers its `sourceFile`
 * (`standards/ssdf-v1.1.rules.json`), and requiring a caller to know which of the
 * two this engine wanted would make a correct request fail on punctuation. So a
 * ref matches when it is the source path, ends with it, or contains it — but it
 * is always compared against the WHOLE path segment, never a substring of a
 * filename, so `acl` cannot silently select `acl-extras`.
 */
export function ruleMatchesRef(rule: NormalizedRule, ref: string): boolean {
  const source = normalise(rule.sourceFile);
  const wanted = normalise(ref);
  if (!source || !wanted) return false;
  if (source === wanted) return true;

  // Segment-aligned containment: the ref must start at a path boundary.
  return source.endsWith(`/${wanted}`) || wanted.endsWith(`/${source}`) || wanted.endsWith(source);
}

function normalise(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/^rulesets\//, '')
    .replace(/^\/+/, '')
    .trim();
}

/**
 * Apply a caller's selection to a loaded corpus.
 *
 * Pure: no filesystem, no clock, no throwing. The caller decides what an
 * unmatched ref means, because the domain must not choose an HTTP status — but
 * `unmatched` is reported separately from `matched` precisely so that "you asked
 * for something I do not have" can never be collapsed into "nothing was wrong".
 */
export function selectRules(
  rules: readonly NormalizedRule[],
  selection: RulesetSelection | undefined,
): SelectionOutcome {
  const refs = refsOf(selection);
  if (refs.length === 0) {
    return {
      selected: rules,
      corpusTotal: rules.length,
      matched: [],
      unmatched: [],
      unrestricted: true,
    };
  }

  const matched: string[] = [];
  const unmatched: string[] = [];
  const keep = new Set<NormalizedRule>();

  for (const ref of refs) {
    const hits = rules.filter((rule) => ruleMatchesRef(rule, ref));
    if (hits.length === 0) {
      unmatched.push(ref);
      continue;
    }
    matched.push(ref);
    for (const hit of hits) keep.add(hit);
  }

  return {
    // Corpus order is preserved: a selection changes WHICH rules run, never the
    // order they are reported in, so two runs of the same selection diff cleanly.
    selected: rules.filter((rule) => keep.has(rule)),
    corpusTotal: rules.length,
    matched,
    unmatched,
    unrestricted: false,
  };
}
