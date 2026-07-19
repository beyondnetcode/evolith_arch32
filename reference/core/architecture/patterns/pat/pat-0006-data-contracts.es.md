# PAT-0006: Contratos de Datos

> **Navegación bilingüe:** [English](./pat-0006-data-contracts.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Contratos  
**Estado:** Accepted  
**También conocido como:** Producer Contracts, Data Product Interface  

---

## Problema

Un productor y un consumidor que acuerdan informalmente la forma, calidad y frescura de un conjunto de datos no tienen un artefacto que la plataforma pueda enforzar. El acuerdo se degrada en silencio a medida que el esquema evoluciona.

## Fuerzas

- Los contratos legibles por máquina restringen a los productores, pero son los únicos que una plataforma puede verificar.
- La compatibilidad hacia atrás limita la evolución del esquema; romperla obliga a un nuevo producto versionado.
- Las garantías de calidad y frescura son tan estructurales como el propio esquema.

## Solución (norma)

Un contrato de datos es un acuerdo formal, legible por máquina y versionado entre productor y consumidor que especifica el esquema, las garantías de calidad, los SLA de frescura y las políticas de acceso de un producto de datos. Los acuerdos manuales no son contratos válidos. Los cambios de esquema mantienen compatibilidad hacia atrás; los cambios incompatibles exigen un nuevo producto de datos versionado.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Data Mesh | Obligatorio | data-mesh.config.json declara hasDataContracts=true y hasBackwardCompatibleContracts=true; la plataforma self-serve media el ciclo de vida del contrato. Enforzado por DAM-R02 y DAM-R08. |
| Orientada a Eventos | Recomendado | Los esquemas de eventos son el artefacto equivalente; ED-R06 impone el mismo invariante de compatibilidad hacia atrás. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **DAM-R02** | Contratos de datos | ruleset de topología | `src/rulesets/topologies/data-mesh/data-mesh.rules.json` |
| **DAM-R08** | Compatibilidad hacia atrás del contrato de datos | ruleset de topología | `src/rulesets/topologies/data-mesh/data-mesh.rules.json` |

## ADRs de gobierno

| ADR | Título registrado | Verificación | Nota |
|---|---|---|---|
| [ADR-0084](../../adrs/core/0084-data-mesh-data-products.es.md) | Data Mesh and Data as a Product (core) | verificado | — |

## Variantes

Ninguna registrada.

## Relaciones

- **complementa a PAT-0008** — Los contratos de consumo documentan el lado del consumidor de la misma relación.
- **es variante de PAT-0004** — El mismo invariante de contrato explícito y versionado aplicado a productos de datos en lugar de a APIs.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `reference/core/architecture/topologies/data/data-mesh/patterns.md` — Sección Data Contracts.

---

**[Volver al catálogo de patrones](../README.es.md)**
