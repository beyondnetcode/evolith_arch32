# Traspaso al Tracker — GT-615, GT-616, GT-617

> **Navegación bilingüe:** [English version](./tracker-handover-gt615-gt617.md)

| Campo | Valor |
|---|---|
| **Tipo** | Traspaso entre repositorios (tablero del Core al equipo del Tracker) |
| **Fecha** | 2026-07-29 |
| **Repositorio destino** | `beyondnetcode/evolith_tracker` |
| **Cubre** | GT-615 (P2, M) · GT-616 (P2, S) · GT-617 (P2, S) |
| **Estado de los gaps** | `PENDING` — sin cambios, y deliberadamente así |
| **Origen de las filas** | Diagnóstico de producto de Evolith, 2026-07-26, hallazgos 2.4, 2.5 y 2.6 |

## Procedencia y postura de verificación

Las tres filas de gap se registraron en el tablero del Core con la advertencia
*"no verificado aquí (vive en el repositorio del Tracker)"*. Esa advertencia ya
está parcialmente saldada: cada afirmación de este documento se volvió a
contrastar contra una copia de trabajo del Tracker en el commit `f8b68f2`
(rama `feature/gt-447-fullstack-local`, 2026-07-24), en solo lectura y sin
compilar.

Eso importa en dos direcciones. Dos de las afirmaciones numéricas del
diagnóstico sobreviven exactamente como estaban escritas, y se reproducen abajo
junto al comando que las produce. Una de sus afirmaciones causales **no**
sobrevive: GT-616 describe como defecto el retorno temprano de
`TrackerTracing.cs`, y no lo es — es una decisión ratificada con una prueba que
la defiende. Actuar sobre la fila tal como está escrita borraría una salvaguarda
que el Tracker construyó a propósito. Los defectos reales están al lado, y son
peores.

Aquí no se marca nada como cerrado. Ninguno de estos puntos puede verificarse
desde el repositorio del Core, y un visto verde ganado por un documento en vez
de por una prueba es justo el modo de fallo que este tablero sigue encontrando
en sus propios guardas.

## Cómo usar este documento

Cada gap recibe las mismas cinco partes: la evidencia revalidada con un comando
de reproducción, el defecto enunciado como una sola frase falsable, el cambio
expresado en archivos y símbolos con nombre, la prueba que debe quedar en rojo
antes del cambio y en verde después, y aquello que la fila se equivocó o dejó
implícito.

La señal de aceptación que el tablero del Core va a buscar no es que este
documento se lea. Es un pull request del Tracker fusionado que cite los nombres
de las pruebas de abajo. Hasta entonces las tres filas siguen en `PENDING`.

Hay una trampa que aplica a las tres. `CoreEvaluationTransactionPersistenceLiveTests`
se auto-omite salvo que se defina `EVOLITH_CORE_LIVE=1`, así que reporta éxito en
CI sin ejecutarse. No cuelgues ninguna prueba requerida aquí de esa clase ni de
ninguna otra condicionada por el entorno. Cada prueba nombrada abajo debe correr
incondicionalmente sobre un checkout limpio.

## GT-615 — `repository_revision` se escribe y nunca se lee

### La evidencia, revalidada

La columna existe y es obligatoria. `core_evaluation_transactions` vive en el
esquema `tracker_governance`; la columna está declarada como
`repository_revision character varying(128) NOT NULL` en
`src/apps/tracker-api/Tracker.Infrastructure/Migrations/20260705022822_InitialCreate.cs`
y mapeada en
`src/apps/tracker-api/Tracker.Infrastructure/Persistence/Integration/Configurations/CoreEvaluationTransactionRecordConfiguration.cs`
(línea 18).

Tres rutas de producción escriben filas, y las tres guardan el veredicto en el
jsonb `response_data` bajo la clave `decision`:

