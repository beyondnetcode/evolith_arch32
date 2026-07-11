# Reference Core

> **Bilingual navigation:** [Versión en Español](./README.es.md)

**Classification:** Core Architecture and Governance Corpus  
**Status:** Authoritative  
**Owner:** Evolith Architecture Board

---

## Goal and Objectives

> **Goal:** maintain a single engineering Constitution, neutral with respect to providers, that every Evolith product and satellite repository can inherit without modifying it.

**Objectives:**

- Centralize universal architecture principles, Core ADRs, and canonical contracts in a single authoritative place.
- Guarantee that governance (SDLC, standards, rulesets) survives changes in product, framework, tool, or provider.
- Establish a clear dependency direction: Core governs the Suite; products consume Core and propose upstream improvements with evidence.

---

## 1. What Is Evolith Core

Evolith Core is the **provider-neutral engineering Constitution** shared by all Evolith products and satellite implementations.

It defines:

- universal architectural principles and patterns;
- Core ADRs and canonical contracts;
- the five-phase SDLC and Phase Gates governance;
- artifact, evidence, traceability, and responsibility standards;
- rulesets, schemas, taxonomies, and validation requirements;
- security rules and provider abstraction;
- the process to promote validated lessons upstream.

Core must remain valid even if a product, framework, model, tool, or provider changes.

---

## 2. What Evolith Core Is Not

Evolith Core is not:

- Evolith Tracker;
- Smart CLI, a chatbox, or an MCP product;
- a task management platform;
- an LLM or autonomous agent;
- a dashboard or BI implementation;
- an integration with a named provider;
- a SaaS deployment or commercial edition;
- the internal design of an Evolith Product Suite component.

Products consume Core. They do not redefine it.

---

## 3. Core Domains

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Architecture Hub](./architecture/README.md) | Universal principles, patterns, reference models, contracts, and Core ADRs | Guide corporate design | Area hub | Yes |
| [SDLC Governance Center](./sdlc/README.md) | Phases, gates, artifacts, evidences, roles, waivers, traceability, and metrics | Govern the complete lifecycle | Domain hub | Yes |
| Standards and Governance Center | Reusable standards and governance rules | Align teams to unified policies | Area hub | Yes |
| [Interface How-To](./interfaces/README.md) | Readable guides to drive the Core across CLI, MCP, and REST — every command/tool/endpoint with its options and examples | Learn and reference the interfaces | Area hub | Yes |
| [Rulesets Hub](../../src/rulesets/README.md) | Machine-consumable validation policies and contracts | Validate compliance automatically | Rules hub | Yes |
| [Governance Hub](./sdlc/governance/README.md) | Canonical terminology, classifications, and boundaries | Maintain consistent language and boundaries | Area hub | Yes |
| [Knowledge Hub](../knowledge/README.md) | Satellite lessons pending upstream review | Capture evidence and learning | Area hub | No |

---

## 4. Dependency Rule

```text
Evolith Core
    ↓ governs
Evolith Product Suite
    ↓ contains
Tracker · Smart CLI · MCP Services · Plugins · Future Products
    ↓ integrates via abstractions
Tools and Named Providers
```

The dependency is one-way:

1. Core defines universal constraints.
2. Suite products comply with Core.
3. Provider implementations comply with product and Core contracts.
4. Validated lessons can be proposed upstream.
5. Only the Architecture Board approves Core changes.

---

## 5. ADR Boundaries

### Core ADR

A Core ADR:

- applies across products;
- remains provider-neutral;
- defines decisions, patterns, contracts, or universal constraints;
- cannot impose any named provider, tool, or platform as a universal dependency — vendor selection belongs to Platform-Specific ADRs.

### Product ADR

Belongs to a product within the Suite and can define its internal architecture, persistence, APIs, UX, or deployment.

### Platform-Specific ADR

Can select or evaluate a technology, provider, deployment profile, license, or adapter implementation.

---

## 6. Core Invariants

1. Core is neutral with respect to providers.
2. Core rules are versioned and reviewable.
3. Product-specific schemas do not leak into canonical contracts.
4. Named tools are examples or provider profiles, not universal dependencies.
5. Human responsibility remains explicit.
6. Runtime products preserve evidence and decision lineage.
7. Satellite lessons require evidence and approval from the Architecture Board.
8. Core documentation is bilingual according to repository policy.

---

## 7. Relationship with Product Suite

The Product Suite uses Core to deliver operational capabilities:

- Tracker executes governance state and auditing.
- Smart CLI and MCP expose governed interactions and evaluations.
- Plugins and adapters connect external capabilities.
- Future products can consume the same Constitution.

The Suite vision, market positioning, roadmaps, UX, product APIs, and commercial models belong to [Evolith Product Suite](../../product/suite/README.md), not Core.

---

## 8. Related Navigation

Documents outside of Core that complete the picture (Core's own domains are listed in Section 3):

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Documentation Taxonomy](./control-center/taxonomy/documentation-taxonomy.md) | Defines which document type belongs where | Keep the corpus organized | Governance standard | Yes |
| [Evolith Product Suite](../../product/suite/README.md) | Portfolio vision, strategy, positioning, and communication | Direct the ecosystem | Domain hub | Yes |
| [Product-Specific Designs](../../product/products/README.md) | Functional and technical design per product | Contain product internals | Area hub | Yes |
| Platforms and Providers Guides | Named tools, vendors, adapters, and deployment profiles | Isolate provider decisions | Area hub | Yes |

---

[Back to Reference Hub](../README.md)
