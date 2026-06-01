# Template: Technical Story

> **Bilingual navigation:** [Versión en Español](./technical-story-template.es.md)
> **Phase:** 3 — Construction
> **Exit gate:** Successful Build (PR Merge Authorized)
> **Parent:** [Artifact Templates](./README.md)

---

## Purpose

A Technical Story translates a Functional Story into a concrete engineering work item. It defines implementation scope, technical acceptance criteria, Definition of Done evidence, and traceability to code and tests.

---

## Choose Your View

| View | Link | Use when |
|---|---|---|
| **Markdown Source** | [Open reusable Markdown source](./source/technical-story-template-source.md) | You need to copy the canonical Technical Story structure into a product or delivery repository. |
| **Rendered Example** | [Open UMS rendered example](./examples/technical-story-example-ums.md) | You want to see how a Technical Story connects implementation, tests, documentation, and traceability. |

---

## Authoring Rules

- Create one Technical Story per clear implementation unit.
- Link every Technical Story to its parent Functional Story.
- Include implementation scope across domain, application, infrastructure, API/UI, tests, and documentation when applicable.
- Successful Build cannot pass without DoD evidence and CI traceability.

---

## Related Documents

| Document | Purpose |
|---|---|
| [Construction-Focused SDLC Framework](../02-engineering/construction-focused-sdlc-framework.md) | Defines construction governance and DoD. |
| [Functional Story Template](./functional-story-template.md) | Parent business behavior artifact. |
| [Quality Gates](../quality-gates.md) | Defines mandatory build and validation thresholds. |
