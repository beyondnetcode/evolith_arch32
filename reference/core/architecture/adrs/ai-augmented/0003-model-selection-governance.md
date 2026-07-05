> **Bilingual Navigation:** [Ver version en Espanol](./0003-model-selection-governance.es.md)

# ADR-0003: Model Selection Governance for AI-Augmented Workflows

## Status
Accepted

## Date
2026-06-23

## Context and Problem
Evolith's CI harness and agent workflows invoke multiple AI models for different purposes: code review (agentic review), embedding (RAG index), and potentially classification or summarization. Without governance, model selection becomes implicit and inconsistent: different scripts may hard-code different model endpoints, cost profiles are untracked, and model deprecations propagate as silent failures.

The current `13-agentic-code-review.mjs` historically hard-coded the Gemini endpoint. While refactoring moved provider logic to `review-provider.mjs`, the selection criteria for which model to use in which context remain ad hoc. There is no centralized record of which models are in use, their cost profiles, or their deprecation timelines.

## Decision
We establish **Model Selection Governance** with three binding rules:

### 1. Model Registry
All AI models used in Evolith workflows MUST be registered in a `model-registry.json` artifact with:
- Model identifier and provider (e.g., `gemini-2.0-flash`, `text-embedding-3-small`)
- Capability classification (`code-review`, `embedding`, `classification`, `generation`)
- Cost tier (`budget`, `standard`, `premium`)
- Deprecation date if applicable
- Required environment variable for credentials
- Maximum token budget per invocation

The registry is the single source of truth. Scripts that reference models not in the registry are considered non-conformant.

### 2. Selection Policy
Model selection for each workflow MUST follow a declared policy:
- **Default policy**: Use the lowest-cost model that meets the capability requirement
- **Override policy**: Explicit per-workflow override when the default is insufficient
- **Emergency policy**: Fallback model when the primary is unavailable (must be declared)

Policies are evaluated at script startup. If the declared model is unavailable and no emergency policy exists, the script MUST exit with code 1 rather than silently falling back to an unregistered model.

### 3. Cost Telemetry
Every model invocation MUST emit a structured telemetry record containing:
- Model ID used
- Input/output token counts
- Latency in milliseconds
- Workflow and step that triggered the invocation
- Whether the invocation was within budget

Cost telemetry aggregates are reviewed weekly. Workflows exceeding their declared budget trigger an alert and require explicit renewal before the next execution window.

## Consequences

### Positive
- **Cost predictability**: Weekly telemetry reviews prevent runaway AI spending.
- **Resilience**: Declared fallback models enable graceful degradation when a provider is down.
- **Auditability**: The model registry provides a single source of truth for what models are in use.
- **Deprecation safety**: Known deprecation dates prevent sudden breakage.

### Negative
- **Registry maintenance**: Model registry must be updated whenever a new model is introduced or an existing one is deprecated.
- **Policy rigidity**: The default cost-optimization policy may not suit all use cases, requiring explicit overrides.

### Neutral
- **Registry as artifact**: The `model-registry.json` file is validated by CI alongside other governance artifacts, ensuring it stays current.

## References
- [ADR-0001: Harness Engineering](./0001-harness-engineering.md)
- [review-provider.mjs](../../../../.harness/scripts/ci/agentic/review-provider.mjs)
- [rag-port.mjs](../../../../.harness/scripts/ci/rag-port.mjs)
- [ADR-0090: RAG Knowledge Governance](../core/0090-rag-knowledge-governance.md)
- [ADR-0089: Event-Driven Agentic Workflows](../core/0089-event-driven-agentic-workflows.md)

---
[Back to ADR Index](../README.md)

> **Agent Signature:** Architect Agent
