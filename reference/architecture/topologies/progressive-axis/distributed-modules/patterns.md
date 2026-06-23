# Distributed Modules — Integration Patterns Guide

> **Bilingual Navigation:** [English](./patterns.md) | [Español](./patterns.es.md)

**Owner:** Architecture Board
**Topology:** Distributed Modules

## Overview

This guide defines integration patterns for distributed modules, covering API contracts, event choreography, shared kernel boundaries, and contract-first development practices.

## API Contracts (DM-R02)

Modules communicate synchronously via explicit, versioned API contracts. Contracts are defined using industry-standard schema languages.

- **Protobuf**: Preferred for high-performance internal RPC with strong typing and schema evolution.
- **OpenAPI**: Used for HTTP/REST APIs exposed to external consumers or cross-system integrations.
- **Schema registry**: All contracts are registered in a centralized schema registry with versioning and compatibility checks.
- **Backward compatibility**: Contract changes must maintain backward compatibility within a major version.

## Event Choreography (DM-R04)

Cross-module state changes are communicated via async events using choreography over orchestration.

- **Event schema validation**: All events conform to a registered schema; invalid events are rejected at publish time (DM-R04).
- **Idempotent consumers**: Event consumers must handle duplicate delivery gracefully.
- **Event ordering**: Per-aggregate ordering is guaranteed within a module; cross-module ordering is best-effort.
- **Dead letter queues**: Unprocessable events route to dead letter queues for inspection and replay.

## Shared Kernel Boundaries

Where modules must share types or utilities, shared kernel libraries are used with strict governance.

- **Versioned shared kernels**: Shared kernel packages are versioned and released independently.
- **Dependency direction**: Shared kernels are leaf dependencies; modules never depend on other modules directly.
- **Minimal surface**: Shared kernels contain only types, contracts, and minimal utilities; no business logic.

## Contract-First Development

All module interfaces are designed before implementation. Contract design is the primary artifact that drives development.

- **Contract review**: New or modified contracts require architecture review before implementation begins.
- **Mock generation**: Contracts generate server and client mocks for parallel development and testing.
- **Compatibility checks**: CI pipelines verify contract backward compatibility on every change.
- **Documentation**: Contracts serve as the primary inter-module documentation; API docs are generated from contract definitions.

---

[Back to Distributed Modules Profile](./README.md)
