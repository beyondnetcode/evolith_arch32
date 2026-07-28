import {
  normalizeEvidence,
  resolveEvidenceSignals,
  foldQualitySignals,
  admitEvidenceBlocking,
  assessEvidenceAdmissibility,
  admissibleBlockingEvidence,
  DEFAULT_QUALITY_DIMENSION,
  DEFAULT_EVIDENCE_ADMISSIBILITY_POLICY,
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

  // -------------------------------------------------------------------------
  // GT-584 — calibration on Evidence, and the condition that reads it.
  // -------------------------------------------------------------------------
  describe('calibration on Evidence (GT-584 AC2)', () => {
    /** "Now" for every staleness assertion below — no wall clock in a test. */
    const NOW = () => new Date('2026-07-28T00:00:00.000Z');
    const policy = { ...DEFAULT_EVIDENCE_ADMISSIBILITY_POLICY, now: NOW };

    const llm = (calibration?: RawEvidence['calibration']): Evidence =>
      normalizeEvidence(
        {
          source: 'llm-auditor',
          dimension: 'code-quality',
          determinism: 'probabilistic',
          findings: [{ code: 'god-class', severity: 'high', message: 'god class' }],
          provenance: { collectedBy: 'llm-auditor', adapterVersion: '2.1.0' },
          calibration,
        },
        { now: fixedNow },
      );

    const fresh = {
      truePositiveRate: 0.97,
      trueNegativeRate: 0.96,
      measuredAt: '2026-06-01T00:00:00.000Z',
      sampleSize: 400,
      method: 'hand-labelled corpus, two raters',
      labelledBy: 'architecture-panel',
    };

    it('carries the calibration fields through normalization, verbatim', () => {
      expect(llm(fresh).calibration).toEqual(fresh);
    });

    it('leaves calibration ABSENT when the producer declares none (absent ≠ zeroed)', () => {
      const ev = llm();
      expect(ev.calibration).toBeUndefined();
      expect('calibration' in ev).toBe(false);
    });

    it('rejects a calibration that is present but unreadable, instead of filing it as unmeasured', () => {
      // 95 is a percentage, not a rate: silently dropping it would report a
      // well-measured provider as uncalibrated and hide the real defect.
      expect(() => llm({ ...fresh, truePositiveRate: 95 })).toThrow(/\[0,1\]/);
      expect(() => llm({ ...fresh, trueNegativeRate: -0.1 })).toThrow(/\[0,1\]/);
      expect(() => llm({ ...fresh, measuredAt: 'last tuesday' })).toThrow(/ISO-8601/);
      expect(() => llm({ truePositiveRate: 0.99, trueNegativeRate: 0.99 })).toThrow(/ISO-8601/);
      expect(() => llm({ ...fresh, sampleSize: 0 })).toThrow(/positive integer/);
    });

    describe('admitEvidenceBlocking — a signal lacking the fields cannot block', () => {
      it('REFUSES to block on a probabilistic signal with no measured error rate', () => {
        const d = admitEvidenceBlocking(llm(), policy);
        expect(d.blocking).toBe(false);
        expect(d.admissibility).toBe('advisory-uncalibrated');
        expect(d.downgradedFromBlocking).toBe(true); // the demotion is never silent
        expect(d.confidence).toBeUndefined();
        expect(d.rationale).toMatch(/unmeasured guess/);
      });

      it('admits a probabilistic signal whose fresh measurement clears the policy', () => {
        const d = admitEvidenceBlocking(llm(fresh), policy);
        expect(d.blocking).toBe(true);
        expect(d.admissibility).toBe('calibrated');
        expect(d.confidence).toBe(0.97);
        expect(d.downgradedFromBlocking).toBe(false);
      });

      it('degrades a measured-but-too-inaccurate signal to advisory', () => {
        const d = admitEvidenceBlocking(llm({ ...fresh, truePositiveRate: 0.6 }), policy);
        expect(d.blocking).toBe(false);
        expect(d.admissibility).toBe('advisory-below-threshold');
        expect(d.rationale).toMatch(/TPR 0\.6/);
      });

      it('degrades a STALE calibration to advisory (AC3)', () => {
        const d = admitEvidenceBlocking(
          llm({ ...fresh, measuredAt: '2020-01-01T00:00:00.000Z' }),
          policy,
        );
        expect(d.blocking).toBe(false);
        expect(d.admissibility).toBe('advisory-stale-calibration');
        expect(d.rationale).toMatch(/days old/);
      });

      it('leaves a DETERMINISTIC signal alone — it is not a guess and needs no rate', () => {
        const lighthouse = normalizeEvidence(
          {
            source: 'lighthouse',
            dimension: 'performance',
            determinism: 'deterministic',
            provenance: { collectedBy: 'lighthouse' },
          },
          { now: fixedNow },
        );
        const d = admitEvidenceBlocking(lighthouse, policy);
        expect(d.blocking).toBe(true);
        expect(d.admissibility).toBe('deterministic');
        expect(d.downgradedFromBlocking).toBe(false);
      });

      it('honours an overridden policy, so the thresholds are arguable rather than baked in', () => {
        const lax = { ...policy, minTruePositiveRate: 0.5, minTrueNegativeRate: 0.5 };
        const ev = llm({ ...fresh, truePositiveRate: 0.6, trueNegativeRate: 0.6 });
        expect(admitEvidenceBlocking(ev, policy).blocking).toBe(false);
        expect(admitEvidenceBlocking(ev, lax).blocking).toBe(true);
      });
    });

    describe('assessEvidenceAdmissibility / admissibleBlockingEvidence', () => {
      it('reports one decision per received item and never drops a demoted one', () => {
        const items = [llm(), llm(fresh)];
        const decisions = assessEvidenceAdmissibility(items, policy);

        expect(decisions).toHaveLength(2);
        expect(decisions.map((d) => d.admissibility)).toEqual([
          'advisory-uncalibrated',
          'calibrated',
        ]);
        expect(decisions.every((d) => d.source === 'llm-auditor')).toBe(true);
      });

      it('filters the blocking set down to what may actually block', () => {
        const calibrated = llm(fresh);
        const admissible = admissibleBlockingEvidence([llm(), calibrated], policy);
        expect(admissible).toEqual([calibrated]);
      });

      it('is empty-safe', () => {
        expect(assessEvidenceAdmissibility()).toEqual([]);
        expect(admissibleBlockingEvidence()).toEqual([]);
      });
    });
  });
});
