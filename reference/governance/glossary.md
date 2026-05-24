# Documentation Glossary

> Bilingual navigation: [Español](./glossary.es.md)

This glossary stabilizes terminology used across the repository. Use these terms consistently in README files, ADRs, standards, and applied-reference documentation.

| Term | Meaning | Usage rule |
|---|---|---|
| Progressive architecture reference | The documentation vision: start simple, modularize deliberately, distribute only when justified. | Use for the purpose of the repository. |
| arc32 | Supporting toolset and repository implementation. | Do not use as the product vision. |
| BMAD-METHOD | Spec-driven AI-DD method that may support artifact generation and validation. | Do not use as the name or acronym of the documentation. |
| Reference corpus | The documentation body under `reference/`. | Use for architecture, governance, knowledge, operations, and infrastructure docs. |
| Blueprint | A canonical architecture model or structural guide. | Use for stable architectural models, not temporary notes. |
| ADR | Architectural Decision Record. | Use for decisions with context, decision, and consequences. |
| Standard | Enforceable rule or policy. | Use when compliance is expected. |
| Guide | Practical instruction for a task or role. | Use when the document is explanatory or procedural. |
| UMS applied reference model | External open-source enterprise product used as official executable evidence for this corpus. | Link to UMS for source and setup; do not generalize product-specific choices as universal rules. |
| Runtime profile | Technology-specific recommendation for Node.js, .NET, Android, or another runtime. | Keep separate from runtime-agnostic rules. |
| Canonical pattern | Runtime-specific implementation pattern mapped to accepted ADRs. | Treat as conditioned reusable guidance, not as a runtime-agnostic standard. |

---
[Back to Reference Hub](../README.md)
