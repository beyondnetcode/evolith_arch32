# PAT-0004: Contratos de API Explícitos y Versionados

> **Navegación bilingüe:** [English](./pat-0004-api-contracts.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Contratos  
**Estado:** Accepted  
**También conocido como:** Contract-First Development, Inter-Module Contracts  

---

## Problema

Cuando la interfaz entre dos componentes solo existe como código, su forma se descubre leyendo la implementación, sus cambios son irrevisables y cada consumidor se entera de un cambio incompatible al fallar.

## Fuerzas

- Los lenguajes de esquema añaden un paso de diseño antes de poder implementar.
- El enfoque contract-first habilita desarrollo en paralelo mediante mocks generados.
- Se requiere un registro para que el versionado y la verificación de compatibilidad sean automáticos y no sociales.

## Solución (norma)

Toda comunicación entre componentes usa definiciones de contrato explícitas en un lenguaje de esquema legible por máquina — Protobuf, JSON Schema u OpenAPI. Los contratos se registran, se versionan y son compatibles hacia atrás dentro de una versión mayor. El contrato se diseña antes que la implementación y es la documentación primaria entre componentes.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Módulos Distribuidos | Obligatorio | Protobuf para RPC interno de alto rendimiento; OpenAPI para HTTP/REST expuesto externamente; todo registrado en un registro de esquemas central. Enforzado por DM-R02. |
| Microservicios | Obligatorio | El enfoque contract-first es la precondición de la desplegabilidad independiente bajo MS-R01. |
| Monolito Modular | Obligatorio | Toda interacción entre módulos se rige por una especificación OpenAPI o equivalente; las interacciones no documentadas son violaciones. |
| Orientada a Eventos | Obligatorio | El contrato es el esquema de evento AsyncAPI; ED-R01 exige strictAsyncApi=true. |
| Data Mesh | Recomendado | Los productos de datos expresan su interfaz como contratos de datos — ver PAT-0006. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **DM-R02** | Los contratos entre módulos son explícitos y versionados | ruleset de topología | `src/rulesets/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json` |

## ADRs de gobierno

Ninguno. Ningún ADR del corpus registra una decisión que cubra este patrón; el enforcement existe sin decisión registrada.

## Variantes

Ninguna registrada.

## Relaciones

- **complementa a PAT-0002** — Las pruebas de contrato verifican en build lo que el contrato afirma.
- **complementa a PAT-0001** — Los contratos publicados son el único camino sancionado a través de una frontera de propiedad de datos.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `reference/core/architecture/topologies/progressive-axis/distributed-modules/patterns.md` — Secciones API Contracts y Contract-First Development.
- `reference/core/architecture/topologies/progressive-axis/modular-monolith/patterns.md` — Sección Module Boundary Contracts.

---

**[Volver al catálogo de patrones](../README.es.md)**
