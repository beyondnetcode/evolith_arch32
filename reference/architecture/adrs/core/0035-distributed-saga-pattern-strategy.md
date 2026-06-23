# ADR-0035: Distributed Saga Pattern Implementation Strategy

## Status
Approved

## Date
2026-05-11

## Context
As the platform evolves from a Modular Monolith into distributed services, traditional **2PC (Two-Phase Commit)** ACID distributed transactions become impossible or severely degrading to performance. To guarantee eventual data consistency across decoupled service boundaries without locking resources, the **Saga Pattern** is required. However, Sagas introduce compensating logic overhead that should only be deployed when strictly necessary.

## Decision
Adopt the following corporate matrix to define the implementation strategy for long-running or multi-service transactions:

### 1. The Local First Rule
Before deploying a Saga, verify if the business process can be contained within a **Single Bounded Context**. If yes, MANDATE the usage of the **Unit of Work Pattern** ([ADR-0019](0019-tactical-design-patterns-future-proofing.md)) to execute a standard ACID transaction locally. This is preferred 100% of the time.

### 2. Evolution Step: The Saga Applicability Condition
Mandate a Saga implementation ONLY when:
1. The transaction must spans **two or more separate microservice databases** (Physically partitioned per [ADR-0031](0031-schema-per-context-domain-event-catalog.md)).
2. Immediate consistency is not required, but **Guaranteed Eventual Consistency** is mandatory.
3. A failure in step N requires an explicit **Rollback/Compensating Action** in step N-1.

### 3. Implementation Style Governance
* **Choreography (Event-Driven Saga)**: Standard recommendation for short chains (2 to 3 steps). Services listen to the Event Bus ([ADR-0015](0015-event-driven-architecture-intra-domain.md)) and react directly to completion/failure events. No central controller.
* **Orchestration (Command-Driven Saga)**: Mandatory recommendation for complex workflows (> 3 steps). Requires a dedicated Saga Orchestrator component that manages the centralized workflow execution and issues compensating commands explicitly.

### 4. Compulsory Mechanics
Any Saga implementation MUST implement:
- **Idempotent Consumers**: All steps must detect and ignore duplicate messages.
- **Transactional Outbox** ([ADR-0033](0033-transactional-outbox-pattern.md)): To guarantee the initial kickoff event is never lost.

## Consequences

### Positive
- Enables highly resilient distributed operations at scale.
- Removes cross-service database locking and starvation risks.
- Provides structured handling for partial business failures.

### Negative
- Increases complexity significantly due to the mandatory logic of "Undo" (Compensating) transactions.
- Debugging cross-service workflows is more complex, relying heavily on unified distributed trace correlation ([ADR-0007](../nodejs/0007-observability-telemetry-loki-opentelemetry.md)).

## References
- [Saga distributed transactions pattern](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/saga/saga)
- [ADR-0033: Transactional Outbox Pattern](../../adrs/core/0033-transactional-outbox-pattern.md)





## Objective and Scope

Historical backfill: Address the architectural tension where as the platform evolves from a Modular Monolith into distributed services, traditional **2PC (Two-Phase Commit)** ACID distributed transactions become impossible or severely degrading to performance, establishing a standard boundary.

## Options Considered

- **Selected:** Distributed Saga Pattern Implementation Strategy
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [Saga distributed transactions pattern](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/saga/saga)
- [ADR-0033: Transactional Outbox Pattern](../../adrs/core/0033-transactional-outbox-pattern.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
