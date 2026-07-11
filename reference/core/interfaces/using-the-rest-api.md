# Cómo usar la API REST de Evolith Core

Guía práctica para integrar Evolith Core vía su API HTTP. Esta es la superficie
que consume el **Evolith Tracker** (y cualquier integrador): un middleware sobre
el Core — que es un **motor de evaluación stateless** — expuesto tras un envelope
uniforme.

Está pensada para leerse una vez y consultarse por endpoint después.

---

## 1. Qué es la API y cómo se llama

El Core no guarda estado: recibe un **contexto de evaluación** y devuelve un
**veredicto**. La API expone esa evaluación (más los datos de referencia que el
consumidor necesita: rulesets, topologías, requisitos de fase) sobre HTTP.

- **Base URL:** todos los endpoints de negocio viven bajo `/api/v1/…`
  (versionado por URI). Ejemplo: `POST /api/v1/evaluate`.
- **Formato:** `application/json` en request y response.
- **Endpoints de salud y métricas** (`/health`, `/metrics`) son *version-neutral*
  (sin el prefijo `/api/v1`).

Ejemplo de llamada:

```http
POST /api/v1/gates/PG1/evaluate
Content-Type: application/json

{ "workspaceRef": "op_01j7wq8e2n", "evaluatedBy": "ci" }
```

---

## 2. Tres conceptos que aplican a (casi) todos los endpoints

### 2.1. El envelope de respuesta (ADR-0073)

Cada respuesta —de éxito o de error— viene envuelta igual. En éxito:

```json
{ "success": true, "data": { /* el resultado */ },
  "meta": { "executedAt": "…", "correlationId": "…", "schemaVersion": "1.0.0" } }
```

En error, un envelope con el mismo `code` de dominio que usan la CLI y MCP:

```json
{ "success": false, "error": { "code": "RULESET_NOT_FOUND", "message": "…" }, "meta": { /* … */ } }
```

El código HTTP acompaña la semántica (`200` éxito, `422` entrada no procesable,
`503` no disponible…), pero el `error.code` del envelope es el contrato estable
que debes leer.

### 2.2. `workspaceRef`, no rutas

El Core es stateless y **no recibe rutas de filesystem crudas** por la red. En su
lugar, muchos endpoints piden un **`workspaceRef`**: una referencia opaca que el
Tracker emite y el Core resuelve del lado del servidor. Piensa en él como un
handle al contenido del satélite, no como una ruta local.

### 2.3. Autenticación

En producción la API se protege con una **API key** (`ApiKeyGuard`). Si
`EVOLITH_API_KEY` no está configurada, la API corre **sin autenticar** (útil en
desarrollo, no en producción — el servidor lo advierte en logs). Cuando está
activa, se envía la key en la cabecera acordada por tu despliegue.

---

## 3. Evaluación y arquitectura

Este grupo es el corazón del Core: recibe un contexto que tú describes y devuelve un veredicto. Todos los endpoints cuelgan de la base `/api/v1`. Como el Core es *stateless* (ADR-0101), nunca recibe rutas crudas de tu repositorio: el Tracker BFF te entrega un `workspaceRef` opaco que el Core resuelve del lado del servidor. La única excepción es `POST /evaluate`, que además admite mandar el contenido del satélite **en línea** dentro del propio body.

### 3.1. `POST /evaluate` — evaluar un contexto completo

**Qué hace.** Es la puerta de entrada canónica del Core (ADR-0101). Le mandas un `EvaluationContext` y te devuelve un `EvaluationResult` con el veredicto global (compuertas + cumplimiento + arquitectura). Acepta tres formas de decir "qué evaluar", en este orden de prioridad: **en línea** (`evaluationInput.files`, el contenido del satélite viaja en el body y se evalúa en memoria, sin tocar disco ni red), **canónica** (`workspaceRef` opaco que el Core resuelve) y **legacy** (`satellitePath`, una ruta de disco, retenida por compatibilidad). Si no envías ninguna de las tres, responde `400`.

**Body** (`EvaluationContextDto`; los campos marcados como opcionales lo son porque el modo elegido decide cuáles aplican):

