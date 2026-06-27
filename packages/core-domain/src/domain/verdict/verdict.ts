/**
 * Canonical verdict vocabulary for Evolith Core (GT-316).
 *
 * This is the single source of truth for all gate/phase/artifact verdicts.
 * Legacy surfaces (gate-evidence: 'passed'|'failed'|'skipped', gate-decision:
 * 'PASS'|'FAIL'|'WAIVED') must migrate to this vocabulary or use the provided
 * migration helpers for backward compatibility.
 */

// ---------------------------------------------------------------------------
// Canonical Verdict enum
// ---------------------------------------------------------------------------

export enum Verdict {
  /** Evaluation succeeded — all required criteria met. */
  PASS = 'PASS',
  /** Evaluation failed — one or more blocking violations found. */
  FAIL = 'FAIL',
  /** Evaluation was explicitly waived by an authorised party. */
  WAIVE = 'WAIVE',
  /** Evaluation was intentionally skipped (not applicable). */
  SKIP = 'SKIP',
}

export const VERDICT_VALUES = Object.values(Verdict) as Verdict[];

export function isVerdict(value: string): value is Verdict {
  return VERDICT_VALUES.includes(value as Verdict);
}

// ---------------------------------------------------------------------------
// VerdictReason — structured rationale attached to a verdict
// ---------------------------------------------------------------------------

export interface VerdictReason {
  /** Machine-readable reason code (e.g. 'SCORE_BELOW_THRESHOLD'). */
  readonly code: string;
  /** Human-readable explanation. */
  readonly message: string;
}

// ---------------------------------------------------------------------------
// VerdictRecord — stamped, authoritative verdict record
// ---------------------------------------------------------------------------

export interface VerdictRecord {
  readonly verdict: Verdict;
  readonly reason?: VerdictReason;
  /** ISO-8601 UTC timestamp. */
  readonly decidedAt: string;
  /** Identifier of the agent/user/system that decided. */
  readonly decidedBy?: string;
}

// ---------------------------------------------------------------------------
// Migration helpers — backward compatibility with legacy surfaces
// ---------------------------------------------------------------------------

/**
 * Convert a legacy gate-evidence verdict string to the canonical Verdict enum.
 * Used when reading data produced before GT-316.
 */
export function fromLegacyGateEvidence(
  v: 'passed' | 'failed' | 'skipped',
): Verdict {
  switch (v) {
    case 'passed':  return Verdict.PASS;
    case 'failed':  return Verdict.FAIL;
    case 'skipped': return Verdict.SKIP;
  }
}

/**
 * Convert a legacy gate-decision verdict string to the canonical Verdict enum.
 * Used when reading GateDecision records produced before GT-316.
 */
export function fromLegacyGateDecision(
  v: 'PASS' | 'FAIL' | 'WAIVED',
): Verdict {
  switch (v) {
    case 'PASS':   return Verdict.PASS;
    case 'FAIL':   return Verdict.FAIL;
    case 'WAIVED': return Verdict.WAIVE;
  }
}

/**
 * Convert a canonical Verdict back to the legacy gate-evidence vocabulary.
 * WAIVE maps to 'skipped' (closest legacy equivalent).
 */
export function toLegacyGateEvidence(
  v: Verdict,
): 'passed' | 'failed' | 'skipped' {
  switch (v) {
    case Verdict.PASS:  return 'passed';
    case Verdict.FAIL:  return 'failed';
    case Verdict.WAIVE: return 'skipped';
    case Verdict.SKIP:  return 'skipped';
  }
}

/**
 * Build a VerdictRecord from discrete fields.
 */
export function makeVerdictRecord(
  verdict: Verdict,
  decidedBy?: string,
  reason?: VerdictReason,
): VerdictRecord {
  return {
    verdict,
    reason,
    decidedAt: new Date().toISOString(),
    decidedBy,
  };
}
