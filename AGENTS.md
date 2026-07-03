## Project
Open technical reference for products that start simple, mature into modular monoliths, and evolve into distributed services only when justified by product and operations.

This repository defines the architectural baseline, governance standards, harness rules, and reference implementation patterns used by satellite repositories. UMS is the official external executable product reference.

## Build & Run
- Reference docs review: use the root `README.md`, `MASTER_INDEX.md`, and `reference/` tree first.
- Applied product reference: `https://github.com/beyondnetcode/ums`
- UMS setup and run commands: follow the current UMS `README.md`; this repository does not duplicate them.

## Validation Scripts

| Script | Purpose |
|--------|---------|
| `node .harness/scripts/ci/01-validate-docs.mjs` | Full documentation validation (links, anchors, encoding, Mermaid) |
| `node .harness/scripts/ci/suites/bilingual-suite.mjs` | Verify EN/ES document coverage, reciprocity, and structural parity |
| `node .harness/scripts/bilingual-coverage.mjs` | Report bilingual coverage (which files lack counterparts) |
| `node .harness/scripts/coverage-dashboard.mjs` | Generate visual HTML/MD coverage report by area |
| `node .harness/scripts/generate-executive-summary.mjs` | Generate the bilingual executive governance summary from the canonical gap and maturity evidence |
| `node .harness/scripts/generate-executive-summary.mjs --check` | Verify the executive governance summary is current |
| `node .harness/scripts/generate-es-skeleton.mjs <file.md>` | Create ES skeleton from EN file (with --dry-run flag) |
| `python ./.bmad-core/scripts/cleanup_markdown_encoding.py` | Sanitize UTF-8 encoding issues |
| `node .harness/scripts/ci/01-validate-docs.mjs --render-mermaid` | Render Mermaid diagrams to SVG for visual validation |
| `node .harness/scripts/run-evolith-audit.mjs` | Print the Winston architectural audit prompt for LLM context |
| `node .harness/scripts/run-evolith-audit.mjs --bmad` | Print the BMAD Agent Evolution prompt |
| `node .harness/scripts/run-evolith-topology.mjs` | Run topology compliance audit (structural parity across all topologies) |
| `node .harness/scripts/run-evolith-deep.mjs` | Run SDLC Deep Audit — 8-dimensional executable SDLC evaluation (JSON) |
| `node .harness/scripts/run-evolith-deep.mjs --markdown` | SDLC Deep Audit with human-readable Markdown report |
| `node .harness/scripts/run-evolith-intelligent-data-audit.mjs` | Winston intelligent data strength audit — evaluates WS1-WS9 workstream coverage |
| `node .harness/scripts/run-evolith-intelligent-data-audit.mjs --es` | Intelligent data strength audit in Spanish |
| `node .harness/scripts/run-evolith-intelligent-data-audit.mjs --ws1` | Check only specific workstream (WS1-WS9) |
| `node .harness/scripts/run-evolith-intelligent-data-audit.mjs --report` | Output JSON report only |

> **Full taxonomy:** See [`reference/harness/scripts-taxonomy.md`](./reference/harness/scripts-taxonomy.md) for the complete script classification, playbook details, CI hooks, and design rules.
>
> Warning: `run-winston-audit.mjs` is **deprecated** — it still works as a compatibility alias but emits a warning. Use the `run-evolith-*` equivalents.

### Pre-commit Hook
The pre-commit hook (`.husky/pre-commit`) runs automatically on every commit:
1. `generate-executive-summary.mjs` - refreshes the EN/ES executive governance summary
2. `git add` for the generated executive summary pair
3. `ci-runner.mjs` - runs numbered CI validation scripts, including documentation validation, bilingual parity, and stale-summary checks

### Pre-push Hook
The pre-push hook (`.husky/pre-push`) runs automatically before pushing:
1. `02-optimize-repo.mjs` - repository optimization
2. `sync-project-board.mjs` - bidirectional gap tracking synchronization
3. `generate-executive-summary.mjs` - refreshes the executive governance summary and blocks the push if it changed outside the current commit

### Terminology Glossary
See `.harness/scripts/bilingual-terminology-glossary.md` for standardized EN/ES translations of technical terms. When adding new terms, update both versions together.

## Architecture
- Repository role: corporate progressive architecture reference, not a single-product codebase
- Primary styles: simple monolith -> modular monolith -> distributed modules -> microservices
- Runtime profiles: agnostic baseline plus runtime-specific addenda for Node.js, .NET, Android, and related ecosystems
- Persistence guidance: runtime-specific; never assume one database engine without reading the proper authoritative profile
- Key areas:
  - `reference/architecture/`
  - `reference/governance/`
  - `.harness/`
  - `.bmad-core/`
  - `reference/knowledge/demo/` UMS applied-reference boundary and migration record

