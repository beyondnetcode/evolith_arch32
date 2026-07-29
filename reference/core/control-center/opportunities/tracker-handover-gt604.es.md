# Entrega al Tracker — GT-604

> **Navegación bilingüe:** [English version](./tracker-handover-gt604.md)

| Campo | Valor |
|---|---|
| **Tipo** | Entrega entre repositorios (tablero del Core al equipo del Tracker) |
| **Fecha** | 2026-07-29 |
| **Repositorio destino** | `beyondnetcode/evolith_tracker` |
| **Cubre** | GT-604 (P0, L) — criterios de aceptación 2 y 3 |
| **Estado del gap** | `PENDING` — sin cambios, y deliberadamente así |
| **Lo que acompaña a este documento** | Criterio de aceptación 1, construido y mergeado en el repositorio del Core |
| **Paquete del contrato** | `@beyondnet/evolith-contracts` → `@beyondnet/evolith-contracts/ingest` |

## Por qué existe este documento

GT-604 dice que ninguna superficie escribe evidencia en el Tracker: el camino de
escritura es unidireccional y apunta hacia adentro. Cada `evolith evaluate`, cada
veto de `enforce edit`, cada `tools/call` de MCP y cada corrida del drift gate en
CI produce un veredicto completo, con dueño y con motor atribuidos, y luego el
proceso termina y el veredicto desaparece. La estrategia se apoya en evidencia
acumulada y los componentes que la generan no tienen dónde depositarla.

El gap tiene tres criterios de aceptación. El primero — un contrato de ingesta —
era construible en el repositorio del Core y ya está construido. El segundo y el
tercero no lo son, y la razón no es de calendario:

- el cliente compartido no se puede escribir porque no hay ruta a la cual llamar.
  El Tracker expone `GET /core-evaluation-transactions` y
  `GET /core-evaluation-transactions/{id}` y ninguna ruta de escritura iniciada
  por el Core. Un cliente escrito contra una ruta que no existe es un mock con
  pila de red, y aprobaría sus propias pruebas para siempre;
- el robot de RoboSoft vive en su repositorio y no puede redactarse desde el
  nuestro.

Así que este documento entrega exactamente dos cosas: el endpoint que el cliente
llamará cuando exista, y la prueba que demuestra que funciona. También plantea
una pregunta de secuencia que no podemos responder desde aquí, en la penúltima
sección, y esa pregunta es la razón para leer este documento antes de programar
GT-603.

## Cómo usar este documento

El endpoint está especificado dos veces, a propósito. Una en prosa aquí, y otra
como dato legible por máquina en el paquete del contrato
(`EVALUATION_INGEST_ENDPOINT_CONTRACT`), para que una prueba del lado del Tracker
pueda afirmar su ruta contra la constante y no contra este documento. Donde ambos
discrepen, gana la constante y el desactualizado es este documento.

La señal de aceptación que el tablero del Core buscará no es que este documento
se lea. Es un pull request mergeado en el Tracker que cite los nombres de prueba
de abajo, y una fila de `core_evaluation_transactions` escrita por un `POST` que
el Core inició. Hasta entonces la fila queda en `PENDING`.

Una trampa, heredada de la entrega anterior y todavía vigente:
`CoreEvaluationTransactionPersistenceLiveTests` se auto-omite salvo que
`EVOLITH_CORE_LIVE=1` esté definida, así que reporta éxito en CI sin ejecutarse.
No cuelguen ninguna prueba exigida aquí de esa clase ni de ninguna otra
condicionada por el entorno.

## Qué existe ya del lado del Core

### El contrato

Un módulo, publicado desde el paquete que ustedes ya fijan:

- fuente: `src/packages/contracts/src/ingest/evaluation-ingest.ts`
- pruebas: `src/packages/contracts/src/ingest/evaluation-ingest.spec.ts`
- ruta de importación: `@beyondnet/evolith-contracts/ingest`, o la raíz del paquete

Son datos planos y funciones puras sin imports ni E/S, la misma disciplina que
`evidence/evidence-edge.ts` (GT-605) y
`fixtures/evaluation-contract.fixtures.ts` (GT-573), de modo que pueden fijarlo a
un SemVer sin arrastrar detrás el motor del Core.

Lo que publica:

