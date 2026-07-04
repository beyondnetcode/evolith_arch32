# BMAD Agents — Evolith Core Coordination

> **Bilingual Navigation:** [Versión en Español](./AGENTS.es.md)

**Purpose:** Master coordination document for BMAD method agents operating on the Evolith Core reference repository. Every agent **must** read this file first to understand repository context, gap governance, topology maturity pipeline, and inter-agent handoff protocols.

---

## 1. Repository Context

Evolith Core is a **corporate progressive-architecture reference**, not a single-product codebase. Key areas:

| Area | Path | Description |
|------|------|-------------|
| Architectural Reference | `reference/architecture/` | Topologies, ADRs, patterns |
| Governance Standards | `reference/governance/standards/` | Gap tracking, topology maturity, rules |
| Validation Harness | `.harness/scripts/` | CI scripts, validators, coverage tools |
| Agent Core | `.bmad-core/` | BMAD agent definitions, workflows, tooling |

**Critical constraint:** This is a **documentation-governance repository**, not an application codebase. The primary deliverables are standards documents, ADRs, topology manifests, executable contracts (`.rules.json`, `.rego`), and validation scripts.

---

## 2. Governance Gap Lifecycle (`GT-*`)

Gaps are tracked in three canonical files:

| File | Purpose |
|------|---------|
| `reference/core/control-center/gaps/gap-tracking.md` | Single table — status, criticality, complexity |
| `reference/core/control-center/gaps/gap-reference-catalog.md` | Detailed definitions — purpose, evidence, done-when criteria |
| `reference/core/control-center/evidence/gap-closure-evidence.json` | Machine-readable closure records with commit SHA, dated evidence |

### Governance Gap Lifecycle

Every `GT-*` gap follows a four-stage lifecycle:

```
candidate → evaluated → accepted → executable
```

| Stage | Gate | Agent Owner |
|-------|------|-------------|
| **candidate** | Problem statement and evidence documented in catalog | Analyst |
| **evaluated** | Done-when criteria defined, complexity assigned, Native/OPA scope assessed | Architect |
| **accepted** | Prioritized, scheduled, assigned to a sprint | PM + SM |
| **executable** | All done-when criteria satisfied, closure evidence recorded | Dev + QA + DevOps |

### Dual-Engine Parity (R-25)

Every architectural rule added or modified **must** have:
1. Native TypeScript evaluator rule (`.rules.json` or equivalent)
2. OPA `.rego` policy with exact same rule ID

The coverage scanner (`generate-rule-coverage.mjs`) reports drift between engines.

### Gap Closure Recording (R-26)

A gap is `DONE` only when:
- All closure criteria satisfied
- Closure record in `gap-closure-evidence.json` with real commit SHA
- Dated evidence artifacts
- Reproducible validation commands
- Explicit dependency disposition

---

## 3. Topology Maturity Pipeline

```
draft → candidate → accepted
```

Accepted topologies must provide (R-27):
- Bilingual adoption/operations/evolution guidance
- Accepted ADRs
- Native ruleset + OPA policy artifacts
- Shared control-plane exposure
- Reproducible tests at Modular Monolith baseline maturity

---

## 4. Agent Handoff Protocol

### Invocation Order

For governance gap work:

```
Analyst → PM → Architect → SM → Dev → QA → DevOps
                      ↓
                   Docs (parallel, all stages)
```

### Cross-Cutting Agents

| Agent | Participates In | Role |
|-------|----------------|------|
| **Orchestrator** | Front door | Harness Orchestrator — routes raw user requests to the appropriate agent or capability via `manifest.yaml` |
| **Docs** | All stages | Bilingual parity gate, release orchestration |
| **QA** | executable stage | QA Lead — aggregates the role-specialized QA suite, OPA differential gate |
| **DevOps** | executable stage | CI pipeline, coverage dashboards |

### QA Suite (role-specialized)

The **QA** agent is the lead for a role-decomposed quality gate
(`.bmad-core/workflows/qa-suite.yaml`). Each specialist owns a lens and a set of
real validation scripts; the Lead aggregates and blocks merge on any failure.
This codifies the full quality gate as a runnable, role-split process — the
operational half of the **GT-330** bus-factor mitigation.

| Specialist | Lens | Gate |
|-----------|------|------|
| **qa-contracts** | Native↔OPA parity + contracts | `27/28/29` OPA + `10/26/30` |
| **qa-security** | OWASP / ABAC fail-closed / shell-inj / SSRF | security specs + `13-agentic-code-review` |
| **qa-e2e** | governance-flow E2E + cross-surface | `test:e2e` + `20/24` |
| **qa-unit** | unit + integration coverage | `test:cov` across 8 workspaces |
| **qa-docs** | bilingual parity + doc/governance integrity | `04/01/11/08/09/23/07` |

