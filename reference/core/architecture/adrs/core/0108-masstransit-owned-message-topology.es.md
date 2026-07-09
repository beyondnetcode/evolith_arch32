> **Navegación bilingüe:** [View English version](./0108-masstransit-owned-message-topology.md)

# ADR-0108: MassTransit es dueño de la topología de mensajes; los CRDs del broker son solo RBAC

> **Firma del agente:** Agente Arquitecto (Winston)

## Estado
Aprobado

## Fecha
2026-07-09

## Contexto y problema
El flujo de proyección de datos maestros (ADR-0106) hace que MMS publique `TenantEvent`/`ProductEvent`
a un broker RabbitMQ que UMS y Tracker consumen. ADR-0107 fijó el sustrato de cluster único; este
ADR resuelve **quién declara la topología de mensajes** — exchanges, colas y bindings.

El sustrato inicial declaraba toda la topología **de forma declarativa** vía CRDs del RabbitMQ
Messaging Topology Operator (`deploy/kubernetes/messaging/tenant-topology.yaml`): un exchange
`x-consistent-hash` `evolith.masterdata`, colas quorum por consumidor con argumentos
`x-dead-letter-exchange`, un dead-letter exchange, y bindings de peso `1`.

La verificación adversarial contra cómo MassTransit mueve mensajes en realidad (la topología por la
que fluyó el E2E validado en vivo) encontró que este diseño no solo es redundante — es incorrecto y
en parte fatal:

1. **`x-consistent-hash` divide el tráfico, no hace fan-out.** Un exchange consistent-hash enruta
   cada mensaje a **exactamente una** cola enlazada. Con `ums.tenant-projection` y
   `tracker.tenant-projection` ambas enlazadas, cada evento llegaría a UMS **o** a Tracker (~50/50
   por hash de `tenantId`), **nunca a ambos**. El fan-out a grupos consumidores independientes
   requiere un exchange fanout/topic con un binding por grupo. Consistent-hash es una *herramienta
   de particionamiento dentro de un grupo consumidor*, nunca de distribución pub/sub.
2. **Las colas pre-creadas por CRD chocan con las declaraciones de MassTransit → `406`.**
   MassTransit auto-declara un **type-exchange fanout** (`Evolith.Contracts.MasterData:TenantEvent`)
   y enlaza el exchange/cola propio de cada endpoint consumidor. Cuando una cola ya existe con
   argumentos distintos (p.ej. el `x-dead-letter-exchange`), la re-declaración de MassTransit falla
   con `406 PRECONDITION_FAILED` y el endpoint muere **mientras el pod sigue `Ready`** — consumidor
   muerto silencioso.
3. **Los mensajes veneno van a `<queue>_error`, no a un DLX.** Agotados los reintentos, MassTransit
   *mueve* el mensaje fallido a una cola `<queue>_error`; nunca hace `nack`, así que el
   `x-dead-letter-exchange` del broker jamás se dispara y los CRDs DLX/DLQ son letra muerta.

## Decisión
**MassTransit es dueño de la topología de mensajes.** Los CRDs de la ruta de mensajes se **retiran**;
el Topology Operator se usa **solo** para el RBAC del broker que MassTransit no puede autodeclarar.

- **Retirar** los CRDs `Exchange`/`Queue`/`Binding`/DLX de la ruta de mensajes. MassTransit declara,
  al arranque, el type-exchange fanout, un exchange+cola de endpoint por grupo consumidor, y la cola
  `<queue>_error` de veneno.
- **Mantener** los CRDs `User` + `Permission` por producto (y `Policy` opcional). Se mueven del
  archivo retirado a `deploy/kubernetes/messaging/broker-rbac.yaml`.
- **Los nombres de endpoint quedan fijados en código** (`ums.tenant-projection`,
  `tracker.tenant-projection`) vía `ConsumerDefinition`s, no en manifests.
- **Los permisos del broker son regex sobre prefijos de nombre**, no grants por verbo (los grants
  solo-por-verbo rompen el arranque de MassTransit porque debe `configure`+`write` el namespace del
  type-exchange):
  - `mms` → `configure`/`write` sobre `^(Evolith\.Contracts\.MasterData.*|mms\..*)$`, `read` ninguno.
  - `ums` → `configure`/`write`/`read` sobre `^(ums\..*|Evolith\.Contracts\.MasterData.*)$`.
  - `tracker` → simétrico con el prefijo `tracker\.`.
- **Manejo de veneno:** alertar sobre la **profundidad de `ums.tenant-projection_error` /
  `tracker.tenant-projection_error`**; el runbook de reproceso hace shovel de `_error` a la cola
  principal. Los CRDs DLX/DLQ se retiran con el resto.

## Consecuencias
- **Positivo:** fan-out real a ambos consumidores; sin deadlock de arranque por `406`; una sola
  fuente de verdad para la topología (el código que también define los consumidores); usuarios de
  broker de mínimo privilegio por producto; visibilidad de veneno en la cola que MassTransit usa.
- **Negativo / trade-offs:** la topología ya no es revisable declarativamente en Git como CRDs — está
  implícita en la configuración de MassTransit. Mitigado por (a) nombres de endpoint fijados en
  código, (b) un gate de integración (G1) que verifica que el endpoint consumidor *arrancó* (salud
  del bus, no solo pod `Ready`) y que se escribe una fila `InboxState` al consumir, y (c) alertas de
  profundidad `_error`.
- **Operativo:** los probes de readiness **nunca** deben condicionarse a AMQP (una caída del broker
  degrada frescura, no correctitud — el outbox transaccional de MMS es sin pérdida para el productor);
  ver ADR-0033 y la estrategia de despliegue §5.4.

## Alternativas consideradas
- **Mantener los CRDs declarativos y corregir el tipo de exchange** (fanout + bindings por grupo,
  quitar el DLX): rechazado — incluso un CRD fanout correcto sigue arriesgando la colisión `406` de
  re-declaración con MassTransit y duplica una topología que MassTransit ya posee. Dos dueños de una
  topología es el defecto.
- **Deshabilitar la declaración de topología de MassTransit y manejar todo desde CRDs:** rechazado —
  pelea contra el framework, pierde las colas de error por consumidor, y renuncia al enrutado por
  tipo de contrato.

## Referencias
- ADR-0106 (proyecciones de contexto tenant maestro) · ADR-0107 (topología de cluster único) ·
  ADR-0033 (outbox transaccional) · ADR-0050 (naming de mensajería).
- Estrategia de despliegue [§5](../../../../product/suite/architecture/evolith-suite-deployment-strategy.es.md) (correcciones de mensajería verificadas).
- Flujo canónico: `mms/docs/architecture/tenant-master-data-projection.md`.
- Gap: board de Core **GT-462**; registro de riesgos §15 #2/#3.
- Manifiesto: `deploy/kubernetes/messaging/broker-rbac.yaml`.
