import {
  AgentRuntimeService,
  AutoApprovalAdapter,
  DEFAULT_SKILLS,
  type AgentRuntimeRequestWire,
  type AgentRuntimeResult,
  InMemoryHarnessAdapter,
  InMemoryMemoryAdapter,
  InMemoryTrackerTraceAdapter,
  LocalSkillRegistryAdapter,
  SmartCliChatInteractionAdapter,
  SmartCliCommandInteractionAdapter,
  StubCoreEvaluationAdapter,
  StubPolicyValidationAdapter,
  type IAgentRuntime,
} from '@evolith/agent-runtime';

export class AgentRuntimeFactory {
  static createDefaultRuntime(): IAgentRuntime {
    return new AgentRuntimeService({
      skillRegistry: new LocalSkillRegistryAdapter(DEFAULT_SKILLS),
      harness: new InMemoryHarnessAdapter(),
      coreEvaluation: new StubCoreEvaluationAdapter(),
      policy: new StubPolicyValidationAdapter(),
      tracker: new InMemoryTrackerTraceAdapter(),
      memory: new InMemoryMemoryAdapter(),
      approval: new AutoApprovalAdapter(),
    });
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