| Export | Qué es |
|---|---|
| `EvaluationIngestPayload` | el cuerpo de la petición, completo |
| `toEvaluationIngestPayload` | el mapeador del lado productor, desde `EvaluationResult` + violaciones |
| `resolveIngestCorrelationId` | la síntesis en la frontera que vuelve obligatorio `correlationId` |
| `checkEvaluationIngestPayload` | el oráculo que ustedes corren sobre lo que su endpoint deserializó |
| `assertEvaluationIngestPayload` | la forma que lanza excepción, para el arrange de una prueba |
| `EVALUATION_INGEST_ENDPOINT_CONTRACT` | la ruta, la autenticación, la idempotencia y el índice, como dato |
| `EVALUATION_INGEST_FIELD_SOURCES` | cada campo del cable y la ruta de `EvaluationResult` / `Violation` de la que deriva |

### El payload

Cada campo, y de dónde viene. `EVALUATION_INGEST_FIELD_SOURCES` lleva la misma
tabla como dato, y la suite del Core recorre cada ruta no derivada contra objetos
producidos por el pipeline real de `evaluateDriftGate`, así que un rename aguas
arriba pone en rojo el build del Core en vez de cambiar su forma de cable en
silencio.

| Campo del cable | Tipo | Obligatorio | Derivado de |
|---|---|---|---|
| `schemaVersion` | string | sí | fijación de `EVALUATION_INGEST_SCHEMA_VERSION`, hoy `1.0.0` |
| `correlationId` | string | **sí** | `EvaluationResult.correlationId`, sintetizado cuando falta |
| `producer.surface` | string | sí | uno de `agent-runtime` `cli` `core-api` `drift-gate` `mcp` |
| `producer.version` | string | no | la versión de la propia superficie que deposita |
| `evaluatedAt` | ISO-8601 | sí | `EvaluationResult.evaluatedAt` |
| `overallVerdict` | string | sí | `EvaluationResult.overallVerdict` |
| `outcome` | string | sí | `EvaluationResult.outcome` |
| `requestedBy` | objeto | no | `EvaluationResult.requester` — **quién pidió** |
| `repositoryRevision` | objeto | no | `EvaluationResult.repositoryRevision` |
| `rulesExecuted[]` | arreglo | sí | `EvaluationResult.rulesExecuted` — `ruleId`, `rulesetRef?`, `engine`, `verdict` |
| `violations[]` | arreglo | sí | las `Violation[]` canónicas de la corrida |
| `violations[].accountableOwner` | string | no | `Violation.owner` — **quién debe arreglarlo** |
| `accountableOwners` | string[] | sí | derivado: dueños distintos, ordenados |
| `blockingViolationCount` | número | sí | derivado: violaciones `error` no congeladas |
| `versions` | objeto | sí | `EvaluationResult.versions` |

No hay `tenantId`, y su ausencia es una propiedad de seguridad, no un olvido.
Ver la sección de autenticación.

### Los dos dueños, y por qué siguen siendo dos

El primer criterio de aceptación del gap dice "dueño", en singular. Son dos, son
personas distintas, y el contrato lleva ambos con nombres que no se pueden
confundir:

- `requestedBy.actorId` — quién pidió la evaluación. Un id de usuario, un id de
  agente, un id de job de CI. Atribución de la **petición**.
- `violations[].accountableOwner` — quién debe arreglar el hallazgo. Una entrada
  de CODEOWNERS resuelta desde el archivo infractor. Atribución del **defecto**.

Si se colapsan en un solo campo, ambas preguntas se vuelven irrespondibles: "qué
agente acumula veredictos fallidos" y "qué equipo es dueño de las fallas" dejan de
ser separables. Cuando ninguna regla de CODEOWNERS coincide, `accountableOwner`
está ausente — nunca se rellena con el solicitante, porque un defecto sin atribuir
registrado como sin atribuir es honesto y uno inventado es una acusación.

`checkEvaluationIngestPayload` rechaza una violación que todavía lleve el nombre
de campo de origen `owner`, de modo que un DTO de C# que mapee el nombre
equivocado falle ruidosamente de su lado en vez de escribir un ledger al revés.

### `correlationId` es obligatorio en el cable

