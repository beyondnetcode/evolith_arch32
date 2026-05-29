# [ADR 0033](0033-transactional-outbox-pattern.md): Patrón Transactional Outbox para Mensajería Asíncrona

## Estado
Propuesto (Aprobado vía Roadmap de Madurez)

## Fecha
2026-05-11

## Contexto
La comunicación desacoplada estándar se basa en actualizar una base de datos y emitir un evento al bróker de mensajes (RabbitMQ/Kafka). Sin embargo, estas son operaciones de red separadas. Si el commit de la base de datos tiene éxito pero el bróker se cae antes de que se envíe el evento, el sistema entra en un estado fantasma (datos persistidos pero las acciones aguas abajo nunca se disparan). El fallo de escritura dual es un riesgo conocido de consistencia de datos.

## Decisión
Adoptar formalmente el **Patrón Transactional Outbox** para garantizar la propagación atómica del estado entre el almacén relacional y los canales de eventos asíncronos:

1. **Tabla Outbox**: Cada contexto delimitado incluye una tabla `outbox_events` dentro de su esquema aislado de PostgreSQL.
2. **Transacción Atómica**: La capa de Aplicación escribe la mutación de la Entidad de Negocio Y guarda el `DomainEvent` intencionado en la tabla `outbox_events` dentro de la misma transacción local ACID SQL exacta (gobernada vía el patrón Unit of Work).
3. **Procesador de Relevo (Relay)**: Un relevo de mensajes garantizado y externo (ej. Debezium para CDC o un trabajador dedicado de sondeo en segundo plano) lee los `outbox_events` y los empuja hacia el Bus de Mensajes.
4. **Confirmar y Podar (Acknowledge & Prune)**: Una vez que el Bus de Mensajes acusa recibo (ACK), el evento se marca como `enviado` en la outbox o se archiva.

## Consecuencias

### Positivas
- **Entrega Garantizada Al Menos Una Vez (At-Least-Once)**: Elimina la inconsistencia de escritura dual. Si el sistema cae, el evento reside seguro en PostgreSQL pendiente de reintento.
- **Estabilidad 100% Asíncrona**: Protege los flujos operativos de caídas de red temporales de RabbitMQ.

### Negativas
- Introduce una sobrecarga marginal de escritura en la base de datos (guardar la fila del evento).
- Requiere el despliegue operativo de un trabajador/servicio de relevo (Relay) para reenviar los eventos encolados.

## Referencias
- [Transactional Outbox Pattern (Microservices.io)](https://microservices.io/patterns/data/transactional-outbox.html)
- [ADR-0015: Bus de Eventos Inyectable](./0015-event-driven-architecture-intra-domain.md)

---
[Volver al Índice](./README.es.md)
