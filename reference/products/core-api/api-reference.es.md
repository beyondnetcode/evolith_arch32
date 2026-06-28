# Referencia Técnica de la Evolith Core API

> **Navegación Bilingüe:** [English Version](./api-reference.md)

Este documento proporciona especificaciones técnicas detalladas de todos los endpoints públicos expuestos por la **Evolith Core API**.

---

## 1. Estándares Globales y Conformidad del Envelope

Todos los endpoints de la API aplican versionado en sus rutas URI utilizando el prefijo `/api/v1/...`. Cada respuesta de solicitud cumple con el envelope de salida estándar definido en la **ADR-0073**.

### Envelope de Respuesta Exitosa (`200 OK` / `201 Created`)

```json
{
  "success": true,
  "data": {
    "...": "Payload de respuesta específico del endpoint"
  },
  "meta": {
    "context": {
      "correlationId": "uuid-string",
      "tenant": "tenant-id",
      "initiative": "initiative-id"
    },
    "timing": {
      "startedAt": "ISO8601-timestamp",
      "durationMs": 42
    },
    "schemaVersion": "1.0.0"
  }
}
```

### Envelope de Respuesta con Error (`4xx` / `5xx`)

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Descripción legible por humanos sobre el error",
    "details": []
  },
  "meta": {
    "context": {
      "correlationId": "uuid-string"
    },
    "timing": {
      "startedAt": "ISO8601-timestamp",
      "durationMs": 12
    },
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
    "targetPhase": "design",
    "workspaceRef": "satellite-name-or-path",
    "triggerDeploy": false
  }
  ```

---

[Volver al Hub del Producto](./README.es.md)
