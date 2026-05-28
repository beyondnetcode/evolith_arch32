# .NET API Standard

> Bilingual navigation: [Espanol](./api-dotnet-standard.es.md)

## 1. Purpose

This standard defines the reusable Evolith baseline for enterprise .NET APIs. It covers host bootstrap, layered architecture, command and query surfaces, validation, persistence, tenancy, observability, resilience, security, background processing, documentation, and quality gates.

This standard is not a copy of any product implementation. UMS can be used as applied evidence, but UMS-specific details remain local unless promoted through ADR, governance standard, or canonical pattern.

## 2. Authority and scope

| Area | Evolith standard | Product applied reference |
|---|---|---|
| API architecture | Normative baseline | Must comply or document deviation |
| Bootstrap | Normative composition rules | May specialize through product bootstrappers |
| Application layer | Normative boundary rules | Owns concrete commands, queries, handlers, validators |
| Infrastructure | Normative integration boundaries | Owns concrete persistence, providers, and adapters |
| API surface | Normative responsibility split | Owns concrete routes, schemas, and modules |
| Observability | Mandatory capabilities | Owns concrete sinks, values, and dashboards |

## 3. Recommended enterprise .NET API profile

The default profile for an Evolith .NET API SHOULD use:

| Concern | Recommended profile |
|---|---|
| Runtime | .NET 10 or the approved current LTS/STS profile |
| Host | ASP.NET Core minimal host |
| API surface | REST for commands and GraphQL or REST for queries based on product needs |
| Application orchestration | Mediator or equivalent application boundary |
| Validation | Pipeline validation before handler execution |
| Persistence | EF Core with SQL Server as the default enterprise relational profile unless another provider is approved |
| Errors | Problem Details and user-safe error contracts |
| Observability | Structured logs, correlation IDs, traces, metrics, and health checks |
| Resilience | Timeouts, retries, circuit breakers, rate limits, and idempotency where applicable |
| Security | Authentication, authorization, security headers, tenant isolation, and secret governance |

Any tool or runtime profile that becomes mandatory across products requires ADR approval.

## 4. Boilerplate structure

A product .NET API SHOULD use this structure or document an equivalent mapping:

```text
src/
  apps/
    <product>.api/
      <Product>.Domain/
      <Product>.Application/
      <Product>.Infrastructure/
      <Product>.Presentation/
      <Product>.Presentation.IntegrationTest/
      <Product>.Application.Test/
      <Product>.Domain.Test/
```

Layer rules:

1. Domain MUST remain independent from infrastructure frameworks.
2. Application MUST orchestrate use cases and depend on abstractions, not concrete infrastructure.
3. Infrastructure MUST implement persistence, external adapters, messaging, telemetry sinks, and provider integrations.
4. Presentation MUST expose HTTP, GraphQL, documentation, middleware, and API pipeline composition.
5. Tests SHOULD be organized by layer and by externally visible behavior.

## 5. Host bootstrap

The API host MUST be small and compositional.

Required elements:

- Early structured logging bootstrap.
- Secret source configuration before service registration.
- Modular service registration through bootstrappers or equivalent composition units.
- Explicit platform initialization boundary.
- Explicit middleware pipeline boundary.
- Explicit API surface mapping boundary.

The host file SHOULD delegate complex setup to named extension methods or bootstrappers.

## 6. Application layer

The application layer MUST define use-case boundaries.

Rules:

1. Commands and queries SHOULD be modeled explicitly.
2. Handler execution SHOULD be mediated through a single application boundary.
3. Validation MUST run before business handler execution.
4. Result or equivalent typed outcomes SHOULD be preferred over exceptions for expected business flow.
5. Technical policies such as transactions, audit, retries, and tenant validation SHOULD be applied through explicit pipeline behaviors, decorators, or aspects.

## 7. API surface governance

API surfaces MUST have clear responsibility.

Rules:

1. Commands SHOULD be REST-first when transactional clarity and HTTP semantics matter.
2. Queries MAY be REST or GraphQL when read-shape flexibility is required.
3. API versioning MUST be explicit for public or product-facing APIs.
4. Health endpoints MUST be separate from business endpoints.
5. Development-only endpoints MUST be gated by environment.
6. OpenAPI or equivalent documentation MUST describe the REST surface.
7. GraphQL schemas MUST be documented and governed when GraphQL is used.

