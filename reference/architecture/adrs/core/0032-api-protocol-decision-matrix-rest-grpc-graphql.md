# ADR-0032: API Protocol Selection Matrix (REST vs gRPC vs GraphQL)

## Status
Approved

## Date
2026-05-11

## Context
As the modular monolith evolves into a multi-module ecosystem with multiple BFFs (Backend For Frontends), mobile apps, and external corporate integrations, selecting the correct communication protocol for each interaction path is critical. Employing a "one-size-fits-all" strategy leads to either underperforming internal traffic (REST) or overly complex browser clients (gRPC/Protobuf). We need a decisive framework guiding developers on exactly which protocol to adopt based on the interaction boundary and consumer type.

## Decision
We establish a **Strict Protocol Fit Matrix** tailored to specific architectural tiers:

### 1. Internal Service-to-Service communication
-> **MANDATE: gRPC (Protocol Buffers over HTTP/2)**
* **Scope**: Synchronous calls between internal bounded contexts (e.g., Order context validating user authorization with Identity context).
* **Rationale**: High performance, binary serialization collapses bandwidth usage, and strict Type-safety through unified `.proto` contracts.

### 2. Public Third-Party & External Integration
-> **MANDATE: REST (JSON over HTTPS)**
* **Scope**: External customer integrations, legacy corporate gateway connections, and global developer public APIs.
* **Rationale**: Industry universality, trivial consumption via standard HTTP libraries, easiest debugging/testing, and broad interactive documentation (OpenAPI/Swagger).

### 3. Frontend Portals & Dynamic BFF Orchestration
-> **MANDATE: REST (Primary) / GraphQL (Targeted Enrichment)**
* **Standard Flows**: Default to conventional REST APIs for transactional commands (Create/Update).
* **Rich/Nested Read Scenarios**: Adopt **GraphQL** strictly at the NestJS BFF level when a screen requires complex data aggregation (fetching Entities, associated Taxonomies, Audits, and relations simultaneously) to prevent mobile/web over-fetching and multiple sequential roundtrips.

### Selection Decision Tree

| Scenario | Preferred Protocol | Justification |
| :--- | :--- | :--- |
| **Machine-to-Machine (Internal)** | **gRPC** | Low latency, binary compaction, strongly typed. |
| **File Uploads/Streams** | **gRPC / REST** | Native streaming capability or simple multipart. |
| **Public Open API / Developer Docs** | **REST** | Absolute standard, easiest vendor adoption. |
| **High-Density Aggregate Dashboards** | **GraphQL** | Resolves under-fetching / recursive lookups. |
| **Low-Power Mobile Data Retrieval** | **GraphQL** | Client strictly defines data shape down to the bit. |
| **Standard CRUD (Save User, Delete Task)** | **REST** | Predictable cacheability, native HTTP semantics. |

## Architecture Guidelines
- **GraphQL Isolation**: GraphQL runtime logic MUST exist only within Tier-2 BFF application nodes. Core domain API definitions never natively support GraphQL resolvers to avoid leaking view-specific constraints into domain business logic.
- **Protobuf Centralization**: All internal gRPC service schemas (.proto) are hosted and versioned in a unified `libs/contracts` workspace to prevent drifted interface models.

## Consequences

### Positive
- Correct application of tools optimizes overall network footprint.
- Empowers frontend velocity by permitting dynamic view query updates without forcing backend deployment cycles (via GraphQL).
- Ensures maximum scalability for microservice interconnects via multiplexed binary pipes.

### Negative
- Developers must navigate three concurrent protocol ecosystems.
- Introduces setup costs for GraphQL execution layers and schema governance tools within BFF stacks.

## References
- [ADR-0027: Dual Protocol Strategy](../../adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.md)
- [ADR-0030: Two-Tier Gateway Patterns](../../adrs/core/0030-two-tier-distributed-gateway-model.md)





## Objective and Scope

Historical backfill: Address the architectural tension where as the modular monolith evolves into a multi-module ecosystem with multiple BFFs (Backend For Frontends), mobile apps, and external corporate integrations, selecting the correct communication protocol for each interaction path is critical, establishing a standard boundary.

## Options Considered

- **Selected:** API Protocol Selection Matrix (REST vs gRPC vs GraphQL)
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0027: Dual Protocol Strategy](../../adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.md)
- [ADR-0030: Two-Tier Gateway Patterns](../../adrs/core/0030-two-tier-distributed-gateway-model.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
