# PAT-0012: Esquema por Dominio

> **Navegación bilingüe:** [English](./pat-0012-schema-per-domain.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Propiedad de Datos  
**Estado:** Accepted  
**También conocido como:** Schema-per-Bounded-Context, Modular Monolith Persistence Boundaries  

---

## Problema

Un monolito con código modular pero con una persistencia compartida sin restricciones desarrolla acoplamiento oculto mediante acceso directo a tablas, joins entre dominios y conflictos de migración muy difíciles de eliminar después.

## Fuerzas

- Una única instancia de base de datos hace físicamente posibles los joins entre esquemas aunque estén prohibidos.
- Las claves foráneas entre esquemas son el atajo más cómodo y más dañino disponible.
- Las migraciones independientes por módulo cambian comodidad por un camino futuro de extracción.

## Solución (norma)

Cada contexto acotado posee su esquema de base de datos en exclusiva. Los esquemas compartidos están prohibidos y el acceso a datos entre módulos ocurre únicamente a través de APIs publicadas. Cada módulo ejecuta sus migraciones de forma independiente, sin dependencias de migración entre módulos. Las claves foráneas entre esquemas de módulos están prohibidas; en su lugar se usan referencias a nivel de aplicación.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Monolito Modular | Obligatorio | Cada contexto acotado tiene su propio esquema o instancia de base de datos; el nombrado sigue {module_name}_{domain_entity}. Enforzado por MM-R05 y MM-R02. |
| Módulos Distribuidos | Obligatorio | La propiedad de esquema se endurece en aislamiento de datos del módulo bajo DM-R03. |
| Microservicios | Obligatorio | Escala a granularidad de instancia — ver PAT-0001. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **MM-R05** | Sin base de datos compartida entre contextos acotados | ruleset de topología | `src/rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` |
| **MM-R02** | Fronteras explícitas de contexto acotado | ruleset de topología | `src/rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` |
| **CORE-0031-01** | Conformar a ADR-0031 | ruleset de ADR | `src/rulesets/adr/generated/adr-0031-schema-per-bounded-context-and-domain-event-catalog.rules.json` |

## ADRs de gobierno

| ADR | Título registrado | Verificación | Nota |
|---|---|---|---|
| [ADR-0067](../../adrs/core/0067-modular-monolith-schema-per-domain.es.md) | Modular Monolith Persistence Boundaries (core) | verificado | La guía de patrones de modular-monolith titula esta sección 'Schema-per-Domain (ADR-0067)'; el título registrado del ADR es 'Modular Monolith Persistence Boundaries'. La decisión cubre la afirmación. |
| [ADR-0031](../../adrs/core/0031-schema-per-context-domain-event-catalog.es.md) | Schema-per-Bounded-Context and Domain Event Catalog (core) | verificado | — |

## Variantes

| Variante | Alcance | Invariante | PAT |
|---|---|---|---|
| Schema-per-Domain | contexto acotado | Un contexto acotado posee su esquema en exclusiva dentro de una única instancia de base de datos. | PAT-0012 |
| Database-per-Service | servicio | Un servicio posee su instancia de base de datos en exclusiva. El mismo invariante con granularidad de despliegue. | PAT-0001 |

## Relaciones

- **es variante de PAT-0001** — El mismo invariante — nadie toca la persistencia de otro — con granularidad de esquema en lugar de instancia.
- **complementa a PAT-0013** — Un módulo cuyo esquema ya es independiente puede migrarse a una base de datos autónoma.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `reference/core/architecture/topologies/progressive-axis/modular-monolith/patterns.md` — Sección Schema-per-Domain.

---

**[Volver al catálogo de patrones](../README.es.md)**
