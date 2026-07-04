# [ADR 0041](0041-canonical-dotnet-backend-architecture.md): Canonical .NET (C#) Backend Architecture

## 1. Status
**Status**: Approved 
**Date**: 2026-05-11 
**Scope**: Technology Stack - .NET Specific 

---

## 2. Context
For high-intensity computation workloads, the organization has authorized **.NET (C#)**. To prevent fragmented standards, we must establish a canonical architectural blueprint aligned with existing Hexagonal/Clean principles so Node.js and .NET projects feel syntactically symmetric to the platform team.

---

## 3. Decision
The canonical .NET framework consists of:

### A. Core Configuration
* **Runtime**: .NET 8+ (Long Term Support).
* **Framework**: ASP.NET Core (Minimal APIs optimized for lightweight containerization).
* **Style**: Clean Architecture. Domain project holds zero dependencies on Entity Framework or ASP.NET.

### B. Design Directives
* **Dependency Injection**: Native Microsoft.Extensions.DependencyInjection.
* **Database/ORM**: Entity Framework Core for transactional CRUD; **Dapper** authorized for performance-sensitive ETL/Batch high-read workloads.
* **Validation**: FluentValidation (mirroring Node's class-validator intent).
* **Error Flow**: Return-Type based using libraries like `OneOf` or Custom `Result` objects, matching [ADR-0038](../nodejs/0038-error-handling-result-pattern-strategy.md) functional mindset.
* **Async/Workers**: Use of `BackgroundService` (IHostedService) for native high-concurrency batch processing.

### C. Testing Standard
* **Unit**: xUnit + FluentAssertions.
* **Integration**: WebApplicationFactory + **Testcontainers.NET**.
* **Contract**: PactNet (verifying consumer contracts with Node.js BFFs).

---

## 4. Consequences

### Positive
* **High-Efficiency**: Massive concurrency throughput for worker pools.
* **Design Symmetricity**: A developer switching from Node.js to .NET will find the same Domain/Application/Infrastructure separation, reducing friction.

### Negative
* **Operational Footprint**: Slightly larger memory idle state compared to lightweight node scripts, mitigated by trimming and AOT compilation.







## Objective and Scope

Historical backfill: Address the architectural tension where context is unavailable, establishing a standard boundary.

## Options Considered

- **Selected:** Canonical .NET (C#) Backend Architecture
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

None explicitly linked.

## Technology Watch (Trends, Maturity, Adoption, Support)

.NET is a mature, mainstream platform with strong Microsoft backing and long-term support guarantees (LTS releases every 2 years, 3+ years of support per LTS). ASP.NET Core has dominant market share in enterprise .NET web development. The platform shows steady growth in cross-platform adoption since .NET Core, with strong community signals (GitHub stars, NuGet downloads). Expected vigencia: 5+ years as a primary enterprise backend platform.

## Current Sources

- .NET documentation and release policy — https://learn.microsoft.com/en-us/dotnet, consulted 2026-06-20.
- NuGet download statistics — https://www.nuget.org, consulted 2026-06-20.
- Stack Overflow Developer Survey on .NET adoption — https://survey.stackoverflow.co, consulted 2026-06-20.

---
[Back to Index](./README.md)
