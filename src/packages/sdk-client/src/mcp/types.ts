/**
 * MCP tool type definitions for the Evolith MCP server.
 *
 * Tool *inputs* mirror the inputSchema declared in
 * packages/mcp-server/src/tools/*.tools.ts and are owned here.
 *
 * Tool *outputs* are NOT redeclared: `evolith-gate-evaluate` returns the domain
 * `GateEvidence` produced by EvaluateGateUseCase verbatim, and
 * `evolith-validate` (json format) returns the domain `ValidationResult`
 * verbatim. Both are re-exported from `@beyondnet/evolith-core-domain`
 * (GT-564).
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

// ─── Common ───────────────────────────────────────────────────────────────────

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

export type EvidenceMode = 'full' | 'summary';
export type ValidateFormat = 'json' | 'summary' | 'table';

// ─── evolith-gate-evaluate ────────────────────────────────────────────────────

export interface GateEvaluateInput {
  /** Phase identifier */
  phase: GatePhase;
  /** Absolute path to the repository to validate */
  projectPath: string;
  /** Optional explicit path to the Evolith core repository */
  corePath?: string;
  /** Optional ruleset reference */
  rulesetRef?: string;
  /** Output detail level (default: "full") */
  evidenceMode?: EvidenceMode;
  /** Who triggered the evaluation (default: "agent") */
  evaluatedBy?: EvaluatorKind;
  /** Optional initiative context */
  initiative?: string;
  /** Optional tenant context */
  tenant?: string;
  /** Optional webhook URL for async notifications */
  webhookUrl?: string;
}

/**
 * The tool returns `GateEvidence` verbatim. With `evidenceMode: 'summary'` it
 * additionally empties `violations` and attaches a per-severity roll-up
 * (gate.tools.ts) — the only field the MCP surface adds to the domain object.
 */
export type GateEvaluateOutput = GateEvidence & {
  readonly summary?: { errors: number; warnings: number };
};

// ─── evolith-validate ────────────────────────────────────────────────────────

export interface ValidateInput {
  /** Absolute path to the satellite repository */
  path: string;
  /** Output format (default: "json") */
  format?: ValidateFormat;
  /** Optional ID of a specific ruleset to load */
  ruleset?: string;
  /** Optional explicit path to the Evolith core repository */
  corePath?: string;
  /** Topology to target — triggers end-to-end pipeline */
  topology?: string;
  /** SDLC phase to evaluate — triggers end-to-end pipeline */
  phase?: string;
  /** JSON string or path to SatelliteManifest — triggers pipeline */
  manifest?: string;
}

/**
 * `format: 'json'` (the default) returns the domain `ValidationResult`
 * verbatim — including `status: 'passed' | 'failed' | 'warning'`, `coreRef`
 * and `timestamp`.
 */
export type ValidateJsonOutput = ValidationResult;

export type ValidateOutput = ValidateJsonOutput | string;

// ─── evolith-phase-advance ───────────────────────────────────────────────────

export interface PhaseAdvanceInput {
  /** Current phase */
  fromPhase: GatePhase;
  /** Target phase */
  toPhase: GatePhase;
  /** Absolute path to the repository */
  projectPath: string;
  /** Optional explicit path to the Evolith core repository */
  corePath?: string;
  /** Who triggered the advance (default: "agent") */
  evaluatedBy?: EvaluatorKind;
  /** Optional initiative context */
  initiative?: string;
  /** Optional tenant context */
  tenant?: string;
  /** Optional webhook URL for async notifications */
  webhookUrl?: string;
}

export interface PhaseAdvanceOutput {
  fromPhase: GatePhase;
  toPhase: GatePhase;
  allowed: boolean;
  gateEvidence?: GateEvaluateOutput;
  message?: string;
}

// ─── evolith-topology-list ───────────────────────────────────────────────────

export interface TopologyListInput {
  /** Optional explicit path to the Evolith core repository */
  corePath?: string;
}

export interface TopologyManifest {
  id: string;
  name: string;
  description?: string;
  version?: string;
  [key: string]: unknown;
}

export interface TopologyListOutput {
  tool: 'evolith-topology-list';
  count: number;
  topologies: TopologyManifest[];
  timestamp: string;
}

// ─── evolith-topology-get ────────────────────────────────────────────────────

export interface TopologyGetInput {
  /** ID of the topology to retrieve */
  id: string;
  /** Optional explicit path to the Evolith core repository */
  corePath?: string;
}

export interface TopologyGetOutput {
  tool: 'evolith-topology-get';
  id: string;
  topology: TopologyManifest;
  timestamp: string;
}

// ─── Tool name registry ───────────────────────────────────────────────────────

export type McpToolName =
  | 'evolith-gate-evaluate'
  | 'evolith-validate'
  | 'evolith-phase-advance'
  | 'evolith-topology-list'
  | 'evolith-topology-get';

export interface McpToolInputMap {
  'evolith-gate-evaluate': GateEvaluateInput;
  'evolith-validate': ValidateInput;
  'evolith-phase-advance': PhaseAdvanceInput;
  'evolith-topology-list': TopologyListInput;
  'evolith-topology-get': TopologyGetInput;
}

export interface McpToolOutputMap {
  'evolith-gate-evaluate': GateEvaluateOutput;
  'evolith-validate': ValidateOutput;
  'evolith-phase-advance': PhaseAdvanceOutput;
  'evolith-topology-list': TopologyListOutput;
  'evolith-topology-get': TopologyGetOutput;
}
