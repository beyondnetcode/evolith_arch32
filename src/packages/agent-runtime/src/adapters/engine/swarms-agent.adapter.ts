/**
 * SwarmsAgentAdapter — OPTIONAL, REPLACEABLE adapter that lets Swarms (e.g. OpenAI Swarm) act
 * as the runtime's multi-agent reasoning engine behind {@link IAgentEnginePort}.
 *
 * Design rules #1 & #2 in force here:
 *  - Swarms is NEVER imported from the domain/application. It only appears in
 *    this adapter file, and even here it is loaded LAZILY (dynamic import) so
 *    the package builds and the runtime boots with Swarms NOT installed.
 *  - Swapping Hermes for Swarms means writing this sibling adapter — nothing in the core changes.
 *
 * The constructor takes a `SwarmsClient` port: either inject a real client, or
 * let the adapter attempt to lazy-load one from the configured module.
 */

import type {
  IAgentEnginePort,
  AgentEnginePlan,
  AgentPlanContext,
} from '../../domain/ports/agent-engine.port';
import type { AgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../../domain/contracts/capability';
import { renderPlanHistory } from './plan-history';

/**
 * The minimal surface the adapter needs from Swarms. A real Swarms client is
 * adapted to THIS shape — the runtime never sees Swarms' real API.
 */
export interface SwarmsClient {
  /** Ask Swarms to orchestrate a goal across multiple agents and choose a final tool. */
  orchestrate(input: {
    readonly goal: string;
    readonly context: Readonly<Record<string, unknown>>;
    readonly availableTools: ReadonlyArray<{ readonly id: string; readonly description: string }>;
  }): Promise<{ 
    readonly selectedTool?: string; 
    readonly arguments?: Record<string, unknown>; 
    readonly rationale: string;
    readonly agentsInvolved: string[];
  }>;
}

export interface SwarmsAdapterOptions {
  /** Inject a ready Swarms client (preferred for tests + DI). */
  readonly client?: SwarmsClient;
  /** Module to lazy-load when no client is injected (default '@beyondnet/evolith-swarms-agent'). */
  readonly moduleName?: string;
  /** Factory export name on that module (default 'createSwarmsClient'). */
  readonly factoryExport?: string;
}

export class SwarmsAgentAdapter implements IAgentEnginePort {
  private client?: SwarmsClient;

  constructor(private readonly options: SwarmsAdapterOptions = {}) {
    this.client = options.client;
  }

  /** Resolve a Swarms client, lazy-loading the module only on first use. */
  private async resolveClient(): Promise<SwarmsClient> {
    if (this.client) return this.client;

    const moduleName = this.options.moduleName ?? '@beyondnet/evolith-swarms-agent';
    const factoryExport = this.options.factoryExport ?? 'createSwarmsClient';
    try {
      // Dynamic import keeps Swarms OUT of the build graph and OPTIONAL.
      const mod = (await import(moduleName)) as Record<string, unknown>;
      const factory = mod[factoryExport];
      if (typeof factory !== 'function') {
        throw new Error(`'${moduleName}' has no '${factoryExport}' export.`);
      }
      this.client = (factory as () => SwarmsClient)();
      return this.client;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Swarms engine is not available (${reason}). Install/configure '${moduleName}', ` +
          `inject a SwarmsClient, or run the runtime with the StubAgentEngineAdapter. ` +
          `Swarms is an optional adapter — the core does not depend on it.`,
      );
    }
  }

  async plan(
    request: AgentRuntimeRequest,
    availableSkills: readonly SkillDescriptor[],
    planContext?: AgentPlanContext,
  ): Promise<AgentEnginePlan> {
    const client = await this.resolveClient();
    // GT-612: prior turns, bounded by `renderPlanHistory` (last 10 entries,
    // ≤200 chars each, ≤2000 chars total) — never the raw transcript.
    const history = renderPlanHistory(planContext?.history);
    const completion = await client.orchestrate({
      goal: request.intent,
      context: {
        tenant: request.context.tenantId,
        product: request.context.productId,
        initiative: request.context.initiativeId,
        phase: request.context.phase,
        gate: request.context.gate,
        parameters: request.parameters ?? {},
        ...(history ? { history } : {}),
      },
      availableTools: availableSkills.map((s) => ({ id: s.id, description: s.description })),
    });

    return {
      engine: 'swarms',
      proposedTool: completion.selectedTool,
      proposedArguments: completion.arguments ?? request.parameters,
      rationale: `[Swarms Orchestration via ${completion.agentsInvolved.join(', ')}] ${completion.rationale}`,
    };
  }
}
