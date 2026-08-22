/**
 * @beyondnet/evolith-agent-runtime — Evolith Agent Runtime.
 *
 * A decoupled agentic layer that operates Evolith Core through Ports & Adapters.
 * It orchestrates, converses, remembers, automates and EXECUTES Core
 * capabilities via ports — it does NOT replace `.harness` (the official,
 * governed executor) and it does NOT depend on Hermes or any LLM framework
 * (those are optional, replaceable adapters behind {@link IAgentEnginePort}).
 *
 * Public surface:
 *  - domain  : contracts (request/result/context/trace/capability), ports, tokens
 *  - application : AgentRuntimeService (the orchestration flow) + pure mappers
 *  - adapters : default in-memory/stub + real (.harness process, OPA, HTTP) + Hermes
 *  - bootstrap : createAgentRuntime() — one-call wiring with safe defaults
 */

export * from './domain/index';
export * from './application/index';
export * from './adapters/index';
export * from './bootstrap';
export { ArchitecturePlanInterpreter, ARCHITECTURE_PLAN_SCHEMA } from './capabilities/architecture-plan-interpreter';

// GT-575 — the ONE governed LLM egress path. `GeminiProvider` is an
// `IAssistantTransport`, used behind `SupervisedAssistantClient`: OFF BY DEFAULT
// (`EVOLITH_LLM_EGRESS=true` opts in), SUPERVISED (a HITL grant per call — the
// supervised client's decision, or an `IApprovalPort` injected into the
// provider), key in the `x-goog-api-key` header, timeout, byte/token budget,
// secret redaction, schema-validated response and an audit record per attempt.
// The deprecated `ILLMProvider`-shaped `generateStructuredJson` method is kept
// for the frozen 1.x consumers and passes the SAME gate, so it is no longer a
// second port. ADDITIVE to the GT-388 public-surface freeze.
export {
  GeminiProvider,
  GEMINI_EGRESS_HOST,
  GEMINI_EGRESS_ENV_FLAG,
  GEMINI_API_KEY_ENV_VARS,
  GEMINI_DEFAULT_MODEL,
  GEMINI_DEFAULT_TIMEOUT_MS,
  GEMINI_RESPONSE_SCHEMA,
  ASSISTANT_PROPOSAL_SCHEMA,
  LLM_STRUCTURED_JSON_SKILL_ID,
} from './providers/GeminiProvider';
export type { GeminiProviderOptions, FetchLike } from './providers/GeminiProvider';

// ADR-0128 — the provider catalog. `ClaudeProvider` is a second `IAssistantTransport`
// under the SAME governance (off by default, supervised, redacted, budgeted, audited);
// the registry is what makes the set of providers ANSWERABLE instead of a switch buried
// in wiring code. There is deliberately no default provider.
export { ClaudeProvider, CLAUDE_DEFAULT_MODEL, CLAUDE_API_KEY_ENV_VARS } from './providers/ClaudeProvider';
export type { ClaudeProviderOptions } from './providers/ClaudeProvider';
// The supervised client and the approval port travel with the registry: a caller
// that can build a transport must also be able to put the HITL gate in front of it,
// and both are needed to wire a provider from outside this package.
export { SupervisedAssistantClient } from './adapters/engine/supervised-assistant.client';
export type { SupervisedAssistantOptions } from './adapters/engine/supervised-assistant.client';
export type { IApprovalPort } from './domain/ports/approval.port';

export {
  ASSISTANT_PROVIDERS,
  listAssistantProviders,
  createAssistantTransport,
} from './providers/assistant-transport.registry';
export type {
  AssistantProviderDescriptor,
  AssistantTransportOptions,
} from './providers/assistant-transport.registry';
export {
  redactSecrets,
  estimateTokens,
  enforceEgressBudget,
  validateJsonSchema,
  parseAndValidateJson,
  consoleLlmEgressAudit,
  noopLlmEgressAudit,
  DEFAULT_EGRESS_BUDGET,
  JSON_OBJECT_SCHEMA,
  REDACTION,
  LlmEgressError,
  LlmEgressDisabledError,
  LlmEgressConfigurationError,
  LlmEgressBudgetError,
  LlmEgressUnsupervisedError,
  LlmResponseSchemaError,
} from './providers/llm-egress';
export type {
  EgressBudget,
  EgressBudgetUsage,
  ILlmEgressAudit,
  JsonSchemaNode,
  LlmEgressAuditEvent,
  LlmEgressOutcome,
  RedactionResult,
} from './providers/llm-egress';
/**
 * @deprecated GT-575 — use `IAssistantTransport` behind `SupervisedAssistantClient`.
 * No shipped class implements this port any more; it is retained purely so the
 * frozen 1.x consumers keep type-checking.
 */
export type { ILLMProvider } from './providers/ILLMProvider';
