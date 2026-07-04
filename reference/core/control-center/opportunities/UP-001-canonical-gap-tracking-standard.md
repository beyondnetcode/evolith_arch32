# UP-001 — Canonical Gap-Tracking Standard for All Satellites

> Bilingual navigation: [Español](./UP-001-canonical-gap-tracking-standard.es.md)

| Field | Value |
|---|---|
| **ID** | UP-001 |
| **Status** | PROPOSED |
| **Date** | 2026-06-28 |
| **Initiated by** | Evolith Tracker (satellite pilot) |
| **Addressed to** | Evolith Core Architecture Board |
| **Priority** | P0 |
| **Estimated Complexity** | XL |
| **Related GTs** | GT-292 · GT-335 · GT-367 · GT-369 · GT-373 · GT-275 · GT-280 |

## Context

Evolith Tracker adopted Core's gap-tracking design (Board + Reference Catalog + Closure-Evidence Standard + `maturity-reconciliation.json`, with `P0–P3` / `XS–XL` vocabulary, backtick-wrapped status values, IDs linking to the catalog, and pending-first ordering) as its own tracking surface. The adoption confirmed the design is sound and satellite-reusable.

However, today **each repository controls its gaps in its own way**, which breaks the single-source-of-truth rule. Core is the governance authority: the gap-tracking standard must originate from Core, be **mandatory for all satellites**, and be **operable through all three Core surfaces** (CLI, MCP, Core-API).

## Guiding Principle (non-negotiable)

> *One model, one schema, one vocabulary, and one closure flow for the gaps of any Evolith repository (Core or satellite). Zero ad-hoc formats.*

## Objective

Promote Core's gap-tracking system to a **canonical ecosystem standard**, with a single way to control gaps for Core and all satellites, enforced by contract and exposed through CLI/MCP/API.

---

## Scope — Deliverables

### 1. Canonize the Standard (Schema + ADR)

**1.1** Author **ADR `core/00NN — Canonical Gap-Tracking Standard for All Satellites`** (category-qualified ID) declaring mandatory, for Core and all satellites, a four-piece system:

| Piece | Artifact | Key constraints |
|---|---|---|
| **Board** | `*-gap-tracking.md` | Single table `ID \| Gap \| Component \| Phase \| Criticality \| Complexity \| Status`; `Criticality ∈ {P0,P1,P2,P3}`, `Complexity ∈ {XS,S,M,L,XL}`, `Status ∈ {PENDING,IN-PROGRESS,BLOCKED,DEFERRED,DONE}` in backticks; IDs link to catalog; pending-first order (P0→P3, then XS→XL); footer with **Progress** + **Waves** log. |
| **Catalog** | `*-gap-reference-catalog.md` | `#### <ID>` + `**Title**` + bullets (Purpose / Evidence / Impact / Risk / Affected files / Complexity / Proposed fix / Acceptance criteria with checkboxes / Dependencies). |
| **Closure-Evidence Standard** | `*-gap-closure-evidence-standard.md` + `*-gap-closure-evidence.json` | One record per `DONE`: `{id, closedAt, closureCommit, evidence[], validationCommands[], dependencyDisposition, dependencyRationale}`. |
| **Maturity Reconciliation** | `*-maturity-reconciliation.json` | Counts + readiness, **independent per repo**. Core already marks `Evolith Tracker → maturityIncluded:false`. |

**1.2** Create **JSON Schemas** in `rulesets/schema/`:

- `gap-board.schema.json`
- `gap-catalog-entry.schema.json`
- `gap-closure-evidence.schema.json`
- `maturity-reconciliation.schema.json`

Canonical language for machine-readable artifacts: **English** (ADR-0090).

---

### 2. Contract Enforcement (satellite-contracts + OPA)

**2.1** Extend **`rulesets/satellite-contracts/satellite-contracts.rules.json`** (GT-292) with a `gap-tracking` contract requiring each satellite to:

- Provide the four files at canonical locations.
- Have a board valid against schema.
- Have no broken `#detail-` anchors.
- Maintain board↔catalog parity.
- Have closure records for each `DONE` entry (with explicit **grandfathering** for legacy entries).

**2.2** Add the equivalent **OPA rules** and connect them to the **`POST /api/v1/evaluate`** pipeline (`SatelliteEvaluationPipeline`), so that **gap-tracking conformance is an evaluated criterion** for any satellite. Result per rule: `passed | failed | skipped`.

---

### 3. Control Surface in Core — One Way, Three Interfaces with Parity (BR-008)

**3.1 CLI** — add the **`evolith gap`** command group (currently missing; `adr / gate / phase / sdlc / validate` exist):

```
evolith gap list [--status --criticality --component --satellite <id>]
evolith gap show <ID>
evolith gap add
evolith gap close <ID> --commit <sha> --evidence <files>
evolith gap validate
evolith gap reconcile
evolith gap init          # scaffold four canonical files
```

