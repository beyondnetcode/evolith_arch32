# Template: Security Scan Report

> **Bilingual navigation:** [Versión en Español](./security-scan-report-template.es.md)
> **Phase:** 4 — Validation and QA
> **Exit gate:** RC Stamped
> **Schema:** [`security-scan-report.schema.json`](../../../../src/rulesets/schema/security-scan-report.schema.json)
> **Parent:** [Artifact Templates](./README.md)

---

## Purpose

The Security Scan Report consolidates SAST, DAST, SCA, secret-scanning, container, and IaC findings against the production CVE policy. It is mandatory evidence for the RC Stamped gate and is cited by the [Phase 4 — RC Stamped Playbook](../01-playbooks/phase-4-rc-stamp.md).

---

## Authoring Rules

- List every scanner that produced the report; omit none, even when clean.
- Counts in `findings` must equal the count of unresolved entries in `openFindings` per severity.
- High or Critical CVEs cannot pass through `Waiver` remediation without Executive Risk Acceptance recorded in the waiver `approvalAuthority`.
- Mediums require a Fix or Mitigate disposition with an explicit `dueDate`.

---

## Required Sections

| Section | Schema field | Notes |
|---|---|---|
| RC identifier | `releaseCandidate` | Must match the stamped RC. |
| Scan timestamp | `scannedAt` | ISO 8601 with timezone. |
| Scanners | `scanners[]` | At minimum one SAST + one SCA scanner. |
| Findings totals | `findings` | Critical, High, Medium, Low counts. |
| Open findings | `openFindings[]` | Each entry with id, severity, component, remediation, owner. |
| Policy | `policy` | Maximum allowed counts (`maxCritical`, `maxHigh`, `maxMedium`). |
| Result | `result` | `PASS` · `FAIL` · `WAIVED`. |
| Waivers | `waivers[]` | `approvalAuthority` is mandatory for High/Critical CVEs. |

---

## Markdown Skeleton

```markdown
# Security Scan Report — [RC-X.Y.Z]

- Scanned at: YYYY-MM-DDThh:mm:ss±hh:mm
- Scanners: [name + type + version, ...]

## Findings
| Severity | Count |
|---|---:|
| Critical | … |
| High | … |
| Medium | … |
| Low | … |

## Open Findings
| ID | Severity | Component | Remediation | Owner | Due |
|---|---|---|---|---|---|
| … | … | … | Fix/Mitigate/Waiver | … | YYYY-MM-DD |

## Policy
- max Critical: 0
- max High: 0
- max Medium: [N]

## Result
- Decision: PASS / FAIL / WAIVED
- Waivers: [list with approval authority]
```

---

## Related Documents

| Document | Purpose |
|---|---|
| [Phase 4 — RC Stamped Playbook](../01-playbooks/phase-4-rc-stamp.md) | Procedural gate that consumes this evidence. |
| [SDLC Quality Gates](../quality-gates.md) | Defines the production CVE policy. |
| [`phase-gates.rules.json`](../../../../src/rulesets/sdlc/phase-gates.rules.json) | Phase 4 `Security Scan Report` evidence entry references this template's schema. |
