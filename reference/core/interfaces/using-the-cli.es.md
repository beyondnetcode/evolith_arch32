# Cómo usar la CLI de Evolith

> Navegación bilingüe: [English](./using-the-cli.md)

Guía práctica para trabajar con Evolith Core desde la línea de comandos. Está
pensada para leerse de principio a fin la primera vez, y para consultarse por
comando después.

---

## 1. Qué es la CLI y cómo se invoca

La CLI (`evolith-cli`) es la forma local de operar Evolith Core: valida tu
repositorio satélite contra las reglas del Core, evalúa las compuertas (gates)
de cada fase del ciclo de vida, detecta deriva arquitectónica, genera código y
más. Todo corre en tu máquina contra un checkout del Core.

Se invoca así:

```bash
evolith-cli <comando> [subcomando] [opciones]
```

Por ejemplo:

```bash
evolith-cli validate --satellite . --core ../evolith-core
```

Si instalaste el paquete, el binario es `evolith-cli` (el alias corto `evolith`
se instala junto a él y es el que imprime la ayuda integrada). Si trabajas dentro
del monorepo, el equivalente es `node src/sdk/cli/dist/main.js <comando>`.

Para ver la ayuda de cualquier comando, añade `--help`:

```bash
evolith-cli --help              # lista todos los comandos
evolith-cli gate --help         # ayuda del comando gate
```

---

## 2. Tres conceptos que aplican a (casi) todos los comandos

Antes de ver comando por comando, conviene entender tres cosas transversales:
te ahorran repetir explicaciones.

### 2.1. Modo humano vs. modo máquina — `--format`

Casi todos los comandos aceptan `--format`:

- **Sin `--format` (o `--format human`)** → salida legible, con colores y
  formato, pensada para que la leas tú.
- **`--format json`** → una **única respuesta JSON** en la salida estándar,
  pensada para scripts, CI o agentes. Esa respuesta sigue siempre la misma
  estructura (el "envelope" ADR-0073):

```json
{
  "success": true,
  "data": { /* el resultado */ },
  "meta": { "command": "evolith-cli gate evaluate", "executedAt": "…", "correlationId": "…", "schemaVersion": "1.0.0" }
}
```

Y cuando algo falla:

```json
{
  "success": false,
  "error": { "code": "RULESET_NOT_FOUND", "message": "…" },
  "meta": { /* … */ }
}
```

> Regla útil: en `--format json`, **la salida estándar (stdout) contiene solo el
> JSON**. Los mensajes de progreso y advertencias van al canal de error
> (stderr), así que puedes hacer `evolith-cli … --format json | jq` con seguridad.

### 2.2. Códigos de salida — para CI

El código de salida del proceso refleja el **veredicto**, no solo si el comando
corrió. Hay cuatro, y la distinción entre ellos es lo importante:

| Código | Significado | Qué debería hacer un pipeline |
|:------:|-------------|-------------------------------|
| **`0`** | Pasa — el comando corrió y nada bloquea | Continuar |
| **`1`** | Fallo de herramienta — el comando **no** pudo producir un veredicto (E/S, red, corpus de reglas irresoluble, un crash) | Fallar el paso, pero **no** reportar el repositorio como no conforme |
| **`2`** | Bloqueado — el comando corrió y el veredicto bloquea (gate fallido, evaluación rechazada, edición vetada) | Fallar el paso; esto **sí** es un hallazgo sobre el código |
| **`3`** | Entrada inválida — la invocación está mal (acción desconocida, flag ausente, un prompt requerido sin TTY) | Corregir la invocación y reintentar |

La razón de separar `1` y `2` es que unirlos hace que un pipeline afirme algo que
no estableció. Un repositorio cuya validación reventó **no** ha quedado demostrado
como no conforme — no ha sido evaluado en absoluto. Tratarlos igual es el inverso
de un gate que reporta verde sobre un repo sin evaluar, y está igual de mal.

Poner `evolith-cli validate …` en un pipeline sigue funcionando sin lógica extra:
cualquier código distinto de cero falla el paso. Ramifica por el código sólo
cuando quieras distinguir "el gate bloqueó" de "el gate nunca corrió" — por
ejemplo, para reintentar un `1` y abrir una incidencia ante un `2`.

La GitHub Action `evolith-validate` lo expone como `exit-code` junto a
`compliance-status`, donde un `1` o un `3` afloran como `error` / `invalid-input`
en vez de como `non-compliant`.

### 2.3. Dónde está tu satélite y dónde está el Core — `--satellite` y `--core`

Muchos comandos necesitan saber dos rutas:

- **`--satellite <ruta>`** (o `-s`): tu repositorio satélite (el proyecto que se
  valida). Si lo omites, se resuelve buscando el `evolith.yaml` más cercano
  hacia arriba desde el directorio actual.
- **`--core <ruta>`** (o `-c`): el checkout de Evolith Core (de donde salen las
  reglas). Si lo omites, se intenta autodetectar; si no encuentra reglas, verás
  el error `RULESET_NOT_FOUND` — apunta `--core` a tu checkout del Core.

---

## 3. Validar y evaluar (el corazón del día a día)

Estos cuatro comandos son los que más usarás: verifican que lo que construiste
cumple las reglas y las compuertas.

### 3.1. `evolith-cli validate` — validar el satélite contra las reglas

**Qué hace.** Corre las reglas de gobernanza del Core (rulesets), la topología y
las compuertas de fase sobre tu satélite, y te dice qué cumple y qué no.

**Uso básico:**

```bash
evolith-cli validate --satellite . --core ../evolith-core
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `-s, --satellite <ruta>` | El satélite a validar (default: `evolith.yaml` más cercano). |
| `-c, --core <ruta>` | El checkout del Core con las reglas (default: autodetección). |
| `-f, --format <fmt>` | `human` (default) o `json`. |
| `-o, --output <archivo>` | Guarda el reporte JSON en un archivo en lugar de imprimirlo. |
| `-r, --ruleset <id>` | Valida solo un ruleset (p.ej. `adr-0002`, `acl`, `mcp`). |
| `-p, --phase <fase>` | Valida contra una fase concreta: `discovery`, `design`, `construction`, `qa`, `release`. |
| `-t, --topology <id>` | Valida contra una topología: `modular-monolith`, `distributed-modules`, `microservices`. |
| `-a, --arch` | Valida la arquitectura sobre todo el eje de madurez. |
| `-e, --engine <motor>` | Motor de reglas: `native` (default) u `opa`. |
| `--composable` | Usa el motor "composable" (resuelve varios modos automáticamente — ver 3.2). |
| `--file <ruta>` | Valida un único archivo (modo ad-hoc). |

**Combinaciones típicas:**

```bash
# Validar solo la fase de construcción, guardando el reporte a un archivo
evolith-cli validate -s . -c ../evolith-core --phase construction --format json -o reporte.json

# Validar solo el cumplimiento de un ADR concreto
evolith-cli validate -s . -c ../evolith-core --ruleset adr-0002

# Validar la arquitectura contra una topología específica
evolith-cli validate -s . -c ../evolith-core --topology microservices --arch
```

**Qué esperar.** En modo humano, un resumen con ✓/✗ por regla y por compuerta.
En `--format json`, el envelope con `data.status` (`passed`/`failed`) y la lista
de `issues`. Si el veredicto es `failed`, el comando **sale con código ≠ 0**.

### 3.2. `evolith-cli validate --composable` — validación multi-modo

**Qué hace.** El motor "composable" detecta automáticamente qué modos de
validación aplican a tu contexto (SDLC, arquitectura, ADRs, ad-hoc) y los corre
todos, en vez de que elijas uno a mano. Útil cuando quieres "valida todo lo que
tenga sentido aquí".

```bash
evolith-cli validate --composable --satellite . --core ../evolith-core --format json
```

Acepta las mismas rutas y `--format` que `validate`. Puedes acotarlo con
`--phase` o `--topology` si quieres restringir los modos.

### 3.3. `evolith-cli evaluate` — evaluar un contexto completo

**Qué hace.** Ejecuta la evaluación *stateless* del Core (compuertas +
cumplimiento + arquitectura) sobre un contexto que tú describes, y devuelve un
veredicto global. A diferencia de `validate` (centrado en reglas), `evaluate`
corre el pipeline de evaluación completo.

**Uso básico (contexto derivado de flags):**

```bash
evolith-cli evaluate --workspace . --core ../evolith-core --phase construction
```

**Uso con un contexto explícito (archivo JSON):**

```bash
evolith-cli evaluate --context ./mi-contexto.json --core ../evolith-core --format json
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `--context <ruta>` | Archivo JSON con un `EvaluationContext` canónico. |
| `-w, --workspace <ruta>` | Workspace local (se interpreta como `workspaceRef`; default: perfil/cwd). |
| `-c, --core <ruta>` | Checkout del Core. |
| `-p, --phase <id>` | Fase SDLC: `discovery`…`release`. |
| `-t, --topology <id>` | Topología a evaluar. |
| `-f, --format <fmt>` | `json` (default aquí) o `text`. |

