# ADR-0095: Serverless Architecture Governance

**Status:** Accepted  
**Date:** 2026-06-20  
**Tags:** `architecture`, `execution`, `topology`

## Context

Serverless platforms introduce managed runtime boundaries where the platform owns provisioning, scaling, and infrastructure lifecycle. Without explicit governance, satellite products risk provider lock-in, unbounded execution costs, stateful handler logic, and bypassed domain ownership boundaries. Evolith needs a consistent architecture contract for serverless execution that preserves domain isolation, provider neutrality, and operational observability.

## Decision

We adopt the **Serverless** execution topology with the following governing principles:

1. **Stateless Execution**: Handlers must not assume persistent local state. All durable state belongs to the owning bounded context, not the handler runtime.
2. **Explicit Contracts**: Every serverless handler must declare its inputs, outputs, events, and external dependencies through versioned contracts.
3. **Provider-Neutral Interfaces**: Core architecture rules must not reference specific serverless providers. Provider selection belongs to product or platform profiles.
4. **Bounded Deployment Packages**: Deployment artifacts must declare a maximum size and bounded initialization time to prevent cold-start degradation.
5. **Observability Mandate**: Each handler must emit traceable evidence and failure signals consumable by the Evolith shared observability plane.

All satellites adopting this topology MUST provide `serverless.config.json` declaring `stateless`, `package.maxSizeMb`, and `coldStart` constraints.

## Consequences

- **Positive:** Enables managed execution scaling without sacrificing domain ownership. Preserves extraction readiness for other topologies. Prevents vendor lock-in at the architecture level.
- **Negative:** Adds configuration overhead for serverless adopters. Cold-start and package-size constraints may not fit all workloads.
- **Compliance:** Governed through SV-R01 through SV-R04 in the executable architecture rules and enforced by the Native evaluator and OPA policy.

> **Agent Signature:** Architect Agent
