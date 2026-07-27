/**
 * SupervisedAssistantClient (GT-531) — the reference wiring that lets an AI
 * assistant do SUPERVISED work: it turns the engine's Cowork seam into a real,
 * governed call to the assistant, but only after a human has approved contacting
 * it.
 *
 * It implements {@link CoworkClient}, so it drops into {@link CoworkAgentEngineAdapter}
 * with ZERO change to the runtime — the bounded-executor adapter still validates
 * that whatever comes back is in the governed catalog, and the runtime's
 * approval/policy/trace envelope still governs the resolved capability. This
 * client adds the piece that was missing: the actual contact with the assistant,
 * and the HITL gate IN FRONT of that contact.
 *
 * The flow when a supervised task arrives:
 *
 *     request  →  HITL approval (IApprovalPort)  →  real assistant call (IAssistantTransport)
 *
 * FAIL-CLOSED and OFF BY DEFAULT. Contacting an external AI assistant with a
 * tenant's request is itself a governed action, so this client refuses to reach
 * the assistant unless three independent conditions all hold:
 *   1. `enabled` is explicitly true (feature flag; default false → never contacts).
 *   2. a concrete {@link IAssistantTransport} is injected (DECISION-GATED — no
 *      vendor transport ships; without one there is nothing to call).
 *   3. an {@link IApprovalPort} GRANTS the request (a pending/rejected/expired
 *      decision means the assistant is NEVER contacted).
 * A transport throw is also fail-closed — it yields no proposal, never a tool.
 *
 * In every refusal path it returns a proposal with NO `tool`, which the bounded
 * Cowork adapter reads as "propose nothing", so the runtime degrades to its
 * default (deterministic) behaviour rather than executing anything unsupervised.
 */

import type { IApprovalPort } from '../../domain/ports/approval.port';
import type {
  AssistantProposal,
  IAssistantTransport,
} from '../../domain/ports/assistant-invocation.port';
import type { SkillDescriptor } from '../../domain/contracts/capability';
import type { AgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { CoworkClient, CoworkProposal } from './cowork-agent.adapter';

/** Id of the synthetic capability that models "contacting the AI assistant". */
export const ASSISTANT_INVOKE_SKILL_ID = 'assistant.invoke';

/**
 * Value stamped on {@link AssistantSupervision.gate} so a transport (and the
 * egress audit trail) can name the gate that granted. Deliberately NOT exported
 * from the package: it is evidence a transport reads, not a knob a caller sets.
 */
const SUPERVISION_GATE_ID = 'SupervisedAssistantClient';

export interface SupervisedAssistantOptions {
  /**
   * Feature flag. Default FALSE — the assistant is never contacted. Must be set
   * true DELIBERATELY (config/env) to arm the supervised path. There is no way
   * to enable it implicitly.
   */
  readonly enabled?: boolean;
  /** The HITL gate. The assistant is contacted only if this GRANTS. */
  readonly approval: IApprovalPort;
  /**
   * The real assistant transport (DECISION-GATED — a vendor adapter provides it).
   * Absent ⇒ fail-closed: nothing to call, no proposal.
   */
  readonly transport?: IAssistantTransport;
  /**
   * The permission scopes recorded on the synthetic approval request. Defaults
   * to a governed-write scope so a real approver sees this as a high-trust act.
   */
  readonly approvalPermissions?: readonly string[];
}

/** The synthetic descriptor an approver decides on: "may we contact the assistant?". */
function buildInvokeDescriptor(permissions: readonly string[]): SkillDescriptor {
  return {
    id: ASSISTANT_INVOKE_SKILL_ID,
    description: 'Contact an external AI assistant to propose a governed capability (supervised).',
    intents: ['invoke_assistant'],
    kind: 'composite',
    permissions,
    requiresApproval: true,
    emitsTrace: true,
    requiresPolicy: false,
  };
}

const DEFAULT_APPROVAL_PERMISSIONS = ['write:governed', 'invoke:assistant'] as const;

export class SupervisedAssistantClient implements CoworkClient {
  private readonly enabled: boolean;
  private readonly approval: IApprovalPort;
  private readonly transport?: IAssistantTransport;
  private readonly invokeDescriptor: SkillDescriptor;

  constructor(options: SupervisedAssistantOptions) {
    this.enabled = options.enabled ?? false;
    this.approval = options.approval;
    this.transport = options.transport;
    this.invokeDescriptor = buildInvokeDescriptor(
      options.approvalPermissions ?? [...DEFAULT_APPROVAL_PERMISSIONS],
    );
  }

  async propose(
    request: AgentRuntimeRequest,
    availableSkills: readonly SkillDescriptor[],
  ): Promise<CoworkProposal> {
    // Gate 1 — OFF by default. The assistant is never contacted unless armed.
    if (!this.enabled) {
      return { rationale: 'Supervised assistant is disabled (feature flag off); assistant not contacted.' };
    }

    // Gate 2 — DECISION-GATED. No vendor transport wired ⇒ nothing to call.
    if (!this.transport) {
      return {
        rationale:
          'Supervised assistant is enabled but no assistant transport is configured (decision-gated vendor); assistant not contacted.',
      };
    }

    // Gate 3 — HITL. Contacting the assistant needs a human YES. A pending /
    // rejected / expired decision means the assistant is NEVER reached.
    const decision = await this.approval.requireApproval({
      skill: this.invokeDescriptor,
      request,
    });
    if (!decision.granted) {
      const status = decision.status ? ` (${decision.status})` : '';
      const reason = decision.reason ? `: ${decision.reason}` : '';
      return {
        rationale: `Contacting the AI assistant was not approved${status}${reason}; assistant not contacted (fail-closed).`,
      };
    }

    // Approved — make the REAL call. The decision travels WITH the invocation
    // (GT-575): a governed transport refuses to open a socket unless it can see
    // that this gate ran, so there is exactly one supervised path to a provider
    // and exactly one human prompt per call.
    let proposal: AssistantProposal;
    try {
      proposal = await this.transport.invoke({
        request,
        availableSkills,
        supervision: {
          granted: true,
          approver: decision.approver,
          gate: SUPERVISION_GATE_ID,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        rationale: `Assistant transport failed after approval by '${decision.approver ?? 'approver'}' — ${message}; assistant proposed nothing (fail-closed).`,
      };
    }

    const approver = decision.approver ? ` (approved by ${decision.approver})` : '';
    return {
      tool: proposal.tool,
      arguments: proposal.arguments,
      rationale: proposal.rationale
        ? `${proposal.rationale}${approver}`
        : `Assistant proposed '${proposal.tool ?? 'nothing'}'${approver}.`,
    };
  }
}
