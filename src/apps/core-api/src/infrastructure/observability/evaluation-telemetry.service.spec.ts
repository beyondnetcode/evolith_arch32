/**
 * GT-587 criterion 1, adapter half — the events actually reach a span.
 *
 * The mapper is unit-tested in core-domain; what is unproven there is that this
 * adapter hands OTel the event NAME and the attribute map unchanged, and that it stays
 * silent (rather than throwing) when tracing is off. Both were the pre-GT-587 state:
 * there was no adapter at all, so `grep -rn gen_ai src` returned 0.
 */

import { Verdict } from '@beyondnet/evolith-core-domain';
import type { EvaluationResult } from '@beyondnet/evolith-core-domain/evaluation';
import { EvaluationTelemetryService } from './evaluation-telemetry.service';

function fakeSpan() {
  const events: Array<{ name: string; attributes: Record<string, unknown> }> = [];
  return {
    events,
    span: { addEvent: (name: string, attributes: Record<string, unknown>) => { events.push({ name, attributes }); } } as any,
  };
}

function result(): EvaluationResult {
  return {
    overallVerdict: Verdict.FAIL,
    outcome: 'rejected',
    results: {
      compliance: { verdict: Verdict.FAIL, totalChecks: 4, passedChecks: 1, failedChecks: 3, skippedChecks: 0 },
    },
    rulesExecuted: [],
    policiesApplied: [],
    gaps: [],
    risks: [],
    missingEvidence: [],
    incompleteArtifacts: [],
    recommendations: [],
    requiredActions: [],
    confidence: 0.4,
    rationale: 'three compliance checks failed',
    versions: { core: '1.2.0' },
    evaluatedAt: '2026-07-30T00:00:00.000Z',
    correlationId: 'corr-9',
    schemaVersion: '1.0.0',
  } as EvaluationResult;
}

describe('EvaluationTelemetryService', () => {
  it('adds one gen_ai.evaluation.result event per evaluated kind', () => {
    const { span, events } = fakeSpan();
    const emitted = new EvaluationTelemetryService().record(result(), span);

    expect(emitted).toBe(2); // overall + compliance
    expect(events.map((e) => e.name)).toEqual(['gen_ai.evaluation.result', 'gen_ai.evaluation.result']);
    expect(events[0].attributes['gen_ai.evaluation.name']).toBe('evolith.overall');
    expect(events[0].attributes['gen_ai.evaluation.score.label']).toBe('FAIL');
    expect(events[1].attributes['gen_ai.evaluation.name']).toBe('evolith.compliance');
  });

  it('is a silent no-op when nothing is tracing — emitting is a side channel, never a precondition', () => {
    expect(new EvaluationTelemetryService().record(result(), undefined)).toBe(0);
  });
});
