/**
 * GT-594 — the AI-drift signals: measurement, admissibility gate, conformance delta.
 *
 * These tests are written against the three acceptance criteria, and deliberately
 * also against the ways the row could be faked: a duplication number that is really a
 * tunable similarity threshold, a signal that can block because nobody asked GT-584,
 * and a "delta" that cannot tell a change in the repository from a change in the
 * instrument.
 */

import {
  DRIFT_SIGNAL_IDS,
  DRIFT_SIGNAL_SOURCE,
  assessDriftSignal,
  diffDriftSignalReports,
  findCloneClasses,
  incomparabilityReason,
  measureDuplication,
  measureErrorMasking,
  measureRefactorToCopy,
  summarizeDriftSignals,
  toEvidence,
} from './drift-signals';
import { DEFAULT_MIN_STRUCTURAL_SIZE, REPO_FACTS_SCHEMA_VERSION } from './repo-facts';
import type { ErrorMaskingFact, RepoFacts, SymbolFact } from './repo-facts';

const facts = (over: Partial<RepoFacts> = {}): RepoFacts => ({
  schemaVersion: REPO_FACTS_SCHEMA_VERSION,
  contentHash: 'sha256:baseline',
  provenance: {
    extractedBy: 'evolith-repo-facts',
    extractorVersion: '1.1.0',
    indexer: 'typescript-compiler-api',
    indexerVersion: '6.0.3',
    extractedAt: '2026-07-31T00:00:00.000Z',
  },
  modules: [{ id: 'a.ts' }, { id: 'b.ts' }],
  imports: [],
  symbols: [],
  references: [],
  ...over,
});

const sym = (
  id: string,
  structuralHash?: string,
  structuralSize = DEFAULT_MIN_STRUCTURAL_SIZE,
): SymbolFact => ({
  id,
  name: id.split('#')[1],
  kind: 'function',
  moduleId: id.split('#')[0],
  exported: true,
  ...(structuralHash ? { structuralHash, structuralSize } : {}),
});

// ---------------------------------------------------------------------------
// AC1 — the signals exist and are measurements, not resemblances
// ---------------------------------------------------------------------------

describe('duplication (AC1)', () => {
  it('groups declarations that share a fingerprint into clone classes, naming the members', () => {
    const classes = findCloneClasses(
      facts({
        symbols: [sym('a.ts#one', 'h1'), sym('b.ts#two', 'h1'), sym('a.ts#three', 'h2')],
      }),
    );
    expect(classes).toHaveLength(1);
    expect(classes[0].members).toEqual(['a.ts#one', 'b.ts#two']);
    expect(classes[0].modules).toEqual(['a.ts', 'b.ts']);
  });

  it('reports a ratio over the fingerprinted population, with the floor it used', () => {
    const m = measureDuplication(
      facts({
        symbols: [
          sym('a.ts#one', 'h1'),
          sym('b.ts#two', 'h1'),
          sym('a.ts#three', 'h2'),
          sym('b.ts#four', 'h3'),
        ],
      }),
    );
    expect(m.status).toBe('measured');
    expect(m.metrics.fingerprintedDeclarations).toBe(4);
    expect(m.metrics.clonedDeclarations).toBe(2);
    expect(m.metrics.redundantDeclarations).toBe(1);
    expect(m.metrics.crossModuleCloneClasses).toBe(1);
    expect(m.metrics.duplicationRatio).toBe(0.5);
    expect(m.metrics.minStructuralSize).toBe(DEFAULT_MIN_STRUCTURAL_SIZE);
  });

  it('is EXACT equality, not similarity: a fingerprint that differs at all is not a clone', () => {
    // The trap this row is most likely to fall into is a token-similarity heuristic
    // with a threshold. There is no threshold: 'h1' and 'h1x' are simply different.
    const m = measureDuplication(
      facts({ symbols: [sym('a.ts#one', 'h1'), sym('b.ts#two', 'h1x')] }),
    );
    expect(m.metrics.cloneClasses).toBe(0);
    expect(m.metrics.duplicationRatio).toBe(0);
  });

  it('excludes declarations below the node floor from the population entirely', () => {
    const m = measureDuplication(
      facts({
        symbols: [sym('a.ts#one', 'h1', 4), sym('b.ts#two', 'h1', 4), sym('a.ts#big', 'h9', 40)],
      }),
    );
    expect(m.metrics.fingerprintedDeclarations).toBe(1);
    expect(m.metrics.cloneClasses).toBe(0);
  });

  it('reports NOT-MEASURABLE, never a zero ratio, when no declaration was fingerprinted', () => {
    const m = measureDuplication(facts({ symbols: [sym('a.ts#one'), sym('b.ts#two')] }));
    expect(m.status).toBe('not-measurable');
    expect(m.metrics.duplicationRatio).toBeUndefined();
    expect(m.notMeasurableReason).toMatch(/not the same as "not duplicated"/);
  });

  it('states what it cannot see, including Type-3 clones and legitimate identity', () => {
    const m = measureDuplication(facts({ symbols: [sym('a.ts#one', 'h1')] }));
    expect(m.blindSpots.length).toBeGreaterThan(0);
    expect(m.blindSpots.join(' ')).toMatch(/Type-3/);
    expect(m.blindSpots.join(' ')).toMatch(/generated code/);
  });
});

