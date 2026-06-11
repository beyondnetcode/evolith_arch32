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

| Product | Hub | Status |
|---|---|---|
| Evolith Tracker | [Tracker Hub](./evolith-tracker/README.md) | Active |
| Evolith Smart CLI | [Smart CLI Hub](../../sdk/cli/README.md) | Documented in `sdk/cli/` — migration to this domain pending |
| Evolith MCP Services | — | Migration pending |
| Future products | — | Add only after Product Vision approval |

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
