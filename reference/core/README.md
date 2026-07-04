# Reference Core

> Public, normative, reusable standards inherited by satellite repositories.

## Structure

| Area | Path | Purpose |
|------|------|---------|
| **Foundations** | `foundations/` | Principles, common rules, contracts, satellite definitions, inheritance model, agent skills |
| **SDLC** | `sdlc/` | Phases, artifacts, standards, gates, maturity, governance, rules, glossary |
| **Architecture** | `architecture/` | Foundational patterns, topologies, ADRs, blueprints, progressive evolution, demos |
| **Control Center** | `control-center/` | Gap tracking, maturity reports, audits, opportunities, evidence, taxonomy |

## Classification Rules

- Only **public, normative, reusable** content belongs here.
- Product-specific documentation goes to `product/`.
- Executable governance code goes to `src/rulesets/` (root).
- Source code goes to `src/apps/`, `src/packages/`, `src/sdk/`.

## Navigation

- [Foundations](foundations/README.md) — What we believe and enforce
- [SDLC](sdlc/README.md) — How we build and deliver
- [Architecture](architecture/README.md) — How we design and evolve
- [Control Center](control-center/README.md) — How we track and improve
