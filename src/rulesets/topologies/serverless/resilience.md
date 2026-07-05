# Serverless — Resilience Guide

> **Bilingual Navigation:** [English](./resilience.md) | [Español](./resilience.es.md)

**Owner:** Platform Engineering
**Topology:** Serverless

---

## Idempotency

Every function must be idempotent. Use idempotency keys derived from the event payload or a client-supplied token. Store idempotency records in a fast, durable store with a TTL matching the business domain. Reject duplicate invocations with the original result.

## Retry with Exponential Backoff

Configure retries with exponential backoff and jitter for transient failures. Set maximum retry attempts based on function timeout and latency budget (1500 ms total). Distinguish retryable errors (5xx, throttling) from permanent failures (4xx, validation). Avoid unbounded retry loops.

## Checkpointing

For long-running or fan-out workflows, persist intermediate state to external storage. Use durable queues or databases as checkpoints. Resume from the last checkpoint after failure rather than restarting the entire workflow. Keep checkpoint writes atomic.

## DLQ Recovery

Route unrecoverable failures to the DLQ. Implement a dedicated recovery function that inspects, transforms, and reprocesses DLQ entries. Alert immediately on DLQ depth exceeding threshold. Maintain audit trails for every DLQ processing attempt.

## Cold Start Mitigation

Reserve provisioned concurrency for critical paths to stay within the 1000 ms cold start budget (SV-R04). Warm functions on a schedule to prevent idle-timeout evictions. Use lightweight runtimes and minimize package size (SV-R03). Profile cold starts continuously and regress on degradation.

## Stateless Design (SV-R02)

Functions must not hold local state between invocations. Externalize all state to managed stores (database, cache, queue). Treat each invocation as independent. Validate this invariant in integration tests.

---

[Back to Serverless Profile](./README.md)
