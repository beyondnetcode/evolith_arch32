# Schema Index

JSON Schema definitions for validating Evolith governance and SDLC artifacts.

> **Source of truth:** these schemas are the **authoritative contract** for the *structure* of each artifact. When a Markdown template and a schema disagree about required fields, the schema wins for machine validation. The Markdown templates under `reference/governance/sdlc/04-artifact-templates/` remain authoritative for *human guidance, intent, and prose*.

**Count:** this directory contains **39** `*.schema.json` files. They are grouped below by purpose. OPA policy *input* schemas live separately under [`../opa/schemas/`](../opa/schemas/) (26 files) and are indexed in the [OPA README](../opa/README.md).

> **Axis note:** the SDLC axis (idea → product, five phases) is **separate** from the topology axis (architecture groupers). The "Phase" column below refers to the SDLC progressive axis only. Topology artifacts (`topology-manifest`, `topology-composition`, `blueprint`) are not tied to an SDLC phase.

## SDLC artifact schemas

| Schema | Title | SDLC Phase |
|---|---|---|
| [discovery-canvas.schema.json](./discovery-canvas.schema.json) | Discovery Canvas | 1 — Discovery |
| [technical-feasibility.schema.json](./technical-feasibility.schema.json) | Technical Feasibility (NFRs / quality attributes) | 1 — Discovery |
| [ballpark-estimation.schema.json](./ballpark-estimation.schema.json) | Ballpark Estimation (T-shirt sizing) | 1 — Discovery |
| [evolith-user-story.schema.json](./evolith-user-story.schema.json) | User Story Evolith (BDD criteria) | 1 — Discovery |
| [agile-backlog.schema.json](./agile-backlog.schema.json) | Agile Backlog | 1 — Discovery |
| [prd.schema.json](./prd.schema.json) | Product Requirements Document | 1 — Discovery |
| [cli-impact-analysis.schema.json](./cli-impact-analysis.schema.json) | CLI Impact Analysis | 1–2 |
| [build-vs-compose.schema.json](./build-vs-compose.schema.json) | Build-versus-Compose Analysis | 1–2 |
| [functional-story.schema.json](./functional-story.schema.json) | Functional Story | 2 — Definition |
| [technical-story.schema.json](./technical-story.schema.json) | Technical Story | 3 — Construction |
| [test-summary-report.schema.json](./test-summary-report.schema.json) | Test Summary Report | 4 — Validation |
| [security-scan-report.schema.json](./security-scan-report.schema.json) | Security Scan Report | 4 — Validation |
| [integration-evidence.schema.json](./integration-evidence.schema.json) | Integration Evidence | 4 — Validation |
| [observability-validation.schema.json](./observability-validation.schema.json) | Observability Validation | 4–5 |
| [release-notes.schema.json](./release-notes.schema.json) | Release Notes | 5 — Delivery |
| [rollback-rehearsal.schema.json](./rollback-rehearsal.schema.json) | Rollback Rehearsal Evidence | 5 — Delivery |
| [on-call-handoff.schema.json](./on-call-handoff.schema.json) | On-Call Handoff Confirmation | 5 — Delivery / Ops |

## Governance, evidence and gate schemas

| Schema | Title | Scope |
|---|---|---|
| [adr.schema.json](./adr.schema.json) | Architecture Decision Record | All |
| [waiver.schema.json](./waiver.schema.json) | Evolith Gate Waiver | All |
| [gate-evidence.schema.json](./gate-evidence.schema.json) | Gate Evidence (core/ADR-0073) | All |
| [maturity-evidence.schema.json](./maturity-evidence.schema.json) | Maturity Evidence | All |
| [output-envelope.schema.json](./output-envelope.schema.json) | Machine Output Envelope (core/ADR-0073) | CLI/MCP/REST output |
| [sdlc-phase.schema.json](./sdlc-phase.schema.json) | SDLC Phase | SDLC axis definition |
| [sdlc-gate.schema.json](./sdlc-gate.schema.json) | SDLC Gate | SDLC axis definition |

## Core evaluation contracts

The stateless Core Evaluation Engine's input/output contracts (ADR-0101). Mirror the TypeScript contracts under `packages/core-domain/src/evaluation/contracts/`.

