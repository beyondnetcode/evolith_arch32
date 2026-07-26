# Evolith Core — Referencia de Variables de Entorno

> **Navegación Bilingüe:** [English Version](./env-variables-reference.md)

**Estado:** Referencia Activa
**Responsable:** Evolith Architecture Board
**Creado:** 2026-07-23
**Última Actualización:** 2026-07-23

Este documento cataloga **todas las variables de entorno** de todos los servicios de Evolith. Cada variable lee de `process.env` con un default sensato, permitiendo a los operadores ajustar el comportamiento por entorno sin redeploy.

**Patrón:** `process.env.VAR ?? defaultValue` (o `||` para fallbacks numéricos)

---

## MCP Server (`@beyondnet/evolith-mcp`)

| Variable | Default | Descripción |
|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | `60000` | Ventana de rate limit en milisegundos (1 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Máximo de solicitudes por ventana por IP |
| `MCP_MAX_BODY_BYTES` | `1048576` | Tamaño máximo del cuerpo de la solicitud (1 MB) |
| `HTTP_REQUEST_TIMEOUT_MS` | `30000` | Timeout de solicitud (30s) |
| `HTTP_KEEPALIVE_TIMEOUT_MS` | `65000` | Timeout de keep-alive (65s) |
| `MCP_HTTP_HOST` | `0.0.0.0` | Dirección de bind HTTP |
| `MCP_SERVER_PORT` | `3000` | Puerto HTTP |
| `MCP_CACHE_TTL_MS` | `600000` | TTL de caché (10 min) |
| `MCP_CACHE_MAX_ENTRIES` | `500` | Máximo de entradas en caché |
| `AUDIT_MAX_EVENTS` | `1000` | Máximo de eventos de auditoría en memoria |
| `AUDIT_DEFAULT_QUERY_LIMIT` | `50` | Tamaño de página de consulta por defecto |
| `API_KEY_MAX_EVENTS` | `1000` | Máximo de eventos de API key |
| `API_KEY_DEFAULT_EXPIRY_DAYS` | `90` | Expiración de key por defecto |
| `API_KEY_LEGACY_EXPIRY_DAYS` | `365` | Expiración de migración de key legacy |
| `API_KEY_ENTROPY_BYTES` | `32` | Entropía de generación de key |
| `ABAC_POLICY_CACHE_MAX` | `100` | Máximo de entradas en caché de políticas OPA |
| `MCP_SCAFFOLD_TIMEOUT_MS` | `120000` | Timeout del comando scaffold (2 min) |
| `AGENT_RUNTIME_URL` | `http://localhost:3000` | URL del Agent Runtime |
| `EVOLITH_API_KEY` | (vacío) | API key para autenticación |
| `JWT_SECRET` | (vacío) | Secreto JWT para validación de tokens |
| `NODE_ENV` | `production` | Entorno (default fail-closed) |

---

## Core API

| Variable | Default | Descripción |
|---|---|---|
| `THROTTLE_TTL_MS` | `60000` | TTL del throttler (1 min) |
| `THROTTLE_MAX_REQUESTS` | `100` | Máximo de solicitudes por ventana TTL |
| `REDIS_CACHE_TTL_MS` | `300000` | TTL de caché Redis (5 min) |
| `REDIS_CACHE_MAX_ENTRIES` | `1000` | Máximo de entradas en caché Redis |
| `CIRCUIT_BREAKER_TIMEOUT_MS` | `10000` | Timeout por llamada (10s) |
| `CIRCUIT_BREAKER_RESET_TIMEOUT_MS` | `30000` | Timeout de reset (30s) |
| `CIRCUIT_BREAKER_ERROR_THRESHOLD_PCT` | `50` | Porcentaje de umbral de error |
| `COMMAND_HISTORY_MAX_ENTRIES` | `1000` | Máximo de entradas de historial |
| `COMMAND_HISTORY_DEFAULT_LIMIT` | `50` | Tamaño de página de consulta por defecto |
| `COMMAND_HISTORY_RECENT_WINDOW_MS` | `86400000` | Ventana "reciente" (24h) |
| `EVOLITH_API_KEY` | (vacío) | API key para autenticación |
| `CORE_API_AUTH_REQUIRED` | `true` | Fail-closed: rechazar sin autenticar |
| `DAPR_HTTP_PORT` | `3500` | Puerto del sidecar Dapr |
| `NODE_ENV` | `production` | Entorno |
| `CORS_ORIGINS` | (vacío) | Orígenes permitidos (vacío = denegar todo) |
| `SWAGGER_ENABLED` | `false` | Habilitar Swagger UI |
| `WORKSPACE_ROOT` | (vacío) | Raíz para resolución de satélites |
| `CORE_PATH` | (vacío) | Ruta al repo de Evolith Core |

---

## Agent Runtime API

| Variable | Default | Descripción |
|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | `60000` | Ventana de rate limit (1 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Máximo de solicitudes por ventana por IP |
| `WORKSPACE_MAX_FILES` | `800` | Máximo de archivos del corpus satélite |
| `WORKSPACE_MAX_FILE_BYTES` | `524288` | Máximo de bytes por archivo (512 KB) |
| `WORKSPACE_MAX_TOTAL_BYTES` | `8388608` | Máximo de bytes totales (8 MB) |
| `KNOWLEDGE_TEXT_PREVIEW_LENGTH` | `120` | Longitud de vista previa de texto (caracteres) |
| `AGENT_RUNTIME_API_KEY` | (vacío) | API key para autenticación |
| `AGENT_RUNTIME_JWT_SECRET` | (vacío) | Secreto JWT |
| `AGENT_RUNTIME_ALLOW_NO_AUTH` | `false` | Permitir acceso sin autenticar |
| `NODE_ENV` | `production` | Entorno |
| `CORS_ORIGINS` | (vacío) | Orígenes permitidos |
| `CORE_API_URL` | `http://localhost:3000` | URL del Core API |
| `SANDBOX_TIMEOUT_MS` | `120000` | Timeout del sandbox (2 min) |

---

## CLI (`@beyondnet/evolith-cli`)

| Variable | Default | Descripción |
|---|---|---|
| `CLI_COMMAND_TIMEOUT_MS` | `120000` | Timeout de ejecución de comando (2 min) |
| `CLI_HISTORY_DEFAULT_LIMIT` | `20` | Tamaño de página de historial por defecto |
| `EVOLITH_CORE_URL` | `http://localhost:3000` | URL del Core API |
| `AGENT_RUNTIME_URL` | `http://localhost:3000` | URL del Agent Runtime |
| `GITHUB_TOKEN` | (vacío) | Token de acceso personal de GitHub |
| `EVOLITH_API_TIMEOUT_MS` | `30000` | Timeout del cliente SDK (30s) |

---

## Agent Runtime (dominio)

| Variable | Default | Descripción |
|---|---|---|
| `MIN_TOKEN_BUDGET` | `1000` | Mínimo de tokens antes de rutear al motor stub |

---

## Transversales

| Variable | Servicios | Default | Descripción |
|---|---|---|---|
| `NODE_ENV` | Todos | `production` | Modo de entorno (default fail-closed) |
| `RATE_LIMIT_WINDOW_MS` | MCP, Agent API | `60000` | Ventana de rate limit compartida |
| `RATE_LIMIT_MAX_REQUESTS` | MCP, Agent API | `100` | Máximo de rate limit compartido |

---

*Este documento se auto-mantiene. Al añadir una nueva variable de entorno a cualquier servicio, actualiza este archivo y el `.env.example` correspondiente.*
