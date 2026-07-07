# Evolith Product Suite

> **Bilingual navigation:** [Versión en Español](./README.es.md)

This domain contains the product portfolio vision, strategy, positioning, roadmap, methods, ecosystem, and executive communication for the Evolith Suite.

It does not define universal architecture rules, SDLC governance standards, or product-internal implementation details.

## Goal and Objectives

> **Goal:** define where the Evolith product portfolio is going and how its products reinforce each other — without leaking strategy into Core or product internals.

**Objectives:**

- Maintain a single portfolio vision, roadmap, and positioning shared by every Suite product.
- Document how products relate (suite architecture, methods, ecosystem) at the portfolio level.
- Provide executive-grade communication material that stays consistent with Core governance.

## Areas

The six areas, ordered from direction (vision) to delivery support (communication):

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Vision](./vision/README.md) | Portfolio direction and long-term goals | Align the portfolio to one vision | Area hub | Yes |
| [Strategy](./strategy/README.md) | Roadmap and investment priorities | Sequence the portfolio bets | Area hub | Yes |
| [Positioning](./positioning/README.md) | Market positioning and differentiation | Differentiate the suite | Area hub | No |
| [Methods](./methods/README.md) | Shared product methods and practices | Standardize product practice | Area hub | No |
| [Architecture](./architecture/README.md) | Suite-level architecture and product relationships | Relate the products coherently | Area hub | Yes |
| [Communication](./communication/README.md) | Executive communication and visuals | Communicate the suite consistently | Area hub | No |

## Boundary

- Universal principles belong in [`reference/core/architecture/`](./architecture/README.md).
- Phase, gate, artifact, evidence, and role governance belongs in [`reference/core/sdlc/`](../../reference/core/sdlc/README.md).
- Product-internal designs belong in [`product/products/`](../products/README.md).
- Named technologies and vendors belong in `product/infra/`.

[Back to Reference Hub](../../README.md)
