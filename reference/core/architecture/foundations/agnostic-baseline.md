# Agnostic Architecture Baseline

> **Bilingual Navigation:** [Versión en Español](./agnostic-baseline.es.md)

**Status:** Authoritative
**Owner:** Evolith Architecture Board
**Applicability:** Mandatory for every product, runtime, and satellite implementation.

## 1. Purpose

This document is the **top-level architectural baseline** for Evolith. It states the runtime-agnostic principles, patterns, and constraints that every component MUST honor before any runtime-specific or product-specific decision is taken. Runtime profiles, ADRs, and product implementations extend this baseline; none of them may weaken it.

The baseline is the prose form of the prueba de fuego for Core decisions: **if a named tool, provider, or framework disappeared, the rules below would still hold.**

## 2. Authoritative Documents

This file is the entry point. The normative depth lives in:

| Layer | Document | Role |
|---|---|---|
| Principles | [Architecture Principles](../../foundations/principles/README.md) | Provider neutrality, ACL, evidence integrity, human accountability, tenant isolation. |
| Structural rules | [Universal Architecture Standards](../blueprints/authoritative-tech-stack-agnostic.md) | Full specification of the runtime-agnostic baseline (hexagonal core, contracts, persistence, security, observability, deployment). |
| Reference blueprint | [Reference Blueprint (arc42)](../blueprints/reference-blueprint.md) | C4 model, phase evolution, ADR matrix, quality attributes. |
| Phase gate | [Simplicity Checklist — Phase 1](../blueprints/simplicity-checklist-phase-01.md) | Gate before adding complexity beyond the baseline. |
| Decisions | [ADR Registry](../adrs/README.md) · [ADR Matrix](../adrs/adr-matrix.md) | Accepted trade-offs and their scope. |
| Topology composition | [Topology Hub](../topologies/README.md) | Multi-Topology Reference Corpus. |

A document is part of the agnostic baseline only when it remains valid under the prueba de fuego above. Runtime profiles and canonical patterns are conditioned guidance, not baseline policy.

## 3. Universal Principles

The baseline rests on five principles, each provider-neutral and product-neutral:

1. **Provider Abstraction & Plugin Model.** Domain depends on ports, never on a named provider, SDK, ORM, or framework. Concrete adapters live in infrastructure and are replaceable without domain change.
2. **Anti-Corruption Layer at every external boundary.** External models cross into the domain only through translation. The domain owns its language.
3. **Evidence Integrity & Lineage.** Every governance claim (gate result, decision, closure) is reproducible from repository history and resolvable artifacts. No placeholder, speculative, or waived evidence.
4. **Human Accountability & Agent Boundaries.** Mutative operations have human owners. Agents may propose; humans approve. The audit trail records both.
5. **Tenant Isolation & Provider Neutrality.** Schema-per-context isolation, opt-in row-level security, S3-compatible storage protocols, OpenTelemetry signal standards. No cross-tenant joins, no proprietary SDK in domain code.

The expanded principle catalog lives at [`principles/`](../../foundations/principles/README.md).

## 4. Universal Patterns

Mandatory structural patterns, runtime-agnostic:

- **Hexagonal Architecture (Ports & Adapters).** Single domain-owned port per capability; one direct adapter in Phase 1, additional adapters when justified by an ADR.
- **Contract-First Integration.** Public surfaces are RESTful (OpenAPI v3); internal synchronous calls escalate to gRPC (Protocol Buffers) from Phase 2; async integration uses AMQP / CloudEvents with a Transactional Outbox.
- **Atomic Frontend & Cache-First State.** One modular React monolith until Phase 3+, Module Federation only by exception, asynchronous cache-first state (`stale-while-revalidate`), shared atomic design tokens.
- **Provider-Neutral Foundation Infrastructure.** Cache via abstract cache port (Redis-compatible reference). Object storage via S3-compatible protocol (MinIO reference). Relational persistence per ADR-0051 with schema-per-context isolation and ADR-0054 normalization rules.
- **OpenTelemetry-Native Observability.** W3C Trace Context tracing, structured JSON logs, OpenTelemetry Collector as the vendor-neutral handoff point.
- **Containerized, Phased Deployment.** OCI containers with distroless bases. Phase 1 may run on VM, App Service, or Docker Compose. Kubernetes is mandatory from Phase 3+ with Helm v3 charts that remain flavor-agnostic.

Each pattern is fully specified in the [Universal Architecture Standards blueprint](../blueprints/authoritative-tech-stack-agnostic.md).

## 5. Non-Negotiable Constraints

Violation of any of the following automatically fails the Architecture Gate:

- **Zero SDK Policy in the domain.** No cloud-provider SDKs, ORM libraries, or HTTP frameworks reach the domain layer.
- **No plaintext secrets.** Secrets live in OpenBao (Vault-compatible) and are consumed only via sidecar injection.
- **Zero Trust networking.** OIDC / OAuth 2.0 / SAML 2.0 federation with RS256-signed JWTs. mTLS becomes mandatory upon activating the distributed mesh (Phase 3+).
- **No proprietary observability lock-in.** Vendor agents may not replace OpenTelemetry instrumentation.
- **Provider-neutral object storage.** Proprietary binary SDKs for storage are prohibited; domain code interacts only via S3-compatible ports.
- **No cross-context SQL joins.** Schema-per-context isolation is absolute; cross-context reads happen through domain APIs.

## 6. How the Baseline Evolves

- Changes to this document MUST be accompanied by a Core ADR documenting the trade-off and the ratification scope.
- Runtime profile updates that conflict with the baseline are rejected at the Architecture Gate; the conflict is resolved either by amending the baseline (via ADR) or by reverting the runtime decision.
- Closure of any baseline-affecting gap follows the [Gap Closure Evidence Standard](../../control-center/evidence/gap-closure-evidence-standard.md).

---

[Back to Architecture Hub](./README.md)
