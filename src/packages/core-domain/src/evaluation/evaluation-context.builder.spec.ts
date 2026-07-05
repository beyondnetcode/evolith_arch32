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
