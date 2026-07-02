# Evolith Core

> **Bilingual navigation:** [Versión en Español](./README.es.md)

**Classification:** Core Architecture and Governance Corpus  
**Status:** Authoritative  
**Owner:** Evolith Architecture Board

---

## Goal and Objectives

> **Goal:** keep a single, provider-neutral engineering Constitution that every Evolith product and satellite repository can inherit without modification.

**Objectives:**

- Centralize universal architecture principles, Core ADRs, and canonical contracts in one authoritative place.
- Guarantee that governance (SDLC, standards, rulesets) survives changes of product, framework, tool, or vendor.
- Provide a clear dependency direction: Core governs the Suite; products consume Core and propose improvements upstream with evidence.

---

## 1. What Evolith Core Is

Evolith Core is the **provider-neutral engineering Constitution** shared by every Evolith product and satellite implementation.

It defines:

- universal architecture principles and patterns;
- Core ADRs and canonical contracts;
- the five-phase SDLC and Phase Gate governance;
- artifact, evidence, traceability, and responsibility standards;
- rulesets, schemas, taxonomies, and validation requirements;
- security and provider-abstraction rules;
- the process for promoting validated lessons upstream.

Core is intended to remain valid even when a product, framework, model, tool, or vendor changes.

---

## 2. What Evolith Core Is Not

Evolith Core is not:

- Evolith Tracker;
- Smart CLI, a chatbox, or an MCP product;
- a task-management platform;
- an LLM or autonomous agent;
- a dashboard or BI implementation;
- a named provider integration;
- a SaaS deployment or commercial edition;
- the internal design of any product in the Evolith Suite.

Products consume Core. They do not redefine it.

---

## 3. Core Domains

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Architecture Hub](../architecture/README.md) | Principles, patterns, reference models, contracts, and Core ADRs | Guide corporate design | Area hub | Yes |
| [SDLC Governance Center](../governance/sdlc/README.md) | Phases, gates, artifacts, evidence, roles, exceptions, traceability, and metrics | Govern the full lifecycle | Domain hub | Yes |
| [Standards and Governance Center](../governance/standards/README.md) | Reusable standards and governance rules | Align teams to unified policies | Area hub | Yes |
| [Rulesets Hub](../../rulesets/README.md) | Machine-consumable policy and validation contracts | Validate compliance automatically | Rules hub | Yes |
| [Governance Hub](../governance/README.md) | Canonical terminology, classifications, and governance boundaries | Keep language and boundaries consistent | Area hub | Yes |
| [Knowledge Hub](../knowledge/README.md) | Lessons and evidence from satellite implementations, pending upstream review | Capture evidence and learning | Area hub | No |

---

## 4. Dependency Rule

```text
Evolith Core
    ↓ governs
Evolith Product Suite
    ↓ contains
Tracker · Smart CLI · MCP Services · Plugins · Future Products
    ↓ integrates through abstractions
Named Tools and Providers
```

The dependency direction is one-way:

1. Core defines universal constraints.
2. Suite products conform to Core.
3. Provider implementations conform to product and Core contracts.
4. Validated lessons may be proposed upstream.
5. Only the Architecture Board can approve a Core change.

---

## 5. ADR Boundaries

### Core ADR

A Core ADR:

- applies across products;
- remains provider-neutral;
- defines architecture decisions, patterns, contracts, or universal constraints;
- does not mandate any specific vendor, tool, or platform as a universal dependency — vendor selection belongs to Platform-Specific ADRs.

### Product ADR

A Product ADR belongs to one Suite product and may define its internal architecture, persistence, APIs, UX, or deployment.

### Platform-Specific ADR

A Platform-Specific ADR may select or evaluate a named technology, provider, deployment profile, license, or adapter implementation.

---

## 6. Core Invariants

1. Core is provider-neutral.
2. Core rules are versioned and reviewable.
3. Product-specific schemas cannot leak into canonical Core contracts.
4. Named tools are examples or provider profiles, not universal dependencies.
5. Human accountability remains explicit.
6. Runtime products preserve evidence and decision lineage.
7. Satellite lessons require evidence and Architecture Board approval before promotion.
8. Core documentation is bilingual when required by repository policy.

---

## 7. Relationship to the Product Suite

The Product Suite uses Core to deliver operational capabilities:

- Tracker executes governance state and audit.
- Smart CLI and MCP expose governed interactions and evaluations.
- Plugins and adapters connect external capabilities.
- Future products may consume the same Constitution.

Suite vision, business positioning, roadmaps, UX, product APIs, and commercial models belong in the [Evolith Product Suite](../product-suite/README.md), not in Core.

---

## 8. Related Navigation

Documents outside Core that complete the picture (Core's own domains are listed in section 3):

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Documentation Taxonomy](../documentation-taxonomy.md) | Defines what kind of document belongs where | Keep the corpus organized | Governance standard | Yes |
| [Evolith Product Suite](../product-suite/README.md) | Portfolio vision, strategy, positioning, and communication | Direct the ecosystem | Domain hub | Yes |
| [Product-Specific Designs](../products/README.md) | Functional and technical design per product | Contain product internals | Area hub | Yes |
| [Platform and Provider Guidance](../platforms/README.md) | Named tools, vendors, adapters, and deployment profiles | Isolate provider decisions | Area hub | Yes |

---

[Back to Reference Hub](../README.md)