Run via the engine: each specialist step carries its `validationScripts`; the
`qa-aggregate` step (`agent: qa`) depends on all five.

### Required Artifacts Per Stage

| Stage | Input Artifact | Output Artifact |
|-------|---------------|-----------------|
| candidate | User request | `gap-reference-catalog.md` entry |
| evaluated | Catalog entry | Complexity assessment, scope boundary |
| accepted | Assessed entry | Sprint backlog item, priority assignment |
| executable | Backlog item | Closure evidence, commit SHA, validation pass |

---

## 5. Active Gaps

| ID | Title | Status |
|----|-------|--------|
| GT-152 | External Knowledge Contract and Source Registry Schema | `DONE` |
| GT-153 | Knowledge Lifecycle Governance by Winston | `DONE` |
| GT-154 | RAG Projection and Native/OPA Parity for External Knowledge | `DONE` |

All three P0 knowledge gaps are closed. See the [Gap Tracking Board](../reference/core/control-center/gaps/gap-tracking.md) for current status of all GT-* gaps.

---

## 6. Complete Script Inventory

All scripts live under `.harness/scripts/`. Every agent must know the full inventory to self-improve.

### 6.1 CI Pipeline (numbered, `ci/` subdirectory)

| Script | Purpose | Validate/Enforce |
|--------|---------|------------------|
| `ci/01-validate-docs.mjs` | Full doc validation (links, anchors, Mermaid, UTF-8, CRLF, emojis) | Internal links resolve, anchors exist, Mermaid valid, UTF-8 clean, no CRLF, no emoji symbols |
| `ci/02-optimize-repo.mjs` | Cleanup — deletes unauthorized root files | Root-level whitelist enforcement |
| `ci/03-validate-root-cleanliness.mjs` | Root directory whitelist gate | Only whitelisted files at root; denies `topologies/` |
| `ci/04-check-bilingual-parity.mjs` | Structural parity EN/ES pairs | Every `.es.md` has same `##`/`###` count as `.md` |
| `ci/23-check-orphan-bilingual.mjs` | EN files without ES counterparts | Every `.md` under `reference/` must have `.es.md` sibling |
| `ci/06-impact-analysis-synchronizer.mjs` | Change detection + cross-zone sync | Classifies files into 8 categories; syncs impacted zones |
| `ci/07-generate-inventories.mjs` | Generates `inventory-summary.md` EN/ES | ADR/ruleset/schema counts |
| `ci/08-validate-tracking.mjs` | Validates gap-tracking tables, statuses, closure evidence | EN/ES row consistency; DONE gaps must have closure records |
| `ci/09-reconcile-maturity.mjs` | Reconciles maturity evidence vs gap board | PASS/BLOCKED/RESOLVED checks; BLOCKED must map to open gap |
| `ci/10-validate-contract-conformance.mjs` | Validates evolith-machine-contracts.json + consumer conformance | SemVer contract, SHA256 hashes, producer match |
| `ci/11-validate-product-docs.mjs` | Validates shipped product READMEs for drift/placeholders | No TBD, placeholder, stale beta versions |
| `ci/12-validate-bmad-signatures.mjs` | Validates BMAD agent signatures in core ADRs | Every ADR must have Agent Signature |
| `ci/13-agentic-code-review.mjs` | Agentic code review via MCP | Redacts diff, invokes LLM, validates structured result |
| `ci/14-rag-index-sync.mjs` | RAG knowledge index delta-sync | Detects changed `.md` files, chunks at H2, embeds + upserts |
| `ci/25-operational-drift-audit.mjs` | Scans CI scripts and topology manifests for false success, unbounded calls | DRIFT-FALSE-SUCCESS, DRIFT-UNBOUNDED-CALL detection |
| `ci/26-validate-topology-rule-coverage.mjs` | Thin gate for Native/OPA rule coverage | Delegates to `generate-rule-coverage.mjs` |
| `ci/27-opa-parity-gate.mjs` | Full Native/OPA semantic parity gate with WASM | Evaluates WASM vs Native fixtures; fails on drift |
| `ci/28-test-topology-opa.mjs` | Runs OPA `.test.rego` for each accepted topology | Every topology must have `.test.rego`; suite not empty |
| `ci/17-validate-knowledge-intake.mjs` | Validates KI-*.yaml intake candidates | YAML parsing, JSON Schema, OPA policy execution |

### 6.2 CI Shared Modules (`ci/` — reusable by all scripts)

