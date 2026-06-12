# ADR-0056: Enterprise Naming & Design Conventions - Multi-Language, Multi-Platform

## Status

**Proposed** - supersedes the naming scope of [ADR-0049 (Naming Semantics & Clean Code Policy)](./0049-naming-semantics-clean-code-policy.md) with binding, language-specific, and platform-specific rules.

## Date

2026-05-15

## Authors

Principal Software Architect

---

## 1. Context

This organization operates a polyglot, multi-platform architecture spanning:

- **Runtimes:** C# / .NET 8, Java 21, TypeScript / Node.js 20, Python 3.12
- **APIs:** REST (OpenAPI 3.1), gRPC, GraphQL (satellite only)
- **Databases:** SQL Server 2022, PostgreSQL 16, analytical stores (BigQuery / Synapse)
- **Messaging:** Domain events (CloudEvents 1.0), commands, integration events via RabbitMQ / Dapr pub/sub
- **Design paradigm:** Domain-Driven Design (DDD) - strategic and tactical
- **Quality standard:** ISO/IEC 25010 (maintainability, reliability, portability)
- **Metadata standard:** ISO/IEC 11179 (data element naming)

Naming inconsistency is the most frequently cited source of onboarding friction, integration bugs, and security misconfigurations (e.g., mismatched JSON/DB field names leaking PII). A binding corporate standard eliminates ambiguity and enables automated enforcement.

---

## 2. Problem Statement

The absence of a unified naming policy across languages, layers, and platforms produces:

| Symptom | Impact |
| :--- | :--- |
| `userId` in API, `user_id` in DB, `UserId` in code - three names for one concept | Integration bugs, manual mapping overhead |
| `GetUser`, `FetchUser`, `RetrieveUser` - synonyms for the same operation | Inconsistent documentation, cognitive overload |
| Event types like `user.created`, `UserCreated`, `USER_CREATED` - all in production | Impossible to build reliable event consumers |
| Table `tbl_usr` vs `users` vs `User` across teams | Migration complexity, query errors |
| Abbreviations: `prd`, `cust`, `auth_tkn` | Ambiguity, reduced searchability |

---

## 3. Decision

Adopt a **single, binding, automated-enforcement naming standard** with the following pillars:

