/**
 * Phase-artifacts E2E (GT-434 / DN-06). Exercises PhaseArtifactProfileService
 * against the REAL corpus: reads the topology manifests' spec.phaseProfiles and
 * derives the expected downstream artifact set. Also checks the phase-artifact
 * registry catalogues every artifactKind the universal set + manifests use (CoC).
 */

import * as fs from 'fs';
import * as path from 'path';
import { PhaseArtifactProfileService, UNIVERSAL_PHASE_ARTIFACTS, DownstreamPhase } from './phase-artifact-profile.service';

const repoRoot = path.resolve(__dirname, '../../../../../..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(repoRoot, rel), 'utf8'));

const MANIFEST: Record<string, string> = {
  microservices: 'reference/core/architecture/topologies/progressive-axis/microservices/topology.manifest.json',
  'event-driven': 'src/rulesets/topologies/event-driven/topology.manifest.json',
};
const getPhaseProfile = (topo: string, phase: DownstreamPhase) => {
  const rel = MANIFEST[topo];
  return rel ? readJson(rel).spec.phaseProfiles?.[phase] : undefined;
};

describe('Phase-artifacts E2E (GT-434, real corpus)', () => {
  const svc = new PhaseArtifactProfileService();

  it('derives the construction artifact set from the real manifests (union over the composition)', () => {
    const r = svc.evaluate('construction', ['microservices', 'event-driven'], [], getPhaseProfile);
    // 5 universal + microservices(per-unit-ci, doma) + event-driven(event-contract-impl) = 8
    // 7 universal + 3 topology-derived = 10. Was 5 universal until GT-650 / ADR-0125: the
    // hand-written constant omitted `coverage-report` and `documentation-delta`, both required by
    // gate-f3. The union with the real manifests is unchanged; what grew is the universal half,
    // and it grew towards what the gates already demanded.
    expect(r.requiredArtifacts).toHaveLength(10);
    expect(r.requiredArtifacts).toEqual(
      expect.arrayContaining(['per-unit-ci-evidence', 'doma-implementation-check', 'event-contract-implementation', ...UNIVERSAL_PHASE_ARTIFACTS.construction]),
    );
    expect(r.completeness).toBe(0);
  });

  it('the phase-artifact registry catalogues every universal + manifest artifactKind (CoC completeness)', () => {
    const registry = readJson('src/rulesets/schema/phase-artifact-registry.json');
    const catalogued = new Set<string>(registry.artifacts.map((a: { artifactKind: string }) => a.artifactKind));

    // universal
    for (const phase of Object.keys(UNIVERSAL_PHASE_ARTIFACTS) as DownstreamPhase[]) {
      for (const k of UNIVERSAL_PHASE_ARTIFACTS[phase]) expect(catalogued.has(k)).toBe(true);
    }
    // topology-derived from the manifests
    for (const rel of Object.values(MANIFEST)) {
      const pp = readJson(rel).spec.phaseProfiles ?? {};
      for (const profile of Object.values(pp) as any[]) {
        for (const d of [...(profile.required ?? []), ...(profile.conditional ?? [])]) {
          expect(catalogued.has(d.artifactKind)).toBe(true);
        }
      }
    }
  });
});
