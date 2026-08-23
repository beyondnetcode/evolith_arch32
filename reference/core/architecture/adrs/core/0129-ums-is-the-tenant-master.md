> **Bilingual Navigation:** [Ver versión en Español](./0129-ums-is-the-tenant-master.es.md)

# ADR-0129: The Tenant Master Is UMS, and the Suite Projects a Versioned Snapshot

## Status

Accepted — 2026-08-22. In force. Supersedes [ADR-0106](./0106-master-tenant-context-projections.md).

<!-- implementation-status: none -->
> **Implementation status in this repository: none** (2026-08-22). Evolith Core neither emits nor
> consumes the tenant snapshot: it is a stateless evaluation engine and receives the tenant as
> context ([ADR-0101](./0101-core-stateless-evaluation-engine.md)). This ADR records where the
> boundary now sits so the Core corpus stops naming a system that does not exist. The emitter lives
> in UMS and the consumer in the Tracker; both are named under References.

## Date

2026-08-22

## Context and Problem

[ADR-0106](./0106-master-tenant-context-projections.md) was accepted on 2026-07-08 and named **MMS**
(Master Data Management) "the sole owner of the Master Tenant identity and lifecycle", with MMS
publishing a `TenantProjection` to UMS and to the Evolith Tracker.

**MMS never existed** — not in BeyondNetCode and not in the Evolith suite. The decision was written
against a system that was never built, and each satellite absorbed the cost differently:

- UMS carried ADR-UMS-083, which declared UMS a *consumer* of a tenant master
  it in fact owns: the aggregate, the create/modify/activate/suspend commands and the endpoints that
  expose them all live in UMS. Its tests carried patches whose only purpose was neutralising a
  projection nothing fed.
- The Tracker carried `TenantProjectionConsumer`, listening for
  `Evolith.Contracts.MasterData.TenantEvent` and writing `masterdata.tenant_projection` — a consumer
  that never received a message, into a table that never had a reader.

On 2026-08-22 both satellites reversed the direction: **ADR-UMS-107** supersedes UMS-083 and makes
UMS the tenant master, and **T-059** removes the Tracker's MMS consumer, its contract, its read-model
migrations, its health probe and its `ConnectionStrings:MasterDataDb` requirement, replacing them
with a consumer of what UMS actually publishes.

Evolith Core owns none of that code, but it owns the **corpus that describes the suite**, and that
corpus still says MMS: ADR-0106 as a live Accepted decision with a generated ruleset behind it, four
sibling ADRs naming MMS in passing, and eight product documents — including an incident runbook and
the suite deployment strategy — drawing `masterdata.tenant_projection` into UMS and the Tracker. A
reader who greps this repository today finds an accepted architecture for a system nobody will build.

## Objective and Scope

Record, in the repository that publishes the suite's architecture, where the tenant boundary actually
sits, and retire the MMS description everywhere it survives here.

**In scope:** the Core ADR corpus, the suite and product documentation in this repository, and the
generated ruleset carrying ADR-0106.

**Out of scope, deliberately:** Core's own behaviour. [ADR-0101](./0101-core-stateless-evaluation-engine.md)
is untouched — the Core does not persist a tenant registry, does not subscribe to the snapshot, and
continues to receive tenant identity as evaluation context. This ADR moves no code in `src/`.

## Options Considered

**Option 1 — Amend ADR-0106 in place.** Rewrite its Decision section to name UMS. Rejected: it erases
the reasoning that produced the MMS choice, and the next reader cannot tell whether MMS was
considered and dropped or never considered at all. The failure mode here — an architecture written
against a system that was never built — is exactly the one worth leaving legible.

**Option 2 — Delete ADR-0106.** Rejected for the same reason, more sharply, and it breaks every
inbound link.

**Option 3 — Supersede ADR-0106 with a new decision (chosen).** The corpus convention already used by
[ADR-0099](./0099-opa-bundle-s3-distribution.md): the old decision keeps its text and gains a
`Superseded by` status pointing forward. History survives, the current answer is unambiguous, and the
generated ruleset behind 0106 loses its Accepted backing honestly.

## Decision and Rationale

**UMS is the master of Tenant and publishes its state; the rest of the suite projects.**

### The contract belongs to the suite, not to the emitter

`Evolith.Contracts.Tenancy.TenantSnapshotIntegrationEvent` carries `TenantId`, `Code`, `Name`,
`Status`, `ParentTenantId`, `IsManagementOwner`, `Version`, `ChangeType`, `OccurredAtUtc` and
`SpecVersion`. The namespace is a **suite** namespace rather than the emitting product's, because
MassTransit routes by URN: the type name *is* the agreement between the two sides. Any Evolith system
that later projects tenants — including this one, were that ever decided — must declare that same
type under that same namespace, or it is subscribing to nothing.

