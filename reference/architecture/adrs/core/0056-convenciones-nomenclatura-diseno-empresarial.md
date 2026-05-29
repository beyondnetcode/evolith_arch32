# ADR-0056: Enterprise Naming and Design Conventions - Multi-Language, Multi-Platform

## Status

**Proposed** - Extends and replaces the naming scope of [ADR-0049 (Clean Code Naming Semantics)](./0049-naming-semantics-clean-code-policy.md) with binding, language-specific and platform-specific rules.

## Date

2026-05-15

## Authors

Principal Software Architect

---

## 1. Context

This organization operates a polyglot, multi-platform architecture spanning:

- **Runtimes:** C# / .NET 8, Java 21, TypeScript / Node.js 20, Python 3.12
- **APIs:** REST (OpenAPI 3.1), gRPC, GraphQL (satellite services only)
- **Databases:** SQL Server 2022, PostgreSQL 16, analytical stores (BigQuery / Synapse)
- **Messaging:** Domain events (CloudEvents 1.0), commands, integration events via RabbitMQ / Dapr pub/sub
- **Design paradigm:** Domain-Driven Design (DDD) - strategic and tactical
- **Quality standard:** ISO/IEC 25010 (maintainability, reliability, portability)
- **Metadata standard:** ISO/IEC 11179 (data element naming)

Inconsistent naming is the most frequent source of friction in new member onboarding, integration bugs, and incorrect security configurations. A binding corporate standard eliminates ambiguity and enables automated compliance.

---

## 2. Problem Statement

The absence of a unified naming policy produces:

| Symptom | Impact |
| :--- | :--- |
| `userId` in API, `user_id` in DB, `UserId` in code - three names for the same concept | Integration bugs, manual mapping overload |
| `GetUser`, `FetchUser`, `RetrieveUser` - synonyms for the same operation | Inconsistent documentation, cognitive overload |
| Event types like `user.created`, `UserCreated`, `USER_CREATED` - all in production | Impossible to build reliable event consumers |
| Table `tbl_usr` vs `users` vs `User` across teams | Migration complexity, query errors |
| Abbreviations: `prd`, `cust`, `auth_tkn` | Ambiguity, reduced searchability |

---

## 3. Decision

Adopt a **single binding naming standard with automated compliance**, based on four pillars:

1. **The Ubiquitous Language as Source of Truth.** Every name in code, API, database, and events comes from the domain glossary.
2. **Native conventions per ecosystem.** Each language and platform follows its community standard with DDD extensions.
3. **One concept, multiple representations.** A domain concept has exactly one canonical name in the ubiquitous language, rendered according to the rules of each layer.
4. **Automation over documentation.** Every rule must be verifiable by a linter, analyzer, or CI gate.

### 3.1 Canonical Name Derivation Rule

```
Ubiquitous Language Term (noun/verbal phrase in English)
    │
    |- C#         -> PascalCase class / camelCase member
    |- Java       -> PascalCase class / camelCase member
    |- TypeScript -> PascalCase class / camelCase member
    |- Python     -> PascalCase class / snake_case member
    |- REST URL   -> kebab-case path segment
    |- JSON body  -> camelCase property
    |- SQL Table  -> snake_case plural noun
    |- SQL Column -> snake_case
    `- Event type -> {domain}.{entity}.{past-participle} (dot, lowercase)
