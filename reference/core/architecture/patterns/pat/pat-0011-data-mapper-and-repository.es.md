# PAT-0011: Data Mapper y Repositorio

> **Navegación bilingüe:** [English](./pat-0011-data-mapper-and-repository.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Estructura  
**Estado:** Accepted  
**También conocido como:** Repository Pattern, Pure Domain Model  

---

## Problema

Una entidad Active Record es a la vez un objeto de negocio y una fila. Sus reglas de negocio no pueden probarse sin base de datos, y toda preocupación de persistencia — carga diferida, seguimiento de cambios, vida de la conexión — se filtra al razonamiento de dominio.

## Fuerzas

- Active Record es más rápido de escribir para CRUD simple y más lento de cambiar para dominios reales.
- El mapeo explícito duplica listas de campos; esa duplicación es el costo de la frontera.
- Los límites transaccionales deben vivir en algún sitio, y el dominio es el lugar equivocado.

## Solución (norma)

Las entidades de dominio son objetos de negocio puros, sin conciencia de persistencia ni referencia a frameworks de persistencia. Las interfaces de repositorio se definen en la capa de dominio y se implementan en infraestructura. Los data mappers traducen entre entidades de dominio y modelos de persistencia. Los límites transaccionales se gestionan a nivel de módulo. Active Record está prohibido.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Monolito Modular | Obligatorio | Se aplica por módulo; la interfaz de repositorio vive en la capa de dominio del módulo y la implementación en su capa de infraestructura. Enforzado por MM-R12. |
| Módulos Distribuidos | Recomendado | No cambia con la división; la implementación del repositorio puede pasar a ser un cliente remoto. |
| Microservicios | Recomendado | Mantiene el dominio del servicio comprobable de forma independiente de su almacén de datos. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **MM-R12** | Modelo de dominio puro (enforcement de Data Mapper) | ruleset de topología | `src/rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` |

## ADRs de gobierno

Ninguno. Ningún ADR del corpus registra una decisión que cubra este patrón; el enforcement existe sin decisión registrada.

## Variantes

Ninguna registrada.

## Relaciones

- **es variante de PAT-0010** — El caso específico de persistencia de la frontera de puertos y adaptadores.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `reference/core/architecture/topologies/progressive-axis/modular-monolith/patterns.md` — Sección Data Mapper & Repository Pattern.

---

**[Volver al catálogo de patrones](../README.es.md)**
