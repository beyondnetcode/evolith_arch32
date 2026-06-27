# Evolith Architecture Design — Corregido y Verificado

**Versión:** 2.0.0  
**Fecha:** 2026-06-27  
**Estado:** Aprobado — diseño objetivo post-auditoría  
**Autor:** Alberto Arroyo Raygada · Revisado por Claude Sonnet 4.6

---

## 1. Visión General

Evolith es un framework de gobernanza de software que permite a organizaciones (tenants) gestionar el ciclo de vida de sus proyectos (satélites) mediante reglas, gates, validaciones y agentes IA. El sistema opera bajo los principios de **fuente de verdad estructurada**, **alta disponibilidad 24/7**, y **trazabilidad total**.

```
┌─────────────────────────────────────────────────────────┐
│                    CORPUS (fuente de verdad)             │
│  rulesets/*.rules.json   manifests/*.manifest.json       │
│  rulesets/opa/*.rego     rulesets/schema/*.schema.json   │
│  rulesets/tenants/{id}/  (overrides por tenant)          │
└───────────────────┬─────────────────────────────────────┘
                    │ sirve datos estructurados
               Core-API (REST)
    ┌───────────────┼──────────────┬─────────────────┐
  SmartCLI       MCP Server    Tracker BFF      Agentes IA
  (validate,     (SSE/stdio,   (UI + auth,      (MCP tools,
   gate-check,    tools,        state mgmt)      audit)
   scaffold)      resources)
                    │
               Interfaces humanas
               (Swagger UI, docs generados)
```

---

## 2. Problema Identificado

### Problema Principal — Confusión entre lectura humana y fuente operativa

| Síntoma | Causa Raíz |
|---------|-----------|
| `GET /api/v1/architecture/topologies` retornaba `data: []` | `reference/` excluida de `.dockerignore`; `COPY reference/` faltaba en Dockerfile |
| `GET /api/v1/gates/:id` retornaba 500 silencioso | `loadPhaseGates()` usaba ruta `rulesets/sdlc/phase-gates.rules.json` (path incorrecto) |
| Topologías devuelven IDs con rutas relativas | `toSummary()` leía `$id` de los manifests que usan `metadata.id` |
| `POST /projects/propose-advance` evaluaba fase incorrecta | `fromPhase` y `toPhase` ambos asignados a `body.targetPhase` |
| `POST /validate/composable` retornaba 404 | `ComposableValidateController` no registrado en `AppModule` |
| Cache de 300ms en vez de 5 minutos | `@CacheTTL(300)` = 300ms en cache-manager v7; debía ser 300_000 |
| CORS bloqueaba todo en producción | `CORS_ORIGINS` vacío → `origin: []` → deniega todo cross-origin |
| 8 topology rules.json con $schema inaccesibles | Paths relativos incorrectos (`../../../../../` vs `../../`) |
| `rule-definition.schema.json` faltante | Referenciado por 2 archivos de infra pero nunca creado |
| Schemas de tenant, blueprint, waiver inexistentes | No definidos; impedía validación y contratos |

### Problema Secundario — Asimetría entre MD y datos estructurados

- `reference/` tiene 1085 `.md` vs 91 `.json` — mayoría de información sin representación estructurada
- `rulesets/sdlc/phase-gates.rules.json` duplicaba `rulesets/phase-gates/phase-gates.rules.json` con `$id` diferente
- Schemas `sdlc-gate.schema.json` y `sdlc-phase.schema.json` vivían en `reference/` en vez de `rulesets/schema/`

---

## 3. Principios Arquitectónicos Aplicados

1. **Structured-first**: toda información consumida por interfaces existe en formato estructurado. El Markdown es derivado o complementario.
2. **Single source of truth**: una sola ubicación canónica por artefacto. Duplicados eliminados.
3. **Fail-fast con degradación controlada**: JSON.parse con `Promise.allSettled` — un archivo malformado no elimina toda la respuesta.
4. **Path traversal prevention**: `WorkspaceReferenceResolverService.resolve()` valida con regex + path check antes de cualquier I/O.
5. **Cache en ms**: `cache-manager v7` usa milisegundos; todos los `CacheTTL` corregidos.
6. **Health ≠ Ready**: liveness probe (`/health/live`) nunca falla si el proceso vive; readiness probe (`/health/ready`) verifica el corpus real.
7. **SkipThrottle en health/metrics**: probes de k8s y scrapers de Prometheus no consumen el rate limit.

