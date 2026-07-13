/**
 * GT-535 — Structural-review rubric → code-quality agent skill + Quality Gate.
 *
 * Verifies the three acceptance criteria:
 *  - findings are RANKED by the rubric's severity hierarchy;
 *  - the emitted Evidence carries `determinism: 'probabilistic'` + provenance/attribution;
 *  - the deterministic gate maps a critical structural regression to BLOCKING.
 */

import type {
  RawStructuralFinding,
  IStructuralReviewer,
  StructuralReviewInput,
} from '../domain/ports/structural-reviewer.port';
import {
  StructuralReviewProvider,
  STRUCTURAL_REVIEW_PROVIDER_ID,
  rankStructuralFindings,
  summarizeSeverities,
} from '../application/structural-review-provider';
import {
  evaluateStructuralGate,
  decideForSeverity,
  DEFAULT_STRUCTURAL_GATE_POLICY,
  type StructuralGatePolicy,
} from '../application/structural-quality-gate';
import {
  RUBRIC_ATTRIBUTION,
  STRUCTURAL_RUBRIC_VERSION,
  STRUCTURAL_STANDARDS,
  STRUCTURAL_SEVERITY_RANK,
  compareSeverity,
} from '../domain/rubrics/structural-review-rubric';
import type { CollectionContext, CollectionTarget } from '../domain/ports/quality-signal-provider.port';

/** A deterministic stub reviewer standing in for the probabilistic LLM/agent. */
function stubReviewer(findings: readonly RawStructuralFinding[]): IStructuralReviewer {
  return {
    review: async (_input: StructuralReviewInput) => findings,
  };
}

const FIXED_NOW = () => '2026-07-13T00:00:00.000Z';
const ctx: CollectionContext = { tenantId: 't-1', dimension: 'code-quality' };
const target: CollectionTarget = { repositoryRef: 'repo@abc123' };

describe('structural-review rubric (GT-535)', () => {
  it('encodes seven distinct structural standards with a total severity hierarchy', () => {
    expect(STRUCTURAL_STANDARDS).toHaveLength(7);
    const ids = new Set(STRUCTURAL_STANDARDS.map((s) => s.id));
    expect(ids.size).toBe(7);
    // The hierarchy is total and strictly ordered.
    expect(STRUCTURAL_SEVERITY_RANK).toEqual({ info: 0, low: 1, medium: 2, high: 3, critical: 4 });
    expect(compareSeverity('critical', 'high')).toBeGreaterThan(0);
    expect(compareSeverity('info', 'low')).toBeLessThan(0);
  });

  it('cites the source methodology (attribution respected, not copied)', () => {
    expect(RUBRIC_ATTRIBUTION.methodology).toMatch(/structural/i);
    expect(RUBRIC_ATTRIBUTION.note).toMatch(/own words/i);
  });
});

describe('rankStructuralFindings', () => {
  it('ranks findings most-severe first, stable within a severity', () => {
    const findings: RawStructuralFinding[] = [
      { standardId: 'file-size-discipline', severity: 'low', message: 'big file' },
      { standardId: 'layering-and-boundaries', severity: 'critical', message: 'domain imports infra' },
      { standardId: 'code-judo', severity: 'medium', message: 'over-engineered' },
      { standardId: 'spaghetti-detection', severity: 'high', message: 'deep nesting' },
      { standardId: 'dead-code-and-scope', severity: 'low', message: 'unused export' },
    ];

    const ranked = rankStructuralFindings(findings);

    expect(ranked.map((f) => f.severity)).toEqual(['critical', 'high', 'medium', 'low', 'low']);
    // Stable tie-break: 'big file' (input index 0) precedes 'unused export' (index 4).
    expect(ranked[3].message).toBe('big file');
    expect(ranked[4].message).toBe('unused export');
    // Pure: input not mutated.
    expect(findings[0].severity).toBe('low');
  });
});

