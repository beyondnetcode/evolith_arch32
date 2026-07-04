# Phase 3 — Construction Baseline

> **Bilingual Navigation:** [Versión en Español](./phase-3-construction-baseline.es.md)

**Phase:** 03 — Construction
**Gate:** Successful Build — PR Merge Authorized
**Accountable Role:** Tech Lead
**Waiver Authority:** Architecture Board (CVE waivers: Executive Risk Acceptance)

---

## Purpose

This playbook governs the Phase 3 construction inner loop — from Technical Story creation through PR merge. Phase 3 is iterative: every PR that implements a Technical Story must satisfy the Definition of Done before merge. The phase ends when all Technical Stories traceable to the approved Functional Stories are Done and the Successful Build gate is satisfied.

---

## 0. Pre-Conditions

Before the first Technical Story is created:

- Phase 2 gate (Design Baseline) is APPROVED and on file.
- `evolith.yaml` declares `metadata.phase` (F1, F2, or F3). Topology rules are enforced automatically based on this declaration.
- ADR Registry from Phase 2 is locked and accessible.
- Functional Stories from Phase 2 are in Ready state.

---

## 1. Recommended Execution Order

| Step | Activity | Output |
|------|----------|--------|
| 0 | Verify Phase 2 gate APPROVED; confirm `evolith.yaml metadata.phase` | Pre-conditions met |
| 1 | Decompose each Functional Story into Technical Stories; populate `functionalStoryRef` field | Technical Stories (To Do) |
| 2 | Implement → unit tests → integration tests → lint → security scan | Implementation evidence |
| 3 | Per PR: run DoD checklist; verify CI green; verify coverage ≥ 80% | DoD Checklist, CI Pipeline |
| 4 | Per PR: Documentation Delta — update ADRs if architectural decision changed; update inline docs and README | Documentation Delta |
| 5 | Per PR: `evolith validate --topology <declared>` | Topology Rules pass |
| 6 | (Conditional F3) Verify DOMA per ADR-0076: each service maps to exactly one bounded context | DOMA evidence |
| 7 | Gate review: all Technical Stories Done; `evolith gate evaluate --phase construction` | APPROVED / BLOCKED |

---

## 2. Construction Inner Loop (Per PR)

For every pull request during Phase 3:

1. **Story selection.** Pick a Technical Story from the backlog in priority order. Confirm it has a `functionalStoryRef` linking to a Phase 2 Functional Story.
2. **Implementation.** Write code following ADR-0002 (Hexagonal Architecture) boundaries, ADR-0056 (Naming Conventions), and the Construction-Focused SDLC Framework.
3. **Testing.** Write unit tests (target ≥ 80% business logic coverage per ADR-0018), integration tests where modules interact, and update the test summary.
4. **Quality gates.** Run the full CI pipeline: lint, type-check, unit tests, integration tests, SAST/SCA scan (ADR-0005). All must be green.
5. **Documentation delta.** If the PR introduces or changes an architectural decision, create or update an ADR. Update inline docs and README if public interfaces changed.
6. **Topology validation.** Run `evolith validate --topology <declared>` to verify topology rules still pass.
7. **PR review.** At least one peer review. Reviewer confirms DoD compliance, ADR traceability, and no boundary violations.
8. **Merge.** After approval and green CI, merge the PR. The Technical Story status transitions to Done.

---

## 3. Definition of Done Checklist

Every PR must satisfy all items before merge:

- [ ] All unit tests pass (coverage ≥ 80% on business logic)
- [ ] All integration tests pass
- [ ] CI pipeline is green (lint, type-check, test, security scan)
- [ ] No High or Critical CVEs in dependency scan
- [ ] ADR updated if architectural decision was introduced or changed
- [ ] Documentation delta complete (inline docs, README if public API changed)
- [ ] `evolith validate --topology <declared>` passes
- [ ] Peer review approved
- [ ] Technical Story `functionalStoryRef` links to a valid Functional Story

---

## 4. Blocking Criteria

| Criterion | Action |
|---|---|
| Coverage below 80% on business logic | BLOCK — add tests before merge |
| High or Critical CVE detected | BLOCK — update or replace dependency |
| ADR missing for architectural decision | BLOCK — create ADR before merge |
| Topology validation fails | BLOCK — resolve violation before merge |
| DOMA violation (F3 only) | BLOCK — resolve per ADR-0076 |

---

## 5. Outputs

- All Technical Stories in Done state with `functionalStoryRef` traceability.
- ADR Registry updated with all construction-phase decisions.
- Test Summary Report reflecting final coverage and test distribution.
- Documentation delta complete.
- Gate evidence for `evolith gate evaluate --phase construction`.

---

## 6. Handoff to Gate F4

After gate PASS, the following must be ready for Phase 4 (Validation):

| Artifact | Source | Condition |
|---|---|---|
| Test Summary Report | Construction test results | Level 1+ |
| ADR Registry snapshot | All ADRs created/updated during construction | Level 1+ |
| Coverage report | CI pipeline output | Level 1+ |

---

[Back to SDLC Governance Center](../README.md)
