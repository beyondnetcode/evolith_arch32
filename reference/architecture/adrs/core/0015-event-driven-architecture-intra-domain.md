# [ADR 0015](0015-event-driven-architecture-intra-domain.md): Event-Driven Architecture (EDA) for Intra-Domain Communication

## Status
Approved

## Date
2026-05-08

## Updated
2026-05-11 - Added reference to [ADR-0031](0031-schema-per-context-domain-event-catalog.md) Domain Event Catalog. Event definitions and the cross-context subscription map are now formally specified in that record.

## Context
As the Modular Monolith grows, allowing bounded contexts to call each other synchronously creates tight coupling. If one context is slow or fails, it should not cascade failures into other contexts. Additionally, inter-context communication must be defined as explicit typed contracts to enable safe future microservices extraction ([ADR-0006](0006-microservices-transition-sidecar-pattern.md)).

## Decision

We will adopt an asynchronous **Event-Driven Architecture (EDA)** for all cross-bounded-context communication:

### 1. Injectable Event Bus (`IEventBusPort`)
The domain will never import a concrete message broker. All async communication is routed through a pure TypeScript port:

```typescript
export interface IEventBusPort {
 publish<T extends DomainEvent>(event: T): Promise<void>;
 subscribe<T extends DomainEvent>(
 eventClass: new (...args: any[]) => T,
 handler: (event: T) => Promise<void>,
 ): void;
}
```

The concrete implementation is injected by the NestJS DI container at startup via an environment variable:

| `EVENT_BUS_IMPL` | Implementation | Usage |
| :--- | :--- | :--- |
| `in-memory` | NestJS `EventEmitter2` | Development / Testing |
| `rabbitmq` | RabbitMQ via `@golevelup/nestjs-rabbitmq` | Production |
| `kafka` | Kafka via `kafkajs` | High-scale scenarios |

### 2. Domain Events as Cross-Context Contracts
Every event that crosses a bounded context boundary must be a typed class with an `eventId` (UUID for idempotency) and `occurredAt` timestamp. The complete approved catalog of cross-context events is defined in:

-> **[ADR-0031: Domain Event Catalog](../../adrs/core/0031-schema-per-context-domain-event-catalog.md)**

### 3. Intra-Context (Internal) vs Cross-Context Events
- **Intra-context events** (within the same bounded context): May use synchronous NestJS event emitters with no schema constraints.
- **Cross-context events** (crossing bounded context boundaries): MUST use `IEventBusPort` and MUST conform to the typed payload definitions in [ADR-0031](0031-schema-per-context-domain-event-catalog.md).

### 4. Future Microservices Readiness ([ADR-0006](0006-microservices-transition-sidecar-pattern.md))
When a bounded context is extracted into an independent microservice:
- Replace the `in-memory` bus implementation with `rabbitmq` or `kafka` - **zero domain code changes required**.
- The `IEventBusPort` abstraction guarantees the domain remains agnostic to the transport layer.

## Consequences
* **Pros**: High decoupling, fault isolation, explicit integration contracts, smooth microservices transition path.
* **Cons**: Eventual consistency across contexts must be embraced. Distributed tracing ([ADR-0007](../nodejs/0007-observability-telemetry-loki-opentelemetry.md)) is required to follow event flows across context boundaries.

## References
- [ADR-0006: Future Microservices via Dapr](../../adrs/core/0006-microservices-transition-sidecar-pattern.md)
- [ADR-0007: Observability with OpenTelemetry](../../adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)
- [ADR-0031: Schema-per-Context and Domain Event Catalog](../../adrs/core/0031-schema-per-context-domain-event-catalog.md)





## Objective and Scope

Historical backfill: Address the architectural tension where as the Modular Monolith grows, allowing bounded contexts to call each other synchronously creates tight coupling, establishing a standard boundary.

## Options Considered

- **Selected:** Event-Driven Architecture (EDA) for Intra-Domain Communication
- **Others:** Unknown (historical record does not explicitly enumerate rejected alternatives).

## Evidence and Evaluation Criteria

Unknown (historical record; evaluated against general architectural principles of maintainability and reliability).

## Related Decisions and Standards

- [ADR-0006: Future Microservices via Dapr](../../adrs/core/0006-microservices-transition-sidecar-pattern.md)
- [ADR-0007: Observability with OpenTelemetry](../../adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)
- [ADR-0031: Schema-per-Context and Domain Event Catalog](../../adrs/core/0031-schema-per-context-domain-event-catalog.md)

---
[Back to Index](./README.md)
