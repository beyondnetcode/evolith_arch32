import { evaluationFactsFromContext, manifestFromWorkspace } from './evaluation-context.builder';
import type { EvaluationContext } from './contracts';

const ctx = (over: Partial<EvaluationContext>): EvaluationContext =>
  ({ kinds: ['gate'], workspaceRef: 'ws://x', ...over }) as EvaluationContext;

describe('evaluationFactsFromContext (GT-380 L1c)', () => {
  it('returns undefined when the context declares no facts', () => {
    expect(evaluationFactsFromContext(ctx({}))).toBeUndefined();
    expect(
      evaluationFactsFromContext(ctx({ phaseId: 'construction' as any, topologyRef: 'modular-monolith' })),
    ).toBeUndefined();
  });

  it('maps artifacts.required[] → input.gate.mandatoryEvidence[].artifact', () => {
    const facts = evaluationFactsFromContext(ctx({ artifacts: { required: ['adr.md', 'prd.md'] } }));
    expect(facts?.gate?.mandatoryEvidence).toEqual([{ artifact: 'adr.md' }, { artifact: 'prd.md' }]);
  });

  it('maps artifacts.presented[].artifactId → input.evidence[].artifact', () => {
    const facts = evaluationFactsFromContext(
      ctx({ artifacts: { presented: [{ artifactId: 'adr.md' }, { artifactId: 'prd.md' }] } }),
    );
    expect(facts?.evidence).toEqual([
      { artifact: 'adr.md', status: 'present' },
      { artifact: 'prd.md', status: 'present' },
    ]);
  });

  it('maps tenant.tenantId → root tenantId and context.tenant', () => {
    const facts = evaluationFactsFromContext(ctx({ tenant: { tenantId: 't-42' } }));
    expect(facts?.tenantId).toBe('t-42');
    expect(facts?.context?.tenant).toEqual({ tenantId: 't-42' });
  });

  it('maps sdlcConfig.dod → context.dod and sdlcConfig.compliance → context.spec.compliance', () => {
    const facts = evaluationFactsFromContext(
      ctx({
        sdlcConfig: {
          dod: { coveragePercent: 85, reviewCount: 2 },
          compliance: { agnosticBaseline: 'ref/a.md' },
        },
      }),
    );
    expect(facts?.context?.dod).toEqual({ coveragePercent: 85, reviewCount: 2 });
    expect(facts?.context?.spec).toEqual({ compliance: { agnosticBaseline: 'ref/a.md' } });
  });

  it('resolves a numeric input.gate.phase from a canonical phaseId (when other facts are declared)', () => {
    const facts = evaluationFactsFromContext(
      ctx({ phaseId: 'construction' as any, artifacts: { required: ['adr.md'] } }),
    );
    expect(typeof facts?.gate?.phase).toBe('number');
  });

  it('maps customConstraints.blockingCriteria and waivers', () => {
    const facts = evaluationFactsFromContext(
      ctx({
        customConstraints: {
          blockingCriteria: ['security-review', { criterion: 'legal-review' }],
          waivers: [{ criterion: 'security-review', status: 'active', expirationDate: '2099-01-01' }],
        },
      }),
    );
    expect(facts?.gate?.blockingCriteria).toEqual([
      { criterion: 'security-review' },
      { criterion: 'legal-review' },
    ]);
    expect(facts?.waiver).toEqual([
      { criterion: 'security-review', status: 'active', expirationDate: '2099-01-01' },
    ]);
  });

  it('never projects context.satellite (FS-sourced only)', () => {
    const facts = evaluationFactsFromContext(
      ctx({ tenant: { tenantId: 't1' }, sdlcConfig: { dod: { coveragePercent: 90 } } }),
    );
    expect((facts?.context as Record<string, unknown> | undefined)?.satellite).toBeUndefined();
  });

  it('maps passthrough.evaluationDate → root evaluationDate', () => {
    const facts = evaluationFactsFromContext(
      ctx({ gateId: 'g1', passthrough: { evaluationDate: '2026-06-29' } }),
    );
    expect(facts?.evaluationDate).toBe('2026-06-29');
  });

  // -------------------------------------------------------------------------
  // GT-584 — the admissibility rule reads calibration, so the projection must
  // carry it. This is the join between the inline ADR-0111 evidence and the two
  // engines that judge it.
  // -------------------------------------------------------------------------
  describe('qualitySignals → input.qualityEvidence (GT-584)', () => {
    const calibrated = {
      source: 'llm-auditor',
      dimension: 'code-quality',
      determinism: 'probabilistic' as const,
      metrics: {},
      findings: [],
      provenance: {
        collectedBy: 'llm-auditor',
        adapterVersion: '2.1.0',
        artifactHash: '',
        timestamp: '2026-07-01T00:00:00.000Z',
      },
      calibration: {
        truePositiveRate: 0.97,
        trueNegativeRate: 0.96,
        measuredAt: '2026-06-01T00:00:00.000Z',
        sampleSize: 400,
        method: 'hand-labelled corpus',
        labelledBy: 'architecture-panel',
      },
    };

    it('projects quality evidence even when nothing ELSE is declared', () => {
      // Deliberately unlike GT-586's requester, which stays out of the trigger: a
      // context carrying only probabilistic evidence must still reach the rule, or
      // the rule goes green having refused nothing.
      const facts = evaluationFactsFromContext(ctx({ qualitySignals: [calibrated] }));
      expect(facts?.qualityEvidence).toHaveLength(1);
    });

    it('carries the calibration fields the rule reads, verbatim', () => {
      const facts = evaluationFactsFromContext(ctx({ qualitySignals: [calibrated] }));
      expect(facts?.qualityEvidence?.[0]).toEqual({
        source: 'llm-auditor',
        dimension: 'code-quality',
        determinism: 'probabilistic',
        calibration: calibrated.calibration,
      });
    });

    it('leaves calibration absent when the producer declared none (absent ≠ zeroed)', () => {
      const { calibration: _dropped, ...uncalibrated } = calibrated;
      const facts = evaluationFactsFromContext(ctx({ qualitySignals: [uncalibrated] }));
      expect(facts?.qualityEvidence?.[0]).not.toHaveProperty('calibration');
    });

    it('projects a declared admissibility policy so the floors stay arguable', () => {
      const facts = evaluationFactsFromContext(
        ctx({
          qualitySignals: [calibrated],
          customConstraints: {
            qualityAdmissibilityPolicy: { minTruePositiveRate: 0.8, maxCalibrationAgeDays: 30 },
          },
        }),
      );
      expect(facts?.qualityAdmissibilityPolicy).toEqual({
        minTruePositiveRate: 0.8,
        maxCalibrationAgeDays: 30,
      });
    });

    it('ignores a non-numeric threshold rather than letting it become a floor of NaN', () => {
      const facts = evaluationFactsFromContext(
        ctx({
          qualitySignals: [calibrated],
          customConstraints: { qualityAdmissibilityPolicy: { minTruePositiveRate: 'high' } },
        }),
      );
      expect(facts?.qualityAdmissibilityPolicy).toBeUndefined();
    });

    it('projects no quality evidence for a context that carries none', () => {
      const facts = evaluationFactsFromContext(ctx({ gateId: 'g1' }));
      expect(facts?.qualityEvidence).toBeUndefined();
    });
  });
});

describe('manifestFromWorkspace facts threading (GT-380 L1c)', () => {
  const ws = { satellitePath: '/sat', corePath: '/core' };

  it('attaches projected facts to the manifest when declared', () => {
    const m = manifestFromWorkspace(ctx({ artifacts: { required: ['adr.md'] } }), ws);
    expect(m.satellitePath).toBe('/sat');
    expect(m.facts?.gate?.mandatoryEvidence).toEqual([{ artifact: 'adr.md' }]);
  });

  it('leaves manifest.facts undefined for a minimal context', () => {
    const m = manifestFromWorkspace(ctx({}), ws);
    expect(m.facts).toBeUndefined();
  });
});
