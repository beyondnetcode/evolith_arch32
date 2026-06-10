# [ADR 0040](0040-multi-runtime-selection-contracts.md): Multi-Runtime Selection Matrix & Inter-Runtime Contracts

## 1. Status
**Status**: Approved 
**Date**: 2026-05-11 
**Scope**: Corporate Governance (Mandatory) 

---

## 2. Context
To fulfill the **Políglota Corporate Vision**, our organization authorizes multiple execution runtimes. However, without a clear selection policy, teams may select technology based on subjective preference rather than performance suitability. Furthermore, communication between disparate runtimes requires explicit mechanisms to guarantee interoperability without leaking runtime implementation details.

---

## 3. Decision

### A. Runtime Selection Matrix
Teams MUST select the target runtime based exclusively on the specific workload profile:

| Metric | Target Runtime | Rationale |
| :--- | :--- | :--- |
| **Web APIs, BFF, I/O Bound** | **Node.js / TypeScript** | High I/O concurrency, rapid delivery, extensive community ecosystem. |
| **High Compute, ETL, Batch** | **.NET (C#)** | Superior multi-threading performance, typed raw compute, heavy math. |
| **Operative Mobility** | **Android (Kotlin)** | Direct access to hardware peripherals (Scanners, GPS), strict offline mode. |

### B. Inter-Runtime Communications Rule
Direct runtime dependency is forbidden. Communication MUST travers explicitly defined boundaries:
1. **Synchronous Inter-Op**: Mandatorily utilizes **gRPC (Protocol Buffers)** for low-latency type-safe transmission between Node.js and .NET.
2. **Asynchronous Inter-Op**: Utilizes **RabbitMQ/Kafka** with contract validation via JSON-Schema or Protobuf.
3. **Contract Registry**: Contracts must be centrally stored and versioned using semantic versioning. Changes require **Pact JS/Net** backward compatibility verification.

---

## 4. Consequences

### Positive
* **Optimized Cost/Performance**: Each workload runs on the engine most efficient for its memory/CPU profile.
* **Talent Agnostic**: Enables simultaneous hiring across TypeScript, C#, and Android pools.

### Negative
* **Governance Overhead**: Requires maintaining standard templates for 3 distinct toolchains.





## Objective and Scope

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Options Considered

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Evidence and Evaluation Criteria

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

## Related Decisions and Standards

> Backfill pending — tracked as [GT-20](../../../governance/standards/vision/gap-tracking.md#gt-20) (ADR standardization 2026-06-10).

---
[Back to Index](./README.md)
