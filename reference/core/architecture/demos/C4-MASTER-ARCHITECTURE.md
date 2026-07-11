# Evolith C4 Master Architecture Hub

> **Bilingual Navigation:** [Versión en Español](./C4-MASTER-ARCHITECTURE.es.md)

**Status:** Implemented Baseline + Target Evolution (Approved)  
**Owner:** Evolith Architecture Board  
**Last Updated:** 2026-07-01

## 1. Executive Summary

Evolith is the governance control plane for AI-Native software engineering. This document serves as the **Single Source of Truth** for the end-to-end architecture of Evolith, mapping business intent down to executable services, packages, rulesets, and code modules.

This master architecture adopts the **C4 Model** (Context, Containers, Components, Code) to allow progressive zooming from a high-level systemic overview down to implemented runtimes, package boundaries, schemas, and policies. Where the reference implementation contains transitional behavior, the lower-level views mark it explicitly instead of treating it as the long-term product boundary.

---

## 2. Navigable Architecture Model (C4)

Choose a level of abstraction to explore the architecture:

| Level | Scope | Description | Link |
|-------|-------|-------------|------|
| **Level 1** | System Context | The bird's-eye view of Evolith: ecosystem, Tracker SaaS, Core Governance, and external providers. | [Level 1: Context](./level-1-system-context.md) |
| **Level 2** | Containers | The implemented logical runtimes: Core API, MCP Server, Agent Runtime API/Engine, Evolith CLI, Redis cache, and reference corpus. Tracker remains external to this repository. | [Level 2: Containers](./level-2-containers.md) |
| **Level 3** | Components | The internal building blocks of each container: controllers, commands, tool registries, use cases, adapters, evaluators, and domain services. | [Level 3: Components](./level-3-components/README.md) |
| **Level 4** | Code/Modules | The lowest level mapping: files, schemas, OPA rulesets, and specific classes. | [Level 4: Code & Modules](./level-4-code-modules/README.md) |

---

## 3. Thematic Zoom-in Views

Beyond the hierarchical C4 model, the architecture can be analyzed through cross-cutting thematic lenses:

- **Visual Map (Interactive Explorer):** Visual and dynamic navigation of the C4 model, flows, and integrations. [Open Visual Map](https://beyondnetcode.github.io/evolith_arch32/)
- **Deployment & Infrastructure:** Physical topologies (VPS, Coolify, future Kubernetes). [Explore Deployments](./view-by-deployment.md)
- **E2E Traceability & Flows:** Data flows from initial intent through validation, rulesets, and outputs. [Explore Flows](./view-by-flow.md)
- **Core Interface Flows:** IN/OUT contracts, processing paths, resilience, audit, and client guidance for every Core interface (includes **JSON Contract Examples**). [Explore Interface Flows](./view-by-interface-flow.md)
- **Integrations & Ecosystem:** External capabilities composed via Provider Ports (LLMs, Jira, GitHub, Observability). [Explore Integrations](./view-by-integration.md)
- **Multi-Tenancy & Authorization:** How the tracker guarantees tenant isolation over the stateless Core. [Explore Tenants](./view-by-tenant.md)

---

## 4. Traceability Matrix

To understand how high-level interfaces map to specific technologies and internal components, consult the [E2E Traceability Matrix](../../control-center/taxonomy/e2e-traceability-matrix.md).

---
[Back to Architecture Index](./README.md)