**Qué esperar.** El envelope con `data.overallVerdict` (`PASS`/`FAIL`) y
`data.outcome`. Un veredicto `FAIL` **sale con código ≠ 0**. Si el archivo de
`--context` no existe o no es JSON válido, obtienes `error.code:
VALIDATION_FAILED` (no un error interno) — para que distingas tu error de
entrada de un bug.

### 3.4. `evolith-cli gate evaluate` — evaluar una compuerta de fase

**Qué hace.** Evalúa **una compuerta concreta** (la de `discovery`, `design`,
`construction`, `qa` o `release`) y emite la evidencia (`GateEvidence`): qué
artefactos se exigen, cuáles están presentes y el veredicto.

`gate` es un comando con **acción**: hoy la acción es `evaluate`.

**Uso básico:**

```bash
evolith-cli gate evaluate --phase construction --satellite . --core ../evolith-core
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `-p, --phase <fase>` | La fase cuya compuerta evalúas (obligatorio). |
| `-s, --satellite <ruta>` | El satélite (default: `evolith.yaml` más cercano). |
| `-c, --core <ruta>` | Checkout del Core. |
| `--evaluated-by <actor>` | Quién evalúa: `human` (default), `agent`, `ci`. Queda registrado en la evidencia. |
| `--initiative <id>` / `--tenant <id>` | Contexto opaco (iniciativa/tenant) que se refleja en `meta.context`. |
| `--webhook-url <url>` | Envía la evidencia por POST a esa URL al terminar. |
| `-f, --format <fmt>` | `human` o `json`. |

**Cómo leer el resultado.** El envelope trae `data.verdict` (`passed`/`failed`)
y, si falló, la lista de `violations` con **qué artefacto falta** y dónde se
esperaba. El `success` del envelope significa "la evaluación corrió"; el
**veredicto vive en `data`** y el **código de salida lo refleja** (0 si pasó, ≠0
si falló). Ejemplo real de una compuerta que falla por evidencia ausente:

```json
{
  "success": true,
  "data": {
    "gateId": "business-sign-off",
    "phase": "discovery",
    "verdict": "failed",
    "violations": [
      { "ruleId": "PG-1-EVIDENCE-prd", "severity": "error", "location": "PRD",
        "message": "Artifact not found: docs/prd.md" }
    ]
  },
  "meta": { "command": "evolith-cli gate evaluate", "schemaVersion": "1.0.0" }
}
```

### 3.5. `evolith-cli drift` — detectar deriva arquitectónica

**Qué hace.** Compara el nivel de madurez **declarado** de tu satélite contra el
**detectado** en el código, y reporta la deriva (violaciones nuevas,
persistentes o resueltas respecto a la última corrida).

```bash
evolith-cli drift --path . --format json
```

**Opciones:** `--path <ruta>` (el satélite a analizar), `-l, --level <nivel>`
(la topología declarada del eje progresivo), `--history`, `--trend` y `--format`.

**Qué esperar.** El envelope con `data.driftDetected`, `data.declaredLevel` vs
`data.detectedLevel` y la lista de violaciones.

---

## 4. Arquitectura y andamiaje

Estos comandos no validan: **construyen**. Generan el esqueleto de tu satélite
(el workspace Nx o la solución .NET), recomiendan cómo componer la topología a
partir de señales técnicas, miden qué tan completos están los artefactos de una
fase, y derivan código hexagonal desde un modelo DDD. El primero (`scaffold`) y
el último (`sdlc generate domain`) **escriben en disco**; por eso ambos traen un
modo de simulacro (`--dry-run`) que conviene correr primero.

### 4.1. `evolith-cli scaffold` — generar el workspace por fase de madurez

**Qué hace.** Genera el andamiaje completo de un satélite Evolith a lo largo del
eje progresivo de madurez: fase 1 = *modular-monolith* (una SPA estándar), fase 2
= `distributed-modules` y fase 3 = `microservices` (un host de Module Federation
con sus remotos). Levanta la API backend, el frontend, los shells transversales
(workflow-engine, integration-fabric, tenant-config), un dominio por cada
bounded context que pidas y las librerías compartidas. Es un comando
**mutativo**: corre `npm install` y generadores Nx dentro de `./src`.

**Uso básico:**

```bash
# Modo interactivo: te pregunta framework, ORM, fase, nombres y dominios
evolith-cli scaffold

# Modo no interactivo (todo por flags)
evolith-cli scaffold --frontend react --orm prisma --phase 1 --dry-run
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `--frontend [framework]` | Framework de los microfrontends: `react`, `angular` (o `vue` en el modo interactivo). |
| `--orm [orm]` | ORM de la capa de persistencia compartida: `prisma` o `typeorm`. |
| `--phase [phase]` | Fase del eje progresivo: `1`/`2`/`3` o su id canónico (`modular-monolith`, `distributed-modules`, `microservices`). Fase 1 genera SPA; 2/3 generan host + remotes. |
| `-d, --dry-run` | Simula todo el andamiaje sin tocar el disco. Úsalo siempre antes de la corrida real. |
| `--runtime [runtime]` | Runtime del backend: `nodejs` (default, Nx/React) o `dotnet` (solución ASP.NET Core hexagonal estilo UMS). |
| `--api-name [name]` | Nombre de la API backend (default: `tracker-api`). |
| `--web-app-name [name]` | Nombre de la SPA en fase 1 (default: `tracker-web`). |
| `--host-name [name]` | Nombre del host de microfrontends en fase 2/3 (default: `tracker-host`). |
| `--remotes [remotes]` | Nombres de los microfrontends remotos (separados por coma) para fase 2/3. |
| `--domains [domains]` | Bounded contexts a generar como librerías de dominio (separados por coma). |

**Combinaciones típicas:**

```bash
# 1. Simula un monolito modular con dos dominios (nada se escribe)
evolith-cli scaffold --frontend react --orm prisma --phase 1 \
  --domains discovery,construction --dry-run

# 2. Genéralo de verdad (misma línea sin --dry-run)
evolith-cli scaffold --frontend react --orm prisma --phase 1 \
  --domains discovery,construction

# 3. Fase 3 (microservicios) con host y remotos con nombre explícito
evolith-cli scaffold --frontend angular --orm typeorm --phase 3 \
  --host-name tracker-host --remotes trackerRemoteAgile,trackerRemoteQa

# 4. Satélite .NET (solución hexagonal en vez del workspace Nx)
evolith-cli scaffold --runtime dotnet --api-name mms-api --phase 1 \
  --domains catalog,pricing --dry-run
```

**Qué esperar.** En modo humano verás el andamiaje paso a paso y, al final,
`Toda la topología Evolith ha sido generada en el directorio ./src` (o el aviso
`Modo DRY-RUN activado` si simulaste). El runtime `nodejs` opera sobre
`<cwd>/src`: si ese directorio no existe o no es un workspace Nx, el comando
**falla rápido** con un mensaje accionable (corre primero `init`) en vez de un
`spawn ENOENT` opaco. En `--format json`, `--frontend`, `--orm` y `--phase` son
**obligatorios**; su ausencia devuelve `error.code: VALIDATION_FAILED`, y el
envelope de éxito trae `data.status` (`dry-run` o `scaffolded`) más el resumen de
lo generado.

### 4.2. `evolith-cli topology recommend` — recomendar una composición de topología

