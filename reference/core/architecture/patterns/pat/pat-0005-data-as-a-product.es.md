# PAT-0005: Datos como Producto

> **Navegación bilingüe:** [English](./pat-0005-data-as-a-product.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Gobernanza  
**Estado:** Accepted  
**También conocido como:** Data Product  

---

## Problema

Los datos compartidos como extractos y vistas ad-hoc no tienen dueño, ni nivel de servicio, ni ciclo de vida. Los consumidores construyen sobre ellos, cambian sin aviso y no hay nadie responsable de la rotura.

## Fuerzas

- Publicar datos con calidad de producto cuesta más que un extracto, y el costo lo asume el productor mientras el beneficio va a los consumidores.
- La descubribilidad y la confiabilidad son propiedades de la plataforma circundante, no del conjunto de datos.
- Los datos en borrador deben quedar fuera del consumo sin bloquear la experimentación del dominio.

## Solución (norma)

Los productos de datos son entidades arquitectónicas de primera clase, con propiedad explícita, SLAs, esquemas y gestión de ciclo de vida. Son activos gestionados, no extractos ni vistas ad-hoc. Cada producto expone una interfaz estable definida por su esquema y debe ser descubrible, direccionable y confiable.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Data Mesh | Obligatorio | El satélite declara isDataProduct=true en data-mesh.config.json; los productos en estado borrador quedan excluidos del índice de descubrimiento. Enforzado por DAM-R01. |
| Microservicios | Recomendado | Un servicio que publica datos analíticos a otros dominios los publica como producto, no como exportación de base de datos. |
| Módulos Distribuidos | Opcional | Aplica cuando los datos de un módulo se consumen más allá de su propio contexto acotado. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **DAM-R01** | Designación de producto de datos | ruleset de topología | `src/rulesets/topologies/data-mesh/data-mesh.rules.json` |

## ADRs de gobierno

| ADR | Título registrado | Verificación | Nota |
|---|---|---|---|
| [ADR-0084](../../adrs/core/0084-data-mesh-data-products.es.md) | Data Mesh and Data as a Product (core) | verificado | — |

## Variantes

Ninguna registrada.

## Relaciones

- **requiere PAT-0006** — Un producto sin contrato de datos no tiene interfaz estable.
- **requiere PAT-0009** — El registro para descubrimiento es prerrequisito de la publicación.
- **complementa a PAT-0007** — La propiedad por dominio es aquello a lo que la gobernanza federada delega.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `reference/core/architecture/topologies/data/data-mesh/patterns.md` — Secciones Data as a Product y Domain Ownership.

---

**[Volver al catálogo de patrones](../README.es.md)**