```

**Example - concept: "Work Order"**

| Layer | Representation |
| :--- | :--- |
| Ubiquitous Language | Work Order |
| C# Class | `WorkOrder` |
| C# Property | `workOrderId` |
| Java Class | `WorkOrder` |
| TypeScript Interface | `WorkOrder` |
| Python Class | `WorkOrder` |
| Python Attribute | `work_order_id` |
| REST Endpoint | `GET /v1/work-orders/{work-order-id}` |
| JSON Property | `"workOrderId"` |
| SQL Table | `work_orders` |
| SQL Column | `work_order_id` |
| Domain event type | `operations.work-order.created` |
| Analytical fact table | `fct_work_orders` |

---

## 4. Alternatives Considered

### 4.1 Complete snake_case (Python-centered)
**Rejected.** Violates C# and Java idioms. Forces non-idiomatic code in strongly-typed languages where compilers and IDEs assume PascalCase for types. ISO/IEC 25010 maintainability demands conventional alignment with each ecosystem.

### 4.2 Complete camelCase (JavaScript-centered)
**Rejected.** `workOrderId` as a SQL column name is non-idiomatic, breaks SQL Server and PostgreSQL conventions, and reduces legibility in DDL.

### 4.3 Team autonomy with shared glossary
**Rejected.** Creates integration inconsistencies. When Team A names the API field `customerId` and Team B names the DB column `customer_code`, synchronization failures generate costly data bugs to track.

### 4.4 Chosen: Ecosystem-native per layer, canonical concept from ubiquitous language
**Adopted.** Respects each community standard. Automatable via linters. The canonical name in the ubiquitous language acts as a stable anchor - each layer renders it according to its own rules.

---

## 5. Per-Language Rules

### 5.1 C# / .NET 8

Follows [Microsoft .NET Naming Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/naming-guidelines) with DDD extensions.

| Construction | Convention | Example |
| :--- | :--- | :--- |
| Namespace | PascalCase, domain-aligned | `Acme.Orders.Domain.Aggregates` |
| Class / Struct / Record | PascalCase | `WorkOrder`, `Money` |
| Interface | Prefix `I` + PascalCase | `IWorkOrderRepository` |
| Enum | PascalCase; members PascalCase | `OrderStatus.Confirmed` |
| Method | PascalCase (verbal phrase) | `CalculateTotalCost()` |
| Property | PascalCase | `WorkOrderId` |
| Private field | Prefix `_` + camelCase | `_workOrderId` |
| Local variable | camelCase | `workOrderId` |
| Constant | PascalCase (not UPPER_SNAKE) | `MaxRetryCount` |
| Generic parameter | Prefix `T` + PascalCase noun | `TEntity`, `TResult` |
| Async method | Suffix `Async` | `GetWorkOrderAsync()` |
| Test class | `{Subject}Tests` | `WorkOrderTests` |
| Test method | `{Method}_When{Condition}_Should{Result}` | `Complete_WhenAlreadyClosed_ShouldReturnFailure` |

**DDD conventions in C#:**

```csharp
// Aggregate Root
public sealed class WorkOrder : AggregateRoot<WorkOrderId> { }

// Value Object (immutable)
public sealed record Money(decimal Amount, Currency Currency);

// Domain event (past tense)
public sealed record WorkOrderCreatedEvent(WorkOrderId WorkOrderId, ...) : DomainEvent;

// Command (imperative)
public sealed record CreateWorkOrderCommand(...) : IRequest<Result<WorkOrderId>>;

// Query (question)
public sealed record GetWorkOrderByIdQuery(WorkOrderId Id) : IRequest<Result<WorkOrderDto>>;

// Repository port
public interface IWorkOrderRepository { }

// Domain service (stateless)
public sealed class WorkOrderPricingService { }

// Specification
public sealed class OpenWorkOrdersSpecification : Specification<WorkOrder> { }

