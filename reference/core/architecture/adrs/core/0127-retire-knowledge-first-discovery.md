# ADR-0127: Knowledge-First Discovery Is Retired, and With It the KDD Concept

> **Bilingual Navigation:** English (this document) · [Versión en Español](./0127-retire-knowledge-first-discovery.es.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-08-18 |
| **Deciders** | Product Owner (owner decision) · Architecture Board |
| **Technical story** | A subphase gate, seven artifact templates and a per-tenant PRD module, all described in prose across two repositories and implemented in none of them |

<!-- implementation-status: reference/core/sdlc/01-playbooks/phase-1-business-signoff.md,reference/core/sdlc/sdlc-evolith-artifact-mapping.md,reference/core/foundations/agent-skills/tracker-discovery-flow.md -->
> **Implementation status in this repository: full** (2026-08-18).
> There was no code to remove: the sweep is documentary by construction, which is the finding
> this ADR is built on. Verified by search after the change — `KDD` and `knowledge-first` survive
> only in `CHANGELOG.md` and in `ADR-0103`, both deliberately, as records of what was true when
> they were written.

## Status

Accepted — 2026-08-18. In force.

## Context

Two different things travelled under the same three letters, and neither was ever built.

**Phase 1.1 — Knowledge-First Discovery.** An optional, progressive subphase inside Phase 1,
scaling from Level 1 to Level 4, with its own readiness gate and seven artifact templates:
Discovery Knowledge Brief, Assumptions & Questions Log, Discovery Context Pack, Capability Map,
Epic Candidate Matrix, Story Seed Bank, Discovery Readiness Gate.

**KDD — Knowledge-Driven Development.** A later and narrower reading, captured in the
owner-guided session of 2026-07-04 (`tracker-intake-flow` L-009, `tracker-discovery-flow` D-004):
not a subphase but an *optional section inside the PRD*, activated per tenant by feature-override,
with the PRD itself as the non-overrideable canonical floor.

**Neither existed anywhere executable, and this was measured rather than assumed:**

| surface | KDD present? |
|---|---|
| Core rulesets (`phase-gates.rules.json`, `artifact-registry.json`) | **no** — five gates, phases 1..5; none of the seven KDD artifacts is registered among the 33 |
| Core code (TypeScript) | **no** — zero files match `KDD`, `knowledge-first`, `knowledgeBrief`, `discoveryReadiness`, `storySeed`, `epicCandidate` |
| CLI | **no** — 31 commands, zero mentions. `--phase discovery` maps to **phase 1 entire** (`phase-id.ts`: `f1: 'discovery'`), not to 1.1 |
| MCP server | **no** — zero files |
| Tracker code and UI | **no** — no screen, no entity; the "Discovery" menu carries Strategic intake, Opportunities and Initiatives |
| `prd.schema.json` | **no KDD section** — the D-004 decision was never schema'd |

What did exist was prose, and it had teeth: the Phase 1 playbook made *"Phase 1.1 adoption level
has been declared"* a **precondition for opening Gate 1**, and three rows of its evidence table
carried conditional clauses keyed to KDD levels. A gate nothing implements was blocking a gate
everything implements, on paper.

## Decision

**Both readings are retired. Evolith Core and Evolith Tracker no longer carry the KDD concept in
any form**, and the information related to it is removed rather than archived in place.

1. The Phase 1.1 playbook and the seven artifact templates are **deleted** (16 files, EN and ES).
2. The Phase 1 precondition and every KDD-conditional clause in its evidence table are **removed**;
   Gate 1 now states its own requirements without reference to a subphase.
3. The `Subphase 01.1` table in the artifact mapping, the playbook index row, and the
   Story-Seed/Epic-Candidate references in the Phase 2 playbook and template index are **removed**.
4. The D-004 / L-009 decision rows are **rewritten** to what survives them: the PRD is the
   canonical floor and Gate 1 always requires it. The optional-KDD-section clause is gone.
5. `CHANGELOG.md` and `ADR-0103` are **left untouched**, on purpose. They are records of what was
   true when written; editing them to hide a retired concept would falsify the history this
   repository keeps deliberately.

**`ADR-0103` is amended by this ADR, not reopened.** That decision placed the Architecture Planning
Gate *before* Knowledge-First Discovery and rejected embedding planning logic *into* Phase 1.1. Its
reasoning stands; only its neighbour is gone. Read today: the Planning Gate precedes **Phase 1
(Business Sign-Off)** directly, and the option it rejected is moot rather than wrong.

## Consequences

**Good.** The five-phase model is now the same in prose and in data — five phases, five gates, and
no sixth thing described nowhere else. Gate 1 stops depending on a subphase nobody can execute, so
a satellite reading the playbook can actually satisfy its preconditions. Roughly forty documents
stop describing a capability the product does not have.

**Costs, stated plainly.** The seven templates were real work and some of them — the Assumptions &
Questions Log, the Capability Map — are useful independently of KDD. They are recoverable from
history; nothing here claims they were worthless, only that Evolith will not govern them.

**The risk this ADR accepts.** Discovery-phase knowledge capture is now unmodelled. If it returns,
it must return as a schema and a rule before it returns as a playbook — the failure this row
records is precisely a governance concept that lived for months entirely in prose, was cited as a
precondition by a real gate, and was never once executed.

## Related ADRs

- [ADR-0103](./0103-architecture-planning-gate-intake.md) — amended by this ADR: the Planning Gate
  now precedes Phase 1 directly.
- [ADR-0101](./0101-core-stateless-evaluation-engine.md) — the Core is a stateless evaluation
  engine; artifacts it cannot evaluate are not Core concerns.

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
