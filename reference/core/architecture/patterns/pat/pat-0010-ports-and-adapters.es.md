# PAT-0010: Puertos y Adaptadores

> **Navegación bilingüe:** [English](./pat-0010-ports-and-adapters.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Estructura  
**Estado:** Accepted  
**También conocido como:** Hexagonal Architecture, Clean Architecture  

---

## Problema

Cuando la lógica de negocio importa el framework, el ORM y el SDK del proveedor, el dominio no puede probarse sin levantar infraestructura, no puede razonarse sin conocer el framework y no sobrevive al reemplazo de ninguno de los dos.

## Fuerzas

- La indirección por puertos cuesta una capa de interfaces que solo rinde con el tiempo.
- Las preocupaciones transversales son las más difíciles de mantener fuera del núcleo, porque de verdad aplican en todas partes.
- Las pruebas de dominio rápidas son la prueba observable de que la frontera se sostiene.

## Solución (norma)

La capa de dominio contiene solo tipos de negocio puros e interfaces de puerto, con cero dependencias de framework, ORM o SDK. La capa de aplicación importa solo el dominio. Los adaptadores de infraestructura implementan los puertos y concentran todos los imports de framework y SDK. La dirección de dependencia es Infraestructura hacia Aplicación hacia Núcleo, nunca al revés. Las preocupaciones transversales se implementan exclusivamente como envolturas de infraestructura, nunca como decoradores dentro del núcleo. Las pruebas de dominio corren sin arranque de framework.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Monolito Modular | Obligatorio | Cada contexto acotado sigue el hexágono internamente; las llamadas entre contextos usan puertos de la capa de aplicación, nunca infraestructura contra infraestructura. Enforzado por MM-R03 y MM-R04. |
| Módulos Distribuidos | Recomendado | El hexágono sobrevive a la división; el adaptador de salida simplemente pasa a ser un cliente de red. |
| Microservicios | Recomendado | Cada servicio es su propio hexágono; la frontera es lo que hace mecánica la extracción. |
| IA Agéntica | Obligatorio | Las escrituras de dominio permanecen en adaptadores de aplicación deterministas detrás del contrato de herramienta; el agente nunca alcanza el dominio directamente. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **MM-R03** | Frontera de puertos y adaptadores | ruleset de topología | `src/rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` |
| **HXA-01** | El núcleo (Dominio) tiene cero dependencias de framework | ruleset de ADR | `src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| **HXA-02** | La capa de aplicación solo importa el núcleo | ruleset de ADR | `src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| **HXA-03** | La infraestructura (Adaptadores) implementa los puertos del núcleo | ruleset de ADR | `src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| **HXA-04** | Dirección de dependencia: Infraestructura hacia Aplicación hacia Núcleo | ruleset de ADR | `src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| **HXA-05** | Preocupaciones AOP prohibidas en las capas Núcleo/Aplicación | ruleset de ADR | `src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| **HXA-06** | AOP implementado exclusivamente en la capa de Infraestructura | ruleset de ADR | `src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| **HXA-07** | Las pruebas de dominio del núcleo corren sin arranque de framework | ruleset de ADR | `src/rulesets/adr/adr-0002-hexagonal-architecture.rules.json` |
| **MM-R04** | Comunicación entre contextos vía puertos | ruleset de topología | `src/rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` |
| **MM-R11** | Aislamiento estricto de UI y lógica (SoC) | ruleset de topología | `src/rulesets/topologies/progressive-axis/modular-monolith/modular-monolith.rules.json` |

## ADRs de gobierno

| ADR | Título registrado | Verificación | Nota |
|---|---|---|---|
| [ADR-0002](../../adrs/nodejs/0002-clean-architecture-nestjs.es.md) | Clean Hexagonal Architecture with NestJS (nodejs) | verificado | Tanto MM-R03 como HXA-01..07 referencian 'core/ADR-0002', pero no existe ningún ADR numerado 0002 en el track core; el ruleset hexagonal está ligado al ADR-0002 del track nodejs. El calificador de track del texto de la regla es incorrecto, la decisión en sí es real. |

## Variantes

Ninguna registrada.

## Relaciones

- **complementa a PAT-0011** — Data Mapper es la forma en que el adaptador de persistencia mantiene puro el modelo de dominio.
- **complementa a PAT-0018** — Una capa anticorrupción es un adaptador cuyo trabajo es rechazar modelos ajenos.
- **complementa a PAT-0013** — Las fronteras de puerto limpias son la precondición de una extracción quirúrgica.

## Implementaciones

- [CP-04](../dotnet/cp-04-aop-logging-decorator.es.md) — dotnet

## Fuentes

- `reference/core/architecture/topologies/progressive-axis/modular-monolith/patterns.md` — Sección Ports & Adapters (Hexagonal Architecture).

> **Nota:** Nueve identificadores de regla en dos motores ya enforzan este patrón; ninguno estaba enlazado desde la prosa que lo describe.

---

**[Volver al catálogo de patrones](../README.es.md)**
