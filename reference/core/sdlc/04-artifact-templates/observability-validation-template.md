# Template: Observability Validation

> **Bilingual navigation:** [Versión en Español](./observability-validation-template.es.md)
> **Phase:** 5 — Delivery and Operations
> **Exit gate:** Production Live
> **Schema:** [`observability-validation.schema.json`](../../../../src/rulesets/schema/observability-validation.schema.json)
> **Parent:** [Artifact Templates](./README.md)

---

## Purpose

The Observability Validation artifact records that metrics, logs, traces, and alerting are nominal across every production-bound path at the moment of cutover. It is mandatory evidence for the Production Live gate and is cited by the [Phase 5 — Zero-Downtime Release Playbook](../01-playbooks/zero-downtime-release.md).

---

## Authoring Rules

- Bind every metric and alert to its SLO baseline (link the SLO doc or dashboard).
- Capture three windows: pre-deployment baseline, transition window, post-deployment steady state.
- Any `firing` or `silenced` alert during the transition window must be justified in the waiver section.
- A `result` of `DEGRADED` or `BLOCK` halts the gate; rollback procedure must be invoked.

---

## Required Sections

| Section | Schema field | Notes |
|---|---|---|
| Release identifier | `release` | Must reference the stamped RC. |
| Evaluation timestamp | `evaluatedAt` | ISO 8601 with timezone. |
| Evaluator | `evaluator` | SRE / DevOps Lead responsible for the sign-off. |
| Metrics | `metrics` | Error rate %, p95 / p99 latency, SLO compliance flag. |
| Logs | `logs` | Error volume, anomaly count, within-baseline flag. |
| Traces | `traces` | Critical-path completeness and missing-span count. |
| Alerts | `alerts[]` | Each alert with `name`, `state`, `owner`. |
| Result | `result` | `NOMINAL` · `DEGRADED` · `BLOCK`. |
| Waivers | `waivers[]` | Required when a metric breaches its threshold but the gate proceeds. |

---

## Markdown Skeleton

```markdown
# Observability Validation — [RC-X.Y.Z]

- Evaluated at: YYYY-MM-DDThh:mm:ss±hh:mm
- Evaluator: [Name / Role]
- SLO baseline: [Link]

## Metrics
| Metric | Value | Threshold | Within SLO |
|---|---:|---:|:---:|
| Error rate % | … | … | yes/no |
| Latency p95 (ms) | … | … | yes/no |
| Latency p99 (ms) | … | … | yes/no |

## Logs
- Error volume: …
- Anomalies: …
- Within baseline: yes/no

## Traces
- Critical paths complete: yes/no
- Missing spans: …

## Alerts
| Name | State | Owner |
|---|---|---|
| … | nominal/firing/silenced | … |

## Result
- Decision: NOMINAL / DEGRADED / BLOCK
- Waivers: [optional list]
```

---

## Related Documents

| Document | Purpose |
|---|---|
| [Zero-Downtime Release Playbook](../01-playbooks/zero-downtime-release.md) | Procedural gate that consumes this evidence. |
| [SDLC Quality Gates](../quality-gates.md) | Threshold authority. |
| [`phase-gates.rules.json`](../../../../src/rulesets/sdlc/phase-gates.rules.json) | Phase 5 `Observability Validation` evidence entry references this template's schema. |
