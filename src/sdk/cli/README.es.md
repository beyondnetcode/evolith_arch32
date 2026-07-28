# @beyondnet/evolith-cli

Interfaz de línea de comandos para Evolith — gobernanza, validación de estándares, scaffolding de arquitectura, gestión del ciclo de vida SDLC e integración con agentes IA.

## Visión General

SmartCLI es el punto de entrada principal al ecosistema Evolith. Conecta tres capas:

```
repositorio satélite
       │
       ▼
  evolith-cli  ──────── evolith.yaml (configuración)
       │
       ├── Evolith Core (rulesets, ADRs, estándares, evidencia de gates)
       │
       └── Servidor MCP ──── Agentes IA (Cursor, Claude Desktop, propios)
```

## Arquitecturas Soportadas

Evolith Core define **8 topologías de arquitectura** a través de dimensiones complementarias. Cualquier comando que acepte `--topology` las referencia por su id canónico:

| Topología (id) | Nombre | Dimensión |
|---------------|------|-----------|
| `modular-monolith` | Monolito Modular | eje progresivo |
| `distributed-modules` | Módulos Distribuidos | eje progresivo |
| `microservices` | Microservicios | eje progresivo |
| `serverless` | Serverless | ejecución |
| `edge-computing` | Edge Computing | ejecución |
| `event-driven` | Orientada a Eventos | integración |
| `data-mesh` | Data Mesh | datos |
| `agentic-ai` | Agentic AI | ia |

El **eje progresivo** (`modular-monolith → distributed-modules → microservices`) es una progresión lineal de madurez gestionada por el comando `upgrade`. Las demás dimensiones (ejecución, integración, datos, ia) son complementarias y se eligen según las necesidades del proyecto.

> **Legado `F1/F2/F3`:** versiones anteriores usaban `--arch F1|F2|F3` mapeando al eje progresivo (`F1 = modular-monolith`, `F2 = distributed-modules`, `F3 = microservices`). Estos flags están **deprecados** — usa `--topology <id>` con los ids canónicos anteriores. (Las antiguas etiquetas "Microfrontend / Microfrontend Distribuido" son obsoletas y ya no reflejan el corpus.)

## Instalación

```bash
npm install -g @beyondnet/evolith-cli
```

```bash
pnpm add -g @beyondnet/evolith-cli
```

```bash
yarn global add @beyondnet/evolith-cli
```

