> **Navegación Bilingüe:** [See English Version](./0129-ums-is-the-tenant-master.md)

# ADR-0129: El maestro de Tenant es UMS, y la suite proyecta un retrato versionado

## Estado

Accepted — 2026-08-22. En vigor. Supersede a [ADR-0106](./0106-master-tenant-context-projections.es.md).

<!-- implementation-status: none -->
> **Estado de implementación en este repositorio: ninguna** (2026-08-22). Evolith Core ni emite ni
> consume el retrato del tenant: es un motor de evaluación sin estado y recibe el tenant como
> contexto ([ADR-0101](./0101-core-stateless-evaluation-engine.es.md)). Este ADR deja escrito dónde
> está ahora la frontera para que el corpus del Core deje de nombrar un sistema que no existe. El
> emisor vive en UMS y el consumidor en el Tracker; ambos se nombran en Referencias.

## Fecha

2026-08-22

## Contexto y Problema

[ADR-0106](./0106-master-tenant-context-projections.es.md) se aceptó el 2026-07-08 y nombraba a **MMS**
(Master Data Management) «único propietario de la identidad y el ciclo de vida del Tenant maestro»,
con MMS publicando una `TenantProjection` hacia UMS y hacia el Evolith Tracker.

**MMS nunca existió** — ni en BeyondNetCode ni en la suite Evolith. La decisión se escribió contra un
sistema que jamás se construyó, y cada satélite pagó el coste a su manera:

- UMS cargaba con ADR-UMS-083, que declaraba a UMS *consumidor* de un tenant maestro que en realidad
  posee: el agregado, los comandos de alta, modificación, activación y suspensión, y los endpoints que
  los exponen viven en UMS. Sus pruebas arrastraban parches cuyo único fin era neutralizar una
  proyección que nadie alimentaba.
- El Tracker cargaba con `TenantProjectionConsumer`, escuchando
  `Evolith.Contracts.MasterData.TenantEvent` y escribiendo `masterdata.tenant_projection` — un
  consumidor que jamás recibió un mensaje, hacia una tabla que jamás tuvo lector.

El 2026-08-22 ambos satélites invirtieron la dirección: **ADR-UMS-107** supersede a UMS-083 y hace de
UMS el maestro de Tenant, y **T-059** retira del Tracker el consumidor de MMS, su contrato, las
migraciones de su read model, su sonda de salud y el requisito `ConnectionStrings:MasterDataDb`, y los
sustituye por un consumidor de lo que UMS publica de verdad.

Evolith Core no posee nada de ese código, pero sí posee el **corpus que describe la suite**, y ese
corpus sigue diciendo MMS: ADR-0106 como decisión Accepted viva con un ruleset generado detrás, cuatro
ADR hermanos que nombran MMS de pasada, y ocho documentos de producto —entre ellos un runbook de
incidentes y la estrategia de despliegue de la suite— que dibujan `masterdata.tenant_projection`
dentro de UMS y del Tracker. Quien hoy hace grep en este repositorio encuentra una arquitectura
aceptada para un sistema que nadie va a construir.

## Objetivo y Alcance

Dejar registrado, en el repositorio que publica la arquitectura de la suite, dónde está de verdad la
frontera del tenant, y retirar la descripción de MMS de todos los sitios donde aquí sobrevive.

**Dentro del alcance:** el corpus de ADR del Core, la documentación de suite y de producto de este
repositorio, y el ruleset generado que sostiene ADR-0106.

**Fuera del alcance, a propósito:** el comportamiento del propio Core.
[ADR-0101](./0101-core-stateless-evaluation-engine.es.md) queda intacto — el Core no persiste un
registro de tenants, no se suscribe al retrato y sigue recibiendo la identidad del tenant como
contexto de evaluación. Este ADR no mueve código en `src/`.

## Opciones Consideradas

**Opción 1 — Enmendar ADR-0106 en su sitio.** Reescribir su sección de decisión para nombrar a UMS.
Rechazada: borra el razonamiento que produjo la elección de MMS, y el siguiente lector no puede saber
si MMS se consideró y se descartó o si nunca se consideró. El modo de fallo de aquí —una arquitectura
escrita contra un sistema que nunca se construyó— es justo el que conviene dejar legible.

**Opción 2 — Borrar ADR-0106.** Rechazada por la misma razón, de forma más aguda, y además rompe todos
los enlaces entrantes.

**Opción 3 — Superseder ADR-0106 con una decisión nueva (elegida).** Es la convención que el corpus ya
usa en [ADR-0099](./0099-opa-bundle-s3-distribution.es.md): la decisión vieja conserva su texto y gana
un estado `Superseded by` que apunta hacia delante. La historia sobrevive, la respuesta actual queda
sin ambigüedad, y el ruleset generado tras 0106 pierde su respaldo Accepted honestamente.

## Decisión y Justificación

**UMS es el maestro de Tenant y publica su estado; el resto de la suite proyecta.**

### El contrato es de la suite, no del emisor

`Evolith.Contracts.Tenancy.TenantSnapshotIntegrationEvent` lleva `TenantId`, `Code`, `Name`, `Status`,
`ParentTenantId`, `IsManagementOwner`, `Version`, `ChangeType`, `OccurredAtUtc` y `SpecVersion`. El
namespace es de **suite** y no del producto emisor porque MassTransit enruta por URN: el nombre del
tipo *es* el acuerdo entre las dos partes. Cualquier sistema Evolith que en el futuro proyecte tenants
—incluido este, si alguna vez se decidiera— tiene que declarar ese mismo tipo bajo ese mismo
namespace, o estará suscrito a nada.

### Un retrato versionado, no un caudal de deltas

