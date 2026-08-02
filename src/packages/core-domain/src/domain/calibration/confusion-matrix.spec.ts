import {
  buildCalibrationReport,
  MIN_BLOCKS_FOR_REPORTABLE_RATE,
} from './calibration-report';
import {
  buildConfusionMatrix,
  cohensKappa,
  falseBlockRate,
  humanAgreement,
  precision,
  recall,
  wilsonInterval,
  type CalibrationLabel,
} from './confusion-matrix';

/**
 * GT-585 — the arithmetic is checked against WORKED EXAMPLES with published answers, not against
 * itself. A calibration module whose tests only assert that it agrees with its own implementation
 * would be exactly the kind of unfalsifiable measurement this row exists to replace.
 */

const label = (over: Partial<CalibrationLabel> = {}): CalibrationLabel => ({
  subject: 's',
  rulesetId: 'r',
  gateBlocked: true,
  humanBlocked: true,
  ...over,
});

describe('confusion matrix', () => {
  it('puts BLOCK in the positive class, so a false positive IS a false block', () => {
    const m = buildConfusionMatrix([
      label({ gateBlocked: true, humanBlocked: true }),
      label({ gateBlocked: true, humanBlocked: false }),
      label({ gateBlocked: false, humanBlocked: true }),
      label({ gateBlocked: false, humanBlocked: false }),
    ]);
    expect(m).toEqual({ truePositive: 1, falsePositive: 1, falseNegative: 1, trueNegative: 1, total: 4 });
    // The gate blocked twice and was overridden once.
    expect(falseBlockRate(m).value).toBe(0.5);
  });

  it('divides the false-block rate by BLOCKS, not by every decision', () => {
    // A gate that blocks almost nothing must not earn a flattering rate by doing nothing.
    const lazy = buildConfusionMatrix([
      label({ gateBlocked: true, humanBlocked: false }),
      ...Array.from({ length: 99 }, () => label({ gateBlocked: false, humanBlocked: false })),
    ]);
    expect(falseBlockRate(lazy).value).toBe(1);
    expect(falseBlockRate(lazy).denominator).toBe(1);
  });
});

describe("Cohen's kappa", () => {
  it('reproduces the textbook 2x2 worked example (kappa = 0.4)', () => {
    // a=20 b=5 / c=10 d=15, n=50. Observed 0.7, expected 0.5.
    const m = { truePositive: 20, falsePositive: 5, falseNegative: 10, trueNegative: 15, total: 50 };
    expect(cohensKappa(m)).toBeCloseTo(0.4, 12);
  });

  it('scores a gate that blocks nothing at ZERO, not at its raw agreement', () => {
    // 95 of 100 changes should pass; the gate blocks none. Raw agreement is 95%.
    const labels = [
      ...Array.from({ length: 95 }, () => label({ gateBlocked: false, humanBlocked: false })),
      ...Array.from({ length: 5 }, () => label({ gateBlocked: false, humanBlocked: true })),
    ];
    const m = buildConfusionMatrix(labels);
    expect((m.truePositive + m.trueNegative) / m.total).toBe(0.95);
    // ...and kappa is EXACTLY zero. Chance agreement here is also 0.95, so subtracting it leaves
    // nothing. A report quoting the 95% would be describing a gate that never blocks as excellent.
    expect(cohensKappa(m)).toBe(0);
  });

  it('is null, never 1, when the sample cannot support it', () => {
    const unanimous = buildConfusionMatrix([
      label({ gateBlocked: true, humanBlocked: true }),
      label({ gateBlocked: true, humanBlocked: true }),
    ]);
    expect(cohensKappa(unanimous)).toBeNull();
    expect(cohensKappa({ truePositive: 0, falsePositive: 0, falseNegative: 0, trueNegative: 0, total: 0 })).toBeNull();
  });
});

