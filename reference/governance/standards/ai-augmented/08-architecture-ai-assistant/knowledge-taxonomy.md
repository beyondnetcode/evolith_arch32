# Evolith Knowledge Taxonomy for AI Consumption

> **Bilingual navigation:** [Español](./knowledge-taxonomy.es.md)  
> **Owner:** Evolith Architecture Board  
> **Status:** Approved

---

## Purpose

This document defines **exactly how each Evolith artifact type must be structured** to be reliably ingested, indexed, retrieved, and reasoned about by AI agents. It is the specification for the knowledge ingestion pipeline.

---

## 1. Artifact Type Registry

```
┌─────────────────────────────────────────────────────────────────┐
│              EVOLITH AI KNOWLEDGE TAXONOMY                      │
├──────────────────────┬───────────────┬───────────────┬──────────┤
│ ARTIFACT TYPE        │ VOLUME        │ PRIORITY      │ PHASE    │
├──────────────────────┼───────────────┼───────────────┼──────────┤
│ ADRs (Core)          │ 56 docs       │  Critical   │ 0        │
│ ADRs (Node.js)       │ 14 docs       │  Critical   │ 0        │
│ ADRs (.NET)          │ 1+ docs       │  Critical   │ 0        │
│ ADRs (Android)       │ n docs        │ 🟠 High       │ 1        │
│ Canonical Patterns   │ 8 docs        │  Critical   │ 0        │
│ Engineering Manifesto│ 1 doc         │  Critical   │ 0        │
│ Naming Conventions   │ 1 doc         │  Critical   │ 0        │
│ Reference Blueprint  │ 1 doc         │  Critical   │ 0        │
│ Architectural Direct.│ 1 doc         │ 🟠 High       │ 0        │
│ Glossary             │ 1 doc         │ 🟠 High       │ 0        │
│ SDLC / DoD           │ 3 docs        │ 🟠 High       │ 1        │
│ Security Standards   │ 2 docs        │ 🟠 High       │ 1        │
│ Testing Standards    │ 3 docs        │ 🟠 High       │ 1        │
│ Observability Stack  │ 4 docs        │ 🟡 Medium     │ 1        │
│ Blueprints           │ 6 docs        │ 🟡 Medium     │ 1        │
│ Governance Policies  │ 5 docs        │ 🟡 Medium     │ 2        │
│ Communication Visuals│ 8 docs        │ 🟡 Medium     │ 2        │
│ UMS Reference Model  │ n docs        │ 🟡 Medium     │ 2        │
└──────────────────────┴───────────────┴───────────────┴──────────┘
```

---

## 2. ADR Schema for AI Ingestion

Every ADR must be parsed into this structured format before vectorization:

```yaml
# ADR AI Ingestion Schema
adr_id: "0002"
title: "Clean Architecture with NestJS"
runtime: ["nodejs", "typescript"]
status: "approved"            # approved | proposed | superseded | deprecated
superseded_by: null           # ADR ID if superseded
phase: ["1", "2", "3"]        # phases where this applies
domain: ["architecture", "hexagonal", "nestjs", "boundaries"]
enforcement: "mandatory"      # mandatory | recommended | optional
board_approved: true

# Chunked sections (each becomes a separate embedding)
sections:
  context:
    text: "..."
    keywords: ["hexagonal", "ports", "adapters", "nestjs"]
    
  decision:
    text: "..."
    summary_one_line: "Use Hexagonal Architecture with NestJS enforced by eslint-plugin-boundaries"
    
  consequences:
    positive: ["Domain isolation", "Testability", "Infrastructure swappability"]
    negative: ["Higher initial setup", "Learning curve for Ports/Adapters"]
    
  constraints:
    hard_blocks:
      - "No infrastructure imports in domain layer"
      - "No framework decorators on domain entities"
    warnings:
      - "Avoid over-abstracting adapters in Phase 1"

# Retrieval triggers (natural language patterns that should retrieve this ADR)
retrieval_triggers:
  - "how do I structure a NestJS project"
  - "hexagonal architecture"
  - "ports and adapters"
  - "can I import TypeORM in my domain"
  - "eslint boundaries"
  - "clean architecture"
```

