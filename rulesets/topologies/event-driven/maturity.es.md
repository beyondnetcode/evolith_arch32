# Guia de Adopcion, Operacion y Evolucion Event-Driven

> **Navegacion Bilingue:** [English Version](./maturity.md)

## Adoption

Adopte esta topologia cuando bounded contexts, modulos o servicios deban coordinar sin acoplamiento sincrono fuerte. Comience con contratos de eventos explicitos, publicacion confiable mediante Transactional Outbox y diseno de consumidores idempotentes.

## Operations

Opere uno o mas brokers de mensajes o buses de eventos. Monitoree la correlacion de flujo de eventos, lag de consumidores, profundidad de dead-letter queue y evidencia de replay como parte de la validacion normal de arquitectura.

## Security

Autorice la produccion y consumo de eventos en las fronteras del broker y la aplicacion. Nunca incruste datos sensibles en payloads de eventos; use identificadores de referencia y un plano de datos seguro para la recuperacion de payloads.

## Resilience

Disene consumidores para reintentos idempotentes, escalamiento a dead-letter para eventos no procesables y tolerancia a evolucion de schema. Prefiera redistribucion gestionada por broker sobre bucles de reintento a nivel de aplicacion.

## Patterns and Anti-Patterns

Use contratos AsyncAPI explicitos, Transactional Outbox para publicacion confiable, Dead Letter Queues para manejo de mensajes fallidos y versionado de eventos con compatibilidad hacia atras. No comparta internos de dominio a traves de eventos, use eventos para orquestacion de workflows ni asuma entrega en orden sin secuenciacion explicita.

## Evolution

Migre a integracion event-driven solo cuando la coordinacion asincrona este justificada por requisitos de workflow de negocio. Preserve contratos de eventos y registros de schema para que la migracion de consumidores siga siendo deliberada.

## Validation Checklist

- Valide la configuracion de topologia con `topology.config.schema.json` y ambos fixtures.
- Ejecute la evaluacion Native y OPA mediante el plano de control compartido.
- Confirme ADRs aprobados, guia bilingue y pruebas positivas y negativas reproducibles.

---
[Volver al Perfil Event-Driven](./README.es.md)
