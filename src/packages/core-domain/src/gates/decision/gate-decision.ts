/**
 * Gate decision model — updated to use canonical Verdict vocabulary (GT-316).
 *
 * The legacy `GateVerdict = 'PASS' | 'FAIL' | 'WAIVED'` type is replaced by
 * the canonical `Verdict` enum from `@beyondnet/evolith-core-domain/verdict`.
 * `fromLegacyGateDecision` provides backward-compatible migration.
 */

import { Verdict, fromLegacyGateDecision } from '../../domain/verdict/verdict';
export type { Verdict };
export { fromLegacyGateDecision };

/**
 * @deprecated Use `Verdict` from `core-domain/verdict` directly.
 * Kept for backward compatibility; will be removed in a future major version.
 */
export type LegacyGateVerdict = 'PASS' | 'FAIL' | 'WAIVED';

/**
 * Core gate verdict value object (GT-376 / ADR-0101).
 *
 * Renamed from `GateDecision` to `CoreGateVerdict` to free the `GateDecision`
 * name for the Tracker's canonical, binding gate decision. The Core EVALUATES
 * and produces this technical verdict; the Tracker DECIDES and persists the
 * canonical GateDecision. `violations` here is `string[]` (codes), distinct from
 * `GateEvidence.violations: GateViolation[]`.
 */
export interface CoreGateVerdict {
  readonly gateId: string;
  readonly phase: number;
  readonly verdict: Verdict;
  readonly score: number;
  readonly violations: string[];
  readonly decidedAt: string;
  readonly decidedBy: string;
  readonly waiverRef?: string;
}

/** @deprecated Renamed to `CoreGateVerdict` (GT-376/ADR-0101). Kept for backward compatibility. */
export type GateDecision = CoreGateVerdict;

export function makeCoreGateVerdict(
  gateId: string,
  phase: number,
  score: number,
  violations: string[],
  decidedBy = 'system',
): CoreGateVerdict {
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

/** @deprecated Renamed to `makeCoreGateVerdict` (GT-376/ADR-0101). */
export const makeGateDecision = makeCoreGateVerdict;

/**
 * Migrate a legacy gate verdict (with 'PASS'|'FAIL'|'WAIVED' verdict string)
 * to one with the canonical `Verdict` enum value. 'WAIVED' → `Verdict.WAIVE`.
 */
export function migrateLegacyGateDecision(
  legacy: Omit<CoreGateVerdict, 'verdict'> & { verdict: LegacyGateVerdict },
): CoreGateVerdict {
  return { ...legacy, verdict: fromLegacyGateDecision(legacy.verdict) };
}
