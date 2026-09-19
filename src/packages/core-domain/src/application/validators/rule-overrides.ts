import type { AuthoredRuleOverride, NormalizedRule } from '../../domain/models/normalized-rule';

/**
 * GT-678 — a tenant may soften ONE rule, and the run must say so.
 *
 * ## The defect
 *
 * Pack-level selection exists (GT-659/GT-661): a caller can adopt a ruleset or
 * not. Below that there was nothing. A tenant that accepted one rule's risk had
 * to drop the whole pack, and the two things a tenant tried instead both failed
 * silently — measured against the real `DiskRulesetRepository`:
 *
 *  - a `tenants/**` pack redefining `ACL-02` as `severity: SHOULD, blocking:
 *    false` loaded ADDITIVELY: `TOTAL RULES LOADED: 2`, the Core copy still
 *    `blocking: true`, the rule firing twice at two severities from two files;
 *  - an authored `enabled: false` passed the schema (no `additionalProperties:
 *    false` on a rule) and was dropped by `normalizeRuleset` — present on
 *    neither copy. A key that is accepted and discarded looks like
 *    configuration, which is worse than a rejection.
 *
 * ## The shape of the fix
 *
 * One model and one policy for every way a delta can arrive: a `tenants/**`
 * copy inside the corpus (attached by the loader as `rule.corpusOverride`), a
 * rule's own `enabled: false`, and the satellite's `rule-overrides` document
 * (`spec.rulesets.overrides` in `evolith.yaml`). All three go through this
 * function, in that order, so the entry path can never change what is allowed.
 *
 * Pure: no filesystem, no clock (`now` is injected), no throwing. The caller
 * decides what a rejection means for the verdict — but a rejection is always
 * NAMED, because "your override was ignored" delivered as silence is the defect
 * this row records.
 *
 * ## The one rule that matters
 *
 * A blocking criterion can be WAIVED — time-boxed and approved — but never
 * REMOVED. `enabled: false` or `blocking: false` on a `blocking: true` rule
 * without BOTH `approvedBy` and `expiresOn` is rejected as
 * `OVR-BLOCKING-REMOVED`, the Core values stand, and the validator turns the
 * rejection into a blocking issue so the run fails closed rather than green.
 * Hardening (raising severity, `blocking: false → true`, re-enabling) is always
 * allowed and always recorded.
 */

/** The three fields a delta may change. Everything else on a rule is the Core's. */
export type OverrideField = 'enabled' | 'severity' | 'blocking';

/**
 * One change that a run actually applied, from → to, with who approved it,
 * until when, and where it came from. Asserted non-empty for an overridden run
 * and EMPTY RATHER THAN ABSENT for a clean one.
 */
export interface OverrideRecord {
  readonly ruleId: string;
  readonly field: OverrideField;
  readonly from: string | boolean;
  readonly to: string | boolean;
  readonly approvedBy?: string;
  readonly expiresOn?: string;
  /**
   * The corpus file that declared `enabled: false`, the `tenants/**` pack, or
   * the satellite-relative path of the override document.
   */
  readonly source: string;
}

export type OverrideIssueCode =
  /** `expiresOn` is in the past: the override is ignored, the Core values stand. */
  | 'OVR-EXPIRED'
  /** The override names a rule id the corpus does not carry (a typo loosens nothing). */
  | 'OVR-UNKNOWN-RULE'
  /** The rule exists but this run's selection did not include it. */
  | 'OVR-NOT-SELECTED'
  /** Every field the override sets already has that value. */
  | 'OVR-NOOP'
  /** A severity the engine cannot represent. */
  | 'OVR-INVALID-SEVERITY'
  /** FATAL — a blocking criterion would be removed without approver + expiry. */
  | 'OVR-BLOCKING-REMOVED'
  /** FATAL — a blocking rule's severity would be lowered without an approver. */
  | 'OVR-UNAPPROVED-DOWNGRADE';

export interface OverrideIssue {
  readonly code: OverrideIssueCode;
  readonly ruleId: string;
  readonly message: string;
  readonly source: string;
}

/**
 * The codes that must fail the run. The others describe an override that
 * changed NOTHING — the run is at least as strict as the corpus — so they are
 * reported, not fatal.
 */
export const FATAL_OVERRIDE_CODES: ReadonlySet<OverrideIssueCode> = new Set<OverrideIssueCode>([
  'OVR-BLOCKING-REMOVED',
  'OVR-UNAPPROVED-DOWNGRADE',
]);

/** What a run reports about its overrides. Present and empty for a clean run. */
export interface OverridesReport {
  readonly applied: OverrideRecord[];
  readonly rejected: OverrideIssue[];
  /** Satellite-relative path of the override document, when one was read. */
  readonly source?: string;
}

/** The zero value: a run that read no override document and applied nothing. */
export function emptyOverridesReport(): OverridesReport {
  return { applied: [], rejected: [] };
}

/** `rule-overrides.schema.json`, parsed and already validated against it. */
export interface RuleOverridesDocument {
  readonly $schema?: string;
  readonly tenantId: string;
  readonly version: string;
  readonly effectiveDate: string;
  readonly approvedBy: string;
  readonly rules: Readonly<Record<string, AuthoredRuleOverride>>;
}

