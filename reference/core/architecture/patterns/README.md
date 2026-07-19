# Canonical Patterns

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

This catalogue has two levels. **Canonical Architectural Patterns (PAT-NNNN)** state runtime-agnostic norms: the problem, the forces, the invariant, where it applies per topology, and — critically — which existing rule identifiers already enforce it. **Canonical Patterns (CP-NN)** are runtime-specific, copy-paste-ready reference implementations of those norms.

---

## Two Levels: PAT and CP

| | PAT-NNNN | CP-NN |
|---|---|---|
| Scope | Runtime-agnostic architectural norm | Reference implementation for one runtime |
| Answers | *What invariant must hold, and what enforces it?* | *What does that look like in this language?* |
| Cardinality | A PAT has 0..N implementations | A CP implements at most one PAT |
| Machine-readable form | `pat/pat-NNNN-*.json`, validated by `src/rulesets/schema/pattern.schema.json` | none |

Implementation tutorials are deliberately excluded from the PAT norm and referenced instead, so the catalogue does not inherit unreviewed sample code.

## Canonical Architectural Patterns (PAT)

| PAT | Name | Category | Required in | Enforced by | Implementations |
|-----|------|----------|-------------|-------------|-----------------|
| [PAT-0001](./pat/pat-0001-database-per-service.md) | Database per Service | Data Ownership | Microservices, Distributed Modules, Data Mesh | `MS-R06`, `DM-R03` | — |
| [PAT-0002](./pat/pat-0002-contract-testing.md) | Contract Testing | Contracts | Microservices | `MS-R05` | — |
| [PAT-0003](./pat/pat-0003-transactional-outbox.md) | Transactional Outbox | Integration | Event-Driven | `ED-R02`, `CORE-0033-01` | — |
| [PAT-0004](./pat/pat-0004-api-contracts.md) | Explicit Versioned API Contracts | Contracts | Distributed Modules, Microservices, Modular Monolith, Event-Driven | `DM-R02` | — |
| [PAT-0005](./pat/pat-0005-data-as-a-product.md) | Data as a Product | Governance | Data Mesh | `DAM-R01` | — |
| [PAT-0006](./pat/pat-0006-data-contracts.md) | Data Contracts | Contracts | Data Mesh | `DAM-R02`, `DAM-R08` | — |
| [PAT-0007](./pat/pat-0007-federated-governance.md) | Federated Governance | Governance | Data Mesh | `DAM-R03` | — |
| [PAT-0008](./pat/pat-0008-consumption-contracts.md) | Consumption Contracts | Contracts | Data Mesh | `DAM-R06` | — |
| [PAT-0009](./pat/pat-0009-discovery-and-registration.md) | Discovery and Registration | Governance | Data Mesh | `DAM-R09` | — |
| [PAT-0010](./pat/pat-0010-ports-and-adapters.md) | Ports and Adapters | Structure | Modular Monolith, Agentic AI | `MM-R03`, `HXA-01`, `HXA-02`, `HXA-03`, `HXA-04`, `HXA-05`, `HXA-06`, `HXA-07`, `MM-R04`, `MM-R11` | CP-04 |
| [PAT-0011](./pat/pat-0011-data-mapper-and-repository.md) | Data Mapper and Repository | Structure | Modular Monolith | `MM-R12` | — |
| [PAT-0012](./pat/pat-0012-schema-per-domain.md) | Schema per Domain | Data Ownership | Modular Monolith, Distributed Modules, Microservices | `MM-R05`, `MM-R02`, `CORE-0031-01` | — |
| [PAT-0013](./pat/pat-0013-strangler-fig-preparation.md) | Strangler Fig Preparation | Delivery | Modular Monolith, Distributed Modules | `MM-R07`, `DM-R08`, `CORE-0045-01` | — |
| [PAT-0014](./pat/pat-0014-circuit-breaker.md) | Circuit Breaker | Resilience | Distributed Modules, Microservices | `DM-R07`, `CORE-0011-01` | — |
| [PAT-0015](./pat/pat-0015-bulkhead.md) | Bulkhead | Resilience | Microservices | `MS-R03` | — |
| [PAT-0016](./pat/pat-0016-fallback-behavior.md) | Fallback Behavior | Resilience | Microservices | `MS-R04` | — |
| [PAT-0017](./pat/pat-0017-idempotent-consumer.md) | Idempotent Consumer | Resilience | Event-Driven, Distributed Modules, Microservices, Serverless | `ED-R05` | CP-03 |
| [PAT-0018](./pat/pat-0018-anti-corruption-layer.md) | Anti-Corruption Layer | Integration | Modular Monolith, Distributed Modules, Microservices, Agentic AI | `ACL-01`, `ACL-02`, `ACL-03`, `ACL-04`, `ACL-05`, `ACL-06` | — |

### Enforcement Coverage

Every pattern above ships with at least one live rule identifier, so the catalogue is machine-checkable on day one. Three findings are worth calling out:

- **The resilience category had complete enforcement and zero documentation.** PAT-0014 through PAT-0018 are derived from rule statements and ADRs, not from prose — no pattern guide in the corpus described them.
- **Ports and Adapters (PAT-0010) is enforced by ten rule identifiers across two engines**, none of which were linked from the prose describing it.
- **ADR citations are recorded with an explicit verification status.** Several citations in the source prose name an ADR whose recorded title or decision differs from the claim; each PAT documents the discrepancy rather than propagating it. Patterns with no governing ADR — PAT-0002, PAT-0004, PAT-0008, PAT-0009, PAT-0011, PAT-0015, PAT-0016, PAT-0018 — say so explicitly.

## Canonical Patterns by Runtime (CP)

CP entries map to one or more ADRs and can be adopted directly by satellite repositories.

### .NET (C#) Ecosystem

| CP | Title | Type | ADR | Implements |
|----|-------|------|-----|------------|
| [CP-01](./dotnet/cp-01-request-scope-context-propagation.md) | Request-Scope Observability Context Propagation | Cross-Cutting | ADR-0064 | — |
| [CP-02](./dotnet/cp-02-pii-safe-serilog-logging.md) | PII-Safe Structured Logging with Serilog | Security / Observability | ADR-0065 | — |
| [CP-03](./dotnet/cp-03-lightweight-http-idempotency.md) | Lightweight HTTP Idempotency Middleware | Reliability | ADR-0066 | [PAT-0017](./pat/pat-0017-idempotent-consumer.md) |
| [CP-04](./dotnet/cp-04-aop-logging-decorator.md) | AOP Logging Decorator with Observability Envelope | Cross-Cutting | ADR-0064 / ADR-0065 | [PAT-0010](./pat/pat-0010-ports-and-adapters.md) |

## Record Schema

Each PAT carries a machine-readable record alongside its bilingual ficha, validated against `src/rulesets/schema/pattern.schema.json`. The schema supports anti-patterns (`kind: anti-pattern`, requiring `whyProhibited` and `requiredCorrection`), per-topology applicability with its own guidance, variants of one invariant at different granularities, typed relationships between patterns, and ADR citations carrying a `verification` field.

---

**[Back to Architecture](../README.md)** | **[ADR Registry](../adrs/README.md)**
