# Template: Architectural Decision Record (ADR)

> **Bilingual navigation:** [Versión en Español](./adr-template.es.md)
> **Phase:** 2 — Design and Architecture (and throughout construction)
> **Exit gate:** Design Baseline Approved (initial ADRs); Successful Build (runtime ADRs)
> **Parent:** [Artifact Templates](./README.md)

---

## Purpose

An ADR records one significant architectural decision with its context, options, trade-offs, consequences, and traceability. ADRs make decisions reviewable before implementation and auditable after delivery.

---

## Choose Your View

| View | Link | Use when |
|---|---|---|
| **Markdown Source** | [Open reusable Markdown source](./source/adr-template-source.md) | You need to copy the canonical ADR structure into a product or delivery repository. |
| **Rendered Example** | [Open UMS rendered example](./examples/adr-example-ums.md) | You want to see how an accepted ADR should look in practice. |

---

## Authoring Rules

- One ADR must represent one decision.
- Document rejected options, not only the selected decision.
- Link the ADR to impacted PRDs, Functional Stories, Technical Stories, bounded contexts, and related Evolith ADRs.
- Do not implement a significant architecture decision before the ADR is accepted or explicitly waived.

---

## Related Documents

| Document | Purpose |
|---|---|
| [SDLC Artifact Mapping](../sdlc-evolith-artifact-mapping.md) | Defines when ADRs are required or conditional. |
| [Traceability Model](../traceability-model.md) | Explains ADR position in the evidence chain. |
| [Quality Gates](../quality-gates.md) | Defines release-blocking constraints that may be driven by ADRs. |