| Module | Exports |
|--------|---------|
| `ci/parity-gate.mjs` | `diffDecisions`, `parityReport`, `scopeTopologies` |
| `ci/opa-eval.mjs` | `evaluateWasm`, `normalizeOpaDecisions` |
| `ci/review-input.mjs` | `redactSecrets`, `budgetAndChunk`, `prepareReviewInput` |
| `ci/review-result.mjs` | `parseProviderResponse`, `validateReviewResult` |
| `ci/review-provider.mjs` | `createReviewProvider`, `registerAdapter` |
| `ci/rag-sync.mjs` | `chunkMarkdown`, `syncIndex` |
| `ci/rag-port.mjs` | `createRagAdapter`, `hashEmbed` |
| `ci/drift-audit.mjs` | `auditSource`, `auditTopology`, `summarize` |

### 6.3 Standalone Scripts (root `.harness/scripts/`)

| Script | Purpose |
|--------|---------|
| `validate-topology-manifests.mjs` | Validates topology manifests against JSON schema + artifact existence |
| `doc-health-trend.mjs` | Tracks doc health metrics over time (coverage, complexity, completeness) |
| `bilingual-reciprocity.mjs` | Validates ES links point to ES counterparts and vice versa |
| `adr-lifecycle.mjs` | ADR lifecycle CLI — propose/accept/deprecate/supersede/retire |
| `mcp-smoke.mjs` | MCP server smoke test — sends JSON-RPC requests, writes evidence |
| `sync-project-board.mjs` | Bidirectional sync between gap-tracking.md and GitHub Project |
| `bilingual-cross-ref.mjs` | Validates internal link anchors across all reference/ files |
| `bilingual-terminology-lint.mjs` | Lints ES files for standardized terminology usage |
| `generate-rule-coverage.mjs` | Manifest-driven Native/OPA coverage report |
| `adr-promotion-push.mjs` | Promotes ADR from product repo to corporate repo |
| `translation-memory.mjs` | Learns EN/ES phrase pairs from bilingual files |
| `ci-runner.mjs` | Runs all numbered CI scripts in sequence, fails fast |
| `bilingual-diff.mjs` | Compares EN/ES structural changes needed |
| `generate-es-skeleton.mjs` | Creates `.es.md` skeleton from EN file (header structure) |
| `satellite-sync.mjs` | Syncs corporate standards between satellite repos |
| `generate-bilingual-index.mjs` | Generates auto-index of EN/ES pairs per directory |
| `verify-version-log.mjs` | Verifies DOCUMENTATION_VERSIONS.md entry for docs releases |
| `update-version-log.mjs` | Appends new entry to DOCUMENTATION_VERSIONS.md |
| `verify-git-tag.mjs` | Verifies docs-v* git tag exists at HEAD |
| `bilingual-coverage.mjs` | Reports bilingual coverage stats |
| `generate-product-inventory.mjs` | Generates product-surface inventory from CLI sources |
| `doc-complexity-score.mjs` | Measures doc complexity metrics for all reference/ files |
| `validate-rulesets.mjs` | Validates 5 governance rulesets (CLI, parity, evidence, MCP, observability) |
| `md-table-formatter.mjs` | Formats markdown tables with aligned pipes |
| `coverage-dashboard.mjs` | Generates visual HTML/MD coverage report by area |
| `compile-opa-wasm.mjs` | Downloads pinned OPA binary + compiles `.rego` to `.wasm` |
| `opa-runtime.mjs` | Ensures pinned OPA binary is available |
| `run-winston-audit.mjs` | Prints Winston (Principal Architect) audit prompt |

### 6.4 Agent-Specific Script Map

| Agent | Primary Scripts |
|-------|----------------|
| Analyst | `generate-es-skeleton.mjs`, `ci/01-validate-docs.mjs` |
| PM | `ci/04-check-bilingual-parity.mjs`, `bilingual-coverage.mjs`, `generate-es-skeleton.mjs` |
| Architect | `adr-lifecycle.mjs`, `generate-rule-coverage.mjs`, `ci/26-validate-topology-rule-coverage.mjs`, `validate-topology-manifests.mjs` |
| SM | `doc-health-trend.mjs`, `update-version-log.mjs`, `bilingual-coverage.mjs`, `ci/08-validate-tracking.mjs` |
| Dev | `ci/01-validate-docs.mjs`, `generate-es-skeleton.mjs`, `ci/04-check-bilingual-parity.mjs`, `compile-opa-wasm.mjs`, `generate-rule-coverage.mjs` |
| QA | `ci/04-check-bilingual-parity.mjs`, `ci/01-validate-docs.mjs --render-mermaid`, `bilingual-cross-ref.mjs`, `ci/27-opa-parity-gate.mjs`, `ci/28-test-topology-opa.mjs`, `bilingual-terminology-lint.mjs`, `bilingual-reciprocity.mjs` |
| DevOps | `satellite-sync.mjs`, `coverage-dashboard.mjs`, `verify-version-log.mjs`, `verify-git-tag.mjs`, `adr-promotion-push.mjs`, `ci-runner.mjs`, `ci/02-optimize-repo.mjs`, `ci/03-validate-root-cleanliness.mjs`, `sync-project-board.mjs`, `compile-opa-wasm.mjs` |
| Docs | `adr-lifecycle.mjs`, `update-version-log.mjs`, `doc-health-trend.mjs`, `bilingual-cross-ref.mjs`, `ci/07-generate-inventories.mjs`, `md-table-formatter.mjs`, `generate-bilingual-index.mjs`, `doc-complexity-score.mjs`, `validate-rulesets.mjs` |

