# Multi-Topology Reference Corpus Implementation Plan

> **Bilingual Navigation:** [Versión en Español](./multi-topology-reference-corpus-implementation-plan.es.md)

**Status:** Active Tracking  
**Owner:** Evolith Architecture Board  
**Last Updated:** 2026-06-18  
**Scope:** Evolith Core taxonomy, rulesets, CLI, MCP, and Service CORE API  
**Related Vision:** [Evolith Strategic Validation and Composition Framework](../../../../product/suite/methods/evolith-strategic-validation-and-composition-framework.md)

This document is the implementation tracker for evolving Evolith Core from a progressive-monolith reference corpus into a **Multi-Topology Reference Corpus** with executable governance. It is written so any architecture model or coding agent can understand the intended correction, preserve existing repository authority, and continue the work without re-litigating the core decision.

---

## 1. Executive Decision

Evolith Core must support multiple architecture topologies, but the implementation must be **manifest-driven, dimensional, and compatible with the existing control plane**.

The approved direction is:

1. Keep CLI, MCP, and Service CORE API as a single operational control plane.
2. Treat each topology as a governed profile declared by a `topology.manifest.json`.
3. Keep universal ADRs in the existing ADR registry and reference them from topology profiles.
4. Put human-authored topology documentation under `reference/core/architecture/topologies/`.
5. Put executable topology rules under `rulesets/topologies/`.
6. Preserve Dual-Engine Parity: every new topology validation rule requires Native JSON ruleset coverage and matching OPA/Rego coverage.
7. Do not create a root-level `/topologies/` directory unless a future ADR explicitly changes the root taxonomy.

## 2. Current Baseline

The repository already has the major building blocks, but they are not yet resolved by topology.

| Area | Current Location | Current State |
|---|---|---|
| ADR authority | [ADR Registry](../../architecture/adrs/README.md) | ADRs are grouped by Core/runtime, not by topology. |
| Progressive rules | [Architecture Rulesets](../../../../src/rulesets/architecture/README.md) | F1/F2/F3 already encode modular monolith, distributed modules, and microservices rules. |
| OPA parity | [OPA Rules](../../architecture/topologies/progressive-axis/modular-monolith/modular-monolith.rego) | OPA exists for current architecture rules, but not for new topology families. |
| CLI validation | [Validate Command](../../../../src/sdk/cli/src/commands/validate/validate.command.ts) | Supports `--arch-level F1/F2/F3`, not `--topology`. |
| CLI scaffolding | [Scaffold Command](../../../../src/sdk/cli/src/commands/architecture/scaffold.command.ts) | Focused on modular monolith and microfrontends. |
| MCP resources | [Resources Service](../../../../src/packages/mcp-server/src/mcp/resources.service.ts) | Exposes global resources, not topology-addressed resources. |
| MCP tools | [Architecture Tools](../../../../src/packages/mcp-server/src/tools/architecture.tools.ts) | Validates F1/F2/F3 architecture levels, not topology manifests. |
| Service CORE API | [Architecture Controller](../../../../src/apps/core-api/src/presentation/controllers/architecture.controller.ts) | Exposes architecture validation and drift detection, not topology catalog endpoints. |
| Repository taxonomy | [Repository Taxonomy](../taxonomy/repository-taxonomy.md) | Does not yet authorize topology directories as first-class architecture corpus areas. |

## 3. Non-Negotiable Guardrails

Any agent or model working on this change must obey these rules:

1. Do not create `/topologies/` at repository root without a new accepted ADR that amends repository taxonomy.
2. Do not duplicate Core ADRs inside topology folders. Topology profiles reference Core ADRs and add only topology-specific decisions.
3. Do not create a separate CLI per topology.
4. Do not create a separate MCP server per topology.
5. Do not treat `serverless`, `event-driven`, `data-mesh`, `edge-computing`, and `agentic-ai` as mutually exclusive product states.
6. Do not add a new validation rule without updating both the Native ruleset and the matching OPA/Rego policy.
7. Do not put budgets, ROI, costs, staffing, or other business ownership data into Core topology artifacts.
8. Keep Evolith Tracker responsible for business timing, ownership, prioritization, and Funnel 0 decisions.
9. Keep internal links relative and validate anchors before completion.
10. Maintain bilingual parity for every Markdown artifact.

## 4. Target Taxonomy

The topology corpus is dimensional. A product can combine profiles from more than one dimension.

