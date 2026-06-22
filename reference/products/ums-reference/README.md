# UMS Reference Product Hub

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

Welcome to the **User Management System (UMS) Reference** product hub. UMS is the official executable, enterprise-grade applied reference for the Evolith progressive architecture corpus. Unlike Tracker, Smart CLI, MCP Services, and the Core API — which are products *built by* this corpus — UMS is a reference product *consumed by* this corpus: a public, open-source satellite that demonstrates how a satellite project adopts, extends, and specializes Evolith Core rules.

This hub gives UMS the same first-class product structure as the other entries under `reference/products/` so adopters can navigate it without descending into knowledge/demo paths.

---

## 1. Why UMS Is the Applied Reference

The legacy To-Do sandbox was retired because it could not credibly demonstrate enterprise concerns — identity lifecycles, authorization boundaries, audit, multi-tenant data protection. UMS provides a real bounded problem space (enterprise identity and access) operated as an independent satellite.

- **Repository:** [github.com/beyondnetcode/ums](https://github.com/beyondnetcode/ums)
- **Master Index:** [UMS Master Index](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md)
- **Architecture portal:** [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md)

UMS evidence is consumed by this corpus through ADR candidates, canonical pattern extraction, and traceability practices — never as authoritative policy. The boundary between corpus rules and product evidence is explicit (see [Reference vs Applied Model](../../knowledge/demo/demo-vs-reference.md)).

---

## 2. Product Surface

| Area | Where |
|---|---|
| Product Overview | [overview.md](./overview.md) — bounded contexts, tech stack, deep-link table. |
| Reference Model | [reference-model.md](./reference-model.md) — what is inherited from UMS and how. |
| Technical Overview (full) | [UMS Technical Overview](../../knowledge/demo/ums-technical-overview.md) |
| Reference vs Applied Model | [demo-vs-reference.md](../../knowledge/demo/demo-vs-reference.md) |
| Migration Ledger (legacy To-Do → UMS) | [migration-from-todo-to-ums.md](../../knowledge/demo/migration-from-todo-to-ums.md) |
| Upstream Source | [UMS Repository](https://github.com/beyondnetcode/ums) |

---

## 3. Adoption Model

UMS implements a modular monolith satellite that adopts, extends, and specializes Evolith Core rulesets. Use it to study:

- Bounded context isolation (Identity, Access, IGA, Audit, Compliance, Approvals, Configuration).
- Clean / hexagonal architecture across .NET 8 + EF Core + SQL Server.
- API protocol separation: REST commands + GraphQL queries.
- Production-grade observability with OpenTelemetry context propagation.
- Multi-tenant RLS combined with temporal auditing.

UMS adoption details live in [adoption-cases](../../knowledge/adoption-cases.md). Decisions promoted from UMS into Evolith Core are recorded as ADRs and never the other way around.

---

## 4. Boundary

UMS is *evidence*, not policy:

- Universal rules live in `reference/` (this corpus).
- Product-level evidence, code, and runtime selections live in the UMS repository.
- Runtime selections in UMS (SQL Server, Redis, .NET 8) are not normative for the corpus unless an accepted Evolith artifact promotes them.

---

## 5. SDLC Worked Examples

Every SDLC artifact template ships a UMS-worked example so adopters can compare a real product walkthrough against the canonical template:

- [PRD example — UMS](../../governance/sdlc/04-artifact-templates/examples/prd-example-ums.md)
- [ADR example — UMS](../../governance/sdlc/04-artifact-templates/examples/adr-example-ums.md)
- [Functional Story — UMS](../../governance/sdlc/04-artifact-templates/examples/functional-story-example-ums.md)
- [Test Summary — UMS](../../governance/sdlc/04-artifact-templates/examples/test-summary-report-example-ums.md)
- [Release Notes — UMS](../../governance/sdlc/04-artifact-templates/examples/release-notes-example-ums.md)
- [Executive Scorecard — UMS](../../governance/sdlc/04-artifact-templates/examples/executive-scorecard-example-ums.md)

---

[Back to Products Index](../README.md)
