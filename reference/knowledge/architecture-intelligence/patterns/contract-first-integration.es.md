# Contract First Integration


---

## Source

- Enterprise integration architecture
- Domain-Driven Design
- API-first and event-first delivery practices

## Problem

When teams integrate modules through implementation details, the architecture becomes fragile.

Common symptoms include:

- direct entity sharing
- leaking persistence models
- unstable internal APIs
- undocumented event payloads
- breaking changes without visibility

## Context

This pattern applies to modular monoliths, distributed modules, and microservice-ready architectures where domain boundaries must remain explicit.

## Solution

Define integration contracts before implementation coupling appears.

Contracts may include:

- API contracts
- event contracts
- query contracts
- command contracts
- schema definitions
- versioned integration messages

## Rules

- A module must not consume another module's internal tables or entities.
- Integration must happen through documented contracts.
- Contract changes must be reviewed as architecture-impacting changes.
- Contracts must be versioned when consumers can be affected.

## Benefits

- reduces coupling
- improves provider/team alignment
- supports automated contract testing
- enables safer AI-assisted implementation
- improves compatibility with future distributed deployment

## Tradeoffs

- requires more upfront design
- requires governance discipline
- may slow quick local integrations
- requires contract testing for critical flows

## Evolith Position

Recommended.

## Adoption Level

Enterprise.

## AI Impact

High. AI agents can generate safer code when integration contracts are explicit and discoverable.

## Related ADRs

- [ADR-0032: API Protocol Decision Matrix](../../../architecture/adrs/core/0032-api-protocol-decision-matrix-rest-grpc-graphql.md)
- [ADR-0053: Integration and E2E Testing Strategy](../../../architecture/adrs/core/0053-integration-e2e-testing-strategy.md)
- [ADR-0058: AI-Consumable Architecture Knowledge](../../../architecture/adrs/core/0058-ai-consumable-architecture-knowledge.md)

## Anti-Patterns

- direct entity sharing across modules
- undocumented events
- using database schema as integration contract
- breaking consumers without compatibility strategy

---

[Back to Architecture Intelligence](../README.md)

