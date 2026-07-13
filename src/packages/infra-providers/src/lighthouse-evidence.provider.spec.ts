import {
  LighthouseEvidenceProvider,
  LIGHTHOUSE_PROVIDER_ID,
  LIGHTHOUSE_ADAPTER_VERSION,
  severityForScore,
  type CollectionContext,
  type LighthouseRunResult,
  type LighthouseRunner,
} from './lighthouse-evidence.provider';

/** A deterministic stub LHR so unit tests never touch Chrome. */
function stubLhr(overrides: Partial<LighthouseRunResult> = {}): LighthouseRunResult {
  return {
    lighthouseVersion: '12.0.0',
    requestedUrl: 'https://example.test/',
    finalUrl: 'https://example.test/',
    fetchTime: '2026-07-13T10:00:00.000Z',
    categories: {
      performance: { id: 'performance', title: 'Performance', score: 0.98 },
      accessibility: { id: 'accessibility', title: 'Accessibility', score: 0.72 },
      'best-practices': { id: 'best-practices', title: 'Best Practices', score: 0.4 },
      seo: { id: 'seo', title: 'SEO', score: 1 },
      pwa: { id: 'pwa', title: 'PWA', score: 0.1 },
    },
    ...overrides,
  };
}

/** A runner backed by a fixed LHR — the whole point of the injected-runner seam. */
function stubRunner(lhr: LighthouseRunResult): LighthouseRunner {
  return { run: async () => lhr };
}

const CTX: CollectionContext = { tenantId: 'tenant-1', dimension: 'performance' };
const TARGET = { url: 'https://example.test/' };
const FIXED_NOW = () => '2026-01-01T00:00:00.000Z';

describe('LighthouseEvidenceProvider', () => {
  it('exposes the stable registry id', () => {
    const provider = new LighthouseEvidenceProvider({ runner: stubRunner(stubLhr()) });
    expect(provider.id).toBe(LIGHTHOUSE_PROVIDER_ID);
    expect(provider.id).toBe('lighthouse');
  });

  describe('supports', () => {
    const provider = new LighthouseEvidenceProvider({ runner: stubRunner(stubLhr()) });

    it.each(['performance', 'a11y', 'accessibility', 'seo', 'best-practices', 'web-quality'])(
      'serves the runtime web-quality dimension %s',
      (dimension) => {
        expect(provider.supports({ tenantId: 't', dimension })).toBe(true);
      },
    );

    it('serves a collection with no declared dimension (a full run covers all)', () => {
      expect(provider.supports({ tenantId: 't' })).toBe(true);
    });

    it('does not serve an unrelated dimension', () => {
      expect(provider.supports({ tenantId: 't', dimension: 'testing' })).toBe(false);
    });
  });

  describe('collect → normalized Evidence', () => {
    it('emits deterministic Evidence with full provenance', async () => {
      const provider = new LighthouseEvidenceProvider({
        runner: stubRunner(stubLhr()),
        now: FIXED_NOW,
      });

      const evidence = await provider.collect(TARGET, CTX);

      expect(evidence.source).toBe('lighthouse');
      expect(evidence.dimension).toBe('performance');
      expect(evidence.determinism).toBe('deterministic');

      // Full, mandatory provenance.
      expect(evidence.provenance.collectedBy).toBe('lighthouse');
      expect(evidence.provenance.adapterVersion).toBe(LIGHTHOUSE_ADAPTER_VERSION);
      expect(evidence.provenance.artifactHash).toMatch(/^[a-f0-9]{64}$/);
      // Timestamp comes from the LHR fetchTime, not the clock fallback.
      expect(evidence.provenance.timestamp).toBe('2026-07-13T10:00:00.000Z');
    });

    it('maps each Lighthouse category to a 0..100 metric', async () => {
      const provider = new LighthouseEvidenceProvider({ runner: stubRunner(stubLhr()), now: FIXED_NOW });
      const evidence = await provider.collect(TARGET, CTX);

      expect(evidence.metrics).toEqual({
        performance: 98,
        a11y: 72,
        'best-practices': 40,
        seo: 100,
      });
      // 'pwa' is outside the mapped set and is ignored.
      expect(evidence.metrics).not.toHaveProperty('pwa');
    });

    it('maps each category to a finding with severity derived from the score', async () => {
      const provider = new LighthouseEvidenceProvider({ runner: stubRunner(stubLhr()), now: FIXED_NOW });
      const evidence = await provider.collect(TARGET, CTX);

      const byCode = Object.fromEntries(evidence.findings.map((f) => [f.code, f]));

      expect(byCode['lighthouse.performance'].severity).toBe('info'); // 0.98
      expect(byCode['lighthouse.a11y'].severity).toBe('medium'); // 0.72 → medium
      expect(byCode['lighthouse.best-practices'].severity).toBe('high'); // 0.40 → high
      expect(byCode['lighthouse.seo'].severity).toBe('info'); // 1.0

      // Every finding references the audited URL, never a copy of content.
      for (const finding of evidence.findings) {
        expect(finding.location).toBe('https://example.test/');
        expect(finding.message).toContain('/100');
      }
    });

    it('is deterministic: same LHR ⇒ identical evidence (hash + shape)', async () => {
      const lhr = stubLhr();
      const a = await new LighthouseEvidenceProvider({ runner: stubRunner(lhr), now: FIXED_NOW }).collect(TARGET, CTX);
      const b = await new LighthouseEvidenceProvider({ runner: stubRunner(lhr), now: FIXED_NOW }).collect(TARGET, CTX);
      expect(a).toEqual(b);
    });

    it('falls back to the injected clock when the LHR has no fetchTime', async () => {
      const lhr = stubLhr({ fetchTime: undefined });
      const provider = new LighthouseEvidenceProvider({ runner: stubRunner(lhr), now: FIXED_NOW });
      const evidence = await provider.collect(TARGET, CTX);
      expect(evidence.provenance.timestamp).toBe('2026-01-01T00:00:00.000Z');
    });

    it("defaults the dimension to 'web-quality' when the context declares none", async () => {
      const provider = new LighthouseEvidenceProvider({ runner: stubRunner(stubLhr()), now: FIXED_NOW });
      const evidence = await provider.collect(TARGET, { tenantId: 't' });
      expect(evidence.dimension).toBe('web-quality');
    });

    it('skips categories whose score is null', async () => {
      const lhr = stubLhr({
        categories: {
          performance: { id: 'performance', title: 'Performance', score: null },
          seo: { id: 'seo', title: 'SEO', score: 0.8 },
        },
      });
      const provider = new LighthouseEvidenceProvider({ runner: stubRunner(lhr), now: FIXED_NOW });
      const evidence = await provider.collect(TARGET, CTX);
      expect(evidence.metrics).toEqual({ seo: 80 });
      expect(evidence.findings.map((f) => f.code)).toEqual(['lighthouse.seo']);
    });

    it('rejects a target without a URL (Lighthouse is a runtime auditor)', async () => {
      const provider = new LighthouseEvidenceProvider({ runner: stubRunner(stubLhr()), now: FIXED_NOW });
      await expect(provider.collect({}, CTX)).rejects.toThrow(/requires target\.url/);
    });
  });
});

describe('severityForScore', () => {
  it.each([
    [1, 'info'],
    [0.9, 'info'],
    [0.89, 'low'],
    [0.75, 'low'],
    [0.74, 'medium'],
    [0.5, 'medium'],
    [0.49, 'high'],
    [0.25, 'high'],
    [0.24, 'critical'],
    [0, 'critical'],
  ] as const)('score %f → %s', (score, severity) => {
    expect(severityForScore(score)).toBe(severity);
  });
});
