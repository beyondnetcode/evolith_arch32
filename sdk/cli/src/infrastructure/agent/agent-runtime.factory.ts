import { AgentRuntimeService } from '@evolith/agent-runtime/application/agent-runtime.service';
import { LocalSkillRegistryAdapter } from '@evolith/agent-runtime/adapters/skills/local-skill-registry.adapter';
import { InMemoryMemoryAdapter } from '@evolith/agent-runtime/adapters/memory/in-memory-memory.adapter';
import { InMemoryTrackerTraceAdapter } from '@evolith/agent-runtime/adapters/tracker/in-memory-tracker-trace.adapter';
import { InMemoryHarnessAdapter } from '@evolith/agent-runtime/adapters/harness/in-memory-harness.adapter';
import { StubCoreEvaluationAdapter } from '@evolith/agent-runtime/adapters/core/stub-core-evaluation.adapter';
import { StubPolicyValidationAdapter } from '@evolith/agent-runtime/adapters/policy/stub-policy-validation.adapter';
import { PolicyApprovalAdapter } from '@evolith/agent-runtime/adapters/approval/policy-approval.adapter';
import { DEFAULT_SKILLS } from '@evolith/agent-runtime/adapters/skills/default-skills';
import { SmartCliCommandInteractionAdapter } from '@evolith/agent-runtime/adapters/interaction/SmartCliCommandInteractionAdapter';
import { SmartCliChatInteractionAdapter } from '@evolith/agent-runtime/adapters/interaction/SmartCliChatInteractionAdapter';
import { IAgentRuntime } from '@evolith/agent-runtime/domain/ports/agent-runtime.port';

export class AgentRuntimeFactory {
  static createDefaultRuntime(): IAgentRuntime {
    return new AgentRuntimeService({
      skillRegistry: new LocalSkillRegistryAdapter(DEFAULT_SKILLS),
      harness: new InMemoryHarnessAdapter(),
      coreEvaluation: new StubCoreEvaluationAdapter(),
      policy: new StubPolicyValidationAdapter(),
      tracker: new InMemoryTrackerTraceAdapter(),
      memory: new InMemoryMemoryAdapter(),
      approval: new PolicyApprovalAdapter(new StubPolicyValidationAdapter()),
    });
  }
  
  static createCommandAdapter(): SmartCliCommandInteractionAdapter {
      return new SmartCliCommandInteractionAdapter();
  }
  
  static createChatAdapter(): SmartCliChatInteractionAdapter {
      return new SmartCliChatInteractionAdapter();
  }
}
