# ADR-0031: Schema-per-Bounded-Context and Domain Event Catalog

## Status
Approved

## Date
2026-05-11

## Context

As the system is designed as a **Progressive Monolith** ([ADR-0006](0006-microservices-transition-sidecar-pattern.md)) intended to evolve toward microservices, two structural risks exist that are not addressed by the current ADR baseline:

1. **Flat PostgreSQL Schema**: [ADR-0010](0010-multi-tenancy-architecture-strategy.md) defines Row-Level Security (RLS) for multi-tenant isolation, but all tables reside in a single flat schema. When extracting a bounded context into an independent microservice, there is no clear ownership boundary at the database level. Cross-table joins become cross-service calls, and migration plans become ambiguous.

2. **No Domain Event Catalog**: [ADR-0015](0015-event-driven-architecture-intra-domain.md) defines the injectable `IEventBusPort` abstraction, but does not specify **which events cross bounded context boundaries**, nor the **typed payload contracts** for those events. Without this catalog, inter-context dependencies are implicit and undocumented, making microservice extraction unsafe.

Both issues are zero-cost to solve during the Modular Monolith phase but become extremely expensive to fix post-extraction.

---

## Decision

### Part 1: Schema-per-Bounded-Context (PostgreSQL)

Each bounded context will own a dedicated **PostgreSQL schema**. All tables belonging to a context must be created within its schema. Cross-schema joins within the monolith remain permitted (same DB connection), but must be treated as integration contracts, not implementation details.

#### Schema Assignments

| PostgreSQL Schema | Owning Context | Tables |
| :--- | :--- | :--- |
| `auth` | Authentication Context | `auth.users` |
| `tasks` | Task Management Context | `tasks.task`, `tasks.task_tags` |
| `taxonomy` | Taxonomy Context | `taxonomy.category`, `taxonomy.tag` |
| `audit` | Audit Context | `audit.audit_log` |

#### Migration Strategy

Each bounded context will have its own TypeORM `DataSource` configuration scoped to its schema. Migrations are executed per schema, enabling independent deploy cycles when contexts are extracted into dedicated microservices.

```typescript
// Example: TaskDataSource (scoped to tasks schema)
export const TaskDataSource = new DataSource({
 schema: 'tasks',
 migrations: ['dist/tasks/infrastructure/migrations/*.js'],
 entities: ['dist/tasks/infrastructure/entities/*.js'],
});
```

#### Database Migration Path (3-Phase Progression)

To avert the "Shared Database with Microservices" antipattern, transitions must strictly follow:

- **Phase 1 (Monolith):** Shared physical engine, distinct schema-per-context. NO cross-schema JOINs. Inter-schema cohesion only via API or published domain events.
- **Phase 2 (Extraction):** Separate logical users per extracted service. Transition to physical migration using the Transactional Outbox ([ADR-0033](../core/0033-transactional-outbox-pattern.md)) for reliable event replication. Synchronize state via events, NEVER via cross-schema DB access.
- **Phase 3 (Full Mesh):** Total Data Ownership. Each microservice owns its exclusive database engine instance. Inter-service data dependencies are fulfilled entirely via API/gRPC calls or Materialized Views hydrated by events.

---

### Part 2: Domain Event Catalog

All cross-bounded-context communication must occur exclusively via **Domain Events** published through `IEventBusPort` ([ADR-0015](0015-event-driven-architecture-intra-domain.md)). The following catalog defines all approved events, their owning context, and their typed payload contracts.

> **Rule**: A bounded context may only read from its own schema tables. To obtain data owned by another context, it must subscribe to that context's published Domain Events.

#### Event Catalog

##### Auth Context - Published Events

```typescript
/** Published when a new user successfully completes registration */
class UserRegisteredEvent {
 readonly eventId: string; // UUID - for idempotency
 readonly occurredAt: Date;
 readonly userId: string; // UUID
 readonly tenantId: string; // UUID
 readonly email: string;
}

/** Published when a user account is permanently deactivated */
class UserDeactivatedEvent {
 readonly eventId: string;
 readonly occurredAt: Date;
 readonly userId: string;
 readonly tenantId: string;
}
```

##### Task Management Context - Published Events

