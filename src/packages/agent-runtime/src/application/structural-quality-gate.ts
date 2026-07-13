/**
 * Structural Quality Gate (GT-535 · ADR-0111) — the rubric hook that lets a
 * structural regression be treated as BLOCKING.
 *
 * The findings are probabilistic (LLM-derived), but the gate mapping
 * severity → decision is PURE and DETERMINISTIC: the same evidence always yields the
 * same gate result. A policy declares two thresholds on the canonical severity
 * hierarchy — at/above `blockAtOrAbove` blocks, at/above `warnAtOrAbove` (but below
 * block) warns, everything else passes. The default policy makes a `critical`
 * structural regression blocking.
 *
 * This is the deterministic seam a Quality Gate/policy engine calls: it reads
 * canonical {@link Evidence} (as emitted by {@link StructuralReviewProvider}) — it
 * does NOT run any provider or model itself.
 */

import type {
  Evidence,
  EvidenceFinding,
  EvidenceFindingSeverity,
} from '@beyondnet/evolith-core-domain/evaluation/contracts';

import { compareSeverity, STRUCTURAL_SEVERITY_RANK } from '../domain/rubrics/structural-review-rubric';

/** The gate outcome. `block` is the only regression-blocking verdict. */
export type GateDecision = 'block' | 'warn' | 'pass';

/** Deterministic severity → decision policy (the rubric hook's configuration). */
export interface StructuralGatePolicy {
  /** A finding at/above this severity BLOCKS. */
  readonly blockAtOrAbove: EvidenceFindingSeverity;
  /** A finding at/above this severity (but below block) WARNS. */
  readonly warnAtOrAbove: EvidenceFindingSeverity;
}

/**
 * Default policy: a `critical` OR `high` structural regression blocks; `medium`
 * warns; `low`/`info` pass. Chosen so boundary/layering and spaghetti breaks (the
 * rubric's `critical`/`high` defaults) are blocking out of the box.
 */
export const DEFAULT_STRUCTURAL_GATE_POLICY: StructuralGatePolicy = {
  blockAtOrAbove: 'high',
  warnAtOrAbove: 'medium',
};

/** The gate's result — deterministic and fully explained for audit. */
export interface StructuralGateResult {
  readonly decision: GateDecision;
  /** Whether the decision blocks a merge/promotion. */
  readonly blocking: boolean;
  /** The peak severity observed across the evidence (undefined when no findings). */
  readonly peakSeverity?: EvidenceFindingSeverity;
  /** The findings at/above the decision's severity floor (empty on `pass`). */
  readonly triggeringFindings: readonly EvidenceFinding[];
  /** The policy that produced the decision. */
  readonly policy: StructuralGatePolicy;
}

/** Map a single severity to a decision under a policy (the pure core mapping). */
export function decideForSeverity(
  severity: EvidenceFindingSeverity,
  policy: StructuralGatePolicy = DEFAULT_STRUCTURAL_GATE_POLICY,
): GateDecision {
  if (compareSeverity(severity, policy.blockAtOrAbove) >= 0) return 'block';
  if (compareSeverity(severity, policy.warnAtOrAbove) >= 0) return 'warn';
  return 'pass';
}

/**
 * Evaluate the structural quality gate over the code-quality/structural findings of
 * the supplied Evidence. Deterministic: the peak severity determines the decision,
 * and the triggering findings are those at/above that decision's severity floor.
 *
 * Only findings whose `code` is a structural-review finding are considered when
 * `source`-scoping is desired; by default this reads every finding of the passed
 * evidence, since the caller is expected to pass the structural evidence.
 */
export function evaluateStructuralGate(
  evidence: readonly Evidence[],
  policy: StructuralGatePolicy = DEFAULT_STRUCTURAL_GATE_POLICY,
): StructuralGateResult {
  const findings = evidence.flatMap((e) => e.findings);

  if (findings.length === 0) {
    return { decision: 'pass', blocking: false, triggeringFindings: [], policy };
  }

  const peakSeverity = findings.reduce<EvidenceFindingSeverity>(
    (peak, f) => (compareSeverity(f.severity, peak) > 0 ? f.severity : peak),
    'info',
  );

  const decision = decideForSeverity(peakSeverity, policy);

  // The severity floor of the decision: what counts as "triggering" this verdict.
  const floor: EvidenceFindingSeverity | undefined =
    decision === 'block' ? policy.blockAtOrAbove : decision === 'warn' ? policy.warnAtOrAbove : undefined;

  const triggeringFindings =
    floor === undefined ? [] : findings.filter((f) => compareSeverity(f.severity, floor) >= 0);

  return {
    decision,
    blocking: decision === 'block',
    peakSeverity,
    triggeringFindings,
    policy,
  };
}

/** Re-exported for callers that want the raw ranking table. */
export { STRUCTURAL_SEVERITY_RANK };
