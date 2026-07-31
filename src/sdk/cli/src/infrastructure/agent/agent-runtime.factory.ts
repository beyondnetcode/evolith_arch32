import {
  type AgentRuntimeRequestWire,
  type AgentRuntimeResult,
  type IAgentRuntime,
  SmartCliChatInteractionAdapter,
  SmartCliCommandInteractionAdapter,
  createAgentRuntime,
} from '@beyondnet/evolith-agent-runtime';

/**
 * GT-399: CLI AgentRuntimeFactory.
 *
 * Uses the package-level `createAgentRuntime()` bootstrap with env-var-driven
 * adapter overrides. When the relevant env vars are set, the CLI swaps stub
 * adapters for real HTTP/process adapters. When unset, the default in-memory
 * stubs are used (design rule #5 — offline/test mode).
 */
export class AgentRuntimeFactory {
  private static cachedRuntime: IAgentRuntime | null = null;

  /**
   * Builds or returns a cached runtime with adapters resolved from env vars.
   *
   * | Env Var | Adapter Swapped |
   * |---|---|
   * | `AGENT_RUNTIME_CORE_ENDPOINT` | StubCoreEvaluationAdapter → HttpCoreEvaluationAdapter |
   * | `AGENT_RUNTIME_CORE_TOKEN` | Bearer token for Core HTTP calls |
   * | `AGENT_RUNTIME_HARNESS_ROOT` | InMemoryHarnessAdapter → HarnessProcessAdapter |
   */
  static createDefaultRuntime(): IAgentRuntime {
    if (this.cachedRuntime) return this.cachedRuntime;

    const overrides: Record<string, unknown> = {};

    // GT-399: Swap Core evaluation adapter when endpoint is configured.
    const coreEndpoint = process.env.AGENT_RUNTIME_CORE_ENDPOINT;
    if (coreEndpoint) {
      const { HttpCoreEvaluationAdapter } = require('@beyondnet/evolith-agent-runtime');
      const coreToken = process.env.AGENT_RUNTIME_CORE_TOKEN;
      const headers: Record<string, string> = coreToken
        ? { Authorization: `Bearer ${coreToken}` }
        : {};
      overrides.coreEvaluation = new HttpCoreEvaluationAdapter({ endpoint: coreEndpoint, headers });
    }

    // GT-399: Swap Harness adapter when harness root is configured.
    // GT-608: the same root also seeds the skill catalogue, so the CLI routes the
    // capabilities the manifest declares — and honours their `requiresApproval`
    // posture — instead of the hardcoded 7-skill table. Without this the executor
    // and the catalogue disagree about what this checkout can do.
    const harnessRoot = process.env.AGENT_RUNTIME_HARNESS_ROOT;
    if (harnessRoot) {
      const { HarnessProcessAdapter } = require('@beyondnet/evolith-agent-runtime');
      overrides.harness = new HarnessProcessAdapter({ harnessRoot });
      overrides.harnessRoot = harnessRoot;
    }

    const { runtime } = createAgentRuntime(overrides as Parameters<typeof createAgentRuntime>[0]);
    this.cachedRuntime = runtime;
    return runtime;
  }

  static createCommandAdapter(): SmartCliCommandInteractionAdapter {
    return new SmartCliCommandInteractionAdapter();
  }

  static createChatAdapter(): SmartCliChatInteractionAdapter {
    return new SmartCliChatInteractionAdapter();
  }

  static async executeCommand(input: AgentRuntimeRequestWire): Promise<AgentRuntimeResult> {
    const adapter = this.createCommandAdapter();
    const runtime = this.createDefaultRuntime();
    return runtime.handle(adapter.toRuntimeRequest(input));
  }

  static async executeChat(input: AgentRuntimeRequestWire): Promise<AgentRuntimeResult> {
    const adapter = this.createChatAdapter();
    const runtime = this.createDefaultRuntime();
    return runtime.handle(adapter.toRuntimeRequest(input));
  }
}
