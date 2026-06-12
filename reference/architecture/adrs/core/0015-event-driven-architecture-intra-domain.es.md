# [ADR 0015](0015-event-driven-architecture-intra-domain.md): Arquitectura Dirigida por Eventos (EDA) para la Comunicación Intra-Dominio

## Estado
Aprobado

## Fecha
2026-05-08

## Actualizado
2026-05-11 - Se añadió referencia al Catálogo de Eventos de Dominio [ADR-0031](0031-schema-per-context-domain-event-catalog.es.md). Las definiciones de eventos y el mapa de suscripción entre contextos están ahora formalmente especificados en ese registro.

## Contexto
A medida que el Monolito Modular crece, permitir que los contextos delimitados se llamen entre sí de forma síncrona crea un acoplamiento estrecho. Si un contexto es lento o falla, no debería propagar fallos en cascada hacia otros contextos. Adicionalmente, la comunicación entre contextos debe definirse como contratos tipados explícitos para permitir una extracción futura segura a microservicios ([ADR-0006](0006-microservices-transition-sidecar-pattern.es.md)).

## Decisión

Adoptaremos una **Arquitectura Dirigida por Eventos (EDA)** asíncrona para toda la comunicación entre contextos delimitados:

### 1. Bus de Eventos Inyectable (`IEventBusPort`)
El dominio nunca importará un bróker de mensajes concreto. Toda la comunicación asíncrona se enruta a través de un puerto TypeScript puro:

```typescript
export interface IEventBusPort {
 publish<T extends DomainEvent>(event: T): Promise<void>;
 subscribe<T extends DomainEvent>(
 eventClass: new (...args: any[]) => T,
 handler: (event: T) => Promise<void>,
 ): void;
}
```

La implementación concreta se inyecta por el contenedor DI de NestJS en el arranque vía una variable de entorno:

| `EVENT_BUS_IMPL` | Implementación | Uso |
| :--- | :--- | :--- |
| `in-memory` | `EventEmitter2` de NestJS | Desarrollo / Pruebas |
| `rabbitmq` | RabbitMQ vía `@golevelup/nestjs-rabbitmq` | Producción |
| `kafka` | Kafka vía `kafkajs` | Escenarios de alta escala |

### 2. Eventos de Dominio como Contratos entre Contextos
Cada evento que cruza un límite de contexto delimitado debe ser una clase tipada con un `eventId` (UUID para idempotencia) y una marca de tiempo `occurredAt`. El catálogo completo aprobado de eventos entre contextos se define en:

 **[ADR-0031: Catálogo de Eventos de Dominio](../../adrs/core/0031-schema-per-context-domain-event-catalog.es.md)**

### 3. Eventos Intra-Contexto (Internos) vs Eventos Entre-Contextos
- **Eventos Intra-contexto** (dentro del mismo contexto delimitado): Pueden usar emisores de eventos de NestJS síncronos sin restricciones de esquema.
- **Eventos Entre-contextos** (cruzando límites de contexto delimitado): DEBEN usar `IEventBusPort` y DEBEN ajustarse a las definiciones de carga útil tipada en el [ADR-0031](0031-schema-per-context-domain-event-catalog.es.md).

### 4. Preparación para Futuros Microservicios ([ADR-0006](0006-microservices-transition-sidecar-pattern.es.md))
Cuando un contexto delimitado sea extraído a un microservicio independiente:
- Se reemplaza la implementación del bus `in-memory` con `rabbitmq` o `kafka` - **cero cambios de código en el dominio requeridos**.
- La abstracción `IEventBusPort` garantiza que el dominio permanezca agnóstico a la capa de transporte.

## Consecuencias
* **Positivas**: Alto desacoplamiento, aislamiento de fallos, contratos de integración explícitos, ruta fluida de transición a microservicios.
* **Negativas**: Se debe abrazar la consistencia eventual a través de los contextos. Se requiere trazado distribuido ([ADR-0007](../nodejs/0007-observability-telemetry-loki-opentelemetry.es.md)) para seguir los flujos de eventos a través de los límites de los contextos.

## Referencias
- [ADR-0006: Futuros Microservicios vía Dapr](../../adrs/core/0006-microservices-transition-sidecar-pattern.es.md)
- [ADR-0007: Observabilidad con OpenTelemetry](../../adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.es.md)
- [ADR-0031: Esquema por Contexto y Catálogo de Eventos de Dominio](../../adrs/core/0031-schema-per-context-domain-event-catalog.es.md)





## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde a medida que el Monolito Modular crece, permitir que los contextos delimitados se llamen entre sí de forma síncrona crea un acoplamiento estrecho, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Arquitectura Dirigida por Eventos (EDA) para la Comunicación Intra-Dominio
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [ADR-0006: Futuros Microservicios vía Dapr](../../adrs/core/0006-microservices-transition-sidecar-pattern.es.md)
- [ADR-0007: Observabilidad con OpenTelemetry](../../adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.es.md)
- [ADR-0031: Esquema por Contexto y Catálogo de Eventos de Dominio](../../adrs/core/0031-schema-per-context-domain-event-catalog.es.md)

---
[Volver al Índice](./README.es.md)
