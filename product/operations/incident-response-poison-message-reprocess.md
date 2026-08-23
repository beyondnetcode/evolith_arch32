# Poison-Message Reprocess Playbook (MassTransit `_error` queues)

> **Bilingual Navigation:** [Versión en Español](./incident-response-poison-message-reprocess.es.md)

Operational playbook for handling faulted tenant-snapshot projection messages. Fires from the
`MassTransitPoisonMessages` alert (deployment strategy §5.3 · ADR-0108 · GT-463).

## What triggered this

MassTransit retries a failing consume (exponential, 5 attempts). When retries are exhausted it
**moves** the message to `<endpoint-queue>_error` — it never `nack`s, so the broker's dead-letter
exchange never fires. **Any** message sitting in an `_error` queue is a poison message a consumer
could not process. The tenant snapshot has exactly one consumer, so exactly one queue can hold
poison for it:

- `tracker.tenant-snapshot_error`

UMS publishes the snapshot and consumes nothing of it (ADR-0129 · ADR-UMS-107), so there is no
`ums.*` projection queue to shovel. The `ums.tenant-projection_error` and
`tracker.tenant-projection_error` this playbook named until 2026-08-22 belonged to the MMS-era
consumer that T-059 removed.

## Severity

| Depth | Level | Response |
|-------|-------|----------|
| ≥ 1 sustained 2m | P3 | On-call engineer — investigate within 4h |
| Growing / many tenants | P2 | Engineering lead — the producer or a consumer bug is emitting bad events |

## Diagnose (do NOT blindly reprocess)

1. Inspect a faulted message (RabbitMQ management UI → the `_error` queue → *Get messages*, requeue=true):
   ```bash
   kubectl port-forward -n evolith-messaging svc/evolith-rabbitmq 15672:15672
   # open http://localhost:15672 → Queues → tracker.tenant-snapshot_error
   ```
2. Read the MassTransit fault headers (`MT-Fault-Message`, `MT-Fault-StackTrace`) on the message.
3. Classify the root cause **before** reprocessing:
   - **Transient** (DB down, deadlock, broker blip) → the message is fine; reprocess.
   - **Poison by content** (schema/contract mismatch, unparseable payload) → reprocessing will just
     re-fault. Fix the producer/consumer first, or discard the message deliberately.

## Reprocess (shovel `_error` → main queue)

Once the root cause is transient or fixed, move the messages back with a **dynamic shovel**:

```bash
kubectl exec -n evolith-messaging evolith-rabbitmq-server-0 -c rabbitmq -- \
  rabbitmqctl set_parameter shovel reprocess-tenant-snapshot \
  '{"src-protocol":"amqp091","src-uri":"amqp:///","src-queue":"tracker.tenant-snapshot_error",
    "dest-protocol":"amqp091","dest-uri":"amqp:///","dest-queue":"tracker.tenant-snapshot",
    "src-delete-after":"queue-length","ack-mode":"on-confirm"}'
```

- `src-delete-after: queue-length` drains only the messages present when the shovel starts (does not
  loop forever on newly-faulted ones).
- Delete the shovel when done: `rabbitmqctl clear_parameter shovel reprocess-tenant-snapshot`.

## Verify

1. `_error` queue depth returns to 0 and the `MassTransitPoisonMessages` alert clears.
2. The projection catches up: `tracker.tenant-snapshot` drains and stays near-empty. There is no
   applied/discarded counter to read — the MMS-era `masterdata_projection_*` metrics named here
   until 2026-08-22 never had an emitter, and T-059 did not introduce replacements. Queue depth is
   the signal.
3. Spot-check the affected tenant(s): the Tracker's `tenants` row carries the
   `ums_projection_version` UMS last published, and `code`/`name`/`status` match UMS, which is the
   master (ADR-0129).

## Prevent recurrence

- Persistent poison-by-content → the producer emitted an out-of-contract event: reconcile against
  `Evolith.Messaging.Contracts` (DS-12) and add a producer contract test.
- Repeated transient faults → check the Tracker database the consumer writes to (T-059 removed the
  separate `MasterDataDb` connection string; the projection lands in the Tracker's own schema) and
  the readiness posture (readiness must never gate on AMQP — §5.4).

## References
- Deployment strategy §5.3 (poison handling) · ADR-0108 (MassTransit-owned topology) · GT-463.
- Related: [production rollback](./incident-response-production-rollback.md) · [service outage](./incident-response-service-outage.md).
