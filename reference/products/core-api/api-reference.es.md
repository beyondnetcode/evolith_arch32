# Referencia Técnica de la Evolith Core API

> **Navegación Bilingüe:** [English Version](./api-reference.md)

Este documento proporciona especificaciones técnicas detalladas de todos los endpoints públicos expuestos por la **Evolith Core API**.

---

## 1. Estándares Globales y Conformidad del Envelope

Todos los endpoints de dominio aplican versionado en sus rutas URI utilizando el prefijo `/api/v1/...`; `/health*` y `/metrics` son version-neutral. Cada respuesta JSON se envuelve automáticamente mediante el `EnvelopeInterceptor` (éxito) o el `HttpExceptionFilter` (error) en el envelope de salida estándar definido en la **ADR-0073**. El endpoint `/metrics` está exento (texto Prometheus crudo).

El objeto `meta` es **plano** — `command`, `executedAt`, `durationMs`, `correlationId`, `context` y `schemaVersion` son hermanos (no existe un objeto anidado `timing`). El objeto `context` solo lleva el ámbito de la petición (`initiative`, `tenant`, `phase`) y se rellena a partir de cabeceras `x-evolith-*`, query params o el body cuando están presentes.

### Envelope de Respuesta Exitosa (`200 OK` / `201 Created`)

```json
{
  "success": true,
  "data": {
    "...": "Payload de respuesta específico del endpoint"
  },
  "meta": {
    "command": "http POST /api/v1/validate/composable",
    "executedAt": "2026-06-21T14:00:00.000Z",
    "durationMs": 42,
    "correlationId": "evl-5f3a76ef-c5b9-478a-a92c-0e78fde14022",
    "context": {
      "initiative": "governance-audit",
      "tenant": "default",
      "phase": "discovery"
    },
    "schemaVersion": "1.0.0"
  }
}
```

### Envelope de Respuesta con Error (`4xx` / `5xx`)

