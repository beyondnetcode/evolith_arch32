# Template: Integration Evidence

> **Bilingual navigation:** [Versión en Español](./integration-evidence-template.es.md)
> **Phase:** 4 — Validation and QA
> **Exit gate:** RC Stamped
> **Schema:** [`integration-evidence.schema.json`](../../../../rulesets/schema/integration-evidence.schema.json)
> **Parent:** [Artifact Templates](./README.md)

---

## Purpose

The Integration Evidence artifact proves that every declared inter-component contract was exercised against a real or contract-tested counterpart before RC stamp. It is mandatory evidence for the RC Stamped gate and is cited by the [Phase 4 — RC Stamped Playbook](../01-playbooks/phase-4-rc-stamp.md).

---

## Authoring Rules

- One entry per declared contract; do not bundle multiple integrations under a single id.
- `testKind` must reflect the strongest evidence run for the contract — `contract` and `consumer-driven` rank above `synthetic`.
- A `FAIL` integration blocks the RC unless a waiver is attached.
- Link the actual run log or verifier output in `evidence`; commit URLs are preferred over ad-hoc attachments.

---

## Required Sections

| Section | Schema field | Notes |
|---|---|---|
| RC identifier | `releaseCandidate` | Must match the stamped RC. |
| Evaluation timestamp | `evaluatedAt` | ISO 8601 with timezone. |
| Evaluator | `evaluator` | Tech Lead or QA Lead. |
| Integrations | `integrations[]` | Minimum one entry; each lists producer, consumer, contract, `testKind`, `result`, evidence link. |
| Result | `result` | `PASS` · `FAIL` · `WAIVED`. |
| Waivers | `waivers[]` | Required when an integration is `WAIVED` or `FAIL` proceeds with risk acceptance. |

---

## Markdown Skeleton

```markdown
# Integration Evidence — [RC-X.Y.Z]

- Evaluated at: YYYY-MM-DDThh:mm:ss±hh:mm
- Evaluator: [Name / Role]

## Integrations
| ID | Producer | Consumer | Contract | Test Kind | Result | Evidence |
|---|---|---|---|---|---|---|
| INT-001 | … | … | [link] | contract / consumer-driven / end-to-end / synthetic | PASS / FAIL / WAIVED | [link] |

## Result
- Decision: PASS / FAIL / WAIVED
- Waivers: [optional list]
```

---

## Related Documents

| Document | Purpose |
|---|---|
| [Phase 4 — RC Stamped Playbook](../01-playbooks/phase-4-rc-stamp.md) | Procedural gate that consumes this evidence. |
| [SDLC Quality Gates](../quality-gates.md) | Defines integration-related blocking criteria. |
| [`phase-gates.rules.json`](../../../../rulesets/sdlc/phase-gates.rules.json) | Phase 4 `Integration Evidence` evidence entry references this template's schema. |
