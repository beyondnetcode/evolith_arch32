/**
 * HermesAgentAdapter — OPTIONAL, REPLACEABLE adapter that lets Hermes Agent act
 * as the runtime's reasoning engine behind {@link IAgentEnginePort}.
 *
 * Design rules #1 & #2 in force here:
 *  - Hermes is NEVER imported from the domain/application. It only appears in
 *    this adapter file, and even here it is loaded LAZILY (dynamic import) so
 *    the package builds and the runtime boots with Hermes NOT installed.
 *  - Swapping Hermes for another framework, or for an in-house engine, means
 *    writing a sibling adapter — nothing in the core changes.
 *
 * The constructor takes a `HermesClient` port: either inject a real client, or
 * let the adapter attempt to lazy-load one from the configured module. If
 * neither is available it throws a CLEAR, actionable error (never a cryptic
 * module-not-found), so "Hermes not installed yet" is a first-class state.
 */

import type { IAgentEnginePort, AgentEnginePlan } from '../../domain/ports/agent-engine.port';
import type { AgentRuntimeRequest } from '../../domain/contracts/agent-runtime-request';
import type { SkillDescriptor } from '../../domain/contracts/capability';

/**
 * The minimal surface the adapter needs from Hermes. A real Hermes client is
 * adapted to THIS shape — the runtime never sees Hermes' real API. Replace the
 * mapping below when wiring the actual SDK.
 */
export interface HermesClient {
  /** Ask Hermes to choose a tool + arguments given a goal and a tool catalog. */
  complete(input: {
    readonly goal: string;
    readonly context: Readonly<Record<string, unknown>>;
    readonly tools: ReadonlyArray<{ readonly id: string; readonly description: string }>;
  }): Promise<{ readonly tool?: string; readonly arguments?: Record<string, unknown>; readonly rationale: string }>;
}

export interface HermesAdapterOptions {
  /** Inject a ready Hermes client (preferred for tests + DI). */
  readonly client?: HermesClient;
  /** Module to lazy-load when no client is injected (default '@evolith/hermes-agent'). */
  readonly moduleName?: string;
  /** Factory export name on that module (default 'createHermesClient'). */
  readonly factoryExport?: string;
}

export class HermesAgentAdapter implements IAgentEnginePort {
  private client?: HermesClient;

  constructor(private readonly options: HermesAdapterOptions = {}) {
    this.client = options.client;
  }

  /** Resolve a Hermes client, lazy-loading the module only on first use. */
  private async resolveClient(): Promise<HermesClient> {
    if (this.client) return this.client;

    const moduleName = this.options.moduleName ?? '@evolith/hermes-agent';
    const factoryExport = this.options.factoryExport ?? 'createHermesClient';
    try {
      // Dynamic import keeps Hermes OUT of the build graph and OPTIONAL.
      const mod = (await import(moduleName)) as Record<string, unknown>;
      const factory = mod[factoryExport];
      if (typeof factory !== 'function') {
        throw new Error(`'${moduleName}' has no '${factoryExport}' export.`);
      }
      this.client = (factory as () => HermesClient)();
      return this.client;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Hermes engine is not available (${reason}). Install/configure '${moduleName}', ` +
          `inject a HermesClient, or run the runtime with the StubAgentEngineAdapter. ` +
          `Hermes is an optional adapter — the core does not depend on it.`,
      );
    }
  }

  async plan(
    request: AgentRuntimeRequest,
    availableSkills: readonly SkillDescriptor[],
  ): Promise<AgentEnginePlan> {
    const client = await this.resolveClient();
    const completion = await client.complete({
      goal: request.intent,
      context: {
        tenant: request.context.tenantId,
        product: request.context.productId,
        initiative: request.context.initiativeId,
        phase: request.context.phase,
        gate: request.context.gate,
        parameters: request.parameters ?? {},
      },
      tools: availableSkills.map((s) => ({ id: s.id, description: s.description })),
    });

    return {
      engine: 'hermes',
      proposedTool: completion.tool,
      proposedArguments: completion.arguments ?? request.parameters,
      rationale: completion.rationale,
    };
  }
}