`EvaluationResult.correlationId` es opcional aguas arriba, y los dos productores
existentes ya sintetizan uno cuando falta:
`src/sdk/cli/src/commands/evaluate/evaluate.command.ts` pone
`cli-eval-${evaluatedAt}` en su envelope de éxito, y
`src/packages/core-domain/src/evaluation/drift-gate.ts` arma el id de su evidencia
a partir de `correlationId ?? evaluatedAt`. El contrato vuelve obligatorio el
campo en el cable y sintetiza en la frontera, porque un rastro que no se puede
correlacionar no es un rastro, es un montón de filas.

La síntesis es determinista — sin uuid, sin reloj — así que el mismo veredicto
depositado dos veces produce el mismo id. Eso es lo que hace exigible, y no
decorativa, la regla de idempotencia de abajo.

### El motor se transporta textualmente

`rulesExecuted[].engine` está tipado como `string`, no como enum, y el mapeador
nunca lo fuerza. `KNOWN_RULE_ENGINES` está documentado como un vocabulario
ABIERTO que crece sin bump de esquema, y un mapeador que reescribiera en silencio
un motor no reconocido a `native` persistiría una fila afirmando que una regla de
gobernanza produjo un hallazgo que produjo un motor de políticas — una sustitución
que ningún consumidor podría detectar después. Toleren motores desconocidos; no
los validen contra una lista cerrada de su lado tampoco.

## El endpoint que deben exponer

### Ruta y autenticación

```
POST {baseUrl}/core-evaluation-transactions
```

`baseUrl` incluye el prefijo `/api/v1`, exactamente como para
`/runtime-approvals`.

La autenticación es la forma de llave de máquina que ustedes ya implementan. El
precedente es
`src/packages/agent-runtime/src/adapters/approval/tracker-approval.http-client.ts`
(líneas 9 a 13, el comentario de contrato de `POST /runtime-approvals`):

- la llave viaja en el header `x-api-key`, como llave `CoreMachine`;
- **el tenant se deriva de CUÁL llave coincidió**, y nunca se envía en el cuerpo.
  Aceptar un tenant desde el cuerpo permitiría que cualquier llave válida
  depositara evidencia en el ledger de cualquier tenant, que es exactamente el
  agujero que su manejador de auth de máquina existe para cerrar;
- un cuerpo que aun así lleve `tenantId` debe ser rechazado, no ignorado. El
  `checkEvaluationIngestPayload` publicado ya lo reporta como violación del
  contrato, así que cablear el oráculo en su manejador les da esto gratis.

La respuesta no va envuelta en envelope, igual que `/runtime-approvals`:
`{ transactionId, correlationId, created }`. `created` distingue un primer
depósito de una repetición idempotente, para que el productor pueda registrar
cuál obtuvo.

### Idempotencia y el índice que necesita

Un segundo depósito con el mismo `(tenant, correlationId)` actualiza la fila
existente y devuelve `200`. Nunca crea una segunda fila y nunca devuelve `409`.
Los reintentos de CI son normales y un pipeline reintentado no debe contar dos
veces un veredicto.

Esto exige un índice único sobre `(tenant_id, correlation_id)` en
`tracker_governance.core_evaluation_transactions`. Sin él la regla es inexigible
bajo concurrencia, y dos jobs de CI en carrera escribirán dos filas para un
veredicto. Los índices existentes de esa tabla son `(tenant_id, status)` y un
`operation_id` único; ninguno sirve para esto.

Si `correlation_id` todavía no es una columna, esa es la primera rebanada, y no es
opcional — es la llave sobre la que se une todo el contrato.

### Reglas de rechazo

| Condición | Estado |
|---|---|
| `x-api-key` ausente o desconocida | `401` |
| el cuerpo no pasa `checkEvaluationIngestPayload` | `400`, con los `problems` del oráculo en la respuesta |
| el cuerpo lleva `tenantId` | `400` — nunca ignorado en silencio |
| `(tenant, correlationId)` repetido | `200` sobre la fila existente, `created: false` |

No agreguen una regla que rechace un `rulesExecuted[].engine` desconocido. Ver la
sección del motor: cerrar ese vocabulario de su lado reintroduce el defecto que el
contrato eliminó.

## La prueba que demuestra que funciona

### Las pruebas del endpoint

Archivo nuevo
`src/apps/tracker-api/Tracker.Tests/Presentation/Integration/CoreEvaluationIngestEndpointTests.cs`,
corriendo contra `InMemoryCoreEvaluationTransactionRepository`, sin ninguna
condición de entorno. Cada prueba afirma su propio conteo de semilla antes de
afirmar el resultado, para que una consulta que no coincide con nada no pueda
pasar.

