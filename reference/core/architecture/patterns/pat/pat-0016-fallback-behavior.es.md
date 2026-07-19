# PAT-0016: Comportamiento de Respaldo

> **Navegación bilingüe:** [English](./pat-0016-fallback-behavior.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Resiliencia  
**Estado:** Accepted  
**También conocido como:** Graceful Degradation  

---

## Problema

Una llamada cuyo único camino de fallo es propagar el error convierte toda caída descendente en una caída completa del llamante, incluso cuando había disponible una respuesta degradada pero útil.

## Fuerzas

- Una respuesta obsoleta o parcial puede ser peor que ninguna para algunas operaciones y mejor para la mayoría.
- Los respaldos ocultan las caídas a los usuarios y por tanto deben ser observables para los operadores.
- Definir la respuesta degradada es una decisión de producto, no solo de ingeniería.

## Solución (norma)

Toda llamada a un componente externo o descendente tiene un comportamiento definido para cuando ese componente no está disponible. La degradación elegante es obligatoria: el llamante devuelve una respuesta degradada pero definida en lugar de propagar el fallo.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Microservicios | Obligatorio | Todas las llamadas entre servicios tienen comportamiento de respaldo definido cuando el servicio descendente no está disponible. Enforzado por MS-R04. |
| Módulos Distribuidos | Recomendado | Se empareja con el cortacircuitos que exige DM-R07: el respaldo define qué devuelve un cortacircuitos abierto. |
| Edge Computing | Recomendado | La operación desconectada es el camino de respaldo, no una excepción. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **MS-R04** | Comportamiento de respaldo para todas las llamadas externas | ruleset de topología | `src/rulesets/topologies/progressive-axis/microservices/microservices.rules.json` |

## ADRs de gobierno

Ninguno. Ningún ADR del corpus registra una decisión que cubra este patrón; el enforcement existe sin decisión registrada.

## Variantes

Ninguna registrada.

## Relaciones

- **complementa a PAT-0014** — El cortacircuitos decide cuándo dejar de llamar; el respaldo decide qué devolver en su lugar.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `src/rulesets/topologies/progressive-axis/microservices/microservices.rules.json` — Enunciado de la regla MS-R04, la única descripción de este patrón en el corpus.

> **Nota:** Ningún ADR del corpus registra una decisión sobre comportamiento de respaldo. MS-R04 lo enforza unilateralmente.

---

**[Volver al catálogo de patrones](../README.es.md)**
