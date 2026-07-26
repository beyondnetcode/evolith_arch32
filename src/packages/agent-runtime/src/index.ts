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

// GT-575 — the governed LLM egress path. `GeminiProvider` implements
// `IAssistantTransport` (the governed seam, used behind SupervisedAssistantClient)
// and the deprecated `ILLMProvider`, both through the same controlled core:
// OFF BY DEFAULT (`EVOLITH_LLM_EGRESS=true` opts in), key in the `x-goog-api-key`
// header, timeout, byte/token budget, secret redaction, schema-validated response
// and an audit record per attempt. ADDITIVE to the GT-388 public-surface freeze.
export {
  GeminiProvider,
  GEMINI_EGRESS_HOST,
  GEMINI_EGRESS_ENV_FLAG,
  GEMINI_API_KEY_ENV_VARS,
  GEMINI_DEFAULT_MODEL,
  GEMINI_DEFAULT_TIMEOUT_MS,
  GEMINI_RESPONSE_SCHEMA,
  ASSISTANT_PROPOSAL_SCHEMA,
} from './providers/GeminiProvider';
export type { GeminiProviderOptions, FetchLike } from './providers/GeminiProvider';
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
/** @deprecated GT-575 — use `IAssistantTransport` behind `SupervisedAssistantClient`. */
export type { ILLMProvider } from './providers/ILLMProvider';
