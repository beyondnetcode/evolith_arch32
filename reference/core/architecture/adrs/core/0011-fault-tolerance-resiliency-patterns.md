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

## Calibration in force

The Negative consequences above say this ADR requires *"sophisticated parameter calibration (how
many errors before break, timeout limit, restore cooldown)"* and then never supplies it. That
omission is why `GT-443`'s chaos criterion could not be checked: a drill cannot verify that
behaviour matches a declaration that contains no numbers.

These values are **not invented here**. Three of them are what the code has been running on;
recording them promotes a fact that lived only in a default object into the governance record. The
two budgets are derived from measurement, and the measurements are named so the derivation can be
argued with.

### Breaker parameters

Defined in `src/packages/agent-runtime/src/adapters/resilience/circuit-breaker.ts`.

| Parameter | Value | Why |
|---|---|---|
| `failureThreshold` | 5 consecutive failures | Below this a single transient blip trips the circuit and the retry-with-backoff of §2 never gets its chance; far above it the dependency absorbs a burst it is already failing to serve. |
| `resetTimeoutMs` | 30 000 | The cooldown before a half-open probe. It must exceed a dependency's own restart time or every probe re-trips the circuit — measured container recovery to a healthy state is ~30 s, so this is at the edge and is the first value to raise if half-open probes are seen failing systematically. |
| `timeoutMs` | 10 000 | The point at which a call is ABORTED, not merely abandoned. Its whole purpose is to be far below undici's 300 s default header timeout, which is the stall ADR-0011 was written for. |

### Recovery budgets

Two different questions, so two budgets. Both are asserted by the `chaos-drill` job.

| Budget | Value | Derivation |
|---|---|---|
| MTTR to first governed verdict, total outage, no load | **≤ 25 000 ms** | Two independent CI runs of three drills each — six recoveries, 6/6 successful — gave means of 9 219 ms and 10 971 ms. The budget is ~2× the worse mean. |
| First governed verdict with load still arriving | **≤ 150 000 ms** | The same two runs gave 71 793 ms and 72 361 ms while k6 kept driving traffic. Again ~2×. |

**The headroom is deliberate and so is its size.** These are shared CI runners; a budget at the
observed value would fail on noise and teach everyone to re-run the job, which is how a red check
becomes a ritual. At 2× it still catches the regressions that matter — a recovery that went from
11 s to a minute crosses it, and so does one that stopped happening.

**What is deliberately NOT bounded:** the error rate during the outage. Both runs recorded ~33 %
(247/745 and 235/733), and that is the expected observation of a drill that deliberately kills a
dependency under load, not a defect. Bounding it would make the drill fail for succeeding.

**The sample is two runs, and that is stated rather than implied.** A budget derived from a small
sample is still better than a clause with no number: it is falsifiable, so a wrong value fails and
gets corrected, while prose never does.

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
