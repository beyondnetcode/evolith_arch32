# ADR 0104: Interaction Adapter Port for Evolith Agent Runtime

**Date:** 2026-07-02
**Status:** Accepted
**Context:** AI-Augmented / Evolith CLI / Agent Runtime

## Context and Problem Statement
The Evolith Agent Runtime needs to support multiple user interfaces seamlessly—specifically, the Evolith CLI (command mode), Evolith CLI (chat mode), Hermes Agent Chat Box, and potentially the Model Context Protocol (MCP). Each interface has different security contexts, default execution behaviors (e.g., interactive chat defaults to `dry_run = true`), and intent parsing requirements. The runtime must enforce Core Governance rules securely across all these interfaces without coupling the orchestration logic to the UI specifics.

## Decision
We introduce the `InteractionAdapterPort` as the unified entry point for all interface interactions with the `AgentRuntimeService`.

1. **AgentRuntimeRequestWire Extension:** The base request contract now includes `source_interface`, which defines the origin (`smart_cli_command`, `smart_cli_chat`, `hermes_agent_chatbox`, etc.).
2. **Interaction Adapters:** Each interface implements its own adapter (e.g., `SmartCliCommandInteractionAdapter`, `HermesChatBoxInteractionAdapter`) that acts as a boundary translation layer. These adapters map UI-specific inputs into the canonical `AgentRuntimeRequest` and impose domain defaults (e.g., forcing `dry_run` for chat if not explicitly provided).
3. **Governance Enhancement:** The `GovernancePosture` of capabilities (`SkillDescriptor`) now supports `allowedSourceInterfaces`. The `SkillRegistry` validates these permissions during resolution, ensuring that critical operations (e.g., a destructive Core Engine evaluation) cannot be triggered from an unauthorized interface like a passive chat box.
4. **Agent Runtime Orchestration:** The `AgentRuntimeService` performs a secondary check on `sourceInterface` and ensures clear fallback messaging if a chat interaction occurs when the reasoning engine (Hermes) is disabled.

## Consequences

**Positive:**
- **Decoupling:** The Core API and Agent Runtime remain strictly stateless and UI-agnostic.
- **Security:** Chat interfaces can safely explore intents without bypassing HITL (Human-in-the-Loop) or unintentionally modifying data, as they can be constrained by `allowedSourceInterfaces` and forced `dry_run`.
- **Flexibility:** New conversational clients (e.g., MCP) can be integrated easily by implementing a new adapter.

**Negative:**
- **Complexity:** Adds a mapping layer before requests reach the runtime, requiring new capabilities to explicitly declare their allowed source interfaces if they wish to restrict access.

## References
- ADR-0101: Stateless Core Evaluation Engine
- ADR-0073: Evaluation Envelope Standard
