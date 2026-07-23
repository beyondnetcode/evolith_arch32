# Evolith Core — Environment Variables Reference

> **Bilingual Navigation:** [Versión en Español](./env-variables.es.md)

**Status:** Active Reference
**Owner:** Evolith Architecture Board
**Created:** 2026-07-23
**Last Updated:** 2026-07-23

This document catalogs **every environment variable** across all Evolith services. Each variable reads from `process.env` with a sensible default, allowing operators to tune behavior per environment without redeployment.

**Pattern:** `process.env.VAR ?? defaultValue` (or `||` for numeric fallbacks)

---

## MCP Server (`@beyondnet/evolith-mcp`)

| Variable | Default | Description |
|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in milliseconds (1 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window per IP |
| `MCP_MAX_BODY_BYTES` | `1048576` | Max request body size (1 MB) |
| `HTTP_REQUEST_TIMEOUT_MS` | `30000` | Request timeout (30s) |
| `HTTP_KEEPALIVE_TIMEOUT_MS` | `65000` | Keep-alive timeout (65s) |
| `MCP_HTTP_HOST` | `0.0.0.0` | HTTP bind address |
| `MCP_SERVER_PORT` | `3000` | HTTP port |
| `MCP_CACHE_TTL_MS` | `600000` | Cache TTL (10 min) |
| `MCP_CACHE_MAX_ENTRIES` | `500` | Max cache entries |
| `AUDIT_MAX_EVENTS` | `1000` | Max in-memory audit events |
| `AUDIT_DEFAULT_QUERY_LIMIT` | `50` | Default query page size |
| `API_KEY_MAX_EVENTS` | `1000` | Max API key events |
| `API_KEY_DEFAULT_EXPIRY_DAYS` | `90` | Default key expiry |
| `API_KEY_LEGACY_EXPIRY_DAYS` | `365` | Legacy key migration expiry |
| `API_KEY_ENTROPY_BYTES` | `32` | Key generation entropy |
| `ABAC_POLICY_CACHE_MAX` | `100` | Max OPA policy cache entries |
| `MCP_SCAFFOLD_TIMEOUT_MS` | `120000` | Scaffold command timeout (2 min) |
| `AGENT_RUNTIME_URL` | `http://localhost:3000` | Agent Runtime URL |
| `EVOLITH_API_KEY` | (empty) | API key for authentication |
| `JWT_SECRET` | (empty) | JWT secret for token validation |
| `NODE_ENV` | `production` | Environment (fail-closed default) |

---

## Core API

| Variable | Default | Description |
|---|---|---|
| `THROTTLE_TTL_MS` | `60000` | Throttler TTL (1 min) |
| `THROTTLE_MAX_REQUESTS` | `100` | Max requests per TTL window |
| `REDIS_CACHE_TTL_MS` | `300000` | Redis cache TTL (5 min) |
| `REDIS_CACHE_MAX_ENTRIES` | `1000` | Redis cache max entries |
| `CIRCUIT_BREAKER_TIMEOUT_MS` | `10000` | Per-call timeout (10s) |
| `CIRCUIT_BREAKER_RESET_TIMEOUT_MS` | `30000` | Reset timeout (30s) |
| `CIRCUIT_BREAKER_ERROR_THRESHOLD_PCT` | `50` | Error threshold percentage |
| `COMMAND_HISTORY_MAX_ENTRIES` | `1000` | Max history entries |
| `COMMAND_HISTORY_DEFAULT_LIMIT` | `50` | Default query page size |
| `COMMAND_HISTORY_RECENT_WINDOW_MS` | `86400000` | "Recent" window (24h) |
| `EVOLITH_API_KEY` | (empty) | API key for authentication |
| `CORE_API_AUTH_REQUIRED` | `true` | Fail-closed: reject unauthenticated |
| `DAPR_HTTP_PORT` | `3500` | Dapr sidecar port |
| `NODE_ENV` | `production` | Environment |
| `CORS_ORIGINS` | (empty) | Allowed origins (empty = deny all) |
| `SWAGGER_ENABLED` | `false` | Enable Swagger UI |
| `WORKSPACE_ROOT` | (empty) | Root for satellite resolution |
| `CORE_PATH` | (empty) | Path to Evolith Core repo |

---

## Agent Runtime API

| Variable | Default | Description |
|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (1 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window per IP |
| `WORKSPACE_MAX_FILES` | `800` | Max files from satellite corpus |
| `WORKSPACE_MAX_FILE_BYTES` | `524288` | Max bytes per file (512 KB) |
| `WORKSPACE_MAX_TOTAL_BYTES` | `8388608` | Max total bytes (8 MB) |
| `KNOWLEDGE_TEXT_PREVIEW_LENGTH` | `120` | Text preview length (chars) |
| `AGENT_RUNTIME_API_KEY` | (empty) | API key for authentication |
| `AGENT_RUNTIME_JWT_SECRET` | (empty) | JWT secret |
| `AGENT_RUNTIME_ALLOW_NO_AUTH` | `false` | Allow unauthenticated access |
| `NODE_ENV` | `production` | Environment |
| `CORS_ORIGINS` | (empty) | Allowed origins |
| `CORE_API_URL` | `http://localhost:3000` | Core API URL |
| `SANDBOX_TIMEOUT_MS` | `120000` | Sandbox timeout (2 min) |

---

## CLI (`@beyondnet/evolith-cli`)

| Variable | Default | Description |
|---|---|---|
| `CLI_COMMAND_TIMEOUT_MS` | `120000` | Command execution timeout (2 min) |
| `CLI_HISTORY_DEFAULT_LIMIT` | `20` | Default history page size |
| `EVOLITH_CORE_URL` | `http://localhost:3000` | Core API URL |
| `AGENT_RUNTIME_URL` | `http://localhost:3000` | Agent Runtime URL |
| `GITHUB_TOKEN` | (empty) | GitHub personal access token |
| `EVOLITH_API_TIMEOUT_MS` | `30000` | SDK client timeout (30s) |

---

## Agent Runtime (domain)

| Variable | Default | Description |
|---|---|---|
| `MIN_TOKEN_BUDGET` | `1000` | Min tokens before routing to stub engine |

---

## Cross-cutting

| Variable | Services | Default | Description |
|---|---|---|---|
| `NODE_ENV` | All | `production` | Environment mode (fail-closed default) |
| `RATE_LIMIT_WINDOW_MS` | MCP, Agent API | `60000` | Shared rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | MCP, Agent API | `100` | Shared rate limit max |

---

*This document is auto-maintained. When adding a new environment variable to any service, update this file and the corresponding `.env.example`.*
