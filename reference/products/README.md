# Evolith Product-Specific Designs

> **Bilingual navigation:** [Versión en Español](./README.es.md)

This domain contains the functional and technical design of individual products in the Evolith Product Suite.

Product documents implement Evolith Core and SDLC Governance. They cannot redefine universal Core rules.

## Goal and Objectives

> **Goal:** keep each product's functional and technical design self-contained, traceable, and compliant with the Core Constitution.

**Objectives:**

- Give every Suite product one hub for its vision, domain model, interfaces, and product ADRs.
- Separate product internals from suite strategy (Product Suite) and from universal rules (Core).
- Make the dependency direction auditable: products consume Core; they never redefine it.

## Products

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Tracker Hub](./evolith-tracker/README.md) | Active product: architecture and technical interfaces of Evolith Tracker | Design the governance product | Product hub | No |
| [Smart CLI Hub](./smart-cli/README.md) | Active product documented in `smart-cli/` | Understand the tooling product | Product hub | No |
| [Core API Hub](./core-api/README.md) | Active product: central validation and governance service | Core rules evaluation engine | Product hub | No |
| [Evolith MCP Services](./mcp-services/README.md) | Active product: governed MCP interaction services (HTTP, fail-closed, API-key) | Expose governed MCP interactions | Product hub | No |
| [UMS Reference Hub](./ums-reference/README.md) | Reference product: the open-source UMS satellite is the official applied reference model for this corpus | Anchor the enterprise applied reference | Product hub (reference) | No |
| [Ecosystem & Communication Map](./ecosystem-and-communication.md) | Cross-product relationships, communication surfaces, SDLC flow, and source-of-truth model (Mermaid diagrams) | See how the products fit together | Cross-product overview | No |
| Future products | Added only after their Product Vision is approved | Grow the suite under governance | Product hub (planned) | No |

## Allowed Content

- product vision and scope;
- bounded contexts and domain model;
- interfaces and APIs;
- persistence and deployment design;
- product UX;
- product-local security and authorization;
- product ADRs;
- integration and adapter usage.

## Excluded Content

- universal architecture principles;
- Core ADRs;
- generic SDLC gates and artifact rules;
- provider-specific selection rationale not scoped to this product;
- suite-level positioning and commercial strategy.

[Back to Reference Hub](../README.md)
