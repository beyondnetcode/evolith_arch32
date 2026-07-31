/**
 * GT-594 — the extractor produces the facts the drift signals are computed over, and
 * the Core computes real numbers over two REAL revisions of the same repository.
 *
 * This is the end-to-end half: `test/fixtures/drift-repo/rev-a` and `rev-b` are two
 * revisions of one tree in which a body is relocated (a refactor), a body is
 * reproduced under different identifiers while the original survives (a copy), a
 * genuinely new body appears, and two more error-masking constructs are introduced.
 * Nothing here is a hand-written fact object: the compiler is the source of truth.
 */

import * as path from 'path';
import {
  diffDriftSignalReports,
  measureDuplication,
  measureErrorMasking,
  measureRefactorToCopy,
  summarizeDriftSignals,
} from '@beyondnet/evolith-core-domain/evaluation/contracts';
import { extractTypeScriptFacts } from './typescript-fact-extractor';
import { isFingerprintable, structuralFingerprintOf } from './structural-fingerprint';

const FIXTURES = path.resolve(__dirname, '..', 'test', 'fixtures', 'drift-repo');

const extract = (revision: 'rev-a' | 'rev-b', now = '2026-07-31T00:00:00.000Z') =>
  extractTypeScriptFacts({
    rootDir: path.join(FIXTURES, revision),
    include: ['src'],
    revision,
    now: () => now,
  });

const symbolNamed = (facts: ReturnType<typeof extract>, id: string) =>
  facts.symbols.find((s) => s.id === id);

