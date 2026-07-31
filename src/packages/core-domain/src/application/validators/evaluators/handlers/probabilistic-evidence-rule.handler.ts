/**
 * GT-584 · ADR-0111 — the native half of `probabilistic-evidence-admissibility`.
 *
 * R-25 (Dual-Engine Parity) says a rule must exist in BOTH engines. The OPA half is
 * `src/rulesets/opa/probabilistic-evidence-admissibility.rego`; this is its twin,
 * and the two are kept in step by construction rather than by discipline: both read
 * the SAME facts (`input.qualityEvidence` / `ctx.facts.qualityEvidence`, projected
 * once in `evaluation-context.builder.ts`), and this handler decides nothing itself
 * — it delegates to {@link admitBlocking}, the single admissibility function the
 * Core already applies to its own heuristics.
 *
 * What the rules say, in one line each:
 *   PEA-01  probabilistic and never measured        -> advisory, cannot block
 *   PEA-02  measured below theta1/theta2            -> advisory, cannot block
 *   PEA-03  measured too long ago, or unreadably    -> advisory, cannot block
 *   PEA-04  admitted, but won't say how it measured -> reported, still blocks
 *
 * FAIL-CLOSED. Evidence that does not say `determinism: 'deterministic'` is read as
 * a guess — including evidence that says nothing at all. Absent calibration means
 * cannot-block; it never means "assume good". That default is the whole row: the
 * first wrong block gets attributed to "the LLM", and this is the record with which
 * to argue otherwise.
 */

import { NormalizedRule } from '../../../../domain/models/normalized-rule';
import type { EvaluationFacts } from '../../../../domain/satellite-manifest';
import {
  admitBlocking,
  DEFAULT_ADMISSIBILITY_POLICY,
  type AdmissibilityPolicy,
  type SignalCalibration,
} from '../../architecture/signal-admissibility';
import { WorkspaceEvaluationContext, RuleEvaluationResult } from '../evaluator.interface';
import { INativeRuleHandler } from './rule-handler.interface';

/** One item of inline ADR-0111 evidence, as it reaches the engine. */
type QualityEvidenceFact = NonNullable<EvaluationFacts['qualityEvidence']>[number];

/** Rule ids this handler owns — the same four the `.rego` emits. */
export const PROBABILISTIC_EVIDENCE_RULE_IDS = ['PEA-01', 'PEA-02', 'PEA-03', 'PEA-04'] as const;

/** The measurement metadata PEA-04 asks an ADMITTED signal to declare. */
const MEASUREMENT_METADATA = ['sampleSize', 'method', 'labelledBy'] as const;

function label(ev: QualityEvidenceFact): string {
  return `${ev.source ?? 'unknown'}/${ev.dimension ?? 'unknown'}`;
}

/**
 * Present in the Rego sense: neither undefined nor null. Deliberately NOT `!value`,
 * which would call `sampleSize: 0` missing while Rego's `not ev.calibration.x` would
 * not — a divergence of exactly one case is still a parity defect (GT-602).
 */
function declared(value: unknown): boolean {
  return value !== undefined && value !== null;
}

/**
 * Mirror of the `.rego`'s `has_calibration`: all three fields the rule reads, of the
 * right kind. A half-filled block is not a measurement.
 */
