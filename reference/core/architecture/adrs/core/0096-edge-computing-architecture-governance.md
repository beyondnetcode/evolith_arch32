# ADR-0096: Edge Computing Architecture Governance

**Status:** Accepted  
**Date:** 2026-06-20  
**Tags:** `architecture`, `execution`, `topology`

## Context

Edge computing places workloads near users, devices, or constrained networks where central runtime coordination is limited by latency, connectivity, or regulatory constraints. Without explicit governance, satellite products risk forking domain logic, inconsistent state synchronization, weak security in constrained environments, and unobservable failure modes.

## Decision

We adopt the **Edge Computing** execution topology with the following governing principles:

1. **Locality Justification**: Edge placement must be justified by latency, resiliency, locality, or regulatory constraints. It is not an optimization without documented rationale.
2. **Explicit Synchronization**: State synchronization between edge and central control plane must be declared, observable, and conflict-aware.
3. **Edge Security**: Edge nodes must enforce authentication, authorization, and secret handling appropriate to constrained environments, even during offline operation.
4. **Observability Under Intermittent Connectivity**: Edge workloads must report health, failure, and trace context with store-and-forward capability for offline periods.
5. **Domain Ownership Preservation**: Edge logic must not fork domain behavior outside the owning bounded context. Edge is a placement choice, not an ownership boundary.

All satellites adopting this topology MUST provide `edge-computing.config.json` declaring `syncStrategy`, `edgeIsolation`, and `conflictResolution`.

## Consequences

- **Positive:** Enables low-latency, offline-tolerant, and locality-aware execution without sacrificing architectural governance. Preserves domain ownership across placement boundaries.
- **Negative:** Adds configuration and synchronization overhead for edge adopters. Conflict resolution strategies require explicit design per workload.
- **Compliance:** Governed through EC-R01 through EC-R03 in the executable architecture rules and enforced by the Native evaluator and OPA policy.

> **Agent Signature:** Architect Agent
