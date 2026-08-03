/**
 * GT-585 — the instrument for measuring how often a gate is WRONG.
 *
 * WHY THIS EXISTS BEFORE THE DATA DOES. 167 rulesets and 45 policies decide `blocking`, and not one
 * of them has ever been measured: the whole calibration vocabulary — confusion matrix, TPR/TNR,
 * Cohen's κ, false-block rate — appeared zero times across `src` and `.harness`. The organic label
 * corpus (a human overriding a gate decision, recorded by the Tracker) cannot exist until something
 * runs in production, which is `GT-435`/`GT-448`. Building the instrument now is the difference
 * between a figure that is DERIVABLE the moment labels exist and one that is retrofitted afterwards
 * by whoever needs the number to look good.
 *
 * WHAT A "POSITIVE" IS HERE, because getting this backwards inverts every figure below. The
 * positive class is **BLOCK**: the gate asserting that a change must not proceed.
 *
 *   - True positive  — the gate blocked and a human agreed it should have.
 *   - False positive — the gate blocked and a human overrode it. **This is a false block**, the
 *                      figure this row exists to publish, and the one that erodes trust in the
 *                      gate fastest: every false block teaches somebody to route around it.
 *   - False negative — the gate allowed a change a human judged should have been blocked.
 *   - True negative  — both agreed it should pass.
 *
 * Pure arithmetic, no I/O, no clock. Every function here is total: it returns a value for any
 * counts, including degenerate ones, and says in its own result when that value means nothing.
 */

/** One adjudicated decision: what the gate said, and what a human said. */
export interface CalibrationLabel {
  /** Opaque id of the thing judged — a diff, a PR, an evaluation. Never interpreted here. */
  readonly subject: string;
  /** The ruleset whose verdict is being judged. Figures are reported per ruleset. */
  readonly rulesetId: string;
  /** What the gate decided. */
  readonly gateBlocked: boolean;
  /** What the human decided it should have been. */
  readonly humanBlocked: boolean;
  /** Optional second human, for the agreement ceiling. See `humanAgreement`. */
  readonly secondHumanBlocked?: boolean;
}

export interface ConfusionMatrix {
  /** Gate blocked, human agreed. */
  readonly truePositive: number;
  /** Gate blocked, human overrode — a FALSE BLOCK. */
  readonly falsePositive: number;
  /** Gate allowed, human would have blocked. */
  readonly falseNegative: number;
  /** Gate allowed, human agreed. */
  readonly trueNegative: number;
  readonly total: number;
}

/**
 * A rate with its uncertainty. The interval is NOT decoration: a false-block rate of 0 over 4
 * labels and one over 400 are the same point estimate and completely different claims, and only
 * the interval distinguishes them. Nothing in this module returns a bare point estimate.
 */
export interface RateWithInterval {
  /** Point estimate in [0,1], or `null` when the denominator is zero. */
  readonly value: number | null;
  /** Wilson score interval, 95%. `null` when undefined. */
  readonly lower: number | null;
  readonly upper: number | null;
  /** How many observations the rate is computed over. Always reported. */
  readonly denominator: number;
}

export function buildConfusionMatrix(labels: readonly CalibrationLabel[]): ConfusionMatrix {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const l of labels) {
    if (l.gateBlocked && l.humanBlocked) tp += 1;
    else if (l.gateBlocked && !l.humanBlocked) fp += 1;
    else if (!l.gateBlocked && l.humanBlocked) fn += 1;
    else tn += 1;
  }
  return { truePositive: tp, falsePositive: fp, falseNegative: fn, trueNegative: tn, total: labels.length };
}

/**
 * Wilson score interval at 95%.
 *
 * Chosen over the textbook normal approximation on purpose, and the reason is exactly the case this
 * row will hit first: with `successes = 0` the normal interval collapses to [0, 0] — it claims
 * certainty from no evidence, which is the single most misleading thing a calibration report could
 * print. Wilson stays wide when the sample is small and never leaves [0,1].
 */
export function wilsonInterval(successes: number, trials: number, z = 1.959963984540054): RateWithInterval {
  if (!Number.isFinite(trials) || trials <= 0) {
    return { value: null, lower: null, upper: null, denominator: 0 };
  }
  const p = successes / trials;
  const z2 = z * z;
  const denom = 1 + z2 / trials;
  const centre = (p + z2 / (2 * trials)) / denom;
  const spread = (z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / denom;
  return {
    value: p,
    lower: Math.max(0, centre - spread),
    upper: Math.min(1, centre + spread),
    denominator: trials,
  };
}

/**
 * The false-block rate: of everything the gate blocked, how much should have passed.
 *
 * Denominator is the gate's blocks, not all decisions. Dividing by every decision would let a gate
 * that blocks almost nothing report a flattering figure by doing nothing, which is precisely the
 * behaviour a published rate should not reward.
 */
export function falseBlockRate(m: ConfusionMatrix): RateWithInterval {
  return wilsonInterval(m.falsePositive, m.truePositive + m.falsePositive);
}

/** Of everything the gate blocked, how much it was right to block. */
export function precision(m: ConfusionMatrix): RateWithInterval {
  return wilsonInterval(m.truePositive, m.truePositive + m.falsePositive);
}

/** Of everything that should have been blocked, how much the gate caught. */
export function recall(m: ConfusionMatrix): RateWithInterval {
  return wilsonInterval(m.truePositive, m.truePositive + m.falseNegative);
}

/** Of everything that should have passed, how much the gate let pass. */
export function specificity(m: ConfusionMatrix): RateWithInterval {
  return wilsonInterval(m.trueNegative, m.trueNegative + m.falsePositive);
}

/**
 * Cohen's κ between the gate and the human.
 *
 * Raw agreement is not enough and the reason is concrete: if 95% of changes should pass and the
 * gate blocks nothing, it agrees with the human 95% of the time while being useless. κ subtracts
 * the agreement expected by chance, so that gate scores 0.
 *
 * Returns `null` when κ is undefined — both raters unanimous on one class, where expected agreement
 * is 1 and the formula divides by zero. That is not a κ of 1: it is a sample that cannot support
 * the statistic, and saying `null` is the only honest answer.
 */
export function cohensKappa(m: ConfusionMatrix): number | null {
  const n = m.total;
  if (n === 0) return null;

  const observed = (m.truePositive + m.trueNegative) / n;

  const gateBlocks = (m.truePositive + m.falsePositive) / n;
  const humanBlocks = (m.truePositive + m.falseNegative) / n;
  const expected = gateBlocks * humanBlocks + (1 - gateBlocks) * (1 - humanBlocks);

  if (expected >= 1) return null;
  return (observed - expected) / (1 - expected);
}

/**
 * The human-to-human agreement CEILING, from labels carrying a second rater.
 *
 * Without it a κ is uninterpretable. If two humans only agree κ=0.6 on what should block, a gate
 * at κ=0.55 is close to the limit of the task rather than poor — and a gate reported at κ=0.9
 * against a ceiling of 0.6 is not excellent, it is evidence the labels are being copied from the
 * gate's own output.
 *
 * Returns `null` when no label carries a second rater, which is the state this repository is in
 * today and must not be mistaken for a ceiling of zero.
 */
export function humanAgreement(labels: readonly CalibrationLabel[]): number | null {
  const doubly = labels.filter((l) => l.secondHumanBlocked !== undefined);
  if (doubly.length === 0) return null;
  return cohensKappa(
    buildConfusionMatrix(
      doubly.map((l) => ({
        ...l,
        gateBlocked: l.humanBlocked,
        humanBlocked: l.secondHumanBlocked as boolean,
      })),
    ),
  );
}