## Conventions
- Read the agnostic baseline before applying any runtime-specific guidance.
- Treat satellite repository lessons as candidates for promotion into reusable corporate standards.
- Keep standards runtime-agnostic unless the guidance belongs clearly to a runtime-specific profile.
- Functional stories must remain business-readable and isolate technical detail in a `Technical Requirements` section.
- Prefer explicit bounded-context ownership, contract boundaries, and extraction readiness over premature distribution.
- Use relative repository links for internal Markdown references.
- Keep Markdown anchors stable when renaming headings; update all inbound links in the same change.
- **Bilingual Naming Convention:**
  - **Pattern A** (`.es.md` suffix): Use for individual files (README, AGENTS, MASTER_INDEX, single documents).
  - **Pattern B** (`-es/` subdirectory): Use for grouped content with multiple files (ADR collections, Standards sections).
  - Never mix patterns within the same content area. When in doubt, use Pattern A for simplicity.
  - All bilingual pairs must maintain exact structural parity — same filename, same position, same sections.

## Folder Boundaries - `reference/` vs `docs/`

This repository has **two distinct documentation layers** by design:

| Layer | Folder | Owner | Purpose |
| :--- | :--- | :--- | :--- |
| Architectural Reference Corpus | `reference/` | Architecture / Governance | Reusable, normative, cross-product baseline |
| Planning & Implementation Artifacts | `docs/` | BMAD Method / Teams | PRDs, epics, stories, specific product retrospectives |

These two layers do not overlap. Architectural decisions go in `reference/architecture/adrs/`. Product plans go in `docs/planning-artifacts/`. Do not create content in `docs/` that should live in `reference/`, or vice versa.

## Agent Rules
- Read `./.harness/rules/global-rules.md` before responding or editing.
- Use the relevant playbook from `./.harness/playbooks/` for audits, architecture reviews, and repeated engineering tasks.
- For recurring harness or agent improvement work, use `./.harness/playbooks/self-improving-loop.md` and emit or reference a progress-audit record that follows `./.harness/schemas/progress-audit.schema.json`.
- When stack guidance changes materially, update the affected standards, `AGENTS.md`, and runtime-specific authoritative profiles together.
- Multi-tenancy standards must preserve two layers: application-layer filtering as primary, database-native enforcement as secondary failsafe.
- Do not convert a corporate standard into a product-specific document unless the repository area is explicitly product-scoped.
- Mandatory Link Verification: verify all internal links and anchors before completing any documentation task.
- Bilingual Consistency: any update to an English document must have a corresponding Spanish counterpart or an explicit documented exception.
- Diagram Validation: any modified Mermaid block must pass syntax validation; use render validation for material diagram changes.
- Agent Update Quality: any agent persona update must declare scope, inputs, outputs, constraints, handoff, validation checklist, and audit output format.
- Rule Coverage: when adding or changing validation rules, update the reference rule, the global rules table, and the validation script behavior together.
- Dual-Engine Parity: when creating or modifying architectural rules, you MUST implement the logic in BOTH the Native TypeScript evaluator and a corresponding OPA `.rego` file.
- Fail Fast on Docs: if unresolved links, missing references, invalid anchors, invalid diagrams, or language-pair gaps are found, fail the task and report the anomalies rather than assuming completion.
- Canonical Patterns Enforcement:
  - DO NOT assume Active Record. Always recommend and enforce the Data Mapper and Repository patterns to decouple domain logic from persistence.
  - Enforce strict Domain-Driven Design (DDD) isolation boundaries.
  - Recommend Transactional Outbox for cross-service events.

## Harness Orchestrator (Router Agent)

The primary frontend router for the Evolith BMAD ecosystem. All raw user intents should be directed here to minimize token spend and enforce boundaries.

> **See:** [`.harness/agents/router-agent.md`](./.harness/agents/router-agent.md) for the `@orchestrator` persona, inputs, and strict JSON schema output.

## Intake and Discovery Agents (Phases 00 and 01.1)

The agents supporting the Architecture Planning Gate (Phase 00) and the Knowledge-First Discovery subphase (01.1) have been extracted to a dedicated file to optimize context loading.

> **See:** [`.harness/agents/discovery-agents.md`](./.harness/agents/discovery-agents.md) for the full list of agents, scopes, inputs, outputs, and handoffs.

## Documentation Quality Gates
- Internal relative links must resolve from the file location where they appear.
- Markdown anchors must exist in the referenced Markdown target.
- Mermaid blocks must use supported declarations and stable node IDs for edges.
- Bilingual navigation must not remain as a dead placeholder in finished documents.
- UTF-8 output must not include BOM markers, replacement characters, mojibake, or emoji-range symbols.
- CRLF line endings are not allowed in Markdown documentation.

## Out of Bounds
- Do not weaken or remove bilingual governance requirements.
- Do not overwrite runtime-specific profiles with assumptions from another runtime.
- Do not treat UMS product-specific choices as universal architecture without an accepted artifact in this repository.