**Qué hace.** A partir de señales técnicas (cuántos equipos, si necesitas
despliegue independiente, escala alta, integración asíncrona…) recomienda **cómo
componer** la topología y explica el porqué de cada pieza. Es *advisory* y **no
vinculante**: el Core recomienda en Discovery, el tenant confirma en Design. No
escribe nada, solo lee las reglas del Core y calcula.

**Uso básico:**

```bash
evolith-cli topology recommend --async-integration --team-count 4
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `--team-count <n>` | Número de equipos/squads autónomos que trabajarán el sistema. |
| `--deployment-independence` | Los módulos necesitan ciclos de CI/CD independientes. |
| `--high-scale` | Requisitos de escalado alto e independiente por módulo. |
| `--async-integration` | Integración asíncrona / orientada a eventos. |
| `--data-product-sharing` | Compartición analítica de datos entre dominios. |
| `--spiky-load` | Perfil de carga irregular / a ráfagas. |
| `--latency-tolerant` | La carga tolera latencias más altas. |
| `--edge-or-offline` | Ejecución en el edge o con enfoque offline-first. |
| `--ai-agents` | Agentes de IA participan en el runtime. |
| `-s, --signals <json>` | Todas las señales de golpe como objeto JSON, p.ej. `'{"asyncIntegration":true,"teamCount":4}'`. Los flags individuales **refinan** (sobre-escriben) lo que ponga este payload. |
| `-c, --core <path>` | Checkout del Core con las reglas de recomendación (default: perfil o rulesets empaquetados con la CLI). |

**Combinaciones típicas:**

```bash
# 1. Recomendación mínima con un par de flags
evolith-cli topology recommend --high-scale --deployment-independence

# 2. Señales completas por JSON (equivalente, ideal para scripts)
evolith-cli topology recommend \
  --signals '{"teamCount":4,"asyncIntegration":true,"highScale":true}'

# 3. JSON + un flag que refina el payload y salida máquina
evolith-cli topology recommend --signals '{"teamCount":2}' --team-count 6 --format json
```

**Qué esperar.** En modo humano, un bloque `Recommended Topology Composition`
con la `composition` sugerida y, debajo, la `Rationale`: una viñeta por topología
con su `ruleId` y la razón por la que aplica. En `--format json`, el envelope
lleva la misma recomendación en `data` (`composition` + `rationale`). Comparte el
motor exacto (`TopologyRecommendationService.recommend`) con el endpoint REST y la
herramienta MCP equivalentes, así que las tres superficies dan el mismo resultado.

### 4.3. `evolith-cli topology phase-artifacts` — medir completitud de artefactos de fase

**Qué hace.** Para una fase **downstream** (`construction`, `quality` o
`deployment`) y una composición de topología ya confirmada, mide qué artefactos
declaras como presentes contra la **unión** de los artefactos universales de esa
fase más los que cada topología exige en su perfil. Devuelve un puntaje de
completitud de 0 a 100. También es *advisory* y no vinculante: el Core **mide**,
la compuerta del tenant decide.

**Uso básico:**

```bash
evolith-cli topology phase-artifacts --phase construction --topologies microservices
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `-p, --phase <phase>` | Fase downstream a medir: `construction`, `quality` o `deployment` (obligatorio; otro valor devuelve `INVALID_PHASE`). |
| `-t, --topologies <list>` | Composición de topología confirmada (ids separados por coma), p.ej. `microservices,event-driven`. |
| `-d, --declared <list>` | Tipos de artefacto que declaras presentes (separados por coma), p.ej. `test-summary-report,coverage-report`. |
| `-c, --core <path>` | Checkout del Core con el catálogo de topologías (default: perfil o rulesets empaquetados). |

**Combinaciones típicas:**

```bash
# 1. Medir construcción sin declarar nada aún (ves todo lo que falta)
evolith-cli topology phase-artifacts --phase construction --topologies microservices

# 2. Declarar los artefactos que ya tienes y ver cuánto sube el puntaje
evolith-cli topology phase-artifacts --phase quality \
  --topologies microservices,event-driven \
  --declared test-summary-report,coverage-report

# 3. Salida máquina para un chequeo en CI
evolith-cli topology phase-artifacts --phase deployment \
  --topologies microservices --declared release-notes --format json
```

**Qué esperar.** En modo humano, un encabezado `Phase-Artifact Completeness` con
el puntaje `completeness/100`, y tres listas: `Present` (✓), `Missing` (✗) y, si
aplica, `Conditional` (?) informativa. En `--format json`, el envelope trae
`data.completeness`, `data.presentArtifacts`, `data.missingArtifacts` y
`data.conditionalArtifacts`. Comparte motor
(`PhaseArtifactProfileService.evaluate`) con el endpoint REST y la tool MCP
equivalentes.

### 4.4. `evolith-cli sdlc generate domain` — scaffold hexagonal desde un classDiagram DDD

**Qué hace.** Lee un archivo Markdown que contiene un `classDiagram` de Mermaid
con tu modelo DDD (entidades, agregados, objetos de valor…) y genera el andamiaje de
Arquitectura Hexagonal correspondiente. Detecta las clases por su estereotipo y
crea los archivos que faltan sin pisar los existentes. Como escribe en disco,
trae `--dry-run` para ver primero qué generaría.

**Uso básico:**

```bash
evolith-cli sdlc generate domain --from ddd-model.md
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `-f, --from <path>` | Archivo Markdown con el modelo DDD (el bloque ` ```mermaid ` con la directiva `classDiagram`). Obligatorio. |
| `-o, --output <dir>` | Directorio destino de los archivos generados (default: el directorio actual). |
| `--dry-run` | Imprime qué se generaría sin escribir ningún archivo. |

> El primer argumento posicional es el **target** de generación (`domain`); junto
> con `--from` es obligatorio. Si falta cualquiera de los dos, el comando explica
> el uso y sale con código ≠ 0 (en JSON: `error.code: VALIDATION_FAILED`).

**Combinaciones típicas:**

```bash
# 1. Simular la generación y revisar qué archivos saldrían
evolith-cli sdlc generate domain --from ddd-model.md --dry-run

# 2. Generar de verdad hacia una carpeta concreta
evolith-cli sdlc generate domain --from ddd-model.md --output src/contexts/catalog

# 3. Salida máquina con el detalle de archivos creados/omitidos
evolith-cli sdlc generate domain --from ddd-model.md --format json
```

**Qué esperar.** En modo humano, un resumen de las clases detectadas (con su
estereotipo), la lista de archivos `Created` (o `Would create` en dry-run) y los
`Skipped` que ya existían; si el modelo no tiene estereotipos soportados, avisa
`Nothing to generate`. En `--format json`, el envelope lleva en `data` las listas
`created` y `skipped`. Si el archivo de `--from` no existe o no contiene un
`classDiagram` válido, el comando termina con error.

## 5. Flujo SDLC y transiciones

Estos comandos operan sobre el **ciclo de vida** de tu satélite: proponen pasar
de una fase a la siguiente, muestran el estado de las compuertas (gates) que
guardan cada fase y ejecutan el traspaso (handoff) de artefactos entre fases.
Son la capa que gobierna *cuándo* puedes avanzar, no solo *qué* cumples.

> Un aviso de nomenclatura que ahorra confusiones: `phase advance` usa las
> **fases SDLC canónicas** (`discovery`, `design`, `construction`, `qa`,
> `release`), mientras que `sdlc handoff` usa un esquema **distinto y numerado**
> (`phase-0`, `phase-1`, … `phase-5`). No son intercambiables: cada comando
> valida el suyo. Se explica en cada apartado.

### 5.1. `evolith-cli phase advance` — proponer una transición de fase

**Qué hace.** Evalúa si es sensato pasar de la fase actual (`--from`) a una fase
destino (`--to`) y emite una **propuesta de transición** con su evidencia, sin
mutar el estado canónico del satélite. Es un paso de decisión: te dice si la
transición está *recomendada* o *no recomendada* según las violaciones que
encuentre, para que decidas con criterio antes de mover nada.

`phase` es un comando con **acción posicional**: hoy la única acción soportada es
`advance`. Cualquier otra acción se rechaza con `VALIDATION_FAILED`.

