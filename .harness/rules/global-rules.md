# Global Rules (Context-Optimized)

Binding directives. Zero fluff.

| ID | Rule | Constraint |
|---|---|---|
| **R-01** | Bilingual Sync | Spanish and English docs/diagrams must stay 100% in sync; no finished document may keep placeholder bilingual navigation. External framework references (BMAD-METHOD) are exempt from bilingual requirements. |
| **R-19** | Bilingual Naming | Use `.es.md` suffix for individual files; use `-es/` subdirectory for grouped content. Never mix patterns within the same area. All pairs must maintain structural parity. |
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
| **R-12** | Conventions | Strictly enforce naming prefixes, taxonomies, relative links, and Markdown anchors before merges; root-level content directories require accepted ADR authority and `/topologies/` is prohibited unless a superseding ADR changes root taxonomy. |
| **R-13** | Functional Structure | Functional stories and equivalent artifacts must keep business narrative readable and isolate technical detail in a dedicated `Technical Requirements` section. |
| **R-14** | Runtime Authority | Technical references must cite the authoritative runtime profile and stay aligned with the actual target stack. |
| **R-15** | Multi-Tenancy Layers | Multi-tenancy standards must define application-layer isolation as primary and database-native enforcement as secondary failsafe. |
| **R-16** | Catalog Contract | Parametric and configuration entities must define `code`, `value`, and `description` with traceability, uniqueness, auditability, and extensibility expectations. |
| **R-17** | Modular Extraction | Shared logic and module boundaries must preserve extraction readiness for modular monolith to distributed evolution. |
| **R-18** | Hybrid API Governance | If REST and GraphQL coexist, commands stay REST-first and query behavior must remain consistent across both surfaces. |
| **R-20** | Satellite Upstream Promotion | All satellite projects must push discovered architectural patterns upstream to EVOLITH. The EVOLITH CLI must assist in scaffolding and enforcing these common behaviors across all children. |
| **R-21** | Cross-Cutting Shells | Infrastructural logic (workflows, config, integration) must be encapsulated in shared Shells. Do not pollute Bounded Contexts. |
| **R-22** | Small Aggregates | Use UUID lists (`List<UUID>`) for massive 1:N relations to preserve O(1) performance and prevent optimistic concurrency deadlocks. |
| **R-23** | Dynamic Domain Gates | Dynamic tenant workflows must be secured at the domain level via an internal `RequirementChecklist` evaluated before state transitions. |
| **R-24** | Diagram Ergonomics | Complex Domain-Driven Design (DDD) models must not be rendered as a single monolithic diagram. They must be split into at least three views (Business Core, Workflow/Audit, and Cross-Cutting Shells) with a visual legend. |
| **R-25** | Dual-Engine Parity | Any addition or modification to an architectural rule must be implemented in both the Native TypeScript Evaluator and its corresponding OPA `.rego` file. The CLI must guarantee seamless switching between both engines. |
| **R-26** | Semantic Gap Closure | A `GT-*` gap may be `DONE` only when every closure criterion is satisfied and the canonical closure registry records a real commit, dated evidence artifacts, reproducible validation commands, and explicit dependency disposition. Historical `MT-*` gaps are exempt unless explicitly registered. |
| **R-27** | Topology Maturity Parity | An `accepted` topology MUST provide bilingual adoption/operations/evolution guidance, accepted ADRs, existing Native ruleset and OPA policy artifacts, shared control-plane exposure, and reproducible tests equivalent in maturity to the Modular Monolith baseline. |

## Mandatory Validation Gates

Before any documentation or agent-rule change is considered complete:

1. Run `node .harness/scripts/ci/01-validate-docs.mjs`.
2. Run `node .harness/scripts/ci/01-validate-docs.mjs --render-mermaid` when Mermaid diagrams changed.
3. Correct broken relative links, missing Markdown anchors, malformed Mermaid blocks, invalid bilingual navigation, missing language counterparts, and UTF-8 or line-ending violations before merge.
4. Report any remaining anomaly explicitly if it cannot be fixed in the same change.
