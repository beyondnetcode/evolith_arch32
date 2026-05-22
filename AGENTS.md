## Project
Open technical reference for products that start simple, mature into modular monoliths, and evolve into distributed services only when justified by product and operations.

This repository defines the architectural baseline, governance standards, harness rules, and reference implementation patterns used by satellite repositories.

## Build & Run
- Reference docs review: use the root `README.md`, `MASTER_INDEX.md`, and `reference/` tree first.
- Demo sandbox install: `cd src && npm install`
- Demo sandbox run: `cd src && npm run dev`
- Demo infrastructure: `cd src && docker-compose -f ../reference/infrastructure/docker-compose.yml up -d`
- Markdown encoding sanitation: `python ./.bmad-core/scripts/cleanup_markdown_encoding.py`

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
  - `src/` demo sandbox

## Conventions
- Read the agnostic baseline before applying any runtime-specific guidance.
- Treat satellite repository lessons as candidates for promotion into reusable corporate standards.
- Keep standards runtime-agnostic unless the guidance clearly belongs in a runtime-specific profile.
- Functional stories must remain business-readable and isolate technical detail in `Technical Requirements`.
- Prefer explicit bounded-context ownership, contract boundaries, and extraction readiness over premature distribution.

## Agent Rules
- Read `./.harness/rules/global-rules.md` before responding or editing.
- Use the relevant playbook from `./.harness/playbooks/` for audits, architecture reviews, and repeated engineering tasks.
- When stack guidance changes materially, update the affected standards, `AGENTS.md`, and runtime-specific authoritative profiles together.
- Multi-tenancy standards must preserve two layers: application-layer filtering as primary, database-native enforcement as secondary failsafe.
- Do not convert a corporate standard into a product-specific document unless the repository area is explicitly product-scoped.

## Out of Bounds
- Do not weaken or remove bilingual governance requirements.
- Do not overwrite runtime-specific profiles with assumptions from another runtime.
- Do not treat the demo sandbox as the sole source of truth for the corporate architecture.