| Campo | Tipo | Req | Para qué |
| --- | --- | --- | --- |
| `evaluationInput.files` | objeto `{ ruta: contenido }` | opcional | Contenido del satélite **en línea**. Mapa de ruta relativa → contenido; debe incluir `evolith.yaml` en la raíz. Si está presente, gana sobre `workspaceRef`/`satellitePath` y el Core evalúa esto en memoria. |
| `workspaceRef` | string | opcional | Referencia opaca al workspace (ADR-0074) que el Core resuelve del lado del servidor. Es el camino canónico cuando no mandas el contenido en línea. |
| `kinds` | string[] | opcional | Qué tipos de evaluación pedir, p.ej. `["gate","compliance"]`. |
| `phaseId` | string | opcional | Fase SDLC canónica a evaluar (`discovery`…`release`). |
| `gateId` | string | opcional | Compuerta concreta a evaluar dentro del contexto. |
| `topologyRef` | string | opcional | Topología a evaluar / override. |
| `tenant` / `product` / `initiative` | objeto | opcional | Contexto opaco (ids de tenant, producto e iniciativa). Nunca son entidades del Core: se reflejan como contexto, no se resuelven. |
| `artifacts`, `evidence`, `checkpoint`, `deployment`, `architecture`, `design`, `sdlcConfig`, `customConstraints`, … | objeto/array | opcional | Hechos declarados del `EvaluationContext` canónico. El Core evalúa lo que declaras aquí, no escanea tu disco. |
| `satellitePath`, `corePath`, `topology`, `phase` | string | opcional (legacy) | Ruta de disco al satélite/Core y overrides. Solo se usan en el camino legacy, cuando falta `workspaceRef`. |

**Ejemplo** (camino en línea, el Core evalúa el contenido que le mandas):

```
POST /api/v1/evaluate
Content-Type: application/json

{
  "kinds": ["gate", "compliance"],
  "phaseId": "construction",
  "evaluationInput": {
    "files": {
      "evolith.yaml": "coreRef:\n  version: 1.0.0\n",
      "docs/prd.md": "# PRD"
    }
  }
}
```

**Qué esperar.** El envelope de éxito con `data` = el `EvaluationResult` (veredicto global + `outcome`) en el camino canónico/en línea, o el veredicto legacy si usaste `satellitePath`. La evaluación en memoria es *stateless*: los archivos que envías nunca se escriben en disco. Si el Core no tiene configurado el camino en línea, o no logra resolver `corePath`, responde `400` con el motivo.

### 3.2. `POST /gates/{gateId}/evaluate` — evaluar una compuerta de fase

**Qué hace.** Evalúa **una** compuerta de fase y devuelve su evidencia (`GateEvidence`): qué artefactos exige, cuáles están presentes y el veredicto. El `gateId` va en la ruta; el Core extrae de él el **primer dígito** para saber a qué fase corresponde: `1`→`discovery`, `2`→`design`, `3`→`construction`, `4`→`qa`, `5`→`release`. Un id cuyo primer dígito no esté en `1..5` se rechaza con `400` (no se evalúa la compuerta equivocada en silencio).

**Body** (`EvaluateGateDto`):

| Campo | Tipo | Req | Para qué |
| --- | --- | --- | --- |
| `workspaceRef` | string | **sí** | Referencia opaca al workspace emitida por el Tracker BFF; el Core la resuelve para saber qué satélite evaluar. |
| `evaluatedBy` | `human` \| `agent` \| `ci` | opcional | Quién evalúa. Queda registrado en la `GateEvidence` (paridad con CLI/MCP). Por defecto `human`. |

**Ejemplo:**

```
POST /api/v1/gates/PG3-01/evaluate
Content-Type: application/json

{
  "workspaceRef": "op_01j7wq8e2n",
  "evaluatedBy": "ci"
}
```

**Qué esperar.** El envelope de éxito con `data` = la evidencia de la compuerta (fase, veredicto `passed`/`failed`, violaciones con el artefacto que falta y su ubicación). En este ejemplo, `PG3-01` mapea a la compuerta de `construction`.

### 3.3. `POST /validate/composable` — validación multi-modo

**Qué hace.** Corre el motor "composable", que detecta automáticamente qué modos de validación aplican al contexto (SDLC, arquitectura, ruleset, ADR y ad-hoc) y los ejecuta todos, en vez de que elijas uno a mano. Es el equivalente REST de `evolith-cli validate --composable`.

**Body** (`ComposableValidateDto`):

