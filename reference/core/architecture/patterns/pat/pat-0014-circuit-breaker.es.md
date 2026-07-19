# PAT-0014: Cortacircuitos

> **Navegación bilingüe:** [English](./pat-0014-circuit-breaker.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Resiliencia  
**Estado:** Accepted  
**También conocido como:** Distributed Circuit Breaker  

---

## Problema

Los fallos síncronos, la latencia excesiva o los timeouts transitorios de una dependencia saliente se propagan hacia atrás: los hilos llamantes se bloquean, los pools de recursos locales se llenan y el llamante deja de estar disponible porque su llamado lo está.

## Fuerzas

- Un cortacircuitos abierto falla rápido al costo de rechazar llamadas que podrían haber tenido éxito.
- El estado por proceso obliga a cada nodo a redescubrir independientemente la misma caída.
- La calibración de umbrales — conteo de errores, timeout, enfriamiento — es donde el patrón suele fallar.

## Solución (norma)

Toda llamada síncrona a un componente que el llamante no posee se envuelve en un cortacircuitos ubicado en el adaptador de infraestructura de salida. Un fallo en el llamado no debe cascadear a un fallo del llamante. El estado del cortacircuitos se comparte a nivel de clúster en lugar de mantenerse por proceso, de modo que si un nodo lo abre, se propaga de inmediato a sus pares.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Módulos Distribuidos | Obligatorio | Todas las llamadas síncronas entre módulos implementan el cortacircuitos; un fallo de módulo no debe cascadear al llamante. Enforzado por DM-R07. |
| Microservicios | Obligatorio | Se combina con aislamiento por mamparo (PAT-0015) y comportamiento de respaldo (PAT-0016) en cada llamada entre servicios. |
| Monolito Modular | Opcional | Las llamadas en proceso no tienen modo de fallo de red; el cortacircuitos aplica solo a integraciones salientes con terceros. |
| IA Agéntica | Recomendado | Las invocaciones de herramientas que alcanzan sistemas externos son llamadas salientes y se envuelven igual. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **DM-R07** | Cortacircuitos para llamadas entre módulos | ruleset de topología | `src/rulesets/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json` |
| **CORE-0011-01** | Conformar a ADR-0011 | ruleset de ADR | `src/rulesets/adr/generated/adr-0011-fault-tolerance-and-resiliency-patterns.rules.json` |

## ADRs de gobierno

| ADR | Título registrado | Verificación | Nota |
|---|---|---|---|
| [ADR-0011](../../adrs/core/0011-fault-tolerance-resiliency-patterns.es.md) | Fault Tolerance and Resiliency Patterns (core) | verificado | El ADR obliga a un cortacircuitos distribuido con estado compartido en el clúster, además de reintentos con backoff exponencial. No cubre mamparos ni respaldos. |

## Variantes

Ninguna registrada.

## Relaciones

- **complementa a PAT-0015** — El mamparo limita cuánto del llamante puede consumir una dependencia que falla; el cortacircuitos deja de llamarla.
- **requiere PAT-0016** — Un cortacircuitos abierto debe devolver algo; el respaldo define qué.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `src/rulesets/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json` — Enunciado de la regla DM-R07. Ninguna guía de patrones en prosa documenta este patrón.
- `reference/core/architecture/adrs/core/0011-fault-tolerance-resiliency-patterns.md` — Decisión registrada.

> **Nota:** Este patrón tenía enforcement completo y cero documentación en todo el corpus antes de esta ficha. Su contenido se deriva del enunciado de la regla y del ADR, no de prosa.

---

**[Volver al catálogo de patrones](../README.es.md)**