| Ruta de escritura | Archivo | Línea de `AddAsync` |
|---|---|---|
| `POST /core-evaluation` | `Tracker.Presentation/Endpoints/Integration/CoreEvaluationEndpoints.cs` | 48 |
| `POST /products/{id}/evaluate-architecture` | `Tracker.Presentation/Endpoints/Products/ProductEndpoints.cs` | 216 |
| Sincronización de phase-gate con el Core | `Tracker.Presentation/Endpoints/Governance/PhaseGateEndpoints.cs` | 115 |

El lado de lectura son dos rutas y nada más.
`Tracker.Presentation/Endpoints/Integration/CoreEvaluationTransactionEndpoints.cs`
mapea `GET /core-evaluation-transactions` (todo el tenant, sin filtro) y
`GET /core-evaluation-transactions/{id:guid}`. El puerto que está detrás,
`Tracker.Domain/Integration/CoreEvaluationTransaction/Repositories.cs`, declara
seis métodos: `GetByIdAsync`, `AddAsync`, `UpdateAsync`, `DeleteAsync`,
`GetByTenantAsync`, `GetByOperationIdAsync`. Ninguno recibe una URL de
repositorio, una revisión ni un límite temporal. Los dos índices de la tabla son
`(tenant_id, status)` y un único `operation_id`; ninguno sirve para una consulta
de historial por repositorio.

```bash
# en evolith_tracker
grep -n "MapGet\|MapPost" src/apps/tracker-api/Tracker.Presentation/Endpoints/Integration/CoreEvaluationTransactionEndpoints.cs
grep -c "" src/apps/tracker-api/Tracker.Domain/Integration/CoreEvaluationTransaction/Repositories.cs
grep -rn "repository_revision" src/apps/tracker-api --include=*.cs | grep -v Migrations
```

### El defecto, enunciado con exactitud

Cada veredicto del Core se persiste junto a la revisión para la que se produjo, y
ninguna API, consulta o proyección puede recuperar dos veredictos del mismo
repositorio y compararlos. El sustrato para detectar deriva está completo del
lado de la escritura y ausente del lado de la lectura.

### El cambio

Cuatro rebanadas, entregables de forma independiente, en este orden.

1. **Capturar una revisión real.** Añade `CommitSha` a `RepositorySnapshot`
   (`Tracker.Application/Products/Repository/IRepositorySourceReader.cs`) y a
   `RepositoryEvaluationContext`
   (`Tracker.Application/Products/Repository/IRepositoryContextBuilder.cs`),
   puéblalo en cada implementación de `IRepositorySourceReader` a partir de la
   respuesta del proveedor, y pásalo como `RepositoryRevision` cuando
   `ProductEndpoints.cs` construye el `InlineEvaluationRequest`. Cuando el
   proveedor no pueda resolver un SHA, registra una advertencia y guarda la
   cadena vacía — nunca un valor de relleno que parezca una revisión.
2. **Añadir la consulta.** Añade
   `GetByRepositoryAsync(Guid tenantId, string repositoryUrl, DateTime? sinceUtc, CancellationToken ct)`
   a `ICoreEvaluationTransactionRepository` e impleméntalo tanto en
   `Tracker.Infrastructure/Persistence/Integration/PostgreSqlCoreEvaluationTransactionRepository.cs`
   como en `Tracker.Infrastructure/Persistence/InMemory/InMemoryRepositories.cs`
   (clase `InMemoryCoreEvaluationTransactionRepository`), ordenado por
   `requested_at` de forma ascendente. Añade una migración de EF que cree el
   índice `(tenant_id, repository_url, requested_at)`.
3. **Exponerla.** Extiende `GET /core-evaluation-transactions` con los
   parámetros de consulta opcionales `repositoryUrl` y `since`. El tenant sigue
   viniendo de `ITrackerUserContext` y nunca debe aceptarse desde la cadena de
   consulta; el robot de RoboSoft `tenant-isolation` ya afirma esa forma y debe
   seguir en verde.
