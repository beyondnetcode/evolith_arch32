/**
 * GT-584 — probabilistic evidence may not reach a blocking verdict unmeasured.
 *
 * ADR-0111 gave `Evidence` a `determinism` field. Nothing ever read it as a
 * CONDITION for blocking, so any heuristic finding was admissible by default and
 * unmeasured. This module is that condition, expressed for the Core's own
 * heuristics rather than only for external providers — because the Core has
 * them too.
 *
 * The concrete case that motivated it lives one file away, in `detectors.ts`.
 * `detectDependencyInversionIssues` decided "this file is the domain layer" from
 * a directory-name regex and "this import is a web framework" from
 * `importPath.includes('express')`, then emitted `severity: 'MUST',
 * blocking: true`. `./value-objects/expression-parser` contains the substring
 * `express`, so a domain file importing its own expression parser blocked a
 * merge with "Domain layer directly imports web framework". No confusion matrix,
 * no TPR, no way to argue afterwards that the model was not at fault — which is
 * exactly the failure GT-584 names.
 *
 * The fix is NOT to delete the heuristic. Heuristics are most of what static
 * analysis is. The fix is that a heuristic must either
 *   (a) declare a measured error rate that clears the policy, or
 *   (b) report as advisory.
 * Both outcomes are visible on the finding, so a reader can always tell which
 * kind of evidence they are looking at.
 *
 * The thresholds below are POLICY, not truth: they are declared, overridable,
 * and awaiting the measured rates GT-585 will produce. A declared threshold that
 * can be argued with is the whole difference from today's silent default.
 */

/**
 * Determinism class of a signal. Deliberately the same two words as
 * ADR-0111's `Determinism` on `Evidence`, so a Core heuristic and an external
 * provider are read on one scale. Not imported, to keep `application/` free of a
 * dependency on `evaluation/`.
 */
export type SignalDeterminism = 'deterministic' | 'probabilistic';

/** What a detector declares about its own error rate. */
export interface SignalCalibration {
  readonly determinism: SignalDeterminism;
  /** How the signal is derived, in words a reviewer can judge. */
  readonly method: string;
  /** Measured true-positive rate in [0,1]. Absent ⇒ UNMEASURED, not "fine". */
  readonly truePositiveRate?: number;
  /** Measured true-negative rate in [0,1] — the false-BLOCK side of the matrix. */
  readonly trueNegativeRate?: number;
  /** ISO-8601 date the rates were measured. Absent ⇒ unmeasured. */
  readonly measuredAt?: string;
}

/** The admissibility thresholds (θ₁, θ₂, θ₃ of GT-584). */
export interface AdmissibilityPolicy {
  readonly minTruePositiveRate: number;
  readonly minTrueNegativeRate: number;
  readonly maxCalibrationAgeDays: number;
  /** Injectable clock so staleness is testable. */
  readonly now?: () => Date;
}

export const DEFAULT_ADMISSIBILITY_POLICY: AdmissibilityPolicy = {
  minTruePositiveRate: 0.95,
  minTrueNegativeRate: 0.95,
  maxCalibrationAgeDays: 180,
};

/** Why a signal was, or was not, admitted as blocking. */
export type Admissibility =
  /** Not a guess — blocks on its own. */
  | 'deterministic'
  /** Probabilistic, with a fresh measurement that clears the policy. */
  | 'calibrated'
  /** Probabilistic and never measured. */
  | 'advisory-uncalibrated'
  /** Measured, but below θ₁/θ₂. */
  | 'advisory-below-threshold'
  /** Measured too long ago to still describe the current detector. */
  | 'advisory-stale-calibration';

export interface AdmissibilityDecision {
  /** The blocking flag the finding may actually carry. */
  readonly blocking: boolean;
  readonly determinism: SignalDeterminism;
  readonly admissibility: Admissibility;
  /** The declared true-positive rate, when one exists. */
  readonly confidence?: number;
  /** Set when an intended block was refused, so the demotion is never silent. */
  readonly downgradedFromBlocking: boolean;
  readonly rationale: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function ageInDays(measuredAt: string, now: Date): number | undefined {
  const measured = Date.parse(measuredAt);
  if (Number.isNaN(measured)) return undefined;
  return (now.getTime() - measured) / DAY_MS;
}

/**
 * Decide whether a finding may block, given what its detector declares about
 * itself.
 *
 * A deterministic signal is unaffected. A probabilistic one blocks only while
 * `tpr ≥ θ₁ ∧ tnr ≥ θ₂ ∧ age ≤ θ₃`, and degrades to advisory otherwise — never
 * disappearing, because a suppressed finding is its own kind of dishonesty.
 */
export function admitBlocking(
  intendedBlocking: boolean,
  calibration: SignalCalibration,
  policy: AdmissibilityPolicy = DEFAULT_ADMISSIBILITY_POLICY,
): AdmissibilityDecision {
  const base = { determinism: calibration.determinism, confidence: calibration.truePositiveRate };

  if (calibration.determinism === 'deterministic') {
    return {
      ...base,
      blocking: intendedBlocking,
      admissibility: 'deterministic',
      downgradedFromBlocking: false,
      rationale: `Deterministic signal (${calibration.method}); no error rate is required to block.`,
    };
  }

  const advisory = (admissibility: Admissibility, rationale: string): AdmissibilityDecision => ({
    ...base,
    blocking: false,
    admissibility,
    downgradedFromBlocking: intendedBlocking,
    rationale,
  });

  const { truePositiveRate: tpr, trueNegativeRate: tnr, measuredAt } = calibration;

  if (tpr === undefined || tnr === undefined || !measuredAt) {
    return advisory(
      'advisory-uncalibrated',
      `Probabilistic signal (${calibration.method}) with no measured error rate. ` +
        'It is reported as advisory: a governance verdict must not block on an unmeasured guess (GT-584).',
    );
  }

  if (tpr < policy.minTruePositiveRate || tnr < policy.minTrueNegativeRate) {
    return advisory(
      'advisory-below-threshold',
      `Probabilistic signal (${calibration.method}) measured at TPR ${tpr}, TNR ${tnr} — below the declared ` +
        `admissibility floor (TPR ≥ ${policy.minTruePositiveRate}, TNR ≥ ${policy.minTrueNegativeRate}).`,
    );
  }

  const age = ageInDays(measuredAt, policy.now?.() ?? new Date());
  if (age === undefined || age > policy.maxCalibrationAgeDays) {
    return advisory(
      'advisory-stale-calibration',
      `Probabilistic signal (${calibration.method}) whose calibration (${measuredAt}) is ` +
        `${age === undefined ? 'unparseable' : `${Math.round(age)} days old`}, beyond the ` +
        `${policy.maxCalibrationAgeDays}-day limit. A measurement of an older detector is not a measurement of this one.`,
    );
  }

  return {
    ...base,
    blocking: intendedBlocking,
    admissibility: 'calibrated',
    downgradedFromBlocking: false,
    rationale:
      `Probabilistic signal (${calibration.method}) admitted: TPR ${tpr} ≥ ${policy.minTruePositiveRate}, ` +
      `TNR ${tnr} ≥ ${policy.minTrueNegativeRate}, measured ${measuredAt}.`,
  };
}
