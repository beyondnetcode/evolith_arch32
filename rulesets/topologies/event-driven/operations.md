# Event-Driven — Operations Guide

> **Bilingual Navigation:** [English](./operations.md) | [Español](./operations.es.md)

**Owner:** Architecture Board
**Topology:** Event-Driven

## Purpose

Define operational procedures for managing event brokers, monitoring consumer lag, handling dead-letter queues (DLQs), ensuring event flow observability, and managing partitions in event-driven architectures.

## Broker Management

### Health Monitoring

- Track broker uptime, connection count, and message throughput per topic.
- Configure health checks on broker readiness and liveness probes.
- Alert on broker memory usage exceeding 80% of allocated capacity.

### Capacity Planning

- Monitor topic partition count against consumer parallelism.
- Scale broker nodes when sustained throughput exceeds 70% of peak capacity.
- Review retention settings quarterly to align with storage budgets.

## Consumer Lag Monitoring

- Expose consumer lag metrics via broker-native tooling (e.g., Kafka Consumer Groups).
- Set alert thresholds: warning at 10,000 messages, critical at 100,000 messages lag.
- Track lag trends weekly; investigate persistent lag growth.

## Dead-Letter Queue (DLQ) Handling — ED-R03

- Route unprocessable messages to DLQ after configurable retry exhaustion (default: 3 attempts).
- Monitor DLQ depth daily; messages older than 72 hours require manual triage.
- Implement DLQ replay tooling with idempotency guards before reprocessing.

## Event Flow Observability — ED-R08

- Instrument producers and consumers with distributed tracing (OpenTelemetry).
- Capture event metadata: topic, partition, offset, timestamp, producer ID.
- Maintain event flow dashboards showing produce/consume rates, error rates, and end-to-end latency.

## Partition Management — ED-R04

- Design partition keys to ensure ordering guarantees where required.
- Avoid hot partitions by distributing keys across high-cardinality domains.
- Monitor per-partition throughput; rebalance when variance exceeds 3x across partitions.

## Composable Applicability

| Composable | Guidance |
|---|---|
| Modular Monolith | Embedded broker; partition management is intra-process. |
| Distributed Modules | Shared broker cluster; cross-module consumer lag monitoring required. |
| Microservices | Full broker infrastructure; per-service consumer group isolation. |
| Serverless | Managed broker services; partition scaling handled by provider. |
| Edge Computing | Local broker instances with periodic cloud sync. |

## ADR References

- **ADR-0015**: Event broker infrastructure and partitioning strategy.
- **ADR-0079**: Event observability and monitoring standards.

---

[Back to Event-Driven Profile](./README.md)
