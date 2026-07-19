# PAT-0007: Gobernanza Federada

> **Navegación bilingüe:** [English](./pat-0007-federated-governance.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Gobernanza  
**Estado:** Accepted  
**También conocido como:** Federated Computational Governance  

---

## Problema

La gobernanza totalmente centralizada se convierte en un cuello de botella de revisión que los dominios esquivan; la totalmente descentralizada produce tantos estándares como dominios haya.

## Fuerzas

- Los órganos centrales tienen el mandato de consistencia pero no el conocimiento de dominio para aplicarlo.
- Los dominios tienen el conocimiento pero ningún incentivo hacia la consistencia organizacional.
- Las excepciones son inevitables y deben ser visibles en lugar de informales.

## Solución (norma)

La gobernanza opera en dos niveles. Un órgano central define la política — clasificación, seguridad, cumplimiento — y los dominios la enforzan dentro de las fronteras de sus propios productos. Las excepciones de gobernanza requieren aprobación formal y se registran en el registro de gobernanza.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Data Mesh | Obligatorio | data-mesh.config.json declara federatedGovernance=true; las excepciones se registran en el registro de gobernanza. Enforzado por DAM-R03. |
| Microservicios | Recomendado | Política central con enforcement por servicio replica la misma división con granularidad de servicio. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **DAM-R03** | Gobernanza federada | ruleset de topología | `src/rulesets/topologies/data-mesh/data-mesh.rules.json` |

## ADRs de gobierno

| ADR | Título registrado | Verificación | Nota |
|---|---|---|---|
| [ADR-0084](../../adrs/core/0084-data-mesh-data-products.es.md) | Data Mesh and Data as a Product (core) | verificado | — |

## Variantes

Ninguna registrada.

## Relaciones

- **complementa a PAT-0005** — La gobernanza federada presupone propiedad de dominio clara sobre cada producto.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `reference/core/architecture/topologies/data/data-mesh/patterns.md` — Sección Federated Governance.

---

**[Volver al catálogo de patrones](../README.es.md)**
