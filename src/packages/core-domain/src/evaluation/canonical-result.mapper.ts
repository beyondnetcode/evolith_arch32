/**
 * Maps the legacy pipeline output (EvaluationVerdict, verdict 'passed'/'failed')
 * to the canonical EvaluationResult (Verdict enum). GT-378 / ADR-0101.
 *
 * Pure function — no I/O, no state.
 */

import type { EvaluationVerdict } from '../domain/satellite-manifest';
import { Verdict, fromLegacyGateEvidence } from '../domain/verdict/verdict';
import { normalizePhaseId } from '../domain/sdlc/phase-id';
import {
  EvaluationResult,
  EVALUATION_RESULT_SCHEMA_VERSION,
  GateEvaluationResult,
  ArtifactEvaluationResult,
  GapFinding,
  RequiredAction,
  RuleExecutionRef,
  ComplianceResult,
  DecisionRecommendation,
} from './contracts';

export interface MapOptions {
  readonly coreVersion: string;
  readonly correlationId?: string;
  readonly ruleset?: string;
  readonly rulesetVersion?: string;
  readonly evaluatedAt: string;
  /** Optional non-binding decision recommendation (built by the orchestrator from context). */
  readonly decisionRecommendation?: DecisionRecommendation;
}

export function mapPipelineVerdict(
  verdict: EvaluationVerdict,
  opts: MapOptions,
): EvaluationResult {
  const gates: GateEvaluationResult[] = [];
  const allArtifacts: ArtifactEvaluationResult[] = [];
  const allGaps: GapFinding[] = [];
  const allActions: RequiredAction[] = [];
  const policiesApplied: RuleExecutionRef[] = [];
  const incompleteArtifacts = new Set<string>();

  for (const g of verdict.gates) {
    const artifactResults: ArtifactEvaluationResult[] = [];
    const gateGaps: GapFinding[] = [];
    const gateActions: RequiredAction[] = [];

    for (const ev of g.artifactEvaluations) {
      const evVerdict = ev.passed ? Verdict.PASS : Verdict.FAIL;
      const ar: ArtifactEvaluationResult = {
        artifactId: ev.artifact,
        verdict: evVerdict,
        present: ev.passed,
        ruleRefs: [ev.ruleId],
        gaps: ev.passed
          ? []
          : [{
              id: `${g.gateId}:${ev.ruleId}`,
              requirementRef: ev.ruleId,
              severity: ev.severity,
              message: ev.message,
              location: ev.artifact,
            }],
      };
      artifactResults.push(ar);
      allArtifacts.push(ar);

      policiesApplied.push({
        ruleId: ev.ruleId,
        rulesetRef: ev.rulePath,
        engine: 'opa',
        verdict: evVerdict,
      });

      if (!ev.passed) {
        incompleteArtifacts.add(ev.artifact);
        const gap: GapFinding = {
          id: `${g.gateId}:${ev.ruleId}`,
          requirementRef: ev.ruleId,
          severity: ev.severity,
          message: ev.message,
          location: ev.artifact,
        };
        gateGaps.push(gap);
        allGaps.push(gap);
        const action: RequiredAction = {
          id: `fix:${g.gateId}:${ev.ruleId}`,
          gapId: gap.id,
          description: ev.message,
          blocking: ev.severity === 'error',
          remediation: ev.remediation,
        };
        gateActions.push(action);
        allActions.push(action);
      }
    }

    gates.push({
      gateId: g.gateId,
      phaseId: normalizePhaseId(g.phase) ?? undefined,
      verdict: fromLegacyGateEvidence(g.verdict),
      artifactResults,
      risks: [],
      gaps: gateGaps,
      requiredActions: gateActions,
    });
  }

  const s = verdict.summary;
  const compliance: ComplianceResult = {
    verdict: verdict.passed ? Verdict.PASS : Verdict.FAIL,
    score: s.totalRules > 0 ? s.passedRules / s.totalRules : undefined,
    totalChecks: s.totalRules,
    passedChecks: s.passedRules,
    failedChecks: s.failedRules,
    skippedChecks: 0,
  };

  const overallVerdict = verdict.passed ? Verdict.PASS : Verdict.FAIL;

  return {
    overallVerdict,
    outcome: verdict.passed ? 'approved' : 'rejected',
    results: {
      gate: gates,
      artifact: allArtifacts,
      compliance,
    },
    rulesExecuted: [],
    policiesApplied,
    gaps: allGaps,
    risks: [],
    missingEvidence: [],
    incompleteArtifacts: [...incompleteArtifacts],
    recommendations: [],
    requiredActions: allActions,
    decisionRecommendation: opts.decisionRecommendation,
    confidence: s.totalRules > 0 ? s.passedRules / s.totalRules : 1,
    rationale: verdict.passed
      ? `All ${s.totalGates} gate(s) passed (${s.passedRules}/${s.totalRules} rules).`
      : `${s.failedGates}/${s.totalGates} gate(s) failed (${s.failedRules}/${s.totalRules} rules failed).`,
    versions: {
      core: opts.coreVersion,
      ruleset: opts.ruleset,
      rulesetVersion: opts.rulesetVersion,
    },
    evaluatedAt: opts.evaluatedAt,
    correlationId: opts.correlationId,
    schemaVersion: EVALUATION_RESULT_SCHEMA_VERSION,
  };
}
