# Distributed Modules — Adoption Guide

> **Bilingual Navigation:** [English](./adoption.md) | [Español](./adoption.es.md)

**Owner:** Architecture Board
**Topology:** Distributed Modules

## Overview

This guide defines the adoption process for the distributed modules topology, including entry criteria, team topology, ownership model, adoption checklist, and exit criteria for progression to F3.

## Entry Criteria

A system must meet F1 maturity (>= 70% on the modular monolith extraction score) before adopting the distributed modules topology.

- **Modular monolith baseline**: System must first achieve F1 maturity with well-defined module boundaries.
- **Extraction score threshold**: F1 extraction score must be >= 70% as validated by the architecture board.
- **Team readiness**: At least one team must have end-to-end ownership capability for a module.
- **Operational infrastructure**: Service mesh, observability stack, and CI/CD pipelines must be operational.

## Team Topology

Team structure must align with module ownership to enable autonomous operation.

- **Module-aligned teams**: Each module is owned by a single team responsible for design, development, and operations.
- **Platform team**: A platform team provides shared infrastructure, tooling, and self-service capabilities.
- **Architecture board**: The architecture board governs cross-module standards, contract review, and extraction decisions.
- **Communication channels**: Clear communication paths exist between module teams, platform team, and architecture board.

## Ownership Model

Each module has a clearly defined owner responsible for its entire lifecycle (DM-R01).

- **Design ownership**: Module owner is responsible for API design, event contracts, and data schema.
- **Development ownership**: Module owner owns the codebase, tests, and deployment pipeline.
- **Operational ownership**: Module owner is responsible for monitoring, incident response, and capacity planning.
- **Lifecycle ownership**: Module owner manages the module from inception through potential extraction or deprecation.

## Adoption Checklist

Before distributing a module, the following checklist must be completed.

- [ ] Module has well-defined boundaries and clear domain responsibility.
- [ ] Module contracts are registered, versioned, and backward compatible.
- [ ] Module has its own data store with no cross-module direct access.
- [ ] Module has automated CI/CD pipeline with rollback capability.
- [ ] Module has liveness and readiness health checks.
- [ ] Module has observability (logs, metrics, traces) with alerting.
- [ ] Module owner team has operational runbooks for known failure modes.
- [ ] Architecture board has reviewed and approved the distribution.

## Exit Criteria for F3

A module may progress to F3 (microservices) when extraction readiness criteria are met (DM-R08).

- **Extraction score >= 80%**: Module meets the extraction readiness threshold.
- **Pilot extraction successful**: Module has been piloted as an independent service.
- **No cross-module data coupling**: Module has no shared schemas or direct database access.
- **Independent deployment proven**: Module has demonstrated independent deploy and rollback in production.
- **Architecture board approval**: Final approval from the architecture board for full extraction.

---

[Back to Distributed Modules Profile](./README.md)
