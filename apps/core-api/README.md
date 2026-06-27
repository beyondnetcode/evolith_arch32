# @evolith/core-api — Evolith Core API Exposure Layer

> **Contexto arquitectural (ADR-0074).** Esta aplicación NestJS es la **capa de exposición REST** del dominio Core de Evolith. Es el boundary de red oficial que expone `@evolith/core-domain` sobre HTTP, y convive con `@evolith/mcp-server` (protocolo MCP para agentes) y `smart-cli` (CLI). Los consumidores externos —incluyendo el **Evolith Tracker**— la consumen como cliente HTTP.
>
> **Lo que NO es.** No es el BFF del Tracker. El BFF / Application Gateway del Tracker (ADR-0075) vive en el repositorio `evolith_tracker` y consume esta API como cliente externo.

---

## Tabla de contenidos

1. [Overview](#overview)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Configuración](#configuración)
5. [Autenticación y seguridad](#autenticación-y-seguridad)
6. [Endpoints](#endpoints)
7. [Modelos de datos](#modelos-de-datos)
8. [Flujos por tenant](#flujos-por-tenant)
9. [Fases, gates y artefactos](#fases-gates-y-artefactos)
10. [Topologías y blueprints](#topologías-y-blueprints)
11. [Swagger UI](#swagger-ui)
12. [Observabilidad](#observabilidad)
13. [Ejemplos prácticos](#ejemplos-prácticos)
14. [Troubleshooting](#troubleshooting)

---

## Overview

La **Core API** expone las capacidades del dominio Evolith sobre REST:

- Inicialización de proyectos y propuesta de avance de fase
- Evaluación de phase gates (PG0–PG5) del SDLC
- Transición de fases con orquestación de herramientas
- Validación de arquitectura satelital y detección de drift
- Catálogo de topologías de arquitectura con caché Redis
- Consulta de rulesets, gate definitions y requisitos por fase
- Validación compuesta multi-modo (SDLC, Architecture, Ruleset, ADR, Ad-hoc)
- Health probes, métricas Prometheus y tracing OpenTelemetry

Todos los responses siguen el **Envelope Pattern**: `{ success, data, meta }`.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        core-api (NestJS)                    │
│                                                             │
│  Presentation Layer                                         │
│  ├── ProjectsController    POST /projects/...               │
│  ├── PhasesController      POST /phases/...                 │
│  ├── GatesController       POST /gates/...                  │
│  ├── ArchitectureController GET+POST /architecture/...      │
│  ├── ReferenceController   GET /rulesets, /gates, /phases   │
│  ├── ComposableValidate    POST /validate/composable        │
│  ├── HealthController      GET /health[/live|/ready]        │
│  └── MetricsController     GET /metrics                     │
│                                                             │
│  Application Layer                                          │
│  ├── Use Cases (core-domain)                                │
│  └── WorkspaceReferenceResolverService                      │
│                                                             │
│  Infrastructure Layer                                       │
│  ├── Redis Cache (circuit breaker)                          │
│  ├── EnvelopeInterceptor                                    │
│  ├── DeprecationInterceptor                                 │
│  ├── SecurityAuditInterceptor                               │
│  ├── CorrelationIdMiddleware                                │
│  └── OpenTelemetry Tracing                                  │
└────────────────────────┬────────────────────────────────────┘
                         │ usa
                ┌────────▼────────┐
                │ @evolith/core-  │
                │ domain          │
                └────────┬────────┘
                         │ usa
                ┌────────▼────────┐
                │ @evolith/infra- │
                │ providers       │
                └─────────────────┘
```

### Versionado de API

Todos los endpoints de dominio usan **URI versioning** con el prefijo `api/v`:

```
/api/v1/projects/initialize
/api/v1/gates/:gateId/evaluate
```

Los endpoints `/health` y `/metrics` son **version-neutral** (sin prefijo) para compatibilidad con orquestadores.

### Envelope Pattern

Todos los responses de dominio se envuelven automáticamente:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "correlationId": "evl-abc123",
    "timestamp": "2026-06-27T10:00:00Z"
  }
}
```

En error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "workspaceRef is required",
    "details": [ ... ]
  },
  "meta": {
    "correlationId": "evl-abc123",
    "timestamp": "2026-06-27T10:00:00Z"
  }
}
```

---

## Instalación

### Prerrequisitos

- Node.js 20+
- Redis (opcional — la caché degrada gracefulmente sin él)
- Acceso al repositorio Evolith Core (para `CORE_PATH`)

### En el monorepo

```bash
# Desde la raíz del monorepo
npm install

# Build del paquete de dominio primero
npm run build --workspace=packages/core-domain

# Arrancar la API en modo desarrollo
npm run start:dev --workspace=apps/core-api
```

### Standalone

```bash
cd apps/core-api
npm install
npm run build
npm run start:prod
```

---

## Configuración

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto HTTP del servidor |
| `NODE_ENV` | `development` | Entorno: `development`, `production`, `test` |
| `CORE_PATH` | `process.cwd()` | **Ruta absoluta** al repositorio Evolith Core (contiene `rulesets/`, `reference/`, etc.) |
| `WORKSPACE_ROOT` | `/tmp/evolith-workspaces` | Directorio raíz donde el Tracker monta los workspace de los tenants |
| `ALLOWED_ORIGINS` | `*` | Orígenes CORS permitidos (legacy; preferir `CORS_ORIGINS` en prod) |
| `CORS_ORIGINS` | — | CSV de orígenes permitidos en producción (ej: `https://tracker.evolith.io,https://app.evolith.io`) |
| `SWAGGER_ENABLED` | — | `"true"` para forzar Swagger en producción. En `development` siempre activo. |
| `REDIS_URL` | — | URL completa Redis (ej: `redis://user:pass@host:6379`). Tiene prioridad sobre HOST/PORT. |
| `REDIS_HOST` | `localhost` | Host Redis |
| `REDIS_PORT` | `6379` | Puerto Redis |
| `REDIS_PASSWORD` | — | Contraseña Redis |

### Archivo `.env` de ejemplo

```bash
PORT=3000
NODE_ENV=development
CORE_PATH=/absolute/path/to/evolith
WORKSPACE_ROOT=/var/run/evolith/workspaces

# CORS — en producción, especificar orígenes explícitos
CORS_ORIGINS=https://tracker.evolith.io,https://app.evolith.io

# Swagger — forzar en producción si se necesita
SWAGGER_ENABLED=false

# Redis (opcional)
REDIS_URL=redis://localhost:6379
# O bien:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### CORS

- **`development`**: permite `*` (todos los orígenes)
- **`production`**: requiere `CORS_ORIGINS` con lista CSV de orígenes permitidos
- Métodos: `GET, POST, PUT, PATCH, DELETE`
- Headers: `Content-Type`, `x-correlation-id`
- Credentials: habilitadas en producción

---

## Autenticación y seguridad

### Estado actual

Los endpoints de Core-API **no requieren autenticación propia** en la capa REST. La autenticación y autorización se delegan al Tracker BFF (ADR-0075), que emite `workspaceRef` opacos con el contexto de tenant y permisos ya validados.

### Headers de seguridad

- **Helmet**: habilitado globalmente (XSS, HSTS, CSP, etc.)
- **`x-correlation-id`**: propagado en todos los requests. Si el cliente lo envía, se preserva; si no, se genera automáticamente.
- **SecurityAuditInterceptor**: loguea cada request con correlationId, método, path y resultado.

### ValidationPipe

Todos los DTOs son validados con `class-validator`:
- `whitelist: true` — descarta propiedades no declaradas en el DTO
- `forbidNonWhitelisted: true` — retorna error 400 si se envían propiedades extra
- `transform: true` — convierte tipos automáticamente (string → number, etc.)

---

## Endpoints

### Health & Liveness (version-neutral)

#### `GET /health`

Retorna el estado general del servicio.

```json
{ "status": "UP", "version": "1.0.0" }
```

#### `GET /health/live`

Liveness probe para Kubernetes. Responde `200` si el proceso está vivo.

```json
{ "status": "UP", "timestamp": "2026-06-27T10:00:00Z" }
```

#### `GET /health/ready`

Readiness probe para Kubernetes. Responde `200` si el servicio está listo para tráfico.

```json
{
  "status": "UP",
  "checks": { "metrics": "UP" },
  "timestamp": "2026-06-27T10:00:00Z"
}
```

#### `GET /metrics`

Métricas Prometheus en formato text. Ver sección [Observabilidad](#observabilidad).

---

### Proyectos — `/api/v1/projects`

#### `POST /api/v1/projects/initialize`

Inicializa un nuevo proyecto en el workspace del tenant.

**Body:**

```json
{
  "workspaceRef": "op_01j7wq8e2n",
  "name": "my-service",
  "type": "nestjs",
  "options": {
    "runtime": "nodejs",
    "monorepo": "npm-workspaces",
    "architecture": "clean",
    "database": "postgresql",
    "apiProtocol": "rest",
    "ciCd": "github-actions",
    "observability": "opentelemetry",
    "features": ["auth", "cache"],
    "agents": ["winston", "guardian"]
  }
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `workspaceRef` | `string` | ✅ | Referencia opaca de workspace emitida por el Tracker BFF |
| `name` | `string` | ✅ | Nombre del proyecto (mínimo 1 carácter) |
| `type` | `string` | ✅ | Tipo de proyecto (ej: `nestjs`, `nextjs`, `python`) |
| `options` | `object` | — | Opciones de scaffolding (ver tabla de opciones) |

**Opciones disponibles:**

| Opción | Default | Valores |
|---|---|---|
| `runtime` | `nodejs` | `nodejs`, `python`, `go`, `rust` |
| `monorepo` | `npm-workspaces` | `npm-workspaces`, `turborepo`, `nx`, `none` |
| `architecture` | `clean` | `clean`, `hexagonal`, `layered` |
| `database` | `postgresql` | `postgresql`, `mysql`, `mongodb`, `none` |
| `apiProtocol` | `rest` | `rest`, `graphql`, `grpc` |
| `ciCd` | `github-actions` | `github-actions`, `gitlab-ci`, `jenkins` |
| `observability` | `opentelemetry` | `opentelemetry`, `datadog`, `none` |
| `features` | `[]` | Array de features adicionales |
| `agents` | `[]` | Agentes Evolith a instalar |

**Response `201`:**

```json
{
  "success": true,
  "data": { "projectId": "proj_abc", "path": "/workspaces/op_01j7.../my-service" },
  "meta": { "correlationId": "evl-xyz" }
}
```

---

#### `POST /api/v1/projects/propose-advance`

Propone un avance de fase para el proyecto del tenant.

**Body:**

```json
{
  "workspaceRef": "op_01j7wq8e2n",
  "targetPhase": "phase-2",
  "triggerDeploy": false
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `workspaceRef` | `string` | ✅ | Referencia opaca del workspace |
| `targetPhase` | `string` | ✅ | Fase destino (ej: `phase-1`, `phase-2`) |
| `triggerDeploy` | `boolean` | — | Si `true`, dispara deploy tras el avance |

---

### Fases — `/api/v1/phases`

#### `POST /api/v1/phases/transition`

Ejecuta una transición de fase orquestando las herramientas declaradas.

**Body:**

```json
{
  "workspaceRef": "op_01j7wq8e2n",
  "from": "phase-0",
  "to": "phase-1",
  "tools": ["lint", "test", "build"]
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `workspaceRef` | `string` | ✅ | Referencia opaca del workspace |
| `from` | `string` | ✅ | Fase de origen (ej: `phase-0`) |
| `to` | `string` | ✅ | Fase destino (ej: `phase-1`) |
| `tools` | `string[]` | ✅ | Herramientas a ejecutar en la transición |

---

### Gates — `/api/v1/gates`

#### `POST /api/v1/gates/:gateId/evaluate`

Evalúa un gate de fase SDLC específico.

**Path param:** `gateId` — identificador del gate (ej: `PG1`, `PG1-01`, `PG2`).

**Mapeo gateId → fase:**

| gateId (patterns) | Fase evaluada |
|---|---|
| `PG0*` / sin número | `discovery` |
| `PG1*` / `1` | `discovery` |
| `PG2*` / `2` | `design` |
| `PG3*` / `3` | `construction` |
| `PG4*` / `4` | `qa` |
| `PG5*` / `5` | `release` |

**Body:**

```json
{
  "workspaceRef": "op_01j7wq8e2n"
}
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "phase": "discovery",
    "passed": true,
    "issues": [],
    "gateId": "PG1"
  }
}
```

#### `GET /api/v1/gates/:gateId`

Obtiene la definición de un gate SDLC. No requiere `workspaceRef`.

```bash
GET /api/v1/gates/PG1
```

---

### Fases — Reference

#### `GET /api/v1/phases/:phase/requirements`

Obtiene los requisitos de evidencia y blocking para una fase SDLC.

```bash
GET /api/v1/phases/1/requirements
```

---

### Rulesets — `/api/v1/rulesets`

#### `GET /api/v1/rulesets`

Lista todos los rulesets disponibles en Evolith Core.

```json
{
  "success": true,
  "data": [
    { "id": "governance/base", "name": "Base Governance", "category": "governance" },
    { "id": "acl/anti-corruption-layer", "name": "ACL Rules", "category": "acl" }
  ]
}
```

#### `GET /api/v1/rulesets/:id`

Obtiene el contenido de un ruleset por su ID canónico (URL-encoded).

```bash
GET /api/v1/rulesets/governance%2Fbase
```

---

### Arquitectura — `/api/v1/architecture`

#### `GET /api/v1/architecture/topologies`

Lista todas las topologías de arquitectura disponibles. Resultado **cacheado en Redis**.

```json
{
  "success": true,
  "data": [
    { "id": "modular-monolith", "name": "Modular Monolith", "maturityLevel": "F1" },
    { "id": "microservices", "name": "Microservices", "maturityLevel": "F3" }
  ]
}
```

#### `GET /api/v1/architecture/topologies/:id`

Obtiene el manifiesto completo de una topología. Resultado **cacheado en Redis**.

```bash
GET /api/v1/architecture/topologies/modular-monolith
```

#### `POST /api/v1/architecture/validate-satellite`

Valida un proyecto satelital contra las reglas de arquitectura de Evolith Core.

**Body:**

```json
{
  "workspaceRef": "op_01j7wq8e2n"
}
```

#### `POST /api/v1/architecture/detect-drift`

Detecta drift de arquitectura comparando el estado declarado con el real.

**Body:**

```json
{
  "workspaceRef": "op_01j7wq8e2n",
  "declaredLevel": "F2"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `workspaceRef` | `string` | ✅ | Referencia opaca del workspace |
| `declaredLevel` | `string` | — | Nivel de madurez arquitectural declarado (`F1`–`F5`) |

#### `POST /api/v1/architecture/cache/invalidate`

Invalida la caché de topologías en Redis.

**Body:** vacío `{}`

**Response `200`:**

```json
{
  "success": true,
  "data": { "invalidated": true, "keys": ["topology:list"] }
}
```

---

### Validación Compuesta (GT-312) — `/api/v1/validate`

#### `POST /api/v1/validate/composable`

Motor de validación multi-modo combinable. Permite combinar hasta 5 modos en una sola llamada.

**Body:**

```json
{
  "path": "/workspace/my-service",
  "corePath": "/opt/evolith",
  "engine": "native",
  "topology": "modular-monolith",
  "phase": "f2",
  "ruleset": "governance/base",
  "adr": "adr-0010",
  "file": "src/app.module.ts"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `path` | `string` | ✅ | Ruta al repositorio satelital |
| `corePath` | `string` | — | Ruta al Core de Evolith (default: `CORE_PATH`) |
| `engine` | `"native" \| "opa"` | — | Motor de evaluación (default: `native`) |
| `topology` | `string` | — | Activa el **modo Architecture** |
| `phase` | `"f1"–"f5"` | — | Activa el **modo SDLC** |
| `ruleset` | `string` | — | Activa el **modo Ruleset** |
| `adr` | `string` | — | Activa el **modo ADR** |
| `file` | `string` | — | Activa el **modo Ad-hoc** |

**Modos activables:**

| Modo | Campo activador | Descripción |
|---|---|---|
| SDLC | `phase` | Valida requisitos del SDLC para la fase indicada |
| Architecture | `topology` | Valida conformidad con la topología declarada |
| Ruleset | `ruleset` | Evalúa un ruleset específico |
| ADR | `adr` | Valida cumplimiento de un ADR concreto |
| Ad-hoc | `file` | Valida un archivo individual |

**Topologías válidas:** `modular-monolith`, `distributed-modules`, `microservices`, `serverless`, `edge-computing`, `event-driven`, `data-mesh`, `agentic-ai`

**ADRs válidos:** `adr-0002`, `adr-0005`, `adr-0010`, `adr-0018`, `adr-0032`, `adr-0040`, `adr-0050`

---

## Modelos de datos

### WorkspaceRef — Sistema de resolución opaco

El campo `workspaceRef` es un **identificador opaco** emitido por el Tracker BFF. Core-API lo resuelve internamente a una ruta real del filesystem vía `WorkspaceReferenceResolverService`:

```
workspaceRef: "op_01j7wq8e2n"
        ↓  WorkspaceReferenceResolverService
ruta real: "/var/run/evolith/workspaces/op_01j7wq8e2n"
```

El Tracker BFF monta los workspaces de cada tenant bajo `WORKSPACE_ROOT`. Core-API nunca recibe ni procesa rutas absolutas directamente de clientes externos.

### Envelope de respuesta

```typescript
// Éxito
interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: {
    correlationId: string;
    timestamp: string;
    version?: string;
  };
}

// Error
interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
  meta: {
    correlationId: string;
    timestamp: string;
  };
}
```

---

## Flujos por tenant

### Flujo completo: Tracker → Core-API → Core-Domain

```
Tracker BFF                 Core-API                    Core-Domain
    │                           │                            │
    │  POST /projects/initialize│                            │
    │  { workspaceRef: "op_..." │                            │
    │  , name: "my-svc" }       │                            │
    ├──────────────────────────►│                            │
    │                           │  resolve("op_...")         │
    │                           │  → "/workspaces/op_..."    │
    │                           ├───────────────────────────►│
    │                           │                            │  reads files
    │                           │                            │  evaluates rules
    │                           │◄───────────────────────────┤
    │                           │  result                    │
    │◄──────────────────────────┤                            │
    │  { success: true, data }  │                            │
```

### Prerequisitos del workspace

El Tracker BFF debe crear la estructura de directorio del workspace antes de llamar a Core-API:

```
$WORKSPACE_ROOT/
└── {workspaceRef}/
    ├── evolith.yaml          ← config del proyecto
    ├── rulesets/             ← rulesets customizados del tenant
    └── ...                   ← código fuente del proyecto satelital
```

---

## Fases, gates y artefactos

### Fases del SDLC

| Fase | ID | Nombre | Requisitos clave |
|---|---|---|---|
| F0 | `phase-0` | Foundation | `evolith.yaml`, `coreRef.version` pinned |
| F1 | `phase-1` | Structure | `package.json`, `src/`, README bilingüe |
| F2 | `phase-2` | Governance | `rulesets/`, ACL ruleset, `.harness/` scripts |
| F3 | `phase-3` | Architecture | ADR collection, ADR matrix updated |
| F4 | `phase-4` | Production | Dockerfile, CI/CD pipeline, DORA metrics |
| F5 | `phase-5` | Release | Compliance completo, telemetría activa |

### Convención de gateId

```
PG{fase}-{secuencia}
PG1       → gate de la fase 1 (discovery)
PG1-01    → primer gate de la fase 1
PG2-03    → tercer gate de la fase 2 (design)
```

### Consultar requisitos de un gate

```bash
# Obtener definición del gate PG1
GET /api/v1/gates/PG1

# Obtener requisitos de la fase 2
GET /api/v1/phases/2/requirements
```

---

## Topologías y blueprints

### Topologías disponibles

| ID | Nombre | Nivel de madurez |
|---|---|---|
| `modular-monolith` | Modular Monolith | F1 |
| `distributed-modules` | Distributed Modules | F2 |
| `microservices` | Microservices | F3 |
| `serverless` | Serverless | F2 |
| `edge-computing` | Edge Computing | F3 |
| `event-driven` | Event-Driven | F2 |
| `data-mesh` | Data Mesh | F4 |
| `agentic-ai` | Agentic AI | F3 |

### Caché de topologías

Las topologías se cachean en Redis con TTL configurable. Para invalidar manualmente:

```bash
POST /api/v1/architecture/cache/invalidate
```

---

## Swagger UI

La documentación interactiva OpenAPI está disponible en:

```
http://localhost:3000/api/docs
```

**Condición de activación:**
- `NODE_ENV !== 'production'` → siempre activo
- `NODE_ENV === 'production'` y `SWAGGER_ENABLED=true` → activo
- `NODE_ENV === 'production'` sin `SWAGGER_ENABLED` → desactivado

---

## Observabilidad

### Health probes (Kubernetes)

```yaml
# Ejemplo de configuración k8s
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
```

### Prometheus

```bash
GET /metrics
# Content-Type: text/plain
# Retorna métricas de app + caché Redis en formato Prometheus
```

### OpenTelemetry

La API instrumenta automáticamente las operaciones vía `tracing.ts`. Para configurar el exportador:

```bash
# Ejemplos de variables OTEL
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_SERVICE_NAME=evolith-core-api
OTEL_TRACES_EXPORTER=otlp
```

### Correlation ID

Cada request recibe un `x-correlation-id` único. Para trazabilidad end-to-end, el cliente puede enviarlo en el header y será preservado:

```bash
curl -H "x-correlation-id: mi-trace-id-123" \
  http://localhost:3000/api/v1/rulesets
```

---

## Ejemplos prácticos

### 1. Inicializar proyecto NestJS

```bash
curl -X POST http://localhost:3000/api/v1/projects/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceRef": "op_01j7wq8e2n",
    "name": "my-service",
    "type": "nestjs",
    "options": {
      "architecture": "clean",
      "database": "postgresql",
      "ciCd": "github-actions"
    }
  }'
```

### 2. Evaluar gate PG1 (post-discovery)

```bash
curl -X POST http://localhost:3000/api/v1/gates/PG1/evaluate \
  -H "Content-Type: application/json" \
  -d '{ "workspaceRef": "op_01j7wq8e2n" }'
```

### 3. Detectar drift de arquitectura

```bash
curl -X POST http://localhost:3000/api/v1/architecture/detect-drift \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceRef": "op_01j7wq8e2n",
    "declaredLevel": "F2"
  }'
```

### 4. Validación compuesta — SDLC + Architecture

```bash
curl -X POST http://localhost:3000/api/v1/validate/composable \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/workspace/my-service",
    "phase": "f2",
    "topology": "modular-monolith",
    "engine": "native"
  }'
```

### 5. Transición de fase F0 → F1

```bash
curl -X POST http://localhost:3000/api/v1/phases/transition \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceRef": "op_01j7wq8e2n",
    "from": "phase-0",
    "to": "phase-1",
    "tools": ["lint", "test"]
  }'
```

### 6. Listar topologías disponibles

```bash
curl http://localhost:3000/api/v1/architecture/topologies
```

---

## Troubleshooting

### Redis no disponible

La API **degrada gracefulmente** si Redis no está disponible: las operaciones continúan sin caché. Se logueará un warning en Pino. Para diagnosticar:

```bash
# Verificar conectividad
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
# Respuesta esperada: PONG
```

### `CORE_PATH` incorrecto

Si `CORE_PATH` no apunta al repositorio Evolith Core válido, los endpoints de rulesets y gates retornarán `404`. El directorio debe contener `rulesets/` y `reference/`.

```bash
# Verificar que la ruta contiene los archivos esperados
ls $CORE_PATH/rulesets/
ls $CORE_PATH/reference/architecture/
```

### CORS bloqueando en producción

Verificar que `CORS_ORIGINS` incluye el dominio del cliente:

```bash
CORS_ORIGINS=https://tracker.evolith.io,https://app.evolith.io
```

### Error 400 — propiedades no permitidas

`ValidationPipe` tiene `forbidNonWhitelisted: true`. Si el body incluye campos no declarados en el DTO, se retorna `400`. Revisar el schema del endpoint.

### Workspace no encontrado

Si `workspaceRef` no tiene un directorio correspondiente en `WORKSPACE_ROOT`, el resolver lanzará `404`. Verificar que el Tracker BFF montó el workspace antes de llamar a Core-API.

### Swagger no disponible en producción

Asegurarse de que `SWAGGER_ENABLED=true` esté en las variables de entorno de producción, o acceder desde un entorno de no-producción.