Los errores llevan el mismo envelope y la misma forma de `meta`. El objeto `error.details` es un body Problem Details RFC 9457 (`type`, `title`, `status`, `detail`, `instance`, `timestamp`, opcionalmente `traceId`/`errors`); la respuesta también fija la cabecera `X-Problem-Format: rfc9457`. El `error.code` es uno de `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UNPROCESSABLE_ENTITY`, `TOO_MANY_REQUESTS` o `INTERNAL_ERROR`.

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": {
      "type": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400",
      "title": "Bad Request",
      "status": 400,
      "detail": "Validation failed",
      "instance": "/api/v1/projects/initialize",
      "timestamp": "2026-06-21T14:00:00.000Z",
      "errors": ["workspaceRef must be longer than or equal to 1 characters"]
    }
  },
  "meta": {
    "command": "http POST /api/v1/projects/initialize",
    "executedAt": "2026-06-21T14:00:00.000Z",
    "durationMs": 12,
    "correlationId": "evl-5f3a76ef-c5b9-478a-a92c-0e78fde14022",
    "context": {},
    "schemaVersion": "1.0.0"
  }
}
```

---

## 2. Endpoints de Referencia

Estos endpoints proporcionan metadatos sobre rulesets activos, gates y requisitos de fases de SDLC.

### Listar Rulesets (List Rulesets)
* **Ruta:** `GET /api/v1/rulesets`
* **Resumen:** Enumera todos los rulesets actualmente disponibles para los clientes de la API.
* **Payload `data`:**
  ```json
  [
    {
      "id": "rulesets/governance/satellite-contracts.rules.json",
      "name": "Satellite Contracts ruleset",
      "version": "1.0.0"
    }
  ]
  ```

### Obtener Ruleset (Get Ruleset)
* **Ruta:** `GET /api/v1/rulesets/:id`
* **Resumen:** Obtiene los detalles de un ruleset específico.
* **Parámetros:** `id` (identificador del ruleset codificado en URL)
* **Payload `data`:** Esquema JSON completo y matriz de reglas.

### Obtener Gate (Get Gate)
* **Ruta:** `GET /api/v1/gates/:gateId`
* **Resumen:** Obtiene la definición de un gate de fase de SDLC.
* **Parámetros:** `gateId` (por ejemplo, `PG1`)
* **Payload `data`:**
  ```json
  {
    "id": "PG1",
    "phase": "conception",
    "name": "Conception Baseline Gate",
    "mandatoryEvidence": ["PRD", "architecture-proposal"]
  }
  ```

### Obtener Requisitos de Fase (Get Phase Requirements)
* **Ruta:** `GET /api/v1/phases/:phase/requirements`
* **Resumen:** Obtiene los requisitos de evidencia para una fase de SDLC.
* **Parámetros:** `phase` (por ejemplo, `1`, `2`, `3`)

---

## 3. Endpoints de Arquitectura y Topologías

Estos endpoints exponen la lista de topologías, validación de satélites y auditorías de drift.

### Listar Topologías (List Topologies)
* **Ruta:** `GET /api/v1/architecture/topologies`
* **Resumen:** Enumera todas las topologías disponibles.
* **Caché:** Las respuestas se sirven desde la caché respaldada por Redis (ver `CacheInterceptor`) bajo el TTL `topology`. Usa el endpoint [Invalidar Caché de Topologías](#invalidar-caché-de-topologías) para forzar un refresco cuando cambien los manifiestos de topología subyacentes.
* **Payload `data`:** Matriz de manifiestos de topología.

### Obtener Topología (Get Topology)
* **Ruta:** `GET /api/v1/architecture/topologies/:id`
* **Resumen:** Obtiene los detalles de una topología específica.
* **Caché:** Cacheado bajo el TTL `topology`. Se invalida junto con la lista de topologías mediante [Invalidar Caché de Topologías](#invalidar-caché-de-topologías).
* **Parámetros:** `id` (por ejemplo, `modular-monolith`)

### Validar Satélite (Validate Satellite)
* **Ruta:** `POST /api/v1/architecture/validate-satellite`
* **Payload de Request:**
  ```json
  {
    "workspaceRef": "satellite-name-or-path"
  }
  ```
* **Payload `data`:**
  ```json
  {
    "verdict": "passed",
    "violations": []
  }
  ```

### Detectar Deriva (Detect Drift)
* **Ruta:** `POST /api/v1/architecture/detect-drift`
* **Payload de Request:**
  ```json
  {
    "workspaceRef": "satellite-name-or-path",
    "declaredLevel": "F1"
  }
  ```
* **Payload `data`:** Lista de violaciones de drift e indicadores de discrepancia.

### Invalidar Caché de Topologías (Invalidate Topology Cache)
* **Ruta:** `POST /api/v1/architecture/cache/invalidate`
* **Resumen:** Expulsa las entradas de topología en caché para que la siguiente petición a `Listar Topologías` / `Obtener Topología` se recompute desde los manifiestos de origen.
* **Payload de Request:** _ninguno_
* **Respuesta:** `200 OK`
* **Payload `data`:**
  ```json
  {
    "invalidated": true,
    "keys": ["topology:list"]
  }
  ```

---

## 4. Endpoints de Ejecución de Fases y Gates

Estos endpoints desencadenan validaciones, propuestas de avance de fase y transiciones de estado.

### Evaluar Gate (Evaluate Gate)
* **Ruta:** `POST /api/v1/gates/:gateId/evaluate`
* **Parámetros:** `gateId` (por ejemplo, `PG0-01`)
* **Payload de Request:**
  ```json
  {
    "workspaceRef": "satellite-name-or-path"
  }
  ```
* **Payload `data`:** Cumple con la estructura de `GateEvidence`:
  ```json
  {
    "verdict": "passed",
    "violations": [],
    "rulesetRef": "rulesets/governance/satellite-contracts.rules.json",
    "rulesetVersion": "1.0.0",
    "evaluatedAt": "2026-06-21T14:00:00Z",
    "evaluatedBy": "core-api"
  }
  ```

### Transición de Fase (Transition Phase)
* **Ruta:** `POST /api/v1/phases/transition`
* **Payload de Request:**
  ```json
  {
    "from": "discovery",
    "to": "design",
    "tools": ["validate-docs", "check-bilingual-parity"],
    "workspaceRef": "satellite-name-or-path"
  }
  ```

### Inicializar Proyecto (Initialize Project)
* **Ruta:** `POST /api/v1/projects/initialize`
* **Payload de Request:**
  ```json
  {
    "name": "my-satellite-app",
    "type": "nodejs",
    "workspaceRef": "target-dir-path",
    "options": {
      "runtime": "nodejs",
      "architecture": "clean",
      "database": "postgresql",
      "apiProtocol": "rest"
    }
  }
  ```
* **Respuesta:** `201 Created`

### Proponer Avance de Fase (Propose Phase Advance)
* **Ruta:** `POST /api/v1/projects/propose-advance`
* **Payload de Request:**
  ```json
  {
    "workspaceRef": "satellite-name-or-path",
    "currentPhase": "phase-1",
    "targetPhase": "phase-2",
    "triggerDeploy": false
  }
  ```
* **Notas:** `currentPhase` es opcional — cuando el llamante lo omite, el controlador usa `targetPhase` como fallback para que el gate de salida siempre se evalúe.

---

## 5. Validación Composable (GT-312)

### Validación Composable (Composable Validate)
* **Ruta:** `POST /api/v1/validate/composable`
* **Resumen:** Ejecuta el motor de validación composable, combinando hasta cinco modos (SDLC, Arquitectura, Ruleset, ADR, Ad-hoc) en una sola llamada. Cada modo se activa cuando su campo disparador está presente.
* **Payload de Request:**
  ```json
  {
    "workspaceRef": "op_01j7wq8e2n",
    "engine": "native",
    "topology": "modular-monolith",
    "phase": "design",
    "ruleset": "governance/base",
    "adr": "adr-0010",
    "file": "src/app.module.ts"
  }
  ```
* **Campos:** `workspaceRef` (**requerido**, ref opaca); `engine` (`native` | `opa`, default `native`); `topology` activa el modo Arquitectura; `phase` activa el modo SDLC (ids canónicos `discovery`, `design`, `construction`, `qa`, `release`; los legacy `f1`–`f5` se aceptan como alias deprecados según GT-343); `ruleset` activa el modo Ruleset; `adr` activa el modo ADR; `file` activa el modo Ad-hoc.
* **Topologías válidas:** `modular-monolith`, `distributed-modules`, `microservices`, `serverless`, `edge-computing`, `event-driven`, `data-mesh`, `agentic-ai`.
* **ADRs válidos:** `adr-0002`, `adr-0005`, `adr-0010`, `adr-0018`, `adr-0032`, `adr-0040`, `adr-0050`.

---

## 6. Endpoints Operativos (version-neutral)

Estos endpoints **no** están versionados (sin prefijo `/api/v1`) y están exentos de rate limiting (`@SkipThrottle()`) para que las probes de orquestadores y los scrapers de Prometheus vean URIs estables entre versiones mayores.

### Health (combinado)
* **Ruta:** `GET /health` — liveness + readiness combinados; devuelve el estado de salud del servicio.

### Liveness
* **Ruta:** `GET /health/live` — devuelve `{ "status": "UP", "timestamp": "..." }` cuando el proceso está vivo.

### Readiness
* **Ruta:** `GET /health/ready` — verifica el corpus (`phase-gates.rules.json` bajo `CORE_PATH`) y las métricas. Devuelve `200` con `{ "status": "UP", "checks": { "corpus": "UP", "metrics": "UP" }, "timestamp": "..." }`, o `503` con `status: "DOWN"` cuando un check falla.

### Metrics
* **Ruta:** `GET /metrics` — exposición de texto Prometheus (`Content-Type: text/plain`). Combina métricas de aplicación y de la caché Redis. Devuelto crudo (sin envelope).

> **Rate limiting:** el resto de rutas están limitadas globalmente a **100 peticiones / 60 s** por cliente (`ThrottlerModule`); superar el límite devuelve `429 TOO_MANY_REQUESTS`.

---

[Volver al Hub del Producto](./README.es.md)
