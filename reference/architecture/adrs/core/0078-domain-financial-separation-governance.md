# ADR-0078: Domain Financial Separation Governance

- **Status:** Accepted
- **Deciders:** Evolith Architecture Board
- **Date:** 2026-06-18

> **Bilingual Navigation:** [Versión en Español](./0078-domain-financial-separation-governance.es.md)

## Context and Problem

During architectural reviews of the Evolith Core repository (specifically Phase 1 Conception and Discovery SDLC artifacts), we identified a "Domain Bleed" (Domain Contamination) issue. Several templates, validation schemas, and guidelines contained fields and logic relating to financials, budgets, investments, CAPEX/OPEX, and business ROI. 

Evolith Core is designed as a corporate, pure technical architecture reference focused on software design patterns, Spec-driven AI-DD, non-functional requirements (NFRs), and executable code rules. Business-centric financial tracking and orchestration are the exclusive responsibility of the SDLC orchestrator, **Evolith Tracker**. 

Allowing financial variables to seep into Core violates Domain-Driven Design (DDD) isolation principles, complicates CLI validation logic, and couples technical frameworks to fluid company-specific budget workflows.

## Objective and Scope

**Objective:** Standardize a strict separation of concerns that purges all financial parameters from the Core workspace and mandates that Core specifications rely solely on technical constraints and Quality Attributes (NFRs).

**In scope:**
- All SDLC artifact templates, validation schemas, and policies residing in the Core repository.
- Gate evaluation criteria for Phase 1.

**Out of scope:**
- The implementation of financial tracking schemas inside the Evolith Tracker repository.

## Decision

**Purge all references to financial parameters from Evolith Core and delegate all financial tracking, budgets, and business ROI logic exclusively to Evolith Tracker.**

All specifications and templates in Core must substitute business/financial concepts with Technical Constraints and Quality Attributes (NFRs):

1. **Discovery Canvas**: Replace expected business/monetary value (`expectedValue`) with expected Quality Attributes (`expectedQualityAttributes` / NFRs: Latency, Scalability, Security).
2. **Business Case ROI**: Rename the Core template to **Technical Feasibility Canvas** (`technical-feasibility-template.md`), replacing the monetization and ROI sections with detailed NFR criteria and technical constraints.
3. **Ballpark Estimation**: Replace the "Costos Asociados (CAPEX / OPEX)" section and schema properties with technical limits and quotas (e.g., Cloud Quotas, CPU/Memory resource constraints, tech stack limitations).
4. **Handoff commands in CLI**: Any automatic CLI scaffolding command must be purged of financial properties, focusing strictly on mapping technical requirements and code scaffolding.

All future core specifications are prohibited from introducing budget, cost, or monetization parameters.

## Consequences

**Positive:**
- Enforces clean DDD boundaries between Evolith Core and Evolith Tracker.
- Simplifies Core CLI logic, which no longer needs to validate currencies, budget allocations, or business OKR financial metrics.
- Aligns engineering artifacts around technical metrics (NFRs and resource limits) that developers can objectively measure.

**Negative / Trade-offs:**
- Teams must consult both Core templates (for technical feasibility) and Tracker templates (for financial business cases) to achieve full Business Sign-Off.
- Breaking change to Phase 1 gate verification schemas.

**Mitigations:**
- The CLI command mappings and validation tests are updated to support the transition to the Technical Feasibility Canvas.
- Clear references point satellite teams to the Tracker repository for financial templates.

## References

- [Domain-Driven Design (DDD) - Bounded Contexts](https://martinfowler.com/bliki/BoundedContext.html)
- [Evolith Tracker product repository](https://github.com/beyondnetcode/ums)
- Gap tracking: domain separation of concerns
