# UMS as the Official Applied Reference Model

> Bilingual navigation: [Espanol](./ums-reference-model.es.md)

## Decision

The open-source [User Management System (UMS)](https://github.com/beyondnetcode/ums) is the official executable and product-level reference for this progressive architecture corpus. The local To-Do sandbox has been retired.

## Why the To-Do Sandbox Was Removed

The To-Do example was useful for elementary pattern demonstration, but it could not credibly represent the concerns architects must evaluate in an enterprise product: identity lifecycle, authorization boundaries, auditability, administrative flows, data protection, protocol choices, and extraction pressure. Its local code also blurred the boundary between universal documentation and one technology-specific demo.

## Why UMS Is a Better Baseline

UMS is a public product repository with its own source, product documentation, architecture portal, and construction guidance. It exposes a real bounded problem space: enterprise identity and authorization. Its README identifies a modular monolith using .NET 8, REST commands and GraphQL queries, a React web client, EF Core and SQL Server, supported by architecture and governance documentation.

| Architectural learning | UMS evidence to inspect |
|---|---|
| Bounded contexts and product scope | Identity, Access, Audit, Configuration, Approvals, IGA, and Compliance documentation |
| Clean or hexagonal boundaries | UMS architecture portal and backend source organization |
| Query and command boundary choices | GraphQL queries and REST commands described by UMS |
| Security and accountability | Authorization, identity lifecycle, and audit concerns |
| Progressive adoption | UMS adoption, specialization, and override relationship with this upstream reference |
| Delivery realism | Executable API/web applications, setup guidance, testing, and operational artifacts |

## What Is Inherited From UMS

UMS is evidence, not a replacement for policy. This corpus may learn from UMS through:

1. ADR candidates discovered in a running product and promoted after review.
2. Runtime-specific canonical patterns whose scope is clearly identified.
3. Traceability practices linking business capability, decision, code pattern, and operations.
4. Concrete extraction signals from a modular product with meaningful security boundaries.

## Concepts to Use as Reference

Use UMS to study bounded-context ownership, identity and access contracts, immutable auditing, API protocol separation, result/error handling, observability context propagation, idempotency, and documentation traceability. Do not treat UMS runtime or data-store selections as universal unless an accepted artifact in this repository says so.

## Official Links

| Resource | URL |
|---|---|
| Repository and setup | [UMS README](https://github.com/beyondnetcode/ums/blob/main/README.md) |
| Documentation map | [UMS Master Index](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md) |
| Architecture boundary and adoption model | [UMS Architecture Portal](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |

## Known Gap

The English and Spanish UMS entry documentation should be kept aligned on infrastructure and setup choices. Consumers must follow the current UMS setup instructions and confirm any language-version discrepancy in UMS before adopting product-level details.

---
[Back to UMS Reference Hub](./README.md)
