# Evolith Tracker — Architecture

> **Bilingual navigation:** [Versión en Español](./README.es.md)

**Classification:** Product-Specific Architecture  
**Product:** Evolith Tracker  
**Governing Core:** [Evolith Core](../../../core/README.md)  
**Status:** Conceptual / design-stage — describes the *target* architecture; no Tracker code is implemented yet.

This area defines the intended internal architecture of Evolith Tracker (design target, not shipped code).

## Scope (design target)

- container and component architecture;
- bounded contexts and aggregate boundaries;
- Gate Decision Engine and Phase Orchestrator;
- Evidence Graph runtime implementation;
- Provider Registry and plugin runtime;
- Agent Execution Coordinator;
- authorization integration with UMS;
- persistence, events, deployment, and product observability;
- Tracker-specific architecture decisions.

## Current Migration Targets

- [Tracker Technical Interface Design](../../../governance/standards/vision/sdlc-tracker-technical-interfaces.md)
- Tracker-specific sections of the [Governed Composition Target Design](../../../governance/standards/vision/evolith-governed-composition-target-design.md)

> **What exists today.** No Tracker architecture is built. The only shipped, Tracker-enabling seams live in Core (`apps/core-api` REST-only under `/api/v1`, `packages/core-domain`); see the [What Exists Today vs. the Target](../README.md#31-what-exists-today-vs-the-target) delta in the product README for the live-seam inventory and its gap-tracking references.

## Boundary

By design, this area implements, but does not redefine:

- Core architecture principles;
- SDLC phases and Phase Gate semantics;
- canonical artifact and evidence requirements;
- universal provider-abstraction contracts.

[Back to Evolith Tracker](../README.md)
