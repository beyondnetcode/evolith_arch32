# PAT-0013: Preparación Strangler Fig

> **Navegación bilingüe:** [English](./pat-0013-strangler-fig-preparation.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Entrega  
**Estado:** Accepted  
**También conocido como:** Extraction Readiness, Migration-Ready Modularity  

---

## Problema

Extraer un módulo de un monolito es una reescritura siempre que el módulo comparta estado en memoria, no tenga frontera de interfaz o no pueda separar su esquema. La decisión de extraer llega entonces años después del código que la hizo imposible.

## Fuerzas

- Prepararse para una extracción que puede nunca ocurrir es trabajo especulativo con costo presente real.
- La preparación solo es creíble si se mide continuamente, no si se afirma al momento de migrar.
- El puntaje debe condicionar una fase; de lo contrario es un informe que nadie lee.

## Solución (norma)

Los módulos se estructuran para poder extraerse quirúrgicamente sin reescritura: cada módulo expone una frontera de API bien definida, los módulos no comparten estado en memoria ni variables estáticas, el esquema de cada módulo puede migrarse a una base de datos autónoma, y los módulos publican eventos de dominio a los que un servicio extraído pueda suscribirse. La preparación para la extracción se puntúa de forma continua y el puntaje condiciona la fase de diseño.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Monolito Modular | Obligatorio | El satélite rastrea un puntaje de preparación para extracción que debe ser de al menos 70% para pasar la compuerta de Diseño de Fase 2 cuando se planifica un paso a módulos distribuidos. Enforzado por MM-R07. |
| Módulos Distribuidos | Obligatorio | El mismo puntaje se reevalúa contra criterios específicos de microservicios y debe ser de al menos 80%. Enforzado por DM-R08. |
| Microservicios | No aplica | La extracción ya ocurrió; el puntaje ya no condiciona nada. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **MM-R07** | Mantener el puntaje de preparación para extracción (`>= 70%`) | ruleset de topología | `src/rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` |
| **DM-R08** | Mantener el puntaje de extracción F2 (`>= 80%`) | ruleset de topología | `src/rulesets/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json` |
| **CORE-0045-01** | Conformar a ADR-0045 | ruleset de ADR | `src/rulesets/adr/generated/adr-0045-microservice-extraction-readiness-criteria.rules.json` |

## ADRs de gobierno

| ADR | Título registrado | Verificación | Nota |
|---|---|---|---|
| [ADR-0045](../../adrs/core/0045-microservice-extraction-readiness-criteria.es.md) | Microservice Extraction Readiness Criteria (core) | verificado | — |

## Variantes

Ninguna registrada.

## Relaciones

- **requiere PAT-0012** — Un módulo cuyo esquema no es separable no puede alcanzar un puntaje de preparación aprobatorio.
- **requiere PAT-0010** — La frontera de API bien definida que mide el puntaje es la superficie de puertos del módulo.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `reference/core/architecture/topologies/progressive-axis/modular-monolith/patterns.md` — Sección Strangler Fig Preparation.

---

**[Volver al catálogo de patrones](../README.es.md)**