describe('Wilson interval', () => {
  it('reproduces the published 0/10 interval — and refuses to claim certainty from no evidence', () => {
    const w = wilsonInterval(0, 10);
    expect(w.value).toBe(0);
    expect(w.lower).toBe(0);
    // The normal approximation would give [0, 0], asserting certainty from no evidence. Wilson
    // gives ~0.2775 — with ten clean observations the true rate could still be one in four.
    expect(w.upper).toBeCloseTo(0.2775, 4);
  });

  it('narrows as evidence accumulates, at a constant point estimate', () => {
    const few = wilsonInterval(1, 10);
    const many = wilsonInterval(100, 1000);
    expect(few.value).toBeCloseTo(many.value as number, 12);
    const widthFew = (few.upper as number) - (few.lower as number);
    const widthMany = (many.upper as number) - (many.lower as number);
    expect(widthMany).toBeLessThan(widthFew / 3);
  });

  it('never leaves [0,1] and returns null on a zero denominator', () => {
    const all = wilsonInterval(10, 10);
    expect(all.upper).toBeLessThanOrEqual(1);
    expect(all.lower).toBeGreaterThanOrEqual(0);
    expect(wilsonInterval(0, 0)).toEqual({ value: null, lower: null, upper: null, denominator: 0 });
  });
});

describe('human agreement ceiling', () => {
  it('is null when no label carries a second rater — not zero', () => {
    expect(humanAgreement([label(), label()])).toBeNull();
  });

  it('measures the two humans against each other, not either against the gate', () => {
    // The gate is deliberately wrong on every row; the two humans agree perfectly.
    const labels = [
      label({ gateBlocked: false, humanBlocked: true, secondHumanBlocked: true }),
      label({ gateBlocked: true, humanBlocked: false, secondHumanBlocked: false }),
      label({ gateBlocked: false, humanBlocked: true, secondHumanBlocked: true }),
      label({ gateBlocked: true, humanBlocked: false, secondHumanBlocked: false }),
    ];
    expect(humanAgreement(labels)).toBeCloseTo(1, 12);
  });
});

describe('report', () => {
  it('refuses to call a thin sample reportable, and says what is missing', () => {
    const r = buildCalibrationReport([
      label({ rulesetId: 'a', gateBlocked: true, humanBlocked: false }),
      label({ rulesetId: 'a', gateBlocked: true, humanBlocked: true }),
    ]);
    const a = r.perRuleset.find((x) => x.rulesetId === 'a');
    expect(a?.reportable).toBe(false);
    expect(a?.notReportableBecause).toContain(String(MIN_BLOCKS_FOR_REPORTABLE_RATE));
    // The interval is still computed — refusing to headline is not refusing to measure.
    expect(a?.falseBlockRate.value).toBe(0.5);
    expect(a?.falseBlockRate.upper).toBeGreaterThan(0.5);
  });

  it('becomes reportable once enough blocks are adjudicated', () => {
    const labels = Array.from({ length: MIN_BLOCKS_FOR_REPORTABLE_RATE }, (_, i) =>
      label({ rulesetId: 'a', gateBlocked: true, humanBlocked: i > 0 }),
    );
    const a = buildCalibrationReport(labels).perRuleset[0];
    expect(a.reportable).toBe(true);
    expect(a.notReportableBecause).toBeUndefined();
  });

  it('reports zero labels as undefined, and says so instead of printing zeros', () => {
    const r = buildCalibrationReport([]);
    expect(r.labelCount).toBe(0);
    expect(r.overall.falseBlockRate.value).toBeNull();
    expect(r.overall.kappa).toBeNull();
    expect(r.caveats.join(' ')).toContain('none of them is zero');
  });

  it('keeps per-ruleset figures separate, because pooling hides the rule that is wrong', () => {
    const labels = [
      // `noisy` blocks and is overridden every time; `clean` is always right.
      ...Array.from({ length: 10 }, () => label({ rulesetId: 'noisy', gateBlocked: true, humanBlocked: false })),
      ...Array.from({ length: 10 }, () => label({ rulesetId: 'clean', gateBlocked: true, humanBlocked: true })),
    ];
    const r = buildCalibrationReport(labels);
    const noisy = r.perRuleset.find((x) => x.rulesetId === 'noisy');
    const clean = r.perRuleset.find((x) => x.rulesetId === 'clean');
    expect(noisy?.falseBlockRate.value).toBe(1);
    expect(clean?.falseBlockRate.value).toBe(0);
    // Pooled it reads as a tidy 50%, which is true of nothing anybody uses.
    expect(r.overall.falseBlockRate.value).toBe(0.5);
    expect(precision(noisy!.matrix).value).toBe(0);
    expect(recall(clean!.matrix).value).toBe(1);
  });

  it('warns when there is no agreement ceiling to interpret kappa against', () => {
    const r = buildCalibrationReport([label()]);
    expect(r.humanAgreementCeiling).toBeNull();
    expect(r.caveats.join(' ')).toContain('agreement ceiling');
  });
});