| Campo | Tipo | Req | Para qué |
| --- | --- | --- | --- |
| `workspaceRef` | string | **sí** | Referencia opaca al workspace que el Core resuelve (valida el formato y evita salir de la raíz permitida). |
| `engine` | `native` \| `opa` | opcional | Motor de reglas a usar. Por defecto `native`. |
| `topology` | string | opcional | Acota a una topología: `modular-monolith`, `distributed-modules`, `microservices`, `serverless`, `edge-computing`, `event-driven`, `data-mesh`, `agentic-ai`. |
| `phase` | string | opcional | Acota a una fase: `discovery`…`release` (los alias legacy `f1`..`f5` se aceptan como deprecados). |
| `ruleset` | string | opcional | Valida solo un ruleset por id. |
| `adr` | string | opcional | Valida el cumplimiento de un ADR concreto (p.ej. `adr-0002`). |
| `file` | string | opcional | Valida un único archivo (modo ad-hoc). |

**Ejemplo:**

```
POST /api/v1/validate/composable
Content-Type: application/json

{
  "workspaceRef": "op_01j7wq8e2n",
  "engine": "native",
  "phase": "construction"
}
```

**Qué esperar.** El envelope con los resultados combinados de cada modo que aplicó. Restringir con `topology`/`phase`/`ruleset`/`adr`/`file` reduce los modos que corren.

### 3.4. `POST /architecture/validate-satellite` — validar el satélite contra reglas de arquitectura

**Qué hace.** Valida un satélite contra las reglas de arquitectura del Core. Si le pasas un `manifest`, dispara el pipeline de evaluación de extremo a extremo (compuertas incluidas) y devuelve el envelope ADR-0073; si no, devuelve el resultado de validación directo.

**Body** (`ValidateSatelliteDto`):

| Campo | Tipo | Req | Para qué |
| --- | --- | --- | --- |
| `workspaceRef` | string | **sí** | Referencia opaca al workspace que el Core resuelve para localizar el satélite. |
| `manifest` | objeto (`SatelliteManifestDto`) | opcional | Manifiesto que activa el pipeline completo. Sus campos clave: `satellitePath` (ruta del satélite), `corePath` (Core), `topology` (override; si se omite se autodetecta), `phase` (si la das, solo evalúa las compuertas de esa fase) y `facts` (hechos declarados proyectados del `EvaluationContext` canónico: contexto, gate, evidencia, waivers). |

**Ejemplo:**

```
POST /api/v1/architecture/validate-satellite
Content-Type: application/json

{
  "workspaceRef": "op_01j7wq8e2n",
  "manifest": {
    "satellitePath": "/path/to/satellite",
    "phase": "construction"
  }
}
```

**Qué esperar.** Con `manifest`, el envelope de evaluación (veredicto de gates + cumplimiento). Sin `manifest`, el objeto de resultado de validación crudo.

### 3.5. `POST /architecture/detect-drift` — detectar deriva arquitectónica

**Qué hace.** Compara el nivel de madurez **declarado** del satélite contra el **detectado** en el código y reporta la deriva (violaciones nuevas, persistentes o resueltas). Es el equivalente REST de `evolith-cli drift`.

**Body** (`DetectDriftDto`):

| Campo | Tipo | Req | Para qué |
| --- | --- | --- | --- |
| `workspaceRef` | string | **sí** | Referencia opaca al workspace que el Core resuelve para analizar el proyecto. |
| `declaredLevel` | string | opcional | Nivel de madurez que declaras (p.ej. `F2`), para contrastarlo con el detectado. |

**Ejemplo:**

```
POST /api/v1/architecture/detect-drift
Content-Type: application/json

{
  "workspaceRef": "op_01j7wq8e2n",
  "declaredLevel": "F2"
}
```

**Qué esperar.** El resultado de deriva: si hubo drift, el nivel declarado vs. detectado y la lista de violaciones.

### 3.6. `POST /architecture/recommend-topology` — recomendar una composición de topología

**Qué hace.** A partir de señales técnicas (número de equipos, despliegue independiente, escala alta, integración asíncrona…) recomienda **cómo componer** la topología y explica el porqué de cada pieza. Es *advisory* y no vinculante (ADR-0104 / GT-430): el Core recomienda en Discovery, el tenant confirma en Design. Comparte el motor exacto (`TopologyRecommendationService.recommend`) con el comando CLI `topology recommend` y la tool MCP equivalente, así que las tres superficies dan el mismo resultado.

**Body** (`RecommendTopologyDto`):