El mensaje lleva estado y una `Version` monotónica, así que el consumidor hace upsert por versión y
descarta lo que llega rezagado, sin reconstruir nada y sin fiarse del orden. Un bróker reordena y
reentrega; eso es su comportamiento normal, no una anomalía. El payload es corto a propósito:
sucursales, proveedores de identidad y parámetros no viajan, porque un contrato que reflejara el
modelo interno del emisor habría que versionarlo cada vez que ese modelo crece.

### El Core se queda fuera

El Core evalúa; no guarda un registro de tenants. Nada en esta decisión le da uno. Es la misma
frontera que dibuja ADR-0101, y nombrar a UMS maestro no la mueve — solo cambia un propietario
ficticio por el real.

## Evidencia y Criterios de Evaluación

El criterio es la procedencia: una decisión sobre quién posee el tenant solo merece registrarse aquí
si los sistemas propietarios ya se comprometieron a ella en sus propios repositorios, con código
detrás.

| Afirmación | Dónde está registrada, con su mecanismo |
|---|---|
| UMS posee el tenant y lo publica | **ADR-UMS-107** (Aceptado, 2026-08-22, supersede a UMS-083). La versión sale de la secuencia de base de datos `tenant_projection_version` — el `RowVersion` del agregado no ordena (el interceptor lo rota al azar) y la marca de tiempo empata. `nextval` avanza fuera de la transacción y deja huecos deliberados, porque un contador que reutilizara un valor tras un rollback haría que el consumidor descartara como rezagado el evento bueno. |
| La publicación es atómica con el cambio | ADR-UMS-107: los cinco comandos que mutan llaman a `ITenantSnapshotPublisher` **antes** de `SaveEntitiesAsync`, respaldados por el bus-outbox, así que el mensaje se estaciona en la misma transacción y se entrega tras el commit. A propósito no se hace desde un manejador de evento de dominio: ese despacho es post-commit y best-effort, así que el mensaje perdería la atomicidad y su pérdida sería silenciosa. |
| El Tracker proyecta en vez de duplicar | **T-059** (Aceptado, 2026-08-22). `code`/`name`/`status` y la existencia del tenant los escribe solo `TenantSnapshotConsumer`; `display_name`, `contact_email`, `tier`, `settings` y la localización siguen siendo del Tracker, porque UMS no los conoce. |
| La entrega tardía y duplicada está cubierta | T-059: `ON CONFLICT (id) DO UPDATE … WHERE ums_projection_version < EXCLUDED.ums_projection_version`. Un read-check-write dejaría pasar dos eventos en vuelo del mismo tenant, y si el de versión menor confirma el último la proyección se queda rezagada de forma permanente y silenciosa. El inbox de MassTransit deduplica por `messageId`; la guarda cubre lo que el inbox no puede. |
| MMS nunca existió | Ambos ADR lo afirman, y la evidencia es la propia ausencia: un consumidor que jamás recibió un mensaje y un read model que jamás tuvo lector. |

## Consecuencias, Riesgos y Compromisos

**A favor.** El corpus deja de publicar una arquitectura para un sistema que nadie va a construir.
Quien busque el maestro de tenant encuentra una sola respuesta, y coincide con el código de los dos
repositorios que lo sostienen.

**En contra, y aceptado.** El ruleset generado de ADR-0106
(`src/rulesets/adr/generated/adr-0106-master-tenant-and-context-projections.rules.json`; la copia del
CLI bajo `src/sdk/cli/rulesets/` la produce `copy-rulesets` y está gitignorada) lleva una única regla
`CORE-0106-01` que pide honrar lo que ahora es una decisión superseded. Regenerar la marca como
superseded en vez de borrarla, así que un satélite que hubiera fijado ese id de regla sigue
resolviéndolo y puede leer por qué ya no obliga.

**Riesgo que se asume, no que se resuelve.** El contrato está duplicado literalmente en UMS y en el
Tracker porque `Unimar.Ums.Sdk.Contracts` tiene metadatos de paquete pero nunca se ha publicado. Dos
copias de un tipo cuyo *nombre* es la clave de enrutado divergirán en silencio — renombrar un campo no
rompe nada en tiempo de compilación en ninguno de los dos repositorios y lo rompe todo en ejecución.
Este ADR deja constancia de la exposición; el arreglo es empaquetado .NET y pertenece a esos
repositorios, no al scope npm del Core.

## Referencias

- ADR-UMS-107 — *UMS es el Maestro de Tenant y lo Publica para que la Suite lo Proyecte* (repo `ums`,
  `reference/architecture/adrs/UMS-107-ums-publica-el-tenant-para-que-la-suite-lo-proyecte.es.md`)
- T-059 — *The Tracker projects the UMS Tenant, and stops writing what UMS owns* (repo
  `evolith_tracker`, `docs/adrs/T-059-proyectar-el-tenant-de-ums.md`)
- ADR-UMS-083 — *Consumir proyección de tenant de MMS* (repo `ums`, rechazado y superseded por UMS-107)

## Decisiones y Estándares Relacionados

- [ADR-0101](./0101-core-stateless-evaluation-engine.es.md) — el Core es un motor de evaluación sin estado. Esta decisión no lo cambia.
- [ADR-0106](./0106-master-tenant-context-projections.es.md) — superseded por este ADR.
- [ADR-0108](./0108-masstransit-owned-message-topology.es.md) — MassTransit posee la topología de mensajes; el enrutado por URN del que depende esta decisión se describe allí.
- [ADR-0109](./0109-multi-project-satellite-governance.es.md) — cómo se relacionan las decisiones de los satélites con el corpus del Core.

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
