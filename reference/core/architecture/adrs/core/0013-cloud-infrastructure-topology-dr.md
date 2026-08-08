# ADR-0013: Cloud Infrastructure Topology and Disaster Recovery (DR)

## Status
Accepted

## Date
2026-05-08

## Context
The business operations handled by this architecture demand 24/7 continuous execution stability. A datacenter component failure or broad availability zone blackout cannot bring operational critical path processing offline for manual hours. Our distribution plan across target cloud topologies requires explicit policy definitions.

## Decision
Design infrastructure topology targeting Cloud-Native patterns enforcing high resilience and instant failover potential:

1. **Automated Orchestration**: Deployment evolves by architectural phase. While Phase 1 mandates only standard OCI containers on simple compute (VMs, Compose), deployment into managed cluster platforms capable of autonomous Horizontal Pod Autoscaling (HPA) is strictly activated from Phase 3 onwards.
2. **Multi-AZ Strategy**: Standard operation occurs active-active across several explicit Availability Zones. A secondary backup region remains in warm-standby for immediate disaster pivot.
3. **Global Network Entry**: Deploy a unified external point of ingress (e.g., Cloudflare/Azure Front Door) to analyze health and perform instant routing redirect across regions if local cluster degradation is detected.

## Consequences

### Positive
- Preserves seamless uptime commitments to global corporate operational chains.
- Mitigates damage potential from vendor or structural zone outages.

### Negative
- Active-Active distribution mathematically doubles infrastructure run-costs.
- Requires sophisticated CI/CD pipelines engineered for multi-target orchestration setups.

## References
- [ADR-0011: Fault Tolerance](../../adrs/core/0011-fault-tolerance-resiliency-patterns.md)
- [ADR-0028: Self-Hosted Hybrid Strategy](../../adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md)





## Objective and Scope

Historical backfill: Address the architectural tension where the business operations handled by this architecture demand 24/7 continuous execution stability, establishing a standard boundary.

## Options Considered

- **Selected:** Cloud Infrastructure Topology and Disaster Recovery (DR)
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).


## Recovery objectives, measured (GT-443)

Drill run 2026-08-08 on the local `kind` stack (`evolith-tracker-local`), following
`product/infra/helm/evolith-tracker-postgres/BACKUP_RESTORE.md` exactly rather than a shortcut:
a marker was written, `pg_dump -Fc` taken as the backup CronJob takes it, a second marker written
after it, all 51 application tables across 9 schemas dropped, and the dump restored with
`pg_restore --clean --if-exists`.

### RPO — bounded by the schedule, and it generalises

**≤ 24 hours**, set by the backup CronJob (`schedule: "0 2 * * *"`, `retentionDays: 7`), not by any
property of the hardware. Confirmed behaviourally in the drill: the marker written **before** the
backup survived, the one written **after** it did not. This bound holds in any environment running
this chart, because it is a property of the schedule.

### The restore procedure works

51 tables across 9 schemas came back from a 130 KB dump in **under one second**. `pg_dump -Fc`
carries every schema — it is not restricted with `-n` — which matters here because only one of the
51 tables lives in `public`.

Read that number as a floor for the restore STEP, not as an RTO, and not as a figure that
extrapolates: it was measured on a laptop, against local disk, on a database three orders of
magnitude smaller than a populated one.

### RTO — NOT measured, and the reason is the finding

**No RTO is stated here, because the system cannot currently tell you when it is down.**

During the drill, with 51 of 52 tables destroyed, **both probes stayed green the whole time**:

| probe | path | during total data loss |
|---|---|---|
| liveness | `/health/live` | `200` |
| readiness | `/health/ready` | `200` |

Liveness is correct to stay green and `TrackerHealthChecks` says why: restarting a pod does not fix
a downed database, so tying liveness to it converts an outage into a restart storm. Readiness stayed
green for a different reason — `DbContextHealthCheck` calls `CanConnectAsync`, which asks whether
the database **accepts connections**, not whether it still holds a schema. Dropping every schema
breaks neither.

The consequence is not academic: for the whole outage the pod kept advertising itself as ready and
would have kept receiving traffic that every query would have failed. And for this ADR specifically,
an RTO is *time from failure detected to service restored* — with no signal at either end, any number
published here would be a measurement of the drill script, not of a recovery. Two such numbers (682 ms
and 2 581 ms) were produced during this drill before that was understood, and are recorded here as
discarded rather than quoted.

**What this replaces.** The Positive consequence "preserves seamless uptime commitments" was an
unquantified claim. It is now: an RPO bound that holds and is confirmed, a restore procedure that has
actually been executed, and an explicitly absent RTO with the reason it is absent.

**What would make an RTO measurable**, in order: a readiness signal that goes red when the datastore
is present but unusable, then a drill on an environment with production-shaped data and storage.
Whether readiness should assert schema presence is a design decision with its own failure modes — a
readiness check that is too clever fails closed on its own bugs — and it is not taken here.

## Related Decisions and Standards

- [ADR-0011: Fault Tolerance](../../adrs/core/0011-fault-tolerance-resiliency-patterns.md)
- [ADR-0028: Self-Hosted Hybrid Strategy](../../adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
