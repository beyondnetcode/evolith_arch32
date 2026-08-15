/**
 * GT-587 criterion 1 — an evaluation result emits `gen_ai.evaluation.result` under
 * the PINNED semconv revision.
 *
 * Every assertion here reads a literal wire name rather than the exported constant
 * where the point of the test is the NAME. Asserting `attrs[ATTR_GEN_AI_EVALUATION_NAME]`
 * would pass just as happily if the constant were renamed to `evolith.eval.name` —
 * which is the exact regression this gap is about.
 */

import { Verdict } from '../../domain/verdict/verdict';
import type { EvaluationResult } from '../contracts/evaluation-result';
import { toGenAiEvaluationEvents } from './gen-ai-evaluation';
import { PINNED_SEMCONV_ATTRIBUTES, SEMCONV_VERSION } from './semconv';

function result(overrides: Partial<EvaluationResult> = {}): EvaluationResult {
  return {
    overallVerdict: Verdict.PASS,
    outcome: 'approved',
    results: {},
    rulesExecuted: [],
    policiesApplied: [],
    gaps: [],
    risks: [],
    missingEvidence: [],
    incompleteArtifacts: [],
    recommendations: [],
    requiredActions: [],
    confidence: 0.8,
    rationale: 'all required criteria met',
    versions: { core: '1.2.0' },
    evaluatedAt: '2026-07-30T00:00:00.000Z',
    correlationId: 'corr-1',
    schemaVersion: '1.0.0',
    ...overrides,
  } as EvaluationResult;
}

function byName(events: ReturnType<typeof toGenAiEvaluationEvents>, evaluator: string) {
  return events.find((e) => e.attributes['gen_ai.evaluation.name'] === evaluator);
}

describe('toGenAiEvaluationEvents — standard vocabulary', () => {
  it('emits the standard event name and the four standard attributes', () => {
    const [event] = toGenAiEvaluationEvents(result());

    expect(event.name).toBe('gen_ai.evaluation.result');
    expect(event.attributes['gen_ai.evaluation.name']).toBe('evolith.overall');
    expect(event.attributes['gen_ai.evaluation.score.label']).toBe('PASS');
    expect(event.attributes['gen_ai.evaluation.score.value']).toBe(0.8);
    expect(event.attributes['gen_ai.evaluation.explanation']).toBe('all required criteria met');
  });

  it('keeps the private evolith.* names ALONGSIDE, never instead of', () => {
    const [event] = toGenAiEvaluationEvents(result({ outcome: 'conditional' }));

    expect(event.attributes['evolith.outcome']).toBe('conditional');
    expect(event.attributes['evolith.evaluation.kind']).toBe('overall');
    expect(event.attributes['evolith.core.version']).toBe('1.2.0');
    expect(event.attributes['evolith.correlation_id']).toBe('corr-1');
  });

  it('stamps the pinned semconv revision on every event', () => {
    for (const event of toGenAiEvaluationEvents(result())) {
      expect(event.attributes['evolith.semconv.version']).toBe(SEMCONV_VERSION);
    }
  });

  it('always emits the overall event, even when nothing was evaluated', () => {
    const events = toGenAiEvaluationEvents(result({ results: {} }));
    expect(events).toHaveLength(1);
    expect(byName(events, 'evolith.overall')).toBeDefined();
  });
});