describe('error masking (AC1)', () => {
  const masking = (over: Partial<ErrorMaskingFact>): ErrorMaskingFact => ({
    moduleId: 'a.ts',
    kind: 'empty-catch',
    line: 1,
    ...over,
  });

  it('counts the closed construct list in two families', () => {
    const m = measureErrorMasking(
      facts({
        errorMasking: [
          masking({ kind: 'empty-catch', line: 3 }),
          masking({ kind: 'catch-discards-error', line: 9 }),
          masking({ kind: 'any-assertion', moduleId: 'b.ts', line: 2 }),
          masking({ kind: 'ts-directive-suppression', moduleId: 'b.ts', line: 7 }),
        ],
      }),
    );
    expect(m.status).toBe('measured');
    expect(m.metrics.errorMaskingConstructs).toBe(4);
    expect(m.metrics.swallowedErrors).toBe(2);
    expect(m.metrics.suppressedDiagnostics).toBe(2);
    expect(m.metrics.modulesWithMasking).toBe(2);
    expect(m.metrics.errorMaskingDensityPerModule).toBe(2);
  });

  it('separates "looked and found none" from "nobody looked"', () => {
    expect(measureErrorMasking(facts({ errorMasking: [] })).status).toBe('measured');
    expect(measureErrorMasking(facts({ errorMasking: [] })).metrics.errorMaskingConstructs).toBe(0);

    const absent = measureErrorMasking(facts());
    expect(absent.status).toBe('not-measurable');
    expect(absent.metrics.errorMaskingConstructs).toBeUndefined();
    expect(absent.notMeasurableReason).toMatch(/nobody looked/);
  });

  it('names the configuration-shaped maskers it will never see', () => {
    expect(measureErrorMasking(facts({ errorMasking: [] })).blindSpots.join(' ')).toMatch(
      /eslint-disable/,
    );
  });
});

describe('refactor:copy (AC1, and AC3 by nature)', () => {
  const baseline = facts({
    contentHash: 'sha256:rev-a',
    symbols: [sym('a.ts#stays', 'hStay'), sym('a.ts#leaves', 'hMove')],
  });

  it('classifies a preserved body in a new home as MOVED', () => {
    const current = facts({
      contentHash: 'sha256:rev-b',
      symbols: [sym('a.ts#stays', 'hStay'), sym('b.ts#leaves', 'hMove')],
    });
    const m = measureRefactorToCopy(baseline, current);
    expect(m.metrics.movedDeclarations).toBe(1);
    expect(m.metrics.copiedDeclarations).toBe(0);
    expect(m.metrics.refactorShare).toBe(1);
    expect(m.observations[0].code).toBe('moved-declaration');
  });

  it('classifies a reproduced body whose original survived as COPIED', () => {
    const current = facts({
      contentHash: 'sha256:rev-b',
      symbols: [sym('a.ts#stays', 'hStay'), sym('a.ts#leaves', 'hMove'), sym('b.ts#pasted', 'hStay')],
    });
    const m = measureRefactorToCopy(baseline, current);
    expect(m.metrics.copiedDeclarations).toBe(1);
    expect(m.metrics.movedDeclarations).toBe(0);
    expect(m.metrics.refactorShare).toBe(0);
    expect(m.metrics.refactorToCopyRatio).toBe(0);
    expect(m.observations[0].code).toBe('copied-declaration');
  });

  it('classifies an edited body as NOVEL, and says so in its blind spots', () => {
    const current = facts({
      contentHash: 'sha256:rev-b',
      symbols: [sym('a.ts#stays', 'hStay'), sym('a.ts#leaves', 'hMove'), sym('b.ts#reworked', 'hNew')],
    });
    const m = measureRefactorToCopy(baseline, current);
    expect(m.metrics.novelDeclarations).toBe(1);
    expect(m.metrics.movedDeclarations).toBe(0);
    expect(m.metrics.copiedDeclarations).toBe(0);
    expect(m.blindSpots.join(' ')).toMatch(/under-counts refactoring/);
  });

  it('refuses to compare fact bases from a different indexer instead of reporting a change', () => {
    const otherIndexer = facts({
      contentHash: 'sha256:rev-b',
      provenance: { ...baseline.provenance, indexerVersion: '5.9.0' },
      symbols: [sym('a.ts#stays', 'hStay')],
    });
    expect(incomparabilityReason(baseline, otherIndexer)).toMatch(/different indexers/);
    const m = measureRefactorToCopy(baseline, otherIndexer);
    expect(m.status).toBe('not-measurable');
    expect(m.metrics.movedDeclarations).toBeUndefined();
  });

  it('is not measurable from a single revision', () => {
    const report = summarizeDriftSignals(facts({ symbols: [sym('a.ts#one', 'h1')] }));
    const refactor = report.signals.find((s) => s.measurement.signal === 'refactor-to-copy');
    expect(refactor?.measurement.status).toBe('not-measurable');
    expect(refactor?.measurement.notMeasurableReason).toMatch(/BETWEEN two revisions/);
  });
});