4. **Proyectar la deriva.** Añade `GET /core-evaluation-transactions/drift`, que
   recibe los mismos dos parámetros y devuelve los pares consecutivos de
   revisiones cuyo `response_data->>'decision'` difiere, llevando cada entrada
   `fromRevision`, `toRevision`, `fromDecision`, `toDecision` y `detectedAtUtc`.
   Escribe una entrada de auditoría `DriftDetected` cuando la decisión de una
   transacción completada difiera de la de la transacción completada anterior
   para el mismo `(tenant_id, repository_url)`.

### La prueba que lo demuestra

Archivo nuevo
`src/apps/tracker-api/Tracker.Tests/Presentation/Integration/CoreEvaluationDriftEndpointTests.cs`,
ejecutándose contra `InMemoryCoreEvaluationTransactionRepository`, sin ninguna
condición de entorno de ningún tipo:

- `Drift_Endpoint_Reports_Only_The_Revision_Pair_Where_The_Decision_Changed` —
  siembra tres transacciones completadas para un mismo `repositoryUrl` con las
  revisiones `r1` (PASS), `r2` (PASS), `r3` (FAIL); comprueba que la respuesta
  contiene exactamente una entrada, `from = r2`, `to = r3`. Hoy está en rojo: la
  ruta no existe, así que la petición es un 404.
- `Drift_Endpoint_Never_Crosses_A_Tenant_Boundary` — siembra una cuarta
  transacción para el mismo `repositoryUrl` bajo un segundo tenant y comprueba
  que está ausente.
- `History_Query_Filters_By_Repository_And_Since` — comprueba que
  `GET /core-evaluation-transactions?repositoryUrl=X&since=<t2>` devuelve dos
  filas en orden ascendente de `requestedAt`. Hoy está en rojo: los parámetros se
  ignoran, así que vuelve el tenant entero.
- `Inline_Evaluation_Persists_The_Resolved_Commit_Sha` — con un
  `IRepositoryContextBuilder` simulado que devuelve un SHA conocido, dispara
  `POST /products/{id}/evaluate-architecture` y comprueba que el
  `repository_revision` persistido es igual a ese SHA. Hoy está en rojo por un
  motivo independiente, y por eso figura aparte: ver abajo.

Cada prueba comprueba primero su propio conteo de siembra antes de comprobar el
resultado, de modo que una consulta que no encaja con nada en silencio no pueda
pasar.

### La precondición que nadie ha notado

`CoreEvaluationOptions.RepositoryRevision` tiene como valor por omisión la cadena
literal `"HEAD"` (`Tracker.Presentation/Integration/CoreEvaluationOptions.cs`,
línea 46). `ProductEndpoints.cs` construye su `InlineEvaluationRequest` sin
asignar `RepositoryRevision` en absoluto, así que
`CoreEvaluationGateway.EvaluateInlineAsync` (línea 200) recae en ese valor por
omisión. Por tanto, cada fila escrita por
`POST /products/{id}/evaluate-architecture` guarda `repository_revision = "HEAD"`.

Aguas arriba de esa escritura no existe ningún commit SHA en ninguna parte:
`RepositorySnapshot` lleva `Files`, `Warnings` y `ResolvedBranch`, y
`RepositoryEvaluationContext` lleva lo mismo más el proveedor y la topología. El
nombre de una rama no es una revisión.

La consecuencia es que las rebanadas 2 a 4 de arriba, entregadas solas,
producirían un endpoint de deriva que compara `HEAD` contra `HEAD` y no reporta
nada, para siempre, con apariencia de estar implementado. La rebanada 1 no es un
refinamiento opcional — es la condición bajo la cual el resto del gap puede
cerrarse siquiera. Dimensiona GT-615 con la rebanada 1 incluida.

## GT-616 — telemetría que no puede reconstruir un incidente

### La evidencia, revalidada

`AddTrackerTracing`
(`src/apps/tracker-api/Tracker.Presentation/Observability/TrackerTracing.cs`,
líneas 55 a 58) retorna antes de registrar nada cuando `Otlp:Endpoint` está
vacío, y vacío es el valor por omisión. Esa parte de la fila es correcta.

Tres hechos más que la fila no contiene:

- El retorno temprano está **ratificado**, no es accidental. Es el objeto del ADR
  `T-049`, se explica extensamente en el comentario de documentación del propio
  archivo, y lo afirma
  `Tracker.Tests/Presentation/Observability/ObservabilityConventionTests.cs`,
  prueba `SinEndpointConfigurado_LasTrazasNOseRegistran` (línea 69).
- El interruptor no está cableado a ningún despliegue.
  `product/infra/helm/evolith-tracker-api/templates/configmap.yaml` emite
  `CoreApi__*`, `AgentRuntime__*`, `Authentication__*` y `Cors__Origins__0`, más
  un paso directo sobre `.Values.extraEnv`. Nunca emite `Otlp__Endpoint`, y
  `values.yaml` no tiene bloque `otlp`. Encender las trazas en un entorno
  desplegado exige editar a mano `extraEnv` con una clave que nadie documentó.
- `.env.example` (líneas 40 y 41) anuncia `OTEL_EXPORTER_OTLP_ENDPOINT` y
  `OTEL_SERVICE_NAME`. `TracingOptions.SectionName` es `"Otlp"`, así que la clave
  de entorno enlazada es `Otlp__Endpoint`. Seguir la documentación produce
  silencio, que es indistinguible del estado apagado que se pretendía.
- No se inicia ni un solo tramo. `TrackerTracing.Source` se referencia
  exactamente una vez en todo el repositorio, desde la prueba de convención que
  afirma su nombre.

```bash
# en evolith_tracker — ambos devuelven cero coincidencias de producción
grep -rn "StartActivity" src --include=*.cs
grep -rn "Otlp__" product/infra
```

### El defecto, enunciado con exactitud

Incluso con el exportador encendido, los únicos tramos que el Tracker emite son
el tramo de petición de ASP.NET y el tramo saliente de `HttpClient` creado por la
instrumentación automática. No hay tenant, iniciativa, producto, gate, fase,
decisión ni actor adjuntos a nada. Un incidente es reconstruible como fontanería
HTTP y no como gobernanza — que es precisamente la distinción que pide la fila
del gap y la que el código actual no puede expresar.

### Lo que este traspaso no pide

No borres el retorno temprano, y no cambies el valor por omisión a encendido. Eso
pondría en rojo `SinEndpointConfigurado_LasTrazasNOseRegistran`, y una prueba en
rojo ahí significa que el cambio violó `T-049`, no que la prueba esté obsoleta.
Apagado por omisión es la decisión; inalcanzable y sin instrumentar es el
defecto.

### El cambio

1. Añade `otlp.endpoint` (por omisión `""`) y `otlp.serviceName` a
   `product/infra/helm/evolith-tracker-api/values.yaml`, emite `Otlp__Endpoint` y
   `Otlp__ServiceName` desde
   `product/infra/helm/evolith-tracker-api/templates/configmap.yaml`, y define un
   endpoint real solo en `values-ci-prod.yaml`. El valor por omisión sigue vacío,
   así que el comportamiento ratificado no cambia y el interruptor pasa a ser
   alcanzable.
2. Resuelve la colisión de nombres en `.env.example`: o renombra las líneas 40 y
   41 a `Otlp__Endpoint` y `Otlp__ServiceName`, o enlaza los nombres `OTEL_*`
   como alternativa dentro de `AddTrackerTracing`. Elige uno. Dos nombres
   documentados para un solo interruptor, de los cuales solo uno funciona, es
   como nació este defecto.
3. Instrumenta las costuras de gobernanza con
   `TrackerTracing.Source.StartActivity`, etiquetando cada tramo desde una única
   clase de constantes declarada, para que un renombrado no pueda dejar huérfano
   un tablero en silencio. Conjunto mínimo de atributos: `evolith.tenant_id`,
   `evolith.product_id`, `evolith.initiative_id`, `evolith.phase`,
   `evolith.gate`, `evolith.decision`, `evolith.actor_id`,
   `evolith.correlation_id`. Costuras mínimas: `CoreEvaluationGateway.EvaluateAsync`
   y `EvaluateInlineAsync`, la ruta de envío de phase-gate en
   `PhaseGateEndpoints.cs`, y la ruta de decisión de exenciones que ya ejercita el
   robot `exception-governance`.