### A versioned portrait, not a stream of deltas

The message carries state and a monotonic `Version`, so a consumer upserts by version and discards
what arrives late, reconstructing nothing and trusting no ordering. A broker reorders and redelivers;
that is its normal behaviour, not an anomaly. The payload is short on purpose — branches, identity
providers and parameters do not travel, because a contract that mirrored the emitter's internal model
would need versioning every time that model grew.

### Core stays out of it

The Core evaluates; it does not hold a tenant registry. Nothing in this decision gives it one. This is
the same boundary ADR-0101 draws, and naming UMS as master does not move it — it only replaces a
fictional owner with the real one.

## Evidence and Evaluation Criteria

The criterion is provenance: a decision about who owns the tenant is only worth recording here if the
owning systems have already committed to it in their own repositories, with code behind it.

| Claim | Where it is recorded, with its mechanism |
|---|---|
| UMS owns the tenant and publishes it | **ADR-UMS-107** (Accepted, 2026-08-22, supersedes UMS-083). Version comes from the `tenant_projection_version` database sequence — an aggregate `RowVersion` does not order (the interceptor rotates it randomly) and a timestamp ties. `nextval` advances outside the transaction, leaving deliberate gaps, because a counter that reused a value after a rollback would make the consumer discard the good event as stale. |
| The publish is atomic with the change | ADR-UMS-107: the five mutating commands call `ITenantSnapshotPublisher` **before** `SaveEntitiesAsync`, backed by the bus outbox, so the message is parked in the same transaction and delivered after commit. It is deliberately not a domain-event handler: that dispatch is post-commit and best-effort, so the message would lose atomicity and its loss would be silent. |
| The Tracker projects rather than mirrors | **T-059** (Accepted, 2026-08-22). `code`/`name`/`status` and the tenant's existence are written only by `TenantSnapshotConsumer`; `display_name`, `contact_email`, `tier`, `settings` and localisation stay the Tracker's, because UMS does not know them. |
| Late and duplicate delivery is handled | T-059: `ON CONFLICT (id) DO UPDATE … WHERE ums_projection_version < EXCLUDED.ums_projection_version`. A read-check-write would let two in-flight events for the same tenant both pass, and if the lower version commits last the projection stays stale permanently and silently. The MassTransit inbox dedups by `messageId`; the guard covers what the inbox cannot. |
| MMS never existed | Both ADRs state it, and the evidence is the absence itself: a consumer that never received a message and a read model that never had a reader. |

## Consequences, Risks, and Trade-offs

**Positive.** The corpus stops publishing an architecture for a system nobody will build. A reader
grepping for the tenant master finds one answer, and it matches the code in the two repositories that
hold it.

**Negative and accepted.** ADR-0106's generated ruleset
(`src/rulesets/adr/generated/adr-0106-master-tenant-and-context-projections.rules.json`; the CLI's
copy under `src/sdk/cli/rulesets/` is produced by `copy-rulesets` and gitignored) carries a single
`CORE-0106-01` rule asking that design honour what is now a superseded decision. Regenerating marks
it superseded rather than deleting it, so a satellite that pinned that rule id still resolves it and
can read why it no longer binds.

**Risk carried, not solved.** The contract is duplicated literally in UMS and in the Tracker because
`Unimar.Ums.Sdk.Contracts` has package metadata but has never been published. Two copies of a type
whose *name* is the routing key will diverge silently — a renamed field breaks nothing at compile
time in either repository and breaks everything at runtime. This ADR records the exposure; the fix is
.NET packaging and belongs to those repositories, not to Core's npm scope.

## References

- ADR-UMS-107 — *UMS es el Maestro de Tenant y lo Publica para que la Suite lo Proyecte* (repo `ums`,
  `reference/architecture/adrs/UMS-107-ums-publica-el-tenant-para-que-la-suite-lo-proyecte.es.md`)
- T-059 — *The Tracker projects the UMS Tenant, and stops writing what UMS owns* (repo
  `evolith_tracker`, `docs/adrs/T-059-proyectar-el-tenant-de-ums.md`)
- ADR-UMS-083 — *Consumir proyección de tenant de MMS* (repo `ums`, rejected and superseded by UMS-107)

## Related Decisions and Standards

- [ADR-0101](./0101-core-stateless-evaluation-engine.md) — Core is a stateless evaluation engine. Unchanged by this decision.
- [ADR-0106](./0106-master-tenant-context-projections.md) — superseded by this ADR.
- [ADR-0108](./0108-masstransit-owned-message-topology.md) — MassTransit owns the message topology; the URN routing this decision relies on is described there.
- [ADR-0109](./0109-multi-project-satellite-governance.md) — how satellite decisions relate to Core's corpus.