**Uso básico:**

```bash
evolith-cli phase advance --from construction --to qa --satellite . --core ../evolith-core
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `--from <fase>` | Fase SDLC actual. Obligatoria y validada: `discovery`, `design`, `construction`, `qa`, `release`. |
| `--to <fase>` | Fase SDLC destino, del mismo conjunto de fases válidas. Obligatoria. |
| `-s, --satellite [ruta]` | El satélite a evaluar (default: `evolith.yaml` más cercano hacia arriba desde el cwd). |
| `-c, --core [ruta]` | Checkout del Core con las reglas (default: autodetección). |
| `--evaluated-by [actor]` | Quién evalúa: `agent` (default), `human` o `ci`. Queda registrado en la evidencia. |
| `--initiative [id]` / `--tenant [id]` | Contexto opaco que se refleja en `meta.context`. |
| `--webhook-url <url>` | Envía la evidencia por POST a esa URL al terminar. |
| `-f, --format [fmt]` | `human` (default) o `json`. |

**Combinaciones típicas:**

```bash
# Simple: proponer el salto de construcción a QA, leído por una persona
evolith-cli phase advance --from construction --to qa -s . -c ../evolith-core

# En CI: salida JSON y actor "ci", para que un pipeline decida por el exit-code
evolith-cli phase advance --from qa --to release -s . -c ../evolith-core \
  --evaluated-by ci --format json

# Notificando a un sistema externo la evidencia de la transición
evolith-cli phase advance --from design --to construction -s . -c ../evolith-core \
  --webhook-url https://hooks.example.com/evolith
```

**Qué esperar.** En modo humano verás si la transición es `RECOMMENDED` (verde) o
`NOT RECOMMENDED` (rojo), el veredicto de la evidencia (`ruleset@versión`) y la
lista de violaciones con severidad, regla y ubicación. En `--format json`, el
envelope con `data` = la propuesta (`fromPhase`, `toPhase`, `isRecommended`,
`evidence.violations`, `proposedAt`). El detalle clave para CI: **si la
transición NO está recomendada, el comando sale con código ≠ 0**, de modo que un
pipeline se detiene solo cuando la fase no está lista para avanzar. Si `--from` o
`--to` no son fases válidas obtienes `error.code: INVALID_PHASE`; si las reglas no
se encuentran, `RULESET_NOT_FOUND`.

### 5.2. `evolith-cli sdlc gate-status` — estado de las compuertas y métricas DORA

**Qué hace.** Muestra, para el proyecto en el directorio actual, el estado de
**todas** las compuertas de fase (cuántas pasan, fallan o quedan pendientes, con
el detalle de cada evidencia exigida) y, además, calcula las cuatro **métricas
DORA** a partir del historial de git. Es la foto de "¿en qué punto del ciclo
estoy y cómo va mi entrega?".

A diferencia de otros comandos, `gate-status` **no** recibe `--satellite`: opera
siempre sobre el directorio actual (`cwd`). Sí acepta `-c, --core` para apuntar
al checkout que tiene las compuertas SDLC canónicas (autodetectado por defecto).

**Uso básico:**

```bash
evolith-cli sdlc gate-status
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `--since <días>` | Ventana de historial git a analizar para DORA (default: 90). Valores inválidos o < 1 caen al default. |
| `-f, --format <fmt>` | `human` (default) o `json`. |

**Combinaciones típicas:**

```bash
# La foto completa, legible: compuertas + DORA de los últimos 90 días
evolith-cli sdlc gate-status

# Ampliar la ventana DORA a un semestre
evolith-cli sdlc gate-status --since 180

# Para un dashboard o script: un único JSON con gateStatus + doraMetrics
evolith-cli sdlc gate-status --format json | jq '.data.doraMetrics'
```

**Qué esperar.** En modo humano, un resumen (fase actual, gates
pasados/fallidos/pendientes) seguido del detalle por compuerta —rol responsable,
autoridad de waiver si falló, evidencias con ✓/✗ marcadas `[REQUIRED]` /
`[OPTIONAL]`, y criterios bloqueantes disparados— y luego un bloque de DORA con
frecuencia de despliegue, lead time, tasa de fallo de cambios y tiempo de
restauración, cada una con su *badge* de rating (`elite`/`high`/`medium`/`low`).
En `--format json`, el envelope con `data.gateStatus` y `data.doraMetrics` (este
último es `null` si el directorio no es un repo git; las métricas se saltan y, en
modo humano, verás un aviso en su lugar).

### 5.3. `evolith-cli sdlc handoff` — traspasar artefactos entre fases

**Qué hace.** Ejecuta el **traspaso** real de una fase a la siguiente:
transiciona los artefactos, valida las compuertas de la fase y deja el proyecto
posicionado en la fase destino. Tiene dos modos: **guiado/interactivo** (te va
preguntando fase origen, fase destino, si validar gates, qué herramientas
configurar) y **directo/no interactivo** (le pasas `--from` y `--to` y corre sin
preguntar).

Aquí las fases usan el esquema **numerado** `phase-0`, `phase-1`, … `phase-5`
(no las fases SDLC canónicas de `phase advance`).

**Uso básico (interactivo):**

```bash
evolith-cli sdlc handoff
```

**Uso directo (no interactivo):**

```bash
evolith-cli sdlc handoff --from phase-1 --to phase-2
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `-f, --from [fase]` | Fase origen (`phase-0`, `phase-1`, …). Si la das junto con `--to`, corre en modo directo sin prompts. |
| `-t, --to [fase]` | Fase destino. Requiere `--from` para el modo directo. |
| `-a, --artifacts` | Declara la intención de generar artefactos de evidencia (relevante en el flujo guiado). |
| `--validate` | Declara validar las compuertas de fase (relevante en el flujo guiado). |
| `--force` | Fuerza el handoff pese a gates fallidos (requiere waiver del Architecture Board). |
| `--format <fmt>` | `human` (default) o `json`. |

> Nota práctica: en el camino **directo** (`--from` + `--to`), la transición se
> ejecuta de inmediato y los flags `--artifacts`, `--validate` y `--force` no
> alteran ese path — son opciones del flujo **guiado**, donde `--force` cobra
> sentido para saltarse gates fallidos con el waiver correspondiente. Para
> automatizar, quédate con `--from`, `--to` y `--format json`.

**Combinaciones típicas:**

```bash
# Guiado: te lleva paso a paso por fase origen, destino y herramientas
evolith-cli sdlc handoff

# Directo, para un script: transiciona y devuelve el envelope JSON
evolith-cli sdlc handoff --from phase-1 --to phase-2 --format json

# Forzar el traspaso pese a gates fallidos (flujo guiado; exige waiver)
evolith-cli sdlc handoff --force
```

**Qué esperar.** En modo directo con éxito, un `✓ Transitioned from … to …` (o el
envelope de éxito en JSON con el resultado de la transición). En el flujo guiado,
además ves los resultados de validación de gates (✓/✗ por compuerta, marcadas
`[REQUIRED]`/`[OPTIONAL]`), las herramientas configuradas y una lista de *Next
Steps* para la fase destino. Si la transición falla, se listan los errores; y si
alguna compuerta **requerida** no pasó, el comando te recuerda que debes
corregirla o usar `--force` con el waiver del Architecture Board. En `--format
json`, un traspaso fallido se reporta como `error.code: INTERNAL_ERROR` con los
errores concatenados en el mensaje.

## 6. Gobernanza y documentación

Estos comandos no validan ni evalúan: **administran los artefactos de gobierno**
de tu satélite (decisiones de arquitectura, estándares corporativos) y generan la
documentación base que Evolith espera encontrar. Los tres son *multi-acción*: en
lugar de tener subcomandos, cada **flag de acción** (`--list`, `--get`,
`--create`, …) elige qué hace el comando. Trabajan sobre el directorio actual, no
necesitan `--core` ni `--satellite`, y — como el resto de la CLI — respetan
`--format json` con el mismo envelope descrito en la sección 2.

### 6.1. `evolith-cli adr` — gestionar Architecture Decision Records

**Qué hace.** Es la navaja para tus ADRs (los registros de decisiones de
arquitectura que viven en `reference/architecture/adrs/`). Con un flag distinto
crea, lista, consulta, actualiza el estado o muestra la matriz-resumen de todos
los ADRs. Si lo invocas **sin ningún flag de acción**, entra en modo interactivo
y te pregunta qué quieres hacer.

**Uso básico:**

```bash
evolith-cli adr --list
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `-l, --list` | Lista todos los ADRs con su id, título, estado y fecha. |
| `-g, --get <id>` | Muestra un ADR completo (contexto, decisión, consecuencias, tags). Ej: `--get ADR-0001`. |
| `-m, --matrix` | Imprime el resumen de la matriz: totales por estado (proposed/accepted/deprecated) y los ADRs recientes. |
| `-c, --create` | Crea un ADR nuevo. Abre un cuestionario interactivo (título, contexto, decisión, consecuencias, tags). |
| `-u, --update <id>` | Cambia el estado de un ADR existente. Requiere `--status`. |
| `-s, --status <estado>` | El nuevo estado para `--update`: `Accepted`, `Deprecated`, `Superseded` o `Amended`. |
| `-r, --reason <texto>` | Motivo del cambio de estado (queda registrado junto al ADR). |
| `-d, --dry-run` | Simula `--create` / `--update` sin escribir en disco. |
| `-f, --format <fmt>` | `human` (default) o `json`. |

