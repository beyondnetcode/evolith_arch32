/**
 * StubAgentEngineAdapter — a DETERMINISTIC {@link IAgentEnginePort}. It is the
 * default "engine" so the runtime works with NO LLM installed (design rule #5).
 *
 * Its "reasoning" is a transparent heuristic: match the request intent (or a
 * keyword in it) against the available skills' declared intents, and propose the
 * best match. No external calls, fully reproducible. Hermes (or any LLM) is a
 * drop-in replacement behind the same port.
 */

import type { IAgentEnginePort, AgentEnginePlan } from '../../domain/ports/agent-engine.port';
import type { AgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../../domain/contracts/capability';

export class StubAgentEngineAdapter implements IAgentEnginePort {
  async plan(
    request: AgentRuntimeRequest,
    availableSkills: readonly SkillDescriptor[],
  ): Promise<AgentEnginePlan> {
    const intent = request.intent.toLowerCase();

    // 1. exact intent match.
    let match = availableSkills.find((s) => s.intents.some((i) => i.toLowerCase() === intent));

    // 2. fuzzy: any skill whose id/intent shares a token with the request.
    if (!match) {
      const tokens = intent.split(/[^a-z0-9]+/).filter(Boolean);
      match = availableSkills.find((s) =>
        tokens.some(
          (t) => s.id.toLowerCase().includes(t) || s.intents.some((i) => i.toLowerCase().includes(t)),
        ),
      );
    }

    if (!match) {
      return {
        engine: 'stub',
        rationale: `No skill matched intent '${request.intent}'. Caller should pick from the catalog.`,
        recommendations: availableSkills.slice(0, 3).map((s) => `Try '${s.id}': ${s.description}`),
      };
    }

    return {
      engine: 'stub',
      proposedTool: match.id,
      proposedArguments: request.parameters,
      rationale: `Heuristic match: intent '${request.intent}' → skill '${match.id}'.`,
    };
  }
}