## 8. Persistence and data governance

Persistence MUST be provider-governed and boundary-driven.

Rules:

1. SQL Server is the default enterprise relational provider unless an ADR approves another provider.
2. EF Core DbContext configuration MUST live in infrastructure.
3. Repository interfaces SHOULD be owned by domain or application boundaries according to the product architecture.
4. Provider switches MUST be configuration-driven.
5. Migrations, schema bootstrap, and seed data MUST be explicit and environment-safe.
6. Audit stamping, tenant filters, and consistency interceptors MUST be documented.
7. Outbox or equivalent reliable dispatch MUST be used for domain events that cross transaction boundaries.

## 9. Tenancy and execution context

Multi-tenant APIs MUST protect tenant isolation at multiple layers.

Required capabilities:

- Request context accessor or equivalent execution context boundary.
- Application-layer tenant filtering as the primary isolation mechanism.
- Infrastructure failsafes such as SQL Server row-level security where approved.
- Tenant-aware logging and observability.
- Tenant validation on commands and queries that access tenant-owned data.

Product-specific header names and claim names remain local product contracts.

## 10. Observability and operations

APIs MUST emit operationally useful telemetry.

Required capabilities:

1. Structured request logging.
2. Correlation ID propagation.
3. Trace and span identifiers where distributed tracing is enabled.
4. Health endpoints for liveness and readiness.
5. Metrics and tracing via OpenTelemetry or approved equivalent.
6. User-safe error identifiers for troubleshooting.
7. Reduced noise for health-check logs.

## 11. Resilience and reliability

APIs SHOULD include reliability controls proportional to risk.

Recommended controls:

- Rate limiting by tenant, user, API key, or IP fallback.
- Retry and circuit breaker policies around transient infrastructure.
- Idempotency for mutating operations that may be retried.
- Token revocation or equivalent session invalidation where authentication supports it.
- Background workers for outbox and audit persistence.
- Readiness checks that include critical dependencies and backlog health.

## 12. Security and secrets

Rules:

1. Secret sources MUST be explicit and environment-aware.
2. User secrets are allowed for development only.
3. Managed identity or equivalent SHOULD be preferred for cloud secret stores.
4. Authentication MUST be explicit and configurable.
5. Development authentication MUST never be enabled in production.
6. Swagger security definitions MUST not imply production bypasses.
7. Security headers and CORS MUST be centrally configured.

## 13. Documentation and quality gates

Minimum documentation:

- API standard or applied reference.
- API surface map.
- Persistence provider and schema strategy.
- Tenancy model.
- Observability and health-check model.
- Local deviations from Evolith.

Minimum gates:

- Build.
- Unit tests for domain and application logic.
- Integration tests for API and persistence behavior.
- Validation of OpenAPI/GraphQL contracts where applicable.
- Architecture checks for layer boundaries where feasible.

## 14. Promotion path from product to Evolith

A product API practice may be promoted only when it satisfies all conditions:

1. It is reusable across more than one product context.
2. It is not coupled to product domain language, routes, headers, or seed data.
3. It has implementation evidence or review evidence.
4. It is documented in Evolith as a standard, ADR, or canonical pattern.
5. Product examples remain examples, not authority.

## 15. Required applied-reference mapping

Every product applying this standard SHOULD maintain a mapping document with:

| Evolith topic | Product artifact | Classification |
|---|---|---|
| Host bootstrap | Product Program or host file | Applied evidence |
| Service composition | Product bootstrapper or DI module | Applied evidence |
| API surface | REST/GraphQL route mapping | Applied evidence |
| Persistence | DbContext, repositories, migrations, provider config | Local implementation |
| Tenancy | Request context, tenant filters, tenant validation | Applied evidence with local contracts |
| Observability | Logging, tracing, health, metrics | Applied evidence |
| Deviations | Local ADRs or local decisions | Must be justified |

---
[Back to API Standard Portal](./README.md)