describe('toGenAiEvaluationEvents — one event per sub-result kind', () => {
  it('folds a list of gates into the WORST verdict and a pass ratio', () => {
    const events = toGenAiEvaluationEvents(
      result({
        results: {
          gate: [
            { gateId: 'g1', verdict: Verdict.PASS, artifactResults: [], risks: [], gaps: [], requiredActions: [] },
            { gateId: 'g2', verdict: Verdict.FAIL, artifactResults: [], risks: [], gaps: [], requiredActions: [] },
            { gateId: 'g3', verdict: Verdict.PASS, artifactResults: [], risks: [], gaps: [], requiredActions: [] },
          ],
        },
      } as Partial<EvaluationResult>),
    );

    const gate = byName(events, 'evolith.gate');
    expect(gate?.attributes['gen_ai.evaluation.score.label']).toBe('FAIL');
    expect(gate?.attributes['gen_ai.evaluation.score.value']).toBeCloseTo(2 / 3);
  });

  it('normalises maturity and completeness onto the same 0..1 axis as confidence', () => {
    const events = toGenAiEvaluationEvents(
      result({
        results: {
          design: {
            verdict: Verdict.PASS,
            technicalMaturity: 62,
            perConcernMaturity: [],
            artifactStatus: [],
            missingArtifacts: [],
            deviationsRequiringAdr: [],
            gaps: [],
            recommendations: [],
          },
          phaseArtifacts: {
            verdict: Verdict.PASS,
            phase: 'construction',
            completeness: 40,
            requiredArtifacts: [],
            presentArtifacts: [],
            missingArtifacts: [],
            conditionalArtifacts: [],
            gaps: [],
            recommendations: [],
          },
        },
      } as Partial<EvaluationResult>),
    );

    expect(byName(events, 'evolith.design')?.attributes['gen_ai.evaluation.score.value']).toBeCloseTo(0.62);
    expect(byName(events, 'evolith.phase-artifacts.construction')?.attributes['gen_ai.evaluation.score.value']).toBeCloseTo(0.4);
  });

  it('OMITS the score attribute for kinds with no honest numeric score', () => {
    const events = toGenAiEvaluationEvents(
      result({
        results: {
          architecture: { verdict: Verdict.FAIL, risks: [], gaps: [], recommendations: [] },
        },
      } as Partial<EvaluationResult>),
    );

    const architecture = byName(events, 'evolith.architecture');
    expect(architecture?.attributes['gen_ai.evaluation.score.label']).toBe('FAIL');
    // An invented 1.0 would be worse than nothing — absence is the signal.
    expect(architecture?.attributes).not.toHaveProperty('gen_ai.evaluation.score.value');
  });

  it('derives a compliance score from the check counts when none is supplied', () => {
    const events = toGenAiEvaluationEvents(
      result({
        results: {
          compliance: { verdict: Verdict.FAIL, totalChecks: 8, passedChecks: 6, failedChecks: 2, skippedChecks: 0 },
        },
      } as Partial<EvaluationResult>),
    );

    const compliance = byName(events, 'evolith.compliance');
    expect(compliance?.attributes['gen_ai.evaluation.score.value']).toBeCloseTo(0.75);
    expect(compliance?.attributes['gen_ai.evaluation.explanation']).toContain('6/8 checks passed');
  });
});

describe('the pinned manifest covers what is emitted', () => {
  it('lists every standard attribute the mapper can emit', () => {
    const pinned = new Set(PINNED_SEMCONV_ATTRIBUTES.map((a) => a.value));
    const events = toGenAiEvaluationEvents(
      result({
        results: {
          compliance: { verdict: Verdict.PASS, totalChecks: 1, passedChecks: 1, failedChecks: 0, skippedChecks: 0 },
        },
      } as Partial<EvaluationResult>),
    );

    for (const event of events) {
      expect(pinned).toContain(event.name);
      for (const key of Object.keys(event.attributes)) {
        if (key.startsWith('evolith.')) continue;
        expect(pinned).toContain(key);
      }
    }
  });
});

/**
 * GT-688 — `results.topology` became an ARRAY, so it must FOLD like its four
 * sibling arrays (gate/artifact/evidence/checkpoint) instead of emitting one
 * draft that describes whichever entry happened to be looked at. Nothing
 * asserted the draft count before, which is why the singular reader survived.
 */
describe('GT-688 · a topology composition folds into ONE draft over N verdicts', () => {
  const entry = (topologyRef: string, verdict: Verdict) => ({
    topologyRef,
    verdict,
    conformant: verdict === Verdict.PASS,
    gaps: [],
    recommendations: [],
  });

  it('emits exactly one topology draft, at the WORST verdict, scored by pass ratio', () => {
    const events = toGenAiEvaluationEvents(
      result({
        results: {
          topology: [
            entry('modular-monolith', Verdict.PASS),
            entry('agentic-ai', Verdict.FAIL),
            entry('event-driven', Verdict.PASS),
          ],
        },
      } as Partial<EvaluationResult>),
    );

    const topologyEvents = events.filter((e) => e.attributes['evolith.evaluation.kind'] === 'topology');
    expect(topologyEvents).toHaveLength(1);
    expect(topologyEvents[0].attributes['gen_ai.evaluation.score.label']).toBe(Verdict.FAIL);
    expect(topologyEvents[0].attributes['gen_ai.evaluation.score.value']).toBeCloseTo(2 / 3, 10);
  });

  it('a single-topology composition still emits one draft at that verdict', () => {
    const events = toGenAiEvaluationEvents(
      result({ results: { topology: [entry('modular-monolith', Verdict.PASS)] } } as Partial<EvaluationResult>),
    );
    const topologyEvents = events.filter((e) => e.attributes['evolith.evaluation.kind'] === 'topology');
    expect(topologyEvents).toHaveLength(1);
    expect(topologyEvents[0].attributes['gen_ai.evaluation.score.label']).toBe(Verdict.PASS);
  });

  it('emits no topology draft when no topology was evaluated', () => {
    const events = toGenAiEvaluationEvents(result({ results: {} }));
    expect(events.filter((e) => e.attributes['evolith.evaluation.kind'] === 'topology')).toHaveLength(0);
  });
});
