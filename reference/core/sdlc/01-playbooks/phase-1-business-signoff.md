# Phase 1 — Business Sign-Off Playbook

> **Bilingual Navigation:** [Versión en Español](./phase-1-business-signoff.es.md)

**Phase:** [01 — Conception and Discovery](../README.md)
**Phase Exit Gate:** Business Sign-Off (see [`phase-gates.rules.json`](../../../../src/rulesets/sdlc/phase-gates.rules.json) gate `phase: 1`)
**Primary Audience:** Product Owner, Executive Sponsor, Software Architect
**Accountable Role:** Product Owner
**Waiver Authority:** Executive Sponsor
**Status:** Approved

This playbook operationalises the Business Sign-Off gate. It is the procedural counterpart to the declarative rules in `phase-gates.rules.json` and the thresholds in [`quality-gates.md`](../quality-gates.md). No initiative may exit Phase 1 unless every checkpoint below produces objective evidence.

---

## 1. Pre-Conditions

Before opening the gate, confirm:

- The initiative is registered in the portfolio backlog with a unique identifier.
- An Executive Sponsor and a Product Owner are nominated and acknowledged.
- The applicable Evolith Reference Blueprint and topology baseline are identified.

If any pre-condition is missing, **do not start the gate**. Returning later avoids re-work.

---

## 2. Evidence Collection Checklist

Each row below maps to a `mandatoryEvidence` entry in the Phase 1 gate. Use the linked template; reviewers reject free-form prose.

| # | Mandatory Evidence | Template / Schema | Acceptance Criterion |
|---|---|---|---|
| 1 | PRD — Product Requirements Document | [`prd-template.md`](../04-artifact-templates/prd-template.md) · [`prd.schema.json`](../../../../src/rulesets/schema/prd.schema.json) | `status = Approved`, `approvalEvidence` populated, `approvalDate` filled |
| 2 | Discovery Canvas | Initiative registry entry | Customer pains, expected value, and target persona documented. |
| 3 | Technical Feasibility Canvas | [`technical-feasibility.schema.json`](../../../../src/rulesets/schema/technical-feasibility.schema.json) | Quality attributes and NFRs recorded with measurable thresholds |
| 4 | Ballpark Estimation | T-Shirt sizing log | Team composition and sizing assumptions stated. |
| 5 | MoSCoW Prioritization Matrix | MoSCoW worksheet | At least one MUST item, valid Must/Should/Could/Won't distribution. |
| 6 | Build-versus-Compose Analysis | [`build-vs-compose.schema.json`](../../../../src/rulesets/schema/build-vs-compose.schema.json) | Adopt / Embed / Integrate / Extend / Build / Reject disposition with three-year cost, licensing, tenant isolation, replaceability, and PoC requirements (Product Vision §5.3) |

---

## 3. Gate Review Procedure

1. **Evidence audit (Product Owner).** Confirm every artifact in §2 is present, version-stamped, and stored in the initiative's documentation root.
2. **Architectural alignment (Software Architect).** Walk the PRD and Technical Feasibility Canvas against the relevant Reference Blueprint. Flag any contradiction with declared topology constraints, cloud quotas, or existing ADRs.
3. **Business sign-off (Executive Sponsor).** Validate that funding is authorised, scope is unambiguous, and OKRs are explicit.
4. **Decision record.** Record the gate outcome in the initiative log: `APPROVED`, `BLOCKED`, or `WAIVED` (with waiver reference).

A gate session must produce a single, written decision. No verbal approvals.

---

## 4. Blocking Criteria

Trigger an automatic block when any criterion below is observed; the corresponding action is normative.

| Criterion | Action |
|---|---|
| Scope is ambiguous | BLOCK — return to Phase 1 scope clarification |
| Technical constraints or cloud quotas are unaligned | BLOCK — return to Phase 1 with revised feasibility canvas |
| Architecture constraints are ignored or contradicted | BLOCK — escalate to Architecture Board |

---

## 5. Waiver Workflow

If the gate must proceed with a known deviation, file a waiver per [`quality-gates.md` §Waiver Policy](../quality-gates.md). Required fields:

- `criterion` · `justification` · `risk` · `owner` · `expirationDate` · `mitigationPlan`

The Executive Sponsor is the waiver authority for Phase 1. Waivers must not bypass legal, compliance, or security blockers.

---

## 6. Outputs

Upon gate approval the following must be produced:

- Signed Business Sign-Off decision record.
- PRD locked under change control.
- Initiative authorised to enter [Phase 2 — Design Baseline](./phase-2-design-baseline.md).

---

[Back to SDLC Governance Center](../README.md)
