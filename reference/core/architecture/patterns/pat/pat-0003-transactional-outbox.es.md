# PAT-0003: Outbox Transaccional

> **Navegación bilingüe:** [English](./pat-0003-transactional-outbox.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Integración  
**Estado:** Accepted  
**También conocido como:** Outbox Pattern, Reliable Event Publication  

---

## Problema

Escribir en la base de datos y publicar en el broker son dos operaciones distintas. Si el proceso muere entre ambas, el cambio de estado queda durable pero el evento nunca llega a los suscriptores, y ningún reintento puede recuperar un evento que jamás se registró.

## Fuerzas

- Las transacciones distribuidas entre base de datos y broker no están disponibles o son inaceptablemente costosas.
- El relevo at-least-once es alcanzable; la publicación exactly-once no lo es.
- El relevo añade latencia entre la escritura de negocio y la visibilidad del evento.

## Solución (norma)

Los eventos se escriben en una tabla outbox dentro de la misma transacción de base de datos que la escritura de negocio. Un relevo aparte — captura de cambios o un publicador por sondeo — traslada las filas del outbox al broker. Como el relevo es at-least-once, los consumidores deben deduplicar.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Orientada a Eventos | Obligatorio | El satélite declara transactionalOutbox=true en event-driven.config.json. Enforzado por ED-R02. |
| Microservicios | Recomendado | Cada servicio releva su propio outbox; el outbox nunca cruza la frontera de datos de un servicio. |
| Módulos Distribuidos | Recomendado | Se aplica por módulo, junto a payloads de evento validados por esquema bajo DM-R04. |
| Monolito Modular | Opcional | El outbox es intra-base-de-datos; la brecha de durabilidad que cierra es más estrecha dentro de una única unidad de despliegue. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **ED-R02** | Outbox Transaccional | ruleset de topología | `src/rulesets/topologies/event-driven/event-driven.rules.json` |
| **CORE-0033-01** | Honrar la decisión de diseño de ADR-0033 | ruleset de ADR | `src/rulesets/adr/generated/adr-0033-transactional-outbox-pattern-for-async-messaging.rules.json` |

## ADRs de gobierno

| ADR | Título registrado | Verificación | Nota |
|---|---|---|---|
| [ADR-0033](../../adrs/core/0033-transactional-outbox-pattern.es.md) | Transactional Outbox Pattern for Async Messaging (core) | verificado | — |

## Variantes

| Variante | Alcance | Invariante | PAT |
|---|---|---|---|
| CDC relay | servicio | Un conector de captura de cambios transmite al broker las filas de outbox confirmadas, sin código de aplicación. | — |
| Polling publisher | servicio | Un publicador programado lee las filas de outbox no enviadas y las marca como despachadas tras el acuse del broker. | — |

## Relaciones

- **requiere PAT-0017** — El outbox publica duplicados durante un failover; sin consumidores idempotentes el patrón traslada el defecto en vez de corregirlo.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `reference/core/architecture/topologies/integration/event-driven/patterns.md` — Sección Transactional Outbox.

> **Nota:** Este patrón está enforzado por dos motores independientes: el ruleset de la topología event-driven (ED-R02) y el ruleset generado del ADR (CORE-0033-01).

---

**[Volver al catálogo de patrones](../README.es.md)**
