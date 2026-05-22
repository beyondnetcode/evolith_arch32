# To-Do API

Reference implementation of the progressive monolith architecture. Built with NestJS following Hexagonal Architecture, strict TypeScript, and the corporate ADR registry.

---

## Purpose

This API exists to physically prove that the architectural patterns defined in `reference/architecture/` work together in running code. It is not a production product — it is a **pattern laboratory**.

Patterns validated here: Hexagonal boundaries, Multi-Tenant RLS, Injectable Event Bus, CQRS hybrid, OpenTelemetry distributed tracing, Result pattern. See the full list in the [Sandbox Verification Matrix](../../../reference/knowledge/demo/technical/sandbox-verification.md).

---

## Stack

| Layer | Technology |
| :--- | :--- |
| Framework | NestJS v10 (strict mode) |
| Language | TypeScript 5 (strict) |
| ORM | TypeORM |
| Database | PostgreSQL 16 (schema-per-context) |
| Cache | Redis (via `ICachePort`) |
| Event Bus | In-Memory → RabbitMQ (via `IEventBusPort`) |
| Observability | OpenTelemetry + Loki + Jaeger |
| Testing | Jest (unit) + Pact (contract) + Testcontainers (integration) |

---

## Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose

---

## Local Setup

```bash
# 1. Install dependencies (from monorepo root)
cd src && npm install

# 2. Start infrastructure (PostgreSQL, Redis — Phase 1 minimum)
docker-compose -f ../reference/infrastructure/docker-compose.yml up -d postgres redis

# 3. Run in development mode
npm run dev
```

API available at `http://localhost:3000`.

---

## Running Tests

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# Integration tests (requires Docker)
npm run test:integration

# Contract tests (Pact)
npm run test:pact
```

---

## Bounded Contexts

| Context | Schema | Owns |
| :--- | :--- | :--- |
| Authentication | `auth` | Users, JWT issuance |
| Task Management | `tasks` | Tasks, task-tag bridge |
| Taxonomy | `taxonomy` | Categories, tags |
| Audit | `audit` | Append-only audit log |

Each context owns its PostgreSQL schema — no cross-schema joins. See [Bounded Context Map](../../../reference/knowledge/demo/technical/bounded-context-map.md).

---

## Key Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| POST | `/v1/auth/register` | Register a new user |
| POST | `/v1/auth/login` | Authenticate and receive JWT |
| POST | `/v1/tasks` | Create a task (authenticated) |
| GET | `/v1/tasks` | List tasks for authenticated user |
| PATCH | `/v1/tasks/:id/complete` | Mark task as completed |
| DELETE | `/v1/tasks/:id` | Delete a task |
| GET | `/v1/categories` | List categories |
| GET | `/v1/tags` | List tags |

Full OpenAPI spec available at `http://localhost:3000/api` when running in development mode.

---

## Architecture References

- [Reference Blueprint](../../../reference/architecture/blueprints/reference-blueprint.md)
- [Clean Architecture ADR](../../../reference/architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)
- [Multi-Tenancy ADR](../../../reference/architecture/adrs/core/0010-multi-tenancy-architecture-strategy.md)
- [Event Bus ADR](../../../reference/architecture/adrs/core/0015-event-driven-architecture-intra-domain.md)
- [Observability ADR](../../../reference/architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)