export interface RuleOverridesInput {
  readonly document: RuleOverridesDocument;
  /** Satellite-relative path the document was read from; the `source` of its records. */
  readonly source: string;
}

export interface OverridesOutcome {
  /** The rules to evaluate, in corpus order, with every applied delta on them. */
  readonly rules: NormalizedRule[];
  /** Rules removed before evaluation by an `enabled: false`, for `notApplicable`. */
  readonly disabled: NormalizedRule[];
  readonly applied: OverrideRecord[];
  readonly rejected: OverrideIssue[];
}

/** MUST / MUST NOT outrank SHOULD outranks COULD; a lower rank is a downgrade. */
function rank(severity: NormalizedRule['severity']): number {
  switch (severity) {
    case 'MUST':
    case 'MUST NOT':
      return 3;
    case 'SHOULD':
      return 2;
    default:
      return 1;
  }
}

/**
 * The corpus vocabulary, collapsed exactly as `DiskRulesetRepository`
 * collapses it, so an override and a corpus rule mean the same word the same
 * way. `undefined` for anything the engine cannot represent.
 */
export function normaliseOverrideSeverity(raw: string): NormalizedRule['severity'] | undefined {
  const s = String(raw ?? '').toUpperCase().trim();
  if (s === 'MUST NOT') return 'MUST NOT';
  if (s === 'MUST') return 'MUST';
  if (s === 'SHOULD' || s === 'SHOULD NOT') return 'SHOULD';
  if (s === 'COULD' || s === 'MAY') return 'COULD';
  return undefined;
}

/**
 * Inclusive, UTC: an override that `expiresOn: 2026-09-19` is in force for the
 * whole of that day. An unparseable date is EXPIRED — a waiver whose end nobody
 * can read is not a waiver anyone approved.
 */
export function isOverrideExpired(expiresOn: string, now: Date): boolean {
  const start = Date.parse(expiresOn);
  if (Number.isNaN(start)) return true;
  return now.getTime() >= start + 24 * 60 * 60 * 1000;
}

interface Change {
  readonly field: OverrideField;
  readonly from: string | boolean;
  readonly to: string | boolean;
}

/**
 * Apply every delta to the selected rules.
 *
 * @param rules   the rules this run will evaluate (AFTER `selectRules`).
 * @param overrides the satellite's override document, if `evolith.yaml` named one.
 * @param now     the clock, injected so a test can move it and a cached corpus
 *                never freezes an expiry.
 * @param options `corpus` — the WHOLE corpus, so "unknown rule" is judged
 *                against what the Core carries and not against what this run
 *                selected; a global override document must not produce spurious
 *                `OVR-UNKNOWN-RULE` on a narrowed run.
 */
