# Modular Monolith Evolution Playbook

## Use When

- Evaluating bounded-context boundaries
- Moving shared code between modules
- Designing integration flows between contexts
- Preparing a module for future service extraction

---

## 1. Mandatory Boundary Checks

Before any structural change to module boundaries:

1. Bounded contexts keep clear ownership — one team, one schema, one deploy unit.
2. Shared code is truly cross-context (generic infrastructure, DDD primitives), not merely convenient.
3. Domain logic remains pure and framework-agnostic — zero ORM or NestJS imports in the domain layer.
4. Cross-context collaboration uses contracts, ACLs, events, and outbox-friendly patterns — never direct DB cross-schema joins.
5. Changes improve, or at least preserve, future extraction readiness.

---

## 2. Boundary Validation with `eslint-plugin-boundaries`

The ESLint boundary rules enforce that the domain layer cannot import from infrastructure. Check violations before and after every structural change:

```bash
npx eslint --ext .ts src/libs/domain --rule '{"boundaries/element-types": "error"}'
```

Expected result: **0 violations**. Any cross-boundary import from `domain` into `infrastructure` is an architecture debt that must be resolved before merging.

**Example of a healthy boundary:**

```
libs/
  domain/task/
    src/
      task.aggregate.ts        ← no NestJS, no TypeORM
      task.repository.ts       ← ITaskRepository Port (interface only)
  infrastructure/task/
    src/
      typeorm-task.repository.ts ← implements ITaskRepository, imports TypeORM
```

**Red flag:** If `task.aggregate.ts` contains `import { InjectRepository } from '@nestjs/typeorm'`, the boundary is violated.

---

## 3. Extraction Readiness Checklist (Phase 1 → Phase 2)

Per [ADR-0045](../../reference/core/architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md), a module is a valid extraction candidate when it meets **2 of 4** criteria sustained over 15 days:

| Criterion | Measurement Source | Threshold |
| :--- | :--- | :--- |
| Critical Latency | Jaeger P95 per module | > 200ms |
| Release Frequency | CI deploy logs | > 4 deploys/week |
| Team Autonomy | Git blame per squad | > 80% commits from one squad |
| Data Density | PostgreSQL `pg_stat_user_tables` | Module schema > 20% of total DB payload |

Before presenting to the Architecture Board, the Squad Lead MUST provide a 15-day telemetry export showing the sustained threshold breach.

---

## 4. Step-by-Step: First Service Extraction (Strangler Fig)

This procedure extracts one bounded context from the monolith without a Big Bang rewrite. Reference: [ADR-0047 §10](../../reference/core/architecture/adrs/core/0047-architectural-patterns-monolith-soa-microservices.md).

### Step 1 — Confirm schema isolation

Verify the target context already uses its own PostgreSQL schema (e.g., `tasks`). If it shares tables with another context, perform schema-level isolation first (no inter-schema foreign keys, no cross-schema SQL joins).

```sql
-- Verify no cross-schema foreign keys exist
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid::regclass::text LIKE 'tasks.%'
  AND confrelid::regclass::text NOT LIKE 'tasks.%';
-- Expected: 0 rows
```

### Step 2 — Position Kong for Strangler Fig routing

Add a Kong route that forwards the module's path prefix to the monolith. This is the future extraction seam — traffic will later be redirected to the new service without any client changes.

```yaml
# kong.yml (db-less)
services:
  - name: monolith
    url: http://core-api:3000
    routes:
      - name: tasks-route
        paths: [/v1/tasks]
      - name: auth-route
        paths: [/v1/auth]
```

### Step 3 — Convert the internal library to a standalone Nx project

```bash
# Create a new standalone application from the existing library
nx g @nx/nest:application task-service
# Move domain + infrastructure code; keep the Port interface in a shared lib
```

The new service gets its own `DATABASE_URL` pointing to the same PostgreSQL instance but scoped to the `tasks` schema. No data migration is needed.

### Step 4 — Switch Kong routing to the new service

```yaml
services:
  - name: task-service
    url: http://task-service:3001
    routes:
      - name: tasks-route
        paths: [/v1/tasks]
  - name: monolith
    url: http://core-api:3000
    routes:
      - name: auth-route
        paths: [/v1/auth]
```

Deploy the new service, update the Kong config, and validate via the [UMS Applied Reference Model](../../product/research/demo/README.md). The monolith no longer handles task traffic.

### Step 5 — Migrate the Event Bus from In-Memory to RabbitMQ

Once the service is independently deployed, the In-Memory bus can no longer deliver cross-service events. Set the environment variable:

```bash
EVENT_BUS_IMPL=rabbitmq
RABBITMQ_URL=amqp://localhost:5672
```

The `IEventBusPort` implementation is injected at startup with no domain code change — per [ADR-0015](../../reference/core/architecture/adrs/core/0015-event-driven-architecture-intra-domain.md).

---

## 5. Extraction Readiness Questions

Answer **all** before proposing an extraction to the Architecture Board:

- Can this module be separated without copying hidden logic from another context?
- Are all contracts explicit enough to become inter-service gRPC or REST boundaries?
- Are we accidentally centralizing domain rules in a shared `libs/` layer?
- Does the module have its own integration test suite running against Testcontainers?
- Has observability been validated — does the module produce its own traces and structured logs?
- Is the squad ready to own a separate CI/CD pipeline for this service?

---

## 6. Anti-Patterns to Watch

| Anti-Pattern | Signal | Resolution |
| :--- | :--- | :--- |
| **God Module** | One context owns >50% of domain entities | Re-evaluate bounded context boundaries against the ubiquitous language |
| **Leaky Shared Library** | `libs/shared` contains business logic | Move business logic into the owning context; shared libs should contain only generic infrastructure or DDD primitives |
| **Hidden Synchronous Coupling** | Module A calls Module B's repository directly | Replace with event-driven communication via `IEventBusPort` |
| **Premature Extraction** | Extraction proposed before meeting "2 of 4" criteria | Wait for telemetry evidence; modularize further within the monolith first |
