# Global Rules (Context-Optimized)

Binding directives. Zero fluff.

| ID | Rule | Constraint |
|---|---|---|
| **R-01** | Bilingual Sync | Spanish and English docs/diagrams must stay 100% in sync; no finished document may keep placeholder bilingual navigation. |
| **R-02** | Context7 | Always consult `context7` for live architecture limits before technical tasks. |
| **R-03** | UTF-8 Clean | Document outputs must be pure UTF-8; no BOM, CRLF, replacement characters, mojibake, or encoding artifacts allowed. |
| **R-04** | Label Lang | Diagram labels must strictly match document language; code identifiers are exempt. |
| **R-05** | Tech Stack | Validate all technical mentions against the approved tech stack only. |
| **R-06** | Split Stories | Separate FUNCTIONAL, TECHNICAL, and ENABLER. Never mix business with implementation details. |
| **R-07** | Traceability | When a UC changes, update all relevant diagrams and log: [Doc, Type, Change, UC ID]. |
| **R-08** | Auth Path | Authentication designs must explicitly show both IDP and Internal flows. |
| **R-09** | Readability | Functional docs use plain language; no technical jargon. |
| **R-10** | Audit Format | Audits output: [Document, Location, Issue Type, Severity, Recommended Fix]. |
| **R-11** | Order | Dual tasks execute: 1. PO (functional) -> 2. Architect (technical). No parallel execution. |
| **R-12** | Conventions | Strictly enforce naming prefixes, taxonomies, relative links, and Markdown anchors before merges. |
| **R-13** | Functional Structure | Functional stories and equivalent artifacts must keep business narrative readable and isolate technical detail in a dedicated `Technical Requirements` section. |
| **R-14** | Runtime Authority | Technical references must cite the authoritative runtime profile and stay aligned with the actual target stack. |
| **R-15** | Multi-Tenancy Layers | Multi-tenancy standards must define application-layer isolation as primary and database-native enforcement as secondary failsafe. |
| **R-16** | Catalog Contract | Parametric and configuration entities must define `code`, `value`, and `description` with traceability, uniqueness, auditability, and extensibility expectations. |
| **R-17** | Modular Extraction | Shared logic and module boundaries must preserve extraction readiness for modular monolith to distributed evolution. |
| **R-18** | Hybrid API Governance | If REST and GraphQL coexist, commands stay REST-first and query behavior must remain consistent across both surfaces. |

## Mandatory Validation Gates

Before any documentation or agent-rule change is considered complete:

1. Run `node .harness/scripts/validate-docs.mjs`.
2. Run `node .harness/scripts/validate-docs.mjs --render-mermaid` when Mermaid diagrams changed.
3. Correct broken relative links, missing Markdown anchors, malformed Mermaid blocks, invalid bilingual navigation, missing language counterparts, and UTF-8 or line-ending violations before merge.
4. Report any remaining anomaly explicitly if it cannot be fixed in the same change.
