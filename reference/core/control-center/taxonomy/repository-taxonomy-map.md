# Current Repository Taxonomy Map

> **Bilingual Navigation:** [Versión en Español](./repository-taxonomy-map.es.md)

This document maps the current repository layout for readers who need to understand what each area contains, how to use it, and how critical the data is. It complements the normative [Repository Taxonomy and Structuring Policy](./repository-taxonomy.md); it does not replace it.

## Purpose

Use this map when you need to decide where to read, edit, add, or audit content in Evolith Core. The root README sends readers to the [Vision, Maturity, and Gaps Hub](../README.md); this map is the hub's operational taxonomy view.

## Criticality Model

| Level | Meaning | Handling rule |
|---|---|---|
| C0 | Release, security, compliance, or executable governance critical | Treat as high-risk. Update bilingual counterparts, rules, validation scripts, and evidence together when applicable. |
| C1 | Normative architecture, standards, contracts, or operational guidance | Requires careful review, stable links, bilingual parity, and validation before completion. |
| C2 | Navigational, reference, research, applied evidence, or planning support | Keep links accurate and avoid promoting examples into standards without accepted authority. |
| C3 | Generated, local, cache, dependency, or transient state | Do not treat as source of truth. Regenerate or clean instead of hand-authoring unless explicitly documented. |

## Navigation Rules

| Rule | What to do |
|---|---|
| Start from the portal | Use the root [README](../../../../README.md), then the [Global Master Index](./MASTER_INDEX.md) when you already know the artifact family. |
| Keep standards in `reference/` | Architecture, governance, SDLC, operations, and product-reference documents belong under `reference/`. |
| Keep executable rules in `rulesets/` | Machine-readable architecture policy belongs in `rulesets/`; topology-specific rules belong in `src/rulesets/topologies/`. |
| Keep product implementation outside the corpus | Local `src/apps/`, `src/packages/`, `src/sdk/`, and `tests/` support executable governance surfaces; business product code remains outside this repository unless explicitly scoped. |
| Do not create root content areas casually | New root directories require accepted taxonomy authority and synchronized rule/script updates. |
| Preserve bilingual parity | Individual Markdown files use `.es.md`; grouped Spanish content uses `-es/` only when the area already follows that convention. |

## Root Layer

| Path | Criticality | What you find | What to do there | Do not |
|---|---|---|---|---|
| `README.md`, `README.es.md` | C1 | Public portal, domain routing, primary entry points | Route readers to hubs, not scattered documents | Turn it into a deep implementation manual |
| `MASTER_INDEX.md`, `MASTER_INDEX.es.md` | C1 | Exhaustive root navigation | Keep high-level routing complete and aligned with `reference/navigation/` | Add orphan links or duplicate detailed standards |
| `AGENTS.md`, `AGENTS.es.md` | C0 | Binding agent instructions and repository execution rules | Update when stack or governance behavior changes materially | Weaken validation, bilingual, or architecture rules |
| `DOCUMENTATION_VERSIONS.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE` | C1 | Release, contribution, versioning, and legal metadata | Keep public repository governance accurate | Store architectural decisions here |
| `package.json`, `package-lock.json` | C0 | Workspace dependency graph, scripts, and lockfile | Update through package manager workflows and validate build/test impact | Hand-edit dependency state casually |
| `.env` | C0 | Local environment configuration when present | Treat as sensitive local state | Quote values in documentation or use as an authoritative default |

## Reference Corpus

| Path | Criticality | What you find | What to do there | Do not |
|---|---|---|---|---|
| `reference/core/` | C1 | Core identity, scope, and boundaries | Use to understand what Evolith Core owns | Put product-specific implementation choices here |
| `reference/getting-started/` | C2 | Short role-based reading paths | Improve onboarding paths by role | Add normative decisions without linking authority |
| `reference/navigation/` | C1 | Global master index and navigation assets | Maintain complete repository routing | Diverge from the root navigation model |
| `reference/core/architecture/` | C0 | Architecture hub, ADRs, blueprints, canonical patterns, principles, topology corpus | Add architecture authority, accepted decisions, and reusable patterns | Treat UMS-specific choices as universal without ADR/standard authority |
| `reference/core/architecture/adrs/` | C0 | Accepted, proposed, or superseded architectural decision records | Record durable architectural decisions and update inbound links | Hide decisions in planning or report files |
| `reference/core/architecture/topologies/` | C1 | Human-readable topology guidance and maturity reports | Maintain topology adoption, operation, evolution, and maturity guidance | Put executable rules here; use `src/rulesets/topologies/` instead |
| `reference/core/sdlc/` | C0 | SDLC, standards, ADR governance, terminology, and onboarding | Maintain governance rules, lifecycle gates, and standards | Create parallel governance under root `docs/` |
| `product/suite/` | C1 | Portfolio vision, product-suite strategy, positioning, and communications | Align product direction with Core governance | Store product delivery artifacts that belong to a specific product |
| `product/products/` | C1 | Internal reference docs for Evolith products such as Core API, Tracker, MCP services, Evolith CLI, and UMS reference | Keep product documentation aligned with Core standards | Mix executable source code with reference documentation |
| `product/research/` | C2 | Research, PoCs, applied evidence, UMS demo boundary, and architecture intelligence | Capture learning and promote reusable lessons through ADRs/standards | Promote research directly into mandatory policy |
| `product/operations/` | C1 | SLOs, runbooks, observability, alerts, load tests, chaos experiments, Grafana, OTel, Tempo | Maintain operational readiness and incident response guidance | Put product-specific runbooks here without reusable scope |
| `product/infra/` | C0 | Docker, Helm, Kubernetes, and platform reference assets | Treat as production-risk-bearing infrastructure reference | Leave mutable or dev-only defaults undocumented |
| `product/infra/` | C1 | CI/CD, observability, SCM, and security platform guidance | Keep platform practices consistent across products | Encode executable policy here instead of `rulesets/` or workflows |
| `reference/quick-access/` | C2 | Shortcut navigation | Link readers to canonical hubs | Duplicate authoritative content |