| Campo | Tipo | Req | Para qué |
| --- | --- | --- | --- |
| `signals` | objeto `{ señal: boolean \| number }` | opcional | Señales técnicas que guían la recomendación. Booleanas (`deploymentIndependence`, `asyncIntegration`, `highScale`, `dataProductSharing`, `spikyLoad`, `latencyTolerant`, `edgeOrOffline`, `aiAgents`) más un `teamCount` numérico. Si se omite, se recomienda sobre señales vacías. |

**Ejemplo:**

```
POST /api/v1/architecture/recommend-topology
Content-Type: application/json

{
  "signals": { "deploymentIndependence": true, "asyncIntegration": true, "teamCount": 4 }
}
```

**Qué esperar.** La recomendación con la `composition` sugerida y la `rationale` (una razón por topología, con su `ruleId`). Si el Core no encuentra el ruleset de recomendación en su checkout, responde `404`.

### 3.7. `POST /architecture/evaluate-phase-artifacts` — medir completitud de artefactos de fase

**Qué hace.** Para una fase **downstream** y una composición de topología ya confirmada, mide qué artefactos declaras como presentes contra la **unión** de los artefactos universales de esa fase más los que cada topología exige en su perfil, y devuelve un puntaje de completitud. También es *advisory* (ADR-0104 / DN-06 / GT-434): el Core mide, la compuerta del tenant decide. Comparte motor (`PhaseArtifactProfileService.evaluate`) con el CLI `topology phase-artifacts` y la tool MCP.

**Body** (`EvaluatePhaseArtifactsDto`):

| Campo | Tipo | Req | Para qué |
| --- | --- | --- | --- |
| `phase` | `construction` \| `quality` \| `deployment` | **sí** | Fase downstream a medir. Otro valor se rechaza. |
| `topologies` | string[] | **sí** | Composición de topología confirmada (p.ej. `["microservices","event-driven"]`); de aquí sale el perfil de artefactos por topología. |
| `declaredArtifacts` | string[] | opcional | Tipos de artefacto que declaras presentes (p.ej. `["test-summary-report","coverage-report"]`). Si se omite, verás todo como faltante. |

**Ejemplo:**

```
POST /api/v1/architecture/evaluate-phase-artifacts
Content-Type: application/json

{
  "phase": "quality",
  "topologies": ["microservices", "event-driven"],
  "declaredArtifacts": ["test-summary-report", "coverage-report"]
}
```

**Qué esperar.** El resultado con el puntaje de completitud y las listas de artefactos requeridos, presentes, faltantes y condicionales.

### 3.8. `GET /architecture/topologies` — listar las topologías disponibles

**Qué hace.** Devuelve el catálogo completo de manifiestos de topología que el Core conoce (los que usan `recommend-topology` y `validate/composable`). No lleva body; la respuesta se cachea del lado del servidor.

**Ejemplo:**

```
GET /api/v1/architecture/topologies
```

**Qué esperar.** El envelope con un array de manifiestos de topología (id, nombre, spec, perfiles de fase…).

### 3.9. `GET /architecture/topologies/{id}` — obtener una topología por id

**Qué hace.** Devuelve el manifiesto de **una** topología por su id. Útil para inspeccionar el perfil concreto (p.ej. qué artefactos exige en cada fase) antes de componer.

**Argumentos** (en la ruta):

| Campo | Tipo | Req | Para qué |
| --- | --- | --- | --- |
| `id` | string (ruta) | **sí** | Id de la topología a consultar, p.ej. `microservices`. |

**Ejemplo:**

```
GET /api/v1/architecture/topologies/microservices
```

**Qué esperar.** El envelope con el manifiesto de esa topología. Si el id no existe, responde `404`.

### 3.10. `POST /phases/transition` — ejecutar una transición de fase

**Qué hace.** Ejecuta el traspaso de una fase a otra: transiciona los artefactos ejecutando las herramientas que indiques y deja el proyecto posicionado en la fase destino. A diferencia de la propuesta de transición del CLI (`phase advance`), aquí se **ejecuta** la transición. Nota de nomenclatura: usa el esquema numerado `phase-0`, `phase-1`, … (no las fases SDLC canónicas).

**Body** (`TransitionPhaseDto`, todos requeridos):

| Campo | Tipo | Req | Para qué |
| --- | --- | --- | --- |
| `from` | string | **sí** | Fase origen (p.ej. `phase-0`). |
| `to` | string | **sí** | Fase destino (p.ej. `phase-1`). |
| `tools` | string[] | **sí** | Herramientas a ejecutar durante la transición (p.ej. `["lint","test"]`). |
| `workspaceRef` | string | **sí** | Referencia opaca al workspace que el Core resuelve para operar sobre el proyecto correcto. |

