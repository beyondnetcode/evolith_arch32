# PAT-0002: Pruebas de Contrato

> **Navegación bilingüe:** [English](./pat-0002-contract-testing.md)

**Tipo:** Patrón Arquitectónico Canónico — agnóstico de runtime  
**Clase:** Patrón  
**Categoría:** Contratos  
**Estado:** Accepted  
**También conocido como:** Consumer-Driven Contract Testing, Pact Testing  

---

## Problema

Un proveedor puede satisfacer sus propias pruebas y aun así romper a todos sus consumidores, porque nada en el pipeline del proveedor sabe de qué dependen realmente los consumidores. La rotura se descubre en integración, ya desplegada.

## Fuerzas

- Los entornos de integración detectan la rotura tarde y de forma costosa; las pruebas unitarias no la detectan en absoluto.
- Los consumidores deben expresar sus expectativas sin obligar al proveedor a ejecutar sus suites de pruebas.
- La cobertura de contratos debe incluir eventos asíncronos, no solo llamadas síncronas.

## Solución (norma)

Todo contrato entre servicios, síncrono y asíncrono por igual, tiene pruebas de contrato que validan la compatibilidad hacia atrás antes del merge. Las pruebas de contrato corren en CI en cada cambio, y se rechaza el despliegue que rompa un contrato publicado.

## Aplicabilidad por topología

| Topología | Aplicabilidad | Guía |
|---|---|---|
| Microservicios | Obligatorio | Aplica por igual a contratos gRPC/REST síncronos y a contratos de eventos asíncronos; se valida antes del merge. Enforzado por MS-R05. |
| Módulos Distribuidos | Recomendado | CI verifica la compatibilidad hacia atrás del contrato en cada cambio de la interfaz de un módulo. |
| Orientada a Eventos | Recomendado | Los esquemas de eventos son el contrato; la compatibilidad hacia atrás la enforza por separado ED-R06. |
| Monolito Modular | Opcional | Los contratos entre módulos se validan en CI, pero una única unidad de despliegue elimina el riesgo de desfase de versiones que las pruebas de contrato atacan. |

## Enforcement

| Regla | Título | Motor | Ruleset |
|---|---|---|---|
| **MS-R05** | Pruebas de contrato para todos los contratos entre servicios | ruleset de topología | `src/rulesets/topologies/progressive-axis/microservices/microservices.rules.json` |

## ADRs de gobierno

Ninguno. Ningún ADR del corpus registra una decisión que cubra este patrón; el enforcement existe sin decisión registrada.

## Variantes

Ninguna registrada.

## Relaciones

- **requiere PAT-0004** — No hay nada que probar hasta que el contrato es explícito y versionado.

## Implementaciones

Ninguna todavía. Este patrón aún no tiene implementación canónica por runtime (CP-NN).

## Fuentes

- `reference/core/architecture/topologies/progressive-axis/microservices/patterns.md` — Sección Contract Testing.

> **Nota:** Ningún ADR del corpus registra una decisión sobre pruebas de contrato. MS-R05 enforza la práctica sin un ADR que la respalde.

---

**[Volver al catálogo de patrones](../README.es.md)**