---

## 4. Fuente de Verdad Operativa

```
corpus/
  rulesets/                          ← FUENTE OPERATIVA
    phase-gates/
      phase-gates.rules.json         ← Canonical (rulesets/sdlc/ es alias legacy)
    schema/                          ← Contratos de todos los artefactos
      tenant.schema.json             ← NUEVO
      tenant-override.schema.json    ← NUEVO
      waiver.schema.json             ← NUEVO
      blueprint.schema.json          ← NUEVO
      rule-definition.schema.json    ← NUEVO
      sdlc-gate.schema.json          ← MOVIDO desde reference/
      sdlc-phase.schema.json         ← MOVIDO desde reference/
    opa/
      phase-gates.rego               ← NUEVO — valida gates con evidence + waivers
      multi-tenancy.rego             ← previene overrides que rompen gobernanza
    tenants/                         ← NUEVO
      {tenant-id}/
        tenant.json                  ← identidad y capacidades
        overrides.json               ← deltas sobre ruleset base
        waivers/{WVR-ID}.json        ← waivers activos
    topologies/
      */
        *.rules.json                 ← $schema paths corregidos
  reference/architecture/topologies/ ← topology.manifest.json (consumidos por API)

reference/                           ← LECTURA HUMANA ÚNICAMENTE
  governance/sdlc/playbooks/         ← procedimiento humano (no contrato)
  architecture/adrs/                 ← narrativas de decisión
```

**Regla:** ningún consumidor (CLI, MCP, Tracker, agente) parsea `.md` para tomar decisiones. Los `.md` son para el humano.

---

## 5. Relación Markdown ↔ Rulesets ↔ Schemas ↔ OPA

```
Tier 1 — Source of Truth (rulesets/)
  *.rules.json  →  validated by  →  *.schema.json
  *.rego        →  tested by     →  *.test.rego
  *.manifest.json

Tier 2 — Derivado automáticamente desde Tier 1
  Swagger UI           ← generado desde DTOs + OpenAPI decorators
  GET /api/v1/gates    ← lee phase-gates.rules.json en runtime
  GET /api/v1/topologies ← lee topology.manifest.json en runtime

Tier 3 — Escrito por humanos, no generado
  reference/governance/sdlc/playbooks/*.md  ← procedimiento
  reference/architecture/adrs/*.md          ← decisión narrativa
  reference/architecture/blueprints/*.md    ← contexto de blueprint
```

Invariante: si un `.md` de playbook menciona un artefacto obligatorio, ese artefacto debe existir en el `.rules.json` correspondiente. CI debe verificar esta consistencia.

---

## 6. Arquitectura de Alta Disponibilidad 24/7

### 6.1 Puntos de Falla Identificados y Mitigaciones

| Componente | Punto de Falla | Mitigación |
|-----------|---------------|-----------|
| Core-API | Pod único | Mínimo 2 réplicas + HPA en k8s |
| Core-API | Corpus montado en pod | Usar `ConfigMap` o `ReadOnlyMount` desde el repo; fallar en `/health/ready` si inaccesible |
| Redis | Instancia única | Redis Sentinel o Redis Cluster para HA; fallback a in-memory graceful |
| MCP Server | Pod único | 2+ réplicas con SSE stateless |
| OPA | `.wasm` ausente | Fallback a native evaluator (ya implementado); `.wasm` como artefacto de release |

### 6.2 Health Checks (implementado)

```
GET /health/live   → 200 siempre si el proceso responde (liveness)
GET /health/ready  → 200 solo si corpus accesible + MetricsService disponible (readiness)
GET /health        → estado completo (para monitoreo)
```

### 6.3 Probes en Docker / k8s

```yaml
livenessProbe:
  httpGet: { path: /health/live, port: 3000 }
  initialDelaySeconds: 15
  periodSeconds: 10

readinessProbe:
  httpGet: { path: /health/ready, port: 3000 }
  initialDelaySeconds: 20
  periodSeconds: 10
  failureThreshold: 3
```

