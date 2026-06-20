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
| `node .harness/scripts/validate-docs.mjs` | Full documentation validation (links, anchors, encoding, Mermaid) |
| `node .harness/scripts/check-bilingual-parity.mjs` | Verify EN/ES pairs have identical ## and ### header counts |
| `node .harness/scripts/bilingual-coverage.mjs` | Report bilingual coverage (which files lack counterparts) |
| `node .harness/scripts/coverage-dashboard.mjs` | Generate visual HTML/MD coverage report by area |
| `node .harness/scripts/generate-es-skeleton.mjs <file.md>` | Create ES skeleton from EN file (with --dry-run flag) |
| `python ./.bmad-core/scripts/cleanup_markdown_encoding.py` | Sanitize UTF-8 encoding issues |
| `node .harness/scripts/validate-docs.mjs --render-mermaid` | Render Mermaid diagrams to SVG for visual validation |
| `node .harness/scripts/run-wilson-audit.mjs` | Print the prompt to run a deep architectural audit via Wilson (Principal Architect) |

### Pre-commit Hook
The pre-commit hook (`.husky/pre-commit`) runs automatically on every commit:
1. `lint-staged` - staged file linting
2. `validate-docs.mjs` - full documentation validation
3. `check-bilingual-parity.mjs` - bilingual structural validation
4. Orphan bilingual file detection - EN without ES or vice versa

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
