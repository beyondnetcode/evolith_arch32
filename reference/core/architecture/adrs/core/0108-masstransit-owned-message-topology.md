> **Bilingual Navigation:** [Ver versión en Español](./0108-masstransit-owned-message-topology.es.md)

# ADR-0108: MassTransit Owns the Message Topology; Broker CRDs Are RBAC-Only

> **Agent Signature:** Architect Agent (Winston)

## Status
Accepted

## Date
2026-07-09

## Context and Problem
The master-data projection flow (ADR-0106) has MMS publish `TenantEvent`/`ProductEvent` to a
RabbitMQ broker that UMS and Tracker consume. ADR-0107 established the single-cluster substrate;
this ADR resolves **who declares the message topology** — the exchanges, queues, and bindings.

The initial substrate declared the whole topology **declaratively** via RabbitMQ Messaging
Topology Operator CRDs (`deploy/kubernetes/messaging/tenant-topology.yaml`): an
`x-consistent-hash` exchange `evolith.masterdata`, per-consumer quorum queues with
`x-dead-letter-exchange` arguments, a dead-letter exchange, and weight-`1` bindings.

Adversarial verification against how MassTransit actually moves messages (the topology the
validated live E2E flowed through) found this design is not merely redundant — it is wrong and
partly fatal:

1. **`x-consistent-hash` splits traffic, it does not fan out.** A consistent-hash exchange
   routes each message to **exactly one** bound queue. With both `ums.tenant-projection` and
   `tracker.tenant-projection` bound, every event would reach UMS **or** Tracker (~50/50 by
   `tenantId` hash), **never both**. Fan-out to independent consumer groups requires a
   fanout/topic exchange with one binding per group. Consistent-hash is a *partitioning tool
   inside a single consumer group*, never a pub/sub distribution tool.
2. **CRD-precreated queues collide with MassTransit's declarations → `406 PRECONDITION_FAILED`.**
   MassTransit auto-declares a **fanout type-exchange** (`Evolith.Contracts.MasterData:TenantEvent`)
   and binds each consumer endpoint's own exchange/queue. When a queue already exists with
   different arguments (e.g. the `x-dead-letter-exchange` above), MassTransit's redeclare fails
   with `406` and the endpoint dies **while the pod stays `Ready`** — a silent dead consumer.
3. **Poison messages go to `<queue>_error`, not a DLX.** After retries, MassTransit *moves* the
   failed message to a `<queue>_error` queue; it never `nack`s, so the broker's
   `x-dead-letter-exchange` never fires and the CRD DLX/DLQ are dead letter.

## Decision
**MassTransit owns the message topology.** The message-path CRDs are **retired**; the Topology
Operator is used **only** for the broker RBAC that MassTransit cannot self-declare.

- **Retire** the `Exchange`/`Queue`/`Binding`/DLX CRDs for the message path. MassTransit declares,
  at startup, the fanout type-exchange, one endpoint exchange+queue per consumer group, and the
  `<queue>_error` poison queue.
- **Keep** per-product `User` + `Permission` CRDs (and optional `Policy`). These move from the
  retired file into `deploy/kubernetes/messaging/broker-rbac.yaml`.
- **Endpoint names are pinned in code** (`ums.tenant-projection`, `tracker.tenant-projection`)
  via `ConsumerDefinition`s, not in manifests.
- **Broker permissions are regex over name prefixes**, not per-verb grants (verb-only grants
  break MassTransit's bootstrap because it must `configure`+`write` the type-exchange namespace):
  - `mms` → `configure`/`write` on `^(Evolith\.Contracts\.MasterData.*|mms\..*)$`, `read` none.
  - `ums` → `configure`/`write`/`read` on `^(ums\..*|Evolith\.Contracts\.MasterData.*)$`.
  - `tracker` → symmetric with the `tracker\.` prefix.
- **Poison handling:** alert on the **depth of `ums.tenant-projection_error` /
  `tracker.tenant-projection_error`**; the reprocess runbook shovels `_error` back to the main
  queue. The DLX/DLQ CRDs are retired with the rest.

## Consequences
- **Positive:** true fan-out to both consumers; no `406` startup deadlock; a single source of
  truth for topology (the code that also defines the consumers); least-privilege per-product
  broker users; poison visibility on the queue MassTransit actually uses.
- **Negative / trade-offs:** topology is no longer declaratively reviewable in Git as CRDs — it
  is implied by the MassTransit configuration. Mitigated by (a) pinned endpoint names in code,
  (b) an integration gate (G1) that asserts the consumer endpoint *started* (bus health, not just
  pod `Ready`) and that an `InboxState` row is written on consume, and (c) `_error`-depth alerts.
- **Operational:** readiness probes must **never** gate on AMQP (a broker outage degrades
  freshness, not correctness — the MMS transactional outbox is lossless for the producer); see
  ADR-0033 and the deployment strategy §5.4.

## Alternatives Considered
- **Keep declarative CRDs, fix the exchange type** (fanout + per-group bindings, drop the DLX):
  rejected — even a correct fanout CRD still risks the `406` redeclare collision with MassTransit
  and duplicates a topology MassTransit already owns. Two owners of one topology is the defect.
- **Disable MassTransit topology declaration and drive everything from CRDs:** rejected — fights
  the framework, loses per-consumer error queues, and forfeits contract-typed routing.

## References
- ADR-0106 (master tenant context projections) · ADR-0107 (single-cluster topology) ·
  ADR-0033 (transactional outbox) · ADR-0050 (messaging naming).
- Deployment strategy [§5](../../../../../product/suite/architecture/evolith-suite-deployment-strategy.md) (verified messaging corrections).
- Canonical flow: `mms/docs/architecture/tenant-master-data-projection.md`.
- Gap: Core board **GT-462**; risk register §15 #2/#3.
- Manifest: `deploy/kubernetes/messaging/broker-rbac.yaml`.
