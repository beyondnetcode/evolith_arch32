# PAT-0015: Mamparo

> **Navegación bilingüe:** [English](./pat-0015-bulkhead.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Resiliencia  
**Estado:** Accepted  
**También conocido como:** Resource Pool Isolation  

---

## Problema

Cuando toda dependencia saliente toma de un único pool compartido de conexiones e hilos, una sola dependencia lenta agota el pool y tumba las llamadas a todas las demás dependencias, incluidas las sanas.

## Fuerzas

- Los pools particionados desperdician capacidad que un pool compartido habría redistribuido.
- El dimensionado por dependencia exige conocer el perfil de carga de cada una.
- El aislamiento contiene el fallo pero no lo acorta.

## Solución (norma)

Los pools de recursos — conexiones, hilos — se aíslan por dependencia ascendente, de modo que el agotamiento causado por una dependencia no puede dejar sin recursos las llamadas a ninguna otra.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Microservicios | Obligatorio | Cada servicio implementa aislamiento por mamparo con pools de recursos particionados por dependencia ascendente. Enforzado por MS-R03. |
| Módulos Distribuidos | Recomendado | Aplica una vez que las llamadas entre módulos cruzan una frontera de proceso y consumen un pool de conexiones. |
| Serverless | Opcional | El aislamiento por invocación de la plataforma aporta buena parte del efecto; los pools explícitos siguen importando para conexiones descendentes compartidas. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **MS-R03** | Patrón de mamparo por servicio | ruleset de topología | `src/rulesets/topologies/progressive-axis/microservices/microservices.rules.json` |

## ADRs de gobierno

Ninguno. Ningún ADR del corpus registra una decisión que cubra este patrón; el enforcement existe sin decisión registrada.

## Variantes

Ninguna registrada.

## Relaciones

- **complementa a PAT-0014** — El mamparo contiene el radio de impacto; el cortacircuitos detiene la hemorragia.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `src/rulesets/topologies/progressive-axis/microservices/microservices.rules.json` — Enunciado de la regla MS-R03, la única descripción de este patrón en el corpus.

> **Nota:** Ningún ADR del corpus menciona mamparos. ADR-0011 cubre solo cortacircuitos y reintentos. MS-R03 enforza un invariante que ninguna decisión registrada estableció.

---

**[Volver al catálogo de patrones](../README.es.md)**
