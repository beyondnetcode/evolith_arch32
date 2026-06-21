> **Bilingual Navigation:** [Ver versión en Español](./operational-budgets-runbook.es.md)

# Operational Budgets Runbook — Serverless and Edge

Operational budgets in `topology.manifest.json` (`spec.operationalBudgets`) are **architectural envelopes**, not financial plans. Tracker still owns `roi`, `cost`, and `budget` decisions per the manifest's `businessBoundary`. This runbook is how operators verify a satellite remains inside the envelope.

This runbook is normative for **serverless** and **edge-computing**; other topologies may inherit it where useful.

## What the budgets mean

| Field | Meaning | Failure signal |
|---|---|---|
| `latencyBudgetMs` | p99 end-to-end execution budget | p99 latency exceeds the budget over a 24h window |
| `coldStartCeilingMs` | Maximum acceptable cold-start | p95 cold-start exceeds the ceiling over a 7-day window |
| `costEnvelopePerExecutionCents` | Per-execution architectural ceiling (whole cents) | Average cost per execution exceeds the envelope over the billing period |

If any signal fires, the architecture choice must be revisited. The values are not SLOs sold to a customer — they are the line above which the topology stops paying for itself.

## How to measure

### Latency
- Source: distributed tracing (OpenTelemetry spans). Use `service.name = <satellite>` and `topology.id = serverless|edge-computing` as filters.
- Query: p99 of the root span's duration over a rolling 24h window.
- Sampling: at least 1% of production traffic, never less than 1000 traces/day.

### Cold-start
- Source: function-runtime metric (`aws.lambda.init_duration_ms`, `gcp.run.startup_latency`, equivalent for edge runtimes).
- Query: p95 over 7 days, partitioned by deployment package version.
- Note: the ceiling is measured per package, not per cold-start event — a warm container that occasionally cold-starts is acceptable; a package whose p95 is above the ceiling is not.

### Cost
- Source: provider billing export (CSV or BigQuery dataset) or a curated cost dashboard.
- Query: `total_cost_cents / total_invocations` over the full billing month.
- Allowance: a 10% headroom is acceptable during a single billing cycle as long as the trend reverses; two consecutive cycles above the envelope require revisiting the architecture.

## Reporting

A satellite that exceeds any envelope must:

1. Open a finding in its Tracker board referencing the relevant gap (GT-165) and the offending manifest version.
2. Attach the measurement window and the raw query so the finding is reproducible.
3. Propose a remediation: either bring the satellite back inside the envelope, document a justified exception (rare), or raise an ADR proposing a new envelope.

A measurement run that stays inside every envelope produces a maturity-evidence entry. No finding is required.

## When to revise the envelope

Architectural envelopes are durable, not aspirational. Revise only when:

- A new runtime or platform genuinely changes the floor (e.g., a serverless runtime ships sub-100ms cold-start by default).
- Two or more satellites have produced sustained evidence that the envelope is the wrong cut.
- A successor ADR formalizes the change.

Do not lower an envelope just because one satellite cannot meet it — that satellite is the signal, not the envelope.

## References

- [`topology-manifest.schema.json`](../../../../rulesets/schema/topology-manifest.schema.json) — schema definition of `operationalBudgets`.
- [ADR-0095 — Serverless Architecture Governance](../../adrs/core/0095-serverless-architecture-governance.md).
- [ADR-0096 — Edge Computing Architecture Governance](../../adrs/core/0096-edge-computing-architecture-governance.md).
- [GT-165](../../../governance/standards/vision/gap-reference-catalog.md#gt-165) — Gap that established this runbook.