// Policy
public sealed class LateDeliveryPenaltyPolicy { }
```

---

### 5.2 Java 21

Follows [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html) with DDD extensions.

| Construction | Convention | Example |
| :--- | :--- | :--- |
| Package | lowercase, domain-aligned | `com.acme.orders.domain.aggregates` |
| Class / Interface / Enum | PascalCase | `WorkOrder`, `WorkOrderRepository` |
| Method | camelCase (verbal phrase) | `calculateTotalCost()` |
| Field | camelCase | `workOrderId` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Test class | `{Subject}Test` | `WorkOrderTest` |

> **Difference from C#:** Java uses UPPER_SNAKE_CASE for constants. Interfaces do **not** carry `I` prefix - implementation carries descriptive prefix (`JpaWorkOrderRepository`).

---

### 5.3 TypeScript / JavaScript

Follows [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) with DDD extensions.

| Construction | Convention | Example |
| :--- | :--- | :--- |
| Filename | kebab-case | `work-order.aggregate.ts` |
| Class | PascalCase | `WorkOrder` |
| Interface | PascalCase (no `I` prefix) | `WorkOrderRepository` |
| Type alias | PascalCase | `WorkOrderId` |
| Function / Method | camelCase | `calculateTotalCost()` |
| Variable / Property | camelCase | `workOrderId` |
| Module constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| React component | PascalCase | `WorkOrderCard` |
| React hook | Prefix `use` + camelCase | `useWorkOrderList()` |

**File suffix by layer:**

| Suffix | Purpose |
| :--- | :--- |
| `.aggregate.ts` | DDD Aggregate Root |
| `.entity.ts` | DDD Entity |
| `.value-object.ts` | Value Object |
| `.repository.ts` | Port (interface) |
| `.repository.impl.ts` | Adapter (implementation) |
| `.use-case.ts` | Application use case |
| `.command.ts` | Command object |
| `.query.ts` | Query object |
| `.event.ts` | Domain event |
| `.dto.ts` | Data Transfer Object |
| `.controller.ts` | HTTP Controller |
| `.spec.ts` | Unit test |

---

### 5.4 Python 3.12

Follows [PEP 8](https://peps.python.org/pep-0008/) with DDD extensions.

| Construction | Convention | Example |
| :--- | :--- | :--- |
| Module / file | snake_case | `work_order_repository.py` |
| Package | snake_case | `orders/domain/aggregates/` |
| Class | PascalCase | `WorkOrder` |
| Exception class | PascalCase + suffix `Error` | `WorkOrderNotFoundError` |
| Function / Method | snake_case (verbal phrase) | `calculate_total_cost()` |
| Variable / Attribute | snake_case | `work_order_id` |
| Private attribute | Prefix `_` + snake_case | `_work_order_id` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Value Object (dataclass) | PascalCase, `frozen=True` | `@dataclass(frozen=True) class Money:` |
| Test file | `test_{subject}.py` | `test_work_order.py` |

---

### 5.5 SQL (SQL Server 2022 and PostgreSQL 16)

Follows ISO/IEC 11179 metadata naming principles.

| Construction | Convention | Example |
| :--- | :--- | :--- |
| Schema | snake_case, domain-aligned | `orders`, `billing`, `audit` |
| Table | snake_case, **plural noun** | `work_orders`, `order_items` |
| Column | snake_case | `work_order_id`, `created_at` |
| Primary key | `id` (surrogate) | `id` |
| FK column | `{referenced_table_singular}_id` | `customer_id` |
| FK constraint | `fk_{table}_{referenced_table}` | `fk_order_items_work_orders` |
| PK constraint | `pk_{table}` | `pk_work_orders` |
| UNIQUE constraint | `uq_{table}_{columns}` | `uq_work_orders_reference_number` |
| CHECK constraint | `ck_{table}_{rule}` | `ck_work_orders_status_valid` |
| Index | `ix_{table}_{columns}` | `ix_work_orders_customer_id_status` |
| View | `v_{name}` | `v_open_work_orders` |
| Stored procedure | `sp_{verb}_{noun}` | `sp_complete_work_order` |
| Function | `fn_{verb}_{noun}` | `fn_calculate_order_total` |
| Trigger | `tr_{table}_{event}` | `tr_work_orders_after_update` |
| Migration file | `{timestamp}_{description}.sql` | `20260515_143000_add_work_orders_table.sql` |
| Audit columns | `created_at`, `updated_at`, `created_by`, `updated_by` | Mandatory on all tables |

---

## 6. DDD Naming Rules

All names must come from the **ubiquitous language glossary** defined by bounded context. Names not present in the glossary require a glossary update before writing code.

### 6.1 Aggregates
- Ubiquitous language noun. No technical suffixes (`Aggregate`, `Root`).

```csharp
// OK: Correct
public sealed class WorkOrder : AggregateRoot<WorkOrderId> { }

// MAL: Incorrect - redundant suffix
public sealed class WorkOrderAggregate : AggregateRoot<WorkOrderId> { }
```

### 6.2 Domain Events
- **Format:** `{Aggregate}{PastParticiple}` - always past tense.
- Suffix `Event` in OO languages. **Not** in the CloudEvents `type` field.

```csharp
// OK: Correct
public sealed record WorkOrderCreatedEvent(...) : DomainEvent;
public sealed record WorkOrderCompletedEvent(...) : DomainEvent;

