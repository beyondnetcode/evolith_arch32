# ADR-0011: Fault Tolerance and Resiliency Patterns

## Status
Accepted

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

## Deviations in force

Recorded here because a deviation that lives only in a source comment is invisible to the audit
this ADR exists to serve. Anyone reading the Decision above would otherwise believe breaker state
is shared.

### §1 — breaker state is PROCESS-LOCAL, not Redis-backed

`src/packages/agent-runtime/src/adapters/resilience/circuit-breaker.ts` keeps circuit state in the
process. §1 mandates a shared Redis cluster so that a trip propagates across nodes instantly.

**Why.** `GT-560` deleted the previous breaker and removed `opossum` from the tree: the Core is a
stateless evaluation engine (`ADR-0101`) that makes no outbound calls, so the breaker there
protected nothing. The breaker was rebuilt where the runtime genuinely leaves the process — the
agent runtime's mandatory call to the Core API. Sharing its state would reintroduce the very Redis
dependency `GT-560` removed, for a component that has no other reason to require Redis.

**What it costs, stated rather than implied.** Each replica trips independently and converges on
its own within `failureThreshold` calls. The gap between *"each node trips independently"* and
*"the cluster trips at once"* is real: with N replicas, a failing dependency absorbs up to
N × `failureThreshold` calls before every node has stopped calling it, instead of
`failureThreshold`.

**When to revisit.** When the runtime is deployed with enough replicas that N × `failureThreshold`
is a load the dependency cannot absorb, or when Redis becomes a dependency of that component for
another reason. Until then the deviation buys a package with no transitive runtime dependency.

### The parameters this ADR does not fix

The Negative consequences above already say it: *"Requires sophisticated parameter calibration (how
many errors before break, timeout limit, restore cooldown)."* That calibration is still not in this
ADR, which is why `GT-443`'s chaos criterion cannot be checked numerically against it — the drill
asserts that the system recovers and that it measured something, not that recovery landed inside a
budget this document never declared. Quantifying it is open work, and the drill's published MTTR is
the input for doing so.

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

Historical backfill: Address the architectural tension where mission-critical deployments must integrate with volatile third-party APIs (e, establishing a standard boundary.

## Options Considered

- **Selected:** Fault Tolerance and Resiliency Patterns
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [Martin Fowler on Circuit Breakers](https://martinfowler.com/bliki/CircuitBreaker.html)
- [ADR-0002: Clean Hexagonal Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