---

## 3. Canonical Pattern Schema

```yaml
pattern_id: "CP-04"
title: "Multi-Tenant RLS Repository"
runtime: ["dotnet", "csharp"]
adr_references: ["0010", "0044", "0031"]
phase: ["1", "2"]
complexity: "medium"

description: "Repository implementation with automatic tenant isolation via RLS"

structure:
  port: "IUserRepository"
  adapter: "SqlUserRepository"  
  infrastructure_deps: ["EFCore", "SqlServer"]
  domain_deps: []               # MUST be empty — domain knows nothing

code_template: |
  public class SqlUserRepository : IUserRepository {
    // ... template here
  }

ai_instruction: |
  When a developer asks to create a repository for a multi-tenant entity:
  1. Generate the Port interface in the domain layer (no EF Core imports)
  2. Generate the Adapter in infrastructure layer with EF Core
  3. Include TenantContext injection via SESSION_CONTEXT
  4. Cite ADR-0010 and ADR-0044
  5. Remind about the optional native RLS activation (INFRA_NATIVE vs APP_AGNOSTIC)
```

---

## 4. Engineering Standard Rules Format

Rules from the Engineering Manifesto are stored as structured enforcement items:

```yaml
rule_id: "ENG-001"
source: "Engineering Manifesto §1"
category: "SOLID"
sub_category: "Single Responsibility"
severity: "error"             # error | warning | suggestion
enforcement: "automated"      # automated | human-review | advisory

description: "A class must have a single reason to change"

detection_pattern:
  type: "heuristic"
  signals:
    - "class has >3 public methods with unrelated concerns"
    - "class mixes HTTP handling with business logic"
    - "class contains both database operations and domain validation"

ai_response_template: |
  "This class appears to have multiple responsibilities: [DETECTED_CONCERNS].
  Per the Evolith Engineering Manifesto §1 (Single Responsibility Principle),
  split into: [SUGGESTED_SPLIT]. See Engineering Manifesto for guidance."

auto_fix: false
requires_adr: false
```

---

## 5. Naming Convention Index

Naming rules are stored as lookup tables enabling real-time validation:

```yaml
# Excerpt from naming conventions AI index
naming_rules:
  
  - artifact: "domain_entity"
    runtime: "csharp"
    rule: "PascalCase noun, no suffix"
    examples_correct: ["User", "Organization", "AuthorizationTemplate"]
    examples_wrong: ["UserEntity", "UserDTO", "user_model"]
    adr_ref: "ADR-0056"
    
  - artifact: "repository_port"
    runtime: "csharp"
    rule: "I + PascalCase + Repository"
    examples_correct: ["IUserRepository", "IOrganizationRepository"]
    examples_wrong: ["UserRepo", "UserRepositoryInterface"]
    adr_ref: "ADR-0056"
    
  - artifact: "use_case"
    runtime: "csharp"
    rule: "PascalCase verb phrase + UseCase or Handler"
    examples_correct: ["CreateUserUseCase", "AssignTemplateHandler"]
    examples_wrong: ["UserService", "UserManager", "createUser"]
    adr_ref: "ADR-0056"
    
  - artifact: "domain_event"
    runtime: ["nodejs", "csharp"]
    rule: "PascalCase past tense noun phrase + Event"
    examples_correct: ["UserCreatedEvent", "TemplateAssignedEvent"]
    examples_wrong: ["OnUserCreated", "UserCreate", "user_created"]
    adr_ref: "ADR-0056"
```

---

## 6. Governance Policy Exposure

Policies are stored as decision trees for agent routing:

```yaml
policy_id: "GOV-001"
title: "New Technology Adoption"
trigger: "developer or AI proposes a library/tool not in approved catalog"

decision_tree:
  - condition: "tool is in approved-tools.md"
    action: "approve_and_suggest_usage_pattern"
    
  - condition: "tool is similar to an approved tool"
    action: "redirect_to_approved_alternative"
    message: "Use [APPROVED_TOOL] instead. See approved-tools.md."
    
  - condition: "tool is not listed and is a dev dependency only"
    action: "warn_and_flag_for_review"
    message: "This tool requires ADR documentation before adoption."
    
  - condition: "tool is not listed and is a runtime dependency"
    action: "block"
    message: "Runtime dependencies require Architecture Board ADR approval.
              Submit ADR proposal to reference/architecture/adrs/[runtime]/
              before proceeding."
```

