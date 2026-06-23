# Modular Monolith — Resilience Guide

> **Bilingual Navigation:** [English](./resilience.md) | [Español](./resilience.es.md)

**Owner:** Architecture Board
**Topology:** Modular Monolith

---

## Module Failure Isolation

The modular monolith must prevent a single module failure from bringing down the entire application. Isolation is enforced at the module boundary level.

- **Process-level:** All modules share a process; a module crash affects the whole process unless fault isolation is implemented
- **Interface-level:** Modules communicate through well-defined interfaces; a failing module returns errors, not exceptions, to callers
- **Data-level:** Each module's database is independent; a database failure in module A does not block module B's operations

**Design principle:** Fail small, recover fast. Every module must handle upstream failures gracefully.

## Graceful Degradation

When a module becomes unavailable, dependent modules continue operating with reduced functionality rather than failing entirely.

- **Fallback responses:** Modules provide cached or default responses when dependencies are unavailable
- **Feature toggles:** Non-critical features can be disabled when underlying modules degrade
- **Partial functionality:** Core operations continue; auxiliary features degrade gracefully
- **User communication:** Degrading modules signal reduced capacity to the API layer

```
Degradation tiers:
  Tier 1 — Full functionality (all modules healthy)
  Tier 2 — Reduced functionality (non-critical module unavailable)
  Tier 3 — Core only (multiple modules degraded)
  Tier 4 — Maintenance mode (critical failure)
```

## Circuit Breaker for Cross-Module Calls

Circuit breakers prevent cascade failures when a module becomes unresponsive. Each module boundary implements circuit breaker logic.

- **States:** Closed (normal) → Open (failing, reject calls) → Half-Open (testing recovery)
- **Threshold:** Trip after 5 consecutive failures within 30 seconds
- **Recovery:** Half-open state allows 3 test requests; success closes the circuit
- **Timeout:** 10-second default timeout per cross-module call

**Configuration per module pair:**

| Caller | Callee | Timeout | Threshold | Recovery |
|--------|--------|---------|-----------|----------|
| order | inventory | 5s | 3 failures | 60s |
| order | payment | 10s | 5 failures | 120s |
| user | notification | 3s | 5 failures | 30s |

## Resource Pool Isolation

Each module maintains its own resource pools to prevent one module from exhausting shared resources.

- **Database connections:** Per-module connection pools with independent size limits
- **Thread pools:** Module-specific worker pools prevent thread starvation across modules
- **Memory limits:** Module-level memory budgets enforced via runtime constraints
- **Rate limiting:** Per-module rate limits prevent one module from overwhelming the system

**Pool sizing guidance:**

- Start with conservative limits per module
- Monitor utilization and adjust based on actual traffic patterns
- Never allow a single module to consume more than 60% of any shared resource
- Implement backpressure when pools approach capacity

---

[Back to Modular Monolith Profile](./README.md)
