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
import type { EvidenceSignal } from './quality-evidence';
import type { StructuralFactsSummary } from './repo-facts';
import type { DriftConformanceDelta, DriftSignalReport } from './drift-signals';
import type { RepositoryRevisionContext, RequesterContext } from './evaluation-context';

/** Schema version of this contract (bumped only on incompatible changes). */
export const EVALUATION_RESULT_SCHEMA_VERSION = '1.0.0';

export type FindingSeverity = 'error' | 'warning' | 'info';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Evaluation engines that can produce a {@link RuleExecutionRef} (GT-511 · EAG-02).
 * OPEN vocabulary: `enforcer` covers OSS source-analyzers (dependency-cruiser,
 * Deptrac, …) normalized into the canonical `Violation` model. Consumers MUST
 * tolerate an unknown engine string rather than hard-fail — the enum grows without
 * an incompatible schema bump (see `isKnownEngine`/`normalizeEngine` in `violation.ts`).
 */
export const KNOWN_RULE_ENGINES = ['native', 'opa', 'enforcer'] as const;
export type RuleEngine = (typeof KNOWN_RULE_ENGINES)[number];

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
  readonly engine: RuleEngine;
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
  /**
   * GT-589 — what the structural fact base answered, including the extractor's
   * `contentHash` so the verdict NAMES the input it judged. Absent when the
   * consumer sent no `repoFacts`; the Core never invents one.
   */
  readonly structuralFacts?: StructuralFactsSummary;
  /**
   * GT-594 — the AI-drift signals (duplication, refactor:copy, error masking), each
   * with its determinism, its provenance and the GT-584 admissibility decision that
   * keeps it ADVISORY. Present alongside the verdict, never inside it: nothing in
   * this report may change `verdict`, and `blockingAdmissible` stays empty until a
   * signal carries a measured error rate.
   */
  readonly driftSignals?: DriftSignalReport;
  /**
   * GT-594 — per-signal conformance delta against `baselineRepoFacts`, when the
   * consumer sent one. Absent otherwise; the Core remembers no previous revision.
   */
  readonly driftSignalDelta?: DriftConformanceDelta;
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

/** Maturity of one concern (frontend/backend/…) of the composed blueprint. */
export interface ConcernMaturity {
  readonly concern: string;
  readonly maturity: number; // 0..100
  readonly gaps: readonly GapFinding[];
}

/** Presence/quality of one derived design-artifact block. */
export interface DesignArtifactStatus {
  readonly artifactKind: string;
  readonly required: boolean;
  readonly present: boolean;
  readonly verdict: Verdict;
}

/**
 * Design evaluation sub-result (ADR-0104). ADVISORY and NON-BINDING: the primary
 * output is the technical MATURITY of the blueprint (how good a development guide
 * it is). Core measures and recommends; the Tracker's gate decides any blocking.
 */
export interface DesignEvaluationResult {
  readonly verdict: Verdict;
  /** Primary output: technical maturity of the design (0..100). Non-binding. */
  readonly technicalMaturity: number;
  readonly perConcernMaturity: readonly ConcernMaturity[];
  /** Required/conditional artifacts derived from the confirmed topology union. */
  readonly artifactStatus: readonly DesignArtifactStatus[];
  readonly missingArtifacts: readonly string[];
  /** Deviations from blueprints/ADRs that recommend a new ADR (non-blocking). */
  readonly deviationsRequiringAdr: readonly string[];
  readonly gaps: readonly GapFinding[];
  readonly recommendations: readonly Recommendation[];
  /**
   * Criteria derived from the composed blueprint for downstream phases
   * (Construction/Quality/Deployment) — recommendations the Tracker uses to
   * configure the F3/F4/F5 gates (ADR-0104 §8).
   */
  readonly downstreamCriteria?: readonly Recommendation[];
}

/**
 * Downstream phase-artifact completeness sub-result (ADR-0104 · DN-06 / GT-434).
 * ADVISORY and NON-BINDING (mirrors {@link DesignEvaluationResult}): for a
 * downstream SDLC phase (construction/quality/deployment) the Core measures the
 * declared artifacts against the UNION of the universal per-phase artifacts and
 * the confirmed topology composition's `spec.phaseProfiles`. Primary output is
 * `completeness` (0..100). The verdict is always PASS; the Tracker's gate decides
 * any blocking.
 */
export interface PhaseArtifactEvaluationResult {
  readonly verdict: Verdict;
  /** Downstream phase the artifacts were measured against. */
  readonly phase: 'construction' | 'quality' | 'deployment';
  /** Primary output: artifact completeness (0..100). Non-binding. */
  readonly completeness: number;
  readonly requiredArtifacts: readonly string[];
  readonly presentArtifacts: readonly string[];
  readonly missingArtifacts: readonly string[];
  /** Truly-conditional artifacts (declare a `condition`); informational. */
  readonly conditionalArtifacts: readonly string[];
  readonly gaps: readonly GapFinding[];
  readonly recommendations: readonly Recommendation[];
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
    readonly design?: DesignEvaluationResult;
    readonly phaseArtifacts?: PhaseArtifactEvaluationResult;
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
  /**
   * Per-dimension signals derived from the inline quality {@link EvidenceSignal}
   * evidence received on the context (ADR-0111 / GT-533). The Core READS the
   * received `Evidence[]` and folds a signal per observed dimension; a context
   * with no evidence surfaces a single `no-evidence` signal — advisory, never a
   * failure. See {@link foldQualitySignals}.
   */
  readonly qualitySignals?: readonly EvidenceSignal[];

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

  // --- Attribution echo (GT-586; additive, both optional) ---
  /**
   * The {@link RequesterContext} the context carried, echoed verbatim. Absent when
   * the consumer declared none — the Core never infers an actor.
   */
  readonly requester?: RequesterContext;
  /**
   * The {@link RepositoryRevisionContext} the context carried, echoed verbatim.
   * Absent when the consumer supplied none; the Core never derives a revision, so
   * an absent value truthfully means "unknown" rather than "no revision".
   */
  readonly repositoryRevision?: RepositoryRevisionContext;

  readonly evaluatedAt: string; // ISO-8601 UTC
  readonly correlationId?: string;
  /** Contract schema version of this result. */
  readonly schemaVersion: string;
}