### 6.4 Degradación Controlada

| Dependencia falla | Comportamiento |
|---|---|
| Redis no disponible | Cache silently disabled; requests served from disk (slower but correct) |
| `policy.wasm` ausente | OPA silently skips; native evaluator handles the request |
| Un `.rules.json` malformado | `Promise.allSettled` → el archivo se omite, los demás se sirven |
| MCP Server caído | CLI y API siguen operativos; agentes no pueden evaluar interactivamente |

---

## 7. Estrategia de Performance

### 7.1 Cache (corregido)

```typescript
// ANTES (bug): 300ms
@CacheTTL(300)

// DESPUÉS (correcto): 5 minutos en ms
@CacheTTL(300_000)
```

| Endpoint | TTL | Estrategia |
|---------|-----|-----------|
| `GET /topologies` | 5 min | CacheInterceptor + Redis |
| `GET /rulesets` | 5 min | CacheInterceptor + Redis |
| `GET /gates/:id` | 5 min | Manual cache.get/set |
| `POST /gates/evaluate` | 1 min | Cache por hash(input) via CacheKeys.opa |
| `GET /health/live` | No cache | SkipThrottle |

### 7.2 Rate Limiting

```typescript
// Global: 100 requests / 60 segundos por IP
// Health y metrics: @SkipThrottle() (no consumen límite)
```

### 7.3 Pendientes de Implementar

- Paginación en `GET /rulesets` y `GET /topologies` (`?page=1&limit=50`)
- `ETag` + `If-None-Match` para cache HTTP en clientes
- Índice pre-computado de rulesets al arranque (evitar filesystem scan en cada request)

---

## 8. Estrategia de Resiliencia

### 8.1 Implementado

- `Promise.allSettled` en `listRulesets()` — un JSON malformado no bloquea el endpoint
- `CircuitBreakerService` en core-api (ya existía)
- `AuditThrottlerGuard` — rate limiting con logging de audit

### 8.2 Pendiente

- Circuit breaker en llamadas Redis (actualmente `try/catch` simple)
- Retry con backoff exponencial para llamadas MCP → Core-API
- Timeout por operación en use cases de larga duración (`validateSatellite`, `detectDrift`)
- Idempotency key en `POST /gates/evaluate` (mismo input → mismo resultado cacheado)

---

## 9. Estrategia de Observabilidad

### 9.1 Implementado

| Señal | Herramienta | Estado |
|-------|------------|--------|
| Traces | OpenTelemetry → OTLP → Tempo | `OTEL_ENABLED=true` activa |
| Logs | nestjs-pino → JSON estructurado | Activo en prod |
| Metrics | prom-client → `GET /metrics` | Activo; sin auth (TODO) |
| Audit trail | `SecurityAuditInterceptor` | Activo en core-api |
| Correlation ID | `CorrelationIdMiddleware` | Activo; `x-correlation-id` header |

### 9.2 Gaps Pendientes

- `/metrics` necesita auth (API key o network policy que restrinja acceso a Prometheus)
- `CacheMetricsService.recordHit/Miss()` nunca se llaman — contadores en 0
- OTel en MCP server gateado estrictamente en `OTEL_ENABLED=true` — activar en staging por default

---

## 10. Estrategia de Seguridad y Gobernanza

### 10.1 Implementado

- `Helmet.js` en core-api
- `ValidationPipe` global con `whitelist: true, forbidNonWhitelisted: true`
- Path traversal prevention en `WorkspaceReferenceResolverService`
- CORS configurable via `CORS_ORIGINS` (ya no bloquea por defecto en prod)
- `allowedHeaders` ahora incluye `Authorization` y `x-api-key`
- `ComposableValidateController` ahora usa `workspaceRef` (opaque) en vez de paths raw

### 10.2 Pendiente (requiere decisión arquitectónica)

- **API Key guard**: `passport-custom` ya está en deps pero sin estrategia registrada. Implementar `@UseGuards(ApiKeyGuard)` en todos los endpoints mutadores.
- **Separar `/metrics`** detrás de un puerto interno (e.g., 9100) no expuesto en Traefik
- **mTLS** entre servicios internos (core-api ↔ MCP server) cuando se despliegue en k8s

