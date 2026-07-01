# Evolith C4 Master Architecture Hub

> **Bilingual Navigation:** [Versión en Español](./C4-MASTER-ARCHITECTURE.es.md)

**Status:** Target Architecture (Approved)  
**Owner:** Evolith Architecture Board  
**Last Updated:** 2026-06-30

## 1. Executive Summary

Evolith is the governance control plane for AI-Native software engineering. This document serves as the **Single Source of Truth** for the end-to-end architecture of Evolith, mapping business intent down to individual code modules. 

This master architecture adopts the **C4 Model** (Context, Containers, Components, Code) to allow progressive zooming from a high-level systemic overview down to specific microservices and schemas.

---

## 2. Navigable Architecture Model (C4)

Choose a level of abstraction to explore the architecture:

| Level | Scope | Description | Link |
|-------|-------|-------------|------|
| **Level 1** | System Context | The bird's-eye view of Evolith: ecosystem, Tracker SaaS, Core Governance, and external providers. | [Level 1: Context](./c4-levels/level-1-system-context.md) |
| **Level 2** | Containers | The logical runtimes: Frontend, Core-API, MCP Server, Agent Runtime, CLI, databases, and message brokers. | [Level 2: Containers](./c4-levels/level-2-containers.md) |
| **Level 3** | Components | The internal building blocks of each container: use cases, controllers, adapters, and domain services. | [Level 3: Components](./c4-levels/level-3-components/README.md) |
| **Level 4** | Code/Modules | The lowest level mapping: files, schemas, OPA rulesets, and specific classes. | [Level 4: Code & Modules](./c4-levels/level-4-code-modules/README.md) |

---

## 3. Thematic Zoom-in Views

Beyond the hierarchical C4 model, the architecture can be analyzed through cross-cutting thematic lenses:

- **Deployment & Infrastructure:** Physical topologies (VPS, Coolify, future Kubernetes). [Explore Deployments](./views/view-by-deployment.md)
- **E2E Traceability & Flows:** Data flows from initial intent through validation, rulesets, and outputs. [Explore Flows](./views/view-by-flow.md)
- **Integrations & Ecosystem:** External capabilities composed via Provider Ports (LLMs, Jira, GitHub, Observability). [Explore Integrations](./views/view-by-integration.md)
- **Multi-Tenancy & Authorization:** How the tracker guarantees tenant isolation over the stateless Core. [Explore Tenants](./views/view-by-tenant.md)

---

## 4. Traceability Matrix

To understand how high-level interfaces map to specific technologies and internal components, consult the [E2E Traceability Matrix](./traceability/e2e-traceability-matrix.md).

---
[Back to Architecture Index](./README.md)