// MAL: Incorrect - present / imperative
public sealed record WorkOrderCreate(...) : DomainEvent;
public sealed record CreateWorkOrderEvent(...) : DomainEvent;
```

### 6.3 Commands
- **Format:** `{ImperativeVerb}{Noun}Command`

```csharp
public sealed record CreateWorkOrderCommand(...) : IRequest<Result<WorkOrderId>>;
public sealed record CompleteWorkOrderCommand(...) : IRequest<Result>;
```

### 6.4 Queries
- **Format:** `Get{Noun}By{Criteria}Query` or `List{PluralNoun}Query`

```csharp
public sealed record GetWorkOrderByIdQuery(WorkOrderId Id) : IRequest<Result<WorkOrderDto>>;
public sealed record ListOpenWorkOrdersQuery(CustomerId Id) : IRequest<Result<IReadOnlyList<WorkOrderSummaryDto>>>;
```

### 6.5 Domain Errors
- **Prefer `Result<T>` over exceptions** for business errors.
- Error codes: `{domain}.{entity}.{error-slug}` - lowercase, dot-separated.

```csharp
// OK: Preferred
public static readonly DomainError WorkOrderNotFound =
    new("orders.work-order.not-found", "The work order does not exist.");

// MAL: Avoid - business error as exception
throw new WorkOrderNotFoundException();
```

---

## 7. API / OpenAPI 3.1 Rules

| Rule | Convention | Example |
| :--- | :--- | :--- |
| Resource segments | kebab-case, plural noun | `/work-orders`, `/order-items` |
| Path parameters | kebab-case | `/work-orders/{work-order-id}` |
| Domain actions | Verbal suffix after resource | `/work-orders/{id}/complete` |
| Versioning | URL prefix `/v{N}` | `/v1/work-orders` |
| Query parameters | camelCase | `?pageSize=20&sortBy=createdAt` |
| operationId | camelCase, verbal phrase | `createWorkOrder`, `getWorkOrderById` |
| JSON properties | camelCase | `"workOrderId"`, `"referenceNumber"` |
| Dates/times | ISO 8601 | `"2026-05-15T14:30:00Z"` |

---

## 8. Events - CloudEvents 1.0

### Event type naming pattern

```
{organization-domain}.{bounded-context}.{entity}.{verb-past-participle}
```

```json
{
  "specversion": "1.0",
  "type": "acme.orders.work-order.created",
  "source": "/services/orders-api/v1",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "time": "2026-05-15T14:30:00Z",
  "datacontenttype": "application/json",
  "subject": "work-orders/WO-2026-00123",
  "data": {
    "workOrderId": "...",
    "referenceNumber": "WO-2026-00123",
    "status": "Draft"
  }
}
```

**Prohibited naming:**
```
MAL:  UserCreated           (no org/context prefix)
MAL:  user_created          (snake_case - violates CloudEvents)
MAL:  USER_CREATED          (UPPER_SNAKE - illegible in logs)
MAL:  acme.orders.CreateUser (present tense)
OK   acme.identity.user.registered
```

---

## 9. Data Warehouse and Analytics

### 9.1 Layer prefixes (Kimball)

| Layer | Prefix | Purpose |
| :--- | :--- | :--- |
| Staging | `stg_` | Raw ingested data |
| Intermediate | `int_` | Joined and cleaned data |
| Fact table | `fct_` | Business process measurements |
| Dimension table | `dim_` | Descriptive attributes |
| Bridge table | `brd_` | Many-to-many dimensions |
| Aggregate / mart | `agg_` | Pre-aggregated for consumption |

### 9.2 Column conventions

| Pattern | Convention | Example |
| :--- | :--- | :--- |
| Surrogate key | `{table}_key` | `work_order_key` |
| Business key | `{entity}_{id}_bk` | `work_order_reference_bk` |
| FK to dimension | `{dim_without_prefix}_key` | `customer_key` |
| Date key | `{context}_date_key` | `created_date_key` |
| Measures | snake_case + unit if ambiguous | `total_cost_usd`, `duration_seconds` |
| Boolean flags | `is_{condition}` or `has_{condition}` | `is_late`, `has_penalty` |
| Timestamps | `{event}_at` | `created_at`, `ingested_at` |
| ETL metadata | `etl_{attribute}` | `etl_batch_id`, `etl_source_system` |

---

## 10. Complete Mapping Table

| Ubiquitous Language | C# | Java | TypeScript | Python | REST URL | JSON | SQL Table | SQL Column | Event Type | DW Fact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Work Order | `WorkOrder` | `WorkOrder` | `WorkOrder` | `WorkOrder` | `/work-orders` | `workOrderId` | `work_orders` | `work_order_id` | `*.work-order.created` | `fct_work_orders` |
| Order Item | `OrderItem` | `OrderItem` | `OrderItem` | `OrderItem` | `/order-items` | `orderItemId` | `order_items` | `order_item_id` | `*.order-item.added` | `fct_order_items` |
| Customer | `Customer` | `Customer` | `Customer` | `Customer` | `/customers` | `customerId` | `customers` | `customer_id` | `*.customer.registered` | `dim_customers` |
| Created At | `CreatedAt` | `createdAt` | `createdAt` | `created_at` | `createdAt` (param) | `createdAt` | - | `created_at` | `time` (CloudEvents) | `created_date_key` |
| Total Cost | `TotalCost` (Money VO) | `totalCost` | `totalCost` | `total_cost` | - | `totalCost.amount` | - | `total_cost_usd` | `data.totalCost` | `total_cost_usd` |

---

## 11. Validation Tools

### 11.1 Per Language

| Language | Formatter | Linter | Static Analyzer |
| :--- | :--- | :--- | :--- |
| C# | `dotnet format` | Roslyn + `StyleCop.Analyzers` | SonarQube |
| Java | Google Java Format | Checkstyle (Google config) | SonarQube, SpotBugs |
| TypeScript | Prettier | ESLint (`@typescript-eslint`, `eslint-plugin-sonarjs`) | SonarQube |
| Python | Black + isort | Flake8 + pylint | SonarQube |
| SQL | `sqlfluff` | `sqlfluff lint` | `sqlfluff fix` |

### 11.2 Architectural Boundary Compliance

| Language | Tool | Rule |
| :--- | :--- | :--- |
| C# | ArchUnitNET | Domain layer cannot reference Infrastructure |
| Java | ArchUnit | `noClasses().that()...resideInPackage("..domain..")` |
| TypeScript | `eslint-plugin-boundaries` | `domain` cannot import from `infrastructure` |
| Python | `import-linter` | Contracts in `.importlinter` |

### 11.3 API and Event Linting

| Tool | What it validates |
| :--- | :--- |
| `spectral` (Stoplight) | OpenAPI 3.1 - operationId format, kebab-case paths |
| `sqlfluff` | SQL syntax, capitalization conventions, explicit aliases |
| CloudEvents SDK | Event envelope schema validation |

### 11.4 SonarQube Quality Gates

| Metric | Threshold |
| :--- | :--- |
| Coverage (new code) | >= 80% |
| Duplicated lines (new code) | <= 3% |
| Maintainability rating (new code) | A |
| Reliability rating (new code) | A |
| Security hotspots reviewed | 100% |
| Cognitive complexity per method | <= 15 |
| Naming convention violations | 0 |

---

## 12. Exception Policy

An exception to naming rules may be granted **only** under the following conditions:

1. **Immutable external contract.** A third-party system demands a specific naming format. The exception must be isolated in the adapter / anti-corruption layer.
2. **Regulatory requirement.** A regulatory body requires a specific field name in a reporting format. Only the output transformer is excepted.
3. **Legacy system migration (with deadline).** During a migration phase, legacy names may coexist. The exception must have an expiration date no longer than 6 months.

**Exceptions do NOT apply to:**
- Greenfield code
- Internal API-to-API communication
- Domain layer names (the ubiquitous language is non-negotiable)

---

## 13. Definition of Done (DoD)

A code artifact is **Done** from a naming perspective when **all** of the following pass:

```
[ ] All names follow the bounded context's ubiquitous language glossary
[ ] Capitalization conventions per language applied (0 linter violations)
[ ] No abbreviations (except approved acronyms: ID, URL, HTTP, API, DTO, ORM, JWT, SQL)
[ ] SQL objects follow schema/table/column/constraint rules
[ ] OpenAPI: operationId in camelCase; paths in kebab-case; JSON properties in camelCase
[ ] CloudEvents: type follows pattern {org}.{context}.{entity}.{past-tense}
[ ] No magic strings with field names (use constants or nameof())
[ ] SonarQube gate passes (0 naming violations, maintainability A)
[ ] PR description references the ubiquitous language term from the bounded context glossary
[ ] sqlfluff lint returns 0 violations in all migration scripts
[ ] spectral lint returns 0 errors in affected OpenAPI specs
```

---

## 14. Correct vs Incorrect Examples

### 14.1 C# - Aggregate

```csharp
// CORRECT
public sealed class WorkOrder : AggregateRoot<WorkOrderId>
{
    public WorkOrderId Id { get; private init; }
    public ReferenceNumber ReferenceNumber { get; private set; }
    public WorkOrderStatus Status { get; private set; }

