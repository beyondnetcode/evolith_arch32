# Documentation Glossary

> Bilingual navigation: [Español](./glossary.es.md)

This glossary stabilizes terminology used across the repository. Use these terms consistently in README files, ADRs, standards, and applied-reference documentation.

| Term | Meaning | Usage rule |
|---|---|---|
| Evolith vision | The documentation vision: start simple, modularize deliberately, distribute only when justified. | Use for the purpose and guiding principle of the Evolith platform. |
| Evolith | The enterprise-grade progressive architecture platform — the authoritative source of decisions, standards, and patterns for all product repositories in the organization. | Use as the official brand name of this architecture corpus in all documentation, headings, and footers. |
| BMAD-METHOD | Spec-driven AI-DD method that may support artifact generation and validation. | Do not use as the name or acronym of the documentation. |
| Reference corpus | The documentation body under `reference/`. | Use for architecture, governance, knowledge, operations, and infrastructure docs. |
| Blueprint | A **detailed scheme that serves as a guide to develop a project, process, or system** ([ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.md)). Composed and validated from blocks and references across concerns (frontend, backend, services, mobile, data); Core measures its maturity (how good a guide it is) and derives downstream criteria from it. | Use for the composable, validated development guide, not temporary notes. |
| ADR | Architectural Decision Record. | Use for decisions with context, decision, and consequences. |
| Standard | Enforceable rule or policy. | Use when compliance is expected. |
| Guide | Practical instruction for a task or role. | Use when the document is explanatory or procedural. |
| UMS applied reference model | External open-source enterprise product used as official executable evidence for this corpus. | Link to UMS for source and setup; do not generalize product-specific choices as universal rules. |
| Runtime profile | Technology-specific recommendation for Node.js, .NET, Android, or another runtime. | Keep separate from runtime-agnostic rules. |
| Canonical pattern | Runtime-specific implementation pattern mapped to accepted ADRs. | Treat as conditioned reusable guidance, not as a runtime-agnostic standard. |

---
[Back to Reference Hub](../README.md)
