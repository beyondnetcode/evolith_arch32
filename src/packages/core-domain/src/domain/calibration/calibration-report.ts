import {
  buildConfusionMatrix,
  cohensKappa,
  falseBlockRate,
  humanAgreement,
  precision,
  recall,
  specificity,
  type CalibrationLabel,
  type ConfusionMatrix,
  type RateWithInterval,
} from './confusion-matrix';

/**
 * GT-585 — assembling the per-ruleset report, and refusing to publish a figure the sample cannot
 * support.
 *
 * The claim this row exists to make is *"our gates have a published false-block rate, per rule"*.
 * The fastest way to destroy that claim is to publish one derived from nine labels, have somebody
 * quote it, and be unable to defend it. So every figure here travels with its denominator and its
 * interval, and a report says out loud when it is too thin to quote.
 */

/**
 * Below this many adjudicated blocks, a false-block rate is not reportable.
 *
 * 30 is the conventional threshold at which the normal approximation is usually considered usable;
 * it is used here NOT because the interval needs it — Wilson is valid at any n — but as the line
 * under which a point estimate should not be quoted in prose at all. The interval is always
 * computed and always published; what this gates is the `reportable` flag, so a reader can tell a
 * measured rate from an anecdote without doing the arithmetic themselves.
 */
export const MIN_BLOCKS_FOR_REPORTABLE_RATE = 30;

export interface RulesetCalibration {
  readonly rulesetId: string;
  readonly matrix: ConfusionMatrix;
  readonly falseBlockRate: RateWithInterval;
  readonly precision: RateWithInterval;
  readonly recall: RateWithInterval;
  readonly specificity: RateWithInterval;
  /** `null` when undefined — see `cohensKappa`. Never silently coerced to 0 or 1. */
  readonly kappa: number | null;
  /**
   * Whether the false-block rate may be quoted as a figure. False does NOT mean the numbers are
   * wrong; it means the sample cannot carry a headline.
   */
  readonly reportable: boolean;
  /** Present when `reportable` is false, saying what is missing rather than just refusing. */
  readonly notReportableBecause?: string;
}

export interface CalibrationReport {
  readonly labelCount: number;
  readonly rulesetCount: number;
  /**
   * κ between two humans, from labels carrying a second rater. `null` when no label has one.
   *
   * A gate κ is uninterpretable without it: against a human ceiling of 0.6, a gate at 0.55 is near
   * the limit of the task, and a gate at 0.9 is evidence the labels were copied from the gate.
   */
  readonly humanAgreementCeiling: number | null;
  readonly perRuleset: readonly RulesetCalibration[];
  /** Every ruleset pooled. Useful as a headline, dangerous alone — it hides per-rule variance. */
  readonly overall: RulesetCalibration;
  /** Ordered, human-readable reasons the report should be read with care. */
  readonly caveats: readonly string[];
}

function calibrateOne(rulesetId: string, labels: readonly CalibrationLabel[]): RulesetCalibration {
  const matrix = buildConfusionMatrix(labels);
  const blocks = matrix.truePositive + matrix.falsePositive;
  const reportable = blocks >= MIN_BLOCKS_FOR_REPORTABLE_RATE;
  return {
    rulesetId,
    matrix,
    falseBlockRate: falseBlockRate(matrix),
    precision: precision(matrix),
    recall: recall(matrix),
    specificity: specificity(matrix),
    kappa: cohensKappa(matrix),
    reportable,
    ...(reportable
      ? {}
      : {
          notReportableBecause:
            `${blocks} adjudicated block(s); a quotable false-block rate needs at least ` +
            `${MIN_BLOCKS_FOR_REPORTABLE_RATE}. The interval below is still valid — read it, ` +
            `not the point estimate.`,
        }),
  };
}

export function buildCalibrationReport(labels: readonly CalibrationLabel[]): CalibrationReport {
  const byRuleset = new Map<string, CalibrationLabel[]>();
  for (const l of labels) {
    const bucket = byRuleset.get(l.rulesetId);
    if (bucket) bucket.push(l);
    else byRuleset.set(l.rulesetId, [l]);
  }

  const perRuleset = [...byRuleset.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, ls]) => calibrateOne(id, ls));

  const ceiling = humanAgreement(labels);
  const caveats: string[] = [];

  if (labels.length === 0) {
    caveats.push('No labels. Every figure below is undefined, and none of them is zero.');
  }
  if (ceiling === null && labels.length > 0) {
    caveats.push(
      'No label carries a second human rater, so there is no agreement ceiling. A gate κ cannot ' +
        'be judged good or bad without one.',
    );
  }
  const thin = perRuleset.filter((r) => !r.reportable);
  if (thin.length > 0) {
    caveats.push(
      `${thin.length} of ${perRuleset.length} ruleset(s) have too few adjudicated blocks for a ` +
        'quotable rate. Their intervals are valid; their point estimates are not headlines.',
    );
  }

  return {
    labelCount: labels.length,
    rulesetCount: perRuleset.length,
    humanAgreementCeiling: ceiling,
    perRuleset,
    overall: calibrateOne('__overall__', labels),
    caveats,
  };
}
