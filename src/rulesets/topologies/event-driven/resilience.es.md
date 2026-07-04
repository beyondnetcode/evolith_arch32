# Guía de Resiliencia Orientada a Eventos

> **Navegación Bilingüe:** [English](./resilience.md) | [Español](./resilience.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Orientada a Eventos

## Propósito

Definir patrones de resiliencia para arquitecturas orientadas a eventos: consumidores idempotentes, semántica de exactamente una vez, manejo de píldoras venenosas, retroceso de reintentos, rebalanceo de consumidores y outbox transaccional.

## Consumidores Idempotentes — ED-R05

- Cada consumidor DEBE procesar eventos de forma idempotente; se asume entrega duplicada.
- Usar claves de deduplicación compuestas por `(event-id, consumer-group)` almacenadas en una caché duradera.
- Establecer la ventana de deduplicación en al menos 2x el período máximo de retención del broker.

## Semántica de Exactamente Una Vez

- Preferir productores idempotentes con IDs de productor sobre garantías de exactamente una vez a nivel de broker.
- Para flujos de trabajo críticos, usar productores transaccionales que escriban atómicamente en múltiples temas.
- Documentar el nivel de garantía semántica (al menos una vez, efectivamente una vez) por consumidor.

## Manejo de Píldoras Venenosas — ED-R03

- Detectar píldoras venenosas rastreando conteos de reintentos por mensaje en el estado del consumidor.
- Después del agotamiento configurable de reintentos (predeterminado: 3), enrutar el mensaje a DLQ con contexto completo.
- Alertar cuando la tasa de píldoras venenosas exceda el 0.1% del volumen total de mensajes.

## Retroceso de Reintentos

- Implementar retroceso exponencial con jitter: `base * 2^attempto + random(0, base)`.
- Establecer un máximo de retraso de reintento de 5 minutos; escalar a DLQ después de alcanzar el máximo.
- Usar colas de reintento separadas para categorías de falla transitoria vs. permanente.

## Rebalanceo de Consumidores

- Diseñar consumidores para manejar eventos de rebalanceo con gracia; pausar procesamiento durante rebalanceo.
- Usar asignación de partición cooperativa y pegajosa para minimizar movimiento de particiones.
- Monitorear frecuencia de rebalanceo; investigar si los rebalanceos exceden 1 por hora por grupo de consumidores.

## Outbox Transaccional — ED-R02

- Escribir eventos de dominio en una tabla de outbox dentro de la misma transacción que los cambios de estado del negocio.
- Publicar eventos de outbox mediante CDC o editor de sondeo al broker.
- Garantizar que los registros de outbox se publiquen eventualmente; monitorear la profundidad del outbox.

## Aplicabilidad Componible

| Componible | Orientación |
|---|---|
| Monolito Modular | El outbox es intra-base de datos; idempotencia vía caché compartida. |
| Módulos Distribuidos | El outbox entre módulos requiere diseño cuidadoso de límites de transacción. |
| Microservicios | Outbox por servicio; aislamiento de consumidores por límite de servicio. |
| Serverless | Deduplicación gestionada; outbox mediante disparadores de base de datos. |
| Computación Edge | Outbox local con sincronización eventual al broker en la nube. |

## Referencias ADR

- **ADR-0015**: Estándares de resiliencia de consumidores y políticas de reintento.
- **ADR-0079**: Patrón de implementación de outbox transaccional.

---

[Volver al Perfil Orientado a Eventos](./README.es.md)
