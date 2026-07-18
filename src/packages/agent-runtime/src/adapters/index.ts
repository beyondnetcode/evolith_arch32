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
// Workspace-context assembler — real inline workspace for the Core (GT-438)
export { FsWorkspaceContextAdapter } from './core/fs-workspace-context.adapter';
export type { FsWorkspaceContextOptions, WorkspaceFsLike } from './core/fs-workspace-context.adapter';

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
export { CompositeTrackerTraceAdapter } from './tracker/composite-tracker-adapter';
export { OpenTelemetryTrackerTraceAdapter } from './tracker/opentelemetry-tracker-adapter';
export type { OpenTelemetryTrackerOptions, OTelTracer, OTelSpan } from './tracker/opentelemetry-tracker-adapter';

// Memory
export { InMemoryMemoryAdapter } from './memory/in-memory-memory.adapter';
export { FileMemoryAdapter } from './memory/file-memory.adapter';
export type { FileMemoryOptions } from './memory/file-memory.adapter';

// Knowledge / RAG (GT-408)
export { InMemoryKnowledgeAdapter } from './knowledge/in-memory-knowledge.adapter';
// Knowledge / RAG production read-side (GT-540 · ADR-0090 / ADR-0112)
export {
  PgVectorKnowledgeAdapter,
  EXPECTED_DIM as PGVECTOR_KNOWLEDGE_DIM,
  RAG_CHUNKS_TABLE,
} from './knowledge/pgvector-knowledge.adapter';
export type {
  EmbedQuery,
  PgClientLike,
  PgVectorKnowledgeConfig,
} from './knowledge/pgvector-knowledge.adapter';

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
export { ChatApprovalAdapter, ChatApprovalTransport } from './approval/chat-approval.adapter';
export type { ChatApprovalOptions, ChatClient } from './approval/chat-approval.adapter';
export { SlackApprovalAdapter, SlackApprovalTransport } from './approval/slack-approval.adapter';
export type { SlackApprovalOptions, SlackClient } from './approval/slack-approval.adapter';
// GT-441: real fail-closed HITL gate (pending/approve/reject/expire)
export { PendingApprovalAdapter, NoopApprovalTransport, ApprovalResolutionError } from './approval/pending-approval.adapter';
export type { PendingApprovalOptions } from './approval/pending-approval.adapter';
export { InMemoryApprovalStore } from './approval/in-memory-approval-store';
// GT-441: durable file-backed approval store + real Slack incoming-webhook client
export { FileApprovalStore } from './approval/file-approval-store';
export type { FileApprovalStoreOptions, ApprovalStoreFsLike } from './approval/file-approval-store';
export { HttpSlackClient } from './approval/http-slack-client';
export type { HttpSlackClientOptions } from './approval/http-slack-client';
// GT-441: Tracker-routed HITL — the Tracker decides (per-tenant approvers), the Core obeys and fails closed
export {
  TrackerApprovalAdapter,
  TRACKER_DECISION_PREFIX,
  TRACKER_UNAVAILABLE_PREFIX,
  isTrackerUnavailable,
} from './approval/tracker-approval.adapter';
export type {
  TrackerApprovalOptions,
  TrackerApprovalClient,
  TrackerApprovalSubmission,
  TrackerApprovalResponse,
} from './approval/tracker-approval.adapter';

// Engine (Hermes is OPTIONAL and lives only here, never in the domain)
export { StubAgentEngineAdapter } from './engine/stub-agent-engine.adapter';
export { HermesAgentAdapter } from './engine/hermes-agent.adapter';
export type { HermesClient, HermesAdapterOptions } from './engine/hermes-agent.adapter';
export { SwarmsAgentAdapter } from './engine/swarms-agent.adapter';
export type { SwarmsClient, SwarmsAdapterOptions } from './engine/swarms-agent.adapter';
export { CoworkAgentEngineAdapter, COWORK_ENGINE } from './engine/cowork-agent.adapter';
export type { CoworkClient, CoworkProposal, CoworkAdapterOptions } from './engine/cowork-agent.adapter';
export { RoutingAgentAdapter } from './engine/routing-agent.adapter';
export type { EngineRouterConfig } from './engine/routing-agent.adapter';
export { PolicyBasedEngineRouter } from './engine/policy-based-engine-router';
export type { RiskAssessment, PrivacyClassification, CostBudget, RoutingPolicyContext, RoutingDecision } from './engine/policy-based-engine-router';
