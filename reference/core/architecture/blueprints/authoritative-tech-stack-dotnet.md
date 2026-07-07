# Authoritative Tech Stack: .NET & C# Ecosystem

> **Bilingual Navigation:** [Versión en Español](../blueprints/authoritative-tech-stack-dotnet.md)

**Document Type:** Runtime Addendum 
**Prerequisite:** MUST be read after the **[Agnostic Baseline](./authoritative-tech-stack-agnostic.md)**. 
**Target Ecosystem:** Heavy-Compute Workers, Legacy Interoperability, Enterprise Batching.

---

## 1. Executive Compliance Matrix (Vendor Mandates)

All engineering squads developing within the .NET ecosystem MUST strictly enforce the authorized artifacts below. Any replacement attempts demand an approved ADR BEFORE writing code.

| Category | Approved Tool / Framework | Validated Version | ADR Required to Swap? | Explicitly Rejected Alternatives |
| :--- | :--- | :--- | :--- | :--- |
| **Runtime Base** | **.NET 8 LTS** | 8.0.x | **YES** | .NET Framework 4.8, .NET 7 (STS) |
| **Web Host** | **ASP.NET Core** | 8.0.x | **YES** | IIS Hosting, Legacy WCF |
| **Relational ORM** | **EF Core (via SQL Server)** | 8.0.x | **YES** | Npgsql, Oracle, MySQL |
| **Validation** | **FluentValidation** | 11.9+ | **NO** | System.ComponentModel (Data Annotations) inside Domain |
| **Unit Testing** | **xUnit** | 2.6.x | **YES** | MSTest, NUnit |
| **Mocking / Stubs** | **Moq 4.x** or **NSubstitute** | Latest | **NO** | WireMock (Allowed for API mocks only) |
| **Formatting** | **CSharpier** | Latest | **NO** | dotnet format (Standard) |
| **Observability** | **OpenTelemetry.Extensions.Hosting** | 1.7+ | **YES** | Application Insights native SDK (Vendor Lock-in) |

> [!TIP]
> **Testing Isolation:** Developers MUST follow the isolation strategy defined in [ADR-0052](../adrs/core/0052-unit-testing-isolation-strategy.md) when using Mocks (interaction verification) or Stubs (state setup).
>
> **Infrastructure Testing:** Integration and E2E tests MUST utilize **Testcontainers** as defined in [ADR-0053](../adrs/core/0053-integration-e2e-testing-strategy.md) to guarantee production parity.

---

## 2. Architecture Implementation (.NET Mapping)

To comply with the overall Hexagonal architecture mandate, the following .NET project organization rules are enforced:

### 2.1 Project Segregation (Solution Structure)
1. **`{BoundedContext}.Domain`**: Plain Old CLR Objects (POCOs). Absolutely **zero NuGet references** outside fundamental `System` libraries. Contains Domain Entities, Value Objects, and Interfaces (Ports).
2. **`{BoundedContext}.Application`**: Implements CQRS commands and use cases via `MediatR`. Coordinates domain logic without knowing about Databases.
3. **`{BoundedContext}.Infrastructure`**: Contains **EF Core DbContext**, SQL Server configurations, Redis client adapters, and external API clients.
4. **`{BoundedContext}.Presentation` (or Web API)**: Entry point containing ASP.NET Controllers or Minimal API endpoints, mapping DTOs to Application Commands.

### 2.2 Error Management Policy
Standard Exception Throwing for control flow is **PROHIBITED**. 
Teams MUST utilize the **Result Pattern** to propagate business logic failures safely. The use of `OneOf<T>` or custom `Result<T, TError>` classes is mandated for Application Layer responses to guarantee compile-time error handling in the Web controllers.

---

## 3. Persistence Details (Entity Framework Core)

### 3.1 Multi-Tenancy Isolation (Application First, SQL Server RLS Second)
When utilizing SQL Server as the persistence engine in .NET:
* The Infrastructure layer MUST implement a `TenantResolver` extracting `tenant_id` from `ClaimsPrincipal`.
* The Application and Infrastructure layers MUST enforce tenant isolation first through EF Core query filters, scoped query composition, or equivalent persistence adapters that automatically apply the active tenant discriminator.
* The `DbContext` MAY additionally utilize `connection.CreateCommand()` inside context opening events or connection interceptors to execute:
 ```sql
 EXEC sp_set_session_context 'tenant_id', @tenantId;
 ```
* SQL Server Row-Level Security is the secondary safety net guarding against raw SQL or developer omissions. It must not be treated as the primary isolation mechanism.

### 3.2 Migrations
Automatic `context.Database.Migrate()` executed directly by the Web host during application startup is **STRONGLY DISCOURAGED** for production clusters. Utilize Entity Framework **SQL Script bundles** inside Kubernetes Init-Containers to safeguard deployment atomic transactions.

---

## 4. Final Integration Warning for Vendors

Failure to satisfy these static tooling definitions will automatically block integration code acceptance. 
-> Back to **[Global Master Index](../../control-center/taxonomy/MASTER_INDEX.md)**

---
[Back to Index](./README.md)