describe('structural fingerprints (GT-594)', () => {
  const revA = extract('rev-a');
  const revB = extract('rev-b');

  it('fingerprints declarations that have a body', () => {
    const applyDiscount = symbolNamed(revA, 'src/shared/pricing.ts#applyDiscount');
    expect(applyDiscount?.structuralHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(applyDiscount?.structuralSize).toBeGreaterThanOrEqual(20);
  });

  it('is renaming-insensitive: a Type-2 clone shares the fingerprint exactly', () => {
    const original = symbolNamed(revB, 'src/shared/pricing.ts#applyDiscount');
    const clone = symbolNamed(revB, 'src/reports/summary.ts#applyRebate');
    expect(clone?.structuralHash).toBe(original?.structuralHash);
    expect(clone?.name).not.toBe(original?.name);
  });

  it('does not collapse structurally different bodies', () => {
    const summarize = symbolNamed(revB, 'src/reports/summary.ts#summarize');
    const applyDiscount = symbolNamed(revB, 'src/shared/pricing.ts#applyDiscount');
    expect(summarize?.structuralHash).not.toBe(applyDiscount?.structuralHash);
  });

  it('leaves declarations without a body unfingerprinted rather than hashing a type', () => {
    expect(isFingerprintable({ kind: -1 } as never)).toBe(false);
    const iface = symbolNamed(revB, 'src/reports/summary.ts#Row');
    const constant = symbolNamed(revB, 'src/reports/summary.ts#LABEL');
    expect(iface).toBeDefined();
    expect(constant).toBeDefined();
    expect(iface?.structuralHash).toBeUndefined();
    expect(constant?.structuralHash).toBeUndefined();
  });

  it('is reproducible: the same tree yields the same fingerprints and the same contentHash', () => {
    const again = extract('rev-a', '2027-03-03T09:09:09.000Z');
    expect(again.contentHash).toBe(revA.contentHash);
    expect(again.symbols).toEqual(revA.symbols);
  });

  it('is a digest of the normalized kind stream, not of the source text', () => {
    // Two identical trees produce one digest; the helper is pure over the subtree.
    const a = structuralFingerprintOf({
      kind: 1,
      forEachChild: () => undefined,
    } as never);
    const b = structuralFingerprintOf({ kind: 1, forEachChild: () => undefined } as never);
    expect(a.hash).toBe(b.hash);
    expect(a.size).toBe(1);
  });
});

describe('error-masking facts (GT-594)', () => {
  const revA = extract('rev-a');
  const revB = extract('rev-b');

  it('finds the empty catch, the any-assertion and the non-null assertion in rev-a', () => {
    const kinds = (revA.errorMasking ?? []).map((e) => e.kind).sort();
    expect(kinds).toEqual(['any-assertion', 'empty-catch', 'non-null-assertion']);
    expect((revA.errorMasking ?? []).every((e) => e.moduleId === 'src/orders/checkout.ts')).toBe(true);
  });

  it('adds the swallowed rejection and the directive suppression in rev-b', () => {
    const kinds = (revB.errorMasking ?? []).map((e) => e.kind).sort();
    expect(kinds).toEqual([
      'any-assertion',
      'empty-catch',
      'non-null-assertion',
      'promise-catch-swallow',
      'ts-directive-suppression',
    ]);
  });

  it('omits the collection entirely when the pass is skipped, rather than emitting []', () => {
    const skipped = extractTypeScriptFacts({
      rootDir: path.join(FIXTURES, 'rev-a'),
      include: ['src'],
      scanErrorMasking: false,
      now: () => '2026-07-31T00:00:00.000Z',
    });
    expect(skipped.errorMasking).toBeUndefined();
    expect(measureErrorMasking(skipped).status).toBe('not-measurable');
    // …and the omission changes the content hash, so the two fact bases are not
    // mistaken for one another.
    expect(skipped.contentHash).not.toBe(extract('rev-a').contentHash);
  });
});

describe('drift signals over two real revisions (GT-594 AC1 + AC3)', () => {
  const revA = extract('rev-a');
  const revB = extract('rev-b');

  it('measures duplication appearing between the revisions', () => {
    const before = measureDuplication(revA);
    const after = measureDuplication(revB);
    expect(before.metrics.cloneClasses).toBe(0);
    expect(after.metrics.cloneClasses).toBe(1);
    expect(after.metrics.clonedDeclarations).toBe(2);
    expect(after.metrics.crossModuleCloneClasses).toBe(1);
    expect(after.metrics.duplicationRatio).toBeGreaterThan(0);
  });

  it('separates the relocated body (refactor) from the reproduced one (copy)', () => {
    const m = measureRefactorToCopy(revA, revB);
    expect(m.status).toBe('measured');
    expect(m.metrics.movedDeclarations).toBe(1);
    expect(m.metrics.copiedDeclarations).toBe(1);
    // `summarize` and `load`: bodies new to the repository, classified NOVEL rather
    // than being folded into either side of the ratio.
    expect(m.metrics.novelDeclarations).toBe(2);
    expect(m.metrics.refactorShare).toBe(0.5);
    expect(m.metrics.refactorToCopyRatio).toBe(1);
    expect(m.observations.map((o) => o.code).sort()).toEqual([
      'copied-declaration',
      'moved-declaration',
    ]);
  });

  it('reports the conformance delta per signal, and admits none of them for blocking', () => {
    const before = summarizeDriftSignals(revA);
    const after = summarizeDriftSignals(revB, { baseline: revA });

    expect(after.blockingAdmissible).toEqual([]);

    const delta = diffDriftSignalReports(before, after);
    expect(delta.sameInput).toBe(false);
    expect(delta.baselineContentHash).toBe(revA.contentHash);
    expect(delta.currentContentHash).toBe(revB.contentHash);

    const duplication = delta.signals.find((s) => s.signal === 'duplication');
    expect(duplication?.metrics.find((m) => m.metric === 'cloneClasses')).toEqual({
      metric: 'cloneClasses',
      before: 0,
      after: 1,
      delta: 1,
    });

    const masking = delta.signals.find((s) => s.signal === 'error-masking');
    expect(masking?.metrics.find((m) => m.metric === 'errorMaskingConstructs')).toEqual({
      metric: 'errorMaskingConstructs',
      before: 3,
      after: 5,
      delta: 2,
    });
    expect(masking?.metrics.find((m) => m.metric === 'swallowedErrors')).toEqual({
      metric: 'swallowedErrors',
      before: 1,
      after: 2,
      delta: 1,
    });
  });

  it('yields an all-zero delta when the same revision is measured twice', () => {
    // The reproducibility GT-589 bought is what makes a non-zero delta a statement
    // about the repository rather than about the machine that ran the extractor.
    const first = summarizeDriftSignals(extract('rev-b', '2026-01-01T00:00:00.000Z'));
    const second = summarizeDriftSignals(extract('rev-b', '2030-12-31T23:59:59.000Z'));
    const delta = diffDriftSignalReports(first, second);
    expect(delta.sameInput).toBe(true);
    const comparable = delta.signals.filter((s) => s.status === 'comparable');
    expect(comparable).toHaveLength(2); // duplication + error-masking; refactor:copy needs a baseline
    for (const signal of comparable) {
      for (const metric of signal.metrics) expect(metric.delta).toBe(0);
    }
  });
});
