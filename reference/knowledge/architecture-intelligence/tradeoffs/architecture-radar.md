# Architecture Radar

> A lightweight decision radar to classify architectural ideas before they become standards, ADRs, or canonical patterns.

## Purpose

The Architecture Radar helps Evolith classify external and internal architectural ideas using a controlled adoption model.

It prevents premature standardization and makes architectural evolution explicit.

## Categories

### Adopt

Practices that are recommended and aligned with Evolith principles.

Initial examples:
- OpenTelemetry
- Serilog structured logging
- Bounded Context Isolation
- Contract First Integration
- Modular Monolith First

### Trial

Practices worth applying in controlled contexts before becoming standard.

Initial examples:
- Harness Agents
- AI-assisted architecture reviews
- Semantic governance
- AI-generated compliance checks

### Assess

Practices that require research, pilots, or tradeoff analysis.

Initial examples:
- Event Sourcing
- Actor Model
- Full autonomous agent workflows
- Runtime architecture policy enforcement

### Hold

Practices that should be avoided unless a documented exception exists.

Initial examples:
- Shared global DbContext across domains
- Cross-domain database joins
- Static service factories
- Global mutable state
- Hidden infrastructure coupling

## Promotion Rule

A radar item can become an Evolith standard only through one of these artifacts:

- accepted ADR
- governance standard
- architecture blueprint
- canonical pattern

## Validation Rule

Every radar movement must include:
- rationale
- tradeoffs
- evidence
- affected teams
- adoption guidance
- AI impact when applicable

---

[Back to Architecture Intelligence](../README.md)
