/**
 * Input contract for the end-to-end evaluation pipeline.
 *
 * A client (CLI, MCP, REST) sends a SatelliteManifest declaring what
 * repository to evaluate, optionally which topology and SDLC phase apply.
 * The pipeline resolves topology, loads phase gates from structured data,
 * executes Rego rules, and returns a structured verdict.
 */

import { GateVerdict } from './gate-evidence';

/**
 * Minimal manifest a client must provide to trigger the pipeline.
 * In production, this is typically read from the satellite's
 * `evolith.yaml` or `topology.manifest.json`.
 */
/**
 * Projected, OPA-input-shaped view of the *declared facts* a consumer sends on
 * an `EvaluationContext` (artifacts/evidence/gate/constraints). GT-380 L1c.
 *
 * Carried OPTIONALLY on the manifest so the OpaInputBuilder can merge it into
 * the OPA `input` document (`input.context` / `input.gate` / `input.evidence` /
 * `input.waiver` / root `tenantId` / `evaluationDate`). Absent for legacy /
 * minimal callers — when undefined, the OPA input is byte-for-byte identical to
 * the FS-only build, so the disk-scan path and Native/OPA parity are unchanged.
 */
export interface EvaluationFacts {
  /** Echoed canonical context + declared sub-configs (dod/spec) for context-aware policies. */
  readonly context?: Readonly<Record<string, unknown>>;
  /** Phase-gate shape consumed by phase-gates.rego (`input.gate`). */
  readonly gate?: {
    readonly phase?: number;
    readonly mandatoryEvidence?: readonly { readonly artifact: string }[];
    readonly blockingCriteria?: readonly { readonly criterion: string }[];
  };
  /** Presented-artifact evidence (`input.evidence[].artifact`) for phase-gates.rego. */
  readonly evidence?: readonly { readonly artifact: string; readonly status?: string }[];
  /** Waivers (`input.waiver`) for phase-gates.rego. */
  readonly waiver?: readonly {
    readonly criterion: string;
    readonly status: string;
    readonly expirationDate?: string;
  }[];
  /** Opaque tenant echo for the gate audit field (`input.tenantId`). */
  readonly tenantId?: string;
  /** ISO-8601 date for waiver-expiry comparison (`input.evaluationDate`). */
  readonly evaluationDate?: string;
}

export interface SatelliteManifest {
  /** Filesystem path to the satellite repository */
  satellitePath: string;

  /** Optional explicit path to the Evolith Core repository */
  corePath?: string;

  /**
   * Optional topology override. If omitted, the pipeline auto-detects
   * by analyzing the satellite's tech stack against the topology catalog.
   */
  topology?: string;

  /**
   * Optional SDLC phase. If provided, the pipeline evaluates only
   * the gates for that phase. If omitted, all phases are checked.
   * Values: f1, f2, f3, f4, f5
   */
  phase?: string;

  /**
   * GT-380 L1c: declared facts projected from the canonical EvaluationContext,
   * threaded down to the OPA input. Absent on the legacy CLI/MCP manifest path.
   */
  facts?: EvaluationFacts;
}

/**
 * Severity of a rule evaluation result.
 */
export type EvaluationSeverity = 'error' | 'warning' | 'info';

/**
 * Result of evaluating one artifact against one Rego rule.
 * GT-282: every evaluation must include enough context for a team
 * to act: which artifact failed, which rule applies, and how to fix it.
 */
export interface RuleEvaluation {
  /** Unique rule identifier (e.g. GOV-001, PG-F1-EVIDENCE-001) */
  ruleId: string;
  /** Path to the .rego file that defines this rule */
  rulePath: string;
  /** Path to the artifact being evaluated */
  artifact: string;
  /** Whether the artifact satisfies the rule */
  passed: boolean;
  /** Human-readable explanation of the result */
  message: string;
  /** Severity: error blocks the gate, warning is advisory, info is informational */
  severity: EvaluationSeverity;
  /** Actionable remediation: what to do to fix a failing evaluation */
  remediation: string;
  /** Cross-reference to the gate definition that required this artifact */
  gateRef: string;
}

/**
 * Result of evaluating one phase gate inside the satellite evaluation pipeline.
 *
 * This is the pipeline's internal DTO (W-Contracts: formerly named
 * `GateEvaluationResult`, which collided with the canonical ADR-0101 contract of
 * the same name in `evaluation/contracts/evaluation-result.ts`). The GT-378 mapper
 * (`canonical-result.mapper.ts`) bridges these into the canonical
 * `GateEvaluationResult`, so the public evaluation contract stays canonical-only.
 */
export interface PipelineGateResult {
  gateId: string;
  gateName: string;
  phase: string;
  verdict: GateVerdict;
  artifactEvaluations: RuleEvaluation[];
}

/**
 * Structured verdict returned by the pipeline, wrapped in the
 * ADR-0073 output envelope for consistency across all surfaces.
 */
export interface EvaluationVerdict {
  /** Overall pass/fail */
  passed: boolean;

  /** Resolved topology, or null if none matched */
  resolvedTopology: string | null;

  /** Evaluated phase gates */
  gates: PipelineGateResult[];

  /** Summary counts */
  summary: {
    totalGates: number;
    passedGates: number;
    failedGates: number;
    totalRules: number;
    passedRules: number;
    failedRules: number;
  };

  /** ISO timestamp */
  evaluatedAt: string;

  /**
   * ADR-0073 output envelope for machine consumption.
   * Present when the pipeline was invoked with envelope: true.
   * All surfaces (CLI, MCP, REST) should prefer this over raw fields.
   */
  outputEnvelope?: import('./gate-evidence').SuccessEnvelope<{
    topology: string | null;
    gates: PipelineGateResult[];
    summary: EvaluationVerdict['summary'];
  }>;
}