```typescript
/** Published when a new task is successfully created */
class TaskCreatedEvent {
 readonly eventId: string;
 readonly occurredAt: Date;
 readonly taskId: string; // UUID
 readonly userId: string; // UUID - owner
 readonly tenantId: string; // UUID
 readonly title: string;
 readonly categoryId: string | null;
}

/** Published when a task transitions to COMPLETED status */
class TaskCompletedEvent {
 readonly eventId: string;
 readonly occurredAt: Date;
 readonly taskId: string;
 readonly userId: string;
 readonly tenantId: string;
 readonly completedAt: Date;
}

/** Published when a task is permanently deleted */
class TaskDeletedEvent {
 readonly eventId: string;
 readonly occurredAt: Date;
 readonly taskId: string;
 readonly userId: string;
 readonly tenantId: string;
}
```

##### Taxonomy Context - Published Events

```typescript
/** Published when a category is removed (tasks referencing it must be notified) */
class CategoryDeletedEvent {
 readonly eventId: string;
 readonly occurredAt: Date;
 readonly categoryId: string;
 readonly tenantId: string;
}
```

#### Event Subscription Map

| Event | Publisher | Subscriber | Reason |
| :--- | :--- | :--- | :--- |
| `UserRegisteredEvent` | Auth | Task | Initialize user's task workspace |
| `UserDeactivatedEvent` | Auth | Task, Audit | Cascade-delete tasks, write audit entry |
| `TaskCreatedEvent` | Task | Audit | Write immutable creation record |
| `TaskCompletedEvent` | Task | Audit | Write immutable completion record |
| `TaskDeletedEvent` | Task | Audit | Write immutable deletion record |
| `CategoryDeletedEvent` | Taxonomy | Task | Nullify `category_id` on affected tasks |

---

## Consequences

### Positive (Pros)
- **Zero-cost microservices extraction**: Schema boundaries defined upfront eliminate the most expensive part of service extraction - data ownership ambiguity.
- **Explicit contracts**: The Event Catalog makes all inter-context dependencies visible and auditable, preventing hidden coupling.
- **Idempotent event processing**: `eventId` (UUID) on every event enables consumers to safely deduplicate retried deliveries.
- **Independent migration cycles**: Each schema can be migrated independently, enabling zero-downtime deployments per context.

### Negative (Cons)
- **No cross-schema transactions**: Operations spanning multiple schemas cannot use a single database transaction. Eventual consistency via Domain Events must be embraced for cross-context operations.
- **TypeORM multi-datasource complexity**: Requires configuring and managing multiple `DataSource` instances, one per schema. NestJS DI must be set up carefully to inject the correct datasource per repository.
- **Developer discipline**: Developers must respect schema ownership rules. ESLint boundary rules ([ADR-0003](../nodejs/0003-strict-typescript-standards.md)) should be configured to prevent direct imports across context boundaries.

## References
- [ADR-0006: Future Microservices Transition with Dapr](../../adrs/core/0006-microservices-transition-sidecar-pattern.md)
- [ADR-0010: Multi-Tenancy Strategy (RLS)](../../adrs/core/0010-multi-tenancy-architecture-strategy.md)
- [ADR-0015: Event-Driven Architecture (Injectable Bus)](../../adrs/core/0015-event-driven-architecture-intra-domain.md)
- [UMS Applied Reference Model](../../../knowledge/demo/README.md)





## Objective and Scope

Historical backfill: Address the architectural tension where as the system is designed as a **Progressive Monolith** ([ADR-0006](0006-microservices-transition-sidecar-pattern, establishing a standard boundary.

## Options Considered

- **Selected:** Schema-per-Bounded-Context and Domain Event Catalog
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0006: Future Microservices Transition with Dapr](../../adrs/core/0006-microservices-transition-sidecar-pattern.md)
- [ADR-0010: Multi-Tenancy Strategy (RLS)](../../adrs/core/0010-multi-tenancy-architecture-strategy.md)
- [ADR-0015: Event-Driven Architecture (Injectable Bus)](../../adrs/core/0015-event-driven-architecture-intra-domain.md)
- [UMS Applied Reference Model](../../../knowledge/demo/README.md)

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