## Governance And Reporting Hub

| Path | Criticality | What you find | What to do there | Do not |
|---|---|---|---|---|
| `reference/core/control-center/README.md` | C1 | Hub for maturity, gaps, audits, opportunities, evidence, and taxonomy map | Add ordered links to review surfaces | Link reports only from scattered README sections |
| `gap-tracking.md` | C0 | Authoritative ordered backlog of gaps and opportunities | Update priority, status, and ordering only with evidence | Track a gap somewhere else as the source of truth |
| `gap-reference-catalog.md` | C0 | Detailed problem, evidence, closure criteria, and references per `GT-*` | Add detailed context for new gaps | Put live status here instead of the tracking board |
| `maturity-assessment.md` | C1 | Consolidated maturity assessment | Update assessment evidence and link deviations to `GT-*` items | Track open gaps directly in the assessment |
| `gap-closure-evidence-standard.md`, `gap-closure-evidence.json` | C0 | Required closure evidence and registry | Record reproducible closure evidence | Mark semantic gaps done without registry evidence |
| `executive-summary.md`, `maturity-reconciliation.json`, `inventory-summary.md` | C2 | Generated executive, maturity, and inventory evidence | Use as validation evidence | Hand-author generated outputs without process |
| `repository-taxonomy-map.md` | C1 | Current operational map of repository areas and criticality | Use during navigation, audits, onboarding, and placement decisions | Treat it as superseding the accepted taxonomy policy |

## Executable Governance

| Path | Criticality | What you find | What to do there | Do not |
|---|---|---|---|---|
| `rulesets/` | C0 | Machine-readable architecture governance hub | Keep rules discoverable, versioned, and validated | Store prose-only standards here |
| `src/rulesets/opa/` | C0 | Cross-cutting OPA/Rego policies and schemas | Maintain parity with native evaluators when rules change | Add Rego without tests or native parity when required |
| `src/rulesets/topologies/` | C0 | Executable topology-specific rules | Preserve accepted topology parity across Native and OPA where applicable | Put human-readable topology guidance here |
| `src/rulesets/cross-cutting/` | C0 | Repository-wide taxonomy and cross-cutting constraints | Update with taxonomy rule changes | Change policy without matching validators |
| `src/rulesets/contracts/` | C0 | Contract rules and fixtures | Keep ADR-0073 and surface contracts reproducible | Let fixtures drift from CLI/MCP/API behavior |
| `src/rulesets/sdlc/`, `src/rulesets/evidence/`, `src/rulesets/governance/`, `src/rulesets/adr/` | C0 | Lifecycle, evidence, governance, and ADR validation rules | Keep CI-enforced governance synchronized with standards | Let documentation declare a rule that no evaluator enforces |
| `src/rulesets/cli/`, `src/rulesets/mcp/`, `src/rulesets/architecture/`, `src/rulesets/infrastructure/`, `src/rulesets/observability/`, `src/rulesets/schema/`, `src/rulesets/acl/` | C0 | Surface-specific validation domains | Update when the corresponding architecture or runtime behavior changes | Mix unrelated rule domains |

## Product And Runtime Workspaces

| Path | Criticality | What you find | What to do there | Do not |
|---|---|---|---|---|
| `src/apps/core-api/` | C0 | Service CORE API workspace | Validate API behavior, contracts, auth, cache, and governance endpoints | Treat it as generic product business code |
| `apps/agent-sandbox/` | C1 | Agent sandbox application workspace | Test agentic interaction patterns safely | Store production secrets or tenant data |
| `src/packages/core-domain/` | C0 | Core domain model and use cases | Preserve DDD isolation and executable governance domain logic | Add infrastructure concerns to the domain layer |
| `src/packages/core/` | C1 | Shared core package implementation | Keep reusable runtime logic scoped and tested | Create ambiguous shared utilities without ownership |
| `src/packages/infra-providers/` | C1 | Infrastructure provider adapters | Encapsulate platform/provider integration logic | Leak provider assumptions into domain code |
| `src/packages/mcp-server/` | C0 | MCP server implementation | Keep MCP tools, auth, contracts, and transport behavior aligned with ADRs | Duplicate CLI-only behavior without contract parity |
| `packages/mcp-tools/` | C1 | MCP tool package surface | Keep tools discoverable and contract-aligned | Mix unrelated product workflows |
| `src/sdk/cli/` | C0 | Evolith CLI workspace and distribution surface | Maintain CLI, templates, shell integration, local validation, and contract parity | Use generated `dist/` as source of truth |
| `tests/contract/` | C0 | Cross-surface contract tests | Validate CLI/MCP/API roundtrip contracts | Disable failing contract coverage without a tracked gap |

