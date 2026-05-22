# Local Harness Rules Reference

> **These rules are local to this repository. They are not part of BMAD-METHOD.**
> They were defined on top of the BMAD framework to govern documentation quality,
> diagram standards, and architecture consistency in the progressive monolith context.
>
> **Official BMAD-METHOD source:** [github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
>
> **Bilingual Navigation:** Versión en Español — pendiente

The harness defines 18 binding rules that apply across all agents, all phases, and all document types in this repository. Rules are not suggestions — they are enforced automatically (where tooling allows) and are checked by agents before producing output.

This reference documents each rule with: its intent, the problem it prevents, its trigger condition, a compliance example, and adaptation notes for teams replicating this adoption in their own context.

---

## Rule Enforcement Layers

| Layer | Mechanism | Rules Covered |
| :--- | :--- | :--- |
| **Automated (CI)** | `validate-docs.mjs` script | R-03 (UTF-8), relative links, Mermaid syntax |
| **Agent self-check** | Agents apply rules before output | All R-01 through R-18 |
| **Human review** | PR review against rule table | All R-01 through R-18 |

---

## Rules Table

| ID | Rule Name | Constraint |
| :--- | :--- | :--- |
| R-01 | Bilingual Sync | Spanish and English docs/diagrams must stay 100% in sync |
| R-02 | Context Authority | Always consult the authoritative context source before technical tasks |
| R-03 | UTF-8 Clean | Document outputs must be pure UTF-8; no encoding artifacts |
| R-04 | Label Language | Diagram labels must strictly match document language |
| R-05 | Tech Stack Validation | Validate all technical mentions against the approved tech stack only |
| R-06 | Story Separation | Separate FUNCTIONAL, TECHNICAL, and ENABLER; never mix |
| R-07 | Traceability | When a use case changes, update all diagrams and log the change |
| R-08 | Auth Path Completeness | Auth designs must show both IDP and internal flows explicitly |
| R-09 | Readability | Functional docs use plain language; no technical jargon |
| R-10 | Audit Output Format | Audits output: Document, Location, Issue Type, Severity, Fix |
| R-11 | Execution Order | Dual tasks: PO (functional) first, then Architect (technical) |
| R-12 | Naming Conventions | Enforce naming prefixes and taxonomies before merges |
| R-13 | Functional Structure | Business narrative readable; technical detail in dedicated section |
| R-14 | Runtime Authority | Technical references must cite the authoritative runtime profile |
| R-15 | Multi-Tenancy Layers | App-layer isolation is primary; DB-native enforcement is secondary |
| R-16 | Catalog Contract | Parametric entities must define code, value, description |
| R-17 | Modular Extraction | Shared logic must preserve extraction readiness |
| R-18 | Hybrid API Governance | REST and GraphQL coexistence rules |

---

## Detailed Rule Reference

---

### R-01 — Bilingual Sync

**Constraint:** Spanish and English documents and diagrams must stay 100% in sync.

**Intent:** Prevents knowledge fragmentation in bilingual teams where one language version becomes stale and teams operate from different versions of the truth.

**Problem prevented:** "The ES version says the ADR is Accepted but the EN version still shows it as Proposed" — invisible inconsistency that erodes trust in documentation.

**Trigger condition:** Any time a document is created or modified in one language, the counterpart in the other language must be updated in the same commit or PR.

**Compliance example:**
```
CORRECT: Modifying reference-blueprint.md → also modify reference-blueprint.es.md
         in the same PR with equivalent content changes.

VIOLATION: Merging an EN ADR update without updating the ES counterpart.
```

**Adaptation notes:** If your team is monolingual, R-01 can be scoped to "documentation variants must stay in sync" (e.g., summary vs. full version, internal vs. external). The underlying principle — no variant becomes stale — remains valid.

---

### R-02 — Context Authority

**Constraint:** Always consult the authoritative context source before performing technical tasks.

**Intent:** Prevents agents from operating on stale assumptions about the codebase, stack, or architecture state. The authoritative source is defined per repository (in this repo: the ADR registry + authoritative tech stack profiles).

**Problem prevented:** An agent recommends adding a new library that conflicts with an existing ADR decision — because it did not check the approved stack before suggesting.

**Trigger condition:** Before any agent produces a technical recommendation, it must verify that the recommendation is consistent with the current authoritative sources.

**Compliance example:**
```
CORRECT: @architect checks ADR-0030 (Kong gateway decision) before recommending
         an API routing change.

VIOLATION: @architect recommends AWS API Gateway without checking whether
           ADR-0030 exists and is still active.
```

**Adaptation notes:** Define what "authoritative context" means in your repository. It could be: ADR registry, `DECISIONS.md`, approved tech stack document, or a combination.

---

### R-03 — UTF-8 Clean

**Constraint:** Document outputs must be pure UTF-8 with no encoding artifacts.

**Intent:** Prevents character encoding issues that break harness validation scripts, rendering in documentation portals, and bilingual content processing.

**Problem prevented:** Documents with Windows-1252 characters, BOM markers, or emoji-range symbols (U+2600–U+27BF) that fail CI validation or render incorrectly in some environments.

**Trigger condition:** All new documents and any document modified by an AI agent.

**Automated enforcement:** `validate-docs.mjs` scans all Markdown files and fails on encoding violations.

**Compliance example:**
```
VIOLATION: Using checkmark (U+2713) or cross-mark (U+274C) symbols in code examples.
CORRECT:   Using text equivalents: // CORRECT, // WRONG, OK:, ERROR:
```

**Adaptation notes:** If your team uses a different documentation validation tool, map this rule to whatever encoding check your CI performs. The key constraint is: AI agents must not introduce non-UTF-8 characters that break downstream tooling.

---

### R-04 — Label Language

**Constraint:** Diagram labels must strictly match the language of the document containing them.

**Intent:** Prevents mixed-language diagrams that are neither fully accessible to Spanish readers nor to English readers.

**Problem prevented:** A Spanish document containing a Mermaid diagram with English node labels — readers must context-switch mid-document.

**Trigger condition:** Any diagram created or modified in a document of a specific language.

**Exemption:** Technical code identifiers used as diagram labels (interface names, event names, class names, ADR IDs) remain in English in all documents. Example: `IEventBusPort`, `UserRegisteredEvent`, `ADR-0015`. These are code identifiers, not natural language — translating them would break traceability.

**Compliance example:**
```
Spanish document — CORRECT:
  graph LR
    A[Servicio de Autenticación] --> B[Base de Datos]

Spanish document — VIOLATION:
  graph LR
    A[Authentication Service] --> B[Database]

Spanish document — EXEMPT (code identifier):
  graph LR
    A[IEventBusPort] --> B[RabbitMQAdapter]
```

---

### R-05 — Tech Stack Validation

**Constraint:** All technical mentions must be validated against the approved tech stack before inclusion.

**Intent:** Prevents documentation and design proposals from drifting away from the organization's approved technology choices, creating phantom architectures that nobody will actually implement.

**Problem prevented:** An ADR draft recommends Kafka when the approved event bus for the current phase is RabbitMQ (with Kafka reserved for Phase 3+).

**Trigger condition:** Any document that names a specific technology, library, or framework.

**Compliance example:**
```
CORRECT: @architect references RabbitMQ for Phase 2 event bus, consistent with ADR-0015.
VIOLATION: @architect recommends Kafka for a Phase 1 implementation without an
           overriding ADR.
```

---

### R-06 — Story Separation

**Constraint:** Functional, Technical, and Enabler stories must be kept separate. Never mix business narrative with implementation detail.

**Intent:** Preserves readability for non-technical stakeholders (PO, BA, business) while ensuring technical depth is fully documented — without making one group wade through the other group's content.

**Problem prevented:** A user story that reads "As a user I want to login so that... using JWT RS256 with 15-minute expiry stored in HttpOnly cookies via the auth schema in PostgreSQL" — incomprehensible to business, insufficient for engineering.

**Trigger condition:** Any user story, functional specification, or PRD section creation or review.

**Structure:**
```markdown
# STORY-001: User Login

## Business Narrative
As a [user], I want to [action] so that [business value].

### Acceptance Criteria
- Scenario 1: [Given/When/Then in business terms]

## Technical Requirements
- Auth method: JWT RS256, 15-minute expiry
- Storage: HttpOnly cookie, Secure flag, SameSite=Strict
- Schema: auth.users table, bcrypt hash comparison
```

---

### R-07 — Traceability

**Constraint:** When a use case changes, update all relevant diagrams and log the change with: Document, Type, Change description, Use Case ID.

**Intent:** Prevents diagram drift — the state where code, documentation, and diagrams diverge and nobody knows which is current.

**Trigger condition:** Any modification to a use case, user story, or functional requirement.

**Compliance example:**
```
Change log entry:
| Document | Type | Change | UC ID |
|---|---|---|---|
| reference-blueprint.md | C4 Container | Added RabbitMQ to Phase 2 diagram | UC-AUTH-003 |
```

---

### R-08 — Auth Path Completeness

**Constraint:** Authentication designs must explicitly show both IDP (external identity provider) and Internal (credential-based) flows.

**Intent:** Prevents incomplete security designs that only account for one auth path, leaving the other undocumented and potentially unprotected.

**Trigger condition:** Any document or diagram that describes authentication or authorization flows.

**Compliance example:**
```
CORRECT: Auth diagram shows:
  - External IDP flow: OAuth2/OIDC → token exchange → JWT issuance
  - Internal flow: email+password → bcrypt comparison → JWT issuance
  Both paths have explicit security annotations.

VIOLATION: Auth diagram only shows the OAuth2 path, leaving internal
           credential flow undocumented.
```

---

### R-09 — Readability

**Constraint:** Functional documents use plain language. No technical jargon in business-facing sections.

**Intent:** Documents that business stakeholders cannot read are not functional documents — they are technical documents mislabeled. R-09 enforces the separation that R-06 defines.

**Trigger condition:** Any functional story, product brief, PRD, or requirements document review.

**Test:** A Product Owner with no engineering background should be able to read the business narrative and acceptance criteria and understand what the feature does, who it serves, and what success looks like.

---

### R-10 — Audit Output Format

**Constraint:** Audit outputs must follow the structured format: Document | Location | Issue Type | Severity | Recommended Fix.

**Intent:** Consistent audit output enables systematic remediation tracking and prevents vague feedback that cannot be acted upon.

**Trigger condition:** Any agent performing a documentation or code audit.

**Format:**
```
| Document | Location | Issue Type | Severity | Recommended Fix |
|---|---|---|---|---|
| reference-blueprint.md | Section 5, Risk Table | Formatting — broken table | Medium | Collapse extra pipe into Description column |
```

**Severity levels:** Critical, High, Medium, Low, Info

---

### R-11 — Execution Order

**Constraint:** For dual-perspective tasks (functional + technical), execute PO review first, then Architect review. No parallel execution of dependent reviews.

**Intent:** The Architect's technical review is only meaningful after the functional requirements are confirmed correct. Parallel execution produces conflicting outputs that must be reconciled.

**Trigger condition:** Any task that requires both functional validation and technical design review.

**Compliance example:**
```
CORRECT:
  1. @po reviews story → approves business narrative and acceptance criteria
  2. @architect reviews story → validates technical requirements section

VIOLATION:
  @po and @architect review simultaneously → @architect may design against
  requirements that @po subsequently changes.
```

---

### R-12 — Naming Conventions

**Constraint:** Naming prefixes and taxonomies must be strictly enforced before merges.

**Intent:** Consistent naming is the foundation of repository navigability and automated tooling. Drift in naming conventions breaks glob patterns, CI scripts, and cross-reference links.

**Trigger condition:** Any new file, directory, ADR, or code module creation.

**Key conventions in this repository:**
- Directories and base files: `kebab-case`
- ADRs: `[4-digit-ID]-[descriptive-title].md` (e.g., `0015-event-driven-architecture.md`)
- ES counterparts: same name with `.es.md` suffix or `-es` directory suffix
- App libraries: `app-*` prefix for deployables, `lib-*` for shared libraries

---

### R-13 — Functional Structure

**Constraint:** Functional stories and equivalent artifacts must keep business narrative readable and isolate technical detail in a dedicated Technical Requirements section.

**Intent:** Operationalizes R-06 and R-09 into a concrete structural requirement. It is not enough to separate concerns conceptually — the document structure must physically enforce the separation.

**Trigger condition:** Creation or review of any user story, functional specification, or requirements artifact.

---

### R-14 — Runtime Authority

**Constraint:** Technical references must cite the authoritative runtime profile and stay aligned with the actual target stack.

**Intent:** Prevents cross-runtime contamination — a Node.js document referencing .NET patterns, or a document specifying Entity Framework in a TypeScript context.

**Trigger condition:** Any technical document that specifies implementation details, technology choices, or code patterns.

**Compliance example:**
```
CORRECT: Node.js ADR references authoritative-tech-stack-nodejs.md and uses
         TypeORM, NestJS, and Jest — all in the approved Node.js profile.

VIOLATION: Node.js ADR recommends Dapper (a .NET library) for data access.
```

---

### R-15 — Multi-Tenancy Layers

**Constraint:** Multi-tenancy standards must define application-layer isolation as primary and database-native enforcement as secondary failsafe. The order must never be reversed.

**Intent:** Application-layer filtering catches tenant context errors before they reach the database. Database-native RLS is a second line of defense — it must never be the only line of defense.

**Trigger condition:** Any document or design that addresses multi-tenancy, tenant isolation, or data access patterns.

**Compliance example:**
```
CORRECT: "Tenant context is injected at the application layer via TenantContext
service. PostgreSQL RLS policies provide a secondary enforcement layer."

VIOLATION: "Tenant isolation is handled exclusively by RLS policies."
           (removes application-layer visibility and makes debugging opaque)
```

---

### R-16 — Catalog Contract

**Constraint:** Parametric and configuration entities must define `code`, `value`, and `description` fields with traceability, uniqueness, auditability, and extensibility expectations.

**Intent:** Configuration catalogs without a consistent contract become unmaintainable. The three-field minimum ensures every catalog entry is identifiable (`code`), human-readable (`value`), and documented (`description`).

**Trigger condition:** Design or review of any parametric catalog, lookup table, or configuration entity.

**Minimum schema:**
```typescript
interface CatalogEntry {
  code: string;        // Unique identifier — used in code references
  value: string;       // Human-readable label
  description: string; // Purpose, constraints, valid contexts
}
```

---

### R-17 — Modular Extraction

**Constraint:** Shared logic and module boundaries must preserve extraction readiness for modular monolith to distributed evolution.

**Intent:** The progressive architecture model requires that any module can be extracted to a separate service at a future phase without structural refactoring. Code that violates module boundaries today becomes an extraction blocker tomorrow.

**Trigger condition:** Design or review of shared libraries, cross-module dependencies, or bounded context interfaces.

**Compliance example:**
```
CORRECT: Module A communicates with Module B exclusively through IEventBusPort.
         Extraction of Module B requires only a new adapter — no domain changes.

VIOLATION: Module A directly imports Module B's repository class.
           Extraction of Module B requires refactoring Module A's domain.
```

---

### R-18 — Hybrid API Governance

**Constraint:** If REST and GraphQL coexist, commands stay REST-first and query behavior must remain consistent across both surfaces.

**Intent:** Prevents architectural confusion where mutation semantics are split between REST and GraphQL with no clear convention, making the API unpredictable for consumers.

**Trigger condition:** Any document or design that addresses API endpoints when both REST and GraphQL are active.

**Compliance example:**
```
CORRECT:
  Commands (create, update, delete): REST endpoints exclusively
  Queries: Available via both REST and GraphQL with equivalent results

VIOLATION:
  Create task: GraphQL mutation in some contexts, POST /tasks in others
  (inconsistent command surface)
```

---

## Portable Rules Block

The following is a condensed version of all 18 rules suitable for pasting directly into an `AGENTS.md`, `.cursorrules`, or AI tool system prompt:

```markdown
## Binding Harness Rules

| ID | Rule | Constraint |
|---|---|---|
| R-01 | Bilingual Sync | Spanish and English docs/diagrams must stay 100% in sync |
| R-02 | Context Authority | Consult authoritative sources before technical recommendations |
| R-03 | UTF-8 Clean | Pure UTF-8 only; no encoding artifacts or emoji-range symbols |
| R-04 | Label Language | Diagram labels match document language; code identifiers exempt |
| R-05 | Tech Stack | Validate all tech mentions against approved stack before use |
| R-06 | Story Separation | FUNCTIONAL, TECHNICAL, ENABLER — never mixed |
| R-07 | Traceability | UC change → update diagrams + log: [Doc, Type, Change, UC ID] |
| R-08 | Auth Path | Auth designs show both IDP and internal flows explicitly |
| R-09 | Readability | Functional docs: plain language; no technical jargon |
| R-10 | Audit Format | Audits output: [Document, Location, Issue Type, Severity, Fix] |
| R-11 | Order | Dual tasks: PO (functional) first → Architect (technical) second |
| R-12 | Conventions | Enforce naming prefixes and taxonomies before merges |
| R-13 | Functional Structure | Business narrative readable; technical detail in dedicated section |
| R-14 | Runtime Authority | Cite authoritative runtime profile; stay aligned to target stack |
| R-15 | Multi-Tenancy | App-layer isolation primary; DB-native RLS secondary failsafe |
| R-16 | Catalog Contract | Parametric entities: code + value + description minimum |
| R-17 | Modular Extraction | Module boundaries must preserve future extraction readiness |
| R-18 | Hybrid API | REST commands-first; query behavior consistent across REST+GraphQL |
```

---

[Back to BMAD-METHOD Overview](./README.md)
