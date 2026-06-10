# Evolith Tracker — Architecture

> **Bilingual navigation:** [Versión en Español](./README.es.md)

**Classification:** Product-Specific Architecture  
**Product:** Evolith Tracker  
**Governing Core:** [Evolith Core](../../../core/README.md)

This area contains the internal architecture of Evolith Tracker.

## Scope

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

## Boundary

This area implements, but does not redefine:

- Core architecture principles;
- SDLC phases and Phase Gate semantics;
- canonical artifact and evidence requirements;
- universal provider-abstraction contracts.

[Back to Evolith Tracker](../README.md)
