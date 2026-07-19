# PAT-0008: Contratos de Consumo

> **Navegación bilingüe:** [English](./pat-0008-consumption-contracts.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Contratos  
**Estado:** Accepted  
**También conocido como:** Consumer Registration  

---

## Problema

Un productor que no sabe quién consume su producto, de qué campos dependen ni con qué volumen, no puede evaluar el radio de impacto de ningún cambio ni avisar a nadie antes de hacerlo.

## Fuerzas

- El registro es fricción impuesta a los consumidores en beneficio de los productores.
- El consumo no registrado es invisible y, por tanto, imposible de romper por accidente solo hasta que se rompe.
- El control de acceso y el registro de consumo responden a la misma pregunta y no deberían divergir.

## Solución (norma)

Los consumidores registran contratos de consumo explícitos que declaran los campos, el SLO de frescura y las expectativas de volumen de los que dependen, además de sus patrones de consulta, alcance de acceso y restricciones de uso. Los consumidores no registrados pueden ser bloqueados hasta registrar su contrato.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Data Mesh | Obligatorio | data-mesh.config.json declara hasConsumptionContracts=true; los contratos de consumo complementan a los de producción. Enforzado por DAM-R06. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **DAM-R06** | Contratos de consumo explícitos | ruleset de topología | `src/rulesets/topologies/data-mesh/data-mesh.rules.json` |

## ADRs de gobierno

Ninguno. Ningún ADR del corpus registra una decisión que cubra este patrón; el enforcement existe sin decisión registrada.

## Variantes

Ninguna registrada.

## Relaciones

- **complementa a PAT-0006** — El lado productor del mismo acuerdo.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `reference/core/architecture/topologies/data/data-mesh/patterns.md` — Sección Consumption Contracts.

---

**[Volver al catálogo de patrones](../README.es.md)**
