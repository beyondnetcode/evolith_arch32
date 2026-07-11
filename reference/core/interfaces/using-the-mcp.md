# Cómo usar Evolith Core vía MCP (para agentes)

Guía práctica para operar Evolith Core desde un **agente de IA** a través del
servidor MCP (Model Context Protocol). Donde la CLI es la interfaz local para una
persona, MCP es la interfaz para que un agente ejerza las mismas capacidades —
con paridad plena, incluidas las operaciones de filesystem y scaffolding.

Está pensada para leerse una vez y consultarse por herramienta después.

---

## 1. Qué es el servidor MCP y cómo se conecta un agente

El servidor MCP de Evolith expone cada capacidad del Core como una **herramienta**
(`evolith-*`) que un agente invoca por JSON-RPC sobre HTTP (transporte
StreamableHTTP). El flujo de conexión es siempre el mismo:

1. **`initialize`** — el cliente saluda; el servidor responde y emite un
   `mcp-session-id` en las cabeceras. Guárdalo: va en toda petición posterior.
2. **`notifications/initialized`** — el cliente confirma que está listo.
3. **`tools/list`** — (opcional) lista las herramientas con su `inputSchema`.
4. **`tools/call`** — invoca una herramienta con sus argumentos.

Una llamada a herramienta se ve así:

```json
{ "jsonrpc": "2.0", "id": 1, "method": "tools/call",
  "params": { "name": "evolith-gate-evaluate", "arguments": { "phase": "construction", "projectPath": "/ruta/al/satelite" } } }
```

Si usas un cliente MCP (Claude, un SDK, etc.), el handshake lo hace el cliente;
tú solo eliges la herramienta y sus argumentos.

---

## 2. Tres conceptos que aplican a (casi) todas las herramientas

### 2.1. El envelope de respuesta (ADR-0073)

Toda herramienta devuelve su resultado dentro del mismo envelope, en el `text`
del contenido de la respuesta:

```json
{ "success": true, "data": { /* el resultado */ },
  "meta": { "command": "evolith-gate-evaluate", "tool": "evolith-gate-evaluate", "executedAt": "…", "correlationId": "…", "schemaVersion": "1.0.0" } }
```

Y ante un fallo:

```json
{ "success": false, "error": { "code": "RULESET_NOT_FOUND", "message": "…" }, "meta": { /* … */ } }
```

Los códigos de error son consistentes con la CLI y REST (p.ej. un corpus de
reglas ausente es `RULESET_NOT_FOUND` en las tres superficies).

### 2.2. Herramientas mutativas — el gate de aprobación

Las herramientas que **escriben** (crean repos, generan código, modifican
archivos o estado) están marcadas como **mutativas**. El servidor las bloquea a
menos que el agente confirme explícitamente la intención pasando, además de sus
argumentos:

```json
{ "apply": true, "approvalToken": "<token-de-aprobación>" }
```

Sin `apply` + `approvalToken`, una herramienta mutativa devuelve
`error.code: FORBIDDEN` con un mensaje que pide la aprobación. Esto evita que un
agente ejecute acciones irreversibles sin una decisión consciente. Las
herramientas de solo lectura (`*-list`, `*-get`, `*-status`, `evaluate`,
`validate`, `recommend`…) no requieren nada de esto.

> En cada herramienta de abajo se indica si es **mutativa** (necesita aprobación)
> o de **lectura**.

### 2.3. Control de acceso (ABAC)

Cada herramienta tiene una clasificación de acceso (`read` / `write` / `admin`) y
el servidor la evalúa contra el rol de la sesión antes de ejecutar. En un entorno
sin API key (`--allow-no-auth`, típico en desarrollo) toda sesión recibe rol
`admin`; en producción se configura una API key y los roles se respetan. Si una
sesión no está autorizada para una herramienta, la respuesta es
`error.code: FORBIDDEN`.

---

## 3. Evaluación, compuertas y validación

Este es el corazón operativo de Evolith: siete tools para verificar que tu satélite cumple las reglas del Core, para evaluar las compuertas (gates) de cada fase del ciclo de vida y para detectar deriva arquitectónica. Las siete son de **solo lectura**: nunca modifican tu repositorio, así que puedes invocarlas libremente sin el gate mutativo (`apply` + `approvalToken`) que exigen las tools de escritura.

Todas reciben una ruta a tu satélite (y, casi siempre, una ruta opcional al checkout del Core de donde salen las reglas). Si no pasas `corePath`, cada tool intenta autodetectarlo subiendo por el árbol de directorios en busca de una carpeta `rulesets/`; si no lo encuentra, verás un error de tipo `RULESET_NOT_FOUND`.

### 3.1. `evolith-evaluate` — el motor de evaluación canónico

**Qué hace.** Es la superficie MCP del motor de evaluación stateless del Core (ADR-0101). Recibe un `EvaluationContext` canónico (gates, cumplimiento, artefactos, reglas) y devuelve un `EvaluationResult` completo. Es la tool con mayor paridad respecto a `POST /api/v1/evaluate` y al comando `evolith-cli evaluate` de la CLI: úsala cuando quieras una evaluación rica y multi-dimensional en una sola llamada. `tenant`, `product` e `initiative` son solo contexto opaco (nunca entidades que el Core persista).

**Argumentos**

| campo | tipo | req | para qué |
|-------|------|-----|----------|
| `kinds` | string[] | no | Qué dimensiones evaluar, p. ej. `['gate','compliance']`. Si lo omites, evalúa `['gate','compliance']` por defecto. |
| `workspaceRef` | string | no | Referencia opaca al workspace; en local es una ruta. Por defecto, el directorio actual. |
| `corePath` | string | no | Ruta explícita al repositorio del Core (de donde salen las reglas). |
| `tenant` | object | no | Contexto de tenant opaco `{ tenantId }`, solo para trazabilidad. |
| `product` | object | no | Contexto de producto opaco `{ productId }`. |
| `initiative` | object | no | Contexto de iniciativa opaco `{ initiativeId }`. |
| `phaseId` | string | no | Fase SDLC canónica a evaluar: `discovery`, `design`, `construction`, `qa` o `release`. |
| `gateId` | string | no | Id de un gate concreto a evaluar. |
| `rulesetRef` | string | no | Referencia versionada al ruleset a aplicar. |
| `topologyRef` | string | no | Referencia o override de topología. |
| `executionMode` | string | no | Modo de ejecución: `manual`, `hybrid` o `agentic`. |
| `correlationId` | string | no | Id de correlación del consumidor; se devuelve tal cual en la respuesta. |

**Ejemplo**

```json
{
  "name": "evolith-evaluate",
  "arguments": {
    "kinds": ["gate", "compliance"],
    "workspaceRef": "/ruta/a/mi-satelite",
    "corePath": "/ruta/a/evolith-core",
    "phaseId": "construction"
  }
}
```

**Qué esperar.** Un `EvaluationResult` envuelto en el envelope de éxito (ADR-0073): `{ success, data, meta }`, donde `data` trae el veredicto por dimensión evaluada, la marca de tiempo (`evaluatedAt`), la versión de esquema y el `correlationId` (el tuyo si lo pasaste, o uno generado). Como es stateless, el resultado depende solo de lo que envías: mismo contexto, mismo resultado.

### 3.2. `evolith-gate-evaluate` — evaluar una sola compuerta de fase

**Qué hace.** Evalúa la compuerta (gate) de una fase SDLC concreta sobre tu repositorio y devuelve la evidencia: qué criterios se cumplen, qué violaciones hay y con qué severidad. Es la tool a la que acudes para responder "¿puedo cerrar la fase X?". Puedes pedir la evidencia completa o solo un resumen con los conteos.

**Argumentos**

| campo | tipo | req | para qué |
|-------|------|-----|----------|
| `phase` | string | sí | Fase cuya compuerta se evalúa: `discovery`, `design`, `construction`, `qa` o `release`. Si es inválida, la tool devuelve error `PHASE_INVALID`. |
| `projectPath` | string | sí | Ruta al repositorio a validar. |
| `rulesetRef` | string | no | Referencia opcional a un ruleset específico. |
| `evidenceMode` | string | no | `full` (por defecto) devuelve todas las violaciones; `summary` las oculta y devuelve solo el conteo de errores y advertencias. |
| `evaluatedBy` | string | no | Quién evalúa: `human`, `agent` (por defecto) o `ci`. Queda registrado en la evidencia. |
| `initiative` | string | no | Contexto de iniciativa opcional. |
| `tenant` | string | no | Contexto de tenant opcional. |

**Ejemplo**

```json
{
  "name": "evolith-gate-evaluate",
  "arguments": {
    "phase": "design",
    "projectPath": "/ruta/a/mi-satelite",
    "evidenceMode": "summary",
    "evaluatedBy": "agent"
  }
}
```

