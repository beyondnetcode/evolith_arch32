# PAT-0009: Descubrimiento y Registro

> **Navegación bilingüe:** [English](./pat-0009-discovery-and-registration.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Gobernanza  
**Estado:** Accepted  
**También conocido como:** Data Catalog Registration, Discoverability  

---

## Problema

Un activo publicado que nadie puede encontrar es reconstruido por cada dominio que lo necesita, y un activo usado sin entrada de catálogo no tiene dueño registrado a quien contactar cuando falla.

## Fuerzas

- El registro debe ser una compuerta de publicación, no una tarea de documentación posterior.
- Los activos en borrador deben quedar fuera del índice sin bloquear su desarrollo.
- Los metadatos del catálogo se pudren salvo que el registro se enforce en vez de recomendarse.

## Solución (norma)

Todo activo publicado se registra en un índice central de descubrimiento con dueño, descripción, esquema, clasificación, SLOs, información de contacto e instrucciones de consumo. El registro es prerrequisito de la publicación. Los activos no registrados son invisibles para los consumidores y no deben usarse para compartir entre dominios; los activos en borrador quedan excluidos del índice.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Data Mesh | Obligatorio | data-mesh.config.json declara hasDiscoveryRegistration=true; el registro precede a la publicación. Enforzado por DAM-R09. |
| Microservicios | Recomendado | El análogo en tiempo de ejecución es el registro de servicios con instancias verificadas por health check. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **DAM-R09** | Registro de descubribilidad del producto de datos | ruleset de topología | `src/rulesets/topologies/data-mesh/data-mesh.rules.json` |

## ADRs de gobierno

Ninguno. Ningún ADR del corpus registra una decisión que cubra este patrón; el enforcement existe sin decisión registrada.

## Variantes

Ninguna registrada.

## Relaciones

- **requiere PAT-0005** — Lo que se registra es un producto, con dueño y SLA.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `src/rulesets/topologies/data-mesh/patterns.md` — Sección Discovery and Registration.

---

**[Volver al catálogo de patrones](../README.es.md)**
