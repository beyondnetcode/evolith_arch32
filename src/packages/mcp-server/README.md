# @beyondnet/evolith-mcp-server

## Evolith MCP Gateway — First-Class Model Context Protocol Server

> **Bilingual navigation:** [Versión en Español](./README.es.md)

Desacopla el servidor MCP del CLI. Es un producto de primera clase que expone las herramientas MCP como un **Gateway** que se comunica con `@beyondnet/evolith-core` (capa de lógica de negocio reutilizable), en lugar de ejecutar subprocesos del CLI.

---

## Tabla de contenidos

1. [Diagrama de Arquitectura](#diagrama-de-arquitectura)
2. [Transportes](#transportes)
3. [Instalación y configuración](#instalación-y-configuración)
4. [Autenticación](#autenticación)
5. [Herramientas disponibles (47)](#herramientas-disponibles-27)
6. [Resources disponibles (9 + dinámicos)](#resources-disponibles-9--dinámicos)
7. [Prompts disponibles (8)](#prompts-disponibles-8)
8. [Operaciones mutativas](#operaciones-mutativas)
9. [Arquitectura interna](#arquitectura-interna)
10. [Casos de uso con agentes](#casos-de-uso-con-agentes)
11. [Configuración de clientes](#configuración-de-clientes)
12. [Integración con SmartCLI](#integración-con-smartcli)
13. [Guía de extensión](#guía-de-extensión)
14. [Observabilidad](#observabilidad)
15. [Buenas prácticas](#buenas-prácticas)
16. [Troubleshooting](#troubleshooting)

---

## Diagrama de Arquitectura

```mermaid
sequenceDiagram
    participant Agent as "AI Agent<br/>(Cursor, Claude Desktop, Custom)"
    participant Gateway as "MCP Gateway<br/>@beyondnet/evolith-mcp-server"
    participant Core as "Business Logic<br/>@beyondnet/evolith-core"
    participant FS as "File System"
    participant Git as "Git"

    Note over Agent,Gateway: Transport: stdio (local) or Streamable HTTP (remote)

    Agent->>+Gateway: tools/call { name: "evolith-validate", args: { path: "/repo" } }

    Gateway->>Gateway: 1. Generate correlationId (evl-xxx)
    Gateway->>Gateway: 2. Lookup tool in ToolRegistry
    Gateway->>Gateway: 3. ABAC authorization check
    Gateway->>Gateway: 4. Start timing + structured log (Pino)

    Gateway->>+Core: ValidateSatelliteUseCase.execute({ satellitePath })
    Core->>+FS: Read evolith.yaml, rulesets/
    FS-->>-Core: Configuration + rule definitions

    Core->>+Git: Check ADR history, phase state
    Git-->>-Core: Phase & commit data

    Core->>Core: Evaluate rules (Native + OPA)
    Core-->>-Gateway: ValidationResult { status, issues }

    Gateway->>Gateway: 5. Wrap in SuccessEnvelope { success, data, meta }
    Gateway->>Gateway: 6. Audit log + completion duration

    Gateway-->>-Agent: { content: [{ type: "text", text: "{...}" }] }

    Note over Agent,Gateway: All errors wrapped in ErrorEnvelope with EvolithErrorCode
```

---

## Transportes

| Transporte | Uso | Comando |
|---|---|---|
| **stdio** (JSON-RPC 2.0) | Agentes locales, Cursor, Claude Desktop | `evolith-mcp serve` |
| **Streamable HTTP** (SDK oficial MCP) | Agentes remotos, escalabilidad | `evolith-mcp serve --transport http --port 49100` |

> El **puerto por defecto es `3000`** (`main.ts`: env `PORT` o `--port`, fallback `3000`). El `49100` de los ejemplos es un valor arbitrario, no el default.
>
> Los logs siempre se escriben a **stderr** (Pino), porque stdout está reservado para el stream JSON-RPC del transporte stdio.

---

## Instalación y configuración

### Instalación

```bash
# Desde el monorepo
npm install @beyondnet/evolith-mcp-server

# O globalmente
npm install -g @beyondnet/evolith-mcp-server
```

### Uso

```bash
# stdio (default) — para Cursor, Claude Desktop, etc.
evolith-mcp serve

# HTTP — para integración remota
evolith-mcp serve --transport http --port 49100
```

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `TRANSPORT` | `stdio` | Transporte activo: `stdio` o `http` |
| `PORT` | `3000` | Puerto para transporte HTTP |
| `MCP_HTTP_HOST` | `0.0.0.0` | Host de bind del servidor HTTP. Usar `127.0.0.1` para local-only |
| `EVOLITH_API_KEY` | — | API key para autenticación en transporte HTTP |
| `EVOLITH_MCP_ALLOW_NO_AUTH` | `false` | Permite arrancar HTTP sin API key (solo no-producción). Ignorado en `production` |
| `JWT_SECRET` | — | Secreto opcional para validar Bearer JWT (HS256) además del API key |
| `NODE_ENV` | `development` | En `production` la auth HTTP es obligatoria |
| `LOG_LEVEL` | `info` | Nivel de log Pino: `trace`, `debug`, `info`, `warn`, `error` |
| `REDIS_URL` | — | URL de Redis para caché de resources (ej: `redis://localhost:6379`). La caché es opcional. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | Endpoint OpenTelemetry para tracing |
| `OTEL_SERVICE_NAME` | `evolith-mcp-server` | Nombre del servicio en los traces |

> El binario también acepta los flags `--transport`/`-t`, `--port`/`-p`, `--api-key` y `--allow-no-auth`, además del subcomando `evolith-mcp version`.

---

## Autenticación

### Transporte stdio

No requiere autenticación. El proceso es local y ejecutado directamente por el agente.

### Transporte HTTP

En producción (`NODE_ENV=production`) la autenticación es **obligatoria**: `validateAuth()` ignora `EVOLITH_MCP_ALLOW_NO_AUTH` y rechaza todo request sin credencial válida (401). El valor de `EVOLITH_API_KEY` es un secreto arbitrario (cualquier string; **no** requiere prefijo) que se compara por igualdad. Se acepta en cualquiera de estos dos headers:

```
Authorization: Bearer <EVOLITH_API_KEY>
x-api-key: <EVOLITH_API_KEY>
```

`/health` es público (probe de liveness) y no requiere credencial.

> El `ApiKeyProvisioningService` (abajo) es un mecanismo **avanzado y opcional** para emitir keys con prefijo `evk_`, hash SHA-256 y TTL. Es independiente del `EVOLITH_API_KEY` de arranque descrito aquí.

### Aprovisionamiento de API keys

El `ApiKeyProvisioningService` gestiona el ciclo de vida de las keys:

| Operación | Descripción |
|---|---|
| `generateKey(label, options)` | Genera una key con prefijo `evk_`, hash SHA-256, TTL configurable (default 90 días) |
| `validateKey(rawKey)` | Valida la key contra el hash almacenado y verifica expiración |
| `rotateKey(keyId)` | Revoca la key actual y genera una nueva para el mismo cliente |
| `revokeKey(keyId)` | Revoca una key inmediatamente |

Las keys tienen scopes: `read`, `write`, `admin`. Se asocian a un `tenant`.

### Modelo ABAC

El `AbacEvaluator` controla qué tools puede invocar cada usuario según sus roles:

| Tipo de tool | Roles permitidos | Entorno |
|---|---|---|
| Read (list, get, status) | Todos los roles autenticados | Cualquiera |
| Write (fix, install, set) | `operator`, `sre`, `architect`, `admin` | Cualquiera |
| Write | `developer`, `qa` | Solo no-producción |
| Deploy (deploy, publish, merge) | `architect`, `admin`, `operator`, `sre` | Cualquiera |
| Deploy | Cualquiera excepto `architect` | **Bloqueado en producción** |

**Códigos ABAC:**

| Código | Causa |
|---|---|
| `ABAC-01` | Tool denegada para el rol/entorno del usuario |
| `ABAC-02` | Usuario sin roles — todas las tools denegadas |
| `ABAC-03` | Tool no clasificada en ningún grupo conocido |

**Clasificación de tools (heurística por substring).** Los conjuntos de roles internos son `DEVELOPER = {developer, qa}`, `OPERATOR = {operator, sre}`, `ARCHITECT = {architect, admin}`. La clasificación read/write/deploy de cada tool es heurística sobre su nombre (`abac-evaluator.ts`): cuenta como **read** si el nombre contiene `read`/`list`/`get` (o no empieza por `evolith-`); como **write** si contiene `write`/`replace`/`run`/`fix`/`advance`; como **deploy** si contiene `deploy`/`publish`/`merge`. Por esa heurística `evolith-phase-advance` se clasifica como **write** (substring `advance`), aunque solo proponga la transición. Una tool que no encaje en ningún grupo se rechaza con `ABAC-03`.

**Precedencia de autenticación (HTTP).** El guard (`mcp-server-auth.ts`) evalúa primero la **API key**: si el `Authorization: Bearer <token>` o el header `x-api-key` coincide con `EVOLITH_API_KEY`, otorga un contexto `admin` (rol `admin`, todas las tools permitidas). Solo si la key no coincide y `JWT_SECRET` está definido se intenta validar el Bearer como **JWT HS256**; en ese caso los `roles` del payload JWT son los que alimentan ABAC. `/health` es público. En producción la auth es obligatoria (ignora `EVOLITH_MCP_ALLOW_NO_AUTH`).

---

## Herramientas disponibles (47)

Las tools se obtienen en runtime via `tools/list`. Todas retornan datos crudos que el Gateway envuelve en `SuccessEnvelope` o `ErrorEnvelope`.

### Validación

| Tool | Descripción | Mutativa |
|---|---|---|
| `evolith-validate` | Valida un repositorio contra las reglas de gobernanza Evolith (GOV, INH, ACL, OCB) | No |
| `evolith-composable-validate` | Validación multi-modo combinable: SDLC, Architecture, Ruleset, ADR, Ad-hoc | No |

**Schema `evolith-composable-validate`:**

```json
{
  "path": "string (requerido) — ruta al repositorio satelital",
  "corePath": "string — ruta al Core de Evolith",
  "engine": "'native' | 'opa' — motor de evaluación (default: native)",
  "topology": "'modular-monolith' | 'microservices' | 'serverless' | ... — activa modo Architecture",
  "phase": "'discovery' | 'design' | 'construction' | 'qa' | 'release' — activa modo SDLC (el schema también acepta los alias legacy 'f1'..'f5', deprecados)",
  "ruleset": "string — activa modo Ruleset",
  "adr": "'adr-0002' | 'adr-0005' | 'adr-0010' | ... — activa modo ADR",
  "file": "string — activa modo Ad-hoc sobre un archivo"
}
```

Los modos se activan combinando campos. Se pueden usar varios en una sola llamada.

---

### Arquitectura

| Tool | Descripción | Mutativa |
|---|---|---|
| `evolith-architecture-validate` | Valida un proyecto satelital contra las reglas de arquitectura | No |
| `evolith-drift-detect` | Detecta drift entre la arquitectura declarada y la real | No |

---

### Topologías

| Tool | Descripción | Mutativa |
|---|---|---|
| `evolith-topology-list` | Lista todas las topologías de arquitectura disponibles en Evolith Core | No |
| `evolith-topology-get` | Obtiene el manifiesto completo de una topología por ID | No |

**Schema `evolith-topology-list`:**

```json
{
  "corePath": "string — ruta al Core (opcional, default: ../evolith)"
}
```

**Schema `evolith-topology-get`:**

```json
{
  "id": "string (requerido) — ID de la topología (ej: modular-monolith)",
  "corePath": "string — ruta al Core (opcional)"
}
```

**Topologías disponibles:** `modular-monolith`, `distributed-modules`, `microservices`, `serverless`, `edge-computing`, `event-driven`, `data-mesh`, `agentic-ai`

---

### Gates SDLC

| Tool | Descripción | Mutativa |
|---|---|---|
| `evolith-gate-evaluate` | Evalúa un phase gate específico del SDLC | No |
| `evolith-phase-advance` | Propone una transición de fase | No¹ |

> ¹ `evolith-phase-advance` solo propone la transición — no la ejecuta. La ejecución es responsabilidad del operador o del Tracker.

---

### SDLC

| Tool | Descripción | Mutativa |
|---|---|---|
| `evolith-sdlc-status` | Obtiene el estado actual de la fase SDLC del repositorio | No |
| `evolith-sdlc-handoff` | Ejecuta el handoff de fase generando el manifiesto de evidencia | **Sí** |
| `evolith-dora-metrics` | Aproxima métricas DORA desde el historial de Git: deployment frequency, lead time (aprox.), total y merge commits en la ventana (`days`, default 90) | No |

---

### MoSCoW

| Tool | Descripción | Mutativa |
|---|---|---|
| `evolith-moscow-create` | Crea una matriz MoSCoW para una fase del proyecto | No² |
| `evolith-moscow-load` | Carga una matriz MoSCoW existente | No |
| `evolith-moscow-update` | Actualiza ítems en la matriz MoSCoW | No² |
| `evolith-moscow-remove` | Elimina ítems de la matriz | No² |
| `evolith-moscow-list` | Lista las matrices MoSCoW del proyecto | No |
| `evolith-moscow-validate` | Valida que la matriz está bien formada | No |
| `evolith-moscow-report` | Genera un reporte de priorización MoSCoW | No |

> ² Las tools MoSCoW escriben en `.evolith/moscow/{phase}.json` pero **no** declaran `mutative: true` en el código (`moscow.tools.ts`), por lo que el dispatcher **no** exige `apply`/`approvalToken`. Trátalas como operaciones de escritura no protegidas por el guard mutativo.

---

### Agentes

| Tool | Descripción | Mutativa |
|---|---|---|
| `evolith-agent-install` | Instala un agente Evolith en el repositorio | **Sí** |
| `evolith-agent-list` | Lista los agentes instalados | No |
| `evolith-agent-validate` | Valida la configuración de un agente | No |
| `evolith-agent-upgrade` | Actualiza un agente a la última versión del template | **Sí** |
| `evolith-agent-remove` | Elimina un agente del repositorio | **Sí** |

---

### Remediación

| Tool | Descripción | Mutativa |
|---|---|---|
| `evolith-auto-fix` | Aplica correcciones automáticas a las violations detectadas | **Sí** |

---

### Configuración

| Tool | Descripción | Mutativa |
|---|---|---|
| `evolith-config-get` | Obtiene valores de configuración del `evolith.yaml` | No |
| `evolith-config-set` | Actualiza valores en el `evolith.yaml` | **Sí** |

---

### Observabilidad

| Tool | Descripción | Mutativa |
|---|---|---|
| `evolith-metrics` | Retorna métricas internas del MCP Gateway (calls, latency, errors) | No |

---

## Resources disponibles (9 + dinámicos)

Los resources se obtienen via `resources/list` y se leen via `resources/read`.

### Resources estáticos (`resources/list`)

| URI | Nombre | Descripción |
|---|---|---|
| `evolith://rulesets` | Rulesets | Lista todos los rulesets de Evolith Core |
| `evolith://phase-gates` | Phase Gates | Definiciones y requisitos de los phase gates |
| `evolith://agents` | Agents | Lista de agentes Evolith instalados |
| `evolith://core/info` | Core Info | Información general del Core (versión, total rulesets, capacidades) |
| `evolith://governance/version` | Governance Version | Versión del schema de gobernanza |
| `evolith://core/version` | Core Version | Versión del schema del Core |
| `evolith://repository/config` | Repository Config | Contenido del `evolith.yaml` del repositorio actual |
| `evolith://moscow/phase-0` | MoSCoW Phase 0 | Matriz MoSCoW para la fase de discovery |
| `evolith://architecture/topologies` | Architecture Topologies | Lista de todas las topologías disponibles |

### URIs dinámicos (accesibles via `resources/read`)

| URI Pattern | Descripción |
|---|---|
| `evolith://ruleset/{name}` | Contenido de un ruleset por nombre (ej: `evolith://ruleset/governance/base`) |
| `evolith://agent/{name}` | Definición de un agente instalado (ej: `evolith://agent/winston`) |
| `evolith://architecture/topology/{id}` | Manifiesto de una topología (ej: `evolith://architecture/topology/modular-monolith`) |
| `evolith://open-core/artifacts` | Reglas de boundary Open-Core (OCB) |
| `evolith://acl/rules` | Reglas Anti-Corruption Layer |
| `evolith://moscow/{phase}` | Análisis MoSCoW de cualquier fase (ej: `evolith://moscow/phase-1`) |

---

## Prompts disponibles (8)

Los prompts se obtienen via `prompts/list` y se invocan via `prompts/get`.

| Prompt | Descripción | Argumentos |
|---|---|---|
| `evolith/validate-repository` | Validar un repositorio contra reglas de gobernanza | `path` (req), `ruleset` (opt) |
| `evolith/agent-onboarding` | Instalar y configurar un nuevo agente | `name` (req), `template` (opt: standard/minimal/enterprise) |
| `evolith/architecture-review` | Review de arquitectura F1/F2/F3 | `path` (req), `level` (opt: F1/F2/F3) |
| `evolith/prepare-discovery` | Preparar artefactos de la fase de discovery | `path` (req) |
| `evolith/phase-gate-check` | Verificar readiness de phase gate | `path` (req) |
| `evolith/sdlc-handoff` | Ejecutar handoff de fase SDLC | `path` (req), `fromPhase` (req), `toPhase` (req) |
| `evolith/ruleset-analysis` | Analizar cumplimiento de un ruleset | `ruleset` (req), `path` (opt) |
| `evolith/moscow-prioritization` | Crear matriz MoSCoW para el SDLC | `path` (req), `phase` (opt, default: phase-0) |

---

## Operaciones mutativas

Las tools marcadas como mutativas (`mutative: true`) requieren **aprobación explícita** para prevenir cambios accidentales. El dispatcher ([`mcp-tool-dispatch.ts:137`](./src/mcp/mcp-tool-dispatch.ts)) rechaza la llamada con `FORBIDDEN` salvo que el request incluya **ambos** campos:

```json
{
  "name": "winston",
  "dir": "/path/to/repo",
  "apply": true,
  "approvalToken": "<token-no-vacío>"
}
```

- `apply` debe ser exactamente `true`.
- `approvalToken` debe ser un string no vacío. El servidor nunca lo registra en claro: lo reduce a un fingerprint `sha256:…` antes de auditarlo.

> El `approvalToken` es el contrato de aprobación a nivel de protocolo. Algunos schemas de tool aún declaran un campo `confirm` y existe el helper `isMutationAllowed()` (lee `mcp.allowMutations` de `evolith.yaml`), pero **el guard que realmente bloquea la ejecución en `handleCallTool` es `apply` + `approvalToken`** — `confirm` y `mcp.allowMutations` no lo sustituyen.

### Tools mutativas

| Tool | Operación |
|---|---|
| `evolith-agent-install` | Escribe archivos del agente en el repositorio |
| `evolith-agent-upgrade` | Sobrescribe la configuración del agente |
| `evolith-agent-remove` | Elimina el directorio del agente |
| `evolith-config-set` | Modifica `evolith.yaml` |
| `evolith-sdlc-handoff` | Genera el manifiesto de handoff y escribe estado |
| `evolith-auto-fix` | Aplica correcciones automáticas al código |

> Exactamente **6** tools declaran `mutative: true` en el código (`config-set`, `sdlc-handoff`, `agent-install`, `agent-upgrade`, `agent-remove`, `auto-fix`). Las tools MoSCoW escriben en disco pero **no** están marcadas como mutativas, por lo que el guard `apply`/`approvalToken` **no** aplica a ellas.

---

## Arquitectura interna

El Gateway es una aplicación **NestJS** (módulos + inyección de dependencias).

```
@beyondnet/evolith-mcp-server/
├── src/
│   ├── main.ts                         ← Bootstrap, parseArgs, arranque stdio/HTTP
│   ├── app.module.ts                   ← Módulo raíz
│   ├── common/
│   │   ├── errors.ts                   ← ErrorCodes + DomainException
│   │   ├── envelopes.ts                ← SuccessEnvelope / ErrorEnvelope + correlationId
│   │   └── stderr-logger.ts            ← LoggerService sobre Pino → stderr
│   ├── mcp/
│   │   ├── mcp.module.ts
│   │   ├── tool.interface.ts           ← interfaz McpTool + token MCP_TOOLS
│   │   ├── tool-registry.service.ts    ← registro dinámico de tools
│   │   ├── mcp-server.service.ts       ← MCP SDK Server + dispatch + transportes
│   │   ├── mcp-tool-dispatch.ts        ← dispatch con ABAC + audit + mutative guard
│   │   ├── mcp-server-auth.ts          ← autenticación HTTP (EVOLITH_API_KEY)
│   │   ├── abac-evaluator.ts           ← evaluador ABAC nativo + OPA
│   │   ├── api-key-provisioning.service.ts  ← ciclo de vida de API keys
│   │   ├── audit-logger.ts             ← log estructurado de cada tool call
│   │   ├── mcp-cache.service.ts        ← caché de resources en Redis
│   │   ├── metrics.service.ts          ← métricas internas del Gateway
│   │   ├── prompts.service.ts          ← serve prompts/list y prompts/get
│   │   └── resources.service.ts        ← serve resources/list y resources/read
│   ├── tools/
│   │   ├── tools.module.ts             ← registra todas las tools
│   │   ├── validate.tool.ts            ← evolith-validate
│   │   ├── composable-validate.tool.ts ← evolith-composable-validate (GT-312)
│   │   ├── architecture.tools.ts       ← evolith-architecture-validate, drift-detect
│   │   ├── topology.tools.ts           ← evolith-topology-list, topology-get
│   │   ├── gate.tools.ts               ← evolith-gate-evaluate
│   │   ├── phase-advance.tools.ts      ← evolith-phase-advance
│   │   ├── sdlc.tools.ts               ← sdlc-status, sdlc-handoff, dora-metrics
│   │   ├── moscow.tools.ts             ← moscow-create/load/update/remove/list/validate/report
│   │   ├── agent.tools.ts              ← agent-install/list/validate/upgrade/remove
│   │   ├── auto-fix.tools.ts           ← evolith-auto-fix
│   │   ├── config.tools.ts             ← config-get, config-set
│   │   └── metrics.tool.ts             ← evolith-metrics
│   ├── resources/
│   │   └── corpus-resource.handler.ts  ← handler de recursos de corpus documentales
│   ├── watcher/
│   │   └── watcher.service.ts          ← observa cambios en archivos del workspace
│   └── domain/
│       └── domain.module.ts            ← cablea @beyondnet/evolith-core con @beyondnet/evolith-infra-providers

@beyondnet/evolith-core               ← lógica de negocio (use-cases, validators, tipos)
@beyondnet/evolith-infra-providers    ← adapters (NodeFileSystem, YamlConfigParser, DiskRulesetRepository)
```

### WatcherService

`WatcherService` observa archivos del workspace (ej: `evolith.yaml`) para invalidar cachés o disparar revalidaciones cuando el usuario modifica la configuración mientras el Gateway está corriendo. Se activa automáticamente en transporte stdio de larga duración.

### CorpusResourceHandler

Maneja el acceso a recursos de corpus documentales (ADRs, playbooks, specs) para que los agentes puedan leer contexto arquitectural estructurado sin invocar tools mutativas.

---

## Casos de uso con agentes

### 1. Validación de repositorio desde Claude Desktop

```json
// prompts/get
{
  "name": "evolith/validate-repository",
  "arguments": { "path": "/Users/me/my-service" }
}
```

El prompt guía al agente a usar `evolith-validate` y reportar las violations bloqueantes.

### 2. Onboarding de agente desde Cursor

```json
// prompts/get
{
  "name": "evolith/agent-onboarding",
  "arguments": { "name": "guardian", "template": "enterprise" }
}
```

El agente invocará `evolith-agent-install` y `evolith-agent-validate` en secuencia.

### 3. Review de arquitectura automatizado

```json
// tools/call
{
  "name": "evolith-composable-validate",
  "arguments": {
    "path": "/repo",
    "topology": "modular-monolith",
    "phase": "design",
    "engine": "native"
  }
}
```

Combina validación SDLC + Architecture en una sola llamada.

### 4. Ciclo SDLC completo con MoSCoW + gate check

```
1. tools/call evolith-sdlc-status     → estado actual de la fase
2. tools/call evolith-moscow-create   → crear matriz de priorización
3. tools/call evolith-gate-evaluate   → evaluar gate de la fase actual
4. tools/call evolith-sdlc-handoff    → generar manifiesto de handoff
5. tools/call evolith-phase-advance   → proponer avance a la siguiente fase
```

### 5. Consultar topologías antes de validar

```json
// tools/call
{ "name": "evolith-topology-list" }
// → lista de topologías disponibles

{ "name": "evolith-topology-get", "arguments": { "id": "agentic-ai" } }
// → manifiesto completo con reglas y requisitos
```

---

## Configuración de clientes

### Cursor (`~/.cursor/config.json`)

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith-mcp",
      "args": ["serve"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith-mcp",
      "args": ["serve"]
    }
  }
}
```

### Agente custom (transporte HTTP)

```bash
# Arrancar el servidor HTTP
EVOLITH_API_KEY=evk_abc123 evolith-mcp serve --transport http --port 49100

# Llamar desde el agente
curl -X POST http://localhost:49100/mcp \
  -H "Authorization: Bearer evk_abc123" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"evolith-validate","arguments":{"path":"/repo"}},"id":1}'
```

---

## Integración con SmartCLI

### Plan de migración desde `evolith-cli mcp`

**Fase 1 — Coexistencia (actual):** `evolith-cli mcp` sigue funcionando. `evolith-mcp serve` es el nuevo punto de entrada.

**Fase 2 — Deprecación:** `evolith-cli mcp` mostrará `console.warn`. Migrar configuraciones de Cursor/Claude Desktop a `evolith-mcp`.

**Fase 3 — Remoción:** Eliminar código MCP de `@beyondnet/evolith-cli` en major version bump. El CLI conserva sus comandos de validación.

### Diferencias de comportamiento

| Aspecto | `evolith-cli mcp` (legacy) | `evolith-mcp` (nuevo) |
|---|---|---|
| Transporte | Solo stdio | stdio + Streamable HTTP |
| Auth | Sin auth | ABAC + API keys en HTTP |
| Caché | Sin caché | Redis opcional |
| Observabilidad | Logs básicos | Pino + OTEL + audit logger |
| Tools | Subconjunto | 47 tools completas |

---

## Guía de extensión

Para añadir una nueva herramienta:

1. Crear `src/tools/mi-herramienta.tool.ts` implementando `McpTool` (`schema`, `execute`; añadir `readonly mutative = true` si modifica estado).
2. Inyectar el servicio de dominio que necesite (desde `@beyondnet/evolith-core`).
3. Devolver datos crudos — `McpServerService` los envuelve automáticamente en `SuccessEnvelope` y captura errores en `ErrorEnvelope`.
4. Registrar la tool en `tools.module.ts`: añadir el provider y sumarlo al factory de `MCP_TOOLS`.

```typescript
import { Injectable } from "@nestjs/common";
import { McpTool, McpToolSchema } from "../mcp/tool.interface";

@Injectable()
export class MiHerramientaTool implements McpTool {
  readonly schema: McpToolSchema = {
    name: "evolith-mi-herramienta",
    description: "Descripción de lo que hace",
    inputSchema: {
      type: "object",
      properties: { param1: { type: "string", description: "..." } },
      required: ["param1"],
    },
  };

  async execute(args: Record<string, unknown>): Promise<unknown> {
    if (!args.param1) throw new Error("param1 is required");
    return { ok: true };
  }
}
```

Para tools mutativas, añadir `readonly mutative = true`. El dispatcher exigirá `{ "apply": true, "approvalToken": "..." }` en el request antes de ejecutar la tool.

---

## Observabilidad

### Logs Pino → stderr

Todos los logs van a `stderr` (nunca `stdout`). Formato JSON estructurado con `correlationId`, `tool`, `duration`, `success`.

```bash
# Ver logs en tiempo real (stdio)
evolith-mcp serve 2>&1 | grep '"level"'
```

### `evolith-metrics` tool

Retorna métricas internas del Gateway:

```json
{
  "uptimeMs": 1820345,
  "totalCalls": 142,
  "totalFailures": 4,
  "tools": {
    "evolith-validate": { "calls": 80, "failures": 1, "totalLatencyMs": 1440, "avgLatencyMs": 18 },
    "evolith-gate-evaluate": { "calls": 32, "failures": 0, "totalLatencyMs": 992, "avgLatencyMs": 31 }
  },
  "recentErrors": ["RULESET_NOT_FOUND: ..."]
}
```

### OpenTelemetry

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 \
OTEL_SERVICE_NAME=evolith-mcp-server \
evolith-mcp serve
```

### Audit Logger

Cada tool call queda registrada con: `toolName`, `userId`, `tenant`, `environment`, `allowed` (ABAC), `durationMs`, `correlationId`. Los registros van a `stderr` en formato JSON.

---

## Buenas prácticas

- **Usar prompts como punto de entrada** para workflows de agente — evitan que el agente tenga que razonar la secuencia de tools.
- **No confirmar mutativas en bulk** sin validar primero con las tools de lectura equivalentes.
- **Ejecutar `evolith-validate` antes de `evolith-auto-fix`** para conocer el scope real de los cambios.
- **En producción HTTP**, rotar las API keys cada 90 días y restringir scopes al mínimo necesario.
- **Redis es opcional pero recomendado** en instalaciones de larga duración para evitar lecturas repetidas de filesystem en `resources/read`.
- **Usar `evolith-composable-validate`** en lugar de llamadas separadas cuando se necesitan múltiples modos — reduce latencia y correlaciona los resultados.

---

## Troubleshooting

### stdio: logs aparecen mezclados con la respuesta MCP

Los logs van a `stderr`. Si el cliente mezcla stdout/stderr, separar los streams:

```bash
evolith-mcp serve 2>/tmp/mcp.log
```

### HTTP: `401 Unauthorized`

Verificar que `EVOLITH_API_KEY` está configurado en el servidor y que el request envía el mismo valor en `Authorization: Bearer <key>` o `x-api-key: <key>`. El valor se compara por igualdad exacta (no requiere prefijo `evk_`). En `NODE_ENV=production` la auth es obligatoria aunque `EVOLITH_MCP_ALLOW_NO_AUTH=true`.

### Tool no encontrada (`Tool not found in registry`)

La tool puede no estar registrada en `tools.module.ts`. Verificar que el provider está añadido y que el nombre en `schema.name` coincide exactamente con el invocado.

### `ABAC-02: No roles present`

El contexto de usuario (`mcp-user-context`) no tiene roles. En transporte HTTP, verificar que el JWT o el contexto de usuario lleva los claims de roles correctamente.

### Redis no disponible

La caché degrada gracefulmente. Los resources se servirán directamente desde el filesystem sin caché. Se emitirá un warning en los logs.

### OPA: `policy.wasm not found`

El evaluador OPA requiere `sdk/cli/rulesets/opa/policy.wasm` bajo `CORE_PATH`. El comportamiento ante una policy ausente es **fail-closed** (GT-348/349), no fail-open: si el archivo no existe y `NODE_ENV === "production"`, el evaluador retorna `allowed: false` con la violación `ABAC_POLICY_MISSING` (denegación dura). Solo en entornos **no productivos** el evaluador OPA se abstiene devolviendo `allowed: true` para delegar en la política nativa. Un error del motor OPA siempre deniega. Para forzar evaluación nativa, no especificar `engine: "opa"`.

---

## Licencia

ISC — Beyondnet