## Automation And Tooling

| Path | Criticality | What you find | What to do there | Do not |
|---|---|---|---|---|
| `.harness/rules/` | C0 | Binding repository and agent rules | Update with rule changes and keep bilingual/global parity where applicable | Change behavior without validation script support |
| `.harness/scripts/ci/` | C0 | CI validation scripts | Keep documented gates executable | Reference scripts that do not exist |
| `.harness/playbooks/` | C1 | Repeatable audit and engineering playbooks | Use for recurring audits and task workflows | Treat playbooks as optional when task scope requires them |
| `.harness/schemas/`, `.harness/templates/`, `.harness/agents/`, `.harness/adr/` | C1 | Schemas, templates, agent personas, and ADR support assets | Keep generated and human workflows consistent | Add placeholders without completion rules |
| `.github/workflows/` | C0 | GitHub Actions workflows | Keep CI aligned with documented validation gates | Point to missing scripts or mutable security actions |
| `.github/actions/`, `.github/ISSUE_TEMPLATE/` | C1 | Reusable actions and collaboration templates | Maintain repository collaboration flows | Encode architectural policy only in issue templates |
| `.husky/` | C0 | Local Git hooks | Keep pre-commit validation consistent with CI | Bypass documented validation gates |
| `.bmad-core/` | C1 | Spec-driven AI-DD method assets, agents, workflows, and skills | Maintain method support assets | Put canonical Evolith standards only inside BMAD assets |
| `.claude/`, `.mimocode/`, `.vscode/` | C2 | Tool-specific root configuration | Keep required tool contracts at root | Move into a grouped setup folder |

## Generated Or Local State

| Path | Criticality | What you find | What to do there | Do not |
|---|---|---|---|---|
| `node_modules/` and workspace `node_modules/` | C3 | Installed dependencies | Regenerate through package manager install | Edit or cite as source |
| `dist/` under workspaces | C3 | Compiled output | Clean/regenerate during build and avoid test contamination | Treat as authored source |
| `coverage/` and generated reports | C3 | Test and coverage outputs | Regenerate from tests or harness scripts | Hand-author metrics |
| `.harness/tmp/` | C3 | Temporary harness state | Clean before audits when required | Preserve as evidence unless promoted explicitly |
| `.harness/reports/` | C2 | Generated harness reports such as coverage | Link as evidence when current | Assume it replaces validation commands |
| `.release-please-manifest.json`, `release-please-config.json` | C1 | Release automation state and configuration | Keep release automation deterministic | Change without release impact review |

## Placement Decisions

| If you are adding... | Put it here | Required checks |
|---|---|---|
| A new gap, risk, or opportunity | `gap-tracking.md` and `gap-reference-catalog.md` | Bilingual pair, tracking validator, documentation validator |
| A maturity or audit navigation surface | `reference/core/control-center/README.md` | Bilingual pair and link validation |
| A normative architecture standard | `reference/core/sdlc/standards/` or accepted architecture area | Bilingual pair, authoritative references, affected rule updates if enforceable |
| An architectural decision | `reference/core/architecture/adrs/` | ADR registry/index updates and inbound link checks |
| Human-readable topology guidance | `reference/core/architecture/topologies/` | Topology maturity parity and bilingual guidance |
| Executable topology policy | `src/rulesets/topologies/` and matching OPA/native evaluator when required | Dual-engine parity and topology rule validation |
| Product-specific planning or state | `product/products/<product>/` | Keep product scope explicit |
| UMS applied evidence | `product/research/demo/` | Do not promote as universal without accepted authority |
| Runtime implementation for governance surfaces | `src/apps/`, `src/packages/`, `src/sdk/`, or `tests/` | Build, tests, contracts, and affected docs |
| Generated or temporary evidence | Existing generated-output location | Reproducible command and no manual edits unless documented |

## Validation

After changing this map or adding taxonomy-related links, run:

```bash
node .harness/scripts/ci/01-validate-docs.mjs
node .harness/scripts/ci/04-check-bilingual-parity.mjs
node .harness/scripts/ci/23-check-orphan-bilingual.mjs
git diff --check
```

Run topology rule coverage and dual-engine parity checks when taxonomy changes affect topology manifests, topology rules, or executable architectural policies.

---
[Back to Vision, Maturity, and Gaps Hub](../README.md)