// ---------------------------------------------------------------------------
// AC2 — determinism, provenance, and inadmissible-for-blocking until calibrated
// ---------------------------------------------------------------------------

describe('admissibility (AC2)', () => {
  const measured = measureDuplication(
    facts({ symbols: [sym('a.ts#one', 'h1'), sym('b.ts#two', 'h1')] }),
  );

  it('every signal declares determinism and carries provenance naming its input', () => {
    const report = summarizeDriftSignals(
      facts({ symbols: [sym('a.ts#one', 'h1')], errorMasking: [] }),
      { baseline: facts({ contentHash: 'sha256:rev-a' }) },
    );
    for (const assessed of report.signals) {
      expect(assessed.evidence.determinism).toBe('probabilistic');
      expect(assessed.evidence.provenance.collectedBy).toContain(DRIFT_SIGNAL_SOURCE);
      expect(assessed.evidence.provenance.artifactHash).toBe('sha256:baseline');
      expect(assessed.measurement.provenance.indexer).toBe('typescript-compiler-api');
      expect(assessed.measurement.provenance.contentHash).toBe('sha256:baseline');
    }
  });

  it('asserts no collection instant by default, so a verdict is not a function of the clock', () => {
    // GT-589's end-to-end guard caught this: echoing `provenance.extractedAt` made
    // two extractions of the SAME tree produce different verdicts — the very
    // non-determinism `canonicalizeRepoFacts` removes by excluding that timestamp.
    const volatileFacts = (at: string) =>
      facts({
        symbols: [sym('a.ts#one', 'h1')],
        errorMasking: [],
        provenance: { ...facts().provenance, extractedAt: at },
      });
    const early = summarizeDriftSignals(volatileFacts('2026-01-01T00:00:00.000Z'));
    const late = summarizeDriftSignals(volatileFacts('2030-12-31T23:59:59.000Z'));
    expect(late).toEqual(early);
    expect(early.signals[0].evidence.provenance.timestamp).toBe('');
  });

  it('stamps a collection instant only when a caller explicitly asks for one', () => {
    const stamped = summarizeDriftSignals(facts({ symbols: [sym('a.ts#one', 'h1')] }), {
      observedAt: '2026-07-31T10:00:00.000Z',
    });
    expect(stamped.signals[0].evidence.provenance.timestamp).toBe('2026-07-31T10:00:00.000Z');
  });

  it('declares itself PROBABILISTIC even though the count is exact', () => {
    // The arithmetic is exact; the imputation ("duplication instead of reuse") is not.
    // Calling this deterministic would let the inference block on the strength of the count.
    expect(toEvidence(measured).determinism).toBe('probabilistic');
  });

  it('carries no calibration, and is therefore INADMISSIBLE for blocking', () => {
    const assessed = assessDriftSignal(measured);
    expect(assessed.evidence.calibration).toBeUndefined();
    expect(assessed.admissibility.blocking).toBe(false);
    expect(assessed.admissibility.admissibility).toBe('advisory-uncalibrated');
    expect(assessed.admissibility.rationale).toMatch(/GT-584/);
  });

  it('leaves the blocking-admissible set EMPTY for every signal', () => {
    const report = summarizeDriftSignals(
      facts({
        symbols: [sym('a.ts#one', 'h1'), sym('b.ts#two', 'h1')],
        errorMasking: [{ moduleId: 'a.ts', kind: 'empty-catch', line: 2 }],
      }),
      { baseline: facts({ contentHash: 'sha256:rev-a', symbols: [], errorMasking: [] }) },
    );
    expect(report.signals).toHaveLength(DRIFT_SIGNAL_IDS.length);
    expect(report.blockingAdmissible).toEqual([]);
    expect(report.signals.every((s) => s.admissibility.downgradedFromBlocking)).toBe(true);
  });

  it('goes THROUGH the GT-584 gate: findings survive the demotion instead of being hidden', () => {
    const assessed = assessDriftSignal(measured);
    expect(assessed.evidence.findings.length).toBeGreaterThan(0);
    expect(assessed.evidence.findings.every((f) => f.severity === 'info')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC3 — a conformance delta over the same repository between revisions
// ---------------------------------------------------------------------------

describe('conformance delta (AC3)', () => {
  const revision = (hash: string, symbols: SymbolFact[], masking: ErrorMaskingFact[]): RepoFacts =>
    facts({ contentHash: hash, symbols, errorMasking: masking });

  const before = revision('sha256:rev-a', [sym('a.ts#one', 'h1')], []);
  const after = revision(
    'sha256:rev-b',
    [sym('a.ts#one', 'h1'), sym('b.ts#copy', 'h1')],
    [{ moduleId: 'b.ts', kind: 'empty-catch', line: 4 }],
  );

  it('reports per-signal metric movement between two revisions', () => {
    const delta = diffDriftSignalReports(
      summarizeDriftSignals(before),
      summarizeDriftSignals(after, { baseline: before }),
    );
    expect(delta.sameInput).toBe(false);
    expect(delta.baselineContentHash).toBe('sha256:rev-a');
    expect(delta.currentContentHash).toBe('sha256:rev-b');

    const duplication = delta.signals.find((s) => s.signal === 'duplication');
    expect(duplication?.status).toBe('comparable');
    const cloned = duplication?.metrics.find((m) => m.metric === 'clonedDeclarations');
    expect(cloned).toEqual({ metric: 'clonedDeclarations', before: 0, after: 2, delta: 2 });

    const masking = delta.signals.find((s) => s.signal === 'error-masking');
    expect(masking?.metrics.find((m) => m.metric === 'errorMaskingConstructs')).toEqual({
      metric: 'errorMaskingConstructs',
      before: 0,
      after: 1,
      delta: 1,
    });
  });

  it('is zero everywhere when the two reports name the same content hash', () => {
    // This is the property GT-589's content-hashed reproducibility buys: a non-zero
    // delta is a change in the repository, not in the run that measured it.
    const report = summarizeDriftSignals(after, { baseline: before });
    const delta = diffDriftSignalReports(report, report);
    expect(delta.sameInput).toBe(true);
    const comparable = delta.signals.filter((s) => s.status === 'comparable');
    expect(comparable.length).toBeGreaterThan(0);
    for (const signal of comparable) {
      for (const metric of signal.metrics) expect(metric.delta).toBe(0);
    }
  });

  it('reports a signal as INCOMPARABLE rather than zero when either side was not measured', () => {
    const noFingerprints = summarizeDriftSignals(facts({ contentHash: 'sha256:rev-0' }));
    const delta = diffDriftSignalReports(noFingerprints, summarizeDriftSignals(after));
    const duplication = delta.signals.find((s) => s.signal === 'duplication');
    expect(duplication?.status).toBe('incomparable');
    expect(duplication?.metrics).toEqual([]);
    expect(duplication?.incomparableReason).toMatch(/A missing measurement is not a zero/);
  });

  it('covers every declared signal, in a stable order', () => {
    const delta = diffDriftSignalReports(summarizeDriftSignals(before), summarizeDriftSignals(after));
    expect(delta.signals.map((s) => s.signal)).toEqual([...DRIFT_SIGNAL_IDS]);
  });
});
