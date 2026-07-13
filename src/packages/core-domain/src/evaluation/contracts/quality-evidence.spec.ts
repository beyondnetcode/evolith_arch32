import {
  normalizeEvidence,
  resolveEvidenceSignals,
  foldQualitySignals,
  DEFAULT_QUALITY_DIMENSION,
  type Evidence,
  type RawEvidence,
} from './quality-evidence';

describe('quality-evidence (GT-533 · ADR-0111)', () => {
  const fixedNow = () => '2026-07-13T00:00:00.000Z';

  describe('normalizeEvidence (anti-corruption normalization)', () => {
    it('fills safe defaults for optional collections and provenance fields', () => {
      const raw: RawEvidence = {
        source: 'lighthouse',
        dimension: 'performance',
        determinism: 'deterministic',
        provenance: { collectedBy: 'lighthouse' },
      };

      const ev = normalizeEvidence(raw, { now: fixedNow });

      expect(ev.metrics).toEqual({});
      expect(ev.findings).toEqual([]);
      expect(ev.provenance).toEqual({
        collectedBy: 'lighthouse',
        adapterVersion: 'unknown',
        artifactHash: '',
        timestamp: '2026-07-13T00:00:00.000Z',
      });
    });

    it('preserves supplied metrics, findings and full provenance', () => {
      const ev = normalizeEvidence(
        {
          source: 'lighthouse',
          dimension: 'a11y',
          determinism: 'deterministic',
          metrics: { score: 0.92 },
          findings: [{ code: 'contrast', severity: 'high', message: 'low contrast' }],
          provenance: {
            collectedBy: 'lighthouse',
            adapterVersion: '11.0.0',
            artifactHash: 'sha256:abc',
            timestamp: '2026-07-01T00:00:00.000Z',
          },
        },
        { now: fixedNow },
      );

      expect(ev.metrics).toEqual({ score: 0.92 });
      expect(ev.findings).toHaveLength(1);
      expect(ev.provenance.adapterVersion).toBe('11.0.0');
      expect(ev.provenance.timestamp).toBe('2026-07-01T00:00:00.000Z');
    });

    it('rejects evidence without mandatory provenance (collectedBy)', () => {
      expect(() =>
        normalizeEvidence({
          source: 'x',
          dimension: 'performance',
          determinism: 'deterministic',
          provenance: {},
        }),
      ).toThrow(/provenance is mandatory/);
    });

    it.each([
      ['source', { dimension: 'p', determinism: 'deterministic', provenance: { collectedBy: 'x' } }],
      ['dimension', { source: 's', determinism: 'deterministic', provenance: { collectedBy: 'x' } }],
    ] as const)('rejects evidence missing %s', (_field, raw) => {
      expect(() => normalizeEvidence(raw as RawEvidence)).toThrow();
    });

    it('rejects an invalid determinism flag', () => {
      expect(() =>
        normalizeEvidence({
          source: 's',
          dimension: 'p',
          // @ts-expect-error invalid determinism on purpose
          determinism: 'maybe',
          provenance: { collectedBy: 'x' },
        }),
      ).toThrow(/determinism/);
    });
  });

  describe('resolveEvidenceSignals (missing evidence ⇒ no-evidence, not failure)', () => {
    const perf: Evidence = normalizeEvidence(
      {
        source: 'lighthouse',
        dimension: 'performance',
        determinism: 'deterministic',
        provenance: { collectedBy: 'lighthouse' },
      },
      { now: fixedNow },
    );

    it('marks a dimension with matching evidence as present', () => {
      const signals = resolveEvidenceSignals(['performance'], [perf]);
      expect(signals).toEqual([
        { dimension: 'performance', status: 'present', evidence: [perf] },
      ]);
    });

    it('marks a dimension with no matching evidence as no-evidence (never a failure)', () => {
      const signals = resolveEvidenceSignals(['performance', 'testing'], [perf]);
      const testing = signals.find((s) => s.dimension === 'testing');
      expect(testing).toEqual({ dimension: 'testing', status: 'no-evidence', evidence: [] });
    });

    it('treats a completely empty evidence set as all no-evidence', () => {
      const signals = resolveEvidenceSignals(['performance', 'a11y']);
      expect(signals.every((s) => s.status === 'no-evidence')).toBe(true);
    });
  });

  describe('foldQualitySignals (pipeline-side fold of inline evidence)', () => {
    const perf: Evidence = normalizeEvidence(
      { source: 'lighthouse', dimension: 'performance', determinism: 'deterministic', provenance: { collectedBy: 'lighthouse' } },
      { now: fixedNow },
    );
    const a11y: Evidence = normalizeEvidence(
      { source: 'lighthouse', dimension: 'a11y', determinism: 'deterministic', provenance: { collectedBy: 'lighthouse' } },
      { now: fixedNow },
    );

    it('surfaces a present signal per observed dimension when evidence is supplied', () => {
      const signals = foldQualitySignals([perf, a11y]);
      expect(signals).toHaveLength(2);
      expect(signals.every((s) => s.status === 'present')).toBe(true);
      expect(signals.map((s) => s.dimension).sort()).toEqual(['a11y', 'performance']);
    });

    it('deduplicates repeated dimensions and attaches all matching evidence', () => {
      const perf2: Evidence = normalizeEvidence(
        { source: 'webpagetest', dimension: 'performance', determinism: 'deterministic', provenance: { collectedBy: 'wpt' } },
        { now: fixedNow },
      );
      const signals = foldQualitySignals([perf, perf2]);
      expect(signals).toHaveLength(1);
      expect(signals[0].dimension).toBe('performance');
      expect(signals[0].evidence).toHaveLength(2);
    });

    it('surfaces a single no-evidence signal for the default dimension when no evidence is supplied', () => {
      expect(foldQualitySignals([])).toEqual([
        { dimension: DEFAULT_QUALITY_DIMENSION, status: 'no-evidence', evidence: [] },
      ]);
      expect(foldQualitySignals()).toEqual([
        { dimension: DEFAULT_QUALITY_DIMENSION, status: 'no-evidence', evidence: [] },
      ]);
    });
  });
});