**Qué esperar.** El payload de `GateEvidence` (envuelto por el servidor en el envelope estándar). En modo `full` incluye la lista de `violations` con `ruleId`, `severity` y mensaje; en modo `summary`, `violations` viene vacío y aparece un objeto `summary: { errors, warnings }`. Si el ruleset no se encuentra, obtienes error `RULESET_NOT_FOUND`.

### 3.3. `evolith-validate` — validar el satélite contra las reglas

**Qué hace.** Corre las reglas de gobernanza del Core sobre tu satélite y te dice qué cumple y qué no. Tiene dos modos: el modo simple (validación directa contra los rulesets) y el modo pipeline end-to-end, que se activa en cuanto pasas `topology`, `phase` o `manifest` y evalúa topología + compuertas de fase de una vez, aplanando la evidencia por gate.

**Argumentos**

| campo | tipo | req | para qué |
|-------|------|-----|----------|
| `path` | string | sí | Ruta al repositorio satélite a validar. |
| `format` | string | no | Formato de salida: `json` (por defecto), `summary` o `table`. Elige `summary`/`table` para una lectura humana rápida. |
| `ruleset` | string | no | Id de un ruleset concreto a cargar en lugar de validar todo. |
| `corePath` | string | no | Ruta explícita al Core; si la omites, se autodetecta subiendo hasta encontrar `rulesets/`. |
| `topology` | string | no | Topología a evaluar (se autodetecta del manifest si se omite). **Activa el pipeline end-to-end.** |
| `phase` | string | no | Fase SDLC a evaluar (`discovery`…`release`). **Activa el pipeline end-to-end.** |
| `manifest` | string | no | `SatelliteManifest` como JSON en línea o ruta a un archivo; tiene prioridad sobre `path`/`topology`/`phase`. |

**Ejemplo**

```json
{
  "name": "evolith-validate",
  "arguments": {
    "path": "/ruta/a/mi-satelite",
    "corePath": "/ruta/a/evolith-core",
    "phase": "construction",
    "topology": "modular-monolith"
  }
}
```

**Qué esperar.** En modo simple, un `ValidationResult` con `status`, `rulesChecked` e `issues`. En modo pipeline (como el ejemplo), un objeto `type: 'pipeline'` con `passed`, la `topology` resuelta y un array `gates`, cada uno con sus `evaluations` (regla, artefacto, `passed`, mensaje, severidad y remediación). Si el manifest es inválido, la respuesta viene marcada como error con el detalle de por qué.

### 3.4. `evolith-composable-validate` — validación por modos combinables

**Qué hace.** Expone el motor de validación componible (GT-312): en lugar de una validación monolítica, activas los modos que necesites —SDLC, arquitectura, ruleset, ADR o ad-hoc de un solo archivo— y puedes combinarlos en una misma llamada. Cada argumento que pasas enciende su modo correspondiente. Es la tool más flexible cuando quieres apuntar a algo muy específico (por ejemplo, "solo valida ADR-0032 con el motor OPA").

**Argumentos**

| campo | tipo | req | para qué |
|-------|------|-----|----------|
| `path` | string | sí | Ruta al repositorio satélite. |
| `corePath` | string | no | Ruta opcional al Core. |
| `engine` | string | no | Motor de validación: `native` (por defecto) u `opa`. |
| `topology` | string | no | Enciende el modo arquitectura para esa topología (`modular-monolith`, `distributed-modules`, `microservices`, `serverless`, `edge-computing`, `event-driven`, `data-mesh`, `agentic-ai`). |
| `phase` | string | no | Enciende el modo SDLC para esa fase (`discovery`…`release`). |
| `ruleset` | string | no | Enciende el modo ruleset para un ruleset concreto (p. ej. `compliance-baseline`, `definition-of-done`). |
| `adr` | string | no | Enciende el modo ADR para una decisión concreta (`adr-0002`, `adr-0005`, `adr-0010`, `adr-0018`, `adr-0032`, `adr-0040`, `adr-0050`). |
| `file` | string | no | Enciende el modo ad-hoc para validar un único archivo. |

**Ejemplo**

```json
{
  "name": "evolith-composable-validate",
  "arguments": {
    "path": "/ruta/a/mi-satelite",
    "engine": "opa",
    "phase": "qa",
    "adr": "adr-0032"
  }
}
```

**Qué esperar.** Un objeto `type: 'composable'` con el resultado agregado de todos los modos que activaste, más una marca de tiempo. Si no enciendes ningún modo (solo `path`), el motor corre sin criterios y el resultado sale vacío; enciende al menos un modo para obtener evaluaciones útiles.

### 3.5. `evolith-architecture-validate` — validar arquitectura en el eje de madurez

**Qué hace.** Valida la arquitectura del repositorio a lo largo del eje progresivo de madurez: monolito modular → módulos distribuidos → microservicios. Comprueba de forma acumulativa la independencia modular, los límites de contrato y la preparación para extracción, según el nivel que pidas. Con `deep: true` añade análisis estático profundo del grafo de imports (violaciones de capa, acoplamiento entre contextos, métricas de inestabilidad).

**Argumentos**

| campo | tipo | req | para qué |
|-------|------|-----|----------|
| `path` | string | sí | Ruta al repositorio a analizar. |
| `level` | string | no | Topología objetivo del eje progresivo: `modular-monolith` (por defecto), `distributed-modules` o `microservices`. Cuanto más alto el nivel, más chequeos acumulados se aplican. |
| `deep` | boolean | no | `true` para habilitar el análisis estático profundo (grafo de imports, capas, acoplamiento). Por defecto `false`. |

**Ejemplo**

```json
{
  "name": "evolith-architecture-validate",
  "arguments": {
    "path": "/ruta/a/mi-satelite",
    "level": "microservices",
    "deep": true
  }
}
```

**Qué esperar.** Un objeto con `level`, `status` (`passed`/`failed` según haya issues bloqueantes), `issuesChecked`, `blockingIssues` y el array `issues` (cada uno con `ruleId`, `level`, `title`, `severity` y `blocking`). Con `deep: true` verás además issues de tipo `ARCH-COUPLING` con las métricas de acoplamiento. Los chequeos OPA compartidos se añaden en modo best-effort: si fallan, la validación nativa sigue aplicando.

### 3.6. `evolith-drift-detect` — detectar deriva arquitectónica

**Qué hace.** Compara el estado actual del repositorio contra lo que las reglas del Core esperan y reporta la deriva arquitectónica: aquello que se ha ido separando de la arquitectura declarada. Es una tool de diagnóstico rápido, sin más configuración que las dos rutas.

**Argumentos**

| campo | tipo | req | para qué |
|-------|------|-----|----------|
| `path` | string | sí | Ruta al repositorio a analizar. |
| `corePath` | string | no | Ruta explícita al Core; si la omites, se asume una carpeta hermana `../evolith`. |

**Ejemplo**

```json
{
  "name": "evolith-drift-detect",
  "arguments": {
    "path": "/ruta/a/mi-satelite",
    "corePath": "/ruta/a/evolith-core"
  }
}
```

**Qué esperar.** Un objeto con `repository`, la marca de tiempo y `result`, que contiene el informe de deriva calculado por el servicio de drift. Si la detección falla (por ejemplo, no encuentra el Core), la respuesta viene marcada como error con el mensaje del fallo en lugar de lanzar una excepción.

### 3.7. `evolith-phase-artifacts-evaluate` — completitud de artefactos de fase (advisory)

**Qué hace.** Mide, de forma asesora y no vinculante (ADR-0104), qué tan completos están los artefactos de una fase downstream para una composición de topologías ya confirmada. Compara los artefactos que declaras como presentes contra la UNIÓN de los artefactos universales de esa fase y los perfiles de fase (`phaseProfiles`) de cada topología. Es stateless: te dice qué falta, pero no bloquea nada. Produce el mismo resultado que `POST /api/v1/architecture/evaluate-phase-artifacts` y `evolith-cli topology phase-artifacts`.

**Argumentos**

| campo | tipo | req | para qué |
|-------|------|-----|----------|
| `phase` | string | sí | Fase downstream a medir: `construction`, `quality` o `deployment`. |
| `topologies` | string[] | sí | Ids de las topologías confirmadas cuya composición determina los artefactos requeridos. |
| `declaredArtifacts` | string[] | no | Tipos de artefacto que el consumidor declara ya presentes; contra esto se calcula lo que falta. |
| `corePath` | string | no | Ruta explícita al Core; si la omites, se asume `../evolith`. |

**Ejemplo**

