// Harness
export { InMemoryHarnessAdapter } from './harness/in-memory-harness.adapter';
export { HarnessProcessAdapter } from './harness/harness-process.adapter';
export type { HarnessProcessOptions } from './harness/harness-process.adapter';
export { loadManifest, parseManifest } from './harness/harness-manifest';
export type { HarnessCapabilityRuntime } from './harness/harness-manifest';

// Core evaluation
export { StubCoreEvaluationAdapter } from './core/stub-core-evaluation.adapter';
export type { StubCoreOptions } from './core/stub-core-evaluation.adapter';
export { InProcessCoreEvaluationAdapter } from './core/in-process-core-evaluation.adapter';
export type { CoreEvaluationOrchestrator } from './core/in-process-core-evaluation.adapter';
export { HttpCoreEvaluationAdapter } from './core/http-core-evaluation.adapter';
export type { HttpCoreOptions } from './core/http-core-evaluation.adapter';

// Policy / OPA
export { StubPolicyValidationAdapter, denyOnFailedEvaluation } from './policy/stub-policy-validation.adapter';
export type { PolicyDecider } from './policy/stub-policy-validation.adapter';
export { OpaCliPolicyValidationAdapter } from './policy/opa-cli-policy-validation.adapter';
export type { OpaCliOptions } from './policy/opa-cli-policy-validation.adapter';

// Tracker
export { InMemoryTrackerTraceAdapter } from './tracker/in-memory-tracker-trace.adapter';
export { HttpTrackerTraceAdapter } from './tracker/http-tracker-trace.adapter';
export type { HttpTrackerOptions } from './tracker/http-tracker-trace.adapter';
export { MockTrackerTraceAdapter } from './tracker/mock-tracker-adapter';
export { FileTrackerTraceAdapter } from './tracker/file-tracker-trace.adapter';
export type { FileTrackerOptions } from './tracker/file-tracker-trace.adapter';

// Memory
export { InMemoryMemoryAdapter } from './memory/in-memory-memory.adapter';
export { FileMemoryAdapter } from './memory/file-memory.adapter';
export type { FileMemoryOptions } from './memory/file-memory.adapter';

// Knowledge / RAG (GT-408)
export { InMemoryKnowledgeAdapter } from './knowledge/in-memory-knowledge.adapter';

// Skills
export { LocalSkillRegistryAdapter } from './skills/local-skill-registry.adapter';
export { DEFAULT_SKILLS } from './skills/default-skills';

// Interaction adapters
export { SmartCliCommandInteractionAdapter } from './interaction/SmartCliCommandInteractionAdapter';
export { SmartCliChatInteractionAdapter } from './interaction/SmartCliChatInteractionAdapter';
export { HermesChatBoxInteractionAdapter } from './interaction/HermesChatBoxInteractionAdapter';
export type { HermesChatBoxInput } from './interaction/HermesChatBoxInteractionAdapter';
export { ExternalTriggerInteractionAdapter } from './interaction/ExternalTriggerInteractionAdapter';
export { McpInteractionAdapter } from './interaction/McpInteractionAdapter';
export type { McpToolInput } from './interaction/McpInteractionAdapter';
export { OpenCodeInteractionAdapter } from './interaction/OpenCodeInteractionAdapter';
export type { OpenCodeToolInput } from './interaction/OpenCodeInteractionAdapter';

// Gateway
export { CliCommunicationGatewayAdapter } from './gateway/cli-communication-gateway.adapter';

// Scheduler
export { InMemorySchedulerAdapter } from './scheduler/in-memory-scheduler.adapter';
export { FileSchedulerAdapter } from './scheduler/file-scheduler.adapter';
export type { FileSchedulerOptions } from './scheduler/file-scheduler.adapter';

// Approval
export { AutoApprovalAdapter, DenyByDefaultApprovalAdapter } from './approval/policy-approval.adapter';
export { ChatApprovalAdapter } from './approval/chat-approval.adapter';
export { SlackApprovalAdapter } from './approval/slack-approval.adapter';

// Engine (Hermes is OPTIONAL and lives only here, never in the domain)
export { StubAgentEngineAdapter } from './engine/stub-agent-engine.adapter';
export { HermesAgentAdapter } from './engine/hermes-agent.adapter';
export type { HermesClient, HermesAdapterOptions } from './engine/hermes-agent.adapter';
export { SwarmsAgentAdapter } from './engine/swarms-agent.adapter';
export type { SwarmsClient, SwarmsAdapterOptions } from './engine/swarms-agent.adapter';
export { RoutingAgentAdapter } from './engine/routing-agent.adapter';
export type { EngineRouterConfig } from './engine/routing-agent.adapter';
export { PolicyBasedEngineRouter } from './engine/policy-based-engine-router';
export type { RiskAssessment, PrivacyClassification, CostBudget, RoutingPolicyContext, RoutingDecision } from './engine/policy-based-engine-router';
