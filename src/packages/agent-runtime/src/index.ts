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
export { ArchitecturePlanInterpreter } from './capabilities/architecture-plan-interpreter';
export { GeminiProvider } from './providers/GeminiProvider';
export type { ILLMProvider } from './providers/ILLMProvider';