```json
{
  "name": "evolith-phase-artifacts-evaluate",
  "arguments": {
    "phase": "deployment",
    "topologies": ["microservices", "event-driven"],
    "declaredArtifacts": ["dockerfile", "helm-chart"],
    "corePath": "/ruta/a/evolith-core"
  }
}
```

**Qué esperar.** El resultado en el envelope de éxito (ADR-0073), con los artefactos `required`, `present` y `missing` para esa fase y composición, más una métrica de `completeness`. Al ser advisory, sirve para orientar el trabajo pendiente, no para aprobar o rechazar una transición. Si `phase` no es una de las tres válidas, obtienes una respuesta de error con la lista de valores permitidos.

## 4. Topología, SDLC y andamiaje

Este grupo cubre tres cosas relacionadas: consultar y recomendar la **topología**
arquitectónica (cómo se agrupa tu sistema), ver y avanzar por las **fases del
ciclo de vida** (SDLC), y **generar código y documentación** de arranque para un
satélite nuevo.

Antes de entrar en cada herramienta, conviene tener claro que aquí conviven
**tres vocabularios de fase distintos**, y no son intercambiables:

- **Eje progresivo de topología** (`modular-monolith`, `distributed-modules`,
  `microservices`, o sus alias `1`/`2`/`3`): describe cuánto se distribuye la
  arquitectura. Lo usa `evolith-scaffold`.
- **Fases de andamiaje** (`phase-0` … `phase-5`): hitos con artefactos requeridos
  que Evolith comprueba en el repo. Los usan `evolith-sdlc-status` y
  `evolith-sdlc-handoff`.
- **Fases del gate SDLC** (`discovery`, `design`, `construction`, `qa`,
  `release`): las etapas de gobernanza cuyas compuertas se evalúan. Las usa
  `evolith-phase-advance`.

Las herramientas que **escriben** en disco (`evolith-sdlc-handoff`,
`evolith-sdlc-generate`, `evolith-scaffold`, `evolith-docs-scaffold`) son
**mutativas** y pasan por la compuerta transversal `{ apply:true, approvalToken }`
descrita en la cabecera de esta guía. Las de consulta y recomendación son de solo
lectura.

### 4.1. `evolith-topology-list` — listar las topologías disponibles

**Qué hace.** Devuelve el catálogo completo de topologías arquitectónicas que el
Core conoce. Es el punto de partida para ver qué opciones existen antes de pedir
el detalle de una o una recomendación. Es de solo lectura.

**Argumentos**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `corePath` | string | no | Ruta explícita al checkout del Core de donde salen las topologías. Si lo omites, se resuelve una ruta hermana por defecto (`../evolith`). |

**Ejemplo**

```json
{ "name": "evolith-topology-list", "arguments": {} }
```

**Qué esperar.** Un objeto con `count` (cuántas topologías hay) y `topologies`
(el array con cada definición del catálogo), más un `timestamp`. Si no encuentra
el catálogo en `corePath`, devuelve `{ error: true, message: "Failed to list
topologies: …" }`.

### 4.2. `evolith-topology-get` — obtener una topología por su id

**Qué hace.** Recupera la definición completa de una sola topología a partir de su
identificador (por ejemplo `modular-monolith`). Úsala cuando ya sabes cuál te
interesa y quieres ver su especificación en detalle (incluidos sus perfiles de
artefactos por fase). Es de solo lectura.

**Argumentos**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `id` | string | sí | El id de la topología a recuperar; es lo único obligatorio. |
| `corePath` | string | no | Ruta explícita al checkout del Core. Si lo omites, se usa la ruta hermana por defecto. |

**Ejemplo**

```json
{ "name": "evolith-topology-get", "arguments": { "id": "modular-monolith" } }
```

**Qué esperar.** Un objeto con el `id` consultado y `topology` (la definición
completa), más `timestamp`. Si el id no existe, devuelve `{ error: true, message:
"Topology not found: <id>" }`.

### 4.3. `evolith-topology-recommend` — recomendar una composición de topología

**Qué hace.** A partir de un conjunto de **señales técnicas** de tu proyecto,
recomienda una composición de topología y explica el porqué. Es **advisory** y
sin estado (ADR-0104): el Core *recomienda* en Discovery, pero es el tenant quien
*confirma* en Design; nada queda vinculado. Produce el mismo resultado que
`POST /api/v1/architecture/recommend-topology` y que `evolith-cli topology recommend`.

**Argumentos**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `signals` | object | no | Mapa de señales técnicas (booleanos o números) que describen tu contexto: `teamCount`, `deploymentIndependence`, `highScale`, `asyncIntegration`, `dataProductSharing`, `spikyLoad`, `latencyTolerant`, `edgeOrOffline`, `aiAgents`. Cuantas más señales des, más informada la recomendación. Si va vacío, cae por defecto en `modular-monolith`. |
| `corePath` | string | no | Ruta explícita al checkout del Core; se usa para localizar el fichero de reglas de recomendación. |

**Ejemplo**

```json
{
  "name": "evolith-topology-recommend",
  "arguments": {
    "signals": { "teamCount": 6, "deploymentIndependence": true, "highScale": true }
  }
}
```

**Qué esperar.** El resultado (composición recomendada + justificación) envuelto
en el envelope de éxito ADR-0073 `{ success, data, meta }`. Si no logra leer las
reglas, devuelve `{ error: true, message: "Failed to recommend topology: …" }`.

### 4.4. `evolith-sdlc-status` — ver el estado de las fases del satélite

**Qué hace.** Lee el `evolith.yaml` del repo para saber en qué fase (`phase-0` …
`phase-5`) está y, para cada fase, comprueba qué artefactos requeridos ya existen
en disco y cuáles faltan. Es la foto de avance del satélite y la base sobre la que
opera el handoff. Es de solo lectura.

**Argumentos**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | sí | Ruta al repositorio del satélite cuyo estado quieres inspeccionar. |

**Ejemplo**

```json
{ "name": "evolith-sdlc-status", "arguments": { "path": "/ruta/a/mi-satelite" } }
```

**Qué esperar.** Un objeto con `currentPhase`, `nextPhase`, y `phaseStatus`: un
array por fase con su `status` (`complete` / `next` / `pending`) y la lista de
`requirements` marcando `exists: true|false` para cada artefacto. Si falta `path`,
devuelve `{ error: true, message: "path is required" }`.

### 4.5. `evolith-sdlc-handoff` — realizar el traspaso a la fase siguiente

**Qué hace.** Ejecuta el traspaso ("handoff") de una fase de andamiaje a la
**inmediatamente siguiente** (por ejemplo `phase-0` → `phase-1`). Antes de
escribir, exige que la fase de origen esté `complete` (todos sus artefactos
presentes) y que el destino sea consecutivo; si no, falla. Cuando procede, escribe
un manifiesto de traspaso en `.evolith/handoff-manifest.json`. **Es mutativa**
(pasa por la compuerta `{ apply:true, approvalToken }`).

**Argumentos**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | sí | Ruta al repositorio del satélite sobre el que se hace el traspaso. |
| `fromPhase` | string | sí | Fase de origen (`phase-0` … `phase-5`); debe estar completa. |
| `toPhase` | string | sí | Fase de destino; debe ser la consecutiva a `fromPhase`. |
| `confirm` | boolean | no | Bandera de confirmación de la operación mutativa. |

**Ejemplo**

```json
{
  "name": "evolith-sdlc-handoff",
  "arguments": { "path": "/ruta/a/mi-satelite", "fromPhase": "phase-0", "toPhase": "phase-1" }
}
```

**Qué esperar.** El manifiesto de traspaso: `handoff` (from/to, timestamp, repo),
la lista de `artifacts` con su presencia, un bloque `validation`
(`allArtifactsPresent`) y `recommendations` para la fase que dejas atrás. Si la
fase de origen no está completa o el destino no es consecutivo, la operación
lanza un error.

### 4.6. `evolith-sdlc-generate` — generar el andamiaje hexagonal desde un modelo DDD

**Qué hace.** Genera un esqueleto de Arquitectura Hexagonal a partir de un
`classDiagram` de Mermaid embebido en un modelo DDD en Markdown. Reutiliza los
mismos generadores del core-domain que usa la CLI (`sdlc generate`), así que es un
adaptador de transporte fino, sin lógica propia. **Es mutativa**: escribe ficheros
salvo que uses `dryRun`.

