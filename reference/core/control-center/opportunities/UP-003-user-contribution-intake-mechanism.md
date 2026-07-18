# UP-003 — User Contribution Intake: A Traceable Path from Product Interface to Release

> Bilingual navigation: [Español](./UP-003-user-contribution-intake-mechanism.es.md)

| Field | Value |
|---|---|
| **ID** | UP-003 |
| **Status** | PROPOSED |
| **Date** | 2026-07-18 |
| **Initiated by** | Evolith Architecture Board (contribution-mechanism analysis) |
| **Addressed to** | Evolith Core Architecture Board |
| **Priority** | P1 |
| **Estimated Complexity** | L |
| **Related ADR** | ADR-0114 (proposed — Contribution and Proposal Intake) · ADR-0101 (Core as Stateless Evaluation Engine — constrains where a proposal may be persisted) |
| **Related GTs** | [GT-552](../gaps/gap-reference-catalog.md#gt-552) · [GT-553](../gaps/gap-reference-catalog.md#gt-553) · [GT-554](../gaps/gap-reference-catalog.md#gt-554) · [GT-555](../gaps/gap-reference-catalog.md#gt-555) |

## Context

A user who operates Evolith through any of its shipped interfaces has **no way to propose an improvement, request a feature, or report a problem**. This is not a documentation gap; the capability does not exist in code.

Verified against the source:

- **CLI** — 31 commands (`adr`, `evaluate`, `gate`, `validate`, `waiver`, ...). None is `feedback`, `propose`, `suggest`, `issue` or `report`.
- **MCP server** — 47 `evolith-*` tools. No intake tool; every write-capable tool writes a governance artifact (ADR, MoSCoW, scaffold, config, satellite).
- **Core API** — roughly 25 endpoints. None accepts a proposal. `POST /projects/propose-advance` is an SDLC phase-readiness computation, not a user submission.
- **agent-runtime** — 7 skills, all evaluation. `publish-trace-event` is declared a no-op placeholder in `.harness/manifest.yaml`, and its `TraceEventType` vocabulary is closed to nine runtime-lifecycle events with no user-content type.
- A repository-wide search of TypeScript sources returns **zero occurrences** of `feedback`.

The only user-originated request primitive that exists anywhere is the **waiver** flow (suppression of a specific evaluation finding), and the only working end-user channel of any kind is GitHub Private Vulnerability Reporting via `SECURITY.md` — security only.

The consequence is that the outward half of traceability is absent. What is machine-enforced today is one-dimensional and internal:

```
board row (GT-NNN) <-> catalog section (#gt-nnn) <-> closure record <-> {commit SHA, evidence paths, validation commands}
```

Nothing records **who asked**, which **issue** discussed it, which **pull request** reviewed it, or which **release** shipped it. Across 551 gaps there are zero references to a GitHub issue or pull request, and the phrase "reported by" appears twice in the entire catalog.

## Guiding Principle (non-negotiable)

> A proposal is **governed input**, not an entity the Core owns. Per [ADR-0101](../../architecture/adrs/core/0101-core-stateless-evaluation-engine.md) the Core stays a stateless evaluator: it may **classify and enrich** a proposal, but the durable record and the decision live outside it. Evolith **recommends**; a human **decides**. No proposal becomes backlog without an explicit human acceptance.

## Objective

Give any user of any Evolith interface a single, traceable way to propose a change and follow it to the release that ships it, without weakening the existing governance guarantees.

## Scope — Deliverables

### 1. Decision and boundary (ADR)

Author `ADR-0114 — Contribution and Proposal Intake`: where a proposal is persisted, what the Core may and may not do with it, and which transitions require a human.

### 2. The `Proposal` aggregate (core-domain)

Do not invent a new primitive. Fuse the two that already work:

| Existing piece | What it contributes |
|---|---|
| `Waiver` (`src/packages/core-domain/src/domain/waiver.ts`) | The lifecycle: `requestedBy`, `requestedAt`, `approvedBy`, `approvedAt`, `status`, `version`, `supersedes`, plus a durable store and a CLI `request/approve/revise/list` surface already in production |
| `UP-NNN` front-matter | The governance metadata: `Initiated by`, `Addressed to`, `Priority`, `Estimated Complexity`, `Related GTs`, and the proven chain UP to ADR to GT to closure evidence |

`Proposal` = the waiver state machine carrying the UP metadata, plus the origin fields the system has never captured: **surface** (cli / mcp / rest), **product version**, and **fingerprint** for deduplication.

### 3. Intake on the three surfaces (BR-008 parity)

`evolith propose` on the CLI, an equivalent MCP tool, and a REST endpoint. Parity is not optional; it is the standing surface contract.

### 4. Advisory classification by Winston

A `classify-proposal` skill that enriches a proposal with a proposed category (defect, feature, debt, governance), a duplicate check against existing fingerprints, a suggested track (`GT-` / `OPP-` / `UP-`) and a related-ADR hint. **Advisory only**, consistent with the non-binding `DecisionRecommendation` of ADR-0101.

### 5. Identifier allocation

**This is the structural blocker and must land before intake.** `GT-` identifiers are allocated by a manual optimistic-locking ledger (`../COORDINATION.md`): *"whoever pushes the ledger bump first owns the number"*. There is no script and no lint. The ledger is currently **stale by ten identifiers** — it advertises `GT-542` as next-free while the board already reaches `GT-551`, which is itself the evidence that a human ledger cannot absorb automated intake.

Proposed resolution: proposals receive their own `PR-NNN` sequence, allocated programmatically and independent of `GT-`. Promotion to a `GT-` gap happens **only** on human acceptance, which keeps the curated backlog curated.

### 6. Closing the outward chain

Extend the closure-evidence schema (`../evidence/gap-closure-evidence-standard.md`) with `proposalRef`, `pullRequest` and `releasedIn`, so a user can be answered the question the system cannot answer today: *which release contains the fix for the thing I proposed?*

### 7. GitHub bridge

A workflow that opens an issue from an accepted proposal, carrying the `PR-NNN` identifier and its labels. Note that today **no workflow reacts to issue, discussion, comment or repository_dispatch events**, and the single workflow that creates an issue automatically is gated on a condition that can never become true (see [GT-552](../gaps/gap-reference-catalog.md#gt-552)).

## Automation boundary

| Automate (deterministic, auditable) | Keep human (irreversible or judgement) |
|---|---|
| Record creation, fingerprint, deduplication | Accept or reject a proposal |
| Winston classification and enrichment | Assign priority and track |
| Issue creation and cross-references | Approve an ADR when architecture changes |
| Version mapping and user notification | Review and merge the pull request |

## What must be preserved for audit

Every proposal record must be immutable and versioned (`supersedes`, as the waiver already is), retaining: the **originator**, the **surface and product version** it was raised from, Winston's classification **with its reasoning**, the human decision **with its author and timestamp**, and the resolved chain `ADR -> issue -> pull request -> commit -> release`.

## Risks

- **Backlog dilution.** Mitigated by the `PR-NNN` sequence: proposals never enter the gap board without human acceptance.
- **Identity and privacy.** `requestedBy` is a free-text actor today; a real intake needs an explicit decision on what identity is captured and retained.
- **Dependency on a broken release pipeline.** Deliverable 6 cannot be honoured while `release-please` cannot cut a version ([GT-552](../gaps/gap-reference-catalog.md#gt-552)).

## Related Decisions

- [ADR-0101 — Core as Stateless Evaluation Engine](../../architecture/adrs/core/0101-core-stateless-evaluation-engine.md)
- [UP-001 — Canonical Gap-Tracking Standard for All Satellites](./UP-001-canonical-gap-tracking-standard.md)
- [UP-002 — Product/Initiative Governance Model](./UP-002-product-initiative-governance-model.md)