---

## 7. SDLC and Definition of Done Format

```yaml
dod_id: "DOD-PHASE1"
phase: 1
name: "Phase 1 — Modular Monolith Definition of Done"

checklist_items:
  
  - id: "DOD-P1-001"
    category: "architecture"
    description: "Hexagonal Architecture ports defined for all external dependencies"
    mandatory: true
    ai_can_validate: true
    validation_method: "check for IPort interfaces in domain layer"
    
  - id: "DOD-P1-002"
    category: "testing"
    description: "Unit test coverage ≥70% for new code"
    mandatory: true
    ai_can_validate: true
    validation_method: "coverage report analysis"
    
  - id: "DOD-P1-003"
    category: "observability"
    description: "OTel span added to all public use cases"
    mandatory: true
    ai_can_validate: true
    validation_method: "detect OpenTelemetry.StartActivity in use case methods"
    
  - id: "DOD-P1-004"
    category: "naming"
    description: "All identifiers follow ADR-0056 naming conventions"
    mandatory: true
    ai_can_validate: true
    validation_method: "naming rules lookup against artifact type"
    
  - id: "DOD-P1-005"
    category: "documentation"
    description: "ADR cited for any new architectural decision"
    mandatory: true
    ai_can_validate: false    # Requires architect judgment
    validation_method: "human architect review"
```

---

## 8. Machine-Readable Export Structure

The complete Evolith knowledge base is exported in this structure for AI ingestion pipelines:

```
evolith-ai-knowledge/
├── index.json                    ← Master catalog of all chunks with metadata
├── adrs/
│   ├── core/
│   │   ├── adr-0001.json         ← Structured ADR schema
│   │   ├── adr-0002.json
│   │   └── ...
│   ├── nodejs/
│   └── dotnet/
├── patterns/
│   ├── cp-01.json
│   └── ...
├── standards/
│   ├── engineering-manifesto-rules.json
│   ├── naming-conventions.json
│   ├── security-rules.json
│   └── testing-standards.json
├── governance/
│   ├── policies.json
│   └── dod-checklists.json
├── glossary.json                 ← Ubiquitous Language for validation
└── version.json                  ← { "evolith_version": "1.x", "snapshot_date": "..." }
```

---

## 9. Freshness and Sync Policy

| Trigger | Action |
|---|---|
| New ADR merged to main | CI pipeline re-ingests ADR → updates vector store |
| ADR status changes to `superseded` | Old chunks marked deprecated in metadata; retrieval blocked |
| Engineering Manifesto updated | Full re-ingestion of standards store |
| Evolith version tag published | Full knowledge base snapshot created + version.json updated |
| Child repo adopts new Evolith version | Child repo switches to new snapshot in harness config |

---

## 10. External Knowledge Candidate

External material is a candidate input, never an authoritative Evolith rule. It is stored as an original synthesis with provenance and a promotion state; the canonical control design is [V-12 — External Knowledge Intake](./visuals/v12-external-knowledge-intake.md).

```yaml
knowledge_id: "KI-FOWLER-OUTBOX-001"
source_class: "public-article" # public-article | book | official-docs
source_locator: "author, work, edition or URL, section"
rights_status: "citation-and-synthesis-only"
trust_level: "primary"
promotion_status: "candidate" # candidate | evaluated | accepted | executable | retired
topologies: ["modular-monolith", "microservices"]
owner: "wilson"
```

Only `accepted` knowledge may be retrieved as guidance. Only `executable` knowledge may claim an Evolith enforcement mapping, which requires an approved ADR plus Native rule, OPA policy, and fixtures where the pattern is enforceable.

---

*Part of the [AI Architecture Assistant Strategy](./ai-architecture-assistant-strategy.md)*
