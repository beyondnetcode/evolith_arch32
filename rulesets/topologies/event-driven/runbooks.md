# Event-Driven — Runbooks Guide

> **Bilingual Navigation:** [English](./runbooks.md) | [Español](./runbooks.es.md)

**Owner:** Architecture Board
**Topology:** Event-Driven

## Purpose

Provide operational runbooks for common event-driven failure scenarios: broker failover, consumer rebalancing, schema migration, DLQ replay, and ordering violation recovery.

## Runbook 1: Broker Failover

**Trigger:** Broker node becomes unresponsive or cluster health check fails.

1. Verify broker node status via cluster management console.
2. Confirm partition leader reassignment has completed automatically.
3. Check consumer group lag for affected topics; alert if lag exceeds threshold.
4. Validate that producer retries are succeeding on surviving brokers.
5. Post-recovery: review broker configuration for replication factor and min-insync replicas.

## Runbook 2: Consumer Rebalancing

**Trigger:** Consumer group experiences repeated rebalances or rebalance storm.

1. Identify the rebalance trigger: new consumer join, consumer crash, or heartbeat timeout.
2. Check consumer instance health: memory, CPU, GC pauses.
3. Review session.timeout.ms and heartbeat.interval.ms configuration.
4. If rebalance storm: temporarily reduce consumer instances to stabilize.
5. Post-recovery: tune timeout settings; consider cooperative sticky assignment strategy.

## Runbook 3: Schema Migration

**Trigger:** Event schema requires a breaking change.

1. Register new schema version in schema registry with compatibility mode set.
2. Deploy updated consumers that tolerate both old and new schema versions.
3. Enable dual-write on producers: emit events in both old and new formats.
4. Monitor consumer error rates during migration window.
5. After all consumers updated: remove dual-write; deprecate old schema.

## Runbook 4: DLQ Replay — ED-R03

**Trigger:** DLQ depth exceeds threshold or business requires reprocessing.

1. Identify DLQ topic and affected consumer group.
2. Review DLQ messages: confirm root cause is resolved (e.g., schema fix deployed).
3. Use DLQ replay tool to republish messages to the original topic.
4. Monitor consumer processing; confirm messages are consumed successfully.
5. Post-replay: verify DLQ depth returns to zero; document root cause.

## Runbook 5: Ordering Violation — ED-R04

**Trigger:** Consumer detects events processed out of expected order.

1. Identify affected partition and event sequence.
2. Check producer partition key distribution; confirm key is stable.
3. Verify consumer is not processing from multiple partitions concurrently without ordering logic.
4. If ordering is critical: enforce single-threaded consumption per partition.
5. Post-recovery: review partition key strategy; consider key redesign if hot partition detected.

## Composable Applicability

| Composable | Guidance |
|---|---|
| Modular Monolith | Simplified runbooks; intra-process failover is automatic. |
| Distributed Modules | Cross-module coordination during failover and rebalancing. |
| Microservices | Full runbook scope; per-service DLQ and ordering management. |
| Serverless | Provider-managed failover; runbooks focus on application-level recovery. |
| Edge Computing | Local failover; runbooks include cloud sync recovery steps. |

## ADR References

- **ADR-0015**: Broker failover and consumer rebalancing procedures.
- **ADR-0079**: Schema migration and DLQ replay standards.

---

[Back to Event-Driven Profile](./README.md)
