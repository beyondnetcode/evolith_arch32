# Modular Monolith — Evolution Guide

> **Bilingual Navigation:** [English](./evolution.md) | [Español](./evolution.es.md)

**Owner:** Architecture Board
**Topology:** Modular Monolith

---

## F1 to F2 Path

The modular monolith (F1) is designed as a stepping stone toward distributed services (F2). Evolution is deliberate, not accidental. The path from F1 to F2 follows a structured extraction process.

- **F1 state:** Single deployment, module isolation via interfaces, shared infrastructure
- **F2 state:** Extracted services with independent deployment, dedicated infrastructure per service
- **Transition:** Module-by-module extraction based on readiness scores and business justification

**Decision gate:** Architecture Board must approve each module extraction. No module moves to F2 without explicit approval.

## Extraction Readiness (ADR-0045)

Each module must achieve a minimum extraction readiness score before extraction is considered. The score is calculated from multiple dimensions.

**Readiness dimensions (ADR-0045):**

| Dimension | Weight | Threshold |
|-----------|--------|-----------|
| Interface cleanliness | 25% | >= 80% |
| Database independence | 25% | >= 90% |
| No shared state | 20% | 100% |
| Event emission coverage | 15% | >= 70% |
| Test coverage | 15% | >= 80% |

**Minimum overall score:** >= 70% required for extraction candidacy

**Measurement frequency:** Readiness scores recalculated monthly; trends tracked over time

## Extraction Criteria

A module is eligible for extraction when it meets all of the following criteria.

1. **Readiness score >= 70%** for 3 consecutive months
2. **Business justification** — clear operational or scalability reason for extraction
3. **Team readiness** — dedicated team capable of operating the extracted service
4. **Infrastructure readiness** — dedicated infrastructure provisioned and tested
5. **Migration plan** — documented plan for data migration, traffic cutover, and rollback

**Exclusion criteria:**
- Module has fewer than 3 consumers
- Module shares state with more than 2 other modules
- Module lacks event emission for domain events

## Progressive Evolution (ADR-0047)

Extraction follows a progressive, reversible pattern. No module is extracted in a single step.

- **Phase 1 — Shadow mode:** New service runs alongside monolith; traffic is mirrored, not switched
- **Phase 2 — Dual write:** Both monolith and service receive writes; consistency verified
- **Phase 3 — Read migration:** Read traffic shifts to new service; monolith retains writes
- **Phase 4 — Full cutover:** All traffic routes to new service; monolith module deprecated
- **Phase 5 — Cleanup:** Monolith module removed; shared infrastructure decommissioned

**Rollback at any phase:** If issues arise, revert to the previous phase. Extraction is not a one-way door.

---

[Back to Modular Monolith Profile](./README.md)