```text
reference/core/architecture/topologies/
  README.md
  progressive-axis/
    modular-monolith/
    distributed-modules/
    microservices/
  execution/
    serverless/
    edge-computing/
  integration/
    event-driven/
  data/
    data-mesh/
  ai/
    agentic-ai/
```

Executable rules live separately:

```text
rulesets/topologies/
  README.md
  progressive-axis/
    modular-monolith/
      native/
      opa/
    distributed-modules/
      native/
      opa/
    microservices/
      native/
      opa/
  execution/
    serverless/
      native/
      opa/
    edge-computing/
      native/
      opa/
  integration/
    event-driven/
      native/
      opa/
  data/
    data-mesh/
      native/
      opa/
  ai/
    agentic-ai/
      native/
      opa/
```

## 5. Topology Profile Contract

Every topology profile must expose the same artifact families, even if early profiles begin as `Draft` or `Proposed`.

```text
reference/core/architecture/topologies/<dimension>/<topology>/
  README.md
  topology.manifest.json
  designs/
  diagrams/
  adrs/
  ai-rulesets/
  mcp/
    resources.json
    tools.json
    prompts/
  cli/
    commands.json
    scaffolds/
    validators/
  ums-contracts/
```

The `topology.manifest.json` is the binding contract. It must identify:

| Field | Purpose |
|---|---|
| `id` | Stable topology identifier, such as `modular-monolith` or `serverless`. |
| `dimension` | One of `progressive-axis`, `execution`, `integration`, `data`, or `ai`. |
| `status` | `draft`, `proposed`, `accepted`, or `deprecated`. |
| `inherits` | Core ADRs, standards, rulesets, and policies inherited by the topology. |
| `adrs` | Topology-specific ADRs only. |
| `rulesets.native` | Native JSON rulesets for this topology. |
| `rulesets.opa` | Matching OPA/Rego policies for this topology. |
| `mcp.resources` | MCP resource descriptors exposed to AI agents. |
| `mcp.tools` | MCP tool descriptors or tool mappings for governed actions. |
| `cli.validators` | CLI validators loaded when `--topology` is selected. |
| `cli.scaffolds` | Optional scaffolds available for the selected topology. |
| `umsContracts` | UMS applied-reference contracts relevant to this topology. |

## 6. Tracking Authority

[Gap Tracking Board](../gaps/gap-tracking.md) is the single source of truth for Multi-Topology debt, gaps, opportunities, enablers, priority, and status. The `MT-A*` activities live there with criticity, complexity, state, and canonical ordering.

This implementation plan is a supporting detail document. Use it to understand the target architecture, contracts, dependencies, and validation expectations, but update activity state only in [Gap Tracking Board](../gaps/gap-tracking.md).

## 7. Execution Phases

The tracking board in [Gap Tracking Board](../gaps/gap-tracking.md) is authoritative. The phases below explain execution order for the `MT-A*` activities.

| Phase | Activities | Goal |
|---|---|---|
| Foundation | `MT-A01` to `MT-A08` | Lock governance, taxonomy, schema, and compatibility before creating topology content. |
| Corpus | `MT-A09` to `MT-A16` | Create the human-readable topology corpus and draft topology profiles. |
| Enforcement | `MT-A17` to `MT-A21` | Make topology profiles executable through schema, Native rules, OPA rules, and shared resolution. |
| Interfaces | `MT-A22` to `MT-A25` | Expose topology governance through CLI, MCP, and Service CORE API. |
| Evidence | `MT-A26` | Update navigation and record validation evidence. |

## 8. CLI Contract

The CLI must remain a single executable surface. Add topology awareness as a parameter, not as a new product.

Required commands:

```bash
evolith topology list
evolith topology inspect modular-monolith
evolith validate --topology modular-monolith
evolith validate --topology serverless --engine native
evolith validate --topology serverless --engine opa
evolith adr create --topology event-driven
evolith scaffold --topology agentic-ai --pattern mcp-enabled-context
```

Compatibility rule:

```text
--arch-level F1 -> --topology modular-monolith
--arch-level F2 -> --topology distributed-modules
--arch-level F3 -> --topology microservices
```

The CLI must resolve:

1. topology manifest;
2. inherited Core rulesets;
3. topology-specific Native rulesets;
4. topology-specific OPA policies;
5. schemas;
6. scaffolds;
7. output envelope defined by ADR-0073.

## 9. MCP Contract

MCP must expose topology context through standard MCP primitives: Resources, Tools, and Prompts.

Required resources:

```text
evolith://topologies
evolith://topologies/{id}/manifest
evolith://topologies/{id}/adrs
evolith://topologies/{id}/rulesets
evolith://topologies/{id}/mcp
evolith://topologies/{id}/cli
evolith://topologies/{id}/ums-contracts
```

Required tools:

```text
evolith-topology-list
evolith-topology-inspect
evolith-topology-validate
evolith-adr-recommend
evolith-ruleset-explain
evolith-scaffold-plan
```

Required prompts:

```text
topology-aware-implementation
adr-impact-analysis
extraction-readiness-review
serverless-readiness-review
agentic-ai-governance-review
```

MCP tools must call the same application-layer use cases as the CLI and Service CORE API.

## 10. Service CORE API Contract

The Service CORE API must expose topology discovery and validation for external orchestrators such as Evolith Tracker.

Required endpoints:

```text
GET  /topologies
GET  /topologies/:id
GET  /topologies/:id/manifest
POST /topologies/:id/validate
POST /topologies/:id/scaffold-plan
```

The API must not accept arbitrary command execution. It can invoke only registered application use cases.

## 11. Migration Sequence

Use this order. Do not skip ahead to implementation before the ADR and schema exist.

1. Write and accept the Multi-Topology ADR.
2. Update repository taxonomy and taxonomy rules.
3. Add `topology-manifest.schema.json`.
4. Create `reference/core/architecture/topologies/README.md` and `.es.md`.
5. Create `rulesets/topologies/README.md` and `.es.md`.
6. Create the `progressive-axis` profiles and map F1/F2/F3.
7. Create draft profiles for serverless, edge, event-driven, data mesh, and agentic AI.
8. Add topology ruleset loading to the shared Core Domain layer.
9. Add CLI `--topology` support.
10. Add MCP topology resources.
11. Add MCP topology tools.
12. Add Service CORE API topology endpoints.
13. Update navigation and master indexes.
14. Run validation.
15. Record evidence and update tracking status.

## 12. Validation Commands

Run these after every documentation or ruleset change:

```bash
node .harness/scripts/ci/04-check-bilingual-parity.mjs
node .harness/scripts/ci/01-validate-docs.mjs
node .harness/scripts/validate-rulesets.mjs
```

Run this when Mermaid diagrams change:

```bash
node .harness/scripts/ci/01-validate-docs.mjs --render-mermaid
```

Run these when CLI, MCP, Core API, or shared domain code changes:

```bash
npm test
npm run mcp:smoke
```

If package-level test commands differ, use the package README and report the exact commands executed.

## 13. Definition of Done

The Multi-Topology Reference Corpus transition is complete only when:

1. Multi-Topology ADR is accepted.
2. Topology manifest schema exists and is validated.
3. `reference/core/architecture/topologies/` is linked from Architecture Hub and navigation indexes.
4. `rulesets/topologies/` exists and is linked from Rulesets Hub.
5. Modular monolith is represented as the first topology profile.
6. F1/F2/F3 compatibility is preserved.
7. Serverless, edge computing, event-driven, data mesh, and agentic AI profiles exist at least as draft profiles.
8. CLI can validate by `--topology`.
9. MCP exposes topology resources.
10. Service CORE API exposes topology discovery and validation endpoints.
11. Native and OPA rules are equivalent for every new topology rule.
12. Bilingual parity passes.
13. Documentation validation passes.
14. Ruleset validation passes.
15. Evidence is recorded and this tracker is updated.

## 14. Handoff Instructions for Agents

When an agent resumes this work:

1. Read this document first.
2. Read [Repository Taxonomy](../taxonomy/repository-taxonomy.md), [ADR-0048](../../architecture/adrs/core/0048-enterprise-taxonomy-reference-layout.md), [ADR-0070](../../architecture/adrs/core/0070-lean-root-repository-taxonomy.md), [ADR-0073](../../architecture/adrs/core/0073-unified-cli-output-contract.md), [ADR-0074](../../architecture/adrs/core/0074-evolith-core-api-exposure-layer.md), and [ADR-0041](../../architecture/adrs/core/0041-dual-engine-policy-evaluation.md).
3. Check `git status --short` and preserve unrelated user changes.
4. Implement the next `PENDING` activity only.
5. Keep English and Spanish files structurally aligned.
6. Run the validation commands relevant to the files changed.
7. Update activity status only in [Gap Tracking Board](../gaps/gap-tracking.md), and only when evidence exists.

---
[Back to Vision Index](../README.md)