- `Ingest_Persists_A_Row_With_The_Engine_Each_Rule_Actually_Ran_On` — envíen un
  payload cuyo `rulesExecuted` lleve `native`, `opa` y un motor que el Tracker
  nunca ha visto; afirmen que los tres sobreviven textualmente en la fila
  persistida. Hoy en rojo: la ruta responde 404.
- `Ingest_Keeps_The_Requester_And_The_Accountable_Owner_Apart` — envíen un payload
  donde `requestedBy.actorId` y cada `violations[].accountableOwner` difieran;
  afirmen que ambos se leen desde la fila persistida y que ninguna violación quedó
  atribuida al solicitante.
- `Ingest_Is_Idempotent_On_CorrelationId` — envíen el payload idéntico dos veces;
  afirmen una sola fila, `created: true` y luego `created: false`, y `200` ambas
  veces.
- `Ingest_Rejects_A_Body_That_Carries_A_TenantId` — afirmen `400`, y afirmen que el
  conteo de filas no cambió.
- `Ingest_Never_Crosses_A_Tenant_Boundary` — envíen el mismo `correlationId` con
  dos llaves de máquina distintas; afirmen dos filas, una por tenant, y que
  ninguna llave puede leer la de la otra.
- `Ingest_Rejects_An_Unauthenticated_Post` — afirmen `401` y un delta cero en el
  conteo de filas.

### La prueba de contrato

Una prueba que fija la forma en vez de reimplementarla: deserialicen un fixture de
payload en su DTO, vuélvanlo a serializar, y corran sobre el resultado el
`checkEvaluationIngestPayload` publicado. Si su DTO pierde
`rulesExecuted[].engine` o renombra `accountableOwner` de vuelta a `owner`, esto
se pone en rojo de su lado en el momento en que el DTO cambia, en vez de producir
un ledger de filas sin motor que nadie nota durante un trimestre.

Es el mismo patrón dirigido por el consumidor que GT-573 ya estableció entre los
dos repositorios, y es la razón por la que el paquete del contrato exporta un
oráculo y no solamente tipos.

### El robot de RoboSoft

`robosoft/robots/core-evidence-ingest.robot.mjs`, cableado al gate de CI junto a
`tenant-isolation` y `exception-governance`. Debe afirmar el ciclo completo de
punta a punta y no meramente el endpoint:

1. correr un `evolith evaluate` real contra un workspace de fixture que se sabe
   que falla, con `--format drift`;
2. depositar el payload resultante en el endpoint con una llave `CoreMachine`;
3. releer la fila por `GET /core-evaluation-transactions` y afirmar que el
   `correlationId` coincide con el que reportó el CLI, que `rulesExecuted` no está
   vacío, y que al menos una violación lleva un `accountableOwner`.

Las afirmaciones de no-vacuidad del paso 3 son las que sostienen todo. Un robot
que solo afirma "existe una fila" pasa contra un endpoint que persiste un sobre
vacío, y una fila de ledger vacía es justamente el modo de falla del que trata
este gap.

## Una pregunta de secuencia que no podemos responder desde aquí

### Qué nombran realmente las dos filas

Los criterios de aceptación de GT-604 terminan con: *"Depende de GT-601 para que
el payload no esté vacío y de GT-603 para que sea atribuible."* La dependencia de
GT-603 parece equivocada, y la planteamos como pregunta en vez de corregirla,
porque el esquema del Tracker no está en este repositorio y no se puede verificar
desde aquí.

Las dos filas nombran tablas distintas:

| Fila | Tabla de la que trata | Qué cambia |
|---|---|---|
| GT-603 | `audit_entries` | agrega `actor_type`, `agent_id`, `model_id`, `session_id`; registra `IAgentExecutionPort` |
| GT-604 | `core_evaluation_transactions` | agrega un escritor iniciado por el Core |

Una migración sobre `audit_entries` no vuelve atribuible una fila de
`core_evaluation_transactions`. Si la dependencia es real, lo es por algún camino
que no podemos ver — un tipo de atribución compartido, un manejador compartido,
una decisión de que ambas tablas adopten un mismo modelo de actor.

### Qué se entregó ya del lado del Core

