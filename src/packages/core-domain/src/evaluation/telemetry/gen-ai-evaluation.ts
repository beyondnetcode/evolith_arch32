/**
 * `EvaluationResult` → OpenTelemetry `gen_ai.evaluation.result` events (GT-587).
 *
 * ## The shape match
 *
 * An Evolith evaluation is, in OpenTelemetry's GenAI vocabulary, exactly an
 * *evaluation result*: a named evaluator produced a categorical outcome (the canonical
 * {@link Verdict}), sometimes a numeric score, sometimes an explanation. That is the
 * whole of `gen_ai.evaluation.result`, which is why this maps cleanly rather than
 * approximately — the same claim ADR-0111 makes about a quality signal.
 *
 * ## What this deliberately does NOT do
 *
 * It emits nothing. It has no OTel import and no I/O: a pure function from a result to
 * a list of `{name, attributes}` records. The Core stays pure (ADR-0101) and rule
 * HXA-05 stays satisfied; the adapters that own a span attach these.
 *
 * ## Naming choices worth defending
 *
 * - `gen_ai.evaluation.name` carries a NAMESPACED value (`evolith.architecture`, not
 *   `architecture`). The attribute key is the standard one — that is what makes the
 *   signal joinable — but a bare `architecture` would collide with any other evaluator
 *   a customer runs. Namespacing the value, not the key, is the correct half to own.
 * - `gen_ai.evaluation.score.value` is normalised to 0..1 across every kind
 *   (`technicalMaturity`/100, `completeness`/100, pass ratios), so one dashboard panel
 *   can plot all of them. Kinds with no honest numeric score omit the attribute rather
 *   than inventing one — an absent score is information; a fabricated 1.0 is not.
 * - `gen_ai.evaluation.explanation` is set only where the result actually carries text.
 * - The `evolith.*` attributes ride ALONGSIDE, never instead of: they are already being
 *   collected, and they carry what semconv has no field for (the governance `outcome`,
 *   the core version, the correlation id).
 */

import { Verdict } from '../../domain/verdict/verdict';
import type { EvaluationResult } from '../contracts/evaluation-result';
import {
  ATTR_GEN_AI_EVALUATION_EXPLANATION,
  ATTR_GEN_AI_EVALUATION_NAME,
  ATTR_GEN_AI_EVALUATION_SCORE_LABEL,
  ATTR_GEN_AI_EVALUATION_SCORE_VALUE,
  EVENT_GEN_AI_EVALUATION_RESULT,
  SEMCONV_VERSION,
} from './semconv';

/** Attribute values OTel accepts on an event without further encoding. */
export type TelemetryAttributeValue = string | number | boolean;

/** A single `gen_ai.evaluation.result` event, ready for `span.addEvent`. */
export interface GenAiEvaluationEvent {
  /** Always {@link EVENT_GEN_AI_EVALUATION_RESULT}. */
  readonly name: string;
  readonly attributes: Readonly<Record<string, TelemetryAttributeValue>>;
}

/** Namespace prefix for the `gen_ai.evaluation.name` VALUE (see file header). */
const EVALUATOR_NAMESPACE = 'evolith';

/**
 * Severity ranking used to fold a list of sub-results into one label. FAIL dominates
 * everything; a WAIVE is louder than a PASS because it records a human override; SKIP
 * is the quietest because it asserts non-applicability.
 */
const VERDICT_SEVERITY: Readonly<Record<Verdict, number>> = {
  [Verdict.FAIL]: 3,
  [Verdict.WAIVE]: 2,
  [Verdict.PASS]: 1,
  [Verdict.SKIP]: 0,
};

function worstVerdict(verdicts: readonly Verdict[]): Verdict | undefined {
  let worst: Verdict | undefined;
  for (const v of verdicts) {
    if (worst === undefined || (VERDICT_SEVERITY[v] ?? 0) > (VERDICT_SEVERITY[worst] ?? 0)) worst = v;
  }
  return worst;
}

/** Fraction of entries that passed, or undefined for an empty list (no honest ratio). */
function passRatio(verdicts: readonly Verdict[]): number | undefined {
  if (verdicts.length === 0) return undefined;
  return verdicts.filter((v) => v === Verdict.PASS).length / verdicts.length;
}

/** Clamp to the 0..1 range the score attribute is normalised to. */
function normalise(value: number, scale: number): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  return Math.min(1, Math.max(0, value / scale));
}