describe('StructuralReviewProvider.collect', () => {
  const findings: RawStructuralFinding[] = [
    { standardId: 'file-size-discipline', severity: 'low', message: 'big file', location: 'a.ts' },
    { standardId: 'layering-and-boundaries', severity: 'critical', message: 'domain imports infra', location: 'b.ts:12' },
    { standardId: 'code-judo', severity: 'medium', message: 'over-engineered', location: 'c.ts' },
  ];

  it('emits probabilistic Evidence with ranked findings and full provenance/attribution', async () => {
    const provider = new StructuralReviewProvider(stubReviewer(findings), { now: FIXED_NOW });

    const evidence = await provider.collect(target, ctx);

    // Determinism class is probabilistic (LLM/agent-derived) — never deterministic.
    expect(evidence.determinism).toBe('probabilistic');
    expect(evidence.dimension).toBe('code-quality');
    expect(evidence.source).toBe('structural-review');

    // Findings ranked by severity, most-severe first, and coded to the rubric standard.
    expect(evidence.findings.map((f) => f.severity)).toEqual(['critical', 'medium', 'low']);
    expect(evidence.findings[0].code).toBe('structural-review.layering-and-boundaries');

    // Mandatory provenance stamped + attributed to this provider and the rubric version.
    expect(evidence.provenance.collectedBy).toBe(STRUCTURAL_REVIEW_PROVIDER_ID);
    expect(evidence.provenance.adapterVersion).toBe(STRUCTURAL_RUBRIC_VERSION);
    expect(evidence.provenance.artifactHash).toMatch(/^[0-9a-f]{64}$/);
    expect(evidence.provenance.timestamp).toBe('2026-07-13T00:00:00.000Z');

    // Metrics summarize the severity distribution + peak rank.
    expect(evidence.metrics.findings).toBe(3);
    expect(evidence.metrics['severity.critical']).toBe(1);
    expect(evidence.metrics.peakSeverityRank).toBe(STRUCTURAL_SEVERITY_RANK.critical);
  });

  it('supports the code-quality dimension and an undeclared dimension', () => {
    const provider = new StructuralReviewProvider(stubReviewer([]));
    expect(provider.supports({ tenantId: 't-1' })).toBe(true);
    expect(provider.supports({ tenantId: 't-1', dimension: 'code-quality' })).toBe(true);
    expect(provider.supports({ tenantId: 't-1', dimension: 'performance' })).toBe(false);
  });

  it('emits probabilistic no-finding Evidence when the reviewer is clean', async () => {
    const provider = new StructuralReviewProvider(stubReviewer([]), { now: FIXED_NOW });
    const evidence = await provider.collect(target, ctx);
    expect(evidence.determinism).toBe('probabilistic');
    expect(evidence.findings).toEqual([]);
    expect(evidence.metrics.peakSeverityRank).toBe(0);
  });
});

describe('summarizeSeverities', () => {
  it('counts per severity and reports the peak rank', () => {
    const metrics = summarizeSeverities([
      { standardId: 'code-judo', severity: 'medium', message: 'm' },
      { standardId: 'spaghetti-detection', severity: 'high', message: 'h' },
      { standardId: 'abstraction-quality', severity: 'high', message: 'h2' },
    ]);
    expect(metrics['severity.high']).toBe(2);
    expect(metrics['severity.medium']).toBe(1);
    expect(metrics.peakSeverityRank).toBe(STRUCTURAL_SEVERITY_RANK.high);
  });
});

describe('Structural Quality Gate (deterministic severity → decision)', () => {
  it('maps a critical structural regression to BLOCKING', async () => {
    const provider = new StructuralReviewProvider(
      stubReviewer([
        { standardId: 'layering-and-boundaries', severity: 'critical', message: 'domain imports infra' },
        { standardId: 'file-size-discipline', severity: 'low', message: 'big file' },
      ]),
      { now: FIXED_NOW },
    );
    const evidence = await provider.collect(target, ctx);

    const result = evaluateStructuralGate([evidence]);

    expect(result.decision).toBe('block');
    expect(result.blocking).toBe(true);
    expect(result.peakSeverity).toBe('critical');
    expect(result.triggeringFindings.map((f) => f.code)).toContain('structural-review.layering-and-boundaries');
  });

  it('is deterministic: same evidence → same decision', () => {
    const evidence = {
      source: 'structural-review',
      dimension: 'code-quality',
      metrics: {},
      findings: [{ code: 'structural-review.spaghetti-detection', severity: 'high' as const, message: 'x' }],
      determinism: 'probabilistic' as const,
      provenance: { collectedBy: 'structural-review', adapterVersion: '1.0.0', artifactHash: 'h', timestamp: 't' },
    };
    const a = evaluateStructuralGate([evidence]);
    const b = evaluateStructuralGate([evidence]);
    expect(a).toEqual(b);
    expect(a.decision).toBe('block'); // high blocks under the default policy.
  });

  it('warns on a medium peak and passes when only low/info findings exist', () => {
    const mk = (severity: 'medium' | 'low') => ({
      source: 'structural-review',
      dimension: 'code-quality',
      metrics: {},
      findings: [{ code: 'structural-review.code-judo', severity, message: 'x' }],
      determinism: 'probabilistic' as const,
      provenance: { collectedBy: 'structural-review', adapterVersion: '1.0.0', artifactHash: 'h', timestamp: 't' },
    });
    expect(evaluateStructuralGate([mk('medium')]).decision).toBe('warn');
    expect(evaluateStructuralGate([mk('medium')]).blocking).toBe(false);
    expect(evaluateStructuralGate([mk('low')]).decision).toBe('pass');
  });

  it('passes on empty evidence (no findings)', () => {
    const result = evaluateStructuralGate([]);
    expect(result.decision).toBe('pass');
    expect(result.blocking).toBe(false);
    expect(result.triggeringFindings).toEqual([]);
  });

  it('honors a custom policy (stricter thresholds)', () => {
    const strict: StructuralGatePolicy = { blockAtOrAbove: 'medium', warnAtOrAbove: 'low' };
    expect(decideForSeverity('medium', strict)).toBe('block');
    expect(decideForSeverity('low', strict)).toBe('warn');
    expect(decideForSeverity('info', strict)).toBe('pass');
    // Default policy is more lenient than the strict one for 'medium'.
    expect(decideForSeverity('medium', DEFAULT_STRUCTURAL_GATE_POLICY)).toBe('warn');
  });
});
