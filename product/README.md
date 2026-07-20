# Product Hub

> **Bilingual navigation:** [Versión en Español](./README.es.md)

This directory contains the Evolith **Product Suite** corpus: what the products are, how they are designed, and how they are run. The provider-neutral constitution they inherit lives in [`reference/`](../reference/README.md).

## Goal and Objectives

> **Goal:** keep every product-facing concern — vision, design, operation, infrastructure, research — in one place, cleanly separated from the Core constitution that governs it.

**Objectives:**

- Separate portfolio direction (Suite) from per-product internals (Products).
- Keep runtime concerns (Operations, Infrastructure) navigable on their own terms.
- Hold exploratory material (Research) apart from delivered design.

## Areas

| Area | Description | Type |
|---|---|---|
| [Suite](./suite/README.md) | Portfolio vision, strategy, positioning, suite architecture, roadmap, and communication | Domain hub |
| [Products](./products/README.md) | Functional and technical design per product — Core API, Tracker, MCP services, Evolith CLI | Area hub |
| [Operations](./operations/README.md) | Observability, incident response, SLOs, chaos experiments, runtime support | Area hub |
| [Infrastructure](./infra/README.md) | Local Compose stack, Docker, Helm, Kubernetes, CI/CD, SCM, security, VPS deployment | Area hub |
| [Research](./research/README.md) | Adoption cases, proofs of concept, architecture intelligence, reference demos | Area hub |

## Dependency Rule

Products consume Core; they do not redefine it. Architectural decisions belong in [`reference/core/architecture/adrs/`](../reference/core/architecture/adrs/README.md), not here. See [Evolith Core](../reference/core/README.md) for the boundary.

---

[Back to Repository Root](../README.md) · [Reference Hub](../reference/README.md)
