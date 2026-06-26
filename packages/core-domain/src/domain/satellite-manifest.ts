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
 * Result of evaluating one phase gate.
 */
export interface GateEvaluationResult {
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
  gates: GateEvaluationResult[];

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
    gates: GateEvaluationResult[];
    summary: EvaluationVerdict['summary'];
  }>;
}
