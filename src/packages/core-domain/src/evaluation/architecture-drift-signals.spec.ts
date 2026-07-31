/**
 * GT-594 — the `architecture` evaluator publishes the AI-drift signals ADVISORY.
 *
 * The contrast these tests draw is between what the signals SAY and what they can
 * DO. A repository can be riddled with clone classes and swallowed errors and still
 * PASS, because none of these signals carries a measured error rate and GT-584's gate
 * refuses an unmeasured guess a blocking verdict. That is not a bug being tested
 * around — it is criterion 2, and the day GT-585 measures the rates is the day this
 * expectation is allowed to change, deliberately and in one place.
 */

import { createArchitectureKindEvaluator, driftFindingsFrom } from './kind-evaluators';
import { REPO_FACTS_SCHEMA_VERSION } from './contracts/repo-facts';
import { summarizeDriftSignals } from './contracts/drift-signals';
import type { EvaluationContext } from './contracts/evaluation-context';
import type { RepoFacts, SymbolFact } from './contracts/repo-facts';
import { Verdict } from '../domain/verdict/verdict';

const cleanDrift = (): any => ({
  detectDrift: jest.fn(async () => ({
    detectedLevel: 'F2',
    driftDetected: false,
    driftSeverity: 'none',
    newViolations: [],
    persistentViolations: [],
  })),
});

const ws = { satellitePath: '/ws/sat', corePath: '/ws/core' };

const sym = (id: string, hash?: string): SymbolFact => ({
  id,
  name: id.split('#')[1],
  kind: 'function',
  moduleId: id.split('#')[0],
  exported: true,
  ...(hash ? { structuralHash: hash, structuralSize: 40 } : {}),
});

const factsAt = (contentHash: string, over: Partial<RepoFacts> = {}): RepoFacts => ({
  schemaVersion: REPO_FACTS_SCHEMA_VERSION,
  contentHash,
  provenance: {
    extractedBy: 'evolith-repo-facts',
    extractorVersion: '1.1.0',
    indexer: 'typescript-compiler-api',
    indexerVersion: '6.0.3',
    extractedAt: '2026-07-31T00:00:00.000Z',
  },
  modules: [{ id: 'src/a.ts' }, { id: 'src/b.ts' }],
  imports: [],
  symbols: [],
  references: [],
  errorMasking: [],
  ...over,
});

/** A repository that is, by every drift signal, in a bad way. */
const drifted = factsAt('sha256:current', {
  symbols: [sym('src/a.ts#one', 'hDup'), sym('src/b.ts#two', 'hDup')],
  errorMasking: [
    { moduleId: 'src/a.ts', kind: 'empty-catch', line: 12 },
    { moduleId: 'src/b.ts', kind: 'any-assertion', line: 4 },
  ],
});

const baseline = factsAt('sha256:baseline', { symbols: [sym('src/a.ts#one', 'hDup')] });

describe('architecture evaluator — drift signals (GT-594)', () => {
  it('publishes a signal report and a delta when both revisions arrive inline', async () => {
    const evaluator = createArchitectureKindEvaluator(cleanDrift());
    const ctx: EvaluationContext = {
      kinds: ['architecture'],
      repoFacts: drifted,
      baselineRepoFacts: baseline,
    };
    const out: any = await evaluator.evaluate(ctx, ws as any);

    expect(out.results.architecture.driftSignals.signals.map((s: any) => s.measurement.signal)).toEqual([
      'duplication',
      'error-masking',
      'refactor-to-copy',
    ]);
    expect(out.results.architecture.driftSignalDelta.baselineContentHash).toBe('sha256:baseline');
    expect(out.results.architecture.driftSignalDelta.currentContentHash).toBe('sha256:current');
  });

  it('cannot change the verdict: a badly drifted repository still PASSES', async () => {
    const evaluator = createArchitectureKindEvaluator(cleanDrift());
    const out: any = await evaluator.evaluate(
      { kinds: ['architecture'], repoFacts: drifted, baselineRepoFacts: baseline },
      ws as any,
    );

    expect(out.verdict).toBe(Verdict.PASS);
    expect(out.results.architecture.driftSignals.blockingAdmissible).toEqual([]);
    const driftGaps = out.gaps.filter((g: any) => g.id.startsWith('DRIFT-'));
    expect(driftGaps.length).toBeGreaterThan(0);
    expect(driftGaps.every((g: any) => g.severity === 'info')).toBe(true);
  });

  it('says on every finding that the signal is advisory and why', async () => {
    const evaluator = createArchitectureKindEvaluator(cleanDrift());
    const out: any = await evaluator.evaluate(
      { kinds: ['architecture'], repoFacts: drifted, baselineRepoFacts: baseline },
      ws as any,
    );
    const duplication = out.gaps.find((g: any) => g.id === 'DRIFT-DUPLICATION');
    expect(duplication.message).toContain('advisory-uncalibrated');
    expect(duplication.message).toContain('ADVISORY — cannot block');
    expect(duplication.location).toBe('sha256:current');

    const definition = out.recommendations.find((r: any) => r.id === 'DRIFT-DUPLICATION-DEFINITION');
    expect(definition.message).toContain('Type-2 clone');
    expect(definition.message).toContain('Blind spots:');
    expect(definition.message).toContain('GT-584');
  });

  it('reports the delta per signal in the recommendations', async () => {
    const evaluator = createArchitectureKindEvaluator(cleanDrift());
    const out: any = await evaluator.evaluate(
      { kinds: ['architecture'], repoFacts: drifted, baselineRepoFacts: baseline },
      ws as any,
    );
    const delta = out.recommendations.find((r: any) => r.id === 'DRIFT-DELTA-DUPLICATION');
    expect(delta.message).toContain('sha256:baseline');
    expect(delta.message).toContain('cloneClasses 0→1');
  });

  it('omits the drift report entirely when no fact base is supplied', async () => {
    const evaluator = createArchitectureKindEvaluator(cleanDrift());
    const out: any = await evaluator.evaluate({ kinds: ['architecture'] }, ws as any);
    expect(out.results.architecture.driftSignals).toBeUndefined();
    expect(out.results.architecture.driftSignalDelta).toBeUndefined();
  });

  it('reports refactor:copy as not-measurable, never as zero, without a baseline', async () => {
    const evaluator = createArchitectureKindEvaluator(cleanDrift());
    const out: any = await evaluator.evaluate(
      { kinds: ['architecture'], repoFacts: drifted },
      ws as any,
    );
    expect(out.results.architecture.driftSignalDelta).toBeUndefined();
    const note = out.recommendations.find((r: any) => r.id === 'DRIFT-REFACTOR-TO-COPY');
    expect(note.message).toContain('NOT MEASURED');
  });

  it('driftFindingsFrom is pure and emits no blocking severity at any input', () => {
    const report = summarizeDriftSignals(drifted, { baseline });
    const findings = driftFindingsFrom(report);
    expect(findings.gaps.every((g) => g.severity === 'info')).toBe(true);
    expect(findings.risks.every((r) => r.level === 'low')).toBe(true);
    expect(driftFindingsFrom(report)).toEqual(findings);
  });
});
