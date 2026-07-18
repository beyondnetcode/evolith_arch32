# Evolith Core — Opportunities Board

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

**Status:** Active Tracking
**Owner:** Evolith Architecture Board
**Last Updated:** 2026-07-12

This board is the single source of truth for **improvement opportunities** and **upstream proposals** — enhancements, enablers, and cross-repository governance changes that are not tracked as gaps. Gaps capture debt and defects that must be closed; opportunities capture value-adding improvements and formal proposals raised to the Core Architecture Board. For debt and defects, see the [Gap Tracking Board](../gaps/gap-tracking.md).

> One table per track. `UP-*` IDs link to their full proposal; `OPP-*` IDs link to their entry in the backlog summary. GitHub renders Markdown statically (no interactive sorting or search): use GitHub file search (`/`) to find an ID or term.

---

## Upstream Proposals

Formal proposals raised to the Evolith Core Architecture Board — typically originated by a satellite (e.g. Evolith Tracker) or a Core redesign — that request a cross-repository or governance-level change. Mechanism: `reference/core/control-center/opportunities/UP-NNN`.

| ID | Proposal | Scope | Priority | Complexity | Status |
|---|---|:---:|:---:|:---:|:---:|
| [`UP-001`](./UP-001-canonical-gap-tracking-standard.md) | **Canonical Gap-Tracking Standard for All Satellites.** One model, schema, vocabulary, and closure flow for the gaps of any Evolith repository (Core or satellite), operable through all three Core surfaces (CLI, MCP, Core-API). | `Governance` | P0 | XL | `PROPOSED` |
| [`UP-002`](./UP-002-product-initiative-governance-model.md) | **Product/Initiative Governance Model.** Separate SDLC governance from operational execution; product/tenant/initiative become `EvaluationContext` only (ADR-0100 · ADR-0101), the Core stays a stateless evaluator. | `Governance` | P0 | XL | `PROPOSED` |
| [`UP-003`](./UP-003-user-contribution-intake-mechanism.md) | **User Contribution Intake.** A traceable path from any Evolith interface (CLI/MCP/REST) to the release that ships the change. No interface exposes feedback/proposal capability today; the traceability chain stops at the commit SHA, recording neither the originator, the issue, the pull request nor the release. Fuses the existing `Waiver` lifecycle with the `UP-NNN` governance metadata into a `Proposal` aggregate; Winston classifies advisory-only, humans decide. | `Governance` | P1 | L | `PROPOSED` |

---

## Improvement Backlog

Value-adding improvements (`OPP-*`) tracked alongside the post-GT93 backlog. All items below are complete; the summaries retain the full purpose, deliverables, and effort accounting.

- [Backlog — Complete Summary](./backlog-complete-summary.md) — 35/35 items (11 GAPs + 10 OPP + …), effort accounting, next steps.
- [Backlog — Post-GT93](./backlog-post-gt93.md) — original prioritized backlog (P0→P3, sized) with GitHub Project links.

| ID | Opportunity | Component | Tier | Status |
|---|---|:---:|:---:|:---:|
| [`OPP-001`](./backlog-complete-summary.md) | Implement auto-fix domain strategies (expanded to 8). | `CLI` | Should | `DONE` |
| [`OPP-002`](./backlog-complete-summary.md) | Add MCP distributed tracing (via `McpMetricsService` + OpenTelemetry). | `CLI` | Should | `DONE` |
| [`OPP-003`](./backlog-complete-summary.md) | Eliminate test console noise (`silent: true`). | `CLI` | Should | `DONE` |
| [`OPP-004`](./backlog-complete-summary.md) | Optimize pre-commit validation (incremental, affected-files only). | `Platform` | Should | `DONE` |
| [`OPP-005`](./backlog-complete-summary.md) | Add MCP metrics dashboard (`evolith-metrics` tool). | `CLI` | Should | `DONE` |
| [`OPP-006`](./backlog-complete-summary.md) | Expand auto-fix strategies (6+ target; delivered 8). | `CLI` | Could | `DONE` |
| [`OPP-007`](./backlog-complete-summary.md) | Add wizard validation steps (`validate?` on `WizardStep`). | `CLI` | Could | `DONE` |
| [`OPP-008`](./backlog-complete-summary.md) | Parallelize test execution (`maxWorkers: 100%`). | `CLI` | Could | `DONE` |
| [`OPP-009`](./backlog-complete-summary.md) | Generate HTML coverage reports. | `CLI` | Should | `DONE` |
| [`OPP-010`](./backlog-complete-summary.md) | Add confirmation timeout config (`timeoutMs`, safe-deny default). | `CLI` | Should | `DONE` |

---

## Related

- [Gap Tracking Board](../gaps/gap-tracking.md) — debt and defects (single source of truth for gaps).
- [Maturity & Gaps hub](../README.md) — Control Center index.
- [Global Master Index](../taxonomy/MASTER_INDEX.md) — all artifacts.

[Back to Control Center](../README.md)
