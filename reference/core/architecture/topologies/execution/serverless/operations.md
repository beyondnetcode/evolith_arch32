# Serverless — Operations Guide

> **Bilingual Navigation:** [English](./operations.md) | [Español](./operations.es.md)

**Owner:** Platform Engineering
**Topology:** Serverless

---

## Cold Start Optimization

Functions must meet a **1000 ms cold start budget** (SV-R04). Use provisioned concurrency for latency-sensitive paths. Keep deployment packages under **50 MB** (SV-R03) to reduce initialization time. Avoid large runtime dependencies; prefer lightweight runtimes (Node.js, Python) over heavyweight stacks.

## Concurrency Limits

Monitor regional concurrency quotas. Implement circuit breakers when approaching limits. Use reserved concurrency to isolate critical functions from noisy neighbors. Track concurrent executions against budgets to prevent throttling cascades.

## Dead Letter Queue (DLQ) Handling

Every asynchronous invocation must declare a DLQ (SV-R01). Failed messages route to the DLQ after retry exhaustion. Process DLQ entries with a dedicated remediation function. Alert on DLQ depth exceeding zero for more than 5 minutes.

## Function Monitoring

Instrument invocations with structured logs, traces, and metrics. Track p50, p95, and p99 latency per function. Monitor error rates, throttle counts, and cold start frequency. Aggregate costs per function for budget accountability (target: **1 cent per execution**).

## Cost Tracking

Tag every function with cost-center metadata. Generate daily cost reports per function and per topology. Alert when per-execution cost exceeds budget. Review idle functions monthly and decommission unused resources.

## Vendor Lock-in Mitigation

Abstract cloud-specific APIs behind internal interfaces (ADR-0095). Use function-runtimes and event formats that portable across providers. Maintain a provider-neutral contract layer for event schemas. Document provider-specific optimizations as deliberate trade-offs, not accidental coupling.

---

[Back to Serverless Profile](./README.md)
