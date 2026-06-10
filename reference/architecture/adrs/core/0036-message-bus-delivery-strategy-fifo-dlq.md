# [ADR 0036](0036-message-bus-delivery-strategy-fifo-dlq.md): Message Bus Delivery & Flow Control Strategy

## Status
Approved

## Date
2026-05-11

## Context
Event-driven asynchronous architectures require diverse communication guarantees depending on the criticality and nature of the payload. Blindly applying strict ordering (FIFO) everywhere degrades throughput massively, while applying standard fire-and-forget without fallback leads to data loss in critical financial flows. We require canonical rules specifying which messaging delivery mode MUST be applied per transaction type.

## Decision
Adopt the following **Event Delivery Decision Framework** mapping business context to infrastructure queue behaviors:

### 1. Mode: "Fire & Forget" (Standard Fan-out / Topic)
* **Definition**: Asynchronous processing with no guarantee of order, maximum horizontal consumer parallelism.
* **Inflection Points / When to Use**:
 * High-volume metrics, tracing, and logs.
 * Secondary side-effects that do not impact immediate core business flow (e.g., sending email notifications, warm-cache invalidation).
 * Data synchronization where newer messages natively contain total state overrides.
* **Trade-off**: Maximum performance. Potential out-of-order execution.

### 2. Mode: "Strict FIFO Ordering" (Guaranteed Sequence)
* **Definition**: Processing strictly in the order received, tied to a partition key (e.g., `AggregateId`).
* **Inflection Points / When to Use**:
 * **Transactional Accounting**: Ledger entry sequences (debit must complete before balance check logic).
 * **Inventory Locking**: Consecutive stock decrement/increment operations.
 * **State Machine Transitions**: Sequential multi-step business workflows where Step 3 crashes if Step 2 hasn't committed.
* **Implementation Guardrail**: FIFO queues restrict concurrency to a single consumer per shard/partition. Used surgically only where data corruption would occur without it.

### 3. Global Policy: "Dead Letter Queues (DLQ)" & Poison Pill Defense
* **Policy**: MANDATORY for every business-domain queue.
* **Inflection Points / Configuration**:
 * All consumer errors trigger a local **Retry Mechanism** with exponential backoff (Maximum 3 Attempts).
 * Upon 4th consecutive failure (Poison Pill), the message MUST be auto-rerouted to a `.{queue_name}.dlq` holding container.
 * Prevents a single corrupt JSON/Buggy logic point from blocking the entire main pipeline infinitely.
* **Required Action**: Establish automated alerts when DLQ size > 0. Support personnel must inspect and either Re-Drive (Retry) or Archive corrupted packets.

### 4. Mode: "Delayed / Scheduled Delivery"
* **Definition**: Messages pushed to the broker with a mandatory delay Header, rendering them invisible to consumers until the designated time.
* **Inflection Points**:
 * **Business Timeouts**: "If Order is not paid in 30 minutes, trigger cancellation check".
 * **Throttled Reminders**: Pushing a notification email intended for tomorrow at 8:00 AM without using system cronjobs.
* **Mechanism**: Relies on Broker-native delayed exchange plugins or TTL + DLX routing loops.

### 5. Performance Tiering: "Priority Queues"
* **Definition**: Numerical weighting of messages allowing high-priority packets to bypass non-critical packets sitting in the queue.
* **Inflection Points**:
 * **Customer Tier SLAs**: Fast-tracking VIP user requests during high traffic volume bursts.
 * **Emergency Signals**: Critical administrative revocations bypassing standard audit telemetry flow.
* **Rule**: Do not over-use (max 3-5 levels), as infinite low-level starvation can occur.

### 6. Architecture Rule: "Idempotent Consumer Mandate"
* **Rule**: ALL message consumption MUST assume "At-Least-Once Delivery" semantics.
* **Requirement**: The Consumer application must record processed `MessageId` keys (in Redis or DB) and check for existence BEFORE proceeding with internal logic. If `MessageId` was already processed, it MUST be instantly acknowledged and discarded as a duplicate WITHOUT side-effects.

## Consequences

### Positive
- Eliminates the common bottleneck of excessive global queue locking.
- Guarantees zero data loss for critical events through guaranteed DLQ quarantine.
- Protects system throughput while maintaining strict consistency exactly where needed.

### Negative
- Teams must intentionally classify every new event type during design review.
- FIFO requires partition-key design attention inside Producer adapters.

## References
- [RabbitMQ Dead Letter Exchanges](https://www.rabbitmq.com/dlx.html)
- [ADR-0015: Injectable Event Bus Mechanism](./0015-event-driven-architecture-intra-domain.md)
- [ADR-0033: Transactional Outbox Pattern](../../adrs/core/0033-transactional-outbox-pattern.md)





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
