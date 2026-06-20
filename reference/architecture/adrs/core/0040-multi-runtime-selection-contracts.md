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

Historical backfill: Address the architectural tension where context is unavailable, establishing a standard boundary.

## Options Considered

- **Selected:** Multi-Runtime Selection Matrix & Inter-Runtime Contracts
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

None explicitly linked.

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