**Ejemplo:**

```
POST /api/v1/phases/transition
Content-Type: application/json

{
  "from": "phase-0",
  "to": "phase-1",
  "tools": ["lint", "test"],
  "workspaceRef": "op_01j7wq8e2n"
}
```

**Qué esperar.** El envelope de éxito con `data` = el resultado de la transición (bajo el nombre de comando canónico `evolith-cli phase transition`).

### 3.11. `POST /architecture-plans/evaluate` — evaluar un plan de arquitectura

**Qué hace.** Recibe el borrador de un **plan de arquitectura** (Design-phase Advisory Governance, ADR-0104), lo pasa por el motor OPA y devuelve el plan **evaluado**: sugiere el modo SDLC (`full`/`tailored`/`minimal`/`rejected`) y los aprobadores requeridos. El Core es stateless: sugiere la transición pero **no la persiste** (deja el plan en estado `under_review`).

**Body** (`Partial<ArchitecturePlan>` — mandas el borrador; los campos ausentes toman defaults):

| Campo | Tipo | Req | Para qué |
| --- | --- | --- | --- |
| `title` | string | opcional | Título del plan. |
| `prompt_source` | string | opcional | Origen del prompt/solicitud que motiva el plan. |
| `scope` | objeto | opcional | Alcance `{ functional, technical }`. |
| `impact` | objeto | opcional | Impacto `{ components[], interfaces[] }`. |
| `risk_assessment` | objeto | opcional | Riesgo `{ criticality, complexity, security_risks[], architectural_risks[] }` (criticidad/complejidad `low`/`medium`/`high`). |
| `execution_plan` | objeto | opcional | Plan `{ suggested_sdlc_phases[], mandatory_gates[], suggested_adrs[], applicable_policies[] }`. |
| `governance` | objeto | opcional | Gobernanza; el motor la completa con `sdlc_mode_suggested` y `required_approvals`. |

**Ejemplo:**

```
POST /api/v1/architecture-plans/evaluate
Content-Type: application/json

{
  "title": "Nuevo microservicio de checkout",
  "prompt_source": "initiative-3ds",
  "scope": { "functional": "Pagos 3DS", "technical": "Servicio aislado + cola" },
  "risk_assessment": { "criticality": "high", "complexity": "medium", "security_risks": ["PCI"], "architectural_risks": [] }
}
```

**Qué esperar.** El plan evaluado, con `governance.sdlc_mode_suggested`, `governance.required_approvals` y `status: "under_review"`. Los campos que no enviaste toman sus valores por defecto (versión `1`, `audit_trail` generado).

## 4. Datos de referencia, satélites, proyectos y salud

Este grupo reúne los endpoints de solo lectura sobre el corpus de reglas del
Core (rulesets, gates y requisitos de fase), el registro de satélites, las
operaciones de ciclo de vida de proyectos y las sondas de salud y observabilidad
que usa tu orquestador. Salvo `/metrics`, todas las respuestas siguen el
envelope y las convenciones de autenticación descritas en la cabecera de esta
guía.

### 4.1. `GET /api/v1/rulesets` — listar los rulesets del Core

**Qué hace.** Devuelve el catálogo de rulesets (conjuntos de reglas de
gobernanza) que el Core tiene cargados y expone a los clientes de la API. Es el
punto de partida para descubrir qué reglas existen antes de consultar una en
detalle. Es de solo lectura: no toca el satélite ni requiere el gate mutativo.

**Argumentos.** Ninguno. No lleva parámetros de ruta ni cuerpo.

**Ejemplo:**

```http
GET /api/v1/rulesets
```

**Qué esperar.** En `data`, un arreglo de resúmenes de ruleset (identificador
canónico y metadatos básicos de cada uno). El arreglo puede venir vacío si el
Core no tiene reglas cargadas en la ruta configurada.

### 4.2. `GET /api/v1/rulesets/:id` — obtener un ruleset por su identificador

**Qué hace.** Devuelve el contenido completo de un ruleset concreto,
identificado por su identificador canónico. Úsalo cuando ya sabes qué ruleset te
interesa (por ejemplo tras listar) y quieres ver sus reglas.

**Argumentos:**