---

## 11. Modelo de Integración entre Componentes

```
Tracker BFF
  ├── Emite workspaceRef (opaque token)
  ├── Llama Core-API: POST /gates/:id/evaluate { workspaceRef, evidence }
  ├── Llama Core-API: POST /projects/initialize { workspaceRef, name, currentPhase, targetPhase }
  └── Lee Core-API: GET /topologies, GET /rulesets, GET /phases/:n/requirements

SmartCLI
  ├── Modo local: lee rulesets desde CORE_PATH directo (no necesita API)
  └── Modo remoto: usa sdk-client → Core-API REST

MCP Server
  ├── Tools: validate, gate-check, topology-list, sdlc-status, auto-fix, propose-advance
  ├── Resources: corpus (rulesets, manifests, schemas)
  └── Agentes Claude: consumen tools via SSE

Core-API
  ├── Lee corpus desde CORE_PATH/rulesets/ y CORE_PATH/reference/
  ├── Evalúa gates via OPA (wasm) + Native Engine
  └── Cachea en Redis; fallback in-memory
```

---

## 12. Modelo de Configuración por Tenant

```
rulesets/tenants/{tenant-id}/
  tenant.json          ← identidad (tier, topologías permitidas, fases)
  overrides.json       ← deltas sobre el ruleset base
  waivers/WVR-*.json   ← excepciones aprobadas

Reglas de override (OPA multi-tenancy.rego):
  ✓ Puede agregar evidencia adicional a un gate
  ✓ Puede activar waivers con autoridad declarada en el gate
  ✗ No puede eliminar blockingCriteria
  ✗ No puede cambiar waiverAuthority
  ✗ No puede reducir mandatoryEvidence sin waiver

Nuevos schemas (rulesets/schema/):
  tenant.schema.json
  tenant-override.schema.json
  waiver.schema.json
```

---

## 13. Tabla de Correcciones

