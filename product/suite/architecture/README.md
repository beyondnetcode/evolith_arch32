# Evolith Product Suite — Architecture

> **Bilingual navigation:** [Versión en Español](./README.es.md)

**Classification:** Product Suite Architecture

This area describes how Evolith products collaborate as a suite. It may define cross-product responsibilities, suite-level context diagrams, shared product capabilities, and dependency direction from Core to products.

It must not contain universal architecture principles that belong in Evolith Core or internal implementation details that belong to a specific product.

> **Goal:** describe how the products reinforce each other as one coherent suite.
>
> **Objectives:** define cross-product responsibilities and shared capabilities, and keep the dependency direction explicit: Core governs products, never the reverse.

## Current Documents

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Governed Composition Target Design](./evolith-governed-composition-target-design.md) | Target design for governed product composition | Design the composed target state | Design reference | Yes |
| [Provider Abstraction and Plugin Model](../../../reference/core/foundations/principles/evolith-provider-abstraction-plugin-model.md) | Provider abstraction and plugin model (migration target: Core Architecture Principle) | Keep providers replaceable | Design reference | Yes |
| [Tracker Technical Interfaces](../../products/evolith-tracker/sdlc-tracker-technical-interfaces.md) | Tracker technical interfaces (migration target: Tracker Product Design) | Specify Tracker integration surfaces | Design reference | No |

During migration, this index separates Suite architecture from Core and product implementation.

[Back to Product Suite](../README.md)