    public static WorkOrder Create(CustomerId customerId, string referenceNumber)
    {
        var order = new WorkOrder { /* ... */ };
        order.Raise(new WorkOrderCreatedEvent(order.Id, customerId));
        return order;
    }
}

// INCORRECT
public class WrkOrdAggregat  // abbreviation + suffix
{
    public int Id { get; set; }      // integer ID, no strong type
    public string stat { get; set; }  // lowercase, abbreviated
}
```

### 14.2 SQL - Table and constraints

```sql
-- OK CORRECT
CREATE TABLE orders.work_orders (
    id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    reference_number VARCHAR(50)      NOT NULL,
    customer_id      UNIQUEIDENTIFIER NOT NULL,
    status           VARCHAR(30)      NOT NULL DEFAULT 'Draft',
    created_at       DATETIMEOFFSET   NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by       NVARCHAR(256)    NOT NULL,
    CONSTRAINT pk_work_orders            PRIMARY KEY (id),
    CONSTRAINT uq_work_orders_ref_number UNIQUE (reference_number),
    CONSTRAINT ck_work_orders_status     CHECK (status IN ('Draft','Confirmed','InProgress','Completed','Cancelled')),
    CONSTRAINT fk_work_orders_customers  FOREIGN KEY (customer_id) REFERENCES customers.customers(id)
);
CREATE INDEX ix_work_orders_customer_status ON orders.work_orders (customer_id, status);

