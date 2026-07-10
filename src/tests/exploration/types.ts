// -------------------------------------------------------------------------
// Shared types for the exploratory cross-surface test agent.
// -------------------------------------------------------------------------

export type Surface = 'cli' | 'mcp' | 'rest';

/** An operation as declared in the machine-readable surface-parity matrix. */
export interface SurfaceOp {
  id: string;
  name: string;
  description?: string;
  cli: { exposed: boolean; command?: string; exempt?: string };
  mcp: { exposed: boolean; tool?: string; exempt?: string };
  rest: { exposed: boolean; endpoint?: string; exempt?: string };
}

/** Context an operation binding needs to build a valid per-surface invocation. */
export interface BindingCtx {
  /** Absolute path to a synthetic satellite workspace. */
  projectPath: string;
  /** workspaceRef the Core resolves server-side (basename of projectPath). */
  workspaceRef: string;
  /** Absolute path to the Core (repo root) — the ruleset corpus. */
  corePath: string;
}

/** The ADR-0073 envelope shape, surface-agnostic. */
export interface EnvelopeShape {
  success?: boolean;
  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: Record<string, unknown>;
}

/** Raw result of invoking one operation on one surface. */
export interface RawResult {
  surface: Surface;
  operationId: string;
  /** Transport-level success: a response was obtained (even an error envelope). */
  ok: boolean;
  /** Parsed ADR-0073 envelope, or null if the output was not a parseable envelope. */
  envelope: EnvelopeShape | null;
  /** Raw text captured (CLI stdout / MCP tool text / REST body). */
  rawText: string;
  /** Set when the transport itself failed (no usable response). */
  transportError?: string;
}

/** Normalized verdict extracted from an envelope for cross-surface comparison. */
export interface CanonicalVerdict {
  success: boolean | null;
  verdict: string | null;
  phase: string | null;
  evaluatedBy: string | null;
}

export type Severity = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type FindingType = 'consistency' | 'contract' | 'transport' | 'coverage';
export type Confidence = 'confirmed' | 'hypothesis';

/** A single finding produced by an oracle. */
export interface Finding {
  id: string;
  operationId: string;
  type: FindingType;
  severity: Severity;
  confidence: Confidence;
  surfaces: Surface[];
  title: string;
  detail: string;
  evidence: Record<string, unknown>;
}

export interface CoverageReport {
  totalOperations: number;
  exposed: Record<Surface, number>;
  fullTriangle: number;
  boundOperations: number;
  executedOperations: number;
  executedSurfaceInvocations: number;
  findingsByType: Record<string, number>;
  findingsBySeverity: Record<string, number>;
  uncoveredTriangleOps: string[];
}