---

## 7. Validation Gates

Every change to Evolith Core must pass these gates before merge:

```bash
# 1. Full documentation validation
node .harness/scripts/ci/01-validate-docs.mjs

# 2. Bilingual structural parity
node .harness/scripts/ci/04-check-bilingual-parity.mjs

# 3. Bilingual coverage report
node .harness/scripts/bilingual-coverage.mjs

# 4. Topology rule coverage (when topology artifacts change)
node .harness/scripts/ci/26-validate-topology-rule-coverage.mjs

# 5. UTF-8 encoding cleanup (when encoding issues found)
python .bmad-core/scripts/cleanup_markdown_encoding.py

# 6. OPA parity gate (when Native/OPA artifacts change)
node .harness/scripts/ci/27-opa-parity-gate.mjs

# 7. Gap tracking validation (when gap status changes)
node .harness/scripts/ci/08-validate-tracking.mjs
```

---

## 8. Self-Improvement and Proactive Optimization Mandate

Every BMAD agent has a **duty to improve the system**. This is not optional.

### 8.1 Detection — When to Propose Improvements

Proactively watch for these signals:

| Signal | Action |
|--------|--------|
| A script produces a warning you can silence | Add `--quiet` or `--suppress` flag, open PR |
| Two scripts do overlapping work | Propose merging them into a shared module (see `ci/` shared modules pattern) |
| A script lacks `--help` or has no test file | Add `--help` and/or create `*.test.mjs` |
| A numbered CI script is not wired to any workflow | Write the `.github/workflows/` entry or add documented exemption |
| A global rule has no corresponding validation script | Create the script and wire it to the rule |
| A gap could be closed faster with a new script | Propose the script as part of gap implementation |
| A pattern repeats across 3+ agent definitions | Extract to a shared section or `.bmad-core/` include |
| A script exits with inconsistent codes | Standardize: `0`=pass, `1`=failure, `2`=invalid args |

### 8.2 Creation — How to Build Improvements

1. **Create script** in the appropriate location:
   - Numbered CI gate: `.harness/scripts/ci/<NN>-<purpose>.mjs`
   - Standalone utility: `.harness/scripts/<purpose>.mjs`
   - Test file: `.harness/scripts/<name>.test.mjs`
   - Workflow: `.github/workflows/<name>.yml`

2. **Follow the pattern** of existing scripts:
   - Add `SCRIPT_VERSION` constant at top
   - Accept `--help` / `-h`
   - Exit `0` on success, `1` on failure
   - Log clearly what passed/failed

3. **Register the improvement**:
   - Update `AGENTS.md` section 6 (Script Inventory) with new entry
   - Update your agent's script map
   - If new rule: update `global-rules.md`, implement Native + OPA (R-25)

4. **Bilingual by default**: New scripts must have EN output; if user-facing docs, create ES counterpart.

### 8.3 Proposal Format

When proposing a new script, rule, or optimization, document:

```markdown
## Proposal: <Title>
**Agent:** <Your Name>
**Trigger:** <What signal triggered this>
**Scope:** <Script / Rule / Workflow / Agent definition>
**Rationale:** <Why this matters>
**Implementation:** <Brief technical approach>
**Validation:** <How to verify it works>
```

File the proposal in `.bmad-core/proposals/` (create directory if needed).

---

*See [Global Rules](../.harness/rules/global-rules.md) for binding directives.*
*See [Gap Tracking Board](../reference/core/control-center/gaps/gap-tracking.md) for current status.*
*See [Gap Reference Catalog](../reference/core/control-center/gaps/gap-reference-catalog.md) for gap definitions.*
*See [.harness/scripts/](../.harness/scripts/) for all available scripts.*