function hasCalibration(ev: QualityEvidenceFact): boolean {
  const c = ev.calibration;
  return (
    !!c &&
    typeof c.truePositiveRate === 'number' &&
    Number.isFinite(c.truePositiveRate) &&
    typeof c.trueNegativeRate === 'number' &&
    Number.isFinite(c.trueNegativeRate) &&
    typeof c.measuredAt === 'string' &&
    c.measuredAt.trim().length > 0
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** A `measuredAt` no `Date.parse` can read, so `admitBlocking` reaches `stale`. */
const UNDATEABLE = 'unreadable-against-the-evaluation-date';

/**
 * Days since 1970-01-01 for a leading `YYYY-MM-DD`, or undefined.
 *
 * Character-for-character the `.rego`'s `epoch_day`, and for the same reason: the
 * wasm runtime implements no `time.*` builtin, so the policy dates by calendar
 * arithmetic at DAY granularity. `Date.parse` here would agree with it almost
 * always — and a rule that agrees almost always across two engines is the parity
 * defect GT-602 was registered for, not the absence of one.
 */
export function epochDay(text: string | undefined): number | undefined {
  const parts = (text ?? '').slice(0, 10).split('-');
  if (parts.length !== 3) return undefined;
  const [year, month, day] = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : NaN));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return undefined;
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  const shifted = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(shifted / 400);
  const yoe = shifted - era * 400;
  const monthIndex = month >= 3 ? month - 3 : month + 9;
  const doy = Math.floor((153 * monthIndex + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/**
 * Project one evidence item onto the calibration vocabulary `admitBlocking` reads.
 *
 * `measuredAt` is re-expressed as midnight UTC of its own calendar day, so
 * `admitBlocking`'s millisecond arithmetic yields exactly the whole-day difference
 * the `.rego` computes. When either date is unreadable — including the fail-closed
 * case of an evaluation that declared no date — the item carries {@link UNDATEABLE}
 * instead, which lands on `advisory-stale-calibration`: the same verdict the `.rego`
 * reaches when `age_days` is undefined.
 */
function toSignalCalibration(
  ev: QualityEvidenceFact,
  evaluatedOn: number | undefined,
): SignalCalibration {
  const base = {
    determinism: (ev.determinism === 'deterministic' ? 'deterministic' : 'probabilistic') as
      | 'deterministic'
      | 'probabilistic',
    method: label(ev),
  };
  if (!hasCalibration(ev)) return base;

  const measured = epochDay(ev.calibration?.measuredAt);
  const datable = measured !== undefined && evaluatedOn !== undefined;
  return {
    ...base,
    truePositiveRate: ev.calibration?.truePositiveRate,
    trueNegativeRate: ev.calibration?.trueNegativeRate,
    measuredAt: datable ? new Date(measured * DAY_MS).toISOString() : UNDATEABLE,
  };
}

function resolvePolicy(facts: EvaluationFacts | undefined): AdmissibilityPolicy {
  const declaredPolicy = facts?.qualityAdmissibilityPolicy;
  const evaluatedOn = epochDay(facts?.evaluationDate);
  return {
    minTruePositiveRate: declaredPolicy?.minTruePositiveRate ?? DEFAULT_ADMISSIBILITY_POLICY.minTruePositiveRate,
    minTrueNegativeRate: declaredPolicy?.minTrueNegativeRate ?? DEFAULT_ADMISSIBILITY_POLICY.minTrueNegativeRate,
    maxCalibrationAgeDays:
      declaredPolicy?.maxCalibrationAgeDays ?? DEFAULT_ADMISSIBILITY_POLICY.maxCalibrationAgeDays,
    // No wall clock. An evaluation that does not declare its date cannot tell how
    // old a measurement is, and an age nobody can compute is not an age within the
    // limit — so every calibration degrades to advisory rather than being waved
    // through against a clock the verdict cannot be reproduced from.
    ...(evaluatedOn === undefined ? {} : { now: () => new Date(evaluatedOn * DAY_MS) }),
  };
}

/** The admissibility class each rule id refuses. */
const REFUSAL_BY_RULE: Readonly<Record<string, string>> = {
  'PEA-01': 'advisory-uncalibrated',
  'PEA-02': 'advisory-below-threshold',
  'PEA-03': 'advisory-stale-calibration',
};

export class ProbabilisticEvidenceRuleHandler implements INativeRuleHandler {
  canHandle(rule: NormalizedRule): boolean {
    return rule.id.startsWith('PEA-');
  }

  async evaluate(
    rule: NormalizedRule,
    ctx: WorkspaceEvaluationContext,
  ): Promise<RuleEvaluationResult> {
    const evidence = ctx.facts?.qualityEvidence;

    // No inline evidence presented: nothing tried to block on a guess. ADR-0111 §3
    // is explicit that absence is `no-evidence`, never a failure the Core caused.
    if (!evidence || evidence.length === 0) {
      return {
        rule,
        result: 'passed',
        message:
          'No inline quality evidence was presented, so no probabilistic signal could reach a blocking verdict (ADR-0111 §3).',
      };
    }

    const policy = resolvePolicy(ctx.facts);
    const evaluatedOn = epochDay(ctx.facts?.evaluationDate);
    const decide = (ev: QualityEvidenceFact) =>
      admitBlocking(true, toSignalCalibration(ev, evaluatedOn), policy);
    const refusal = REFUSAL_BY_RULE[rule.id];

    if (refusal) {
      const offenders = evidence.filter((ev) => decide(ev).admissibility === refusal);
      if (offenders.length === 0) {
        return { rule, result: 'passed' };
      }
      return {
        rule,
        result: 'failed',
        message: offenders.map((ev) => decide(ev).rationale).join(' | '),
      };
    }

    // PEA-04 — non-blocking: an ADMITTED measurement should say how it was obtained.
    const undocumented = evidence
      .filter((ev) => decide(ev).admissibility === 'calibrated')
      .map((ev) => ({
        ev,
        missing: MEASUREMENT_METADATA.filter((f) => !declared(ev.calibration?.[f])),
      }))
      .filter((o) => o.missing.length > 0);

    if (undocumented.length === 0) {
      return { rule, result: 'passed' };
    }

    return {
      rule,
      result: 'failed',
      message: undocumented
        .map(
          (o) =>
            `Probabilistic signal (${label(o.ev)}) is admitted for blocking but does not say how it was measured (missing: ${o.missing.join(', ')}).`,
        )
        .join(' | '),
    };
  }
}
