---
title: Product Documentation Audit — Evolith Ecosystem
status: CERTIFIED WITH OBSERVATIONS
date: {{DATE}}
scope: reference/products/** + foundation package READMEs (packages/core, core-domain, infra-providers, sdk-client, mcp-tools, mcp-server)
---

# Product Documentation Audit — Evolith Ecosystem

> **Verdict:** **CERTIFIED WITH OBSERVATIONS**
> **Date:** {{DATE}}
> **Auditor scope:** Official product hub (`reference/products/README.md`) and per-product documentation surfaces, cross-checked against shipped code.

This audit certifies that the product documentation corpus is fit for governance use, **subject to the observations and the prioritized correction plan below**. Certification is conditional: the P0 corrections (already applied) were required to reach this verdict; the P1/P2 items remain open.

> **How to read the coverage matrix:** a `` marks **presence** — the topic is documented somewhere in that product's surface. It is **not** a depth or quality guarantee. An absent (`__`) cell means the dimension was not found at all.

---

## 1. Official Product Inventory

Source of truth: `reference/products/README.md`.

| Product | Hub label | Reality | Note |
|---|---|---|---|
| **Evolith Tracker** | active | active | — |
| **Smart CLI** | active | active | Best documentation coverage |
| **Core API** | active | active | — |
| **Evolith MCP Services** | **"planned"** | **ACTUALLY SHIPPED** | `packages/mcp-server` ships a 717-line README, `mcp-tools`, and is **deployed**. **STALE label.** |
| **UMS Reference** | reference model | reference model | — |

**Foundation = Evolith Core.** The foundation comprises `packages/core`, `core-domain`, `infra-providers`, `sdk-client`, and `mcp-tools`, documented via package READMEs (not as a hub product entry).

**Minor gap:** `apps/agent-sandbox` is a demo of the Agentic-AI topology (GT-131) and is **undocumented in the product hub**.

---

## 2. Per-Product 17-Dimension Coverage Matrix

Legend: `` = topic documented (presence, not depth) · `__` = absent.

Dimensions (in order): **Desc · Scope · UseCases · Arch · Components · Install · Config · Operation · Integrations · Interfaces · Security · Observability · HA · Performance · Resilience · Roadmap · Maturity**

| Product | Desc | Scope | UseCases | Arch | Comp | Install | Config | Oper | Integr | Iface | Sec | Obs | HA | Perf | Resil | Roadmap | Matur |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **Core API** | | | | | | | | __ | | | | | __ | __ | | __ | |
| **Smart CLI** | | | | | | | | | | | | | __ | | __ | | |
| **MCP Services** | | | | | | | | | | | | | __ | | __ | __ | __ |
| **Tracker** | | | | | | __ | | | | | | | __ | | __ | | __ |
| **UMS Reference** | | | | | __ | __ | | | __ | | | | __ | | __ | __ | |

**Per-product gaps:**
- **Core API** — missing: Operation, HA, Performance, Roadmap.
- **Smart CLI** — missing: HA, Resilience. *(best overall coverage)*
- **MCP Services** — missing: HA, explicit Resilience, Roadmap, Maturity.
- **Tracker** — missing: Install, HA, Resilience, Maturity.
- **UMS Reference** — missing: Components, Install, Integrations, HA, Resilience, Roadmap.

**Systemic findings:**
- **HA = 0/5** — *no product documents High Availability.*
- **Resilience, Performance, and Roadmap** coverage is weak across the corpus.
- **Per-product Release criteria and Maturity** appear **only in Smart CLI**.

---

## 3. Diagrams

- **110 `.md` files** contain embedded Mermaid diagrams — good diagram density across the corpus.
- **However**, the product hub index (`reference/products/README.md`) contains **0 diagrams** — there is **no ecosystem-relationship diagram** at the hub level.
- **No standalone diagram assets** (`.mmd` / `.drawio`) exist; all diagrams are Mermaid embedded in Markdown.

---

## 4. Glossary

- The official `glossary.md` is **corpus-level**: it covers Evolith, BMAD, ADR, Blueprint, Standard, Guide, UMS, and similar terms.
- It does **NOT** cover the **operational/product canon**: SDLC, Phase, Gate, Artifact, Topology, Ruleset, OPA, Schema, Manifest, Tenant, Tracker, SmartCLI, MCP, Core-API, AI Agents, and **Release** are all missing.
- **No single canonical ecosystem glossary existed.** One is now being created as `glossary-ecosystem.md`.

---

## 5. Consistency

- **Topology de-conflation — DONE.** Phase has been removed from the topology contract; F1–F5 have been reclassified as **maturity levels**.
- **Stale CLI docs — FOUND.** `smart-cli/README.md` documented `--phase f1..f5`, but the CLI itself (`validate.command.ts`) **already uses** `discovery / design / construction / qa / release` and marks `f1..f5` as **deprecated**. The fix is **docs-only** and **has now been applied**.
 - *Evidence:* `reference/products/smart-cli/README.md` lines 78, 89, 99, 106 contained the stale `--phase f1` references.
- **MCP tool-count doc drift** — documentation states **25/7/7**, code ships **27/8/9**. Noted for reconciliation.

---

## 6. Flow Coverage (documentation counts)

| Flow | Docs | Status |
|---|--:|---|
| AI agents | 85 | OK |
| SDLC / gates | 82 | OK |
| Rulesets / OPA | 65 | OK |
| Tenant | 34 | OK |
| Operation / release | 27 | OK |
| ADRs | 24 | OK |
| Idea product | 23 | OK |
| External clients | 13 | Moderate |
| Blueprints | 7 | Moderate |
| Independent architectural consult | 5 | Weak |
| **Topology selection** | **1** | **Very weak** |

---

## 7. Risks

| ID | Risk | Severity |
|---|---|---|
| **R1** | Incomplete canonical glossary | **High** |
| **R2** | F1–F5 reintroduces phase/topology confusion | **High** |
| **R3** | MCP "planned" misperception (shipped product appears unavailable) | **Medium** |
| **R4** | High Availability undocumented across all products | **High (operational)** |
| **R5** | Release criteria documented only in Smart CLI | **Medium** |
| **R6** | Topology-selection flow near-absent | **Medium** |

---

## 8. Prioritized Correction Plan

### P0 — Required for certification (DONE)
- Fix `f1-f5` phase references in Smart CLI docs (`smart-cli/README.md`).
- Re-label MCP Services from **planned active** in the product hub.
- Create the canonical ecosystem glossary (`glossary-ecosystem.md`).

### P1 — Required to close systemic gaps
- Document **HA / Resilience / Performance** for each product.
- Add **Roadmap / Maturity / Release-criteria** for the 4 products lacking them (Core API, MCP Services, Tracker, UMS Reference).
- Add an **ecosystem-relationship diagram** to the product hub (`reference/products/README.md`).

### P2 — Quality and completeness
- Author the **topology-selection flow** (currently 1 doc).
- Reconcile **MCP tool-count** documentation (25/7/7 27/8/9).
- Acknowledge **`apps/agent-sandbox`** (Agentic-AI topology demo, GT-131) in the product hub.

---

## 9. Completeness Checklist

- [x] Official product inventory enumerated and reality-checked against shipped code
- [x] 17-dimension coverage matrix built per product
- [x] Systemic dimension gaps identified (HA = 0/5)
- [x] Diagram density and hub-level diagram gap assessed
- [x] Glossary scope evaluated; canonical ecosystem glossary initiated
- [x] Consistency (topology de-conflation, stale CLI docs, MCP drift) verified
- [x] Flow coverage counted and graded
- [x] Risks registered with severity
- [x] Prioritized correction plan (P0/P1/P2) issued
- [x] P0 corrections applied

---

## 10. Final Verdict

> **CERTIFIED WITH OBSERVATIONS**

The Evolith product documentation corpus is **certified for governance use**, conditioned on the applied P0 corrections and the open P1/P2 plan. The corpus demonstrates strong per-product depth (Smart CLI especially) and high diagram density, but carries **systemic gaps** — notably **High Availability undocumented across all five products**, **Release/Maturity criteria isolated to Smart CLI**, a **near-absent topology-selection flow**, and a **stale "planned" label on a shipped MCP product** (now corrected). The matrix reflects **presence, not depth**: a `` confirms a topic is documented, not that it is documented well.
