# ADR-0128: LLM Providers Are a Catalog the Core Publishes and a Choice the Tenant Makes

> **Bilingual Navigation:** English (this document) · [Versión en Español](./0128-llm-provider-abstraction-per-tenant.es.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-08-22 |
| **Deciders** | Product Owner (owner decision) · Architecture Board |
| **Technical story** | The assistant runs on a deterministic stub because no reasoning provider is wired, and wiring one naively would put a metered, paid dependency inside an open-source engine |

<!-- implementation-status: src/packages/agent-runtime/src/domain/ports/assistant-invocation.port.ts, src/packages/agent-runtime/src/providers/assistant-transport.registry.ts, src/packages/agent-runtime/src/providers/ClaudeProvider.ts, src/apps/agent-runtime-api/src/agent-runtime/runtime.factory.ts -->
> **Implementation status in this repository: partial** (2026-08-23). When this ADR was
> accepted on 2026-08-22 nothing implemented it. Phases 1 and 2 have since landed: the
> invocation port, the provider registry with Claude as its first entry, and the per-request
> resolution wired in the runtime factory. What the decision still describes and the code does
> not yet cover — the published catalog surface and per-tenant billing — is not implemented.

## Status

Accepted — 2026-08-22. In force.

## Context

The Tracker's in-app assistant answers with a heuristic match and no prose, because
`runtime.factory.ts` keeps `StubAgentEngineAdapter` whenever `AGENT_RUNTIME_ENGINE` is unset. That
is not an oversight — the comment beside it says the real engine is decision-gated so production
does not fail loud on it. This ADR is that decision.

**What already exists, and constrains the answer more than any new design would:**

| Seam | State | Why it matters here |
|---|---|---|
| `IAssistantTransport` | Shipped, **deliberately vendor-neutral** | The provider boundary is already drawn; nothing needs inventing |
| `SupervisedAssistantClient` | Shipped, **off by default** | A human approves before any socket opens; refuses without granted supervision |
| `llm-egress` (GT-575) | Shipped | Redaction, byte/token ceiling that fails closed, schema validation, content-free audit record |
| `CoworkAgentEngineAdapter` | Shipped | Consumes the supervised client with zero runtime change |
| `PolicyBasedEngineRouter` | Shipped | Routes by `risk_assessment`, `privacy_classification`, `cost_budget` — the vocabulary a provider choice needs |

So the chain from engine to provider is complete except for its last link: **no concrete transport
ships in the package.** Only Gemini exists, and it sits in `providers/` rather than as a registered,
selectable option.

**Three constraints come from the product, not the code:**

1. **Evolith Core is open source and must stay free to run.** Every external support it offers is
   open and unmetered. A paid LLM is the first dependency that breaks that property if the engine
   reaches for it on its own.
2. **The Core is stateless (ADR-0101).** Tenant, product and initiative are *context* on a request,
   never entities the Core owns. It therefore cannot hold a tenant's provider choice or credential.
3. **The market has several strong providers and will keep having them.** Anthropic, Google,
   OpenAI and whoever follows. A design that names one in the engine is wrong on the day it ships.

## Decision

**The Core publishes a catalog of supported providers. The tenant chooses one, supplies its own
credential, and owns the resulting cost.** The engine never picks a provider and never holds a key.

### 1. Provider transports are a registry, not a branch

Each provider is a class implementing `IAssistantTransport` — `invoke(request) → proposal` — plus an
entry in a registry keyed by name. Adding OpenAI, or the provider that does not exist yet, is one
class and one entry: no change to the engine, the approval gate, or the egress controls.

This follows the pattern this repository already uses for identity (ADR-0020) and feature flags
(ADR-0025): the abstraction is the port, and the vendors are interchangeable behind it.

### 2. The choice and the credential travel in the request, not in the Core

The Core exposes *which providers it can speak to*. The Tracker holds, per tenant, *which one is
selected and with what credential*, and puts both into the evaluation context. The runtime uses
what arrives and keeps nothing.

This is the only shape compatible with ADR-0101. It also means a tenant that configures nothing
gets exactly what it gets today: the deterministic stub, no network, no cost.

### 3. Nothing metered runs unless a tenant switched it on

The supervised client stays off by default and the transport keeps refusing without granted
supervision. An unconfigured Evolith Core makes no paid call — ever. That is what keeps "open
source and free to run" true rather than aspirational.

### 4. Consumption is reported by the runtime and accounted by the Tracker

Every invocation returns what it spent — tokens in, tokens out, provider, model. The runtime
reports; the Tracker accumulates per tenant. The Core, being stateless, does neither.

`PolicyBasedEngineRouter` already speaks `cost_budget` with `remaining_tokens` and `max_cost_usd`.
Provider selection can later read the same vocabulary — route confidential data to one provider,
fall back when a budget runs out — without a second mechanism.

## Consequences

**What gets better**

- The assistant can answer for real, on the provider each client already pays for.
- A new provider is a class, not a migration.
- Cost is attributable per tenant by construction, not reconstructed from logs afterwards.
- The open-source promise is enforced by the default, not by documentation.

**What this costs**

- Per-tenant credentials are secrets: encryption at rest, rotation, and never being logged or
  echoed into an evaluation result. The egress redaction already exists; the storage does not.
- Three repositories move: catalog in the Core, configuration and accounting in the Tracker,
  transports in the agent-runtime.
- Provider responses differ in shape. Normalising them into one `AssistantProposal` is the work
  that makes the registry worth having, and it is where the bugs will be.
- A tenant with a misconfigured key gets a failure that must read as *"your provider rejected the
  call"*, never as *"the assistant is broken"*.

**What is deliberately NOT decided here**

- Which provider is the default. There is none, and that is the point.
- Policy-based routing between providers. The vocabulary exists; using it is a later decision.
- Whether Evolith operates a hosted provider on a tenant's behalf. Out of scope: it would make the
  engine metered, which contradicts §3.

## Related ADRs

- [ADR-0101](./0101-core-stateless-evaluation-engine.md) — the Core is stateless; tenant is context
- [ADR-0020](./0020-identity-provider-abstraction-strategy.md) — same abstraction pattern, identity
- [ADR-0025](./0025-feature-flag-provider-abstraction.md) — same abstraction pattern, feature flags
