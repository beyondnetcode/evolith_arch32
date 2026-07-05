/**
 * AgentRuntimeRequest — the inbound contract for the Evolith Agent Runtime.
 *
 * A caller (Tracker chat, CLI, scheduler, external client) expresses an INTENT
 * and, optionally, a concrete `tool`. The runtime resolves the intent/tool to a
 * governed capability, invokes the right ports, and returns an
 * {@link AgentRuntimeResult}. The runtime decides nothing the Core governs — it
 * orchestrates; the Core + OPA + `.harness` enforce.
 */

import type { RuntimeContext, RuntimeExecutionMode } from './runtime-context';

export type AgentSourceInterface =
  | 'smart_cli_command'
  | 'smart_cli_chat'
  | 'hermes_agent_chatbox'
  | 'mcp'
  | 'external_trigger'
  | 'future_chat_adapter';

/**
 * Wire shape (snake_case) as sent by Tracker/CLI/chat — matches the JSON
 * contract in the design brief. Use {@link parseAgentRuntimeRequest} to turn it
 * into the internal camelCase {@link AgentRuntimeRequest}.
 */
export interface AgentRuntimeRequestWire {
  readonly source_interface?: AgentSourceInterface;
  readonly tenant?: string;
  readonly product?: string;
  readonly initiative?: string;
  readonly phase?: string;
  readonly gate?: string;
  /** Opaque workspace reference (ADR-0074) the Core resolves; never a raw path. */
  readonly workspace_ref?: string;
  readonly requested_by?: string;
  readonly intent: string;
  readonly runtime?: string;
  readonly tool?: string;
  readonly execution_mode?: RuntimeExecutionMode;
  readonly correlation_id?: string;
  readonly parameters?: Readonly<Record<string, unknown>>;
  readonly dry_run?: boolean;
  readonly approval?: { readonly granted: boolean; readonly approver?: string };
  readonly passthrough?: Readonly<Record<string, unknown>>;
}

/** Caller-supplied approval token (used when a capability requires HITL sign-off). */
export interface RequestApproval {
  readonly granted: boolean;
  readonly approver?: string;
  readonly reason?: string;
}

export interface AgentRuntimeRequest {
  /** Intent the caller wants satisfied (e.g. 'validate_discovery_gate'). */
  readonly intent: string;
  /** Optional explicit capability/tool id (e.g. 'validate-discovery-gate'). */
  readonly tool?: string;
  /** Identifies which runtime served the request (echoed into the trace). */
  readonly runtime?: string;

  /** Identifies which interface initiated the request. */
  readonly sourceInterface?: AgentSourceInterface;

  /** Tenant/product/initiative context — received, never embedded. */
  readonly context: RuntimeContext;

  /** Tool-specific arguments. Validated against the capability's input schema. */
  readonly parameters?: Readonly<Record<string, unknown>>;

  /** When true, plan and validate but do not perform side effects. */
  readonly dryRun?: boolean;

  /** Pre-supplied human approval (for capabilities that require HITL). */
  readonly approval?: RequestApproval;
}

const RUNTIME_DEFAULT = 'evolith_agent_runtime';

/** Normalize the snake_case wire payload into the internal request shape. */
export function parseAgentRuntimeRequest(wire: AgentRuntimeRequestWire): AgentRuntimeRequest {
  if (!wire || typeof wire.intent !== 'string' || wire.intent.trim() === '') {
    throw new TypeError('AgentRuntimeRequest requires a non-empty "intent".');
  }

  const context: RuntimeContext = {
    tenantId: wire.tenant,
    productId: wire.product,
    initiativeId: wire.initiative,
    sourceInterface: wire.source_interface ?? 'smart_cli_command',
    phase: wire.phase,
    gate: wire.gate,
    workspaceRef: wire.workspace_ref,
    requestedBy: wire.requested_by,
    executionMode: wire.execution_mode,
    correlationId: wire.correlation_id,
    passthrough: wire.passthrough,
  };

  return {
    intent: wire.intent,
    tool: wire.tool,
    runtime: wire.runtime ?? RUNTIME_DEFAULT,
    sourceInterface: wire.source_interface ?? 'smart_cli_command',
    context,
    parameters: wire.parameters,
    dryRun: wire.dry_run ?? false,
    approval: wire.approval ? { granted: wire.approval.granted, approver: wire.approval.approver } : undefined,
  };
}
