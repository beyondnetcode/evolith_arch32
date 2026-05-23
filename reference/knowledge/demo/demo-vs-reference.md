# Demo vs Reference

> Bilingual navigation: [Español](./demo-vs-reference.es.md)

This page prevents a common reading error: not every implementation detail in the demo is a universal architecture rule.

## What Is Universal

Universal guidance belongs in architecture and governance documents:

- Progressive evolution from simple monolith to modular monolith to distributed services.
- Runtime-agnostic principles and constraints.
- ADRs and standards accepted as repository policy.
- Naming, documentation, quality, security, and SDLC rules.

## What Is Demo-Specific

Demo-specific guidance belongs in the demo documentation and source code:

- To-Do functional scope.
- Local infrastructure and Docker Compose wiring.
- Concrete Node.js/NestJS implementation choices used by the sandbox.
- Simplifications made to keep the example understandable.

## Reading Rule

If a decision appears only in demo documentation, treat it as an example. If it appears in the ADR registry, blueprint, or governance standards, treat it as canonical guidance.

---
[Back to Demo Hub](./README.md)