| Campo | Tipo | Req | Para qué |
|-------|------|-----|----------|
| `id` | string (ruta) | Sí | Identificador canónico del ruleset, **URL-encoded**. Como los identificadores suelen contener `/` u otros caracteres, deben codificarse para viajar en la ruta. |

**Ejemplo:**

```http
GET /api/v1/rulesets/sdlc%2Fphase-gates
```

**Qué esperar.** En `data`, el contenido del ruleset. Si el identificador no
existe, la respuesta es `404` con `success: false` y el error
`Ruleset '<id>' was not found`.

### 4.3. `GET /api/v1/gates/:gateId` — obtener la definición de un gate de fase

**Qué hace.** Devuelve la definición de una compuerta (gate) del ciclo de vida
SDLC: qué evalúa esa compuerta y bajo qué criterios se aprueba o se bloquea el
paso a la siguiente fase. Sirve para inspeccionar las reglas de una compuerta sin
ejecutar una evaluación.

**Argumentos:**

| Campo | Tipo | Req | Para qué |
|-------|------|-----|----------|
| `gateId` | string (ruta) | Sí | Identificador del gate a consultar, p. ej. `PG1`. Determina qué compuerta se devuelve. |

**Ejemplo:**

```http
GET /api/v1/gates/PG1
```

**Qué esperar.** En `data`, la definición del gate. Si el `gateId` no existe, la
respuesta es `404` con el error `Gate '<gateId>' was not found`.

### 4.4. `GET /api/v1/phases/:phase/requirements` — requisitos de una fase SDLC

**Qué hace.** Devuelve las evidencias y los requisitos bloqueantes de una fase
del ciclo de vida: qué debe cumplir un proyecto en esa fase para poder avanzar.
Es la referencia para saber qué te van a pedir las compuertas antes de proponer
un avance.

**Argumentos:**

| Campo | Tipo | Req | Para qué |
|-------|------|-----|----------|
| `phase` | string (ruta) | Sí | Identificador de la fase, p. ej. `1`. Selecciona la fase cuyos requisitos se devuelven. |

**Ejemplo:**

```http
GET /api/v1/phases/1/requirements
```

**Qué esperar.** En `data`, los requisitos de la fase (evidencias y requisitos
bloqueantes). Si la fase no existe, la respuesta es `404` con el error
`Phase '<phase>' was not found`.

### 4.5. `POST /api/v1/satellites` — registrar un satélite

**Qué hace.** Da de alta un nuevo satélite en el registro del Core. Un satélite
es un repositorio gobernado por el Core; registrarlo lo hace visible para el
resto de operaciones (consulta, actualización, enlace). Es mutativo: crea un
registro nuevo.

**Body:**

| Campo | Tipo | Req | Para qué |
|-------|------|-----|----------|
| `id` | string | Sí | Identificador único del satélite (p. ej. `sat_001`). Es la clave con la que lo referenciarás después. |
| `name` | string | Sí | Nombre legible del satélite (p. ej. `auth-service`), para identificarlo de forma humana. |
| `parentCorePath` | string | No | Ruta al satélite core que este extiende (p. ej. `/cores/auth`). Sirve para declarar de qué core deriva. |

**Ejemplo:**

```http
POST /api/v1/satellites
Content-Type: application/json

{
  "id": "sat_001",
  "name": "auth-service",
  "parentCorePath": "/cores/auth"
}
```

**Qué esperar.** `201 Created` y, en `data`, el registro del satélite recién
creado: incluye `status` (`registered`) y `registeredAt` (marca de tiempo ISO)
además de los campos que enviaste.

### 4.6. `GET /api/v1/satellites` — listar todos los satélites

**Qué hace.** Devuelve todos los satélites registrados en el Core. Es la vista
general del registro; de solo lectura.

**Argumentos.** Ninguno.

**Ejemplo:**

```http
GET /api/v1/satellites
```

**Qué esperar.** En `data`, un arreglo con los registros de satélite. Cada uno
trae `id`, `name`, `status`, `registeredAt` y, si aplican, `parentCorePath`,
`linkedSatelliteId` y `linkedAt`.

### 4.7. `GET /api/v1/satellites/:id` — obtener un satélite por su ID

**Qué hace.** Devuelve el registro de un satélite concreto por su identificador.
Úsalo para consultar el estado actual de un satélite (por ejemplo, si ya está
enlazado).

**Argumentos:**

