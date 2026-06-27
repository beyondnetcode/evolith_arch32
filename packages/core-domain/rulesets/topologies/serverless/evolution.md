# Serverless — Evolution Guide

> **Bilingual Navigation:** [English](./evolution.md) | [Español](./evolution.es.md)

**Owner:** Platform Engineering
**Topology:** Serverless

---

## Containers to Functions Migration

Migrate containerized workloads to functions by decomposing monolithic handlers into discrete, single-purpose functions. Identify I/O-bound paths first — they benefit most from serverless concurrency. Keep synchronous, long-running tasks in containers. Use strangler-fig patterns to migrate incrementally.

## State Management Evolution

Transition from local state to managed external stores as you adopt serverless. Implement session state in databases or caches, not in function memory. Migrate file-system state to object storage. Audit state management patterns after each topology transition.

## Serverless vs Containers

Choose serverless for event-driven, sporadic, or bursty workloads. Choose containers for sustained, high-throughput, or latency-critical paths that exceed serverless budgets. Use hybrid topologies where serverless handles ingestion and containers handle processing. Document trade-offs explicitly per workload.

## Function Organization

Organize functions by bounded context, not by technical layer. Group related functions into deployment units with shared infrastructure. Maintain a function catalog with ownership, SLA, and cost metadata. Avoid a single flat namespace for all functions.

## Provider Neutrality (ADR-0095)

Design function interfaces to be portable across cloud providers. Abstract provider-specific event formats behind internal schemas. Use open-source runtimes and toolchains where possible. Accept vendor-specific optimizations as deliberate, documented decisions — never accidental coupling.

## Topology Transitions

Follow the progressive architecture path: simple monolith → modular monolith → distributed modules → serverless. Validate readiness criteria before each transition. Revert if operational overhead exceeds product value. Treat topology as a product decision, not an engineering preference.

---

[Back to Serverless Profile](./README.md)