-- MAL: INCORRECT
CREATE TABLE tbl_WrkOrd (
    WrkOrdID INT IDENTITY,
    CustID   INT,
    Stat     VARCHAR(1),
    dt       DATETIME
);
```

### 14.3 CloudEvents

```json
// CORRECT
{
  "type": "acme.orders.work-order.created",
  "time": "2026-05-15T14:30:00Z",
  "data": { "workOrderId": "...", "referenceNumber": "WO-2026-00123" }
}

// INCORRECT
{
  "type": "WorkOrderCreated",
  "timestamp": "15-05-2026",
  "payload": { "work_order_id": "...", "ref": "WO-2026-00123" }
}
```

---

## 15. Consequences

### Positives

- **Maintainability (ISO/IEC 25010).** Consistent naming reduces cognitive load and accelerates new member onboarding.
- **Integration reliability.** A single concept name prevents data mapping bugs between API, database, and event consumers.
- **Automated compliance.** All rules are verifiable by existing tools.
- **DDD alignment.** The ubiquitous language as the source of names eliminates the "translation layer" between business and engineering.

### Negatives

- **Migration cost.** Existing non-conforming codebases require phased refactoring.
- **Learning curve.** Teams switching languages must internalize per-layer rendering rules.
- **Linters may slow initial PRs.** IDE plugin investment reduces friction.

---

## 16. References

- [Microsoft .NET Naming Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/naming-guidelines)
- [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [PEP 8 - Python Style Guide](https://peps.python.org/pep-0008/)
- [CloudEvents Specification 1.0](https://cloudevents.io)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [ISO/IEC 11179 - Metadata Registers](https://www.iso.org/standard/60525.html)
- [ISO/IEC 25010 - Systems and Software Quality](https://www.iso.org/standard/35733.html)
- [Spectral - OpenAPI Linter](https://stoplight.io/open-source/spectral)
- [sqlfluff - SQL Linter](https://docs.sqlfluff.com)
- [ADR-0049 - Clean Code Naming Semantics](./0049-naming-semantics-clean-code-policy.md) <- scope superseded
- [ADR-0048 - Enterprise Taxonomy and Reference Layout](./0048-enterprise-taxonomy-reference-layout.md)
- [Spanish Version](../../adrs/core/0056-convenciones-nomenclatura-diseno-empresarial.es.md)

---

## 17. Exception Registry

| ID | Date | Requester | Context | Exceptioned Rule | Justification | Expiration Date | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| - | - | - | - | - | - | - | - |

---

[Back to ADRs Index](./README.md)