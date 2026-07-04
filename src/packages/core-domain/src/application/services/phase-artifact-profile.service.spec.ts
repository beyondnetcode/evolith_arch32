import { PhaseArtifactProfileService, UNIVERSAL_PHASE_ARTIFACTS } from './phase-artifact-profile.service';
import type { TopologyDesignProfile } from './topology-catalog.service';

const svc = new PhaseArtifactProfileService();

const profiles: Record<string, Record<string, TopologyDesignProfile>> = {
  microservices: {
    construction: { conditional: [{ artifactKind: 'per-unit-ci-evidence' }, { artifactKind: 'doma-implementation-check' }] },
  },
  'event-driven': {
    construction: { conditional: [{ artifactKind: 'event-contract-implementation' }] },
  },
};
const getPhaseProfile = (topo: string, phase: string) => profiles[topo]?.[phase];

describe('PhaseArtifactProfileService (GT-434)', () => {
  it('derives the universal set for a topology with no phase-specific artifacts', () => {
    const r = svc.evaluate('construction', ['modular-monolith'], [], getPhaseProfile);
    expect(r.requiredArtifacts.sort()).toEqual([...UNIVERSAL_PHASE_ARTIFACTS.construction].sort());
    expect(r.completeness).toBe(0);
  });

  it('unions universal + topology-derived over the confirmed composition', () => {
    const r = svc.evaluate('construction', ['microservices', 'event-driven'], [], getPhaseProfile);
    // 5 universal + microservices(2) + event-driven(1) = 8 required
    expect(r.requiredArtifacts).toHaveLength(8);
    expect(r.requiredArtifacts).toEqual(expect.arrayContaining(['per-unit-ci-evidence', 'doma-implementation-check', 'event-contract-implementation']));
  });

  it('measures completeness against declared artifacts', () => {
    const declared = [...UNIVERSAL_PHASE_ARTIFACTS.construction, 'per-unit-ci-evidence'];
    const r = svc.evaluate('construction', ['microservices'], declared, getPhaseProfile);
    // required = 5 + 2 = 7; present = 6 → 86; missing = doma-implementation-check
    expect(r.completeness).toBe(86);
    expect(r.missingArtifacts).toEqual(['doma-implementation-check']);
  });

  it('keeps a topology entry with an explicit condition as conditional (not required)', () => {
    const withCondition = { construction: { conditional: [{ artifactKind: 'x-block', condition: 'f3-planned' }] } };
    const r = svc.evaluate('construction', ['t'], [], (topo, phase) => (topo === 't' ? (withCondition as any)[phase] : undefined));
    expect(r.requiredArtifacts).not.toContain('x-block');
    expect(r.conditionalArtifacts).toContain('x-block');
  });
});
