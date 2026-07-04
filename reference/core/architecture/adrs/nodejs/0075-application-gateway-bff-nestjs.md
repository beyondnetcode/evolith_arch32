# [ADR 0075](0075-application-gateway-bff-nestjs.md): Application Gateway (BFF) with NestJS

## Status
Approved

## Date
2026-06-12

## Context and Problem
The [Core ADR-0030: Two-Tier Distributed Gateway Model](../core/0030-two-tier-distributed-gateway-model.md) mandates a Tier 2 Application Gateway deployed within the secure cluster. This gateway must be capable of composing heterogeneous data responses, stripping PII, tailoring device payloads, and managing user cookie mechanics for the Node.js ecosystem.

## Objective and Scope
Select the specific runtime and framework to implement the Tier 2 Application Gateway (BFF) for the Node.js platform.

## Options Considered
- **Selected:** NestJS BFF
- **Others:** Express.js (rejected due to lack of architectural structure), Apollo Federation (rejected as it forces GraphQL everywhere, whereas we need REST/gRPC flexibility).

## Decision and Rationale
Adopt **NestJS** as the Application Gateway (BFF) framework.
NestJS provides a robust dependency injection container, native gRPC and REST support, and enforced modularity. It is safely deployed behind the Tier 1 Edge Gateway.

## Evidence and Evaluation Criteria
NestJS aligns with [Node.js ADR-0002: Clean Hexagonal Architecture](./0002-clean-architecture-nestjs.md). It natively supports both asynchronous microservice clients (for backend communication) and robust controller logic (for frontend consumption).

## Consequences, Risks, and Trade-offs

### Positive
- Strict typing and architectural boundaries prevent the BFF from becoming a "big ball of mud".
- Seamless integration with the existing Node.js monorepo ecosystem.

### Negative
- Steeper learning curve compared to simple Express applications.

## Technology Watch
- **Market Direction:** NestJS remains the standard for enterprise Node.js applications.
- **Maturity Stage:** Mature.
- **Review Trigger:** Re-evaluate if the Node.js ecosystem shifts toward a more performant standard framework for BFF orchestration.

## Current Sources
- [NestJS Documentation](https://docs.nestjs.com/) (Consulted 2026-06-12)

## References
- [NestJS Documentation](https://docs.nestjs.com/)

## Related Decisions and Standards
- [Core ADR-0030: Two-Tier Distributed Gateway Model](../core/0030-two-tier-distributed-gateway-model.md)
- [Node.js ADR-0002: Clean Hexagonal Architecture](./0002-clean-architecture-nestjs.md)

---
[Back to Index](./README.md)
