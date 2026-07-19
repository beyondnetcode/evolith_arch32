# [ADR 0027](0027-dual-protocol-rest-grpc-api-gateway.md): Dual-Protocol API Strategy (REST & gRPC)

## Status
Accepted

## Date
2026-05-09

## Context
Exposing internal inter-microservice chatter via standard JSON HTTP/1.1 REST APIs leads to massive performance degradation (verbose strings, text decoding cycles). However, absolute external exposure must remain standard REST to preserve third-party developer accessibility. One single protocol will not satisfy both internal efficiency and external compatibility.

## Decision
Orchestrate a strict **Dual-Protocol Runtime Edge** paired with Kong Gateway orchestration:

1. **Standard REST (Public)**: All browser agents, client portal apps, and B2B gateways consume secure, documented JSON REST APIs over standard HTTPS.
2. **Binary gRPC (Internal)**: Any mission-critical internal authorization handshake, machine-to-machine token check, or cross-service stream transmits strictly over binary Google Remote Procedure Call (gRPC) leveraging dense Protocol Buffer payloads.
3. **Unified Sourcing**: Drive internal contracts natively using master `.proto` definitions tracked central in the Nx monorepo `libs/contracts`, automatically compiling clean Typescript code-gen bindings.

## Consequences

### Positive
- Collapses internal payload bandwidth footprint.
- Drastically accelerates backend-to-backend validation latency using multiplexed HTTP/2 pipelines.
- Preserves simple public swagger discoverability for global corporate developers.

### Negative
- Developers must generate and compile Proto libraries locally, slightly complicating local developer workstation ramp-up time.

## References
- [ADR-0002: Clean Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)
- [gRPC Official Site](https://grpc.io/)







## Objective and Scope

Historical backfill: Address the architectural tension where exposing internal inter-microservice chatter via standard JSON HTTP/1, establishing a standard boundary.

## Options Considered

- **Selected:** Dual-Protocol API Strategy (REST & gRPC)
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0002: Clean Architecture](../../adrs/nodejs/0002-clean-architecture-nestjs.md)
- [gRPC Official Site](https://grpc.io/)

## Technology Watch (Trends, Maturity, Adoption, Support)

Both REST and gRPC protocols are mature and widely adopted. gRPC (CNCF graduated) is in the growth stage for inter-service communication with strong performance advantages. REST remains dominant for public-facing APIs. The dual-protocol strategy is a recognized pattern in microservice architectures, with API gateways providing protocol translation. The pattern is well-demonstrated by major adopters (Netflix, Google, Lyft). Expected vigencia: REST and gRPC each 5+ years; the dual-protocol pattern is a durable architectural approach.

## Current Sources

- gRPC documentation — https://grpc.io, consulted 2026-06-20.
- REST API guidelines (Microsoft) — https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design, consulted 2026-06-20.
- Google Cloud API design guide — https://cloud.google.com/apis/design, consulted 2026-06-20.

---
[Back to Index](./README.md)