1. **Ubiquitous Language as the Source of Truth.** Every name in code, API, database, and events originates from the domain glossary - not from implementation preferences.
2. **Ecosystem-native conventions per layer.** Each language and platform follows its community standard (PEP 8, Microsoft C# Guidelines, Google Java Style, etc.) with DDD-specific extensions.
3. **Single concept, multiple representations.** A domain concept has exactly one canonical name in the ubiquitous language, rendered according to the rules of each layer.
4. **Automation over documentation.** Every rule must be checkable by a linter, analyzer, or CI gate. Rules that cannot be automated are deprecated.

### 3.1 Canonical Name Derivation Rule

```
Ubiquitous Language Term (English noun/verb phrase)
    │
    |- C#        -> PascalCase class / camelCase member
    |- Java      -> PascalCase class / camelCase member
    |- TypeScript -> PascalCase class / camelCase member
    |- Python    -> PascalCase class / snake_case member
    |- REST URL  -> kebab-case path segment
    |- JSON body -> camelCase property
    |- SQL table -> snake_case plural noun
    |- SQL column -> snake_case
    `- Event type -> {domain}.{entity}.{past-participle} (dot-delimited, lowercase)
```

**Example - concept: "Work Order"**

| Layer | Representation |
| :--- | :--- |
| Ubiquitous Language | Work Order |
| C# class | `WorkOrder` |
| C# property | `workOrderId` |
| Java class | `WorkOrder` |
| TypeScript interface | `WorkOrder` |
| Python class | `WorkOrder` |
| Python attribute | `work_order_id` |
| REST endpoint | `GET /v1/work-orders/{work-order-id}` |
| JSON property | `"workOrderId"` |
| SQL table | `work_orders` |
| SQL column | `work_order_id` |
| Domain event type | `operations.work-order.created` |
| Analytics fact table | `fct_work_orders` |

---

## 4. Considered Alternatives

### 4.1 Full snake_case everywhere (Python-centric)
**Rejected.** Violates C# and Java idioms. Forces non-idiomatic code in strongly-typed languages where compilers and IDEs assume PascalCase types. ISO/IEC 25010 maintainability requires convention alignment with each ecosystem.

### 4.2 Full camelCase everywhere (JavaScript-centric)
**Rejected.** `workOrderId` as a SQL column name is non-idiomatic, breaks SQL Server and PostgreSQL naming conventions, reduces readability in DDL. Database-level tooling (pg_dump, schema migrations, DBA tooling) expects `snake_case`.

### 4.3 Per-team autonomy with a shared glossary
**Rejected.** Creates integration seams. When Team A names the API field `customerId` and Team B names the DB column `customer_code`, synchronization failures cause data bugs that are expensive to trace.

### 4.4 Chosen: Ecosystem-native per layer, canonical concept from ubiquitous language
**Adopted.** Respects each community's standard. Automated via linters. The single canonical name in the ubiquitous language acts as the stable anchor - each layer renders it according to its own rules.

---

## 5. Language Rules

### 5.1 C# / .NET 8

Follows [Microsoft .NET Naming Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/naming-guidelines) with DDD extensions.

| Construct | Convention | Example |
| :--- | :--- | :--- |
| Namespace | PascalCase, domain-aligned | `Acme.Orders.Domain.Aggregates` |
| Class / Struct / Record | PascalCase | `WorkOrder`, `Money` |
| Interface | `I` prefix + PascalCase | `IWorkOrderRepository` |
| Enum | PascalCase; members PascalCase | `OrderStatus.Confirmed` |
| Method | PascalCase (verb phrase) | `CalculateTotalCost()` |
| Property | PascalCase | `WorkOrderId` |
| Private field | `_` prefix + camelCase | `_workOrderId` |
| Local variable | camelCase | `workOrderId` |
| Constant | PascalCase (not UPPER_SNAKE) | `MaxRetryCount` |
| Generic parameter | `T` prefix + PascalCase noun | `TEntity`, `TResult` |
| Async method | `Async` suffix | `GetWorkOrderAsync()` |
| Test class | `{Subject}Tests` | `WorkOrderTests` |
| Test method | `{Method}_When{Condition}_Should{Outcome}` | `Complete_WhenAlreadyClosed_ShouldReturnFailure` |

**DDD C# conventions:**

```csharp
// Aggregate Root
public sealed class WorkOrder : AggregateRoot<WorkOrderId> { }

// Value Object (immutable record)
public sealed record Money(decimal Amount, Currency Currency);

// Domain Event (past tense)
public sealed record WorkOrderCreatedEvent(WorkOrderId WorkOrderId, ...) : DomainEvent;

// Command (imperative)
public sealed record CreateWorkOrderCommand(...) : IRequest<Result<WorkOrderId>>;

// Query (question phrase)
public sealed record GetWorkOrderByIdQuery(WorkOrderId Id) : IRequest<Result<WorkOrderDto>>;

// Repository Port
public interface IWorkOrderRepository { }

// Domain Service (stateless operation not belonging to one aggregate)
public sealed class WorkOrderPricingService { }

// Specification
public sealed class OpenWorkOrdersSpecification : Specification<WorkOrder> { }

// Policy
public sealed class LateDeliveryPenaltyPolicy { }

// Exception (domain error, use sparingly - prefer Result)
public sealed class WorkOrderNotFoundException : DomainException { }
```

---

### 5.2 Java 21

Follows [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html) with DDD extensions.

| Construct | Convention | Example |
| :--- | :--- | :--- |
| Package | lowercase, domain-aligned, dot-separated | `com.acme.orders.domain.aggregates` |
| Class / Interface / Enum | PascalCase | `WorkOrder`, `IWorkOrderRepository` -> `WorkOrderRepository` (no `I` prefix) |
| Method | camelCase (verb phrase) | `calculateTotalCost()` |
| Field | camelCase | `workOrderId` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Generic parameter | Single uppercase letter or descriptive noun | `T`, `TEntity` |
| Annotation | PascalCase | `@WorkOrderId` |
| Test class | `{Subject}Test` | `WorkOrderTest` |
| Test method | camelCase, descriptive | `completeShouldFailWhenAlreadyClosed()` |

> **Java distinction from C#:** Java uses UPPER_SNAKE_CASE for constants (`static final`). Interface names do NOT use the `I` prefix - use `WorkOrderRepository` as the interface name and `JpaWorkOrderRepository` or `SqlWorkOrderRepository` for the implementation.

---

### 5.3 TypeScript / JavaScript

Follows [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) with DDD extensions.

| Construct | Convention | Example |
| :--- | :--- | :--- |
| File name | kebab-case | `work-order.aggregate.ts` |
| Class | PascalCase | `WorkOrder` |
| Interface | PascalCase (no `I` prefix) | `WorkOrderRepository` |
| Type alias | PascalCase | `WorkOrderId` |
| Enum | PascalCase; members PascalCase | `OrderStatus.Confirmed` |
| Function / Method | camelCase | `calculateTotalCost()` |
| Variable / Property | camelCase | `workOrderId` |
| Private member | `#` (native private) or `_` prefix | `#workOrderId` |
| Constant (module-level) | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| React component | PascalCase | `WorkOrderCard` |
| React hook | `use` prefix + camelCase | `useWorkOrderList()` |
| Test file | `{subject}.spec.ts` | `work-order.spec.ts` |

**File suffix conventions (NestJS / layered architecture):**

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
| `.controller.ts` | HTTP controller |
| `.module.ts` | NestJS module |
| `.spec.ts` | Unit test |
| `.e2e-spec.ts` | End-to-end test |

---

### 5.4 Python 3.12

Follows [PEP 8](https://peps.python.org/pep-0008/) with DDD extensions.

| Construct | Convention | Example |
| :--- | :--- | :--- |
| Module / file | snake_case | `work_order_repository.py` |
| Package | snake_case | `orders/domain/aggregates/` |
| Class | PascalCase | `WorkOrder` |
| Exception class | PascalCase + `Error` suffix | `WorkOrderNotFoundError` |
| Function / Method | snake_case (verb phrase) | `calculate_total_cost()` |
| Variable / Attribute | snake_case | `work_order_id` |
| Private attribute | `_` prefix + snake_case | `_work_order_id` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Type alias | PascalCase | `WorkOrderId = NewType('WorkOrderId', UUID)` |
| Protocol (interface) | PascalCase | `WorkOrderRepository` (abstract base or Protocol) |
| Dataclass (Value Object) | PascalCase, `frozen=True` | `@dataclass(frozen=True) class Money:` |
| Test file | `test_{subject}.py` | `test_work_order.py` |
| Test function | `test_{method}_when_{condition}_should_{outcome}` | `test_complete_when_closed_should_raise` |

---

### 5.5 SQL (SQL Server 2022 & PostgreSQL 16)

Follows [ISO/IEC 11179](https://www.iso.org/standard/60525.html) metadata naming principles with relational conventions.

| Construct | Convention | Example |
| :--- | :--- | :--- |
| Schema | snake_case, domain-aligned | `orders`, `billing`, `audit` |
| Table | snake_case, **plural noun** | `work_orders`, `order_items` |
| Column | snake_case | `work_order_id`, `created_at` |
| Primary key | `id` (surrogate) or `{entity}_id` (natural) | `id`, `work_order_id` |
| Foreign key column | `{referenced_table_singular}_id` | `customer_id`, `product_id` |
| FK constraint | `fk_{table}_{referenced_table}` | `fk_order_items_work_orders` |
| PK constraint | `pk_{table}` | `pk_work_orders` |
| Unique constraint | `uq_{table}_{columns}` | `uq_work_orders_reference_number` |
| Check constraint | `ck_{table}_{rule}` | `ck_work_orders_status_valid` |
| Index | `ix_{table}_{columns}` | `ix_work_orders_customer_id_status` |
| Unique index | `uix_{table}_{columns}` | `uix_work_orders_reference_number` |
| View | `v_{name}` | `v_open_work_orders` |
| Materialized view | `mv_{name}` | `mv_work_order_summary` |
| Stored procedure | `sp_{verb}_{noun}` | `sp_complete_work_order` |
| Function | `fn_{verb}_{noun}` | `fn_calculate_order_total` |
| Trigger | `tr_{table}_{event}` | `tr_work_orders_after_update` |
| Migration file | `{timestamp}_{description}.sql` | `20260515_143000_add_work_orders_table.sql` |
| Audit column (mandatory) | `created_at`, `updated_at`, `created_by`, `updated_by` | All tables must include these |

**Prohibited SQL patterns:**

```sql
-- WRONG: Prefix table names
CREATE TABLE tbl_work_orders (...);

-- WRONG: Abbreviate column names
ALTER TABLE work_orders ADD COLUMN wrkord_stat VARCHAR(20);

-- WRONG: Use reserved words as names
CREATE TABLE order (...);  -- 'order' is a SQL reserved word

-- WRONG: Non-descriptive PK
CREATE TABLE work_orders (id INT PRIMARY KEY, ...);  -- ambiguous across joins

-- OK Correct
CREATE TABLE work_orders (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    reference_number VARCHAR(50)      NOT NULL,
    customer_id     UNIQUEIDENTIFIER NOT NULL,
    status          VARCHAR(30)      NOT NULL,
    created_at      DATETIMEOFFSET   NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at      DATETIMEOFFSET   NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by      NVARCHAR(256)    NOT NULL,
    updated_by      NVARCHAR(256)    NOT NULL,
    CONSTRAINT pk_work_orders PRIMARY KEY (id),
    CONSTRAINT uq_work_orders_reference_number UNIQUE (reference_number),
    CONSTRAINT ck_work_orders_status_valid CHECK (status IN ('Draft','Confirmed','InProgress','Completed','Cancelled')),
    CONSTRAINT fk_work_orders_customers FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX ix_work_orders_customer_id_status ON work_orders (customer_id, status);
```

---

## 6. DDD Naming Rules

All names must originate from the **domain ubiquitous language glossary** defined per bounded context. Names not present in the glossary require a glossary update before code can be written.

### 6.1 Aggregates

- Noun phrase from ubiquitous language.
- PascalCase in all OO languages; snake_case in Python.
- No technical suffixes (`Aggregate`, `Root` - **not** `WorkOrderAggregate`).

```csharp
// OK: Correct - the concept IS the name
public sealed class WorkOrder : AggregateRoot<WorkOrderId> { }

// WRONG: Wrong - redundant suffix
public sealed class WorkOrderAggregate : AggregateRoot<WorkOrderId> { }
```

### 6.2 Entities (non-root)

- Noun phrase. No suffix.
- Distinguish from Value Objects: Entities have identity (`Id`); Value Objects do not.

```csharp
public sealed class OrderItem { }         // OK: Entity - has OrderItemId
public sealed record Money(decimal Amount, Currency Currency); // OK: Value Object - identity-less
```

### 6.3 Value Objects

- Noun phrase or noun phrase describing a measurement/concept.
- **Immutable** - use `record` (C#), `@dataclass(frozen=True)` (Python), `readonly` class (TypeScript).
- Never expose setters.

```csharp
public sealed record EmailAddress(string Value)
{
    public static Result<EmailAddress> Create(string raw) { ... }
}
```

### 6.4 Repositories (Port)

- `I` + Entity/Aggregate name + `Repository` (C#, TypeScript with prefix convention).
- Java / Python: Entity name + `Repository` (no prefix).

```csharp
// C#
public interface IWorkOrderRepository { }
public sealed class SqlWorkOrderRepository : IWorkOrderRepository { } // adapter

// Java
public interface WorkOrderRepository { }
public class JpaWorkOrderRepository implements WorkOrderRepository { }

// TypeScript
export interface WorkOrderRepository { }  // no I prefix in TS
export class TypeOrmWorkOrderRepository implements WorkOrderRepository { }
```

### 6.5 Domain Services

- Noun phrase ending in `Service` **only when** the operation does not belong to any single aggregate.
- Stateless.

```csharp
public sealed class OrderPricingService { }          // OK: cross-aggregate calculation
public sealed class WorkOrderCompletionService { }   // WRONG: belongs inside WorkOrder.Complete()
```

### 6.6 Domain Events

- **Naming:** `{Aggregate}{PastParticiple}` - always past tense; the event has already happened.
- Append `Event` suffix in strongly-typed languages to distinguish from commands.
- Do NOT append `Event` in CloudEvents `type` field.

```csharp
// C# - class name
public sealed record WorkOrderCreatedEvent(...) : DomainEvent;
public sealed record WorkOrderCompletedEvent(...) : DomainEvent;
public sealed record OrderItemRemovedEvent(...) : DomainEvent;

// WRONG: Wrong - present tense
public sealed record WorkOrderCreate(...) : DomainEvent;
// WRONG: Wrong - imperative
public sealed record CreateWorkOrderEvent(...) : DomainEvent;
```

### 6.7 Commands

- **Naming:** `{Imperative verb}{Noun}Command` - imperative mood; expresses intent.
- Immutable (record/dataclass/readonly).

```csharp
public sealed record CreateWorkOrderCommand(string CustomerId, string Description) : IRequest<Result<WorkOrderId>>;
public sealed record CompleteWorkOrderCommand(WorkOrderId Id) : IRequest<Result>;
public sealed record CancelWorkOrderCommand(WorkOrderId Id, string Reason) : IRequest<Result>;
```

### 6.8 Queries

- **Naming:** `Get{Noun}By{Criteria}Query` or `List{Nouns}Query`.
- Returns a read model / DTO, never a domain aggregate.

```csharp
public sealed record GetWorkOrderByIdQuery(WorkOrderId Id) : IRequest<Result<WorkOrderDto>>;
public sealed record ListOpenWorkOrdersQuery(CustomerId CustomerId) : IRequest<Result<IReadOnlyList<WorkOrderSummaryDto>>>;
```

### 6.9 Policies

- Noun phrase expressing a business rule. Suffix `Policy`.

```csharp
public sealed class LateDeliveryPenaltyPolicy { }
public sealed class DiscountEligibilityPolicy { }
```

### 6.10 Specifications

- Noun phrase describing the selection criterion. Suffix `Specification` or `Spec`.

```csharp
public sealed class OverdueWorkOrdersSpecification : Specification<WorkOrder> { }
public sealed class CustomerHasActiveOrdersSpec : Specification<Customer> { }
```

### 6.11 Exceptions / Domain Errors

- **Prefer `Result<T>` over exceptions for business errors.**
- When exceptions are used (infrastructure failures), suffix `Exception`.
- Domain error codes follow `{domain}.{entity}.{error_slug}` - lowercase, dot-delimited.

```csharp
// Infrastructure exception - acceptable
public sealed class DatabaseConnectionException : InfrastructureException { }

// Domain error code - preferred approach
public static readonly DomainError WorkOrderNotFound =
    new("orders.work-order.not-found", "Work order does not exist.");

// WRONG: Wrong - business error as exception
throw new WorkOrderNotFoundException();
```

---

## 7. API / OpenAPI 3.1 Rules

### 7.1 URL Paths

| Rule | Convention | Example |
| :--- | :--- | :--- |
| Resource segments | **kebab-case, plural noun** | `/work-orders`, `/order-items` |
| Path parameters | **kebab-case** | `/work-orders/{work-order-id}` |
| Sub-resources | Nested only to 2 levels max | `/work-orders/{id}/order-items` |
| Actions (non-CRUD) | Verb suffix after resource | `/work-orders/{id}/complete`, `/work-orders/{id}/cancel` |
| API versioning | URL prefix `/v{N}` | `/v1/work-orders` |
| Query parameters | **camelCase** | `?pageSize=20&sortBy=createdAt` |

### 7.2 HTTP Methods & Semantics

| Intent | Method | URL pattern |
| :--- | :--- | :--- |
| Create resource | POST | `/v1/work-orders` |
| Read single | GET | `/v1/work-orders/{work-order-id}` |
| Read collection | GET | `/v1/work-orders` |
| Full replace | PUT | `/v1/work-orders/{work-order-id}` |
| Partial update | PATCH | `/v1/work-orders/{work-order-id}` |
| Delete | DELETE | `/v1/work-orders/{work-order-id}` |
| Domain action | POST (verb) | `/v1/work-orders/{id}/complete` |

### 7.3 JSON Body Properties

- **camelCase** for all JSON property names.
- ISO 8601 for all date/time fields: `"2026-05-15T14:30:00Z"`.
- Monetary values as `{ "amount": 1500.00, "currency": "USD" }`.
- IDs as strings (UUID format): `"workOrderId": "550e8400-e29b-41d4-a716-446655440000"`.

```json
// OK: Correct
{
  "workOrderId": "550e8400-e29b-41d4-a716-446655440000",
  "referenceNumber": "WO-2026-00123",
  "customerId": "...",
  "status": "Confirmed",
  "totalCost": { "amount": 1500.00, "currency": "USD" },
  "createdAt": "2026-05-15T14:30:00Z",
  "orderItems": [
    { "orderItemId": "...", "description": "Repair service", "quantity": 2 }
  ]
}

// WRONG: Wrong - snake_case, abbreviated, missing currency object
{
  "work_order_id": "...",
  "ref_num": "WO-2026-00123",
  "total_cost": 1500.00,
  "created": "15/05/2026"
}
```

### 7.4 OpenAPI operationId

- **camelCase** verb phrase: `{action}{Resource}`.

```yaml
paths:
  /v1/work-orders:
    get:
      operationId: listWorkOrders       # OK
    post:
      operationId: createWorkOrder      # OK
  /v1/work-orders/{workOrderId}:
    get:
      operationId: getWorkOrderById     # OK
  /v1/work-orders/{workOrderId}/complete:
    post:
      operationId: completeWorkOrder    # OK
```

### 7.5 OpenAPI Schema Names

- PascalCase for schema names.
- Suffix `Request` for request bodies, `Response` for response envelopes, `Dto` for transfer objects within OpenAPI specs.

```yaml
components:
  schemas:
    CreateWorkOrderRequest:
      type: object
    WorkOrderResponse:
      type: object
    WorkOrderSummaryDto:
      type: object
```

### 7.6 HTTP Status Codes - Canonical Mapping

| Condition | Status | When |
| :--- | :--- | :--- |
| Created | 201 | POST successful resource creation |
| OK | 200 | GET, PUT, PATCH success |
| No Content | 204 | DELETE, or PATCH with no body |
| Bad Request | 400 | Validation / malformed input |
| Unauthorized | 401 | Missing or invalid token |
| Forbidden | 403 | Authenticated but insufficient scope |
| Not Found | 404 | Resource does not exist |
| Conflict | 409 | Duplicate / state conflict |
| Unprocessable | 422 | Business rule violation |
| Server Error | 500 | Unexpected infrastructure failure |

---

## 8. Events - CloudEvents 1.0

Follows the [CloudEvents 1.0 specification](https://cloudevents.io).

### 8.1 Event Type Naming

```
{organization-domain}.{bounded-context}.{entity}.{past-participle-verb}
```

| Segment | Convention | Example |
| :--- | :--- | :--- |
| organization-domain | lowercase, reverse-DNS or short org name | `acme` |
| bounded-context | lowercase, kebab-case | `orders`, `billing`, `identity` |
| entity | lowercase, kebab-case singular | `work-order`, `order-item` |
| past-participle-verb | lowercase | `created`, `completed`, `cancelled` |

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
    "customerId": "...",
    "referenceNumber": "WO-2026-00123",
    "status": "Draft"
  }
}
```

### 8.2 Event Subject

- `{resource-type}/{resource-id}` - kebab-case resource type, ID as value.

### 8.3 Event Data Properties

- Same as JSON body rules: **camelCase**, ISO 8601 dates, no abbreviations.

### 8.4 Prohibited Event Naming

```
WRONG:  UserCreated            (missing org/context prefix - collision risk)
WRONG:  user_created           (snake_case - violates CloudEvents convention)
WRONG:  USER_CREATED           (UPPER_SNAKE - not human-readable in logs)
WRONG:  acme.orders.CreateUser (present tense - event happened in the past)
OK   acme.identity.user.registered
```

---

## 9. Data Warehouse & Analytics

Follows [Kimball dimensional modeling](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/) with ISO/IEC 11179 metadata naming principles.

### 9.1 Layer Naming

| Layer | Prefix | Purpose |
| :--- | :--- | :--- |
| Staging | `stg_` | Raw ingested data, 1:1 with source |
| Intermediate / OBT | `int_` | Joined, cleaned, denormalized |
| Fact tables | `fct_` | Business process measurements |
| Dimension tables | `dim_` | Descriptive attributes |
| Bridge tables | `brd_` | Many-to-many dimension bridges |
| Aggregated / mart | `agg_` or `mart_` | Pre-aggregated for consumption |
| Data quality | `dq_` | Validation and quarantine tables |

### 9.2 Column Naming

| Pattern | Convention | Example |
| :--- | :--- | :--- |
| Surrogate key | `{table_name}_key` | `work_order_key` |
| Natural / business key | `{entity}_{identifier}_bk` | `work_order_reference_bk` |
| Foreign key to dimension | `{dim_table_without_dim}_key` | `customer_key`, `status_key` |
| Date key | `{context}_date_key` | `created_date_key`, `completed_date_key` |
| Measures | snake_case, unit suffix when ambiguous | `total_cost_usd`, `quantity_units`, `duration_seconds` |
| Flags | `is_{condition}` or `has_{condition}` | `is_late`, `has_penalty`, `is_active` |
| Timestamps | `{event}_at` | `created_at`, `ingested_at`, `updated_at` |
| ETL metadata | `etl_{attribute}` | `etl_batch_id`, `etl_source_system`, `etl_loaded_at` |

### 9.3 Data Catalog Entry (ISO/IEC 11179 inspired)

Every analytical column must have a catalog entry with:

| Attribute | Required | Example |
| :--- | :--- | :--- |
| `element_name` | OK | `work_order_total_cost_usd` |
| `definition` | OK | "Sum of all order item costs in USD for a work order" |
| `data_type` | OK | `NUMERIC(18,4)` |
| `unit_of_measure` | When applicable | `USD` |
| `allowed_values` | For enumerations | `Draft, Confirmed, InProgress, Completed, Cancelled` |
| `source_system` | OK | `orders-api` |
| `source_table` | OK | `orders.work_orders` |
| `source_column` | OK | `total_cost` |
| `pii_classification` | OK | `None`, `Sensitive`, `Restricted` |
| `owner_team` | OK | `operations-domain` |

---

## 10. Full Mapping Table

| Ubiquitous Language | C# | Java | TypeScript | Python | REST URL | JSON | SQL Table | SQL Column | Event Type | DW Fact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Work Order | `WorkOrder` | `WorkOrder` | `WorkOrder` | `WorkOrder` | `/work-orders` | `workOrderId` | `work_orders` | `work_order_id` | `*.work-order.created` | `fct_work_orders` |
| Order Item | `OrderItem` | `OrderItem` | `OrderItem` | `OrderItem` | `/order-items` | `orderItemId` | `order_items` | `order_item_id` | `*.order-item.added` | `fct_order_items` |
| Customer | `Customer` | `Customer` | `Customer` | `Customer` | `/customers` | `customerId` | `customers` | `customer_id` | `*.customer.registered` | `dim_customers` |
| Reference Number | `ReferenceNumber` (VO) | `ReferenceNumber` | `ReferenceNumber` | `ReferenceNumber` | `referenceNumber` (query) | `referenceNumber` | - | `reference_number` | - | `work_order_reference_bk` |
| Created At | `CreatedAt` (property) | `createdAt` | `createdAt` | `created_at` | `createdAt` (query param) | `createdAt` | - | `created_at` | `time` (CloudEvents field) | `created_date_key` |
| Total Cost (USD) | `TotalCost` (Money VO) | `totalCost` | `totalCost` | `total_cost` | - | `totalCost.amount` | - | `total_cost_usd` | data.totalCost | `total_cost_usd` |
| Work Order Status | `WorkOrderStatus` (enum) | `WorkOrderStatus` | `WorkOrderStatus` | `WorkOrderStatus` | `status` (filter) | `status` | - | `status` | data.status | `dim_work_order_status` |

---

## 11. Validation Tools

### 11.1 Per Language

| Language | Formatter | Linter | Static Analyzer |
| :--- | :--- | :--- | :--- |
| C# | `dotnet format` (built-in) | Roslyn Analyzers (`StyleCop.Analyzers`, `SonarAnalyzer.CSharp`) | SonarQube / SonarCloud |
| Java | Google Java Format | Checkstyle (Google config) | SonarQube, SpotBugs |
| TypeScript | Prettier | ESLint (`@typescript-eslint`, `eslint-plugin-sonarjs`) | SonarQube |
| Python | Black + isort | Flake8 + pylint | SonarQube |
| SQL | `sqlfluff` (dialect: tsql / postgres) | `sqlfluff lint` | `sqlfluff fix` |

### 11.2 Architecture Boundary Enforcement

| Language | Tool | Rule |
| :--- | :--- | :--- |
| C# | `dotnet-architecture-tests` (ArchUnitNET) | Domain layer has zero NuGet refs to Infrastructure |
| Java | ArchUnit | `noClasses().that().resideInPackage("..domain..").should().dependOnClassesThat().resideInPackage("..infrastructure..")` |
| TypeScript | `eslint-plugin-boundaries` | `domain` cannot import from `infrastructure` |
| Python | `import-linter` | Contracts defined in `.importlinter` |

### 11.3 API & Event Linting

| Tool | What it validates |
| :--- | :--- |
| `spectral` (Stoplight) | OpenAPI 3.1 - operationId format, kebab-case paths, required fields |
| `openapi-generator validate` | Schema completeness and correctness |
| CloudEvents SDK (any language) | Event envelope schema validation |
| `redocly lint` | OpenAPI lint + style rules |

**Recommended Spectral ruleset (`.spectral.yaml`):**

```yaml
extends: ["spectral:oas"]
rules:
  operation-operationId: error
  operation-operationId-valid-in-url: error
  path-casing:
    given: "$.paths"
    severity: error
    then:
      function: pattern
      functionOptions:
        match: "^(/v[0-9]+)?(/[a-z][a-z0-9-]*({[a-z][a-z0-9-]*})?)*$"
  property-casing:
    given: "$.components.schemas.*.properties"
    severity: error
    then:
      function: casing
      functionOptions:
        type: camel
```

### 11.4 SQL Linting (sqlfluff)

`.sqlfluff` project config:

```ini
[sqlfluff]
dialect = tsql          # or postgres
templater = raw
max_line_length = 120

[sqlfluff:rules:L010]   # Keywords uppercase
capitalisation_policy = upper

[sqlfluff:rules:L014]   # Column aliases snake_case
extended_capitalisation_policy = lower

[sqlfluff:rules:L030]   # Function names uppercase
capitalisation_policy = upper

[sqlfluff:rules:aliasing.table]
aliasing = explicit     # Always name aliases explicitly
```

### 11.5 SonarQube Quality Gates

| Metric | Threshold | Applies to |
| :--- | :--- | :--- |
| Coverage (new code) | ≥ 80% | All languages |
| Duplicated lines (new code) | ≤ 3% | All languages |
| Maintainability rating (new code) | A | All languages |
| Reliability rating (new code) | A | All languages |
| Security hotspots reviewed | 100% | All languages |
| Cognitive complexity per method | ≤ 15 | All languages |
| Naming convention violations | 0 | Enforced via Roslyn / ESLint / Checkstyle / pylint |

### 11.6 Pre-commit & CI Gates

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: dotnet-format
        name: dotnet format
        language: system
        entry: dotnet format --verify-no-changes
        types: [c#]

      - id: prettier
        name: prettier
        language: system
        entry: npx prettier --check .
        types_or: [ts, tsx, json, yaml]

      - id: eslint
        name: eslint
        language: system
        entry: npx eslint --max-warnings 0
        types: [ts]

      - id: black
        name: black
        language: python
        entry: black --check .
        types: [python]

      - id: sqlfluff
        name: sqlfluff
        language: python
        entry: sqlfluff lint
        types: [sql]

      - id: spectral
        name: spectral openapi lint
        language: system
        entry: npx spectral lint docs/openapi.yaml
        pass_filenames: false
```

---

## 12. Exception Policy

A naming exception may be granted **only** under the following conditions:

1. **External contract lock-in.** A third-party system mandates a specific naming format (e.g., a vendor API uses `PascalCase` JSON or an SQL Server system table uses a non-standard column name). The exception must be isolated to the adapter/anti-corruption layer.

2. **Regulatory requirement.** A regulatory body mandates a specific field name in a reporting format (e.g., `TaxId` for fiscal reporting). The internal canonical name remains compliant; only the outbound transformation adapter is excepted.

3. **Legacy system migration (time-boxed).** During a migration phase, legacy names may coexist. The exception must have a defined sunset date registered in the ADR exception log (see below) not exceeding 6 months.

**Exception log format** (append to this ADR's `## Exception Log` section):

```markdown
| ID | Date | Requester | Context | Excepted Rule | Justification | Sunset Date | Status |
|----|------|-----------|---------|---------------|---------------|-------------|--------|
| EX-001 | 2026-06-01 | @team-billing | Legacy SAP integration | SQL column prefix `Z_` | SAP standard | 2026-12-01 | Active |
```

**Exceptions do NOT apply to:**
- New greenfield code
- Internal API-to-API communication
- Domain layer names (ubiquitous language is non-negotiable)

---

## 13. Definition of Done

A code artifact is **Done** from a naming perspective when **all** of the following pass:

```
[ ] All class, method, property, and variable names match the ubiquitous language glossary
[ ] Language-specific casing conventions applied (verified by linter - zero violations)
[ ] No abbreviations (except approved acronyms: ID, URL, HTTP, API, DTO, ORM, JWT, SQL)
[ ] SQL objects follow schema/table/column/constraint naming rules
[ ] OpenAPI operationId in camelCase; paths in kebab-case; properties in camelCase
[ ] CloudEvents type follows {org}.{context}.{entity}.{past-tense} pattern
[ ] No magic strings containing field names (use constants or nameof())
[ ] SonarQube gate passes (0 naming violations, maintainability A)
[ ] PR description references the ubiquitous language term from the bounded context glossary
[ ] sqlfluff lint returns 0 violations on all migration scripts
[ ] Spectral lint returns 0 errors on affected OpenAPI specs
```

---

## 14. Correct vs Incorrect Examples

### 14.1 C# - Aggregate & Value Object

```csharp
// CORRECT
public sealed class WorkOrder : AggregateRoot<WorkOrderId>
{
    private readonly List<OrderItem> _orderItems = [];

    public WorkOrderId Id { get; private init; }
    public ReferenceNumber ReferenceNumber { get; private set; }
    public CustomerId CustomerId { get; private init; }
    public WorkOrderStatus Status { get; private set; }

    public static WorkOrder Create(CustomerId customerId, string referenceNumber)
    {
        var order = new WorkOrder
        {
            Id = WorkOrderId.New(),
            CustomerId = customerId,
            ReferenceNumber = ReferenceNumber.From(referenceNumber),
            Status = WorkOrderStatus.Draft,
        };
        order.Raise(new WorkOrderCreatedEvent(order.Id, customerId));
        return order;
    }
}

// WRONG
public class WrkOrdAggregat  // abbreviation + suffix
{
    public int Id { get; set; }     // int ID (should be strongly typed)
    public string stat { get; set; } // lowercase, abbreviated
    public List<OrdItm> Items;       // public field, abbreviated type
}
```

### 14.2 TypeScript - Use Case

```typescript
// CORRECT - file: create-work-order.use-case.ts
@Injectable()
export class CreateWorkOrderUseCase {
  constructor(
    @Inject('WorkOrderRepository')
    private readonly workOrderRepository: WorkOrderRepository,
  ) {}

  async execute(command: CreateWorkOrderCommand): Promise<Result<WorkOrderId>> {
    const workOrder = WorkOrder.create(command.customerId, command.referenceNumber);
    await this.workOrderRepository.save(workOrder);
    return Result.ok(workOrder.id);
  }
}

// WRONG
export class CreateWO {   // abbreviation, no suffix
  constructor(private repo: any) {}  // untyped, `repo` is abbreviated

  async run(data: any): Promise<any> {  // 'run' not domain language; untyped
    return this.repo.insert(data);      // bypasses domain model
  }
}
```

### 14.3 Python - Repository Protocol

```python
# OK CORRECT - file: work_order_repository.py
from abc import abstractmethod
from typing import Protocol
from uuid import UUID

class WorkOrderRepository(Protocol):
    @abstractmethod
    async def find_by_id(self, work_order_id: UUID) -> WorkOrder | None: ...

    @abstractmethod
    async def save(self, work_order: WorkOrder) -> None: ...

    @abstractmethod
    async def list_by_customer(self, customer_id: UUID) -> list[WorkOrder]: ...


# WRONG: WRONG
class WO_Repo:
    def get(self, id): ...           # abbreviated name, untyped
    def ins(self, obj): ...          # meaningless abbreviation
    def list_all(self, cust): ...    # `cust` abbreviated, no type hint
```

### 14.4 SQL - Table & Constraints

```sql
-- OK CORRECT
CREATE TABLE orders.work_orders (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWSEQUENTIALID(),
    reference_number    VARCHAR(50)         NOT NULL,
    customer_id         UNIQUEIDENTIFIER    NOT NULL,
    status              VARCHAR(30)         NOT NULL DEFAULT 'Draft',
    created_at          DATETIMEOFFSET      NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIMEOFFSET      NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          NVARCHAR(256)       NOT NULL,
    updated_by          NVARCHAR(256)       NOT NULL,
    CONSTRAINT pk_work_orders               PRIMARY KEY (id),
    CONSTRAINT uq_work_orders_ref_number    UNIQUE (reference_number),
    CONSTRAINT ck_work_orders_status        CHECK (status IN ('Draft','Confirmed','InProgress','Completed','Cancelled')),
    CONSTRAINT fk_work_orders_customers     FOREIGN KEY (customer_id) REFERENCES customers.customers(id)
);
CREATE INDEX ix_work_orders_customer_status ON orders.work_orders (customer_id, status);

-- WRONG: WRONG
CREATE TABLE tbl_WrkOrd (       -- prefixed, PascalCase, abbreviated
    WrkOrdID    INT IDENTITY,   -- integer PK, Hungarian notation, IDENTITY without UUID
    CustID      INT,            -- abbreviated FK, no constraint name
    Stat        VARCHAR(1),     -- abbreviated column, single-char values
    dt          DATETIME        -- abbreviated, wrong type for audit column
);
```

### 14.5 OpenAPI

```yaml
# OK CORRECT
paths:
  /v1/work-orders:
    post:
      operationId: createWorkOrder
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateWorkOrderRequest'
      responses:
        '201':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorkOrderResponse'

components:
  schemas:
    CreateWorkOrderRequest:
      type: object
      required: [customerId, referenceNumber]
      properties:
        customerId:
          type: string
          format: uuid
        referenceNumber:
          type: string
          minLength: 3

# WRONG: WRONG
paths:
  /WorkOrders:            # PascalCase path
    post:
      operationId: Create_Work_Order   # snake_case operationId
      requestBody:
        content:
          application/json:
            schema:
              properties:
                customer_id:            # snake_case JSON property
                  type: integer         # wrong type for UUID
                ref_num:                # abbreviated
                  type: string
```

### 14.6 CloudEvents

```json
// CORRECT
{
  "specversion": "1.0",
  "type": "acme.orders.work-order.created",
  "source": "/services/orders-api/v1",
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "time": "2026-05-15T14:30:00Z",
  "datacontenttype": "application/json",
  "subject": "work-orders/WO-2026-00123",
  "data": {
    "workOrderId": "550e8400-e29b-41d4-a716-446655440000",
    "referenceNumber": "WO-2026-00123",
    "customerId": "...",
    "status": "Draft"
  }
}

// WRONG
{
  "type": "WorkOrderCreated",        // PascalCase, no org/context prefix
  "timestamp": "15-05-2026",         // non-ISO 8601
  "payload": {
    "work_order_id": "...",          // snake_case in JSON data
    "ref": "WO-2026-00123",          // abbreviated
    "cust_id": "..."                 // abbreviated
  }
}
```

---

## 15. Consequences

### Positive

- **Maintainability (ISO/IEC 25010).** Consistent naming reduces cognitive load and accelerates onboarding. New developers can predict names without consulting implementation.
- **Integration reliability.** A single canonical concept name prevents data mapping bugs between API, database, and event consumers.
- **Automated enforcement.** All rules are checkable by existing tooling - no manual review required for naming compliance.
- **DDD alignment.** Ubiquitous language as the naming source eliminates the "translation layer" between business and engineering.

### Negative

- **Migration cost.** Existing codebases not compliant with this ADR require a phased refactor. See Exception Policy for time-boxing.
- **Learning curve.** Teams moving between languages must internalize per-layer rendering rules.
- **Strictness may slow initial PRs.** Linters block merges until naming is correct. Investment in IDE plugins reduces friction (Roslyn live warnings, ESLint IDE integration).

---

## 16. References

- [Microsoft .NET Naming Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/naming-guidelines)
- [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [PEP 8 - Python Style Guide](https://peps.python.org/pep-0008/)
- [CloudEvents 1.0 Specification](https://cloudevents.io)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [ISO/IEC 11179 - Metadata Registries](https://www.iso.org/standard/60525.html)
- [ISO/IEC 25010 - Systems and Software Quality](https://www.iso.org/standard/35733.html)
- [Kimball Dimensional Modeling Techniques](https://www.kimballgroup.com)
- [Spectral OpenAPI Linter](https://stoplight.io/open-source/spectral)
- [sqlfluff - SQL Linter](https://docs.sqlfluff.com)
- [ArchUnit - Architecture Testing](https://www.archunit.org)
- [ADR-0049 - Naming Semantics & Clean Code Policy](./0049-naming-semantics-clean-code-policy.md) <- superseded scope
- [ADR-0048 - Enterprise Taxonomy Reference Layout](./0048-enterprise-taxonomy-reference-layout.md)

---

## Exception Log

| ID | Date | Requester | Context | Excepted Rule | Justification | Sunset Date | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| - | - | - | - | - | - | - | - |




## Objective and Scope

Historical backfill: Address the architectural tension where context is unavailable, establishing a standard boundary.

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

None explicitly linked.

---

[Back to ADR Index](./README.md)