| Campo | Tipo | Req | Para qué |
|-------|------|-----|----------|
| `id` | string (ruta) | Sí | Identificador del satélite a consultar. Selecciona qué registro se devuelve. |

**Ejemplo:**

```http
GET /api/v1/satellites/sat_001
```

**Qué esperar.** En `data`, el registro del satélite. Si el `id` no existe, la
respuesta es `404` con el error `Satellite '<id>' not found`.

### 4.8. `PATCH /api/v1/satellites/:id` — actualizar un satélite

**Qué hace.** Modifica campos de un satélite ya registrado. Solo cambian los
campos que envíes; los demás se conservan. Es mutativo.

**Argumentos de ruta:**

| Campo | Tipo | Req | Para qué |
|-------|------|-----|----------|
| `id` | string (ruta) | Sí | Identificador del satélite a actualizar. |

**Body (todos opcionales; envía solo lo que quieras cambiar):**

| Campo | Tipo | Req | Para qué |
|-------|------|-----|----------|
| `name` | string | No | Nuevo nombre legible del satélite. |
| `linkedSatelliteId` | string | No | ID del satélite core al que se enlaza este. |
| `parentCorePath` | string | No | Ruta al satélite core padre. |
| `linkedAt` | string | No | Marca de tiempo ISO del enlace. Normalmente lo fija el servicio automáticamente al enlazar, así que rara vez lo envías a mano. |

**Ejemplo:**

```http
PATCH /api/v1/satellites/sat_001
Content-Type: application/json

{
  "name": "auth-service-v2"
}
```

**Qué esperar.** En `data`, el registro del satélite actualizado con los cambios
aplicados.

### 4.9. `POST /api/v1/satellites/:id/link` — enlazar un satélite a su core padre

**Qué hace.** Enlaza un satélite (el de la ruta, la fuente) con un satélite core
padre (el objetivo). Tras el enlace, el registro fuente queda con
`linkedSatelliteId` apuntando al objetivo, `status` en `linked` y `linkedAt` con
la marca de tiempo del momento. Ambos satélites deben existir ya en el registro.

**Argumentos de ruta:**

| Campo | Tipo | Req | Para qué |
|-------|------|-----|----------|
| `id` | string (ruta) | Sí | ID del satélite fuente que se va a enlazar. |

**Body:**

| Campo | Tipo | Req | Para qué |
|-------|------|-----|----------|
| `targetSatelliteId` | string | Sí | ID del satélite objetivo (el core padre) al que se enlaza la fuente. |

**Ejemplo:**

```http
POST /api/v1/satellites/sat_001/link
Content-Type: application/json

{
  "targetSatelliteId": "sat_core_001"
}
```

**Qué esperar.** `200 OK` y, en `data`, el registro de la fuente ya actualizado:
`status: "linked"`, `linkedSatelliteId` igual al objetivo y `linkedAt` fijado.

### 4.10. `POST /api/v1/projects/initialize` — inicializar un proyecto

**Qué hace.** Arranca un proyecto nuevo materializando su esqueleto según un
conjunto de decisiones tecnológicas (runtime, arquitectura, base de datos,
etc.). Opera sobre el workspace que resuelve la referencia opaca del Tracker, no
sobre una ruta local. Es mutativo.

**Body:**

| Campo | Tipo | Req | Para qué |
|-------|------|-----|----------|
| `workspaceRef` | string | Sí | Referencia opaca de workspace emitida por el Tracker BFF (p. ej. `op_01j7wq8e2n`). El Core la resuelve para saber sobre qué workspace materializar. |
| `name` | string | Sí | Nombre del proyecto. |
| `type` | string | Sí | Tipo de proyecto (p. ej. `nestjs`). Actúa como runtime por defecto si no lo especificas en `options`. |
| `options` | objeto | No | Decisiones adicionales de scaffolding. Cada clave anula un valor por defecto. |

Dentro de `options` se reconocen, entre otras: `runtime` (por defecto `nodejs`),
`monorepo` (`npm-workspaces`), `architecture` (`clean`), `database`
(`postgresql`), `apiProtocol` (`rest`), `ciCd` (`github-actions`),
`observability` (`opentelemetry`), y los arreglos `features` y `agents`. Si no
las envías, se aplican esos valores por defecto.

**Ejemplo:**

