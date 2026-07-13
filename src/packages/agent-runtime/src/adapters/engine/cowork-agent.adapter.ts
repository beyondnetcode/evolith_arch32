/**
 * CoworkAgentEngineAdapter (GT-531 · axis 1 — positioning §8.2 / §9-4).
 *
 * Treats Claude Cowork as ONE OF SEVERAL REPLACEABLE governed executors behind
 * {@link IAgentEnginePort} — the same port stub/hermes/swarms implement, so it drops in with no
 * change to the runtime. It is BOUNDED: it only ever proposes a tool that EXISTS in the available
 * skill catalog, so a Cowork/LLM proposal for a capability outside the catalog is rejected rather
 * than invented. The runtime's existing envelope — approval (GT-441), policy validation, trace —
 * governs whatever it proposes; this adapter adds the executor-level bound.
 *
 * The live Claude/Cowork call is injected as a {@link CoworkClient} (follow-on infra); with no
 * client wired the adapter is deterministic (no external call), like the stub engine.
 */

import type { AgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../../domain/contracts/capability';
import type { AgentEnginePlan, IAgentEnginePort } from '../../domain/ports/agent-engine.port';

export const COWORK_ENGINE = 'cowork';

/** A raw proposal from Cowork before governance is applied. */
export interface CoworkProposal {
  readonly tool?: string;
  readonly arguments?: Readonly<Record<string, unknown>>;
  readonly rationale?: string;
}

/** The live Cowork/Claude call, injected. Follow-on infra; the adapter works without it. */
export interface CoworkClient {
  propose(request: AgentRuntimeRequest, availableSkills: readonly SkillDescriptor[]): Promise<CoworkProposal>;
}

export interface CoworkAdapterOptions {
  readonly client?: CoworkClient;
}

export class CoworkAgentEngineAdapter implements IAgentEnginePort {
  constructor(private readonly options: CoworkAdapterOptions = {}) {}

  async plan(request: AgentRuntimeRequest, availableSkills: readonly SkillDescriptor[]): Promise<AgentEnginePlan> {
    const proposal = this.options.client
      ? await this.options.client.propose(request, availableSkills)
      : undefined;

    const inCatalog = !!proposal?.tool && availableSkills.some((s) => s.id === proposal.tool);
    if (!inCatalog) {
      // Bounded executor: never surface a tool outside the governed catalog.
      return {
        engine: COWORK_ENGINE,
        rationale: proposal?.tool
          ? `Cowork proposed '${proposal.tool}', which is not in the governed skill catalog — rejected (bounded executor).`
          : `Cowork proposed no in-catalog tool for intent '${request.intent}'.`,
        recommendations: availableSkills.slice(0, 3).map((s) => `Try '${s.id}': ${s.description}`),
      };
    }

    return {
      engine: COWORK_ENGINE,
      proposedTool: proposal!.tool,
      proposedArguments: proposal!.arguments,
      rationale: proposal!.rationale ?? `Cowork selected '${proposal!.tool}' from the governed catalog.`,
    };
  }
}
