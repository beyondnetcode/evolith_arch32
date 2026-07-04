# Distributed Modules — Resilience Guide

> **Bilingual Navigation:** [English](./resilience.md) | [Español](./resilience.es.md)

**Owner:** Architecture Board
**Topology:** Distributed Modules

## Overview

This guide defines resilience patterns for distributed modules, covering circuit breakers, bulkhead isolation, retry strategies, graceful degradation, and timeout cascade prevention.

## Circuit Breakers (DM-R07)

Every inter-module call must be protected by a circuit breaker. When a downstream dependency fails beyond its threshold, the circuit opens and requests fail fast rather than consuming resources.

- **Trip conditions**: Configurable failure rate and slow-call-rate thresholds per dependency.
- **Half-open recovery**: Periodically allows test requests to verify recovery before fully closing.
- **Metrics exposure**: Circuit state transitions are emitted as metrics for dashboarding and alerting.

## Bulkhead Isolation

Resource pools are isolated per module dependency to prevent a single slow or failing dependency from exhausting shared resources.

- **Connection pools**: Each downstream dependency has its own connection pool, independent of others.
- **Thread/task isolation**: Module processing resources are partitioned so a blocked call does not starve other operations.
- **Concurrency limits**: Per-dependency concurrency caps prevent overload propagation.

## Retry with Backoff

Transient failures are handled with retries using exponential backoff and jitter. Retries are bounded to prevent amplified load.

- **Max retries**: Configurable per call path; default bounded to prevent infinite loops.
- **Backoff strategy**: Exponential backoff with jitter to avoid thundering herd on recovery.
- **Retry budget**: Global retry budget caps total retry volume relative to baseline traffic.

## Graceful Degradation

When dependencies are unavailable, modules degrade functionality rather than failing entirely.

- **Feature fallback**: Non-critical features degrade to cached or default behavior.
- **Partial responses**: Modules return partial results when some downstream data is unavailable.
- **User feedback**: Degraded states are communicated to consumers transparently.

## Timeout Cascades

Timeouts are configured at each call boundary to prevent cascading failures across module chains.

- **Per-hop timeouts**: Each inter-module call has an explicit timeout shorter than the caller's timeout.
- **Deadline propagation**: Callers propagate remaining deadline downstream to prevent wasted work.
- **Timeout budgets**: Aggregated timeout budgets prevent long chains from exceeding acceptable latency.

---

[Back to Distributed Modules Profile](./README.md)
