# Distributed Modules — Evolution Guide

> **Bilingual Navigation:** [English](./evolution.md) | [Español](./evolution.es.md)

**Owner:** Architecture Board
**Topology:** Distributed Modules

## Overview

This guide defines the evolution path from distributed modules (F2) to microservices (F3), including extraction readiness criteria, module independence assessment, and the governance process governed by ADR-0045 and ADR-0047.

## F2 to F3 Readiness Threshold (DM-R08)

A module is eligible for extraction to a standalone microservice when its Extraction Readiness Score reaches 80% or higher.

- **Extraction Score components**: Deployment independence, data isolation, contract stability, team autonomy, operational maturity.
- **Scoring methodology**: Each component is scored 0-100; the aggregate must meet or exceed 80%.
- **Assessment cadence**: Extraction readiness is assessed quarterly or upon significant architectural changes.
- **Gate enforcement**: No module may be extracted without achieving the threshold score and architecture board approval.

## Module Independence Criteria

Before extraction, a module must demonstrate independence across multiple dimensions.

- **Deploy independence**: Module deploys and rolls back independently with no cross-module coordination.
- **Data isolation**: Module owns its data store with no shared schemas or cross-module direct access (DM-R03).
- **Contract stability**: Module APIs and events are versioned, documented, and backward compatible (DM-R02).
- **Team autonomy**: A dedicated team owns the module end-to-end including operations (DM-R01).
- **Operational maturity**: Module has production-grade observability, alerting, and runbooks.

## Extraction to Microservices (ADR-0047)

When extraction criteria are met, the module transitions to an independent microservice following the governance process.

- **Extraction proposal**: Module owner submits an extraction proposal with readiness evidence.
- **Architecture review**: Architecture board reviews the proposal against extraction criteria.
- **Pilot extraction**: First extraction is a pilot with enhanced monitoring and rollback readiness.
- **Full extraction**: After successful pilot, the module is fully extracted as a standalone service.

## Governance Process (ADR-0045)

The progressive topology transition is governed by explicit architectural decision records.

- **ADR authorship**: Extraction decisions are captured in ADRs with context, options, and rationale.
- **Stakeholder review**: Extraction proposals require review from module owner, platform team, and architecture board.
- **Decision record**: Approved extractions are documented as ADRs for future reference.
- **Rollback plan**: Every extraction includes a documented rollback plan in case of post-extraction issues.

---

[Back to Distributed Modules Profile](./README.md)