Promote existing harness logic to reusable domain/CLI: **`08-validate-tracking.mjs`**, **`reconcile-maturity.mjs`**, **`sync-tracking-order.mjs`**, **`fix-tracking-parity.mjs`**.

**3.2 MCP** — expand **`read-gap-tracking`** (`packages/mcp-tools/src/tools/read-gap-tracking.js`, GT-335) to a full toolset with CLI parity:

```
evolith-gap-list
evolith-gap-show
evolith-gap-add
evolith-gap-close
evolith-gap-validate
```

Mutative tools: human-in-the-loop + ABAC consistent with the rest of mutative tools.

**3.3 Core-API** — expose, via the satellite registry (GT-367/369/373), with the **ADR-0073** envelope (REST-only per ADR-0074):

| Endpoint | Description |
|---|---|
| `GET /api/v1/gaps` | Core's own gap board as data |
| `GET /api/v1/satellites/{id}/gaps` | Any satellite's gap board |
| `GET /api/v1/gaps/summary` | Cross-ecosystem aggregate |

This enables the Tracker to render **a unified ecosystem-wide gap panel**.

---

### 4. Domain and Registry

**4.1** Model gaps as queryable data (reuse the GT-280 "SDLC as data" pattern): a `GapBoardLoaderService` + types `GapRecord` / `ClosureRecord` in `core-domain`, consumed by CLI/MCP/API without duplicated parsing.

**4.2** Link with the satellite registry (GT-369 `SatelliteRecord`, GT-367 registry CRUD, GT-373 Tracker integration): each `SatelliteRecord` references its board/catalog and its `maturity-reconciliation.json`.

---

### 5. Migration and Reference

**5.1** Provide **`evolith gap init`** for scaffolding and a migration guide from legacy records **with grandfathering** (as Core did in GT-275 and the Tracker did for its 80 `DONE` legacy entries).

**5.2** Use the **reference implementation already built in Evolith Tracker** as the pilot satellite:

| File | Description |
|---|---|
| `docs/audit/tracker-gap-tracking.md` | Gap board (pilot) |
| `docs/audit/tracker-gap-reference-catalog.md` | Catalog (pilot) |
| `docs/audit/tracker-gap-closure-evidence-standard.md` | Closure-evidence standard (EN) |
| `docs/audit/tracker-gap-closure-evidence-standard.es.md` | Closure-evidence standard (ES) |
| `docs/audit/tracker-gap-closure-evidence.json` | Closure records |
| `docs/audit/tracker-maturity-reconciliation.json` | Maturity reconciliation |

---

## Acceptance Criteria

- [ ] ADR `core/00NN` approved: the four-piece standard is **mandatory** for Core and all satellites.
- [ ] Four JSON Schemas in `rulesets/schema/` + `gap-tracking` contract in `satellite-contracts` + OPA rules wired to `/evaluate`.
- [ ] `evolith gap …` (CLI), `evolith-gap-*` (MCP), and `/api/v1/gaps[…]` (API) operational **with parity** (BR-008) and ADR-0073 envelope.
- [ ] A non-conforming satellite **fails** Core evaluation (rule `gap-tracking` in state `failed`).
- [ ] **Zero divergent formats**: a single way to control gaps remains; ad-hoc records are deprecated.
- [ ] Bilingual where applicable (docs) and canonical English for machine-readable artifacts (ADR-0090).
- [ ] Tracker consumes `/api/v1/gaps/summary` and renders a unified ecosystem gap panel.

---

## Core Real Anchors

| Artifact | Path |
|---|---|
| Gap Tracking Board | `reference/core/control-center/gaps/gap-tracking.md` |
| Gap Reference Catalog | `reference/core/control-center/gaps/gap-reference-catalog.md` |
| Closure-Evidence Standard | `reference/core/control-center/evidence/gap-closure-evidence-standard.md` |
| Maturity Reconciliation | `reference/core/control-center/maturity-reports/maturity-reconciliation.json` |
| Satellite Contracts Ruleset | `rulesets/satellite-contracts/satellite-contracts.rules.json` |
| Validate Tracking Harness | `.harness/scripts/ci/08-validate-tracking.mjs` |
| Reconcile Maturity Harness | `.harness/scripts/reconcile-maturity.mjs` |
| Sync Tracking Order Harness | `.harness/scripts/sync-tracking-order.mjs` |
| MCP Read Gap Tracking | `packages/mcp-tools/src/tools/read-gap-tracking.js` |
| Core API | `apps/core-api` (ADR-0074 / ADR-0073) |

---

## Implementation Notes

- **REST only** — no GraphQL/SSE (Core is REST-only per ADR-0074).
- **Single source of truth** remains inviolable: Core gap board and each satellite's board are distinct; the aggregate is served by Core-API.
- Deliver: ADR + schemas + ruleset/OPA + CLI/MCP/API + migration guide + gap-tracking board updates registering this initiative as new `GT-*` entries.
- **Pilot satellite**: Evolith Tracker (reference implementation already complete and operational).

---

[Back to Upstream Proposals Index](../DECISIONS.md) · [Governance Hub](../README.md)
