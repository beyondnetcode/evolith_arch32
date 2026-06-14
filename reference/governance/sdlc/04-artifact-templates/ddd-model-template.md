# DDD Model Template

> **Bilingual navigation:** [Versión en Español](./ddd-model-template.es.md)
> **Required Phase:** Phase 2 — Design
> **Primary Audience:** Software Architects, Developers, AI Agents

## 1. Ubiquitous Language
[PLACEHOLDER: Define strict terminology shared between business and technical domains]

## 2. Conceptual Maps and Aggregates (Mermaid)

### 2.0. Visual Legends and Glossary
| Symbol/Stereotype | Meaning |
| :--- | :--- |
| `<<Aggregate Root>>` | Transactional root entity. Governs the persistence and consistency of its internal entities. |
| `<<Entity>>` | Domain object with a unique identity, dependent on its Aggregate Root. |
| `<<Value Object>>` | Immutable object without intrinsic identity. Represents a structural property. |
| `<<Shared Kernel Shell>>` | Cross-cutting module external to the domain, injected by the application/infrastructure layer. |
| `*--` (Solid line) | **Composition**. The child element cannot exist without the parent. |
| `..>` (Dotted line)| **Dependency**. The element interacts with or delegates to another component. |

### 2.1. View 1: Business Core (Aggregates and Entities)
[PLACEHOLDER: Mermaid classDiagram showing ONLY pure aggregates and entities]

### 2.2. View 2: Workflow and Audit Components
[PLACEHOLDER: Mermaid classDiagram showing state transitions, audit controls, and RequirementChecklists]

### 2.3. View 3: Cross-Cutting Infrastructure (Shells)
[PLACEHOLDER: Mermaid classDiagram showing dependencies on TenantConfigShell, WorkflowEngine, and UMS]

## 3. Tactical Design
[PLACEHOLDER: Explain design decisions, Small Aggregates pattern, boundaries, and context mapping]

## 4. Service Topology — Domain-Oriented Microservice Architecture (DOMA)

> **Applies at Phase 3 (F3 microservices).** Products in F1/F2 remain a modular monolith; this section documents how the model decomposes **when** the extraction-readiness criteria are met. Governed by [ADR-0076](../../../architecture/adrs/core/0076-domain-oriented-microservice-architecture.md).

State, for each bounded context above, how it maps to a service topology under DOMA:

- **Domain grouping:** which bounded context(s) form each business domain (the unit of autonomy). One service belongs to exactly one domain.
- **Domain gateway contract:** the stable, versioned contract each domain exposes; intra-domain calls may be direct, cross-domain interaction is asynchronous (events).
- **Data ownership:** confirm no cross-domain joins or shared schemas (schema-per-context).
- **Decomposition guard:** confirm no proposed service boundary splits a bounded context.

[PLACEHOLDER: per-domain table — domain · bounded contexts · gateway contract · owned schema · async events consumed/published]