**Combinaciones típicas:**

```bash
# Ver de un vistazo el estado del registro de decisiones
evolith-cli adr --matrix

# Consultar un ADR concreto en JSON (para un script o un agente)
evolith-cli adr --get ADR-0002 --format json

# Marcar un ADR como reemplazado, dejando constancia del porqué —
# primero en seco para revisar, luego de verdad
evolith-cli adr --update ADR-0005 --status Superseded --reason "Reemplazado por ADR-0011" --dry-run
evolith-cli adr --update ADR-0005 --status Superseded --reason "Reemplazado por ADR-0011"
```

**Qué esperar.** En modo humano, tablas y fichas legibles; el ADR creado se
escribe en `reference/architecture/adrs/<id>.md`. En `--format json`, el envelope
con los datos (`adrs`, el ADR pedido, o el resumen de la matriz). Si pides un ADR
que no existe (`--get`, o `--update` sobre un id inexistente), el comando **sale
con código ≠ 0** y devuelve un envelope de error. Recuerda que `--update` sin
`--status` no hace nada: te avisa de que el estado es obligatorio.

### 6.2. `evolith-cli standards` — gestionar los estándares Evolith

**Qué hace.** Administra los estándares corporativos (arquitectura, gobernanza,
operaciones) que viven en `reference/standards/`. Como `adr`, cada flag es una
acción: inicializa la estructura de carpetas, lista los estándares, muestra el
detalle de uno, valida código contra sus reglas o exporta un estándar a Markdown
o JSON. Sin flag de acción, entra en modo interactivo.

**Uso básico:**

```bash
evolith-cli standards --list
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `--init` | Crea la estructura base en `reference/standards/` (con `rulesets/` y `templates/`). Es el primer paso en un satélite nuevo. |
| `-l, --list` | Lista los estándares registrados con su id, nombre, versión, categoría y número de reglas. |
| `-c, --category <cat>` | Acota `--list` a una categoría concreta. |
| `-g, --get <id>` | Muestra un estándar completo: descripción y sus reglas (con severidad y remediación). |
| `-v, --validate <código>` | Valida un fragmento de código contra las reglas de los estándares y reporta cuántas pasan/fallan. |
| `-e, --export <id>` | Exporta un estándar. El formato lo da `--format`. |
| `-f, --format <fmt>` | Doble uso: el formato de exportación de `--export` (`markdown` —default— o `json`) y también el modo de salida del comando (`json` para el envelope). |

**Combinaciones típicas:**

```bash
# Arrancar la gobernanza de estándares en un satélite recién creado
evolith-cli standards --init

# Listar solo los estándares de una categoría, en JSON para tooling
evolith-cli standards --list --category architecture --format json

# Exportar un estándar a Markdown para pegarlo en la documentación
evolith-cli standards --export STD-0001 --format markdown
```

**Qué esperar.** En humano, tablas y fichas con las reglas y sus severidades
(error / warning / info). En `--format json`, el envelope con el
listado, el estándar pedido o el resultado de la validación (`totalRules`,
`passed`, `failed`). Pedir un estándar inexistente con `--get` **sale con código
≠ 0**. Ojo con el nombre de `--format`: si exportas en JSON con
`--export ... --format json`, obtienes el contenido del estándar serializado como
JSON, no solo el envelope de la CLI.

### 6.3. `evolith-cli docs` — generar la documentación base

**Qué hace.** Genera (*scaffold*) los archivos de documentación que Evolith espera
en la raíz de un satélite: `README.md`, `AGENTS.md`, `MASTER_INDEX.md` y un
`evolith.yaml` de ejemplo (el contrato del satélite). Es lo que corres al empezar
un proyecto para no partir de cero. Por seguridad, **nunca sobrescribe** archivos
existentes salvo que se lo pidas con `--force`.

**Uso básico:**

```bash
evolith-cli docs
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `-t, --template <tipo>` | Qué conjunto generar: `default` (los cuatro archivos) o `minimal` (solo `README.md` y `AGENTS.md`). |
| `-d, --dry-run` | Muestra qué crearía/actualizaría sin escribir nada. Úsalo para revisar antes de aplicar. |
| `-f, --force` | Sobrescribe los archivos que ya existan (por defecto se saltan). |
| `-f, --format <fmt>` | `human` (default) o `json`. |

**Combinaciones típicas:**

```bash
# Ver qué archivos se generarían, sin tocar nada
evolith-cli docs --dry-run

# Andamiaje mínimo (README + AGENTS) en un repo que solo necesita lo básico
evolith-cli docs --template minimal

# Regenerar toda la documentación base, sobrescribiendo lo que hubiera
evolith-cli docs --force
```

**Qué esperar.** En humano, un resumen de cuántos archivos se crean, actualizan y
se saltan, más una línea por archivo escrito. En `--format json`, el envelope con
`created`, `updated`, `skipped` y la lista de `files`. Si todos los archivos ya
existen y no pasas `--force`, el comando no cambia nada y te lo dice. Nota: `docs`
escribe siempre en el **directorio actual**, así que ejecútalo desde la raíz del
satélite.

## 7. Satélite y agentes

Estos comandos operan sobre el *ciclo de vida del propio satélite*: crearlo, darlo
de alta, poblarlo de agentes de gobernanza y mantenerlo al día cuando el Core
publica reglas nuevas. A diferencia de los comandos de validación, aquí el efecto
es **crear o modificar archivos** (o repositorios remotos), así que casi todos
tienen un modo simulacro o una confirmación antes de escribir.

### 7.1. `evolith-cli init` — inicializar un repositorio satélite

**Qué hace.** Crea el andamiaje de un satélite de Evolith en el directorio actual:
`evolith.yaml`, la estructura de carpetas y los artefactos base que exige el
estándar, según el runtime, la arquitectura y la base de datos que elijas. Por
defecto es **interactivo** (te va preguntando); para CI o scripts tiene un modo
batch sin prompts.

**Uso básico (interactivo):**

```bash
evolith-cli init
```

**Uso batch (sin prompts):**

```bash
evolith-cli init --name mi-satelite --runtime nodejs --arch clean --yes
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `-n, --name <nombre>` | Nombre del proyecto. Obligatorio en modo batch (por flag o dentro del `--config`). |
| `-y, --yes` | Activa el modo batch no interactivo: usa los flags y rellena el resto con valores por defecto, sin preguntar nada. |
| `-c, --config <archivo>` | Ruta a un `evolith.setup.json` que aporta toda la configuración; hace bypass total de los prompts. Los flags sueltos sobrescriben campos individuales del archivo. |
| `-r, --runtime <id>` | Runtime del proyecto: `nodejs`, `dotnet`, `python`. |
| `-m, --monorepo <id>` | Estrategia de monorepo: `none`, `nx`, `npm-workspaces`, `rush`. |
| `-a, --arch <id>` | Patrón de arquitectura: `clean`, `hexagonal`, `ddd`. |
| `--db <id>` | Base de datos: `postgresql`, `mongodb`, `sqlserver`. |
| `-d, --dry-run` | Simulacro: no escribe archivos. |

**Combinaciones típicas:**

```bash
# Interactivo: te guía paso a paso (lo normal la primera vez)
evolith-cli init

