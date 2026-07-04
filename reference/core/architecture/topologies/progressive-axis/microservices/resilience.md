# Microservices — Resilience Guide

> **Bilingual Navigation:** [English](./resilience.md) | [Español](./resilience.es.md)

**Owner:** Architecture Board
**Topology:** Microservices

## Chaos Engineering

Run regular chaos experiments against production-like environments. Inject failures (latency, packet loss, pod kills) to validate resilience assumptions. Document results and feed findings back into service hardening. Use tools like Chaos Monkey, Litmus, or Azure Chaos Studio.

## Bulkhead Isolation

Implement **MS-R03** (Bulkhead) at the service and thread-pool level. Isolate critical paths so a failure in one dependency does not consume all resources. Use separate connection pools, thread pools, or process boundaries per dependency.

## Timeout Cascades

Set explicit timeouts on every outbound call. Avoid unbounded waits that propagate latency upstream. Configure timeouts at the client, service mesh, and load balancer layers. The timeout at each layer must be strictly less than the layer above.

## Fallback Strategies

Apply **MS-R04** (Fallback) for every non-critical dependency. Define degraded behaviors: cached responses, default values, or graceful degradation. Fallbacks must be idempotent and safe to retry. Document the fallback path for each service dependency.

## Circuit Breakers

Deploy circuit breakers on every outbound call. States: closed (normal), open (failing, fast-fail), half-open (probing). Configure failure thresholds and recovery windows per dependency. Expose circuit breaker state as a health metric for observability.

## Health Probes

Define liveness, readiness, and startup probes for every service. Liveness detects unrecoverable states. Readiness controls traffic routing. Startup protects slow-starting services from premature killing. Probes must not depend on external services.

## Retry Budgets

Implement retry budgets per service to prevent retry storms. Cap the total retry rate and escalate to circuit breaker when the budget is exhausted. Use exponential backoff with jitter for individual retries.

## References

| Rule | Description |
|------|-------------|
| **MS-R03** | Bulkhead Isolation |
| **MS-R04** | Fallback Strategies |
| **ADR-0079** | Resilience patterns decision |

---
[Back to Microservices Profile](./README.md)