export function applyRuleOverrides(
  rules: readonly NormalizedRule[],
  overrides: RuleOverridesInput | undefined,
  now: Date,
  options?: { readonly corpus?: readonly NormalizedRule[] },
): OverridesOutcome {
  const applied: OverrideRecord[] = [];
  const rejected: OverrideIssue[] = [];
  const working = new Map<string, NormalizedRule>(rules.map((r) => [r.id, r]));
  const disabled = new Set<string>();

  const applyDelta = (ruleId: string, delta: AuthoredRuleOverride, source: string): void => {
    const current = working.get(ruleId)!;
    const currentlyEnabled = !disabled.has(ruleId);

    if (delta.expiresOn !== undefined && isOverrideExpired(delta.expiresOn, now)) {
      rejected.push({
        code: 'OVR-EXPIRED',
        ruleId,
        source,
        message:
          `The override of ${ruleId} from ${source} expired on ${delta.expiresOn} ` +
          `(evaluated at ${now.toISOString()}); it was ignored and the Core values stand.`,
      });
      return;
    }

    const changes: Change[] = [];
    if (delta.severity !== undefined) {
      const target = normaliseOverrideSeverity(delta.severity);
      if (target === undefined) {
        rejected.push({
          code: 'OVR-INVALID-SEVERITY',
          ruleId,
          source,
          message:
            `The override of ${ruleId} from ${source} sets severity "${delta.severity}", which the engine ` +
            'cannot represent (MUST | SHOULD | COULD | MUST NOT | SHOULD NOT); nothing was changed.',
        });
        return;
      }
      if (target !== current.severity) changes.push({ field: 'severity', from: current.severity, to: target });
    }
    if (delta.blocking !== undefined && delta.blocking !== current.blocking) {
      changes.push({ field: 'blocking', from: current.blocking, to: delta.blocking });
    }
    if (delta.enabled !== undefined && delta.enabled !== currentlyEnabled) {
      changes.push({ field: 'enabled', from: currentlyEnabled, to: delta.enabled });
    }

    if (changes.length === 0) {
      rejected.push({
        code: 'OVR-NOOP',
        ruleId,
        source,
        message:
          `The override of ${ruleId} from ${source} sets no value that differs from the rule's current ` +
          'values; nothing was changed. Remove it, or it will keep being reported.',
      });
      return;
    }

    // THE POLICY. It guards the rule as it currently stands — blocking and
    // enabled — because that is the criterion the corpus (or an earlier delta)
    // put in force; a rule that is already non-blocking has nothing to remove.
    const guarded = current.blocking && currentlyEnabled;
    const removesBlocking =
      guarded &&
      changes.some(
        (c) => (c.field === 'enabled' && c.to === false) || (c.field === 'blocking' && c.to === false),
      );
    if (removesBlocking) {
      const missing = [
        delta.approvedBy ? undefined : 'approvedBy',
        delta.expiresOn ? undefined : 'expiresOn',
      ].filter((m): m is string => m !== undefined);
      if (missing.length > 0) {
        rejected.push({
          code: 'OVR-BLOCKING-REMOVED',
          ruleId,
          source,
          message:
            `The override of ${ruleId} from ${source} would remove a blocking criterion ` +
            `(${changes.map((c) => `${c.field}: ${String(c.from)} -> ${String(c.to)}`).join(', ')}) ` +
            `without ${missing.join(' and ')}. A blocking criterion can be waived — time-boxed and ` +
            'approved — but not removed: add both fields, or leave the rule blocking. The Core values stand.',
        });
        return;
      }
    }

    const downgrades =
      guarded &&
      changes.some(
        (c) =>
          c.field === 'severity' &&
          rank(c.to as NormalizedRule['severity']) < rank(c.from as NormalizedRule['severity']),
      );
    if (downgrades && !delta.approvedBy) {
      rejected.push({
        code: 'OVR-UNAPPROVED-DOWNGRADE',
        ruleId,
        source,
        message:
          `The override of ${ruleId} from ${source} lowers the severity of a blocking rule ` +
          `(${current.severity} -> ${delta.severity}) without an approvedBy. Name the approver, ` +
          'or leave the severity as the Core declares it. The Core values stand.',
      });
      return;
    }

    let next: NormalizedRule = current;
    for (const change of changes) {
      if (change.field === 'severity') {
        next = { ...next, severity: change.to as NormalizedRule['severity'] };
      } else if (change.field === 'blocking') {
        next = { ...next, blocking: change.to as boolean };
      } else if (change.to === true) {
        disabled.delete(ruleId);
      } else {
        disabled.add(ruleId);
      }
      applied.push({
        ruleId,
        field: change.field,
        from: change.from,
        to: change.to,
        ...(delta.approvedBy ? { approvedBy: delta.approvedBy } : {}),
        ...(delta.expiresOn ? { expiresOn: delta.expiresOn } : {}),
        source,
      });
    }
    working.set(ruleId, next);
  };

  // 1. A rule's own file said `enabled: false`. The author's declaration, not an
  //    override of somebody else's rule: no approval to demand, but reported
  //    with its source so a disabled rule is never mistaken for a passing one.
  for (const rule of rules) {
    if (rule.enabled === false) {
      disabled.add(rule.id);
      applied.push({ ruleId: rule.id, field: 'enabled', from: true, to: false, source: rule.sourceFile });
    }
  }

  // 2. A `tenants/**` pack inside the corpus redefined the rule. The loader kept
  //    the Core copy and attached the authored delta; it is applied HERE, with
  //    the clock, under the same policy as a document — a tenant pack is not a
  //    back door around it.
  for (const rule of rules) {
    if (rule.corpusOverride) applyDelta(rule.id, rule.corpusOverride.delta, rule.corpusOverride.source);
  }

  // 3. The satellite's own override document.
  if (overrides) {
    const known = new Set((options?.corpus ?? rules).map((r) => r.id));
    for (const [ruleId, delta] of Object.entries(overrides.document.rules)) {
      if (!known.has(ruleId)) {
        rejected.push({
          code: 'OVR-UNKNOWN-RULE',
          ruleId,
          source: overrides.source,
          message:
            `${overrides.source} overrides ${ruleId}, which this Core's corpus does not carry; ` +
            'nothing was changed (check the id against `evolith rulesets`).',
        });
        continue;
      }
      if (!working.has(ruleId)) {
        rejected.push({
          code: 'OVR-NOT-SELECTED',
          ruleId,
          source: overrides.source,
          message:
            `${overrides.source} overrides ${ruleId}, which this run's selection did not include; ` +
            'nothing was changed.',
        });
        continue;
      }
      applyDelta(ruleId, delta, overrides.source);
    }
  }

  // Corpus order is preserved, and the bookkeeping fields do not travel: what
  // leaves here is the rule AS EVALUATED, with its provenance in `applied`.
  const strip = (rule: NormalizedRule): NormalizedRule => {
    const { enabled: _enabled, corpusOverride: _corpusOverride, ...rest } = rule;
    return rest;
  };
  const active: NormalizedRule[] = [];
  const removed: NormalizedRule[] = [];
  for (const rule of rules) {
    const final = strip(working.get(rule.id)!);
    if (disabled.has(rule.id)) removed.push(final);
    else active.push(final);
  }

  return { rules: active, disabled: removed, applied, rejected };
}
