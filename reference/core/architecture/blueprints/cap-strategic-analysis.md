# CAP Theorem Strategic Analysis & Risk Profile

This artifact presents a rigorous mathematical and theoretical analysis of our Progressive Monolithic Architecture through the lens of the **CAP Theorem** (Consistency, Availability, Partition Tolerance). 

> Scope: CAP decisions in this document are architectural trade-off examples. Concrete technology names illustrate the reference/demo profile and may vary by runtime or product ADR.

---

## 1. The CAP Continuum Analysis

The CAP Theorem dictates that a distributed system can only simultaneously provide two of three guarantees:
* **Consistency (C)**: Every read receives the most recent write or an error.
* **Availability (A)**: Every request receives a non-error response, without the guarantee that it contains the most recent write.
* **Partition Tolerance (P)**: The system continues to operate despite an arbitrary number of messages being dropped or delayed by the network between nodes.

### Architectural Choice: Hybrid CAP Strategy
Our architecture does not blindly choose a single side. Instead, it segments the problem space to employ **CP** for mission-critical core logic and **AP** for high-scale read/channel delivery.

---

## 2. Component Tier Segmentation

### Tier 1: Core API & Persistence (The **CP** Persona)
* **Focus**: Absolute Consistency and Partition Tolerance over 100% Availability during deep failure.
* **Technology Profile**: Transactional API runtime + relational SQL engine with ACID guarantees.
* **Behavior on Partition**: If the primary relational write model experiences a split-brain partition, write operations halt to prevent data corruption rather than accepting dirty writes.
* **ADR References**:
 * [ADR-0010: Dual-Layer Isolation](../adrs/core/0010-multi-tenancy-architecture-strategy.md)
 * [ADR-0019: Unit of Work Pattern](../adrs/core/0019-tactical-design-patterns-future-proofing.md)
* **Pros**: Zero balance corruption, accurate inventory, complete security auditing truth.
* **Cons**: Highly degraded during DB cluster outage.

### Tier 2: Edge caching, CDN & Message Bus (The **AP** Persona)
* **Focus**: High Availability and Partition Tolerance over immediate Consistency.
* **Technology Profile**: Distributed cache + durable message broker + CDN/client cache.
* **Behavior on Partition**: If Node A cannot talk to Node B, they will both continue serving data from their local cache or queue, even if the data is slightly stale (Eventual Consistency).
* **ADR References**:
 * [ADR-0014: 4-Tier Distributed Cache](../adrs/core/0014-multi-layer-distributed-caching-strategy.md)
 * [ADR-0036: Message Bus Flow Control](../adrs/core/0036-message-bus-delivery-strategy-fifo-dlq.md)
 * [ADR-0004: Frontend Offline Resilience](../adrs/nodejs/0004-frontend-offline-resilience.md)
* **Pros**: Extremely low latency, operational during partial network degradation.
* **Cons**: "Stale-While-Revalidate" mechanics require developers to design UIs that handle eventual data arrival.

---

## 3. Risk Management Model

| CAP Axis Divergence | Real-World Risk Scenario | Architectural Defense & Mitigation |
| :--- | :--- | :--- |
| **Consistency vs Availability** | Distributed cache holds an older version of a tenant's user permissions after a dynamic role change. | **Mitigation**: Cache-aside eviction policies on write + hybrid authorization compilation enforcing immediate database graph lookup for high-security scopes ([ADR-0021](../adrs/nodejs/0021-high-performance-auth-and-graph-compilation.md)). |
| **Partitioning Failures** | The message-bus network drops while database updates are writing (dual-write failure). | **Mitigation**: **Transactional Outbox Pattern ([ADR-0033](../adrs/core/0033-transactional-outbox-pattern.md))** saves the event to the relational store (CP zone) and guarantees later broker publication, turning a crisis into managed delay. |
| **State Synchronization** | Two separate microservices process events out of sequence due to network lag. | **Mitigation**: **Idempotent Consumer Standard & FIFO enforcement ([ADR-0036](../adrs/core/0036-message-bus-delivery-strategy-fifo-dlq.md))** ensures the eventual convergence returns to exactly the correct state. |

---

## 4. Strategic Pros and Cons Summary

### Pros of the Current Hybrid Model
1. **Ultimate Performance**: 95% of high-read traffic hits the **AP tier** (Cache/CDN), providing microsecond responses.
2. **Fortified Core**: Critical mutations occur in the **CP tier**, guaranteeing ACID compliance and zero financial data loss.
3. **Graceful Degradation**: If the database goes offline, the AP tier can still serve read-only catalogs and queue user requests for later processing.

### Cons and Trade-offs Accepted
1. **Mental Complexity**: Engineers must constantly decide if a flow needs strong consistency or can survive with "Eventually Consistent" data.
2. **Synchronization Lag**: There is a non-zero latency (milliseconds) between database commit and cache invalidation completion globally.

---
**Evaluation Status**: Verified consistent with International Enterprise Architecture Standards.

---
[Back to Index](./README.md)