| # | Área | Problema | Corrección Aplicada | Artefacto | Prioridad | Riesgo si no se corrige | Estado |
|---|------|---------|-------------------|-----------|-----------|------------------------|--------|
| 1 | Core-API | `fromPhase = toPhase` en propose-advance | Agregado `currentPhase` a DTO; `fromPhase = body.currentPhase` | `projects.controller.ts`, `projects.dto.ts` | CRÍTICA | Gate evalúa siempre la misma fase (resultado incorrecto) | ✅ Aplicada |
| 2 | Core-API | CORS bloquea todo en producción sin `CORS_ORIGINS` | `origin: rawOrigins?.split(',') ?? false` (false = bloquea; * = permite todo) | `main.ts` | CRÍTICA | API inaccesible para BFF en producción | ✅ Aplicada |
| 3 | Core-API | `ALLOWED_ORIGINS` definido pero nunca usado | Eliminado del schema Zod | `env.validation.ts` | ALTA | Confusión de operadores → CORS mal configurado | ✅ Aplicada |
| 4 | Core-API | `composable-validate` expone paths raw del filesystem | Migrado a `workspaceRef` opaco; usa `WorkspaceReferenceResolverService` | `composable-validate.controller.ts` | CRÍTICA | Path traversal → leer archivos arbitrarios del container | ✅ Aplicada |
| 5 | Core-API | `ComposableValidateController` no registrado → 404 | Registrado en `AppModule` | `app.module.ts` | ALTA | Endpoint siempre 404; feature muerta | ✅ Aplicada |
| 6 | Core-API | `loadPhaseGates()` con ruta hardcoded incorrecta | Busca en ambas ubicaciones con fallback | `core-reference-query.service.ts` | CRÍTICA | Gates siempre devuelven 500 o vacío | ✅ Aplicada |
| 7 | Core-API | `JSON.parse` sin try/catch → 500 en archivo malformado | `Promise.allSettled` + try/catch por archivo | `core-reference-query.service.ts` | ALTA | Un archivo corrupto bloquea todos los endpoints | ✅ Aplicada |
| 8 | Core-API | `toSummary` no entiende topology manifests (usa `$id`) | Detecta `metadata.id` (manifests) vs `$id` (rulesets) | `core-reference-query.service.ts` | ALTA | Topologías devuelven IDs con paths relativos | ✅ Aplicada |
| 9 | Core-API | `@CacheTTL(300)` = 300ms (no 5 minutos) | Corregido a `300_000` ms en todos los TTL | `cache-keys.ts`, `architecture.controller.ts` | ALTA | Cache efectivamente deshabilitado; filesystem I/O en cada request | ✅ Aplicada |
| 10 | Core-API | Health ready solo verifica MetricsService (always UP) | Verifica existencia de `phase-gates.rules.json` en corpus | `health.controller.ts` | ALTA | Pod reporta "ready" con corpus roto | ✅ Aplicada |
| 11 | Core-API | Health/metrics consumen rate limit de k8s probes | `@SkipThrottle()` en HealthController | `health.controller.ts` | MEDIA | Probes de k8s causan 429 bajo carga; pod reiniciado erroneamente | ✅ Aplicada |
| 12 | Core-API | `Authorization` faltante en `allowedHeaders` CORS | Agregado `Authorization`, `x-api-key` | `main.ts` | BAJA | BFF con bearer token bloqueado por CORS preflight | ✅ Aplicada |
| 13 | Rulesets | 8 topology rules.json con `$schema` inaccesibles | Corregidos a `../../schema/` y `../../../schema/` | 8 archivos en `rulesets/topologies/` | ALTA | `ajv validate` falla; CI schema validation no funciona | ✅ Aplicada |
| 14 | Rulesets | `rule-definition.schema.json` referenciado pero inexistente | Creado en `rulesets/schema/` | `rule-definition.schema.json` | ALTA | 2 infra rules.json no validables | ✅ Aplicada |
| 15 | Rulesets | Schemas `sdlc-gate` y `sdlc-phase` en `reference/` | Copiados a `rulesets/schema/` | `sdlc-gate.schema.json`, `sdlc-phase.schema.json` | MEDIA | Schemas operativos inaccesibles desde `rulesets/schema/` | ✅ Aplicada |
| 16 | Rulesets | Schemas `tenant`, `blueprint`, `waiver`, `tenant-override` inexistentes | Creados en `rulesets/schema/` | 4 nuevos archivos `.schema.json` | ALTA | Sin contrato → tenant config no validable | ✅ Aplicada |
| 17 | Rulesets | `rulesets/tenants/` no existía | Creado con README + ejemplo funcional | `rulesets/tenants/` | ALTA | Sin modelo de tenant → personalización imposible | ✅ Aplicada |
| 18 | OPA | Sin policy para phase gates | `rulesets/opa/phase-gates.rego` con validación de evidence + waivers | `phase-gates.rego` | ALTA | Gates solo evaluados por native engine; OPA no cubre este dominio | ✅ Aplicada |
| 19 | MCP Server | `tsconfig.json` paths usan `../../node_modules/` (breaks Docker) | `tsconfig.prod.json` overrides `"paths": {}` | `tsconfig.prod.json` | CRÍTICA | Build TypeScript falla en Docker standalone | ✅ Aplicada |
| 20 | MCP Server | `@evolith/infra-providers` y `fs-extra` faltantes en package.json | Agregados a `dependencies` y `devDependencies` | `package.json`, `package-lock.json` | CRÍTICA | `npm ci` resuelve deps sin esas librerías; runtime crash | ✅ Aplicada |
| 21 | Ecosystem | Sin `docker-compose.yml` para desarrollo local | Creado con core-api, mcp-server, redis, otel-collector | `docker-compose.yml` | MEDIA | Onboarding de nuevos devs requiere setup manual | ✅ Aplicada |
| 22 | Ecosystem | Machine contracts no incluye MCP, CLI, core-api como consumers | **Pendiente** — requiere actualizar `evolith-machine-contracts.json` | `rulesets/contracts/` | MEDIA | Contrato desactualizado → consumidores fuera de spec | ⏳ Pendiente |
| 23 | Ecosystem | `@evolith/core` no publicado en npm pero importado por MCP server | **Pendiente** — requiere `npm publish` con autorización | `packages/core/` | CRÍTICA | MCP server build falla hasta que se publique | ⏳ Pendiente (requiere auth) |
| 24 | Seguridad | Sin auth guard en ningún endpoint | **Pendiente** — implementar `ApiKeyGuard` + `@UseGuards()` | `app.module.ts` + nueva guard | ALTA | Todos los endpoints mutadores son públicos | ⏳ Pendiente (decisión arq.) |
| 25 | Seguridad | `/metrics` sin auth (expone métricas internas) | **Pendiente** — network policy o puerto interno separado | `metrics.controller.ts` | ALTA | Prometheus expuesto públicamente | ⏳ Pendiente |