# Batch mínimo para CI: nombre + --yes; el resto toma defaults (nodejs/clean/postgresql…)
evolith-cli init --name pagos-api --yes

# Reproducible desde un archivo de setup versionado en el repo
evolith-cli init --config ./evolith.setup.json --format json
```

> Detalle importante del modo batch: el atajo sin prompts se activa **solo** con
> `--config` o con `--yes`. Un `--name mi-sat` a secas (sin `--yes`) sigue
> entrando al asistente interactivo.

**Qué esperar.** En modo humano, un resumen con los *artifacts* creados, los
warnings y una lista de "próximos pasos" (`cd`, `validate`, `agents install`…).
En `--format json`, el envelope con `data.artifacts`, `data.warnings` y
`data.success`.

### 7.2. `evolith-cli init-wizard` — asistente interactivo paso a paso

**Qué hace.** Es la variante puramente guiada de la inicialización: te lleva por
un asistente de cuatro pasos (nombre, runtime, monorepo, arquitectura) y al final
crea el proyecto. Útil cuando quieres el flujo conversacional completo en vez de
recordar flags.

**Uso básico:**

```bash
evolith-cli init-wizard
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `--no-wizard` | Desactiva el asistente; te redirige a usar `evolith-cli init`. |
| `--no-interactive` | Corre sin interacción (para automatización/CI), tomando los valores por defecto de cada paso. |
| `-f, --format <fmt>` | `human` (default) o `json`. |

**Combinaciones típicas:**

```bash
# El asistente completo, guiado
evolith-cli init-wizard

# Sin prompts, con salida para máquina (CI)
evolith-cli init-wizard --no-interactive --format json
```

**Qué esperar.** Al terminar, el proyecto creado con su lista de *artifacts*. En
`--format json` obtienes el envelope; si cancelas o falla, sale con código ≠ 0 y
un `error.code` (`VALIDATION_FAILED` al cancelar, `INTERNAL_ERROR` si la creación
falla).

> ¿`init` o `init-wizard`? Para el día a día usa `evolith-cli init`: ya es
> interactivo y además tiene el modo batch. `init-wizard` es el asistente
> dedicado, más acotado (cubre nombre/runtime/monorepo/arquitectura).

### 7.3. `evolith-cli satellite:create` — crear el repo en GitHub y registrarlo

**Qué hace.** Crea un **repositorio nuevo en GitHub** y lo registra como satélite
de Evolith en un solo paso, con su topología y su fase de ciclo de vida. A
diferencia de `init` (que arma el andamiaje local), este comando toca GitHub, así
que necesita un token.

**Uso básico:**

```bash
export GITHUB_TOKEN=ghp_xxx
evolith-cli satellite:create --name mi-satelite --owner mi-org
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `-n, --name <nombre>` | Nombre del repositorio a crear. Si lo omites, te lo pregunta. |
| `-o, --owner <owner>` | Usuario u organización de GitHub que será dueño del repo. |
| `--topology <id>` | Topología de arquitectura: `monolith`, `modular`, `micro`, `distributed`. |
| `--phase <id>` | Fase SDLC inicial: `discovery`, `design`, `construction`, `qa`, `release`. |
| `--private` | Crea el repositorio como privado (por defecto es público). |
| `-d, --description <texto>` | Descripción opcional del repositorio. |
| `-t, --token <token>` | Token personal de GitHub. Si lo omites, usa la variable de entorno `GITHUB_TOKEN`. |

**Combinaciones típicas:**

```bash
# Repo privado, microservicios, arrancando en discovery
evolith-cli satellite:create --name checkout-svc --owner acme \
  --topology micro --phase discovery --private

# Sin flags: el comando te pregunta nombre, owner, topología y fase
evolith-cli satellite:create

# Para automatización: token explícito + salida JSON
evolith-cli satellite:create --name pagos --owner acme --token "$GH_PAT" --format json
```

**Qué esperar.** En modo humano, una ficha "Satellite Registered" con el ID, la
URL del repo, la topología, la fase y el estado. En `--format json`, el envelope
con `data.satellite`. Si no hay token (ni `--token` ni `GITHUB_TOKEN`), el comando
no crea nada y te avisa de que falta el token.

### 7.4. `evolith-cli satellite:adopt` — adoptar un repositorio existente

**Qué hace.** Toma un **repositorio de GitHub que ya existe** y lo pone bajo
gobernanza de Evolith **sin crear nada nuevo**: lo registra como satélite con su
topología y su fase. Es la contraparte de `satellite:create` cuando el repo ya
está en marcha.

**Uso básico:**

```bash
export GITHUB_TOKEN=ghp_xxx
evolith-cli satellite:adopt --repo https://github.com/mi-org/mi-repo
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `--repo <url>` | URL del repositorio a adoptar (`https://github.com/owner/repo`). El owner y el nombre se extraen de aquí. |
| `--owner <owner>` | Fuerza el owner; por defecto se toma el que aparece en `--repo`. |
| `--topology <id>` | Topología: `monolith`, `modular`, `micro`, `distributed`, `custom`. |
| `--phase <id>` | Fase del satélite: `alpha`, `beta`, `rc`, `ga`. |
| `--token <token>` | Token personal de GitHub (por defecto, `GITHUB_TOKEN`). |
| `-f, --format <fmt>` | `human` o `json`. |

**Combinaciones típicas:**

```bash
# Adopción mínima: solo la URL; topología/fase por defecto (modular/alpha) o preguntadas
evolith-cli satellite:adopt --repo https://github.com/acme/legacy-api

# Declarando topología y fase de madurez
evolith-cli satellite:adopt --repo https://github.com/acme/legacy-api \
  --topology modular --phase beta

# En pipeline, todo por flags + JSON
evolith-cli satellite:adopt --repo https://github.com/acme/legacy-api \
  --topology micro --phase ga --token "$GH_PAT" --format json
```

**Qué esperar.** Un resumen "Satellite adopted successfully" con ID, owner, repo,
topología, fase y estado; en `--format json`, el envelope con `data.satellite`.

> Ojo con las fases: las de `satellite:adopt` describen **madurez del release**
> (`alpha`/`beta`/`rc`/`ga`) y son distintas de las fases SDLC
> (`discovery`…`release`) que usan `satellite:create` y los comandos de
> validación. Si no pasas `--phase` en modo JSON, adopta `alpha` por defecto.

### 7.5. `evolith-cli agents` — gestionar agentes en el satélite

**Qué hace.** Administra los agentes de gobernanza instalados en el satélite:
instalarlos (con una plantilla y un conjunto de ADRs/rulesets), listarlos,
validarlos, actualizarlos, ejecutarlos contra el Agent Runtime o eliminarlos. Sin
argumentos abre un **menú interactivo**; también puedes ir directo a una acción.

**Uso básico:**

```bash
evolith-cli agents            # menú interactivo
evolith-cli agents --list     # lista los agentes instalados
```

**Acciones y opciones principales:**

| Opción / acción | Para qué |
| --- | --- |
| `-l, --list` (o `agents list`) | Lista los agentes instalados en el repositorio. |
| `-i, --install [nombre]` (o `agents install`) | Instala un agente nuevo: pregunta nombre, plantilla (`standard`/`minimal`/`enterprise`), descripción y qué ADRs/rulesets incluir. |
| `-r, --remove [nombre]` (o `agents remove`) | Elimina un agente instalado (pide confirmación; es irreversible). |
| `agents validate` | Valida el ruleset de un agente contra el esquema y reporta los problemas encontrados. `--name <agente>` es obligatorio con `--format json`. |
| `agents upgrade` | Sube la versión *patch* del agente y actualiza su ruleset. |
| `--run [intent]` (o `agents run`) | Envía un *intent* al Agent Runtime (URL en `AGENT_RUNTIME_URL`, por defecto `http://localhost:3000`) y muestra el resultado. |
| `--format [tipo]` | Formato de salida: `json`, `table`, `yaml`. |

