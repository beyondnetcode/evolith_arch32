# Event-Driven — Evidence Guide

> **Bilingual Navigation:** [English](./evidence.md) | [Español](./evidence.es.md)

**Owner:** Architecture Board
**Topology:** Event-Driven

## Purpose

Define validation commands, metrics, and compliance checks for evidencing event-driven architecture health: throughput, consumer lag, processing latency, DLQ depth, and contract compliance.

## Validation Commands

| Check | Command |
|---|---|
| Broker health | `kafka-broker-api-versions.sh --bootstrap-server <host>:9092` |
| Consumer group status | `kafka-consumer-groups.sh --bootstrap-server <host>:9092 --group <group> --describe` |
| Topic listing | `kafka-topics.sh --bootstrap-server <host>:9092 --list` |
| Schema registry check | `curl -s <schema-registry>/subjects` |
| DLQ depth | Query DLQ topic message count via broker metrics API |

## Event Throughput — ED-R08

- Measure messages produced and consumed per second per topic.
- Target sustained throughput within 70% of broker peak capacity.
- Alert on throughput drops exceeding 20% from the 7-day rolling average.

## Consumer Lag — ED-R08

- Report current lag per consumer group per partition.
- Aggregate lag across partitions for group-level health assessment.
- Track lag trend: stable, growing, or shrinking over 24-hour windows.

## Processing Latency — ED-R08

- Measure end-to-end latency: event produced timestamp to event consumed timestamp.
- Target P99 latency under 5 seconds for real-time paths; under 60 seconds for batch paths.
- Alert on latency spikes exceeding 3x the baseline.

## DLQ Depth — ED-R03

- Monitor DLQ message count per topic per consumer group.
- Alert when DLQ depth exceeds 100 messages or grows by >10% per hour.
- Report DLQ age: oldest message timestamp per DLQ topic.

## Contract Compliance — ED-R01, ED-R06

- Validate producer schemas against the registered AsyncAPI specification.
- Run schema compatibility checks: `kafka-schema-registry.sh check-compatibility`.
- Report schema drift: events published with unregistered or deprecated schemas.

## Composable Applicability

| Composable | Guidance |
|---|---|
| Modular Monolith | Metrics collected at process level; lightweight validation. |
| Distributed Modules | Cross-module metric aggregation; centralized dashboards. |
| Microservices | Per-service metrics with centralized observability platform. |
| Serverless | Provider-native metrics; export to centralized monitoring. |
| Edge Computing | Local metric collection with periodic cloud upload. |

## ADR References

- **ADR-0015**: Event throughput and lag monitoring standards.
- **ADR-0079**: Observability evidence collection requirements.

---

[Back to Event-Driven Profile](./README.md)
