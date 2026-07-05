# Evolith Documentation Taxonomy

> **Bilingual navigation:** [Versión en Español](./documentation-taxonomy.es.md)

**Status:** Active Documentation Standard  
**Owner:** Evolith Architecture Board  
**Last Updated:** 2026-06-10

---

## 1. Purpose

This standard separates universal architecture, SDLC governance, suite strategy, product-specific design, and provider-specific guidance. It prevents product ideas or temporary technology selections from becoming universal Core rules.

---

## 2. Canonical Documentation Domains

| Domain | Question Answered | Canonical Location |
|---|---|---|
| **Core Architecture** | What principles, patterns, contracts, and architectural decisions apply universally? | `reference/core/architecture/` |
| **SDLC Governance** | How are phases, gates, artifacts, evidence, roles, exceptions, and metrics governed? | `reference/core/sdlc/` |
| **Evolith Product Suite** | What products compose Evolith, why do they exist, and how are they positioned? | `product/suite/` |
| **Product-Specific Design** | How does one product implement its responsibilities? | `product/products/<product>/` |
| **Platform and Provider Guidance** | How is a capability implemented with a specific technology or vendor? | `product/infra/<category>/<provider>/` |
| **Operations and Infrastructure** | How are runtime, deployment, support, and infrastructure operated? | Existing `product/operations/` and `product/infra/` |
| **Applied Knowledge** | What evidence and lessons come from satellite implementations? | Existing `product/research/` |

---

## 3. Classification Rules

### Core Architecture

A document belongs to Core Architecture when it remains valid even if Tracker, Jira, Langfuse, Claude, Superset, or another provider disappears.

Typical content:

- architecture principles and patterns;
- canonical contracts and reference models;
- Core ADRs;
- provider abstraction and anti-corruption rules;
- security, isolation, and evidence-integrity principles.

### SDLC Governance

A document belongs to SDLC Governance when it defines how every satellite product moves through phases and gates.

Typical content:

- the five SDLC phases and Phase Gates;
- artifact and evidence requirements;
- Evidence Graph semantics;
- responsibilities, approvals, exceptions, and metrics;
- build-versus-compose requirements.

### Product Suite

A document belongs to Product Suite when it explains Evolith as a portfolio and business proposition.

Typical content:

- product vision and positioning;
- portfolio and ecosystem maps;
- business model and Open-Core strategy;
- suite roadmap;
- investor and executive communication;
- cross-product target architecture.

### Product-Specific Design

A document belongs to a product when it defines that product's domain model, interfaces, UX, persistence, deployment, or implementation decisions.

Examples:

- Tracker Gate Decision Engine;
- Tracker REST and MCP APIs;
- Smart CLI application architecture;
- product-local ADRs and data models.

### Platform or Provider Specific

A document belongs to Platform Guidance when it evaluates or configures a named technology, vendor, or product.

Examples:

- Langfuse adapter design;
- Jira ACL mapping;
- Superset embedding;
- Claude execution profile;
- GitHub, Azure DevOps, Kubernetes, or cloud-specific guidance.

---

## 4. ADR Boundaries

| ADR Type | Scope | Allowed Content |
|---|---|---|
| **Core ADR** | Universal and provider-neutral | Design decisions, patterns, contracts, general constraints, and reusable rules |
| **Product ADR** | One Evolith product | Internal architecture, persistence, APIs, UX architecture, and deployment choices |
| **Platform-Specific ADR** | One provider or platform | Technology selection, adapter implementation, licensing, deployment, and provider-specific risks |

A Core ADR must not select a vendor. It may require a provider-neutral capability contract. Vendor selection belongs to a product or platform-specific ADR.

---

## 5. Dependency Direction

```text
Core Architecture
        ↓
SDLC Governance
        ↓
Product Suite Vision
        ↓
Product-Specific Designs
        ↓
Platform / Provider Implementations
```

Lower levels may conform to higher levels. A product or provider document cannot redefine Core architecture or SDLC governance.

Validated lessons move upward only through Architecture Board review and an explicit change to the authoritative document.

---

## 6. Required Document Metadata

Every strategic or design document must declare:

- `Classification`;
- `Status`;
- `Owner`;
- `Parent` or governing document;
- `Scope`;
- bilingual counterpart;
- whether it is normative, informative, or implementation-specific.

Recommended classification values:

```text
Core Architecture Principle
Core ADR
SDLC Governance Standard
Product Suite Vision
Product Suite Strategy
Product-Specific Design
Product ADR
Platform-Specific Guidance
Platform-Specific ADR
Applied Reference
```

---

## 7. Transitional Migration Rule

During migration, existing paths may remain as compatibility locations. Each transitional document must identify its target domain and link to the canonical hub.

Migration sequence:

1. create the canonical domain hub;
2. classify and index existing documents;
3. update inbound links;
4. create the canonical file path;
5. replace the legacy file with a bilingual relocation notice;
6. validate links and bilingual parity;
7. remove the relocation notice only after an approved deprecation period.

No document may be deleted merely to improve folder appearance if doing so breaks historical links or audit evidence.

---

## 8. Current Classification of New-Vision Documents

| Document | Classification | Target Domain |
|---|---|---|
| Product Vision Master | Product Suite Vision | `product/suite/vision/` |
| Strategic Validation and Composition Framework | Product Suite Strategy | `product/suite/strategy/` |
| Strategic Comparative Landscape | Product Suite Positioning | `product/suite/positioning/` |
| AI-Assisted Validation Workflow | Product Suite Method | `product/suite/methods/` |
| Governed Composition Target Design | Must be split | Suite architecture + Core principles + Tracker design |
| Provider Abstraction and Plugin Model | Core Architecture Principle | `reference/core/foundations/principles/` |
| Tracker Technical Interfaces | Product-Specific Design | `product/products/evolith-tracker/architecture/` |
| Traceability and Evidence Graph | SDLC Governance Standard | `reference/core/sdlc/traceability/` |
| Executive One-Pager | Product Suite Communication | `product/suite/communication/` |

---

## 9. Governance

The Architecture Board owns this taxonomy. New documentation must be classified before approval. Classification disputes are resolved according to the most reusable valid scope: universal rules stay in Core, process rules stay in SDLC Governance, portfolio narratives stay in Product Suite, implementation details stay with the product, and named technologies stay under Platforms.

---

[Back to Reference Hub](./README.md)