interface EventDraft {
  readonly kind: string;
  readonly verdict?: Verdict;
  readonly score?: number;
  readonly explanation?: string;
}

function draftsFor(result: EvaluationResult): EventDraft[] {
  const drafts: EventDraft[] = [
    {
      kind: 'overall',
      verdict: result.overallVerdict,
      score: normalise(result.confidence, 1),
      explanation: result.rationale || undefined,
    },
  ];

  const r = result.results;

  if (r.gate?.length) {
    const verdicts = r.gate.map((g) => g.verdict);
    drafts.push({ kind: 'gate', verdict: worstVerdict(verdicts), score: passRatio(verdicts) });
  }
  if (r.artifact?.length) {
    const verdicts = r.artifact.map((a) => a.verdict);
    drafts.push({ kind: 'artifact', verdict: worstVerdict(verdicts), score: passRatio(verdicts) });
  }
  if (r.evidence?.length) {
    const verdicts = r.evidence.map((e) => e.verdict);
    drafts.push({ kind: 'evidence', verdict: worstVerdict(verdicts), score: passRatio(verdicts) });
  }
  if (r.checkpoint?.length) {
    const verdicts = r.checkpoint.map((c) => c.verdict);
    drafts.push({ kind: 'checkpoint', verdict: worstVerdict(verdicts), score: passRatio(verdicts) });
  }
  if (r.architecture) {
    drafts.push({ kind: 'architecture', verdict: r.architecture.verdict });
  }
  if (r.blueprint) {
    drafts.push({ kind: 'blueprint', verdict: r.blueprint.verdict });
  }
  if (r.topology) {
    drafts.push({ kind: 'topology', verdict: r.topology.verdict });
  }
  if (r.deployment) {
    drafts.push({ kind: 'deployment', verdict: r.deployment.verdict });
  }
  if (r.compliance) {
    const c = r.compliance;
    const score = c.score !== undefined ? normalise(c.score, 1) : c.totalChecks > 0 ? c.passedChecks / c.totalChecks : undefined;
    drafts.push({
      kind: 'compliance',
      verdict: c.verdict,
      score,
      explanation: `${c.passedChecks}/${c.totalChecks} checks passed (${c.failedChecks} failed, ${c.skippedChecks} skipped)`,
    });
  }
  if (r.design) {
    // ADR-0104: the design evaluator is ADVISORY — its primary output is maturity,
    // not the verdict, so the score is the datum worth plotting.
    drafts.push({ kind: 'design', verdict: r.design.verdict, score: normalise(r.design.technicalMaturity, 100) });
  }
  if (r.phaseArtifacts) {
    drafts.push({
      kind: `phase-artifacts.${r.phaseArtifacts.phase}`,
      verdict: r.phaseArtifacts.verdict,
      score: normalise(r.phaseArtifacts.completeness, 100),
    });
  }

  return drafts;
}

/**
 * Map an {@link EvaluationResult} to `gen_ai.evaluation.result` events — one for the
 * aggregate verdict plus one per sub-result kind actually present. A result with no
 * sub-results still yields the `overall` event, so a consumer never has to distinguish
 * "not emitted" from "nothing evaluated".
 */
export function toGenAiEvaluationEvents(result: EvaluationResult): GenAiEvaluationEvent[] {
  return draftsFor(result).map((draft) => {
    const attributes: Record<string, TelemetryAttributeValue> = {
      [ATTR_GEN_AI_EVALUATION_NAME]: `${EVALUATOR_NAMESPACE}.${draft.kind}`,
      // Private names kept ALONGSIDE the standard ones — see the file header.
      'evolith.evaluation.kind': draft.kind,
      'evolith.outcome': result.outcome,
      'evolith.semconv.version': SEMCONV_VERSION,
      'evolith.core.version': result.versions.core,
    };
    if (draft.verdict !== undefined) attributes[ATTR_GEN_AI_EVALUATION_SCORE_LABEL] = draft.verdict;
    if (draft.score !== undefined) attributes[ATTR_GEN_AI_EVALUATION_SCORE_VALUE] = draft.score;
    if (draft.explanation) attributes[ATTR_GEN_AI_EVALUATION_EXPLANATION] = draft.explanation;
    if (result.correlationId) attributes['evolith.correlation_id'] = result.correlationId;

    return { name: EVENT_GEN_AI_EVALUATION_RESULT, attributes };
  });
}