**Combinaciones típicas:**

```bash
# Ver qué agentes hay, en JSON para un script
evolith-cli agents --list --format json

# Instalar un agente (te guía por plantilla y rulesets)
evolith-cli agents install

# Validar y luego subir versión de un agente
evolith-cli agents validate
evolith-cli agents upgrade

# Ejecutar un intent contra el Agent Runtime
evolith-cli agents run --run "Genera el plan de arquitectura del nuevo microservicio"
```

**Qué esperar.** Cada acción devuelve su envelope: `list` trae `data.agents` y
`data.count`; `install`/`remove`/`upgrade` traen el agente afectado y un mensaje;
`validate` trae `data.passed` y la lista de `issues`. Cuando la validación falla o
no hay agentes para la operación, el comando **sale con código ≠ 0**.

> Sobre las acciones: `validate` y `upgrade` se invocan como **acción posicional**
> (`evolith-cli agents validate`), no como flag. `--install`, `--remove`, `--list` y
> `--run` sí tienen atajo por flag además de su forma posicional; cuando pasas
> ambos, gana la acción posicional.

### 7.6. `evolith-cli upgrade` — actualizar el satélite ante reglas nuevas

**Qué hace.** Cuando el Core (upstream) publica reglas nuevas, este comando
**planifica** qué cambios necesita tu satélite para ponerse al día, te muestra el
plan (con nivel de riesgo y los cambios que rompen compatibilidad) y, si
confirmas, los aplica.

**Uso básico:**

```bash
evolith-cli upgrade --satellite . --core ../evolith-core
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `-s, --satellite <ruta>` | El satélite a actualizar (default: `evolith.yaml` más cercano hacia arriba desde el cwd). |
| `-c, --core <ruta>` | Checkout del Core del que salen las reglas nuevas. |
| `-d, --dry-run` | Calcula y muestra el plan **sin aplicar** ningún cambio. |
| `-f, --force` | Aplica el upgrade **aunque haya breaking changes** (sin esto, el comando se detiene y te avisa). |
| `--report` | Muestra el reporte detallado del upgrade. |

**Combinaciones típicas:**

```bash
# Primero mira qué cambiaría, sin tocar nada
evolith-cli upgrade --satellite . --core ../evolith-core --dry-run

# Aplicar (te pide confirmación antes de escribir)
evolith-cli upgrade --satellite . --core ../evolith-core

# Forzar aun con cambios que rompen compatibilidad, en JSON para CI
evolith-cli upgrade -s . -c ../evolith-core --force --format json
```

**Qué esperar.** Primero el **plan**: versión actual → versión objetivo, nivel de
riesgo (`low`/`medium`/`high`), la lista de cambios (con `+`/`~`/`-`/`»` según se
agregue, modifique, elimine o migre) y cuáles son *breaking*. Si el satélite ya
está al día, te lo dice y no hace nada. Con `--dry-run` termina ahí. Si hay
breaking changes y **no** pasaste `--force`, el upgrade se cancela para que
revises. Al aplicar, un "Upgrade Report" con el número de cambios aplicados. En
`--format json`, todo esto viaja en el envelope.

## 8. Utilidades

Este grupo reúne los comandos de apoyo: gestionar tu configuración local, revisar lo que has ejecutado, ahorrarte tecleo, sembrar datos de ejemplo, explorar la superficie de la API, integrar la CLI con tu shell y mantener el propio binario al día. No participan en la evaluación de reglas ni en las compuertas; te hacen la vida más cómoda alrededor de ellas.

Todos aceptan `--format json` (mismo envelope ADR-0073 de la sección 2) salvo `completion`, que emite scripts de shell en crudo.

### 8.1. `evolith-cli profile` — perfiles de configuración

**Qué hace.** Guarda y alterna juegos de configuración con nombre (rutas de `core` y `satellite`, `tenant`, `initiative`) para no repetir las mismas flags en cada comando. Trabajas con varios proyectos o entornos y cambias de contexto con un solo comando. La acción va como argumento posicional; si la omites, muestra el perfil activo.

**Uso básico:**

```bash
evolith-cli profile              # muestra el perfil activo (equivale a 'current')
evolith-cli profile list         # lista todos los perfiles
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `<action>` (posicional) | Qué hacer: `current` (default), `list`, `create`, `switch`, `delete`. |
| `-n, --name <name>` | El perfil sobre el que operas (obligatorio en `switch` y `delete`; en `create` se pregunta si falta). |
| `-f, --format <fmt>` | `human` (default) o `json`. |

**Combinaciones típicas:**

```bash
# Crear un perfil nuevo (te pregunta core/satellite/tenant/initiative de forma interactiva)
evolith-cli profile create --name staging

# Cambiar al perfil de staging
evolith-cli profile switch --name staging

# Borrar un perfil que ya no usas
evolith-cli profile delete --name staging
```

**Qué esperar.** `current` y `list` devuelven la configuración y el perfil activo (marcado con `*` en modo humano). `create` sin `--name` abre un asistente interactivo que pregunta las rutas una a una (puedes dejarlas vacías). Los errores de uso —perfil inexistente, nombre duplicado— salen con código ≠ 0 en `--format json`.

### 8.2. `evolith-cli history` — historial de comandos

**Qué hace.** La CLI registra automáticamente cada comando que ejecutas (con timestamp, duración, éxito y código de salida). Este comando te deja listarlo, buscarlo, ver estadísticas de uso, inspeccionar una entrada concreta o limpiarlo. Útil para recordar "qué corrí ayer" o auditar tu propio uso.

**Uso básico:**

```bash
evolith-cli history              # últimas 20 entradas
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `-l, --list` | Lista las entradas recientes (comportamiento por defecto). |
| `-n, --limit <n>` | Cuántas entradas mostrar (default: 20). |
| `-g, --get <id>` | Muestra el detalle completo de una entrada por su ID. |
| `-s, --search <query>` | Busca entradas que coincidan con un texto. |
| `--stats` | Estadísticas: total, tasa de éxito, últimas 24 h y comandos más usados. |
| `--replay <id>` | Muestra (no ejecuta) el comando de una entrada, listo para copiar. |
| `--clear` | Borra todo el historial (pide confirmación en modo humano). |
| `-f, --format <fmt>` | `human` (default) o `json`. |

**Combinaciones típicas:**

```bash
# Ver los últimos 50 comandos
evolith-cli history --limit 50

# Buscar todas las validaciones que corriste
evolith-cli history --search validate

# Revisar el detalle de una entrada concreta
evolith-cli history --get a1b2c3
```

**Qué esperar.** Una tabla `ID | Hora | Comando | Estado | Duración` en modo humano (✓/✗ por resultado), o el arreglo de entradas en JSON. Ojo: `--replay` **no vuelve a ejecutar** el comando, solo te lo imprime para que lo lances tú. `--clear` es destructivo y permanente.

### 8.3. `evolith-cli alias` — alias de comandos

**Qué hace.** Define atajos propios para comandos que tecleas seguido. Un alias mapea un nombre corto a una cadena de comando, para que `evolith-cli v` corra lo que tú quieras.

**Uso básico:**

```bash
evolith-cli alias --list
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `--add <alias=command>` | Crea un alias con la sintaxis `nombre=comando`. |
| `--remove <alias>` | Elimina un alias existente. |
| `--list` | Lista todos los alias definidos. |
| `-f, --format <fmt>` | `human` (default) o `json`. |

**Combinaciones típicas:**

```bash
# Crear un atajo para validar contra el Core vecino
evolith-cli alias --add "v=validate -c ../evolith-core"

# Quitarlo
evolith-cli alias --remove v
```

**Qué esperar.** Confirmación del alias creado/eliminado, o la lista de mapeos. Si `--add` no trae el formato `alias=comando`, obtienes `VALIDATION_FAILED` (código ≠ 0 en JSON). Sin ninguna flag, el comando te recuerda usar `--add`, `--remove` o `--list`.

### 8.4. `evolith-cli fixtures` — sembrar datos de ejemplo