**Argumentos**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `model` | string | no* | El modelo DDD en Markdown **inline** (debe contener un bloque ```` ```mermaid ```` con `classDiagram`). Alternativa a `from`. |
| `from` | string | no* | Ruta a un fichero Markdown con el modelo DDD. Se resuelve contra `output` (o el cwd). Alternativa a `model`. |
| `output` | string | no | Directorio destino de los ficheros generados (por defecto, el directorio de trabajo). |
| `dryRun` | boolean | no | Si es `true`, informa qué ficheros se crearían sin escribir nada. Por defecto `false`. |

\* No hay campos `required` en el esquema, pero **debes aportar `model` o `from`**;
si faltan ambos, la herramienta lanza un error.

**Ejemplo**

```json
{
  "name": "evolith-sdlc-generate",
  "arguments": { "from": "docs/model.md", "output": "src", "dryRun": true }
}
```

**Qué esperar.** Un objeto con `targetDir`, `dryRun`, un resumen del `diagram`
(número de clases y relaciones, y la lista de clases con su estereotipo), y los
arrays `created` y `skipped`. Si el Markdown no contiene un `classDiagram` válido,
lanza un error explicando que falta el bloque Mermaid.

### 4.7. `evolith-scaffold` — andamiar un satélite a lo largo del eje progresivo

**Qué hace.** Crea un workspace Nx completo para un satélite nuevo, situándolo en
el eje de madurez progresiva: **fase 1** (`modular-monolith`) genera una SPA
estándar; **fases 2–3** (`distributed-modules` / `microservices`) generan un host
de Module Federation con sus remotes. En todos los casos añade la Service API de
NestJS, los shells transversales y las librerías de bounded-context DDD. Conduce
la misma estrategia que la CLI (`evolith-cli scaffold`). **Es mutativa**: escribe el
workspace bajo `<path>/src`.

**Argumentos**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `frontend` | string | sí | Framework de frontend (`react`, `angular`, `vue`). |
| `orm` | string | sí | ORM de la capa de persistencia (`prisma`, `typeorm`). |
| `phase` | string | sí | `1|2|3` o el id del eje progresivo (`modular-monolith`, `distributed-modules`, `microservices`); decide SPA vs. host+remotes. |
| `path` | string | no | Raíz del satélite bajo la que se genera `<path>/src` (por defecto, el cwd del servidor). |
| `apiName` | string | no | Nombre de la Service API de NestJS. Por defecto `tracker-api`. |
| `webAppName` | string | no | Nombre de la SPA de fase 1. Por defecto `tracker-web`. |
| `hostName` | string | no | Nombre de la app host (MF) en fases 2/3. Por defecto `tracker-host`. |
| `remotes` | array\|string | no | Nombres de los remotes en fases 2/3 (array o cadena separada por comas). |
| `domains` | array\|string | no | Bounded contexts SDLC a materializar como librerías de dominio (array o cadena separada por comas). |
| `dryRun` | boolean | no | Informa los comandos nx/npm planificados sin escribir ni ejecutar nada. Por defecto `false`. |

**Ejemplo**

```json
{
  "name": "evolith-scaffold",
  "arguments": {
    "frontend": "react",
    "orm": "prisma",
    "phase": "modular-monolith",
    "domains": "billing,catalog",
    "dryRun": true
  }
}
```

**Qué esperar.** Un objeto con `status` (`scaffolded` o `dry-run`), el
`frontendFramework`, el `orm`, la `phase` normalizada (`1`/`2`/`3`), el `apiName`,
los `domains` y el `baseDir`. El progreso se emite por stderr. Si `phase` no es
reconocible, lanza un error listando los valores válidos.

### 4.8. `evolith-docs-scaffold` — andamiar la documentación base

**Qué hace.** Crea el conjunto de documentación base que Evolith espera en un
satélite (`README.md`, `AGENTS.md`, `MASTER_INDEX.md` y `evolith.yaml`) en un
directorio destino. Es la contraparte MCP del comando CLI `docs`. **Es mutativa**:
escribe ficheros salvo que uses `dryRun`.

**Argumentos**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | no | Directorio destino donde se andamia la documentación (por defecto, el cwd del servidor). |
| `template` | string | no | Conjunto de plantillas: `default` (todos los ficheros) o `minimal` (solo `README.md` + `AGENTS.md`). Por defecto `default`. |
| `force` | boolean | no | Si es `true`, sobrescribe (actualiza) los ficheros que ya existan en lugar de saltarlos. Por defecto `false`. |
| `dryRun` | boolean | no | Calcula el plan de crear/actualizar/saltar sin escribir nada. Por defecto `false`. |

**Ejemplo**

```json
{
  "name": "evolith-docs-scaffold",
  "arguments": { "path": "/ruta/a/mi-satelite", "template": "minimal", "dryRun": true }
}
```

**Qué esperar.** En modo normal, un objeto con `targetDir`, `created`, `updated`,
`skipped` y las listas `files` / `skippedFiles`. En `dryRun`, el plan con
`toCreate`, `toUpdate`, `skipped` y el detalle de cada fichero previsto. Sin
`force`, los ficheros ya existentes se cuentan como saltados.

### 4.9. `evolith-phase-advance` — proponer una transición de fase del gate SDLC

**Qué hace.** Propone avanzar de una fase de gobernanza (`discovery`, `design`,
`construction`, `qa`, `release`) a otra, **evaluando las compuertas de salida** de
la fase actual. Es una **propuesta advisory**: no muta el repo, solo devuelve si
el gate pasa y por qué. Úsala para saber si un satélite está listo para pasar de
etapa antes de decidir el traspaso.

**Argumentos**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `fromPhase` | string | sí | Fase actual del gate (`discovery`, `design`, `construction`, `qa`, `release`). |
| `toPhase` | string | sí | Fase destino a la que se quiere avanzar. |
| `projectPath` | string | sí | Ruta al repositorio sobre el que se evalúan las compuertas. |
| `evaluatedBy` | string | no | Quién evalúa: `human`, `agent` o `ci`. Por defecto `agent`. Queda registrado en la propuesta. |
| `initiative` | string | no | Contexto opcional de iniciativa para la evaluación. |
| `tenant` | string | no | Contexto opcional de tenant para la evaluación. |

**Ejemplo**

```json
{
  "name": "evolith-phase-advance",
  "arguments": {
    "fromPhase": "design",
    "toPhase": "construction",
    "projectPath": "/ruta/a/mi-satelite",
    "evaluatedBy": "agent"
  }
}
```

**Qué esperar.** El payload de la propuesta (veredicto del gate y evaluación de
criterios) envuelto en el envelope ADR-0073. Si `fromPhase` o `toPhase` no son
fases válidas del gate, devuelve un error `PHASE_INVALID`; si no encuentra las
reglas o el proyecto, un error `RULESET_NOT_FOUND`.

## 5. Satélite, agentes y mantenimiento

Este grupo cubre el *ciclo de vida del propio satélite*: crearlo o adoptarlo en GitHub y consultarlo en el registro local, poblarlo de agentes de gobernanza, inicializar su andamiaje en modo batch, mantenerlo al día cuando el Core publica reglas nuevas, y dos utilidades de apoyo (sembrar fixtures y aplicar arreglos automáticos). La mayoría **escribe en disco o en repositorios remotos**: esas tools están marcadas como **mutativas** y, como se explica en la cabecera de esta guía, la llamada debe pasar el gate `{ apply: true, approvalToken }`; las de solo lectura (`*-list`, `*-status`, `*-validate`, `upgrade-plan`) no lo necesitan.

### 5.1. `evolith-satellite-create` — crear el repo en GitHub y registrarlo · **mutativa**

**Qué hace.** Crea un **repositorio nuevo en GitHub** (vía la API REST v3) y lo registra como satélite de Evolith en el `satellite-registry.json` local, en un solo paso. Es la contraparte MCP del comando `satellite:create` de la CLI: toca GitHub, así que necesita un token con scope `repo`. El registro nace con `status: "provisioning"` y `mode: "create"`.

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `token` | string | sí | Token personal de GitHub (scope `repo`) con el que se crea el repositorio. |
| `name` | string | sí | Nombre del repositorio a crear. |
| `owner` | string | sí | Usuario u organización de GitHub que será dueño del repo. |
| `topology` | string | no | Topología a asignar: `monolith` \| `modular` \| `micro` \| `distributed` \| `custom` (default `modular`). |
| `phase` | string | no | Fase SDLC inicial: `discovery` \| `design` \| `construction` \| `qa` \| `release` (default `discovery`). |
| `description` | string | no | Descripción opcional del repositorio. |
| `private` | boolean | no | Crea el repo como privado (default `false`, es decir público). |
| `path` | string | no | Directorio donde vive el `satellite-registry.json` (default: cwd del servidor). |

**Ejemplo:**

```json
{
  "name": "evolith-satellite-create",
  "arguments": {
    "token": "ghp_xxx",
    "name": "checkout-svc",
    "owner": "acme",
    "topology": "micro",
    "phase": "discovery",
    "private": true
  }
}
```

**Qué esperar.** El envelope de éxito trae en `data.satellite` el registro creado: `id` (UUID), `name`, `owner`, `repoUrl`, `cloneUrl`, `sshUrl`, `topology`, `phase`, `status: "provisioning"`, `mode: "create"` y timestamps. Si el `owner` es una cuenta personal, el tool reintenta contra `/user/repos` de forma transparente. Un error de GitHub (token inválido, nombre repetido) se propaga como envelope de error.

### 5.2. `evolith-satellite-adopt` — adoptar un repositorio existente · **mutativa**

**Qué hace.** Toma un **repositorio de GitHub que ya existe**, verifica que esté accesible y lo pone bajo gobernanza de Evolith **sin crear nada nuevo**: lo registra en el `satellite-registry.json` con `status: "linked"` y `mode: "adopt"`. Es la contraparte de `satellite-create` cuando el repo ya está en marcha.

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `repoUrl` | string | sí | URL completa del repositorio a adoptar (`https://github.com/owner/repo`). El owner y el nombre se extraen de aquí. |
| `token` | string | sí | Token personal de GitHub (scope `repo`) para verificar el repositorio. |
| `topology` | string | no | Topología a asignar: `monolith` \| `modular` \| `micro` \| `distributed` \| `custom` (default `modular`). |
| `phase` | string | no | Fase SDLC a asignar: `discovery` \| `design` \| `construction` \| `qa` \| `release` (default `discovery`). |
| `owner` | string | no | Fuerza el owner; por defecto se toma el que aparece en `repoUrl`. |
| `path` | string | no | Directorio donde vive el `satellite-registry.json` (default: cwd del servidor). |

**Ejemplo:**

```json
{
  "name": "evolith-satellite-adopt",
  "arguments": {
    "repoUrl": "https://github.com/acme/legacy-api",
    "token": "ghp_xxx",
    "topology": "modular",
    "phase": "design"
  }
}
```

**Qué esperar.** El envelope de éxito con `data.satellite` (mismo shape que `create`, pero con `status: "linked"`, `mode: "adopt"` y un campo `linkedAt`). Si la URL no se puede parsear, o el repositorio no existe / no es accesible con ese token, el tool lanza un error que el dispatch convierte en envelope de error.

### 5.3. `evolith-satellite-list` — listar los satélites registrados

**Qué hace.** Lee el `satellite-registry.json` local y devuelve todos los satélites registrados (los que crearon o adoptaron las dos tools anteriores). Es de solo lectura; si no hay archivo de registro, devuelve una lista vacía en vez de fallar.

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `format` | string | no | Formato de salida: `json` (default) o `table` (una tabla Markdown legible). |
| `path` | string | no | Directorio que contiene el `satellite-registry.json` (default: cwd). |

**Ejemplo:**

```json
{
  "name": "evolith-satellite-list",
  "arguments": { "format": "json" }
}
```

**Qué esperar.** En `json`, el envelope con `data.count` y `data.satellites` (el array de registros). En `format: "table"`, `data` es una cadena con una tabla `| ID | Name | Owner | Topology | Phase | Status | Mode |` (el ID recortado a 8 caracteres), o el texto `No satellites registered.` si el registro está vacío.

### 5.4. `evolith-satellite-status` — estado de un satélite por ID

**Qué hace.** Busca un satélite concreto en el `satellite-registry.json` por su ID y devuelve su ficha completa. Acepta el UUID completo o solo un **prefijo** (coincidencia por inicio de cadena), para no tener que copiar el UUID entero.

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `id` | string | sí | ID del satélite, completo o un prefijo del UUID. |
| `path` | string | no | Directorio que contiene el `satellite-registry.json` (default: cwd). |

**Ejemplo:**

```json
{
  "name": "evolith-satellite-status",
  "arguments": { "id": "3f9a" }
}
```

**Qué esperar.** Si hay coincidencia, el envelope trae `data.found: true` y `data.satellite` con el registro completo. Si no, `data.found: false` con el `id` buscado y un mensaje de "not found" (no es un error de ejecución: el envelope sigue siendo de éxito, solo con `found: false`).

### 5.5. `evolith-agent-list` — listar los agentes instalados

**Qué hace.** Recorre `rulesets/agents/` bajo el directorio indicado y lista los agentes de gobernanza instalados, leyendo su `agent.rules.json` para reportar versión, plantilla y fecha de instalación. De solo lectura.

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `dir` | string | no | Directorio raíz donde buscar `rulesets/agents/` (default: cwd). |

**Ejemplo:**

```json
{
  "name": "evolith-agent-list",
  "arguments": { "dir": "." }
}
```

**Qué esperar.** El envelope con `data.agents` (cada uno con `name`, `version`, `template`, `installedAt`, `rulesetPath`) y `data.count`. Si no existe la carpeta `rulesets/agents/`, devuelve `agents: []` con un mensaje `No agents directory found`.

### 5.6. `evolith-agent-validate` — validar el ruleset de un agente

**Qué hace.** Valida el `agent.rules.json` de un agente instalado contra el esquema mínimo: exige que tenga `agent.name`, `ruleset.version` y al menos un principio (`principles`). Reporta cada problema encontrado. De solo lectura.

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `name` | string | sí | Nombre del agente a validar (su carpeta bajo `rulesets/agents/`). |
| `dir` | string | no | Directorio raíz donde vive el agente (default: cwd). |

**Ejemplo:**

```json
{
  "name": "evolith-agent-validate",
  "arguments": { "name": "arquitecto-guard" }
}
```

**Qué esperar.** El envelope con `data.valid` (`true`/`false`), `data.agent`, la lista `data.issues` (cada uno con `field` y `message`) y un `timestamp`. Si el agente no existe, `data.valid: false` con un `error` explicando que no se encontró.

### 5.7. `evolith-agent-install` — instalar un agente de gobernanza · **mutativa**

**Qué hace.** Instala un agente nuevo: crea `rulesets/agents/<name>/agent.rules.json` a partir de una plantilla con sus principios ya poblados. Cada plantilla trae un conjunto distinto de principios: `minimal` (uno, no bloqueante), `standard` (dos: gobernanza estándar + soporte bilingüe) y `enterprise` (tres: gobernanza completa, audit trail y cadena de aprobación).

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `name` | string | sí | Nombre del agente a instalar (será el nombre de su carpeta y de su ruleset). |
| `template` | string | no | Plantilla de principios: `standard` (default) \| `minimal` \| `enterprise`. |
| `dir` | string | no | Directorio raíz donde instalar (default: cwd). |
| `confirm` | boolean | no | Bandera de confirmación de operación mutativa (además del gate `apply`/`approvalToken` de la cabecera). |

**Ejemplo:**

```json
{
  "name": "evolith-agent-install",
  "arguments": { "name": "arquitecto-guard", "template": "enterprise" }
}
```

**Qué esperar.** El envelope con `data.success: true`, `data.agent`, `data.template`, `data.rulesetPath` (la ruta escrita) y un `message` de confirmación.

### 5.8. `evolith-agent-upgrade` — subir la versión de un agente · **mutativa**

**Qué hace.** Sube la versión **patch** del agente (por ejemplo `1.0.0 → 1.0.1`) y reescribe su `agent.rules.json` con la nueva versión. Útil tras editar sus principios o para dejar constancia de un cambio.

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `name` | string | sí | Nombre del agente a actualizar. |
| `dir` | string | no | Directorio raíz donde vive el agente (default: cwd). |
| `confirm` | boolean | no | Bandera de confirmación de operación mutativa (junto al gate `apply`/`approvalToken`). |

**Ejemplo:**

```json
{
  "name": "evolith-agent-upgrade",
  "arguments": { "name": "arquitecto-guard" }
}
```

**Qué esperar.** El envelope con `data.success: true`, `data.agent`, `data.fromVersion` y `data.toVersion`. Si el agente no existe, la operación **lanza un error** (envelope de error), a diferencia de `validate`, que lo reporta como dato.

### 5.9. `evolith-agent-remove` — eliminar un agente · **mutativa**

**Qué hace.** Borra por completo la carpeta `rulesets/agents/<name>/` del agente. Es **irreversible**: elimina su ruleset del disco.

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `name` | string | sí | Nombre del agente a eliminar. |
| `dir` | string | no | Directorio raíz donde vive el agente (default: cwd). |
| `confirm` | boolean | no | Bandera de confirmación de operación mutativa (junto al gate `apply`/`approvalToken`). |

**Ejemplo:**

```json
{
  "name": "evolith-agent-remove",
  "arguments": { "name": "arquitecto-guard" }
}
```

**Qué esperar.** El envelope con `data.success: true`, `data.agent` y un `message` de confirmación. Si el agente no existe, la operación lanza un error.

### 5.10. `evolith-agent-run` — ejecutar un intent contra el Agent Runtime · **mutativa**

**Qué hace.** Envía un *intent* (un objetivo en lenguaje natural) al **Agent Runtime** y devuelve el resultado del pipeline agéntico. No escribe en el satélite directamente, pero delega en un runtime que sí puede ejecutar acciones, por eso está marcada mutativa. Adjunta automáticamente `cwd` del servidor como parámetro.

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `intent` | string | sí | El objetivo o intención que el agente debe resolver. |
| `url` | string | no | URL del Agent Runtime (default `http://localhost:3000`). |

**Ejemplo:**

```json
{
  "name": "evolith-agent-run",
  "arguments": {
    "intent": "Genera el plan de arquitectura del nuevo microservicio de pagos"
  }
}
```

**Qué esperar.** Si el runtime responde, el envelope con `data.success: true` y `data.result` (la respuesta del pipeline). Si la llamada al runtime falla (por ejemplo, no está levantado en esa URL), `data.success: false` con `data.error` describiendo el fallo.

### 5.11. `evolith-init-batch` — inicializar un satélite en modo batch · **mutativa**

**Qué hace.** Inicialización **no interactiva** (batch/CI) de un satélite: genera `evolith.yaml`, la estructura de carpetas y los artefactos base bajo `<path>/<name>/`, según el runtime, monorepo, arquitectura y base de datos elegidos. Es la paridad MCP del `evolith-cli init --config … / --name … --yes` de la CLI, **sin prompts**: cada campo viene de los argumentos o de un valor por defecto. Delega el andamiaje en el mismo caso de uso del core (`InitializeProjectUseCase`) que corre la CLI.

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `name` | string | sí | Nombre del proyecto/satélite (por este campo o dentro de `config`). |
| `path` | string | no | Directorio bajo el cual se crea la carpeta `<name>/` (default: cwd del servidor). |
| `runtime` | string | no | Runtime: `nodejs` (default) \| `typescript` \| `dotnet` \| `python`. |
| `monorepo` | string | no | Estrategia de monorepo: `none` (default) \| `nx` \| `npm-workspaces` \| `pnpm-workspaces` \| `rush`. |
| `architecture` / `arch` | string | no | Patrón de arquitectura: `clean` (default) \| `hexagonal` \| `ddd` \| `clean-hex` \| `hex-ddd` \| `event-driven`. `arch` es alias (espeja el flag `--arch` de la CLI). |
| `database` / `db` | string | no | Base de datos: `postgresql` (default) \| `mongodb` \| `sqlserver`… `db` es alias (`--db`). |
| `apiProtocol` | string | no | Protocolo de API: `rest` (default) \| `graphql` \| `grpc` \| `websocket` \| `webhook`. |
| `ciCd` | string | no | Proveedor de CI/CD (default `github-actions`). |
| `observability` | string | no | Stack de observabilidad (default `opentelemetry`). |
| `features` | string[] | no | Feature flags a andamiar (p.ej. `adr`, `hooks`, `acl`). |
| `agents` | string[] | no | Ids de agentes a registrar de arranque. |
| `config` | object | no | `evolith.setup.json` inline (`Partial<InitProjectInput>`) usado como base; los campos individuales de arriba lo **sobrescriben**. |

**Ejemplo:**

```json
{
  "name": "evolith-init-batch",
  "arguments": {
    "name": "pagos-api",
    "runtime": "nodejs",
    "architecture": "hexagonal",
    "db": "postgresql"
  }
}
```

**Qué esperar.** El envelope con `data.input` (la entrada resuelta con todos los defaults aplicados) y `data.result` (el resultado del caso de uso: artefactos creados, warnings y errores). Si no se puede resolver un `name` (ni por campo ni por `config`), el tool lanza un error, igual que la guarda de la CLI.

### 5.12. `evolith-upgrade-plan` — planificar un upgrade del satélite (read-only)

**Qué hace.** Cuando el Core (upstream) publica reglas nuevas, calcula **qué cambios** necesita tu satélite para ponerse al día: el plan de cambios, cuáles rompen compatibilidad y el riesgo estimado. **No escribe nada** — es la mitad de solo lectura del `upgrade` de la CLI (la CLI combina plan y apply en un comando; MCP los separa en dos tools porque una misma tool no puede ser a la vez `read` y `mutative`).

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `satellitePath` | string | no | Ruta del proyecto satélite (default: cwd del servidor). |
| `corePath` | string | no | Ruta al checkout de Evolith Core del que salen las reglas (default: el `satellitePath`). |

**Ejemplo:**

```json
{
  "name": "evolith-upgrade-plan",
  "arguments": { "satellitePath": ".", "corePath": "../evolith" }
}
```

**Qué esperar.** Si el satélite ya está al día, el envelope con `data.upToDate: true` y el mensaje "already up to date". Si hay cambios, `data.upToDate: false`, `data.dryRun: true`, `data.plan` (el plan completo), `data.breakingChanges` (cuántos rompen compatibilidad) y un mensaje con el conteo de cambios planificados sin aplicar.

### 5.13. `evolith-upgrade-apply` — aplicar el upgrade del satélite · **mutativa**

**Qué hace.** Aplica el plan del upgrade: **escribe los archivos** en el satélite para ponerlo al día con el Core upstream. Es la mitad mutativa del par: por defecto crea un backup antes de tocar nada y, si detecta breaking changes, se detiene salvo que le pases `force: true`.

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `satellitePath` | string | no | Ruta del proyecto satélite (default: cwd del servidor). |
| `corePath` | string | no | Ruta al checkout de Evolith Core (default: el `satellitePath`). |
| `force` | boolean | no | Aplica el upgrade **aunque haya breaking changes** (default `false`; sin esto se detiene ante cambios que rompen). |
| `skipBackup` | boolean | no | Omite crear el backup previo a aplicar (default `false`). |

**Ejemplo:**

```json
{
  "name": "evolith-upgrade-apply",
  "arguments": { "satellitePath": ".", "corePath": "../evolith", "force": false }
}
```

**Qué esperar.** El envelope con `data.result` (el resultado del upgrade: cambios aplicados, backup, etc.) y `data.report` (el reporte legible del upgrade). Recuerda correr primero `evolith-upgrade-plan` para revisar el plan antes de aplicar.

### 5.14. `evolith-fixtures` — sembrar datos de ejemplo · **mutativa**

**Qué hace.** Genera fixtures reproducibles (datos de ejemplo) para demos y pruebas: un `evolith.yaml`, ADRs de muestra, rulesets, o el conjunto completo, según el `type`. Usa las mismas plantillas deterministas que el comando `evolith-cli fixtures` de la CLI. Trae un `dryRun` para revisar qué escribiría antes de tocar el disco.

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `type` | string | no | Qué sembrar: `demo` (default: `evolith.yaml` + ADRs) \| `adr` \| `ruleset` \| `evolith` \| `full` (todo). |
| `dir` | string | no | Directorio destino de los fixtures (default: cwd). |
| `dryRun` | boolean | no | Previsualiza los archivos que se escribirían sin tocar el filesystem (default `false`). |

**Ejemplo:**

```json
{
  "name": "evolith-fixtures",
  "arguments": { "type": "full", "dryRun": true }
}
```

**Qué esperar.** El envelope con `data.type`, `data.targetDir`, `data.dryRun` y `data.created` (la lista de rutas relativas escritas, o que se escribirían en dry-run). Un `type` fuera del enum, o un fallo de escritura, se propaga como envelope de error.

### 5.15. `evolith-auto-fix` — arreglar violaciones de arquitectura · **mutativa**

**Qué hace.** Aplica **arreglos automáticos** a las violaciones que reportan los evaluadores de reglas del Core. A partir de un `rulesetId` y la lista de violaciones, elige una estrategia de arreglo por regla (quitar imports de framework del dominio, forzar fronteras hexagonales, generar un stub de interfaz de dominio, quitar side-effects, sustituir instanciación estática por inyección) y reescribe los archivos afectados. Trae `dryRun` para previsualizar.

**Argumentos:**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `rulesetId` | string | sí | Ruleset a arreglar; selecciona la estrategia (p.ej. `domain-purity`, `hexagonal-boundaries`, `service-purity`, `dependency-injection`, `missing-domain-interface`). |
| `violations` | object[] | no | Array de violaciones tal como las emite el validador (cada una con `ruleId`, `filePath`, `message`, `suggestedFix`). Sin ellas no hay nada que arreglar. |
| `dryRun` | boolean | no | Previsualiza los cambios sin aplicarlos (default `false`). |
| `dir` | string | no | Directorio destino sobre el que resolver rutas relativas (default: cwd). |

**Ejemplo:**

```json
{
  "name": "evolith-auto-fix",
  "arguments": {
    "rulesetId": "domain-purity",
    "violations": [
      { "ruleId": "domain-purity", "filePath": "src/domain/order.ts", "message": "Framework import in domain layer" }
    ]
  }
}
```

**Qué esperar.** El envelope con `data.rulesetId`, `data.totalViolations`, `data.fixesApplied` (cuántas se aplicaron), `data.fixesPreview` (solo en `dryRun`, el detalle por archivo) y `data.summary` (un resumen con aplicadas / preview / fallidas / requieren revisión manual). Las violaciones cuyo `ruleId` no case con ninguna estrategia se marcan como `manual-review-required` en vez de fallar.

## 6. ADRs, MoSCoW, config y métricas

Este grupo reúne cuatro familias de tools que apoyan la gobernanza del satélite: los **ADRs** (registros de decisiones de arquitectura), la priorización **MoSCoW**, la **configuración** del `evolith.yaml`, y las **métricas** (del propio servidor MCP y aproximaciones DORA sobre el historial de Git).

Todos operan sobre un repositorio local: la mayoría acepta un campo `path` (o `dir`) que apunta a la raíz del satélite y, si lo omites, usan el directorio de trabajo actual del servidor. Los que escriben en disco (crear/actualizar ADRs, crear/editar/borrar análisis MoSCoW, fijar configuración) son **mutativos** y por tanto pasan por la compuerta `{ apply:true, approvalToken }` descrita en la cabecera de esta guía.

### 6.1. `evolith-adr-list` — listar los ADRs del repositorio

**Qué hace.** Lee la carpeta `reference/architecture/adrs` del satélite y devuelve todos los ADRs en forma resumida (id, título, estado y fecha). Es el punto de partida para saber qué decisiones están registradas antes de consultar o crear una nueva. Solo lectura.

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | no | Raíz del repositorio que contiene `reference/architecture/adrs`. Si lo omites, se usa el directorio actual del servidor. |

**Ejemplo.**

```json
{ "name": "evolith-adr-list", "arguments": { "path": "/repos/mi-satelite" } }
```

**Qué esperar.** Un objeto con `count` (número de ADRs) y `adrs`, un arreglo donde cada entrada trae `id`, `title`, `status` y `date`. Si no hay ADRs, `count` es `0` y `adrs` viene vacío.

### 6.2. `evolith-adr-get` — ver un ADR completo

**Qué hace.** Recupera todo el contenido de un único ADR identificándolo por su id (`ADR-0001`) o por su número (`1`). Úsalo cuando ya sabes cuál te interesa y necesitas su contexto, decisión y consecuencias íntegras. Solo lectura.

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | no | Raíz del repositorio con los ADRs (por defecto, el directorio actual). |
| `id` | string | sí | Identificador del ADR a leer: id completo (`ADR-0001`) o solo el número (`1`). |

**Ejemplo.**

```json
{ "name": "evolith-adr-get", "arguments": { "id": "ADR-0073" } }
```

**Qué esperar.** El objeto ADR completo (id, título, estado, fecha, contexto, decisión, consecuencias, relacionados y tags). Si el id no existe, la tool lanza un error `ADR <id> not found` que la pasarela convierte en envelope de error.

### 6.3. `evolith-adr-create` — crear un nuevo ADR (mutativo)

**Qué hace.** Registra una nueva decisión de arquitectura: escribe el archivo `reference/architecture/adrs/<id>.md` y actualiza la matriz de ADRs. El nuevo ADR nace en estado `Proposed`. Es **mutativo**, así que la llamada debe venir con el gate `{ apply:true, approvalToken }`. Si solo quieres previsualizar sin tocar disco, usa `dryRun:true`.

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | no | Raíz del repositorio donde se escribirá el ADR (por defecto, el directorio actual). |
| `title` | string | sí | Título del ADR; mínimo 5 caracteres. Es la cabecera humana de la decisión. |
| `context` | string | sí | El problema o contexto que motiva la decisión. |
| `decision` | string | sí | La decisión que efectivamente se tomó. |
| `consequences` | object | no | Consecuencias clasificadas en tres arreglos de strings: `positive`, `negative`, `neutral`. |
| `relatedAdrs` | string[] | no | Ids de otros ADRs relacionados, para tejer la trazabilidad entre decisiones. |
| `tags` | string[] | no | Etiquetas de clasificación libres para agrupar o filtrar la decisión. |
| `dryRun` | boolean | no | Si es `true`, simula la creación sin escribir archivos. Por defecto `false`. |

**Ejemplo.**

```json
{
  "name": "evolith-adr-create",
  "arguments": {
    "path": "/repos/mi-satelite",
    "title": "Adoptar cola de mensajes para eventos de dominio",
    "context": "Los eventos se procesan síncronamente y bloquean la request",
    "decision": "Introducir una cola con consumidores asíncronos",
    "consequences": {
      "positive": ["Desacople", "Mejor resiliencia"],
      "negative": ["Complejidad operativa"]
    },
    "tags": ["mensajeria", "async"],
    "apply": true,
    "approvalToken": "<token>"
  }
}
```

**Qué esperar.** Un objeto con `dryRun` (el valor efectivo) y `adr` con el resumen del ADR creado (`id`, `title`, `status`, `date`). Si `title` tiene menos de 5 caracteres, o falta `context`/`decision`, la tool lanza un error de validación.

### 6.4. `evolith-adr-update` — cambiar el estado de un ADR (mutativo)

**Qué hace.** Reescribe el estado de un ADR existente tanto en su archivo markdown como en la matriz. Sirve para moverlo por su ciclo de vida: de `Proposed` a `Accepted`, marcarlo `Deprecated`, `Superseded` o `Amended`. Es **mutativo** (requiere el gate). Admite `dryRun` para simular.

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | no | Raíz del repositorio con los ADRs (por defecto, el directorio actual). |
| `id` | string | sí | ADR a actualizar: id (`ADR-0001`) o número. |
| `status` | string | sí | Nuevo estado. Debe ser uno de: `Proposed`, `Accepted`, `Deprecated`, `Superseded`, `Amended`. |
| `reason` | string | no | Motivo del cambio de estado, útil para dejar rastro de por qué se movió. |
| `dryRun` | boolean | no | Si es `true`, simula el cambio sin escribir. Por defecto `false`. |

**Ejemplo.**

```json
{
  "name": "evolith-adr-update",
  "arguments": {
    "id": "ADR-0073",
    "status": "Accepted",
    "reason": "Aprobado en el comité de arquitectura",
    "apply": true,
    "approvalToken": "<token>"
  }
}
```

**Qué esperar.** Un objeto con `id`, `newStatus` y `dryRun`. Si el `status` no está en la lista válida, la tool responde con un error explicando los valores aceptados; si el ADR no existe, lanza `ADR <id> not found`.

### 6.5. `evolith-adr-matrix` — resumen agregado de ADRs

**Qué hace.** Devuelve la matriz de ADRs: totales por estado más los ADRs recientes. Es la vista de un vistazo para saber cuántas decisiones están aceptadas, propuestas o deprecadas sin recorrer la lista completa. Solo lectura.

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | no | Raíz del repositorio con los ADRs (por defecto, el directorio actual). |

**Ejemplo.**

```json
{ "name": "evolith-adr-matrix", "arguments": { "path": "/repos/mi-satelite" } }
```

**Qué esperar.** El objeto matriz con los conteos por estado y una lista de ADRs recientes.

### 6.6. `evolith-moscow-create` — crear un análisis MoSCoW (mutativo)

**Qué hace.** Crea un nuevo análisis de priorización MoSCoW para una fase del repositorio, con la lista de ítems clasificados en `MUST` / `SHOULD` / `COULD` / `WONT`. Es **mutativo** (persiste el análisis en el repo, requiere el gate). Si no indicas `phase`, se asume `phase-0`.

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | sí | Raíz del repositorio donde se guardará el análisis. |
| `phase` | string | no | Fase a la que pertenece el análisis (por defecto `phase-0`). |
| `items` | object[] | sí | Ítems a priorizar. Cada uno: `title` (req), `category` (req: `MUST`/`SHOULD`/`COULD`/`WONT`), y opcionalmente `description`, `effort` (`high`/`medium`/`low`) y `value` (`high`/`medium`/`low`). |

**Ejemplo.**

```json
{
  "name": "evolith-moscow-create",
  "arguments": {
    "path": "/repos/mi-satelite",
    "phase": "phase-1",
    "items": [
      { "title": "Autenticación", "category": "MUST", "effort": "high", "value": "high" },
      { "title": "Modo oscuro", "category": "COULD", "effort": "low", "value": "low" }
    ],
    "apply": true,
    "approvalToken": "<token>"
  }
}
```

**Qué esperar.** `{ success:true, analysis, message }` con el análisis creado. Si falta `path` o `items` está vacío, devuelve `{ error:true, message }` describiendo qué falta.

### 6.7. `evolith-moscow-load` — cargar un análisis existente

**Qué hace.** Recupera el análisis MoSCoW ya guardado para una fase concreta. Es la forma de leer lo que se creó antes. Solo lectura.

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | sí | Raíz del repositorio. |
| `phase` | string | sí | Fase cuyo análisis quieres cargar. |

**Ejemplo.**

```json
{ "name": "evolith-moscow-load", "arguments": { "path": "/repos/mi-satelite", "phase": "phase-1" } }
```

**Qué esperar.** El análisis completo de esa fase. Si no existe, `{ error:true, message: "No MoSCoW analysis found for <phase>" }`.

### 6.8. `evolith-moscow-list` — listar todos los análisis del repo

**Qué hace.** Enumera todos los análisis MoSCoW presentes en el repositorio, sin fijarse en una fase concreta. Útil para descubrir qué fases ya tienen priorización hecha. Solo lectura.

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | sí | Raíz del repositorio a inspeccionar. |

**Ejemplo.**

```json
{ "name": "evolith-moscow-list", "arguments": { "path": "/repos/mi-satelite" } }
```

**Qué esperar.** `{ analyses, count }` con el arreglo de análisis y su cantidad. Si no hay ninguno, `analyses` viene vacío y `count` es `0`.

### 6.9. `evolith-moscow-update` — editar un ítem de un análisis (mutativo)

**Qué hace.** Modifica un ítem concreto dentro de un análisis MoSCoW (por ejemplo, reclasificarlo de `COULD` a `SHOULD`, o ajustar su esfuerzo/valor). Es **mutativo** (requiere el gate). El ítem se identifica por su `itemId`.

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | sí | Raíz del repositorio. |
| `phase` | string | sí | Fase que contiene el análisis. |
| `itemId` | string | sí | Id del ítem a modificar. |
| `updates` | object | sí | Campos del ítem a cambiar (por ejemplo `category`, `effort`, `value`, `title`, `description`). |

**Ejemplo.**

```json
{
  "name": "evolith-moscow-update",
  "arguments": {
    "path": "/repos/mi-satelite",
    "phase": "phase-1",
    "itemId": "item-2",
    "updates": { "category": "SHOULD", "value": "medium" },
    "apply": true,
    "approvalToken": "<token>"
  }
}
```

**Qué esperar.** `{ success:true, analysis, message }` con el análisis actualizado. Si el `itemId` no está en esa fase, `{ error:true, message: "Item <id> not found in <phase>" }`.

### 6.10. `evolith-moscow-remove` — quitar un ítem de un análisis (mutativo)

**Qué hace.** Elimina un ítem de un análisis MoSCoW por su `itemId`. Es **mutativo** (requiere el gate).

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | sí | Raíz del repositorio. |
| `phase` | string | sí | Fase que contiene el análisis. |
| `itemId` | string | sí | Id del ítem a eliminar. |

**Ejemplo.**

```json
{
  "name": "evolith-moscow-remove",
  "arguments": {
    "path": "/repos/mi-satelite",
    "phase": "phase-1",
    "itemId": "item-2",
    "apply": true,
    "approvalToken": "<token>"
  }
}
```

**Qué esperar.** `{ success:true, analysis, message }` con el análisis resultante. Si el ítem no existe, `{ error:true, message: "Item <id> not found in <phase>" }`.

### 6.11. `evolith-moscow-validate` — validar las reglas del análisis

**Qué hace.** Comprueba que un análisis MoSCoW cumple sus reglas de distribución (por ejemplo el reparto 60/20/20 entre categorías) y reporta las incidencias encontradas. Solo lectura.

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | sí | Raíz del repositorio. |
| `phase` | string | sí | Fase cuyo análisis se valida. |

**Ejemplo.**

```json
{ "name": "evolith-moscow-validate", "arguments": { "path": "/repos/mi-satelite", "phase": "phase-1" } }
```

**Qué esperar.** `{ valid, issues, analysis }`: `valid` indica si pasa, `issues` lista los problemas y `analysis` incluye el análisis evaluado. Si no hay análisis para esa fase, devuelve un error.

### 6.12. `evolith-moscow-report` — generar el reporte en markdown

**Qué hace.** Produce un reporte legible en markdown a partir de un análisis MoSCoW, listo para pegar en documentación o en una revisión. Solo lectura.

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | sí | Raíz del repositorio. |
| `phase` | string | sí | Fase cuyo análisis se reporta. |

**Ejemplo.**

```json
{ "name": "evolith-moscow-report", "arguments": { "path": "/repos/mi-satelite", "phase": "phase-1" } }
```

**Qué esperar.** `{ report, analysis }`, donde `report` es la cadena markdown y `analysis` el análisis usado. Si no existe el análisis, devuelve un error.

### 6.13. `evolith-config-get` — leer un valor de `evolith.yaml`

**Qué hace.** Lee el archivo `evolith.yaml` del repositorio y devuelve el valor de una clave, admitiendo rutas anidadas con notación de puntos (por ejemplo `product.phase`). Solo lectura.

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `key` | string | sí | Clave a leer; usa puntos para navegar objetos anidados (`coreRef.version`). |
| `dir` | string | no | Directorio que contiene el `evolith.yaml` (por defecto, el directorio actual). |

**Ejemplo.**

```json
{ "name": "evolith-config-get", "arguments": { "key": "product.phase", "dir": "/repos/mi-satelite" } }
```

**Qué esperar.** `{ key, value }` con el valor encontrado (o `null` si la clave no existe). Si no hay `evolith.yaml` en el directorio, lanza `evolith.yaml not found`.

### 6.14. `evolith-config-set` — fijar un valor en `evolith.yaml` (mutativo)

**Qué hace.** Escribe un valor en el `evolith.yaml`, creando las claves intermedias si hace falta (notación de puntos). Es **mutativo**: modifica el archivo, así que requiere el gate `{ apply:true, approvalToken }`.

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `key` | string | sí | Clave a escribir; con puntos para anidar (`governance.version`). |
| `value` | string | sí | Nuevo valor a asignar a esa clave. |
| `dir` | string | no | Directorio con el `evolith.yaml` (por defecto, el directorio actual). |
| `confirm` | boolean | no | Bandera de confirmación de la operación mutativa. |

**Ejemplo.**

```json
{
  "name": "evolith-config-set",
  "arguments": {
    "key": "product.phase",
    "value": "phase-2",
    "dir": "/repos/mi-satelite",
    "apply": true,
    "approvalToken": "<token>"
  }
}
```

**Qué esperar.** `{ key, value, updated:true }` cuando escribe correctamente. Si no encuentra el `evolith.yaml`, lanza `evolith.yaml not found`.

### 6.15. `evolith-metrics` — métricas del servidor MCP

**Qué hace.** Devuelve una instantánea en memoria de las métricas del propio servidor MCP: uptime, total de llamadas y fallos, estadísticas por tool (llamadas, fallos, latencia media) y un anillo acotado de errores recientes. Sirve para observar cómo se está usando la pasarela. No recibe argumentos. Solo lectura.

**Argumentos.** Ninguno.

**Ejemplo.**

```json
{ "name": "evolith-metrics", "arguments": {} }
```

**Qué esperar.** Un objeto con `uptimeMs`, `totalCalls`, `totalFailures`, `tools` (mapa de nombre de tool a `{ calls, failures, totalLatencyMs, avgLatencyMs }`) y `recentErrors` (últimos mensajes de error, hasta 20). Nota: son métricas del proceso en curso, se reinician al reiniciar el servidor.

### 6.16. `evolith-dora-metrics` — métricas DORA aproximadas desde Git

**Qué hace.** Calcula aproximaciones de métricas DORA a partir del historial de commits de Git del repositorio, sobre una ventana de días. Da una lectura rápida de frecuencia de despliegue y actividad reciente. Solo lectura (aunque lee Git, no escribe nada).

**Argumentos.**

| campo | tipo | req | para qué |
| --- | --- | --- | --- |
| `path` | string | sí | Raíz del repositorio Git a analizar. |
| `days` | number | no | Ventana hacia atrás en días para el cálculo (por defecto `90`). |

**Ejemplo.**

```json
{ "name": "evolith-dora-metrics", "arguments": { "path": "/repos/mi-satelite", "days": 30 } }
```

**Qué esperar.** Un objeto con `repository`, `windowDays`, `timestamp` y `metrics`: `deploymentFrequency` (commits por día, como texto), `leadTimeForChanges` (aproximación), `totalCommits` y `mergeCommits`. Si `path` no es un repositorio Git, devuelve `{ error:true, message: "Not a git repository" }`.
