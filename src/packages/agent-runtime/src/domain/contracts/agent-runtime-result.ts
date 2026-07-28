/**
 * AgentRuntimeResult — the outbound contract returned by the Evolith Agent
 * Runtime, matching the JSON shape in the design brief.
 *
 * Status semantics:
 *  - `passed`   — capability ran and the Core/policy verdict was favourable.
 *  - `blocked`  — a gate/policy/approval blocked execution (governed, not an error).
 *  - `warning`  — ran with non-blocking findings, waivers, or skips.
 *  - `error`    — the runtime itself failed (tool missing, adapter crash, bad input).
 *
 * The `trace` block records the SEPARATION OF DUTIES that keeps the architecture
 * honest: the runtime *executes*, `.harness` *validates*, the Core *governs*,
 * OPA is the *policy engine*. The runtime never claims to have governed.
 */

export type RuntimeStatus = 'passed' | 'blocked' | 'warning' | 'error';

export type RuntimeFindingSeverity = 'error' | 'warning' | 'info';

export interface RuntimeFinding {
  readonly id: string;
  readonly severity: RuntimeFindingSeverity;
  readonly message: string;
  /** Where it came from: 'harness' | 'core' | 'opa' | 'runtime'. */
  readonly source?: string;
  readonly ruleRef?: string;
  readonly location?: string;
}

export interface RuntimeRecommendation {
  readonly id: string;
  readonly message: string;
  readonly rationale?: string;
  readonly references?: readonly string[];
}

/**
 * Provenance of the execution. Each field names WHO did WHAT so audits can
 * reconstruct the chain without trusting the runtime's own summary.
 */
export interface RuntimeTrace {
  readonly executedBy: string; // 'agent_runtime'
  readonly validatedBy?: string; // '.harness' (capability that produced the facts)
  readonly governedBy?: string; // 'evolith_core'
  readonly policyEngine?: string; // 'opa' | 'none'
  readonly capability?: string; // resolved capability/tool id
  readonly correlationId?: string;
  readonly tenantId?: string;
  readonly productId?: string;
  readonly initiativeId?: string;
  readonly approvedBy?: string;
  readonly durationMs?: number;
  readonly steps?: readonly string[]; // ordered pipeline steps actually run
  /**
   * GT-541: RAG grounding provenance. When a knowledge port is wired, the runtime queries
   * the corpus BEFORE recommending and records the cited chunks + the `corpusVersion` they
   * came from, so a recommendation is traceable to the exact indexed corpus release.
   */
  readonly groundedBy?: {
    readonly corpusVersion?: string;
    readonly citations: readonly string[];
  };
  /**
   * GT-610: WHICH argument set actually executed. Present whenever an engine
   * proposed arguments. `source: 'caller'` means nothing from the engine was
   * applied; `'engine-merged'` means the listed `accepted` keys came from the
   * engine and survived revalidation. `rejected` names every discarded key with
   * its reason, so an audit can tell "the engine tried to change X" apart from
   * "the engine never proposed X".
   */
  readonly argumentSource?: {
    readonly source: 'caller' | 'engine-merged';
    readonly engine?: string;
    readonly contract: 'declared' | 'absent';
    readonly policy: string;
    readonly accepted: readonly string[];
    readonly echoed: readonly string[];
    readonly rejected: readonly { readonly key: string; readonly reason: string }[];
  };
  /**
   * GT-612: how much prior conversation was read back into planning, and from
   * which namespace. `entries` is what was actually fed; `limit` is the bound
   * applied, so a truncated transcript is visible rather than implied.
   */
  readonly recalledMemory?: {
    readonly namespace: string;
    readonly entries: number;
    readonly limit: number;
  };
}

export interface AgentRuntimeResult {
  readonly status: RuntimeStatus;
  readonly summary: string;
  readonly findings: readonly RuntimeFinding[];
  readonly missingArtifacts: readonly string[];
  readonly recommendations: readonly RuntimeRecommendation[];
  readonly trace: RuntimeTrace;
  /** ISO-8601 UTC timestamp the result was produced. */
  readonly evaluatedAt: string;
  /** Optional raw passthrough of adapter outputs for debugging/audit. */
  readonly raw?: Readonly<Record<string, unknown>>;
}

/** Serialize the internal result to the snake_case wire shape from the brief. */
export function toAgentRuntimeResultWire(result: AgentRuntimeResult): Record<string, unknown> {
  return {
    status: result.status,
    summary: result.summary,
    findings: result.findings,
    missing_artifacts: result.missingArtifacts,
    recommendations: result.recommendations,
    trace: {
      executed_by: result.trace.executedBy,
      validated_by: result.trace.validatedBy,
      governed_by: result.trace.governedBy,
      policy_engine: result.trace.policyEngine,
      capability: result.trace.capability,
      correlation_id: result.trace.correlationId,
    },
    evaluated_at: result.evaluatedAt,
  };
}
