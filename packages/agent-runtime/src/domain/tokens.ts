/**
 * Dependency-injection tokens for the Agent Runtime ports.
 *
 * Framework-agnostic `Symbol`s so the package carries NO framework dependency.
 * They can be used as NestJS custom-provider tokens, with a hand-rolled
 * container, or ignored entirely (the {@link AgentRuntimeService} also accepts
 * ports via plain constructor injection — see `createAgentRuntime`).
 */

export const AGENT_RUNTIME_TOKENS = {
  AgentRuntime: Symbol('IAgentRuntime'),
  Harness: Symbol('IHarnessPort'),
  CoreEvaluation: Symbol('ICoreEvaluationPort'),
  PolicyValidation: Symbol('IPolicyValidationPort'),
  TrackerTrace: Symbol('ITrackerTracePort'),
  Memory: Symbol('IMemoryPort'),
  SkillRegistry: Symbol('ISkillRegistryPort'),
  Scheduler: Symbol('ISchedulerPort'),
  CommunicationGateway: Symbol('ICommunicationGatewayPort'),
  Approval: Symbol('IApprovalPort'),
  AgentEngine: Symbol('IAgentEnginePort'),
} as const;
