/**
 * Policy freezing / baseline + ratchet (GT-517 · EAG-12).
 *
 * ONE authoritative fingerprint baseline — NOT two parallel native/enforcer stores.
 * A baseline is the set of {@link Violation.fingerprint}s that were "frozen" at some
 * point in time (accepted debt / waivers). Downstream the CI/PR drift gate consumes
 * this to answer a single question: does this change introduce a NEW violation the
 * baseline does not already cover?
 *
 * Design invariants (all leaning on the GT-511 {@link Violation} model):
 *  - The baseline stores ONLY fingerprints, and {@link Violation.fingerprint} is
 *    computed WITHOUT `message` (see `fingerprintViolation`). A tool upgrade that only
 *    rewords its diagnostics therefore leaves fingerprints — and thus the baseline —
 *    intact (AC2: baseline survives tool upgrades).
 *  - {@link applyBaseline} freezes what the baseline already covers and surfaces only
 *    NEW violations as `fresh` (AC1: existing frozen, only NEW block).
 *  - The baseline may only SHRINK: {@link ratchet} fails when a would-be-frozen
 *    fingerprint is not already covered (AC3: ratchet fails on growth), and
 *    {@link rebase} drops covered fingerprints that have disappeared (ratchet-down).
 *
 * Pure domain logic: no fs, no process, no clock (an optional `createdAt` is caller-
 * supplied). Named exports + readonly interfaces, matching `violation.ts`.
 */

import type { Violation } from '../../../evaluation/violation';

/** Current schema version of a persisted {@link PolicyBaseline}. */
export const POLICY_BASELINE_VERSION = '1';

/**
 * The SINGLE authoritative baseline: a sorted, de-duplicated set of frozen
 * {@link Violation.fingerprint}s. There is exactly one of these — the fingerprint
 * space already unifies native and enforcer violations (GT-511), so a second store
 * would only be able to drift apart from this one.
 */
export interface PolicyBaseline {
  /** Schema version of this baseline document. */
  readonly version: string;
  /** Sorted, unique frozen fingerprints. */
  readonly frozen: readonly string[];
  /** Optional caller-supplied creation timestamp (ISO-8601); the store never reads a clock. */
  readonly createdAt?: string;
}

/** Enforcement posture for a rule/run: `warn` never blocks, `block` gates on fresh errors. */
export type EnforceMode = 'warn' | 'block';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Sorted, de-duplicated copy of a fingerprint list — the canonical `frozen` shape. */
function sortedUnique(fingerprints: Iterable<string>): string[] {
  return [...new Set(fingerprints)].sort();
}

/** Fingerprints of a violation set (already excludes `message` by construction). */
function fingerprintsOf(violations: readonly Violation[]): string[] {
  return violations.map((v) => v.fingerprint);
}

// ---------------------------------------------------------------------------
// Freeze
// ---------------------------------------------------------------------------

/**
 * Capture the current violations' fingerprints as a frozen baseline (de-duplicated,
 * sorted). This is the "accept current debt" operation.
 */
export function freezeViolations(
  violations: readonly Violation[],
  opts: { readonly createdAt?: string } = {},
): PolicyBaseline {
  return {
    version: POLICY_BASELINE_VERSION,
    frozen: sortedUnique(fingerprintsOf(violations)),
    ...(opts.createdAt !== undefined ? { createdAt: opts.createdAt } : {}),
  };
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

/**
 * Partition violations against a baseline. A violation whose fingerprint ∈ baseline is
 * returned in `frozen` with `frozen: true` set; otherwise it is a NEW violation and
 * goes in `fresh` (AC1). Ordering within each bucket follows input order.
 */
export function applyBaseline(
  violations: readonly Violation[],
  baseline: PolicyBaseline,
): { frozen: Violation[]; fresh: Violation[] } {
  const covered = new Set(baseline.frozen);
  const frozen: Violation[] = [];
  const fresh: Violation[] = [];
  for (const v of violations) {
    if (covered.has(v.fingerprint)) {
      frozen.push(v.frozen ? v : { ...v, frozen: true });
    } else {
      fresh.push(v.frozen ? { ...v, frozen: false } : v);
    }
  }
  return { frozen, fresh };
}

// ---------------------------------------------------------------------------
// Ratchet (baseline may only shrink)
// ---------------------------------------------------------------------------

/**
 * Verify the ratchet invariant: the set of currently-present fingerprints may only be
 * a SUBSET of the baseline. Any current fingerprint NOT already covered by the baseline
 * is baseline growth and fails the ratchet (AC3).
 *
 *  - `grew`   — current fingerprints absent from the baseline (would enlarge it). Non-empty ⇒ `ok:false`.
 *  - `shrank` — baseline fingerprints no longer present (candidates for {@link rebase} to drop).
 */
export function ratchet(
  baseline: PolicyBaseline,
  currentViolations: readonly Violation[],
): { ok: boolean; grew: string[]; shrank: string[] } {
  const covered = new Set(baseline.frozen);
  const current = new Set(fingerprintsOf(currentViolations));

  const grew = sortedUnique([...current].filter((fp) => !covered.has(fp)));
  const shrank = sortedUnique([...covered].filter((fp) => !current.has(fp)));

  return { ok: grew.length === 0, grew, shrank };
}

// ---------------------------------------------------------------------------
// Rebase (ratchet-down)
// ---------------------------------------------------------------------------

/**
 * Fingerprint-stable rebase: keep every baseline fingerprint still present in
 * `currentViolations` and DROP those that have disappeared (ratchet-down). Never adds
 * fingerprints — a rebase can only shrink or preserve the baseline.
 *
 * Because fingerprints exclude `message`, a tool upgrade that merely rewords a
 * diagnostic re-reports the SAME fingerprint, so the matching baseline entry is kept
 * and the violation stays frozen (AC2).
 */
export function rebase(
  baseline: PolicyBaseline,
  currentViolations: readonly Violation[],
  opts: { readonly createdAt?: string } = {},
): PolicyBaseline {
  const present = new Set(fingerprintsOf(currentViolations));
  const kept = baseline.frozen.filter((fp) => present.has(fp));
  const createdAt = opts.createdAt !== undefined ? opts.createdAt : baseline.createdAt;
  return {
    version: POLICY_BASELINE_VERSION,
    frozen: sortedUnique(kept),
    ...(createdAt !== undefined ? { createdAt } : {}),
  };
}

// ---------------------------------------------------------------------------
// Decide (warn vs block)
// ---------------------------------------------------------------------------

/**
 * Gate decision over the `fresh` (non-frozen, NEW) violations from {@link applyBaseline}.
 * In `block` mode any non-frozen `error`-severity fresh violation blocks; in `warn`
 * mode nothing blocks. `count` is the number of fresh error-severity violations that
 * would block under `block` mode (reported in both modes for observability).
 *
 * Per-rule `warn|block` is modeled via `mode` for now: route the rule's fresh
 * violations through the mode that rule declares.
 */
export function decide(
  fresh: readonly Violation[],
  mode: EnforceMode,
): { blocking: boolean; count: number } {
  const count = fresh.filter((v) => v.severity === 'error' && !v.frozen).length;
  return { blocking: mode === 'block' && count > 0, count };
}
