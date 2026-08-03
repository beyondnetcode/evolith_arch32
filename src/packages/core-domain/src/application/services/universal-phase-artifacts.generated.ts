/**
 * GENERATED — do not edit by hand.
 *
 * Source: `src/rulesets/sdlc/artifact-registry.json` (GT-650 / ADR-0125). Regenerate with:
 *   node .harness/scripts/generate-universal-phase-artifacts.mjs
 *
 * The registry is the single declaration of every artifact the Core knows about. This projection
 * is the subset each downstream phase expects, `binding` and `advisory` alike, because
 * completeness counts everything a phase should contain — the classification decides what BLOCKS,
 * which is a different question and belongs to the gate evaluator.
 */

import type { DownstreamPhase } from './phase-artifact-profile.service';

// <generated>
export const UNIVERSAL_PHASE_ARTIFACTS: Readonly<Record<DownstreamPhase, readonly string[]>> = {
  construction: ['architecture-drift-result', 'ci-pipeline-result', 'coverage-report', 'definition-of-done-checklist', 'documentation-delta', 'source-change-set', 'spec-traceability-map'],
  quality: ['acceptance-validation', 'cfr-metric', 'contract-test-result', 'coverage-report', 'defect-log', 'exception-status', 'integration-evidence', 'pyramid-distribution', 'security-scan-result', 'test-summary-report'],
  deployment: ['deployment-evidence', 'observability-readiness', 'on-call-handoff', 'operational-sign-off', 'release-notes', 'release-plan', 'rollback-plan'],
};
// </generated>
