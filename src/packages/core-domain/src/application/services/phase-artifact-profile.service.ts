/**
 * PhaseArtifactProfileService (GT-434 / ADR-0104 · DN-06).
 *
 * ADVISORY, stateless: for a downstream SDLC phase (construction/quality/
 * deployment) it derives the expected artifact set as the UNION of the universal
 * per-phase artifacts and the topology-derived artifacts of the confirmed
 * composition (from each topology's `spec.phaseProfiles`), then measures
 * completeness against the artifacts the consumer declares. Mirrors the design
 * evaluator. Non-binding: the Tracker's gate decides.
 */

import type { TopologyDesignProfile } from './topology-catalog.service';

export type DownstreamPhase = 'construction' | 'quality' | 'deployment';

/**
 * Universal per-phase artifacts (any topology). Minimum gate evidence, Vision §5.2.
 */
export const UNIVERSAL_PHASE_ARTIFACTS: Readonly<Record<DownstreamPhase, readonly string[]>> = {
  construction: ['source-change-set', 'ci-pipeline-result', 'definition-of-done-checklist', 'architecture-drift-result', 'spec-traceability-map'],
  quality: ['test-summary-report', 'coverage-report', 'security-scan-result', 'contract-test-result', 'cfr-metric', 'defect-log', 'exception-status'],
  deployment: ['release-plan', 'observability-readiness', 'rollback-plan', 'operational-sign-off', 'deployment-evidence', 'release-notes'],
};

export interface PhaseArtifactResult {
  readonly phase: DownstreamPhase;
  readonly requiredArtifacts: readonly string[];
  readonly presentArtifacts: readonly string[];
  readonly missingArtifacts: readonly string[];
  /** Completeness 0..100 (advisory). */
  readonly completeness: number;
  /** Truly-conditional artifacts (declare a `condition`); informational. */
  readonly conditionalArtifacts: readonly string[];
}

export class PhaseArtifactProfileService {
  /**
   * @param phase downstream phase
   * @param confirmedTopologies confirmed topology composition
   * @param declaredArtifacts artifactKinds the consumer declares as present
   * @param getPhaseProfile resolves a topology's phaseProfile for the phase
   */
  evaluate(
    phase: DownstreamPhase,
    confirmedTopologies: readonly string[],
    declaredArtifacts: readonly string[],
    getPhaseProfile: (topologyRef: string, phase: DownstreamPhase) => TopologyDesignProfile | undefined,
  ): PhaseArtifactResult {
    const required = new Set<string>(UNIVERSAL_PHASE_ARTIFACTS[phase]);
    const conditional = new Set<string>();

    for (const topo of confirmedTopologies) {
      const profile = getPhaseProfile(topo, phase);
      for (const d of profile?.required ?? []) required.add(d.artifactKind);
      // A topology's `conditional` entry with NO explicit condition is required
      // when that topology is confirmed; a `condition` keeps it truly conditional.
      for (const d of profile?.conditional ?? []) {
        if (d.condition) conditional.add(d.artifactKind);
        else required.add(d.artifactKind);
      }
    }

    const present = new Set(declaredArtifacts);
    const requiredArtifacts = [...required];
    const presentArtifacts = requiredArtifacts.filter((k) => present.has(k));
    const missingArtifacts = requiredArtifacts.filter((k) => !present.has(k));
    const completeness = Math.round((100 * presentArtifacts.length) / Math.max(1, requiredArtifacts.length));

    return { phase, requiredArtifacts, presentArtifacts, missingArtifacts, completeness, conditionalArtifacts: [...conditional] };
  }
}