**Qué hace.** Genera archivos de ejemplo reproducibles —un `evolith.yaml`, ADRs, rulesets— en un directorio, para montar rápido una demo, un caso de prueba o un satélite mínimo con el que experimentar. Puedes previsualizar antes de escribir.

**Uso básico:**

```bash
evolith-cli fixtures demo        # siembra evolith.yaml + ADRs de ejemplo
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `[type]` (posicional) o `-t, --type <type>` | Qué sembrar: `demo` (default), `adr`, `ruleset`, `evolith`, `full`. |
| `-d, --dir <directory>` | Directorio destino (default: directorio actual). |
| `-n, --dry-run` | Previsualiza qué archivos se crearían, sin escribir nada. |
| `-f, --format <fmt>` | `human` (default) o `json`. |

**Combinaciones típicas:**

```bash
# Ver qué crearía el set completo, sin tocar el disco
evolith-cli fixtures full --dry-run

# Sembrar solo ADRs en un directorio concreto
evolith-cli fixtures adr --dir ./sandbox

# Sembrar todo (evolith.yaml + ADRs + rulesets)
evolith-cli fixtures full
```

**Qué esperar.** La lista de archivos creados (o marcados `[dry-run]`). Un `type` inválido devuelve `VALIDATION_FAILED`; si algún archivo no se puede escribir, el envelope trae `IO_ERROR` con el detalle por archivo y sale con código ≠ 0.

### 8.5. `evolith-cli api` — explorador de la API

**Qué hace.** Navega y describe la superficie de Evolith sin salir de la terminal: las herramientas (tools) y recursos MCP, los esquemas de compuertas de fase y los comandos de la CLI, con sus schemas de entrada/salida. Sirve como referencia rápida cuando construyes un agente o un cliente y necesitas saber qué operaciones existen y qué reciben.

**Uso básico:**

```bash
evolith-cli api --list                     # lista las categorías disponibles
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `-l, --list` | Lista las categorías, o el contenido de una si añades `--category`. |
| `-c, --category <cat>` | Acota a una categoría: `tools`, `resources`, `schemas`, `commands`. |
| `-i, --inspect <name>` | Muestra el schema detallado de una tool, recurso o comando. |
| `-f, --format <fmt>` | `human` (default) o `json`. |

**Combinaciones típicas:**

```bash
# Listar todas las herramientas MCP
evolith-cli api --list --category tools

# Inspeccionar el schema de entrada/salida de una tool
evolith-cli api --inspect gate-evaluate

# Inspeccionar un recurso MCP por su URI
evolith-cli api --inspect evolith://rulesets
```

**Qué esperar.** En `--list` sin categoría, el catálogo de categorías; con `--category`, sus entradas. En `--inspect`, la descripción más el `inputSchema`/`outputSchema` (tools), el `mimeType` (recursos) o las opciones (comandos). Un nombre desconocido devuelve `VALIDATION_FAILED` con sugerencias de ejemplos válidos.

### 8.6. `evolith-cli completion` — autocompletado de shell

**Qué hace.** Genera e instala scripts de autocompletado (tab-completion) y funciones de hook para tu shell, de modo que la terminal complete comandos y muestre estado del proyecto (`evolith_status`, `evolith_phase`, `evolith_gate`, …). Detecta tu shell automáticamente a partir de `$SHELL`.

**Uso básico:**

```bash
evolith-cli completion                     # muestra la ayuda y el shell detectado
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `--install <shell>` | Instala el autocompletado para `bash`, `zsh` o `fish` (edita tu rc o copia el script). |
| `--shell <shell>` | Fuerza un shell concreto en lugar del autodetectado. |
| `--hooks` | Imprime las funciones de hook por stdout (para revisarlas o redirigirlas). |
| `--install-hooks <shell>` | Instala esas funciones de hook en el shell indicado. |

**Combinaciones típicas:**

```bash
# Instalar autocompletado para zsh (lo añade a ~/.zshrc)
evolith-cli completion --install zsh

# Instalar también las funciones de hook de estado
evolith-cli completion --install-hooks zsh
```

**Qué esperar.** Confirmación de dónde se instaló y qué recargar (`source ~/.zshrc`, `fish -l`, …). `--hooks` vuelca el script tal cual para que lo inspecciones. Si ya estaba instalado, te lo dice sin duplicar entradas. A diferencia del resto del grupo, este comando **no** usa el envelope JSON: emite texto de shell directo.

### 8.7. `evolith-cli update` — mantener la CLI al día

**Qué hace.** Consulta el registro npm para saber si hay una versión más nueva de la propia CLI (`@beyondnet/evolith-cli`) y, si la hay, la instala por ti. Sin flags, solo muestra ayuda.

**Uso básico:**

```bash
evolith-cli update --check                 # comprueba si hay actualización
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `-c, --current` | Muestra la versión instalada y la última publicada. |
| `--check` | Comprueba contra el registro npm si hay una versión más reciente. |
| `-i, --install` | Instala la última versión (`npm install -g`). |
| `-f, --format <fmt>` | `human` (default) o `json`. |

**Combinaciones típicas:**

```bash
# Ver en qué versión estás y cuál es la última
evolith-cli update --current

# Actualizar a la última si aplica
evolith-cli update --install
```

**Qué esperar.** El campo `updateAvailable` (o el aviso `⚠ Update available: X → Y`). `--install` lanza `npm install -g` y confirma la versión resultante; si no alcanza el registro, devuelve `IO_ERROR` (código ≠ 0). Requiere red y permisos para instalación global de npm.

### 8.8. `evolith-cli chat` — interacción conversacional con el Agent Runtime

**Qué hace.** Envía una intención en lenguaje natural al Agent Runtime de Evolith, que la interpreta y ejecuta a través de la capa agéntica. Es la puerta conversacional ("Evolith CLI Chat") para pedir acciones sin recordar comandos exactos. Corre en **dry-run por defecto** (planifica sin aplicar), salvo que lo desactives.

**Uso básico:**

```bash
evolith-cli chat "valida la fase de construcción"
```

**Opciones principales:**

| Opción | Para qué |
| --- | --- |
| `<mensaje>` (posicional) | La intención a procesar; se toma de todos los argumentos sueltos. |
| `--dry-run [boolean]` | Controla el modo simulación; por defecto simula. Pasa `--dry-run false` para permitir efectos. |
| `-f, --format <fmt>` | `human` (default) o `json`. |

**Combinaciones típicas:**

```bash
# Simular (por defecto) el efecto de una intención
evolith-cli chat "genera el andamiaje de un frontend react"

# Permitir que la intención aplique cambios reales
evolith-cli chat "crea el evolith.yaml inicial" --dry-run false
```

**Qué esperar.** En modo humano, el `status` del run, un `summary` y el número de `findings`. En JSON, el resultado completo del Agent Runtime. Si no pasas mensaje, te lo pide. Como depende del Agent Runtime, su disponibilidad y su comportamiento están sujetos a esa capa; empieza siempre por el dry-run antes de habilitar efectos.

## 9. Encadenar comandos — un flujo típico de construcción

Los comandos se combinan en un flujo. Un ciclo habitual mientras construyes:

```bash
# 1. Genera el andamiaje (si aplica)
evolith-cli scaffold --frontend react --orm prisma --phase 1 --dry-run   # primero simula
evolith-cli scaffold --frontend react --orm prisma --phase 1             # luego escribe

# 2. Valida lo construido y revisa deriva
evolith-cli validate -s . -c ../evolith-core --phase construction
evolith-cli drift --path .

# 3. Evalúa y confirma la compuerta de la fase
evolith-cli evaluate --workspace . -c ../evolith-core --phase construction
evolith-cli gate evaluate --phase construction -s . -c ../evolith-core
```

Como cada comando **sale con código ≠ 0** si su veredicto es negativo, este
mismo bloque sirve tal cual en un pipeline de CI: se detiene en el primer paso
que no pase.

---

> **Guías equivalentes.** Esta es la guía de la interfaz **CLI**. Un usuario
> que opera vía **MCP** (agentes) o **REST** (integración/Tracker) tiene su
> propia guía con el mismo formato: [Usando MCP](using-the-mcp.es.md) y
> [Usando la API REST](using-the-rest-api.es.md).
