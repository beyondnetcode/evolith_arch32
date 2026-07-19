/**
 * REST API types for the Evolith Core API.
 *
 * GT-564: response payload types are NOT redeclared here. Core-api returns the
 * domain objects verbatim (there is no controller-level reshaping), so this
 * module re-exports the canonical contracts from
 * `@beyondnet/evolith-core-domain`. Only genuinely transport-layer shapes —
 * the response envelope (mirroring
 * apps/core-api/src/infrastructure/interceptors/envelope.interceptor.ts) and
 * the request DTOs — are owned here.
 */

import type {
  GatePhase,
  GateVerdict,
  GateViolation,
  GateEvidence,
  ViolationSeverity,
  EvaluatorKind,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import type {
  ValidationResult,
  ValidationIssue,
} from '@beyondnet/evolith-core-domain/application/validators/ruleset-validator.types';

/**
 * Canonical domain contracts, re-exported so SDK consumers keep a single import
 * site. These are aliases, not forks — the definitions live in core-domain.
 */
export type {
  GatePhase,
  GateVerdict,
  GateViolation,
  GateEvidence,
  ViolationSeverity,
  EvaluatorKind,
  ValidationResult,
  ValidationIssue,
};

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

export interface EvaluateGateRequest {
  /** Opaque workspace reference issued by the Tracker BFF */
  workspaceRef: string;
}

/**
 * `POST /api/v1/gates/:gateId/evaluate` wraps the domain `GateEvidence`
 * verbatim (gates.controller.ts → createSuccessEnvelope(result)).
 */
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

/**
 * `POST /api/v1/architecture/validate-satellite` returns the domain
 * `ValidationResult` verbatim. (The controller can also return an ADR-0073
 * output envelope, but only when the body carries a `manifest` — a field
 * `ValidateSatelliteRequest` does not expose, so that branch is unreachable
 * from this client.)
 */
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
