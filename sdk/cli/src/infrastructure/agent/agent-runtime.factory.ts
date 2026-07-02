import {
  AgentRuntimeService,
  AutoApprovalAdapter,
  DEFAULT_SKILLS,
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
}
