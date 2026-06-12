# [ADR 0037](0037-performance-concurrency-chaos-strategy.md): Enterprise Performance, Concurrency & Chaos Verification Strategy

## Status
Approved

## Date
2026-05-11

## Context
Standard functional testing (Unit/E2E) verifies that code behaves correctly under ideal, single-user conditions. It completely fails to predict system behavior under extreme concurrency, high network latency, or partial failure conditions. To guarantee future scalability and absolute production safety, we require a mandatory verification framework defined jointly by Architecture, QA, and Product management.

## Decision
Establish the **Strategic Verification Framework** for performance, load, and operational resilience:

### 1. Tooling Arsenal
* **Load & Performance Testing**: **k6** (Grafana). Mandatory due to its TypeScript native scripting, low footprint, and deep integration with OTel tracing metrics.
* **Contract Testing**: **Pact JS**. Used to verify gRPC and Event payloads between producers/consumers before deploying.
* **Operational Chaos**: **Chaos Mesh / Litmus**. Periodically terminating pods or inducing network delay in staging environments.

### 2. Hypothetical Stress Scenarios (Mandatory Verification)
Product & Architecture require testing against the following hypothetical extreme flows:

#### Scenario A: "The Hyper-Contention Race"
* **Concept**: 5,000 Virtual Users attempt to buy the exact last 5 available units of an inventory item simultaneously (100ms window).
* **Verification Goal**: The DB prevents overselling through Row Locking / Unit of Work, and the Circuit Breaker triggers gracefully if lock contention halts local threads. Zero negative inventory.
* **Metric**: Success rate response < 500ms @ 95th percentile.

#### Scenario B: "The Poisoned Gateway (Latency Injection)"
* **Concept**: Using Chaos Mesh, inject 5 seconds of artificial delay on all responses from the Banking/Customs API external endpoint.
* **Verification Goal**: Confirm Distributed Circuit Breakers ([ADR-0011](0011-fault-tolerance-resiliency-patterns.md)) trip globally within 3 seconds, falling back to cached status or friendly user messaging without cascading failures to unrelated app services.

#### Scenario C: "The Logistical Blackout"
* **Concept**: Disconnect RabbitMQ container entirely while pushing 1,000 transactions per second to the DB.
* **Verification Goal**: The **Transactional Outbox ([ADR-0033](0033-transactional-outbox-pattern.md))** records all events in PostgreSQL. Once re-connected, verify 100% zero-loss consumption playback with no duplicate logic execution.

### 3. Mandatory Verification Gates
- **Baseline Snapshots**: Weekly K6 load tests against the staging environment to detect latency regression > 10% compared to the previous week.
- **Contract Tests in CI**: Any gRPC `.proto` modification triggers downstream PACT verification automatically. Failure halts the build.

## Consequences

### Positive
- Mathematically proves the system can scale before real traffic arrives.
- Establishes immutable empirical benchmarks for system SLAs.
- Protects user experience against hidden race conditions and deadlocks.

### Negative
- Performance scripting requires specialized QA skillsets.
- Requires isolated, persistent Staging environments configured to mimic 1:1 production infrastructure sizes for reliable benchmark data.

## References
- [Grafana k6 Documentation](https://k6.io/docs/)
- [Pact.io - Consumer Driven Contracts](https://docs.pact.io/)
- [ADR-0011: Distributed Circuit Breakers](../../adrs/core/0011-fault-tolerance-resiliency-patterns.md)
- [ADR-0033: Transactional Outbox](../../adrs/core/0033-transactional-outbox-pattern.md)





## Objective and Scope

Historical backfill: Address the architectural tension where standard functional testing (Unit/E2E) verifies that code behaves correctly under ideal, single-user conditions, establishing a standard boundary.

## Options Considered

- **Selected:** Enterprise Performance, Concurrency & Chaos Verification Strategy
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [Grafana k6 Documentation](https://k6.io/docs/)
- [Pact.io - Consumer Driven Contracts](https://docs.pact.io/)
- [ADR-0011: Distributed Circuit Breakers](../../adrs/core/0011-fault-tolerance-resiliency-patterns.md)
- [ADR-0033: Transactional Outbox](../../adrs/core/0033-transactional-outbox-pattern.md)

---
[Back to Index](./README.md)
