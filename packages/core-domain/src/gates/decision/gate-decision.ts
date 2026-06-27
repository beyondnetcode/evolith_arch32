/**
 * Gate decision model — updated to use canonical Verdict vocabulary (GT-316).
 *
 * The legacy `GateVerdict = 'PASS' | 'FAIL' | 'WAIVED'` type is replaced by
 * the canonical `Verdict` enum from `@evolith/core-domain/verdict`.
 * `fromLegacyGateDecision` provides backward-compatible migration.
 */

import { Verdict, fromLegacyGateDecision, makeVerdictRecord } from '../../domain/verdict/verdict';
export type { Verdict };
export { fromLegacyGateDecision };

/**
 * @deprecated Use `Verdict` from `core-domain/verdict` directly.
 * Kept for backward compatibility; will be removed in a future major version.
 */
export type LegacyGateVerdict = 'PASS' | 'FAIL' | 'WAIVED';

export interface GateDecision {
  readonly gateId: string;
  readonly phase: number;
  readonly verdict: Verdict;
  readonly score: number;
  readonly violations: string[];
  readonly decidedAt: string;
  readonly decidedBy: string;
  readonly waiverRef?: string;
}

export function makeGateDecision(
  gateId: string,
  phase: number,
  score: number,
  violations: string[],
  decidedBy = 'system',
): GateDecision {
  const verdict: Verdict = violations.length === 0 && score >= 80 ? Verdict.PASS : Verdict.FAIL;
  return {
    gateId,
    phase,
    verdict,
    score,
    violations,
    decidedAt: new Date().toISOString(),
    decidedBy,
  };
}

/**
 * Migrate a legacy GateDecision (with 'PASS'|'FAIL'|'WAIVED' verdict string)
 * to one with the canonical `Verdict` enum value.
 */
export function migrateLegacyGateDecision(
  legacy: Omit<GateDecision, 'verdict'> & { verdict: LegacyGateVerdict },
): GateDecision {
  return { ...legacy, verdict: fromLegacyGateDecision(legacy.verdict) };
}
