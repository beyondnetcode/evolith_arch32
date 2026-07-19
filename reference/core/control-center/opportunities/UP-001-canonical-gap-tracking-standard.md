# UP-001 — Canonical Gap-Tracking Standard for All Satellites

> Bilingual navigation: [Español](./UP-001-canonical-gap-tracking-standard.es.md)

| Field | Value |
|---|---|
| **ID** | UP-001 |
| **Status** | PROPOSED |
| **Date** | 2026-06-28 |
| **Last Amended** | 2026-07-18 — Amendment 1 (board column schema, see §6) |
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
| **Board** | `*-gap-tracking.md` | Single table `ID \| Gap \| What it means \| Example \| Component \| Phase \| Criticality \| Complexity \| Status` (column rules in §6); `Criticality ∈ {P0,P1,P2,P3}`, `Complexity ∈ {XS,S,M,L,XL}`, `Status ∈ {PENDING,IN-PROGRESS,BLOCKED,DEFERRED,DONE}` in backticks; IDs link to catalog; pending-first order (P0→P3, then XS→XL); footer with **Progress** + **Waves** log. |
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

### 6. Amendment 1 — Board Column Schema (2026-07-18)

**Approved by the owner.** This amendment is normative and supersedes the seven-column board schema declared in §1.1. It applies to Core and to every satellite that mirrors this standard.

#### 6.1 Why

The board and the catalog have distinct jobs, and the standard already says so: the board is the set of **headlines**, the catalog is the **detail**. The `Gap` column stopped honouring that separation and became a changelog — rows accumulate session-by-session history, dates, commit hashes, superseded findings and nested markdown inside a single table cell. A row of several hundred words is unreadable as a table and duplicates the catalog entry that already holds the same material. The fix restores the separation and adds the two columns a non-specialist reader needs in order to understand a row without opening the catalog.

#### 6.2 New schema

| Language | Header row |
|---|---|
| **EN** | `\| ID \| Gap \| What it means \| Example \| Component \| Phase \| Criticality \| Complexity \| Status \|` |
| **ES** | `\| ID \| Gap \| Qué significa \| Ejemplo \| Componente \| Fase \| Criticidad \| Complejidad \| Estado \|` |

The two new columns are inserted **after `Gap`**. All other columns keep their meaning, vocabulary and ordering rules from §1.1. The `gap-board.schema.json` of §1.2, when authored, must encode this nine-column shape, not the superseded seven.

#### 6.3 Column rules (the substance of this amendment)

| Column | Rule |
|---|---|
| **`Gap`** | ONE sentence, present tense, roughly 100 characters, stating what is broken. No history, no commit hashes, no dates, no `RESOLVED:` prefixes, no nested markdown. Progress and closure narrative go in the **catalog entry**, never in the row. |
| **`What it means`** | Plain language for a reader who is not an engineer and has no context. No jargon, no identifiers, no file paths. It explains the **CONSEQUENCE**, not the mechanism. |
| **`Example`** | One concrete instance that makes it click — a measured number or an observed behaviour. Not a restatement of the `Gap` cell in other words. |

#### 6.4 Reference examples

These are the owner-approved worked examples. Implementers calibrate against them.

| ID | Gap | What it means | Example |
|---|---|---|---|
| `GT-556` | Checks resolved paths from the directory they were invoked in | An automated check gave a different answer depending on where you ran it from, and always said everything was fine | From the repo root it saw 8 items; from `src/` it saw 5. It approved in both cases |
| `GT-560` | The protection switch is not connected to anything | There is a mechanism to stop an external outage taking the service down, but it guards no real call | The architecture assessment scored resilience 7/10 citing that mechanism, which nothing uses |
| `GT-563` | Documentation validation never ran in CI | The check existed and reported green without having inspected anything, because it only ran if someone launched it by hand | 174 real errors coexisted with a green CI for weeks |

#### 6.5 Constraint imposed on implementers

The tracking guard (`.harness/scripts/ci/08-validate-tracking.mjs`) locates the status column **by header name, not by position**: it opens a table on a line starting `| ID |` and finds the status index by matching the header text against `Status` / `State` / `Estado` / `Estat`. Adding columns is therefore safe — but only while all three of these hold, and the standard requires them of every conforming board:

- The header row still **begins with `| ID |`**.
- The header row still **contains `Status` (EN) or `Estado` (ES)** as a column name.
- The gap id stays in the **first column**.

A board that renames the status header, reorders the id out of position one, or breaks the `| ID |` prefix will silently stop being parsed. Any future column change must preserve these three invariants.

#### 6.6 Migration may proceed in waves

Commit `ce658404` fixed the guard to parse rows **positionally**. It previously split rows with `filter(Boolean)`, which dropped empty cells rather than only the empties produced by the leading and trailing pipes — so a single blank cell shifted every column after it and the status was read from the wrong column, or read as `undefined`.

Because of that fix, **a partially migrated board parses correctly instead of misreading**: rows already carrying the nine columns and rows still carrying seven can coexist while a migration is in flight, and rows with an unfilled `What it means` or `Example` cell keep their remaining columns aligned. This is the property that makes the migration tractable, and it is the reason boards **may** be migrated in waves rather than in a single atomic rewrite. Record it as a precondition: a satellite whose guard predates `ce658404` must take that fix before starting a waved migration.

#### 6.7 Migration scope

| Board | Rows to migrate |
|---|---|
| Evolith Core — `gap-tracking.md` + `gap-tracking.es.md` | 565 rows per language |
| Evolith Tracker — `tracker-gap-tracking.md` (+ ES) | 215 rows |

History displaced from a `Gap` cell is not discarded: it moves to the corresponding catalog entry, which is where the standard already puts detail.

---

## Acceptance Criteria

- [ ] ADR `core/00NN` approved: the four-piece standard is **mandatory** for Core and all satellites.
- [ ] Four JSON Schemas in `rulesets/schema/` + `gap-tracking` contract in `satellite-contracts` + OPA rules wired to `/evaluate`.
- [ ] `evolith gap …` (CLI), `evolith-gap-*` (MCP), and `/api/v1/gaps[…]` (API) operational **with parity** (BR-008) and ADR-0073 envelope.
- [ ] A non-conforming satellite **fails** Core evaluation (rule `gap-tracking` in state `failed`).
- [ ] **Zero divergent formats**: a single way to control gaps remains; ad-hoc records are deprecated.
- [ ] Bilingual where applicable (docs) and canonical English for machine-readable artifacts (ADR-0090).
- [ ] Tracker consumes `/api/v1/gaps/summary` and renders a unified ecosystem gap panel.
- [ ] **Amendment 1**: every conforming board carries the nine-column schema of §6.2, and `Gap` / `What it means` / `Example` satisfy the rules of §6.3 — no row keeps history, dates or commit hashes in the `Gap` cell.
- [ ] **Amendment 1**: Core (565 rows per language) and Tracker (215 rows) are migrated, with displaced history relocated to the catalog and the three guard invariants of §6.5 intact.

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

[Back to Upstream Proposals Index](../../sdlc/governance/DECISIONS.md) · [Governance Hub](../../sdlc/governance/README.md)
