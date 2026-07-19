# Modular Monolith — Patterns Guide

> **Bilingual Navigation:** [English](./patterns.md) | [Español](./patterns.es.md)

**Owner:** Architecture Board
**Topology:** Modular Monolith

---

## Schema-per-Domain (ADR-0067)

Each bounded context owns its database schema exclusively. Shared schemas are prohibited; cross-module data access occurs only through published APIs.

- **Naming convention:** `{module_name}_{domain_entity}` — e.g., `orders_line_items`, `inventory_stock_levels`
- **Schema ownership:** Each module team owns and evolves their schema independently
- **Migration strategy:** Each module runs migrations independently; no cross-module migration dependencies
- **Reference integrity:** Foreign keys across module schemas are prohibited; use application-level references

```
Module: order-management
  Schema: order_mgmt
  Tables: orders, order_items, order_status_history

Module: inventory
  Schema: inventory
  Tables: stock_levels, stock_movements, warehouse_locations
```

## Strangler Fig Preparation (ADR-0045)

The modular monolith is designed for eventual extraction. Code is structured so modules can be surgically extracted without rewriting.

- **Clean interfaces:** Every module exposes a well-defined API boundary
- **No shared state:** Modules do not share in-memory state or static variables
- **Database independence:** Each module's schema can be migrated to a standalone database
- **Event emission:** Modules publish domain events that extracted services can subscribe to

**Extraction readiness score:** **MM-R07** requires each module to track an extraction readiness score and hold it at **>= 70%** to pass the Phase 2 Design gate when F2 is planned. The underlying qualification criteria come from **ADR-0045**, which defines no percentage: a module qualifies for extraction only if it meets **at least 2 of 4** criteria (P95 latency > 200 ms; > 4 independent deployments per week; > 80% of commits from a single squad; DB payload > 20% of total instances) sustained over **at least 15 days**.

## Data Mapper & Repository Pattern

Modules use Data Mapper and Repository patterns to decouple domain logic from persistence. Active Record is prohibited.

- **Domain entities:** Pure business objects with no persistence awareness
- **Repository interfaces:** Defined in the domain layer; implementations in the infrastructure layer
- **Data mappers:** Transform between domain entities and persistence models
- **Unit of work:** Transaction boundaries managed at the module level

```
Domain Layer:
  Order (entity)
  OrderRepository (interface)

Infrastructure Layer:
  PostgresOrderRepository (implementation)
  OrderDataMapper (mapping logic)
```

## Ports & Adapters (Hexagonal Architecture)

Each module follows hexagonal architecture internally. External integrations are adapters; business logic is the port.

- **Ports:** Interfaces defining what the module needs from the outside world
- **Adapters:** Implementations connecting ports to external systems (databases, APIs, message brokers)
- **Driving adapters:** Inbound (API controllers, event handlers)
- **Driven adapters:** Outbound (database repositories, external API clients)

## Module Boundary Contracts

Every cross-module interaction is governed by a formal contract. Undocumented interactions are violations.

> **Governance status:** no MM rule specifies contract format, versioning, or deprecation. MM-R05 governs database separation and MM-R06 governs the use of domain events for async reactions; neither covers the practices below. Treat this section as a board convention, not an executable rule.

- **Contract format:** OpenAPI specification or equivalent machine-readable format
- **Versioning:** Contracts follow semantic versioning; breaking changes require migration plans
- **Validation:** Contract compliance is tested in CI; violations fail the build
- **Deprecation:** Contracts deprecated for minimum 2 release cycles before removal

---

[Back to Modular Monolith Profile](./README.md)
