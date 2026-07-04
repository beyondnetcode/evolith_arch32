import type { IAgentEnginePort, AgentEnginePlan } from '../../domain/ports/agent-engine.port';
import type { AgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../../domain/contracts/capability';

export interface EngineRouterConfig {
  /** The default engine to use if no rules match. */
  readonly defaultEngine: string;
  /**
   * Routing rules. Maps a condition to an engine name.
   * If the condition is met, the corresponding engine is used.
   * For now, the condition is a simple substring match on the intent.
   * In the future, this could be extended to evaluate the full context.
   */
  readonly routes: ReadonlyArray<{
    readonly intentMatches: string;
    readonly engine: string;
  }>;
}

/**
 * RoutingAgentAdapter (Composite Pattern)
 * Intercepts the request and routes it to the configured engine based on the intent.
 * This is the implementation of GT-385 (Multi-engine routing).
 */
export class RoutingAgentAdapter implements IAgentEnginePort {
  constructor(
    private readonly config: EngineRouterConfig,
    private readonly engines: Readonly<Record<string, IAgentEnginePort>>,
  ) {
    if (!this.engines[this.config.defaultEngine]) {
      throw new Error(`Default engine '${this.config.defaultEngine}' is not provided in the engines map.`);
    }
  }

  async plan(
    request: AgentRuntimeRequest,
    availableSkills: readonly SkillDescriptor[],
  ): Promise<AgentEnginePlan> {
    let targetEngineName = this.config.defaultEngine;

    // Evaluate routes in order
    for (const route of this.config.routes) {
      if (request.intent.toLowerCase().includes(route.intentMatches.toLowerCase())) {
        targetEngineName = route.engine;
        break; // First match wins
      }
    }

    const targetEngine = this.engines[targetEngineName];
    if (!targetEngine) {
      throw new Error(`Configured engine '${targetEngineName}' is not provided in the engines map.`);
    }

    return targetEngine.plan(request, availableSkills);
  }
}
