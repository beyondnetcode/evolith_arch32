/**
 * REST API types derived from the Evolith Core API controller DTOs and
 * OpenAPI configuration (apps/core-api/src/openapi/openapi-config.ts).
 *
 * These types mirror the NestJS DTOs from apps/core-api/src/presentation/dtos/
 * and the envelope decorator from ApiEnvelopeResponse.
 */

// ─── Common envelope ─────────────────────────────────────────────────────────
// Mirrors apps/core-api/src/infrastructure/interceptors/envelope.interceptor.ts:
// every response is { success, data|error, meta }.

export interface EnvelopeMeta {
  durationMs?: number;
  [key: string]: unknown;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: EnvelopeMeta;
}

export interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: unknown };
  meta: EnvelopeMeta;
}

/** Discriminated union on `success` — narrow before accessing data/error. */
export type ApiEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

// ─── Gate Evaluation ─────────────────────────────────────────────────────────

export type GatePhase = 'discovery' | 'design' | 'construction' | 'qa' | 'release';

export interface EvaluateGateRequest {
  /** Opaque workspace reference issued by the Tracker BFF */
  workspaceRef: string;
}

export type ViolationSeverity = 'error' | 'warning' | 'info';

export interface GateViolation {
  ruleId: string;
  severity: ViolationSeverity;
  message: string;
  artifact?: string;
  remediation?: string;
}

export interface GateEvidence {
  phase: GatePhase;
  passed: boolean;
  violations: GateViolation[];
  evaluatedBy?: string;
  evaluatedAt?: string;
  summary?: { errors: number; warnings: number };
}

export type EvaluateGateResponse = SuccessEnvelope<GateEvidence>;

// ─── Phase Transition ────────────────────────────────────────────────────────

export interface TransitionPhaseRequest {
  /** Current phase */
  from: string;
  /** Target phase */
  to: string;
  /** Tools to execute during transition */
  tools: string[];
  /** Opaque workspace reference issued by the Tracker BFF */
  workspaceRef: string;
}

export interface PhaseTransitionResult {
  from: string;
  to: string;
  success: boolean;
  message?: string;
}

export type TransitionPhaseResponse = SuccessEnvelope<PhaseTransitionResult>;

// ─── Architecture / Topology ─────────────────────────────────────────────────

export interface TopologyManifest {
  id: string;
  name: string;
  description?: string;
  version?: string;
  [key: string]: unknown;
}

export type ListTopologiesResponse = SuccessEnvelope<TopologyManifest[]>;
export type GetTopologyResponse = SuccessEnvelope<TopologyManifest>;

export interface ValidateSatelliteRequest {
  /** Opaque workspace reference issued by the Tracker BFF */
  workspaceRef: string;
}

export interface DetectDriftRequest {
  /** Opaque workspace reference issued by the Tracker BFF */
  workspaceRef: string;
  /** Declared architecture topology / maturity, e.g. "distributed-modules" */
  declaredLevel?: string;
}

export interface ValidationResult {
  passed: boolean;
  issues: Array<{
    ruleId: string;
    severity: string;
    title: string;
    blocking: boolean;
    category?: string;
  }>;
  rulesChecked?: number;
}

export type ValidateSatelliteResponse = SuccessEnvelope<ValidationResult>;
export type DetectDriftResponse = SuccessEnvelope<unknown>;

// ─── Projects ────────────────────────────────────────────────────────────────

export interface InitProjectRequest {
  /** Opaque workspace reference issued by the Tracker BFF */
  workspaceRef: string;
  name: string;
  type: string;
  options?: Record<string, unknown>;
}

export interface ProposeAdvanceRequest {
  /** Opaque workspace reference issued by the Tracker BFF */
  workspaceRef: string;
  /** Current phase (gate to evaluate exit from) */
  currentPhase: string;
  /** Target phase to advance to */
  targetPhase: string;
  triggerDeploy?: boolean;
}

export type InitProjectResponse = SuccessEnvelope<unknown>;
export type ProposeAdvanceResponse = SuccessEnvelope<unknown>;
