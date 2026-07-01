# Architecture Hub

> Bilingual navigation: [Español](./README.es.md)

This area contains the reusable architecture model. Read it from general policy to concrete evidence.

## Goal and Objectives

> **Goal:** define the reusable, provider-neutral architecture model that every product inherits — from baseline principles down to runtime patterns.

**Objectives:**

- Keep the runtime-agnostic baseline and blueprints as the single source of architectural policy.
- Record every accepted trade-off as an ADR, discoverable through the decision matrix.
- Provide runtime-conditioned implementation guidance without turning it into universal policy.

## Layers

Ordered from general policy to concrete evidence:

| Document | Description | Goal / Objective | Type | Mandatory |
|---|---|---|---|---|
| [Agnostic Baseline](./agnostic-baseline.md) | Top-level runtime-agnostic principles, patterns, and non-negotiable constraints | Anchor every product and runtime to one baseline | Baseline policy | Yes |
| [C4 Master Architecture](./C4-MASTER-ARCHITECTURE.md) | Consolidated, verified end-to-end system design (deployed core-api, MCP server, Agent Runtime) | See the architecture as actually built and deployed | System design | No |
| [Core Interface Flows](./views/view-by-interface-flow.md) | IN/OUT contracts, processing paths, resilience, audit, and client guidance for Core interfaces | Understand how communication crosses every Core boundary | Architecture view | No |
| [Principles](./principles/README.md) | Foundational architecture principles | Ground all decisions in shared principles | Area hub | Yes |
| [Blueprints Hub](./blueprints/README.md) | Runtime-agnostic principles, topology, and selection criteria | Define the architectural baseline | Area hub | Yes |
| [ADR Registry](./adrs/README.md) | Records accepted trade-offs and their scope | Preserve decision history | Area hub | Yes |
| [ADR Matrix](./adrs/adr-matrix.md) | Finds controlling ADRs by architectural concern | Speed up decision discovery | Decision index | Yes |
| [Topology Hub](./topologies/README.md) | Human-readable Multi-Topology Reference Corpus | Govern topology dimensions and composition | Area hub | Yes |
| [Canonical Patterns](./canonical-patterns/README.md) | Code patterns governed by runtime-specific ADRs | Standardize runtime implementations | Area hub | No |
| [Evolith SDK](./evolith-sdk/README.md) | Domain model and technical design of the Evolith SDK | Design the shared SDK | Design reference | No |
| [MCP Tools Catalog](../governance/standards/ai-augmented/03-tools-catalog/evolith-mcp-tools.md) | Catalog of 11 MCP tools for AI agent automation | Enable AI agent automation | Tool reference | No |
| [UMS Reference Model](../knowledge/demo/ums-reference-model.md) | Shows how a real product adopts or specializes the reference | Demonstrate applied evidence | Applied reference | No |

## Reading Rule

The baseline and accepted ADRs define policy. Runtime profiles and canonical patterns define conditioned implementation guidance. UMS is the official applied reference model: it demonstrates decisions in a complete product, but its product-specific choices are not automatically universal standards.

---

[Back to Reference Hub](../README.md)
