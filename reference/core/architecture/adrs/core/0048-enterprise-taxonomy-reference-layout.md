# ADR-0048: Enterprise Taxonomy Standardization and Reference Layout

## Status
Accepted

## Date
2026-05-15

## Context
As the ecosystem evolves into a Progressive Monolith, the proliferation of nested folders and the lack of strict naming conventions have generated cognitive load for developers and difficulties for the routing of Artificial Intelligence agents (spec-driven AI-DD method).
An immutable policy was required to unify the directory structure, reduce root-level visual noise, separate source code from reference artifacts, and preserve the principle of Single Source of Truth (SSoT) in documentation (Docs-as-Code).

## Decision
It has been decided to adopt and enforce the **Enterprise Taxonomy and Repository Structuring Policy** as a global, immutable, and inheritable standard for this repository and all satellite ecosystems.

The mandatory key rules are:
1. **Minimal Root Layout:** The project root must stay small and navigable. Public entry points live at root; deep documentation lives under `reference/`; executable implementation lives under `src/`.
2. **Reference Corpus:** Architecture, governance, knowledge, operations, and infrastructure artifacts must be grouped under `reference/` using the canonical areas `reference/architecture/`, `reference/governance/`, `reference/knowledge/`, `reference/operations/`, and `reference/infrastructure/`.
3. **Prohibition of Common Folders:** Folders like `utils`, `misc`, or `shared` are not allowed at the global or domain level without a justified business context.
4. **Source Encapsulation:** Executable applications and libraries must remain under `src/`, keeping build paths independent from the documentation corpus.
5. **Naming Conventions:** Strict use of `kebab-case` and prefixes to identify artifact types (`app-`, `lib-`).
6. **Dot-Folders for Tooling:** Technical tools such as AI (`.harness`), automations (`.github`), or engines (`.bmad-core`) must be placed in hidden folders starting with a dot.

## Consequences
### Positive:
* **Improved Developer Experience (DX):** Navigation is radically simplified and guided through the `MASTER_INDEX.md`.
* **Immediate Scalability:** The clear separation in `src` facilitates the future extraction of microservices (Microservice Extraction Readiness).
* **Better AI Interaction:** Agents like Cline/Windsurf/Cursor now have an isolated and optimized "AI Context" (`.harness`) without generating visual noise at the root.

### Negative/Risks:
* **Initial Refactoring:** It implied a major change at the folder level that required rewriting internal hyperlinks throughout the documentation.
* **Learning Curve:** New developers must be trained on the taxonomy policy (located in `reference/governance/standards/repository-taxonomy.md`) before creating new folders.





## Objective and Scope

Historical backfill: Address the architectural tension where as the ecosystem evolves into a Progressive Monolith, the proliferation of nested folders and the lack of strict naming conventions have generated cognitive load for developers and difficulties for the routing of Artificial Intelligence agents (spec-driven AI-DD method), establishing a standard boundary.

## Options Considered

- **Selected:** Enterprise Taxonomy Standardization and Reference Layout
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

None explicitly linked.

---
[Back to ADR Registry](./README.md)

> **Agent Signature:** Architect Agent