O descarga el binario desde [GitHub Releases](https://github.com/beyondnetcode/evolith_arch32/releases) y agrégalo a tu PATH.

### Verificar

```bash
evolith-cli --version
# 1.1.4
```

### Solución de Problemas

**EACCES en macOS/Linux:**
```bash
sudo npm install -g @beyondnet/evolith-cli --unsafe-perm
```

**nvm — binario no encontrado tras instalar:**
```bash
export PATH=$(npm config get prefix)/bin:$PATH
```

**`WORKSPACE_ROOT` (opcional):** la CLI incluye un workflow SDLC por defecto, así que funciona sin configurar nada. Define `WORKSPACE_ROOT` apuntando a la raíz de un checkout solo si quieres sobreescribir el workflow/rulesets desde disco (`$WORKSPACE_ROOT/rulesets/sdlc/default-workflow.yaml`).

### Variables de entorno

La CLI funciona sin configuración. Las siguientes variables son overrides opcionales. Las marcadas *(MCP)* las lee únicamente el paquete incluido `@beyondnet/evolith-mcp` mientras `evolith-mcp` está en ejecución.

| Variable | Leída por | Propósito |
|---|---|---|
| `EVOLITH_PROFILE` | CLI | Selecciona el perfil con nombre activo (valores por defecto por entorno) en lugar de `default`. |
| `EVOLITH_API_KEY` | CLI / MCP | API key para el transporte HTTP del MCP (equivalente a `--api-key`); requerida en modo HTTP de producción. |
| `PORT` | CLI / MCP | Puerto HTTP por defecto para `evolith-mcp serve --transport http` cuando se omite `--port` (por defecto `3000`). |
| `OTEL_ENABLED` | CLI | Cuando es `true`, habilita la exportación de trazas OpenTelemetry desde la CLI. |
| `WORKSPACE_ROOT` | Core | Raíz del checkout para sobreescribir el workflow/rulesets incluidos desde disco (ver arriba). |
| `MCP_HTTP_HOST` *(MCP)* | MCP | Host de enlace para el transporte HTTP (por defecto `0.0.0.0`; usa `127.0.0.1` para acceso local). |
| `JWT_SECRET` *(MCP)* | MCP | Secreto HS256 que habilita la autenticación JWT bearer opcional en el transporte HTTP. |
| `LOG_LEVEL` *(MCP)* | MCP | Nivel de detalle de logs del servidor MCP (por defecto `info`). |
| `NODE_ENV` *(MCP)* | MCP | `production` fuerza el comportamiento fail-closed de auth/policy en el servidor MCP. |

## Inicio Rápido

```bash
# 1. Sembrar un proyecto demo para explorar la CLI
evolith fixtures --type demo

# 2. Inicializar ESTE directorio como satélite (--name nombra el proyecto en
#    evolith.yaml; --yes ejecuta sin preguntas). Pasa un directorio posicional
#    para andamiar en uno nuevo: `evolith init mi-sat --yes`.
evolith init --name mi-sat --yes

# 3. Generar la documentación base
evolith docs

# 4. Validar cumplimiento — mismo directorio, sin `cd` tras el paso 2
evolith validate

# 5. Conectar un agente IA (servidor MCP independiente, paquete aparte)
evolith-mcp serve
```

Dos cosas que este inicio rápido NO afirma, porque medirlo dijo lo contrario
(GT-571, GT-626):

**El `validate` del paso 4 es una línea base, no un aprobado.** Un satélite recién
inicializado reporta hallazgos bloqueantes de reglas que asumen un repositorio más
completo — 91 de 230 incidencias, medido contra la 1.2.1 el 2026-07-28. Sale con `2`
(veredicto bloqueante, según la taxonomía de exit codes de arriba), que es la
respuesta honesta y no un fallo de la instalación. Llevar ese número a cero es
trabajo abierto en GT-571.

**`scaffold` no forma parte de este inicio rápido, porque no puede ir detrás de
`init`.** `evolith scaffold` ejecuta generadores de `nx` dentro de `./src`, y aquí
nada crea un workspace Nx ahí — `init` andamia el satélite *alrededor* de `src/`, no
un workspace Nx *dentro*. Úsalo solo en un repositorio que ya tenga `src/nx.json`, y
pásale las decisiones que no tienen valor por defecto para que corra desatendido:

```bash
evolith scaffold --phase 1 --frontend react --orm prisma --domains construction
```

Quién debe crear ese workspace se sigue en GT-626.

---

## Comandos

### init

Inicializa un repositorio satélite con selección interactiva de herramientas. Crea `evolith.yaml` y la estructura del proyecto.

```bash
evolith-cli init [opciones]

Opciones:
  -d, --dry-run          Ejecuta sin escribir archivos
  -c, --config <ruta>    Ruta a evolith.setup.json para modo batch
  -r, --runtime <id>     Runtime: nodejs, dotnet, python
  -m, --monorepo <id>    Estrategia monorepo: none, nx, npm-workspaces, rush
  -a, --arch <id>        Patrón de arquitectura: clean, hexagonal, ddd
      --db <id>          Base de datos: postgresql, mongodb, sqlserver
```

**Ejemplos:**

```bash
# Wizard interactivo
evolith-cli init

# Modo batch (no interactivo)
evolith-cli init --config evolith.setup.json

# Previsualizar sin escribir
evolith-cli init --dry-run
```

Tras completar `init`, la CLI imprime los siguientes pasos sugeridos, incluyendo `validate`, `agents --install` y `sdlc handoff`.

---

### init-wizard

Una alternativa totalmente guiada, paso a paso, a `init` que recorre nombre del proyecto, runtime, estrategia de monorepo y patrón de arquitectura con prompts interactivos. Úsalo para una configuración inicial asistida; usa `init` (con flags o `--config`) para ejecuciones automatizadas o no interactivas.

```bash
evolith-cli init-wizard [opciones]

Opciones:
      --no-wizard        Usa el flujo estándar de init en lugar del asistente
      --no-interactive   Ejecuta en modo no interactivo (CI/automatización)
```

---

### docs

Genera los archivos de documentación base que Evolith requiere en el directorio actual.

Archivos creados por defecto:
- `README.md` — plantilla de visión general del proyecto
- `AGENTS.md` — configuración y reglas de agentes IA
- `MASTER_INDEX.md` — índice de documentación
- `.evolith/evolith.yaml` — configuración de Evolith

```bash
evolith-cli docs [opciones]

Opciones:
  -d, --dry-run          Previsualiza archivos sin escribir
  -f, --force            Sobreescribe archivos existentes
  -t, --template <tipo>  Tipo de plantilla: default (los 4 archivos), minimal (solo README + AGENTS)
      --format <formato> Formato de salida: json (envelope ADR-0073) o human (por defecto)
```

**Ejemplos:**

```bash
# Generar toda la documentación
evolith-cli docs

# Previsualizar lo que se crearía
evolith-cli docs --dry-run

# Scaffold mínimo
evolith-cli docs --template minimal

# Forzar sobreescritura y emitir envelope JSON
evolith-cli docs --force --format json
```

---

### validate

Valida el cumplimiento del repositorio contra los estándares de Evolith. Soporta múltiples motores, rulesets, topologías y fases SDLC.

```bash
evolith-cli validate [opciones]

Opciones:
  -s, --satellite <ruta>   Ruta al repositorio satélite (por defecto: cwd)
  -c, --core <ruta>        Ruta a Evolith Core (por defecto: auto-detect)
  -f, --format <formato>   Formato de salida: json, table, yaml, markdown (por defecto: markdown)
  -o, --output <archivo>   Escribe la salida a un archivo
  -r, --ruleset <id>       Valida un ruleset específico (ver tabla abajo)
  -e, --engine <motor>     Motor de validación: native (por defecto) u opa
  -t, --topology <id>      Topología a validar por id canónico, p. ej. modular-monolith,
                           microservices, serverless, event-driven, agentic-ai (repetible).
                           Los alias legacy F1/F2/F3 siguen mapeando al eje progresivo.
  -m, --manifest <ruta>    SatelliteManifest JSON para evaluación end-to-end (pipeline GT-281)
  -p, --phase <fase>       Fase SDLC a evaluar: discovery, design, construction, qa, release (legacy f1..f5 deprecado; activa pipeline GT-281)
      --adr <id>           Validar contra un conjunto de reglas ADR específico
      --file <ruta>        Validar un solo archivo (modo ad-hoc)
      --composable         Usar el motor composable GT-312 con resolución inteligente de modos
```

**Rulesets disponibles (`--ruleset`):**

| ID | Valida |
|----|-----------|
| `acl` | Reglas de la capa de control de acceso |
| `open-core` | Límites de módulos open-core |
| `inheritance` | Contratos de herencia y extensión |
| `cli-release` | Preparación de release de la CLI |
| `cli-parity` | Paridad de comandos CLI entre versiones |
| `evidence` | Completitud de artefactos de evidencia de gates |
| `mcp` | Cumplimiento del contrato del servidor MCP |
| `observability` | Cobertura de logging, métricas y trazas |
| `adr-0002` | Reglas específicas de ADR-0002 |

El enum `rulesets` de `reference/config/evolith.config.schema.json` reconoce además: `satellite-contracts`, `executive-scorecards`, `compliance-baseline`, `definition-of-done`, `engineering-manifesto`, `repository-taxonomy`, `phase-gates`, `quality-thresholds` y `dependency-pinning`. Son valores de configuración válidos aunque los atajos `--ruleset` de arriba cubran el conjunto del día a día.

**Reglas ADR disponibles (`--adr`):** `adr-0002`, `adr-0005`, `adr-0010`, `adr-0018`, `adr-0032`, `adr-0040`, `adr-0050`

**Motores de validación:**
- `native` — motor TypeScript integrado (por defecto, sin dependencias externas)
- `opa` — módulos WebAssembly de Open Policy Agent

**Motor composable (GT-312):**
Cuando se activa `--composable`, la CLI resuelve automáticamente qué modos de validación activar según el contexto proporcionado:
- `SdlcValidationMode` — se activa cuando hay `--phase`
- `ArchitectureValidationMode` — se activa cuando hay `--topology`
- `RulesetValidationMode` — se activa cuando hay `--ruleset`
- `AdrValidationMode` — se activa cuando hay `--adr`
- `AdhocValidationMode` — se activa cuando hay `--file`

**Códigos de salida:** `validate` sale con `0` cuando el repositorio pasa (incluido el estado `warning`) y con `1` cuando el estado del resultado es `failed`. Los comandos `gate`, `phase advance` y `scaffold` también salen con `1` ante un fallo, y cualquier error no controlado durante el arranque de la CLI sale con `1`. Esto hace que la CLI sea segura para condicionar pipelines de CI. En `--format json`, el detalle del fallo viaja en el sobre ADR-0073 en lugar de imprimirse como texto.

**Ejemplos:**

```bash
# Chequeo básico de cumplimiento
evolith-cli validate

# Salida JSON para CI
evolith-cli validate --format json --output report.json

# Validar una sola topología
evolith-cli validate --topology microservices

# Validar múltiples topologías
evolith-cli validate --topology modular-monolith --topology event-driven

# Validar un ruleset específico
evolith-cli validate --ruleset evidence

# Evaluación completa de fase SDLC (pipeline GT-281)
evolith-cli validate --phase discovery

# Validar con un SatelliteManifest
evolith-cli validate --manifest ./satellite-manifest.json --phase design

# Validación ad-hoc de un archivo
evolith-cli validate --file src/domain/user.entity.ts --composable

# Motor OPA
evolith-cli validate --engine opa --ruleset acl
```

---

### adr

Gestiona Architecture Decision Records.

```bash
evolith-cli adr [opciones]

Opciones:
  -c, --create           Crear un nuevo ADR (interactivo)
  -l, --list             Listar todos los ADRs
  -g, --get <id>         Mostrar un ADR específico
  -u, --update <id>      Actualizar el estado de un ADR
  -s, --status <estado>  Nuevo estado: Accepted, Deprecated, Superseded, Amended
  -r, --reason <texto>   Razón del cambio de estado
  -m, --matrix           Mostrar el resumen de la matriz de ADRs
  -d, --dry-run          Previsualizar sin escribir archivos
```

**Ejemplos:**

```bash
# Creación interactiva
evolith-cli adr --create

# Listar todos
evolith-cli adr --list

# Mostrar un ADR específico
evolith-cli adr --get ADR-0002

# Actualizar estado
evolith-cli adr --update ADR-0005 --status Accepted --reason "Aprobado en revisión de diseño"

# Mostrar matriz
evolith-cli adr --matrix
```

---

### standards

Gestiona los estándares de gobernanza de Evolith (arquitectura, gobernanza, operaciones).

```bash
evolith-cli standards [opciones]

Opciones:
      --init             Inicializar la estructura de directorios de standards
  -l, --list             Listar todos los standards
  -g, --get <id>         Mostrar un standard específico
  -v, --validate <code>  Validar código contra los standards
  -e, --export <id>      Exportar un standard
  -f, --format <formato> Formato de exportación: markdown, json
  -c, --category <id>    Filtrar por categoría
```

**Ejemplos:**

```bash
# Inicializar
evolith-cli standards --init

# Listar todos los standards
evolith-cli standards --list

# Filtrar por categoría
evolith-cli standards --list --category governance

# Exportar como markdown
evolith-cli standards --export STD-001 --format markdown
```

---

### agents

Gestiona los agentes BMAD de Evolith — instala, lista y elimina agentes de gobernanza en el repositorio satélite.

```bash
evolith-cli agents [opciones]

Opciones:
  -l, --list             Listar agentes instalados
  -i, --install [name]   Instalar un agente nombrado (interactivo si se omite el nombre)
  -r, --remove [name]    Eliminar un agente instalado
  -d, --dry-run          Previsualizar sin hacer cambios
```

**Plantillas de agente disponibles:**

| Plantilla | Descripción |
|---|---|
| `standard` | Agente por defecto con reglas básicas de gobernanza (ACL-01 a ACL-06) |
| `minimal` | Agente ligero solo con reglas esenciales |
| `full-compliance` | Agente de cumplimiento completo con audit trail y cadenas de aprobación |

**Ejemplos:**

```bash
# Listar agentes instalados
evolith-cli agents --list

# Instalación interactiva
evolith-cli agents --install

# Instalar una plantilla específica
evolith-cli agents --install standard
evolith-cli agents --install full-compliance

# Previsualizar instalación sin escribir
evolith-cli agents --install standard --dry-run

# Eliminar un agente
evolith-cli agents --remove minimal
```

---

### scaffold

Genera la arquitectura de Evolith en el workspace actual **a lo largo del eje progresivo** — fase 1 (`modular-monolith`), fase 2 (`distributed-modules`) y fase 3 (`microservices`). Las fases 2–3 se generan como un host + remotes de Module Federation (microfrontends), con frameworks de frontend, ORMs y nombres de dominio configurables. (`F1/F2/F3` siguen aceptándose como alias legacy de las fases 1/2/3.)

```bash
evolith-cli scaffold [opciones]

Opciones:
      --frontend <framework>   Framework frontend: react, angular
      --orm <orm>              ORM: prisma, typeorm
  -d, --dry-run                Previsualizar sin escribir archivos
  -f, --format <formato>       Formato de salida: json (envelope ADR-0073) o human (por defecto)
      --phase <fase>           Fase de arquitectura: 1 (F1), 2 (F2), 3 (F3) — requerida con --format json
      --api-name <name>        Nombre de la app backend (por defecto: tracker-api)
      --web-app-name <name>    Nombre de la web app para fase 1 (por defecto: tracker-web)
      --host-name <name>       Nombre de la app host para fase 2/3 (por defecto: tracker-host)
      --remotes <names>        Nombres de remotes separados por comas para fase 2/3
      --domains <names>        Nombres de dominio separados por comas a generar
```

**Ejemplos:**

```bash
# Scaffold de fase 1 (Monolito Modular) interactivo
evolith-cli scaffold

# Scaffold de fase 1 con React + Prisma, dry run
evolith-cli scaffold --phase 1 --frontend react --orm prisma --dry-run

# Scaffold de fase 2 (Microfrontend) con nombres personalizados
evolith-cli scaffold --phase 2 --host-name shell-app --remotes catalog,checkout

# Scaffold de fase 3 con dominios personalizados y salida JSON
evolith-cli scaffold --phase 3 --domains orders,payments,users --format json

# Generar solo dominios específicos
evolith-cli scaffold --domains auth,notifications
```

---

### drift

Detecta drift de arquitectura entre el nivel de topología declarado y la estructura real del código. Guarda histórico para análisis de tendencias.

```bash
evolith-cli drift [opciones]

Opciones:
  -p, --path <ruta>    Ruta del proyecto a analizar (por defecto: cwd)
  -l, --level <nivel>  Nivel de arquitectura declarado: F1, F2, F3
      --json           Salida como JSON crudo
      --history        Mostrar el histórico de escaneos de drift
      --trend          Mostrar el análisis de tendencia de drift (mejorando / estable / degradando)
  -f, --format <fmt>   Formato de salida: json (envelope ADR-0073) o human (por defecto)
```

El reporte de drift incluye:
- **Nivel declarado** vs **nivel detectado**
- **Score general** (0–100%)
- **Severidad del drift**: critical, high, medium, low, none
- **Violaciones nuevas** — introducidas desde el último escaneo
- **Violaciones persistentes** — no resueltas a través de varios escaneos
- **Violaciones resueltas** — corregidas desde el último escaneo

**Ejemplos:**

```bash
# Detectar drift (auto-detecta el nivel declarado desde evolith.yaml)
evolith-cli drift

# Especificar el nivel declarado explícitamente
evolith-cli drift --level F2

# Analizar una ruta de proyecto diferente
evolith-cli drift --path ../my-satellite

# Mostrar escaneos históricos
evolith-cli drift --history

# Mostrar tendencia (requiere al menos 2 escaneos previos)
evolith-cli drift --trend

# Salida JSON para CI
evolith-cli drift --format json
```

---

### gate

Evalúa los phase gates SDLC y emite artefactos `GateEvidence` ADR-0073. Soporta entrega por webhook y contextos multi-actor.

```bash
evolith-cli gate <acción> [opciones]

Acciones:
  evaluate    Evaluar gates para la fase indicada

Opciones:
  -p, --phase <fase>          Fase SDLC: discovery, design, construction, qa, release
      --project <ruta>        Ruta del proyecto satélite (por defecto: cwd)
  -c, --core <ruta>           Ruta a Evolith Core (por defecto: auto-detect)
  -f, --format <formato>      Formato de salida: json (envelope ADR-0073) o human (por defecto)
      --evaluated-by <actor>  Clase de actor: human (por defecto), agent, ci
      --initiative <id>       Contexto de iniciativa — reflejado en meta.context
      --tenant <id>           Contexto de tenant — reflejado en meta.context
      --webhook-url <url>     POST de la evidencia del gate a esta URL al completar
```

**Ejemplos:**

```bash
# Evaluar gates de la fase design
evolith-cli gate evaluate --phase design

# Evaluación CI con salida JSON
evolith-cli gate evaluate --phase construction --evaluated-by ci --format json

# Evaluación dirigida por agente con entrega por webhook
evolith-cli gate evaluate --phase qa --evaluated-by agent --webhook-url https://ci.example.com/hooks/evolith

# Contexto multi-tenant
evolith-cli gate evaluate --phase release --tenant acme --initiative Q3-launch
```

---

### phase

Propone una transición entre fases SDLC. Emite un artefacto de propuesta de transición.

```bash
evolith-cli phase advance [opciones]

Opciones:
      --from <fase>           Fase SDLC actual
      --to <fase>             Fase SDLC objetivo
      --project <ruta>        Ruta del proyecto satélite (por defecto: cwd)
  -c, --core <ruta>           Ruta a Evolith Core (por defecto: auto-detect)
  -f, --format <formato>      Formato de salida: json (envelope ADR-0073) o human (por defecto)
      --evaluated-by <actor>  Clase de actor: human, agent (por defecto), ci
      --initiative <id>       Contexto de iniciativa — reflejado en meta.context
      --tenant <id>           Contexto de tenant — reflejado en meta.context
      --webhook-url <url>     POST de la propuesta de transición a esta URL
```

**Ejemplos:**

```bash
# Proponer avanzar de design a construction
evolith-cli phase advance --from design --to construction

# Dirigido por agente con salida JSON
evolith-cli phase advance --from construction --to qa --evaluated-by agent --format json

# Con webhook y contexto de tenant
evolith-cli phase advance --from qa --to release --webhook-url https://ci.example.com/hooks/evolith --tenant acme
```

---

### sdlc

Comando padre que orquesta los artefactos SDLC y las transiciones del ciclo de vida. Ejecútalo sin subcomando para ver los subcomandos disponibles.

```bash
evolith-cli sdlc <subcomando>

Subcomandos:
  handoff       Transferir artefactos entre fases con flujo guiado interactivo
  generate      Generar scaffold de Arquitectura Hexagonal desde un archivo de modelo DDD
  gate-status   Mostrar el estado de validación de phase gates y métricas DORA
```

#### sdlc handoff

Guía una transición de fase interactiva, valida gates y genera artefactos de evidencia.

```bash
evolith-cli sdlc handoff [opciones]

Opciones:
  -f, --from <fase>    Fase origen (phase-0, phase-1, etc.)
  -t, --to <fase>      Fase destino (phase-0, phase-1, etc.)
  -a, --artifacts      Generar artefactos de evidencia
      --validate       Validar los phase gates antes del handoff
      --force          Forzar el handoff aunque los gates fallen
```

**Ejemplos:**

```bash
# Wizard de handoff interactivo
evolith-cli sdlc handoff

# Handoff de phase-0 a phase-1 con validación de gates
evolith-cli sdlc handoff --from phase-0 --to phase-1 --validate

# Generar artefactos y forzar aunque los gates fallen
evolith-cli sdlc handoff --from phase-1 --to phase-2 --artifacts --force
```

#### sdlc generate

Genera un scaffold completo de Arquitectura Hexagonal leyendo un `classDiagram` de Mermaid desde un archivo de modelo DDD en Markdown.

```bash
evolith-cli sdlc generate [opciones]

Opciones:
  -f, --from <ruta>   Ruta al archivo Markdown que contiene el classDiagram de Mermaid
  -o, --output <dir>  Directorio destino para los archivos generados (por defecto: cwd)
      --dry-run       Imprimir lo que se generaría sin escribir archivos
```

**Ejemplos:**

```bash
# Generar desde un archivo de modelo DDD
evolith-cli sdlc generate --from docs/domain-model.md

# Previsualizar sin escribir
evolith-cli sdlc generate --from docs/domain-model.md --dry-run

# Salida a un directorio específico
evolith-cli sdlc generate --from docs/domain-model.md --output src/domain
```

El archivo de entrada debe contener un bloque Mermaid con cercado (fenced) que incluya un `classDiagram`. El generador crea entidades, value objects, repositorios, casos de uso y puertos siguiendo las convenciones de la arquitectura hexagonal.

#### sdlc gate-status

Muestra el estado actual de validación de phase gates SDLC junto con métricas DORA calculadas a partir del histórico de git.

```bash
evolith-cli sdlc gate-status [opciones]

Opciones:
  --since <días>   Días de histórico de git a analizar para las métricas DORA (por defecto: 90)
```

Métricas DORA reportadas:
- **Deployment Frequency** — con qué frecuencia despliega el equipo a producción
- **Lead Time for Changes** — tiempo desde el commit hasta producción
- **Change Failure Rate** — porcentaje de despliegues que causan fallos
- **Time to Restore** — tiempo para recuperarse de un fallo en producción

**Ejemplos:**

```bash
# Estado de gates con ventana DORA de 90 días
evolith-cli sdlc gate-status

# Analizar solo los últimos 30 días
evolith-cli sdlc gate-status --since 30
```

---

### profile

Gestiona perfiles de CLI nombrados. Cada perfil guarda un conjunto de valores por defecto (ruta del satélite, ruta de core, tenant, iniciativa) que se aplican automáticamente a los comandos posteriores.

```bash
evolith-cli profile <acción> [opciones]

Acciones:
  current   Mostrar el perfil activo
  list      Listar todos los perfiles
  create    Crear un nuevo perfil
  switch    Cambiar a un perfil nombrado
  delete    Eliminar un perfil

Opciones:
  -n, --name <name>   Nombre del perfil (usado con create y switch)
```

**Ejemplos:**

```bash
# Mostrar el perfil actual
evolith-cli profile current

# Listar todos los perfiles
evolith-cli profile list

# Crear un perfil interactivamente
evolith-cli profile create

# Crear con nombre
evolith-cli profile create --name staging

# Cambiar de perfil
evolith-cli profile switch --name staging

# Eliminar un perfil
evolith-cli profile delete --name staging
```

---

### fixtures

Siembra archivos de fixtures reproducibles para demos, tests y onboarding. El primer paso recomendado en cualquier entorno nuevo.

```bash
evolith-cli fixtures [tipo] [opciones]

Argumentos:
  tipo   Tipo de fixture (por defecto: demo)

Opciones:
  -d, --dir <directorio>  Directorio destino (por defecto: cwd)
  -n, --dry-run           Previsualizar archivos sin escribir
  -t, --type <tipo>       Tipo de fixture: demo, adr, ruleset, evolith, full
```

**Tipos de fixture:**

| Tipo | Contenido |
|------|----------|
| `demo` | Proyecto de ejemplo con evolith.yaml y estructura demo |
| `adr` | Entradas ADR pre-pobladas |
| `ruleset` | Rulesets de ejemplo (dominio, naming, convenciones de archivos) |
| `evolith` | Archivos de configuración completos de Evolith |
| `full` | Todo lo anterior combinado |

**Ejemplos:**

```bash
# Sembrar un proyecto demo (la forma más rápida de explorar la CLI)
evolith-cli fixtures --type demo

# Previsualizar lo que se crearía
evolith-cli fixtures --type full --dry-run

# Sembrar fixtures ADR en un directorio específico
evolith-cli fixtures --type adr --dir ./reference/core/architecture/adrs
```

---

### api

Navega e inspecciona la superficie de API de Evolith: herramientas MCP, recursos, schemas y comandos CLI.

```bash
evolith-cli api [opciones]

Opciones:
  -l, --list                  Listar todas las operaciones de API disponibles
  -i, --inspect <name>        Inspeccionar una operación, recurso o comando específico
  -c, --category <category>   Filtrar por categoría: tools, resources, schemas, commands
```

**Ejemplos:**

```bash
# Listar todo
evolith-cli api --list

# Filtrar solo herramientas MCP
evolith-cli api --list --category tools

# Inspeccionar una herramienta específica
evolith-cli api --inspect evolith-validate

# Inspeccionar el schema de un comando CLI
evolith-cli api --inspect validate --category commands
```

---

### update

Comprueba y aplica actualizaciones de la CLI.

```bash
evolith-cli update [opciones]

Opciones:
  -c, --current   Mostrar la versión instalada actual de la CLI
      --check     Comprobar actualizaciones disponibles sin instalar
  -i, --install   Instalar la última versión disponible
```

**Ejemplos:**

```bash
# Mostrar la versión actual
evolith-cli update --current

# Comprobar actualizaciones
evolith-cli update --check

# Instalar la última
evolith-cli update --install
```

---

### upgrade

Actualiza un repositorio satélite a la siguiente topología del eje progresivo o versión de gobernanza.

```bash
evolith-cli upgrade [opciones]

Opciones:
      --dry-run          Simular el upgrade sin hacer cambios
      --target <target>  Versión de gobernanza o topología objetivo (p. ej., F2, 1.1.0)
      --force            Saltar las comprobaciones de elegibilidad
```

**Ejemplos:**

```bash
# Previsualizar upgrade a la siguiente topología
evolith-cli upgrade --dry-run

# Upgrade a F2
evolith-cli upgrade --target F2

# Forzar upgrade ignorando las comprobaciones de elegibilidad
evolith-cli upgrade --target F3 --force
```

---

### alias

Gestiona alias abreviados para comandos de la CLI.

```bash
evolith-cli alias [opciones]

Opciones:
  --add <alias=comando>   Agregar un nuevo alias (formato: nombre=comando)
  --remove <alias>        Eliminar un alias
  --list                  Listar todos los alias
```

**Ejemplos:**

```bash
# Agregar un alias
evolith-cli alias --add "v=validate --format table"

# Listar alias
evolith-cli alias --list

# Eliminar un alias
evolith-cli alias --remove v
```

---

### history

Visualiza y gestiona el histórico de ejecución de comandos de la CLI.

```bash
evolith-cli history [opciones]

Opciones:
  -l, --list             Listar comandos recientes
  -g, --get <id>         Mostrar detalles del comando por ID
  -s, --search <query>   Buscar en el histórico
      --stats            Mostrar estadísticas del histórico
      --clear            Limpiar todo el histórico
  -n, --limit <número>   Número de entradas a mostrar (por defecto: 20)
      --replay <id>      Mostrar la cadena del comando de una entrada del histórico
```

**Ejemplos:**

```bash
# Mostrar los últimos 20 comandos
evolith-cli history

# Mostrar los últimos 50
evolith-cli history --limit 50

# Buscar ejecuciones de validate
evolith-cli history --search validate

# Mostrar estadísticas
evolith-cli history --stats

# Limpiar histórico
evolith-cli history --clear
```

---

### completion

Genera e instala scripts de autocompletado de shell. También provee funciones hook de shell para mostrar contexto y estado.

```bash
evolith-cli completion [opciones]

Opciones:
  --install <shell>   Instalar autocompletado para el shell indicado: bash, zsh, fish
  --shell <shell>     Generar script de autocompletado para el shell indicado (imprime a stdout)
  --hooks             Generar funciones hook de shell para contexto/estado
```

**Ejemplos:**

```bash
# Instalar autocompletado zsh
evolith-cli completion --install zsh

# Instalar autocompletado bash
evolith-cli completion --install bash

# Instalar autocompletado fish
evolith-cli completion --install fish

# Imprimir el script de autocompletado a stdout (para configuración manual)
evolith-cli completion --shell zsh

# Generar funciones hook
evolith-cli completion --hooks
```

Los scripts pre-construidos también vienen incluidos en el paquete bajo `shell/`:
- `shell/completion.bash`
- `shell/completion.zsh`
- `shell/completion.fish`
- `shell/hooks.bash`
- `shell/hooks.zsh`

---

## Servidor MCP

Evolith distribuye un servidor MCP independiente, `@beyondnet/evolith-mcp`, para la integración con agentes IA. Ejecútalo con el binario `evolith-mcp` (o `npx @beyondnet/evolith-mcp serve`).

### Iniciar el Servidor

```bash
# Transporte stdio (por defecto — para Cursor, Claude Desktop)
evolith-mcp serve

# Transporte HTTP (para despliegues remotos o en contenedor)
evolith-mcp serve --transport http --port 3000

# HTTP con autenticación por API key
evolith-mcp serve --transport http --port 3000 --api-key <secret>
```

```bash
evolith-mcp [acción] [opciones]

Acciones:
  serve       Iniciar el servidor MCP (por defecto)
  version     Imprime el banner de versión del servidor MCP

Opciones:
  -t, --transport <stdio|http>   Transporte: stdio (por defecto) o http
  -p, --port <número>            Puerto del servidor HTTP (por defecto: 3000, o $PORT)
      --api-key <key>            API key para autenticación del transporte HTTP (o $EVOLITH_API_KEY)
      --no-confirm               Saltar los prompts de confirmación
```

### Smoke Test

```bash
npm run mcp:smoke
```

Verifica `initialize`, `tools/list`, `resources/list`, `prompts/list` y un `tools/call` real de extremo a extremo a través de la CLI construida.

### Herramientas MCP Disponibles

El servidor incluido registra **27 herramientas**. El conjunto vigente y autoritativo siempre se puede explorar con `evolith-cli api --list --category tools`; la tabla siguiente refleja el registro actual de `@beyondnet/evolith-mcp`.

**Validación y arquitectura**

| Herramienta | Descripción |
|------|-------------|
| `evolith-validate` | Validar un repositorio satélite contra las reglas de Evolith (pipeline end-to-end vía manifest) |
| `evolith-composable-validate` | Validar con el motor composable (GT-312): modos SDLC, Architecture, Ruleset, ADR, Ad-hoc (combinables) |
| `evolith-architecture-validate` | Validar la arquitectura contra la topología declarada con análisis profundo opcional |
| `evolith-drift-detect` | Detectar drift de arquitectura en un repositorio |
| `evolith-auto-fix` | Aplicar correcciones automáticas a violaciones arquitectónicas reportadas por los evaluadores de reglas de Core |
| `evolith-topology-list` | Listar todas las topologías de arquitectura disponibles en Evolith Core |
| `evolith-topology-get` | Obtener una topología de arquitectura específica por id |

**SDLC, gates y métricas**

| Herramienta | Descripción |
|------|-------------|
| `evolith-gate-evaluate` | Evaluar un phase gate SDLC específico |
| `evolith-phase-advance` | Proponer una transición de fase SDLC evaluando los criterios de salida |
| `evolith-sdlc-handoff` | Realizar un handoff de phase gate (p. ej. phase-0 → phase-1) |
| `evolith-sdlc-status` | Obtener el estado actual de la fase SDLC |
| `evolith-dora-metrics` | Calcular aproximaciones de métricas DORA desde el histórico de git |
| `evolith-metrics` | Obtener métricas del servidor MCP (conteos de llamadas por herramienta, latencia, fallos) |

**Agentes**

| Herramienta | Descripción |
|------|-------------|
| `evolith-agent-install` | Instalar un nuevo agente BMAD |
| `evolith-agent-list` | Listar agentes instalados |
| `evolith-agent-validate` | Validar un ruleset de agente |
| `evolith-agent-upgrade` | Actualizar un agente existente |
| `evolith-agent-remove` | Eliminar un agente |

**Configuración**

| Herramienta | Descripción |
|------|-------------|
| `evolith-config-get` | Obtener un valor de configuración de Evolith |
| `evolith-config-set` | Establecer un valor de configuración de Evolith |

**Priorización MoSCoW**

| Herramienta | Descripción |
|------|-------------|
| `evolith-moscow-create` | Crear un nuevo análisis de priorización MoSCoW |
| `evolith-moscow-load` | Cargar un análisis MoSCoW existente |
| `evolith-moscow-update` | Actualizar un ítem en un análisis MoSCoW |
| `evolith-moscow-remove` | Eliminar un ítem de un análisis MoSCoW |
| `evolith-moscow-list` | Listar todos los análisis MoSCoW de un repositorio |
| `evolith-moscow-validate` | Validar la corrección de un análisis MoSCoW |
| `evolith-moscow-report` | Generar un reporte markdown desde un análisis MoSCoW |

### Configuración para Cursor AI

Añade a `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith-cli",
      "args": ["mcp", "serve"]
    }
  }
}
```

### Configuración para Claude Desktop

Añade a `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith-cli",
      "args": ["mcp", "serve"]
    }
  }
}
```

### Transporte HTTP (despliegue remoto)

```json
{
  "mcpServers": {
    "evolith": {
      "url": "http://localhost:3000",
      "headers": { "x-api-key": "<secret>" }
    }
  }
}
```

---

## Integración CI/CD

### Validación de Fase SDLC (Pipeline GT-281)

```bash
# Validar una fase SDLC específica con evaluación completa de gates
evolith-cli validate --phase design --format json --output gate-evidence.json

# Con SatelliteManifest explícito
evolith-cli validate --manifest ./satellite-manifest.json --phase construction --format json
```

### Evaluación de Gates en CI

```bash
# Evaluar gates de construction desde CI
evolith-cli gate evaluate \
  --phase construction \
  --evaluated-by ci \
  --format json \
  --webhook-url $WEBHOOK_URL
```

### Ejemplo de GitHub Actions

```yaml
- name: Evolith Gate Evaluation
  run: |
    evolith-cli gate evaluate \
      --phase ${{ env.SDLC_PHASE }} \
      --evaluated-by ci \
      --format json \
      --output gate-evidence.json
  env:
    SDLC_PHASE: construction
```

---

## Configuración

Evolith usa `evolith.yaml` en `.evolith/` o en la raíz del repositorio:

```yaml
coreRef:
  version: "1.0.0"
  path: "../../evolith"

governance:
  version: "1.0"
  adrRegistry:
    - id: "ADR-0001"
      status: "accepted"

product:
  name: "my-project"
  type: "library"
  runtime: "typescript"
```

### Perfiles Multi-Entorno

```bash
# Crear un perfil por entorno
evolith-cli profile create --name local
evolith-cli profile create --name staging
evolith-cli profile create --name ci

# Cambiar antes de ejecutar comandos
evolith-cli profile switch --name staging
evolith-cli validate
```

---

## Formatos de Salida

La mayoría de comandos aceptan `--format`:

```bash
# Legible para humanos (por defecto en la mayoría de comandos)
evolith-cli validate

# Markdown
evolith-cli validate --format markdown

# Tabla
evolith-cli validate --format table

# YAML
evolith-cli validate --format yaml

# JSON (envelope ADR-0073 — para automatización y CI)
evolith-cli validate --format json
```

---

## Solución de Problemas

**Comando no encontrado tras instalar:**
```bash
export PATH="$(npm config get prefix)/bin:$PATH"
```

**La validación falla sin evolith.yaml:**
```bash
evolith-cli docs         # generar evolith.yaml y docs base
evolith-cli validate
```

**El servidor MCP no responde:**
```bash
evolith-mcp --no-confirm
```

**Topología desconocida en scaffold o drift:**
Asegúrate de que tu `evolith.yaml` tenga un campo `product.topology` válido usando un id de topología canónico — `modular-monolith`, `distributed-modules`, `microservices`, `serverless`, `edge-computing`, `event-driven`, `data-mesh` o `agentic-ai` (según `reference/config/evolith.config.schema.json`). `F1/F2/F3` legacy se aceptan solo como flags CLI deprecados, no como valores de manifest.

---

## Desarrollo

### Construir desde el Código Fuente

```bash
cd sdk/cli
npm install
npm run build
npm link
```

### Tests

```bash
npm test               # unit + e2e
npm run test:unit      # solo unit
npm run test:e2e       # solo e2e
npm run test:cov       # reporte de cobertura
npm run mcp:smoke      # smoke test del protocolo MCP
```

### Estructura del Proyecto

```
sdk/cli/
├── src/
│   ├── commands/       # Comandos CLI (un directorio por comando)
│   ├── config/         # Catálogo de runtimes, matriz de comandos CLI, alias
│   ├── contributions/  # Validación de contribuciones
│   ├── infrastructure/ # Config, filesystem, formatters, prompts, plugins
│   └── plugins/        # Registro y módulo de plugins
├── shell/              # Autocompletado y hooks Bash, Zsh, Fish
├── templates/          # Plantillas de configuración
├── test/               # Suite de tests E2E
└── docs/               # Documentación extendida
```

### Documentación Extendida

- [Guía Demo](docs/SMART-CLI-DEMO.es.md) — recorrido end-to-end de todos los comandos y flujos SDLC
- [Visión](docs/VISION.es.md) — visión y roadmap de la CLI
- [Modelos de Datos](docs/data-models.es.md) — referencia del modelo de datos del dominio
- [Integración MCP](docs/MCP-INTEGRATION.md) — detalles del protocolo del servidor MCP
- [Protocolo de Handoff](docs/HANDOFF-PROTOCOL.md) — especificación del artefacto de handoff SDLC

---

## Contribuir

Consulta el [CONTRIBUTING.md](../../../CONTRIBUTING.md) en la raíz del repositorio para el flujo completo, las convenciones de ramas/commits y los estándares de autoría.

1. Haz un fork del repositorio
2. Crea una rama de feature
3. Realiza cambios con tests
4. Envía un pull request

---

## Licencia

MIT

## Soporte

- [Issue Tracker](https://github.com/beyondnetcode/evolith_arch32/issues)
- [Discussions](https://github.com/beyondnetcode/evolith_arch32/discussions)
- [Documentación](https://github.com/beyondnetcode/evolith_arch32#readme)
