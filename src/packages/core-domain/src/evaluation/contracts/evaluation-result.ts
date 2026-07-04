/**
 * Canonical EvaluationResult contract (GT-377 / ADR-0101).
 *
 * What the stateless Core Evaluation Engine RETURNS to a consumer, wrapped in
 * the ADR-0073 SuccessEnvelope at the transport layer. The Core EVALUATES; it
 * does NOT decide the canonical GateDecision (that is the Tracker's). The Core
 * may emit a NON-BINDING `DecisionRecommendation`.
 */

import type { PhaseId } from '../../domain/sdlc/phase-id';
import type { Verdict, VerdictReason } from '../../domain/verdict/verdict';

/** Schema version of this contract (bumped only on incompatible changes). */
export const EVALUATION_RESULT_SCHEMA_VERSION = '1.0.0';

export type FindingSeverity = 'error' | 'warning' | 'info';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Governance outcome derived from the verdict + policy (consumer-facing). */
export type EvaluationOutcome =
  | 'approved'
  | 'rejected'
  | 'conditional'
  | 'pending'
  | 'requires_manual_review';

// ---------------------------------------------------------------------------
// Findings (cross-cutting, reusable)
// ---------------------------------------------------------------------------

export interface RiskFinding {
  readonly id: string;
  readonly level: RiskLevel;
  readonly category: string; // 'security' | 'architecture' | 'compliance' | ...
  readonly message: string;
  readonly location?: string;
  readonly ruleRef?: string;
}

export interface GapFinding {
  readonly id: string;
  readonly requirementRef: string;
  readonly severity: FindingSeverity;
  readonly message: string;
  readonly location?: string;
}

export interface RequiredAction {
  readonly id: string;
  readonly gapId?: string;
  readonly description: string;
  readonly blocking: boolean;
  readonly remediation: string;
}

export interface Recommendation {
  readonly id: string;
  readonly kind: 'architecture' | 'topology' | 'process' | 'remediation' | 'next-step';
  readonly message: string;
  readonly rationale?: string;
  readonly references?: readonly string[];
}

/**
 * Non-binding decision recommendation. The Core recommends; the Tracker decides
 * and persists the canonical GateDecision. `binding` is ALWAYS false.
 */
export interface DecisionRecommendation {
  readonly subjectType: 'gate' | 'phase' | 'initiative' | 'product';
  readonly subjectRef: string;
  readonly recommendedVerdict: Verdict;
  readonly reason?: VerdictReason;
  readonly binding: false;
  readonly recommendedBy: 'evolith-core';
}

/** Trace of a rule/policy that was executed during evaluation. */
export interface RuleExecutionRef {
  readonly ruleId: string;
  readonly rulesetRef?: string;
  readonly engine: 'native' | 'opa';
  readonly verdict: Verdict;
}

// ---------------------------------------------------------------------------
// Per-engine sub-results
// ---------------------------------------------------------------------------

export interface ArtifactEvaluationResult {
  readonly artifactId: string;
  readonly verdict: Verdict;
  readonly present: boolean;
  readonly ruleRefs: readonly string[];
  readonly gaps: readonly GapFinding[];
}

export interface GateEvaluationResult {
  readonly gateId: string;
  readonly phaseId?: PhaseId;
  readonly verdict: Verdict;
  readonly artifactResults: readonly ArtifactEvaluationResult[];
  readonly risks: readonly RiskFinding[];
  readonly gaps: readonly GapFinding[];
  readonly requiredActions: readonly RequiredAction[];
}

export interface EvidenceEvaluationResult {
  readonly evidenceId: string;
  readonly verdict: Verdict;
  readonly sufficient: boolean;
  readonly integrityVerified: boolean;
  readonly gaps: readonly GapFinding[];
}

export interface ArchitectureEvaluationResult {
  readonly verdict: Verdict;
  readonly definitionRef?: string;
  readonly risks: readonly RiskFinding[];
  readonly gaps: readonly GapFinding[];
  readonly recommendations: readonly Recommendation[];
}

export interface BlueprintEvaluationResult {
  readonly blueprintRef: string;
  readonly verdict: Verdict;
  readonly gaps: readonly GapFinding[];
  readonly requiredActions: readonly RequiredAction[];
}

export interface TopologyEvaluationResult {
  readonly topologyRef: string;
  readonly verdict: Verdict;
  readonly conformant: boolean;
  readonly gaps: readonly GapFinding[];
  readonly recommendations: readonly Recommendation[];
}

export interface CheckpointEvaluationResult {
  readonly checkpointId: string;
  readonly phaseId?: PhaseId;
  readonly verdict: Verdict;
  readonly gaps: readonly GapFinding[];
}

export interface DeploymentEvaluationResult {
  readonly environment: string;
  readonly releaseRef: string;
  readonly verdict: Verdict;
  readonly gaps: readonly GapFinding[];
  readonly risks: readonly RiskFinding[];
}

export interface ComplianceResult {
  readonly verdict: Verdict;
  readonly score?: number; // 0..1, optional/weighted
  readonly totalChecks: number;
  readonly passedChecks: number;
  readonly failedChecks: number;
  readonly skippedChecks: number;
}

// ---------------------------------------------------------------------------
// EvaluationResult — the response payload (wrapped in ADR-0073 envelope)
// ---------------------------------------------------------------------------

export interface EvaluationResult {
  /** Aggregate verdict derived from the sub-results. */
  readonly overallVerdict: Verdict;
  /** Enriched governance outcome (drives HITL in hybrid/agentic mode). */
  readonly outcome: EvaluationOutcome;

  // --- Per-engine sub-results (present per requested kinds) ---
  readonly results: {
    readonly gate?: readonly GateEvaluationResult[];
    readonly artifact?: readonly ArtifactEvaluationResult[];
    readonly evidence?: readonly EvidenceEvaluationResult[];
    readonly architecture?: ArchitectureEvaluationResult;
    readonly blueprint?: BlueprintEvaluationResult;
    readonly topology?: TopologyEvaluationResult;
    readonly checkpoint?: readonly CheckpointEvaluationResult[];
    readonly deployment?: DeploymentEvaluationResult;
    readonly compliance?: ComplianceResult;
  };

  // --- Execution traceability ---
  readonly rulesExecuted: readonly RuleExecutionRef[];
  readonly policiesApplied: readonly RuleExecutionRef[];

  // --- Diagnosis ---
  readonly gaps: readonly GapFinding[];
  readonly risks: readonly RiskFinding[];
  readonly missingEvidence: readonly string[];
  readonly incompleteArtifacts: readonly string[];
  readonly recommendations: readonly Recommendation[];
  readonly requiredActions: readonly RequiredAction[];
  readonly decisionRecommendation?: DecisionRecommendation;

  // --- Confidence & rationale ---
  readonly confidence: number; // 0..1
  readonly rationale: string;

  // --- Versions of what was used (audit/reproducibility) ---
  readonly versions: {
    readonly core: string;
    readonly ruleset?: string;
    readonly rulesetVersion?: string;
    readonly policy?: string;
    readonly blueprint?: string;
  };

  readonly evaluatedAt: string; // ISO-8601 UTC
  readonly correlationId?: string;
  /** Contract schema version of this result. */
  readonly schemaVersion: string;
}
