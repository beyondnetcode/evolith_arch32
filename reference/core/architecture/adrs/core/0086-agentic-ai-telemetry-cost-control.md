> **Bilingual Navigation:** [Ver versión en Español](./0086-agentic-ai-telemetry-cost-control.es.md)

# ADR-0086: Agentic AI Telemetry & Cost Control Standard

## Status
Accepted

## Date
2026-06-20

## Context
Evolith's adoption of the Agentic AI Topology introduces autonomous agents that iterate, reason, and call external Model Context Protocol (MCP) tools over multiple cycles. Unlike standard deterministic API requests, agentic interactions (like ReAct loops) can consume highly variable amounts of LLM tokens per user interaction.
Without stringent observability, a stuck agent loop or a hallucination can exhaust API budgets rapidly, and it becomes impossible to attribute costs back to specific domains, users, or workflows. 

## Decision
We mandate a standardized **OpenTelemetry (OTel)** schema for all Agentic AI execution paths. Any system invoking an LLM (whether via direct API, LangChain, or custom SDKs) MUST emit OTel traces encompassing both standard generative AI conventions and Evolith-specific attributes.

The mandated telemetry attributes are:

### 1. Standard Generative AI Attributes (Semantic Conventions)
- `gen_ai.system`: The provider of the LLM (e.g., `openai`, `anthropic`, `gemini`, `ollama`).
- `gen_ai.request.model`: The specific model invoked (e.g., `gpt-4o`, `claude-3-5-sonnet`).
- `gen_ai.usage.prompt_tokens`: Count of input tokens.
- `gen_ai.usage.completion_tokens`: Count of output tokens.
- `gen_ai.usage.total_cost_usd`: Calculated or proxy-emitted cost in USD.

### 2. Evolith-Specific Agentic Attributes
- `evolith.agent.session_id`: A UUID grouping a continuous multi-step autonomous reasoning loop (spanning multiple LLM calls).
- `evolith.mcp.tool_calls`: An array of MCP tools requested by the agent during the step.
- `evolith.domain`: The bounded context that initiated the agentic workflow.

## Consequences
### Positive
- **Cost Attribution**: Organizations can query APM platforms (like Datadog, Jaeger, or Grafana Tempo) to calculate exact USD costs per `evolith.domain` or per `session_id`.
- **Anomaly Detection**: Runaway loops can be detected and alerted upon by summing `prompt_tokens` grouped by `session_id`.
- **Performance Profiling**: We gain precise latency tracking (Time To First Token - TTFT) across different underlying models.

### Negative
- **Instrumentation Overhead**: SDKs and BFFs must be augmented or wrapped to ensure these attributes are injected correctly.
- **Proxy Requirement**: To enforce `total_cost_usd` safely without relying on client honesty, organizations might need to deploy an LLM Gateway (like LiteLLM or an internal proxy) to emit these metrics authoritatively.

> **Agent Signature:** Architect Agent
