# Reference Hub

> **Bilingual navigation:** [Versión en Español](./README.es.md)

This directory contains the Evolith reference corpus, explicitly separated between the **Evolith Core Constitution** and the **Evolith Product Suite**.

## Goal and Objectives

> **Goal:** organize the entire reference corpus so that every document has exactly one home, from the most generic domain down to the most specific artifact.

**Objectives:**

- Separate the four primary domains (Core, Product Suite, Product Designs, Platform Guidance) with explicit, auditable boundaries.
- Give every domain a hub that states its own goal, objectives, and limits before listing its contents.
- Route supporting concerns (onboarding, architecture, governance, operations, knowledge) through dedicated area hubs.

## Primary Boundaries

The four primary domains, ordered from the most generic (the constitution) to the most specific (named providers):

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Evolith Core](./core/README.md) | Authoritative, provider-neutral architecture, SDLC governance, standards, rulesets, schemas, and Core ADRs | Anchor the constitution every product inherits | Domain hub | Yes |
| [Evolith Product Suite](./product-suite/README.md) | Product portfolio vision, strategy, positioning, suite architecture, roadmap, and communication | Direct the ecosystem | Domain hub | Yes |
| [Product-Specific Designs](./products/README.md) | Functional and technical design for Tracker, Smart CLI, MCP services, and future products | Contain product internals | Area hub | Yes |
| [Platform and Provider Guidance](./platforms/README.md) | Named tools, vendors, adapters, licensing, deployment profiles, and platform-specific ADRs | Isolate provider decisions | Area hub | Yes |

## Supporting Reference Areas

Supporting areas, ordered from onboarding to meta-navigation:

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Getting Started](./getting-started/README.md) | Guided reading paths by reader role and objective | Accelerate onboarding | Onboarding guide | No |
| [Architecture](./architecture/README.md) | Core architecture blueprints, ADRs, topology, contracts, and canonical patterns | Guide corporate design | Area hub | Yes |
| [Governance and Standards](./governance/standards/README.md) | Core engineering standards and governance | Align teams to unified policies | Area hub | Yes |
| [SDLC Governance](./governance/sdlc/README.md) | Phases, gates, artifacts, evidence, roles, traceability, and metrics | Govern the full lifecycle | Domain hub | Yes |
| [Operations](./operations/README.md) | Observability, runtime support, and operational documentation | Standardize operations | Area hub | No |
| [Infrastructure](./infrastructure/README.md) | Local platform, gateway, containers, and infrastructure assets | Standardize the local runtime | Area hub | No |
| [Knowledge](./knowledge/README.md) | Applied references, UMS evidence, research, examples, and lessons | Capture evidence and learning | Area hub | No |
| [Quick Access](./quick-access/README.md) | Shortest path to the authoritative standards per stack | Reduce navigation friction | Navigation index | No |
| [Navigation](./navigation/README.md) | Master index, bilingual index, and documentation version log | Centralize navigation | Navigation hub | Yes |

## Documentation Governance

- [Documentation Taxonomy](./documentation-taxonomy.md)
- Universal architecture and governance belong to **Evolith Core**.
- Product vision, commercial strategy, and suite relationships belong to **Product Suite**.
- Product internals belong to the corresponding product domain.
- Named technologies and vendors belong to Platform Guidance.
- Products consume Core and may propose evidence-backed improvements upstream; they cannot redefine Core directly.

Terminology is centralized in the [Architecture Glossary](./governance/glossary.md). The boundary between reusable guidance and the UMS executable product is explained in [Canonical Reference vs UMS Applied Model](./knowledge/demo/demo-vs-reference.md).

For the public entry point, go back to the [main README](../README.md).
