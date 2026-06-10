# [ADR 0011](0011-fault-tolerance-resiliency-patterns.md): Fault Tolerance and Resiliency Patterns

## Status
Approved

## Date
2026-05-08

## Context
Mission-critical deployments must integrate with volatile third-party APIs (e.g., customs services, bank networks). Synchronous network failures, excessive latency, or transient timeouts at external API points frequently cascade backwards, eating local resource threads and crashing our system availability.

## Decision
Implement explicit Resilience Patterns protecting all outbound system exits:

1. **Distributed Circuit Breaker (Opossum + Redis)**: Wrap outbound network calls in high-level infrastructure adapters. The operational state of the circuit (Open/Closed/Half-Open) MUST be stored in the shared **Redis Cluster** instead of local process memory. When a single application node trips the breaker, the state propels globally across the cluster instantly, preventing redundant failing calls from peer nodes.
2. **Retry with Backoff**: Configure interceptors for non-fatal transient codes to execute transparent exponential backoff attempts natively within adapter logic before handing up an error result.
3. **Decoupled Domain logic**: The core business domain must remain 100% agnostic to these patterns.
4. **Ingress Edge Active Healthchecks**: Enable Kong Gateway upstream circuit-breaking logic. Kong monitors endpoint responsiveness and terminates upstream target assignments at the API gateway level if health metrics collapse, shielding backend nodes from direct wave hits.

## Consequences

### Positive
- Prevents slow dependency outages from starving and drowning local CPU cycles.
- Maintains overall local availability during peripheral remote crashes.
- Delivers much safer user failure flows than infinite browser timeouts.

### Negative
- Adds extra operational logic when debugging integration points.
- Requires sophisticated parameter calibration (how many errors before break, timeout limit, restore cooldown).

## References
- [Martin Fowler on Circuit Breakers](https://martinfowler.com/bliki/CircuitBreaker.html)
- [ADR-0002: Clean Hexagonal Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)





## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](./README.md)