### La prueba que lo demuestra

Extiende
`src/apps/tracker-api/Tracker.Tests/Presentation/Observability/ObservabilityConventionTests.cs`,
que ya lee las fuentes desde disco y por tanto no necesita infraestructura nueva:

- `ElConfigMapDeclaraElEndpointOtlp` — lee
  `product/infra/helm/evolith-tracker-api/templates/configmap.yaml` y comprueba
  que contiene `Otlp__Endpoint`. Hoy está en rojo.
- `LaVariableDocumentadaEsLaQueElCodigoLee` — comprueba que `.env.example` nombra
  el mismo interruptor que el código enlaza, y que no nombra un segundo que
  ignora. Hoy está en rojo.
- `LosTramosDeGobernanzaLlevanAtributosDeDominio` — registra un
  `ActivityListener` sobre la fuente `Evolith.Tracker`, hace pasar una evaluación
  por `CoreEvaluationGateway` con un `HttpClient` simulado, y comprueba que se
  registró al menos una `Activity` con `evolith.tenant_id` y `evolith.decision`.
  Hoy está en rojo: nunca se crea ninguna actividad.

La tercera es la que sostiene el peso; las dos primeras solo demuestran que el
interruptor es alcanzable. `SinEndpointConfigurado_LasTrazasNOseRegistran` debe
seguir en verde de principio a fin, y que siga en verde forma parte de los
criterios de aceptación.

## GT-617 — la documentación contradice el esquema

### La evidencia, revalidada

Cada número de la fila es correcto. Contado hoy:

| Afirmación | Dónde vive la afirmación | Documentado | Real |
|---|---|---|---|
| Decisiones de arquitectura | `README.md` línea 10, insignia de ADRs | 30 | 31 |
| Esquemas de base de datos | `reference/specs/design/tracker-postgresql-data-design.md` | 10 | 7 |
| Tablas de base de datos | mismo documento | 33 | 45 |
| Robots de RoboSoft | `robosoft/README.md` líneas 60 a 67 | 3 | 12 |

Los cinco esquemas documentados que no existen son `tracker_artifacts`,
`tracker_audit`, `tracker_design`, `tracker_discovery` y `tracker_integration`.
Los dos esquemas reales que el documento de diseño nunca nombra son
`tracker_intake` y `tracker_geo`. Los siete que sí existen, con su número de
tablas, son `tracker_governance` (21), `tracker_geo` (12), `tracker_intake` (5),
`tracker_qa` (3), `tracker_construction` (1), `tracker_metrics` (1) y
`tracker_release` (1).

La tabla de robots es peor que un conteo obsoleto: dos de sus tres filas están
marcadas como `_(next)_`, y ambos robots están construidos y dentro del gate de
CI.

```bash
# en evolith_tracker
grep -c "^CREATE TABLE " reference/specs/design/tracker-postgresql-data-design.md
grep -oE "CREATE SCHEMA IF NOT EXISTS [a-z_]+" reference/specs/design/tracker-postgresql-data-design.md | sort -u | wc -l
grep -cE "ToTable\(" src/apps/tracker-api/Tracker.Infrastructure/Migrations/TrackerDbContextModelSnapshot.cs
ls robosoft/robots/*.robot.mjs | wc -l
grep -oE "T-0[0-9]{2}" evolith.yaml | sort -u | wc -l
```

### El defecto, enunciado con exactitud

Cuatro artefactos que una due diligence técnica lee primero declaran cada uno un
conteo que el código contradice, y todos ellos se mantienen a mano. Corregir los
cuatro números dejaría intacto el mecanismo que los produjo, y la siguiente
migración reabriría el gap.

### El cambio

Deriva los cuatro, y pon un gate a la derivación.

