> **Bilingual Navigation:** [Ver version en Espanol](./0001-harness-engineering.es.md)

# ADR-0001: Harness Engineering for AI-Augmented Development

## Status
Accepted

## Date
2026-06-23

## Context and Problem
As Evolith integrates AI agents into its CI/CD pipeline and development workflows, the harness layer that orchestrates these agents becomes a first-class architectural concern. The harness is the boundary between human intent and machine execution. Without explicit engineering discipline, harness scripts accumulate drift: secret leakage in LLM prompts, unbounded token budgets, silent failures in agent invocations, and inconsistent exit contracts across scripts.

The current harness under `.harness/scripts/ci/` contains 22+ numbered scripts that form the CI gate pipeline. Several of these scripts invoke external LLM providers (Gemini, OpenAI) or evaluate OPA WASM bundles, yet they lack a unified contract for input redaction, cost telemetry, error classification, and result validation.

Historical incidents that motivated this ADR include: (1) `13-agentic-code-review.mjs` sending the full raw git diff to Gemini without redaction, exposing potential secrets; (2) `14-rag-index-sync.mjs` claiming live status while its vector-store calls were commented TODOs; (3) inconsistent exit codes across scripts making it impossible for `ci-runner.mjs` to distinguish a validation failure from an infrastructure error.

## Decision
We establish **Harness Engineering** as a distinct engineering discipline within Evolith with four pillars:

### 1. Input Sanitization Contract
Every script that sends data to an external LLM or embedding provider MUST route through `review-input.mjs` or `rag-sync.mjs`, which enforce:
- Secret redaction via regex patterns (API keys, tokens, connection strings)
- Byte and token budget enforcement with hard caps
- Policy-relevant file selection to minimize context noise
- Deterministic chunking at H2 boundaries for RAG ingestion

### 2. Provider Port Pattern
External service dependencies (LLMs, embedding APIs, vector stores) MUST be accessed through a provider port (`review-provider.mjs`, `rag-port.mjs`). Direct imports of vendor SDKs inside numbered CI scripts are prohibited. Ports expose a `registerAdapter` mechanism so that provider switching requires zero changes to orchestration logic. The port pattern includes:
- A default `memory` adapter for local-only mode
- Fail-closed behavior when a requested adapter is not registered
- Adapter health checks before batch operations

### 3. Result Validation Gate
All structured outputs from AI providers MUST be validated against a versioned schema before acting on them. The pattern established by `review-result.mjs` (schema version `1.0`, fail-closed on malformed or indeterminate results) is the canonical approach. Validation must happen before any side effect (commit, upsert, notification).

### 4. Exit Code Contract
All harness scripts MUST follow:
- Exit `0` on success
- Exit `1` on validation failure or provider error
- Exit `2` on invalid arguments
- Structured JSON receipts to stdout for machine consumption
- No exit codes other than 0, 1, or 2 are permitted

## Consequences

### Positive
- **Reproducibility**: Every AI-assisted gate can be re-run with deterministic inputs.
- **Cost control**: Token budgets are enforced at the harness level, not per-provider.
- **Provider independence**: Switching from Gemini to another LLM requires only a new adapter, not a rewrite of orchestration logic.
- **Auditability**: Structured receipts enable drift detection and post-hoc analysis.
- **Fail-closed safety**: Malformed AI output never propagates as a silent success.

### Negative
- **Boilerplate overhead**: New scripts must wire into ports and schemas before they can call external services.
- **Schema maintenance**: Versioned result schemas require ongoing governance as AI providers change output formats.
- **Port registration discipline**: Each new provider requires a port adapter implementation and registration, adding a development step.

### Neutral
- **Migration effort**: Existing scripts that bypass ports (e.g., direct Gemini calls) must be refactored to use the port pattern. This is a one-time cost tracked by Gap GT-235.

## References
- [ADR-0002: MCP Integration Protocol](./0002-mcp-integration-protocol.md)
- [ADR-0003: Model Selection Governance](./0003-model-selection-governance.md)
- [Gap GT-147: Operational Drift Audit](../../../sdlc/standards/vision/gap-reference-catalog.md)
- [review-provider.mjs](../../../../.harness/scripts/ci/agentic/review-provider.mjs)
- [review-input.mjs](../../../../.harness/scripts/ci/agentic/review-input.mjs)
- [review-result.mjs](../../../../.harness/scripts/ci/agentic/review-result.mjs)
- [rag-port.mjs](../../../../.harness/scripts/ci/rag-port.mjs)

---
[Back to ADR Index](../README.md)

> **Agent Signature:** Architect Agent
