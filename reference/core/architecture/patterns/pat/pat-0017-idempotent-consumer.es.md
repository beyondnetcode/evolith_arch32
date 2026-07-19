# PAT-0017: Consumidor Idempotente

> **Navegación bilingüe:** [English](./pat-0017-idempotent-consumer.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Resiliencia  
**Estado:** Accepted  
**También conocido como:** Deduplicated Consumer, Exactly-Once Effect  

---

## Problema

Todo mecanismo de entrega confiable disponible — reentrega del broker, relevo de outbox, reintento del cliente, compensación de saga — es at-least-once. Un consumidor que asume entrega única produce agregados duplicados o estado inconsistente la primera vez que ocurre un failover.

## Fuerzas

- La entrega exactly-once no es alcanzable; el efecto exactly-once sí, y solo en el consumidor.
- El estado de deduplicación debe ser durable al menos durante la ventana de reentrega.
- La clave de deduplicación debe suministrarla el productor o derivarse determinísticamente, nunca generarse al recibir.

## Solución (norma)

Todo consumidor implementa idempotencia mediante una clave de mensaje deduplicada. La clave identifica la operación lógica, no el intento de entrega. Una clave repetida produce el resultado registrado sin volver a ejecutar el manejador.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Orientada a Eventos | Obligatorio | Los consumidores declaran hasIdempotencyKey=true en event-driven.config.json. Enforzado por ED-R05. |
| Módulos Distribuidos | Obligatorio | Los consumidores de eventos deben manejar la entrega duplicada con elegancia; el orden entre módulos es solo de mejor esfuerzo. |
| Microservicios | Obligatorio | Aplica tanto a endpoints HTTP mutantes como a manejadores de eventos, ya que los reintentos alcanzan a ambos. |
| Serverless | Obligatorio | Las fuentes de eventos gestionadas reintentan ante cualquier resultado no exitoso, lo que hace rutinaria la invocación duplicada. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **ED-R05** | Contrato de consumidor idempotente | ruleset de topología | `src/rulesets/topologies/event-driven/event-driven.rules.json` |

## ADRs de gobierno

| ADR | Título registrado | Verificación | Nota |
|---|---|---|---|
| [ADR-0036](../../adrs/core/0036-message-bus-delivery-strategy-fifo-dlq.es.md) | Message Bus Delivery & Flow Control Strategy (core) | verificado | La sección 6 del ADR registra un 'Idempotent Consumer Mandate'. |

## Variantes

| Variante | Alcance | Invariante | PAT |
|---|---|---|---|
| Idempotency-key middleware | servicio | Una clave suministrada por el cliente se registra junto con su respuesta y se reproduce literalmente al repetirse, sin invocar el manejador. Realizado para .NET en CP-03. | — |
| Consumer-side deduplication store | servicio | Las claves de mensaje procesadas se persisten y se verifican antes de manejar el mensaje. | — |

## Relaciones

- **requiere PAT-0003** — El outbox es la fuente más común de los duplicados que este patrón absorbe.

## Implementaciones

- [CP-03](../dotnet/cp-03-lightweight-http-idempotency.es.md) — dotnet

## Fuentes

- `src/rulesets/topologies/event-driven/event-driven.rules.json` — Enunciado de la regla ED-R05.
- `reference/core/architecture/topologies/progressive-axis/distributed-modules/patterns.md` — Sección Event Choreography, viñeta de consumidores idempotentes.

---

**[Volver al catálogo de patrones](../README.es.md)**