La mitad de la atribución que le toca al Core — la parte que el planteamiento de
GT-603 sugiere que todavía falta — aterrizó bajo GT-586 y está hoy en `main`:

- `EvaluationContext.requester` y `EvaluationContext.repositoryRevision` se
  aceptan desde el consumidor;
- `EvaluationResult.requester` y `EvaluationResult.repositoryRevision` los
  devuelven textualmente, y el Core nunca infiere ni inventa ninguno de los dos;
- `RequesterContext` lleva `actorType`, `actorId`, `modelRef` y `sessionId` — los
  mismos cuatro discriminadores que GT-603 quiere sobre `audit_entries`;
- los fixtures fijados `EVALUATE_INLINE_ATTRIBUTED_REQUEST` y
  `EVALUATION_RESULT_ATTRIBUTION_FIXTURE` están publicados en
  `@beyondnet/evolith-contracts` para que se aten a ellos.

Así que el payload de ingesta es atribuible el día en que el endpoint exista.
`requestedBy` se llena cuando la superficie llamante declara un solicitante, y eso
es un asunto del lado productor en nuestro repositorio, no una migración del
Tracker.

### La pregunta que les pedimos responder

Tres posibilidades, y desde aquí no podemos distinguirlas:

1. la dependencia es un error de transcripción y el endpoint de GT-604 se puede
   programar de inmediato, con independencia de GT-603;
2. la dependencia es real porque ustedes pretenden que
   `core_evaluation_transactions` y `audit_entries` compartan un mismo tipo de
   atribución de actor, y hacer primero la ingesta lo bifurcaría;
3. la dependencia es real porque se espera que el endpoint de ingesta escriba
   además una fila de `audit_entries` como efecto secundario, lo que heredaría la
   restricción append-only de GT-603.

Si la respuesta es 1, las dos filas pueden avanzar en paralelo y GT-604 deja de
estar bloqueada. Si es 2 o 3, díganos cuál, porque cambia lo que el endpoint debe
hacer y este documento lo subespecifica. No les pedimos que acepten nuestra
lectura — les pedimos que digan cuál de las tres es.

La urgencia es asimétrica, y por eso esto no es una nota al pie. GT-603 está en el
tablero como el único ítem que **caduca** en vez de acumular costo: `audit_entries`
es append-only por trigger de base de datos, así que cada fila escrita antes de que
exista la columna discriminadora queda permanentemente sin atribuir. Si GT-604 de
hecho no está bloqueada por ella, entonces tratarla como bloqueada retrasa el
camino de ingesta sin razón mientras el ítem que caduca espera detrás de una
dependencia que corre en sentido contrario.

## Qué no cierra esta entrega

Tres cosas, dichas para que nadie confunda este documento con progreso.

La fila del gap queda en `PENDING` en `gap-tracking.md` y `gap-tracking.es.md`, y
sus casillas de aceptación quedan sin marcar. El criterio 1 está construido y
mergeado en el repositorio del Core; los criterios 2 y 3 están intactos, y un gap
lo cierra su último criterio, no el primero.

No se escribió ningún cliente. Fue una negativa deliberada, no un olvido: un
cliente contra una ruta inexistente aprueba sus propias pruebas indefinidamente y
habría que reescribirlo el día en que la ruta real aterrizara. Es un trabajo
pequeño una vez que el endpoint exista, y queda registrado como el resto de esta
fila.

Las afirmaciones sobre el Tracker que hay en este documento — las dos rutas `GET`
existentes, los dos índices existentes, la ausencia de una columna
`correlation_id` — vienen de la reverificación de GT-615/616/617 contra el commit
`f8b68f2` y NO se volvieron a comprobar hoy. Trátenlas como el estado de ese
commit, y corríjannos donde el Tracker se haya movido.

## Relacionado

- [Tablero de Gaps](../gaps/gap-tracking.es.md) — la fila GT-604, sin cambios.
- [Entrega al Tracker — GT-615, GT-616, GT-617](./tracker-handover-gt615-gt617.es.md) — la entrega anterior, y la fuente de los hechos del Tracker que aquí se repiten.
- [Tablero de Oportunidades](./README.es.md) — índice de este documento.
- [Centro de Control](../README.es.md) — hub de gobernanza.

[Volver al Tablero de Oportunidades](./README.es.md)