| Schema | Title | Scope |
|---|---|---|
| [evaluation-context.schema.json](./evaluation-context.schema.json) | Evaluation Context | Stateless Core input (GT-377 / ADR-0101) |
| [evaluation-result.schema.json](./evaluation-result.schema.json) | Evaluation Result | Stateless Core output (GT-377 / ADR-0101) |

## Ruleset and rule-definition schemas (meta-schemas)

| Schema | Title | Scope |
|---|---|---|
| [rule-definition.schema.json](./rule-definition.schema.json) | Evolith Rule Definition | Validates individual `*.rules.json` entries |
| [ruleset-sdlc.schema.json](./ruleset-sdlc.schema.json) | SDLC Ruleset | Validates SDLC-category rulesets |
| [ruleset-standard.schema.json](./ruleset-standard.schema.json) | Standard Ruleset | Validates standard-category rulesets |

## Satellite, tenant and topology schemas

| Schema | Title | Scope |
|---|---|---|
| [evolith-yaml.schema.json](./evolith-yaml.schema.json) | Evolith Satellite Contract (`evolith.yaml`) | Satellite governance |
| [satellite-record.schema.json](./satellite-record.schema.json) | Satellite Record | Satellite provisioning |
| [tenant.schema.json](./tenant.schema.json) | Evolith Tenant | Multi-tenancy |
| [tenant-override.schema.json](./tenant-override.schema.json) | Evolith Tenant Override | Multi-tenancy |
| [topology-manifest.schema.json](./topology-manifest.schema.json) | Evolith Topology Manifest | Topology axis (manifest resolution) |
| [topology-composition.schema.json](./topology-composition.schema.json) | Topology Composition | Topology axis (multi-topology composition) |
| [blueprint.schema.json](./blueprint.schema.json) | Evolith Blueprint | Architecture blueprints |

## Knowledge governance schemas

| Schema | Title | Scope |
|---|---|---|
| [knowledge-intake.schema.json](./knowledge-intake.schema.json) | External Knowledge Intake Candidate | Knowledge governance |
| [knowledge-projection.schema.json](./knowledge-projection.schema.json) | Approved Knowledge Projection | Knowledge governance |
| [source-registry.schema.json](./source-registry.schema.json) | External Knowledge Source Registry Entry | Knowledge governance |

---

**SDLC Phase 1 (Discovery) coverage:** 6 core schemas — Discovery Canvas, Technical Feasibility, Ballpark Estimation, Evolith User Story, Agile Backlog, PRD (plus CLI Impact Analysis and Build-vs-Compose spanning phases 1–2).

---

## Validating an artifact against a schema

All schemas are standard JSON Schema (draft 2020-12 / draft-07) validated with [Ajv](https://ajv.js.org/) (`ajv@8`, already a dependency of `@evolith/core-domain`). Two paths:

- **Through Evolith** — the `RulesetValidatorService` / `ruleset-loader` in `@evolith/core-domain` loads each `*.rules.json` and validates every entry against [`rule-definition.schema.json`](./rule-definition.schema.json) before evaluation; category rulesets are checked against [`ruleset-sdlc.schema.json`](./ruleset-sdlc.schema.json) or [`ruleset-standard.schema.json`](./ruleset-standard.schema.json). This runs automatically when the CLI/Core load a ruleset, so a malformed rule fails fast.
- **Ad hoc** — validate any artifact directly with Ajv. Example, checking an ADR document against the ADR schema:

```bash
npx ajv-cli validate -c ajv-formats \
  -s rulesets/schema/adr.schema.json \
  -d path/to/your-adr.json
```

To validate a hand-authored `*.rules.json` entry, point `-s` at `rulesets/schema/rule-definition.schema.json` and `-d` at the entry. `ajv-formats` is required because several schemas use `format` keywords (`date-time`, `uri`, etc.).

### Troubleshooting

| Symptom | Cause | Resolution |
|---|---|---|
| `unknown format "date-time"` | `ajv-formats` not loaded | Add `-c ajv-formats` (CLI) or `addFormats(ajv)` (programmatic). |
| Validation passes locally but Core rejects the rule | Validated against the wrong schema | Individual entries use `rule-definition.schema.json`; whole category files use `ruleset-sdlc`/`ruleset-standard`. |
| `$ref` resolution error | Relative `$ref` resolved from the wrong base | Run Ajv from the repo root so sibling schema `$ref`s resolve. |

Authoring standards and the contribution workflow for schemas live in the repo-root [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

---

Back to [Rulesets Hub](../README.md)
