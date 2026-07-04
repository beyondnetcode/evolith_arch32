/**
 * GT-317 — Composable WorkflowDefinition types.
 *
 * Core stores ZERO tenant configuration; the WorkflowDefinition is always
 * supplied by the caller (Tracker / satellite) and validated here.
 *
 * NOTE: Names are prefixed with "Workflow" to avoid collision with the
 * existing PhaseDefinition / GateDefinition in domain/interfaces.ts.
 */

export interface WorkflowArtifactDefinition {
  /** Human-readable artifact name, e.g. "PRD" */
  name: string;
  /** Whether the artifact may never be omitted from a gate */
  nonOmittable?: boolean;
}

export interface WorkflowGateDefinition {
  /** Stable gate identifier, e.g. "gate-f1" */
  id: string;
  /** Display name */
  name: string;
  /** List of artifact names that must be present */
  requiredArtifacts: string[];
  /**
   * OPA rule file paths relative to the Core root,
   * e.g. ["rulesets/opa/governance.rego"]
   */
  rules: string[];
  /** Role accountable for approving this gate */
  accountableRole?: string;
}

export interface WorkflowPhaseDefinition {
  /** Stable phase identifier, e.g. "f1" */
  id: string;
  /** Display name */
  name: string;
  /** Ordinal position (1-based) */
  order: number;
  /** Gates that must pass before exiting this phase */
  gates: WorkflowGateDefinition[];
}

/**
 * A complete, externally supplied workflow definition.
 * The caller (Tracker) composes this; Core only validates it.
 */
export interface WorkflowDefinition {
  name: string;
  description: string;
  phases: WorkflowPhaseDefinition[];
}

/** A single invariant violation found by ValidateWorkflowUseCase */
export interface WorkflowViolation {
  code: string;
  phase?: string;
  gate?: string;
  artifact?: string;
  message: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  violations: WorkflowViolation[];
}