```http
POST /api/v1/projects/initialize
Content-Type: application/json

{
  "workspaceRef": "op_01j7wq8e2n",
  "name": "my-service",
  "type": "nestjs",
  "options": {
    "database": "postgresql",
    "features": ["auth", "audit"]
  }
}
```

**Qué esperar.** `201 Created` y, en `data`, el resultado de la inicialización
del proyecto (el esqueleto materializado y las decisiones aplicadas).

### 4.11. `POST /api/v1/projects/propose-advance` — proponer un avance de fase

**Qué hace.** Propone que un proyecto avance de una fase del ciclo de vida a la
siguiente. El Core evalúa la compuerta de salida de la fase actual y devuelve si
el avance procede. Si omites `currentPhase`, el Core usa `targetPhase` como
fase de origen para que la evaluación siempre tenga una fase de partida definida.

**Body:**

| Campo | Tipo | Req | Para qué |
|-------|------|-----|----------|
| `workspaceRef` | string | Sí | Referencia opaca de workspace del Tracker BFF. Identifica el proyecto a evaluar. |
| `targetPhase` | string | Sí | Fase a la que se quiere avanzar (p. ej. `phase-2`). |
| `currentPhase` | string | No | Fase actual, cuya compuerta de salida se evalúa (p. ej. `phase-1`). Si se omite, se toma `targetPhase`. |
| `triggerDeploy` | boolean | No | Si es `true`, dispara el despliegue después de avanzar. |

**Ejemplo:**

```http
POST /api/v1/projects/propose-advance
Content-Type: application/json

{
  "workspaceRef": "op_01j7wq8e2n",
  "currentPhase": "phase-1",
  "targetPhase": "phase-2",
  "triggerDeploy": false
}
```

**Qué esperar.** `200 OK` y, en `data`, los resultados de la propuesta de avance:
el veredicto de la compuerta y el detalle de qué requisitos se cumplen o
bloquean el paso.

### 4.12. `GET /health` — chequeo de salud (liveness + readiness)

**Qué hace.** Comprueba de un vistazo que el servicio está sano. Es la sonda
combinada de liveness y readiness. Es un endpoint **version-neutral** (sin
`/api/v1`) y **público**: no requiere API key, para que los orquestadores lo
puedan sondear.

**Argumentos.** Ninguno.

**Ejemplo:**

```http
GET /health
```

**Qué esperar.** En `data`, un objeto con `status: "OK"`, `service: "Evolith
Core API"` y `timestamp` (ISO). Sigue el envelope estándar.

### 4.13. `GET /health/live` — sonda de liveness

**Qué hace.** Indica únicamente que el proceso está vivo (arrancado y
respondiendo). No comprueba dependencias. Es la sonda ligera para que el
orquestador sepa si debe reiniciar el proceso. Version-neutral y pública.

**Argumentos.** Ninguno.

**Ejemplo:**

```http
GET /health/live
```

**Qué esperar.** En `data`, `status: "UP"` y `timestamp` (ISO).

### 4.14. `GET /health/ready` — sonda de readiness

**Qué hace.** Indica si el servicio está listo para recibir tráfico: verifica que
el corpus de reglas (el archivo de phase-gates) es accesible y que el subsistema
de métricas está disponible. A diferencia de `live`, sí comprueba dependencias.
Version-neutral y pública.

**Argumentos.** Ninguno.

**Ejemplo:**

```http
GET /health/ready
```

**Qué esperar.** Si todo está arriba, `data` trae `status: "UP"`, un objeto
`checks` con `corpus` y `metrics` en `UP`, y `timestamp`. Si alguna dependencia
falla, la respuesta es `503 Service Unavailable` con `status: "DOWN"`, el mismo
objeto `checks` señalando qué está en `DOWN`, y `timestamp`.

### 4.15. `GET /metrics` — métricas Prometheus

**Qué hace.** Expone las métricas de la aplicación y de la caché en formato de
texto Prometheus, para que un scraper las recolecte. Es version-neutral (sin
`/api/v1`) y, a diferencia del resto de esta guía, **no** sigue el envelope
JSON: devuelve texto plano de exposición Prometheus. El acceso está protegido por
su propio guard de métricas.

**Argumentos.** Ninguno.

**Ejemplo:**

```http
GET /metrics
```

**Qué esperar.** `Content-Type: text/plain` y, en el cuerpo, las métricas en
formato de exposición Prometheus (métricas de la app seguidas de las de la
caché). No hay envelope ni campo `data`: el cuerpo es directamente el texto que
consume Prometheus.