---

## 14. Cambios Pendientes

### Críticos (bloquean operación)

1. **Publicar `@evolith/core` en npm** — MCP server no puede buildear sin él. Requiere `npm publish` en `packages/core/`.

### Altos (degradan seguridad/gobernanza)

2. **API Key Guard** — implementar `PassportStrategy` con `x-api-key` header; aplicar en todos los endpoints `POST`.
3. **`/metrics` en puerto interno** — separar del puerto público con Traefik middleware o segundo listener.
4. **Paginación** en `GET /rulesets` y `GET /topologies`.
5. **`rulesets/sdlc/phase-gates.rules.json`** — eliminar el duplicado (mantener solo `rulesets/phase-gates/`).

### Medios (mejoran calidad)

6. **CI schema validation** — `ajv-cli` validando todos `*.rules.json` contra su `$schema`.
7. **CI cross-reference check** — detectar `playbookRef` en `.rules.json` que apunten a `.md` inexistentes.
8. **Cache hit/miss metrics** — conectar `CacheMetricsService.recordHit/Miss()` al `CacheInterceptor`.
9. **Índice de rulesets** en startup — evitar filesystem scan en cada `GET /rulesets`.
10. **Blueprints estructurados** — crear `rulesets/blueprints/` con `blueprint.json` para cada blueprint existente en `reference/`.

---

## 15. Riesgos Detectados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| `@evolith/core` nunca publicado → MCP server no deployable | ALTA | CRÍTICO | Publicar inmediatamente o restructurar imports en MCP server |
| Divergencia entre `rulesets/sdlc/` y `rulesets/phase-gates/` | MEDIA | ALTA | Eliminar duplicado; CI que detecte archivos con mismo nombre |
| Corpus no montado en pod → todos los endpoints devuelven vacío/500 | MEDIA | CRÍTICO | `/health/ready` ahora verifica; k8s no envía tráfico |
| MCP server importa `@evolith/core` (no publicado) → crash en runtime | ALTA | CRÍTICO | Bloqueado por `@evolith/core` publish |
| Tenants pueden leer rulesets de otros tenants | BAJA | ALTA | Implementar ABAC a nivel de corpus access en Core-API |
| OPA `.wasm` ausente → validaciones sin política formal | ALTA | MEDIA | Native engine como fallback; generar `.wasm` en CI |

---

## 16. Recomendaciones Finales

1. **Publicar `@evolith/core`** — es la única acción que desbloquea el MCP server en producción.

2. **Una sola ubicación canónica para cada artefacto** — el patrón ya existe; aplicarlo rigurosamente. `rulesets/` para reglas, `reference/` para lectura humana, sin cruces.

3. **CI como contrato de consistencia** — agregar tres checks de CI:
   - `ajv validate` en todos `*.rules.json` contra su `$schema`
   - `opa test rulesets/opa/` — suite de tests OPA debe pasar
   - Cross-reference: toda `playbookRef` en `.rules.json` apunta a un `.md` existente

4. **Tenant model es el próximo hito** — los schemas están, el directorio está. El siguiente paso es la API de tenant discovery en Core-API y la evaluación de overrides en el gate evaluator.

5. **Auth como decisión urgente** — el API está públicamente expuesto. Aunque la red puede restringir acceso (VPC, k8s NetworkPolicy), implementar API Key guard es recomendable para producción.

6. **OTEL en staging siempre activo** — activar `OTEL_ENABLED=true` en el entorno de staging por defecto para capturar traces antes de llegar a producción.
