/**
 * GT-571 — applicability is a pure decision.
 *
 * The integration half of this gap — the REAL init scaffolder validated against
 * the REAL corpus — lives in `infra-providers`, where the disk adapters it needs
 * are declared. It was here originally and imported
 * `../../../../infra-providers/src/...` across a package boundary, which broke
 * core-domain's own CI job (the subpath resolves through dist) and inverted the
 * hexagonal direction this product exists to enforce. The boundary guard did not
 * catch it because every boundaries config excludes spec files.
 */

import {
  ApplicabilityContext,
  notApplicableReason,
  readSatelliteDeclaration,
} from './rule-applicability';

describe('GT-571 · applicability is a pure decision with permissive defaults', () => {
  const satellite: ApplicabilityContext = {
    audience: 'satellite', declaredTopologies: [], sdlcPhase: 0,
  };

  it('applies an unannotated rule to everything', () => {
    expect(notApplicableReason(undefined, satellite)).toBeUndefined();
    expect(notApplicableReason({ audience: 'both' }, satellite)).toBeUndefined();
  });

  it('excludes on audience, topology and phase — and names which', () => {
    expect(notApplicableReason({ audience: 'core' }, satellite)).toBe('audience');
    expect(notApplicableReason({ audience: 'both', topologies: ['serverless'] }, satellite)).toBe('topology');
    expect(notApplicableReason({ audience: 'both', appliesFromSdlcPhase: 3 }, satellite)).toBe('sdlc-phase');
  });

  it('keeps a topology rule when the repository declares that topology', () => {
    const declared: ApplicabilityContext = {
      audience: 'satellite', declaredTopologies: ['serverless'], sdlcPhase: 3,
    };
    expect(notApplicableReason({ audience: 'both', topologies: ['serverless'] }, declared)).toBeUndefined();
    expect(notApplicableReason({ audience: 'both', topologies: ['event-driven'] }, declared)).toBe('topology');
  });

  it('does not gate on a phase the repository never declared (fail-open)', () => {
    const undeclared: ApplicabilityContext = {
      audience: 'satellite', declaredTopologies: [], sdlcPhase: undefined,
    };
    expect(notApplicableReason({ audience: 'both', appliesFromSdlcPhase: 5 }, undeclared)).toBeUndefined();
  });
});

describe('GT-571 · reading the declaration out of both manifest shapes', () => {
  it('reads the canonical satellite contract', () => {
    const decl = readSatelliteDeclaration({
      apiVersion: 'evolith.dev/v1',
      kind: 'Satellite',
      metadata: { name: 'evolith', phase: 'F1', architectureVersion: '0.1.0' },
      spec: {
        sdlc: { currentPhase: 3, gates: {} },
        design: { topology: { confirmed: ['event-driven'] } },
      },
    });

    expect(decl.sdlcPhase).toBe(3);
    expect(new Set(decl.topologies)).toEqual(new Set(['modular-monolith', 'event-driven']));
  });

  it('reads the shape `evolith init` actually writes today', () => {
    // This is the manifest the scaffolder emits — NOT the canonical contract.
    // Ignoring it would have fixed nothing, since it is the very repository the
    // acceptance criterion is about.
    const decl = readSatelliteDeclaration({
      coreRef: { version: '1.0.0', path: '../evolith' },
      governance: { version: '1.0.0' },
      product: { name: 'my-sat', type: 'enterprise-application', phase: 'phase-0' },
    });

    expect(decl.sdlcPhase).toBe(0);
    expect(decl.topologies).toEqual([]);
    expect(decl.audience).toBeUndefined();
  });

  it('honours an explicit audience override', () => {
    expect(readSatelliteDeclaration({ metadata: { audience: 'core' } }).audience).toBe('core');
  });

  it('survives a manifest it cannot make sense of', () => {
    expect(readSatelliteDeclaration(null)).toEqual({ topologies: [] });
    expect(readSatelliteDeclaration('not an object')).toEqual({ topologies: [] });
  });
});
