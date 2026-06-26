# Phase 2 — Design Baseline Approved Playbook

> **Bilingual Navigation:** [Versión en Español](./phase-2-design-baseline.es.md)

**Phase:** [02 — Design and Architecture](../README.md#phase-02-design-and-architecture)
**Phase Exit Gate:** Design Baseline Approved (see [`phase-gates.rules.json`](../../../../rulesets/sdlc/phase-gates.rules.json) gate `phase: 2`)
**Primary Audience:** Software Architect, Principal/Staff Engineer, Product Owner, QA/SDET
**Accountable Role:** Software Architect
**Waiver Authority:** Architecture Board
**Status:** Approved

This playbook operationalises the Design Baseline Approved gate. Every Phase 2 exit must demonstrate that architecture decisions, bounded contexts, and functional behaviour are documented, traceable, and aligned with the Reference Blueprint.

---

## 0. Recommended Execution Order

| Step | Activity | Feeds |
|------|----------|-------|
| 1 | Set `evolith.yaml metadata.phase: F2`; assess ADR-0045 score | Pre-condition |
| 2 | Consult ADR-0056 (ubiquitous language); initialize ADR Registry | All artifacts |
| 3 | Confirm ADR-0002; run Simplicity Checklist | Evidence #4 |
| 4 | Produce Bounded Context Map (DDD Model Template); apply ADR-0031 + ADR-0032 | Evidence #5 |
| 5 | Refine Story Seeds (if KDD L2+) or write Functional Stories from scratch | Evidence #2 |
| 6 | Document boundary decisions as ADRs; complete CLI Impact Analysis; verify Blueprint Alignment | Evidence #1, #3 |
| 7 | Run `evolith validate --topology distributed-modules` — all 8 DM rules must pass | Gate readiness |
| 8 | Conditional: validate DOMA if F3 topology in scope (ADR-0076) | Blocking criterion |
| 9 | Gate review | Decision |

---

## 1. Pre-Conditions

- Phase 1 Business Sign-Off is recorded and unexpired.
- `evolith.yaml` in the satellite repository declares `metadata.phase: F2`.
- The Extraction Readiness Score (ADR-0045) is assessed at ≥70%. Scores below this threshold block F2 gate evaluation per satellite contract rule SVC-04.
- The Reference Blueprint and target topology baseline are confirmed.
- The ADR registry path is established for the initiative.

---

## 2. Evidence Collection Checklist

| # | Mandatory Evidence | Template / Schema | Acceptance Criterion |
|---|---|---|---|
| 1 | ADR Registry | [`adr-template.md`](../04-artifact-templates/adr-template.md) | Every boundary-crossing decision has a numbered, accepted ADR. No "undocumented" decisions remain. |
| 2 | Functional Stories | [`functional-story-template.md`](../04-artifact-templates/functional-story-template.md) · [`functional-story.schema.json`](../../../../rulesets/schema/functional-story.schema.json) | All stories in `Ready` state with BDD acceptance criteria; story writing standard satisfied. If Phase 1.1 Story Seeds exist (KDD Level 2+), refine them into Functional Stories at this step. Story Seeds do not replace Functional Stories. |
| 3 | Reference Blueprint Alignment | Architecture diagram set | Verification step — not a document you produce. Architecture diagrams are produced here and checked against the Reference Blueprint. |
| 4 | Simplicity Checklist Phase 1 | Simplicity checklist | Named 'Phase 1' because it guards against Phase 1 over-engineering entering the design baseline. Executed in Phase 2. Do not rename — machine-registered. |
| 5 | Bounded Context Map | Context map artefact | All contexts named with ownership, persistence strategy, and integration style |
| 6 | F2 Topology Rules Passed | `evolith validate --topology distributed-modules` | All 8 DM rules return PASS. Run `evolith validate --topology distributed-modules --format json` to capture evidence. |

If the F3 microservice topology is in scope, the **Domain-Aligned Service Topology (DOMA)** quality gate also applies — each service must map to exactly one bounded context (see [`quality-gates.md`](../quality-gates.md) and ADR-0076).

---

## 3. Gate Review Procedure

1. **ADR completeness audit (Software Architect).** Walk every architectural decision against the registry. If a decision exists in the design without a corresponding ADR, mark it pending and block the gate.
2. **Story readiness check (Product Owner + QA/SDET).** Confirm each Functional Story carries Given/When/Then acceptance criteria, traceability to a PRD requirement, and a definition of ready.
3. **Blueprint and topology check (Principal/Staff Engineer).** Cross-validate the bounded context map against the chosen topology and the multi-topology composition rules.
4. **Simplicity review.** Walk the Simplicity Checklist. Any "yes" answer to over-engineering signals blocks the gate.
5. **Decision record.** Produce a written `APPROVED` / `BLOCKED` / `WAIVED` decision, signed by the Software Architect.

---

## 4. Blocking Criteria

| Criterion | Action |
|---|---|
| Significant architecture decisions are undocumented | BLOCK — require ADR before baseline |
| Bounded context boundaries are contradictory | BLOCK — require context map resolution |
| Functional stories lack acceptance criteria | BLOCK — return to story writing |
| F3 microservice maps to more than one bounded context | BLOCK — DOMA violation; see ADR-0076 |
| Extraction Readiness Score below 70% | BLOCK — assess ADR-0045; score must reach ≥70% before F2 gate |
| F2 topology validation fails any DM rule | BLOCK — resolve DM rule violation; re-run `evolith validate --topology distributed-modules` |

---

## 5. Waiver Workflow

Waiver authority is the Architecture Board. Required fields (per [`quality-gates.md`](../quality-gates.md)):

- `criterion` · `justification` · `risk` · `owner` · `expirationDate` · `mitigationPlan`

Waivers cannot bypass undocumented decisions on regulated subsystems (authentication, data residency, payment processing).

---

## 6. Outputs

- Locked ADR Registry snapshot.
- Functional Stories ready for technical decomposition.
- Bounded Context Map and aligned topology declaration.
- Authorisation to enter [Phase 3 — Construction](../README.md#phase-03-construction).

---

## 7. Topology Reference

| Resource | Purpose |
|---|---|
| `evolith validate --topology distributed-modules` | Validate F2 topology rules (DM-R01…DM-R08) |
| `evolith validate --topology distributed-modules --topology event-driven` | Validate composed topology |
| `evolith drift --level F2` | Detect drift from declared F2 architecture |
| [distributed-modules.rules.json](../../../../reference/architecture/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json) | 8 mandatory F2 rules |
| [ADR-0045](../../../../reference/architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md) | Extraction Readiness Score criteria |
| [ADR-0047](../../../../reference/architecture/adrs/core/0047-architectural-patterns-monolith-soa-microservices.md) | F1→F2→F3 progression framework |
| [topology-dimensions.md](../../../../reference/architecture/topologies/topology-dimensions.md) | Composable topology dimensions |

---

[Back to SDLC Governance Center](../README.md)