1. `scripts/docs/gen-schema-inventory.mjs` — parsea `ToTable("t", "s")` desde
   `src/apps/tracker-api/Tracker.Infrastructure/Migrations/TrackerDbContextModelSnapshot.cs`
   y escribe el inventario de esquemas y tablas en un bloque generado y marcado,
   tanto en `tracker-postgresql-data-design.md` como en su `.es.md`. Regenera
   ambos en la misma ejecución, o el hueco en español se convertirá en la nueva
   copia obsoleta.
2. `scripts/docs/gen-robot-inventory.mjs` — lee el `name` y la `description` que
   exporta cada `robosoft/robots/*.robot.mjs` y escribe la tabla de robots en
   `robosoft/README.md`. El contrato de robot documentado en ese mismo README ya
   garantiza que esos dos campos existen.
3. La insignia de ADRs — o genera el conteo a partir de las entradas `T-NNN` de
   `evolith.yaml`, o quita el número de la insignia. Quitarlo es la opción honesta
   más barata: un conteo que nadie regenera es un pasivo, no información.
4. `scripts/ci/validate-doc-inventories.mjs`, cableado en
   `.github/workflows/deploy-check.yml` — regenera en un búfer y falla cuando
   difiere de lo que está commiteado. Debe salir con código distinto de cero
   cuando encuentre cero esquemas, cero tablas o cero robots, y debe imprimir esos
   tres denominadores en la ejecución que pasa. Un chequeo de deriva que no
   escanea nada reporta éxito, y esa es la forma de fallo que existe para atrapar
   todo este tablero.

### La prueba que lo demuestra

O bien una clase de xUnit
`src/apps/tracker-api/Tracker.Tests/Documentation/DocInventoryParityTests.cs`, o
bien el guarda del punto 4 de arriba, con exactamente uno de los dos como dueño
de la afirmación. Dos dueños significa que no se confía en ninguno. La opción que
se elija debe afirmar:

- `DesignDocSchemasMatchTheModelSnapshot` — igualdad de conjuntos entre los
  nombres de esquema del documento de diseño y los del snapshot del modelo. Hoy
  está en rojo: cinco nombres documentados que no existen, dos que existen y no
  están documentados.
- `DesignDocTableCountMatchesTheModelSnapshot` — 33 contra 45 hoy.
- `RobotTableMatchesTheRobotsDirectory` — conteo y nombres. 3 contra 12 hoy, con
  dos entradas mal etiquetadas como aún no construidas.
- `AdrBadgeMatchesTheRegistry` — 30 contra 31 hoy, o una afirmación de que la
  insignia no lleva número si la opción 3 lo quita.

Cada afirmación lee primero su denominador y falla cuando este es cero.

## Lo que este traspaso no cierra

Tres cosas, enunciadas para que nadie confunda este documento con progreso.

Las filas de gap siguen en `PENDING` en `gap-tracking.md` y `gap-tracking.es.md`,
y sus casillas de aceptación siguen sin marcar. Nada cambió en el Tracker, y el
repositorio del Core no puede ejecutar una prueba del Tracker.

La revalidación se hizo contra un commit de una rama de una copia de trabajo. Es
más fuerte que la afirmación sin verificar del diagnóstico y más débil que una
prueba fusionada. Los comandos de reproducción se incluyen para que el equipo del
Tracker pueda estar en desacuerdo con un número concreto en vez de con el
documento.

Se encontró un defecto adyacente que **no** forma parte de estos tres gaps:
`tracker-postgresql-data-design.md` todavía modela los agregados `Backlog`,
`Epic` y `UserStory` en los esquemas que se inventa, y Evolith solo gobierna
iniciativas. Regenerar el inventario desde el snapshot borrará esas tablas del
documento como efecto colateral, lo que resuelve el síntoma; la prosa a su
alrededor seguirá estando mal y necesita una fila aparte.

## Relacionado

- [Tablero de seguimiento de gaps](../gaps/gap-tracking.es.md) — las tres filas, sin cambios.
- [Tablero de oportunidades](./README.es.md) — índice de este documento.
- [Centro de control](../README.es.md) — hub de gobernanza.

[Volver al Tablero de oportunidades](./README.es.md)
