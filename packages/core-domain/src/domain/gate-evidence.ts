/**
 * Domain types for the unified machine output contract ratified by
 * core/ADR-0073 (Unified CLI/MCP Output Contract and Gate Evidence Schema).
 *
 * These types are the single source of truth consumed by every surface
 * (CLI command, MCP tool, REST endpoint). Canonical JSON Schemas:
 *   - rulesets/schema/gate-evidence.schema.json
 *   - rulesets/schema/output-envelope.schema.json
 *
 * This module is pure domain: no I/O, no framework, no presentation.
 */

export const GATE_PHASES = ['discovery', 'design', 'construction', 'qa', 'release'] as const;
export type GatePhase = (typeof GATE_PHASES)[number];

export const GATE_VERDICTS = ['passed', 'failed', 'skipped'] as const;
export type GateVerdict = (typeof GATE_VERDICTS)[number];

export const VIOLATION_SEVERITIES = ['error', 'warning'] as const;
export type ViolationSeverity = (typeof VIOLATION_SEVERITIES)[number];

export const EVALUATOR_KINDS = ['human', 'agent', 'ci'] as const;
export type EvaluatorKind = (typeof EVALUATOR_KINDS)[number];

/**
 * Registered machine-readable error codes. Append-only per ADR-0073:
 * renaming or reusing a code is a breaking change requiring a superseding ADR.
 */
export const ERROR_CODES = [
  'GATE_BLOCKED',
  'VALIDATION_FAILED',
  'RULESET_NOT_FOUND',
  'SCHEMA_INVALID',
  'INVALID_PHASE',
  'NOT_A_SATELLITE',
  'IO_ERROR',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface GateViolation {
  /** Identifier of the violated rule within the referenced ruleset. */
  readonly ruleId: string;
  /** 'error' blocks the gate; 'warning' is advisory. */
  readonly severity: ViolationSeverity;
  /** Where the violation was found (file path, artifact, or logical location). */
  readonly location: string;
  /** Actionable human-readable explanation. */
  readonly message: string;
}

export interface GateEvidence {
  readonly gateId: string;
  readonly phase: GatePhase;
  readonly verdict: GateVerdict;
  readonly rulesetRef: string;
  readonly rulesetVersion: string;
  readonly violations: readonly GateViolation[];
  /** ISO 8601 timestamp of the evaluation. */
  readonly evaluatedAt: string;
  readonly evaluatedBy: EvaluatorKind;
}

export interface PhaseTransitionProposal {
  readonly fromPhase: GatePhase;
  readonly toPhase: GatePhase;
  readonly evidence: GateEvidence;
  readonly isRecommended: boolean;
  readonly proposedAt: string;
}

/** Verbatim echo of caller-supplied context. Never persisted or interpreted. */
export interface ExecutionContext {
  readonly initiative?: string;
  readonly tenant?: string;
  readonly phase?: string;
}

export interface OutputMeta {
  /** Canonical command identity, e.g. 'evolith gate evaluate'. */
  readonly command: string;
  /** ISO 8601 timestamp of execution. */
  readonly executedAt: string;
  readonly durationMs: number;
  readonly correlationId: string;
  readonly context?: ExecutionContext;
}

export interface OutputError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface SuccessEnvelope<T> {
  readonly success: true;
  readonly data: T;
  readonly meta: OutputMeta;
}

export interface ErrorEnvelope {
  readonly success: false;
  readonly error: OutputError;
  readonly meta: OutputMeta;
}

export type OutputEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

export function createSuccessEnvelope<T>(data: T, meta: OutputMeta): SuccessEnvelope<T> {
  return { success: true, data, meta };
}

export function createErrorEnvelope(
  code: ErrorCode,
  message: string,
  meta: OutputMeta,
  details?: Record<string, unknown>
): ErrorEnvelope {
  return { success: false, error: details === undefined ? { code, message } : { code, message, details }, meta };
}

/**
 * Derives the verdict mandated by the contract: unknown 'error' violation fails
 * the gate; warnings alone do not block it.
 */
export function deriveVerdict(violations: readonly GateViolation[]): Exclude<GateVerdict, 'skipped'> {
  return violations.some(v => v.severity === 'error') ? 'failed' : 'passed';
}

export function isGatePhase(value: string): value is GatePhase {
  return (GATE_PHASES as readonly string[]).includes(value);
}

export function isErrorCode(value: string): value is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(value);
}
