# Core API Technical API Reference

> **Bilingual Navigation:** [Versión en Español](./api-reference.es.md)

This document provides detailed technical specifications for all public endpoints exposed by the **Evolith Core API**.

---

## 1. Global Standards & Envelope Conformance

All domain endpoints enforce versioning in their URI path using the `/api/v1/...` prefix; `/health*` and `/metrics` are version-neutral. Every JSON response is automatically wrapped by the `EnvelopeInterceptor` (success) or `HttpExceptionFilter` (error) into the **ADR-0073** standard output envelope. The `/metrics` endpoint is exempt (raw Prometheus text).

The `meta` object is **flat** — `command`, `executedAt`, `durationMs`, `correlationId`, `context`, and `schemaVersion` are siblings (there is no nested `timing` object). The `context` object only carries the request scope (`initiative`, `tenant`, `phase`) and is populated from `x-evolith-*` headers, query params, or the request body when present.

### Successful Response Envelope (`200 OK` / `201 Created`)

```json
{
  "success": true,
  "data": {
    "...": "Endpoint-specific response payload"
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

### Error Response Envelope (`4xx` / `5xx`)

Errors carry the same envelope and `meta` shape. The `error.details` object is an RFC 9457 Problem Details body (`type`, `title`, `status`, `detail`, `instance`, `timestamp`, optional `traceId`/`errors`); the response also sets `X-Problem-Format: rfc9457`. The `error.code` is one of `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UNPROCESSABLE_ENTITY`, `TOO_MANY_REQUESTS`, or `INTERNAL_ERROR`.

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

## 2. Reference Endpoints

These endpoints provide metadata about active rulesets, gates, and SDLC requirements.

### List Rulesets
* **Route:** `GET /api/v1/rulesets`
* **Summary:** Lists all rulesets currently available to API clients.
* **Response `data`:** Array of `RulesetSummary` objects with fields `{ id, title, description, version? }` (`version` is omitted when the source manifest has none). There is no `name` or `category` field.
  ```json
  [
    {
      "id": "satellite-contracts",
      "title": "Satellite Contracts ruleset",
      "description": "Contract rules every satellite repository must satisfy.",
      "version": "1.0.0"
    }
  ]
  ```

### Get Ruleset
* **Route:** `GET /api/v1/rulesets/:id`
* **Summary:** Retrieves details of a specific ruleset.
* **Parameters:** `id` (URL-encoded ruleset identifier)
* **Response `data`:** Full ruleset JSON schema and rules array.

### Get Gate
* **Route:** `GET /api/v1/gates/:gateId`
* **Summary:** Retrieves definition of an SDLC phase gate.
* **Parameters:** `gateId` (e.g. `PG1`). The handler parses the first integer in `gateId` and matches it against `gate.phase` (a number); `404 NOT_FOUND` when no gate matches.
* **Response `data`:** A `PhaseGate` object. `phase` is a **number** (the parsed gate number); there is no `id` field.
  ```json
  {
    "phase": 1,
    "name": "Business Sign-Off",
    "description": "Scope frozen; funding authorized; architectural constraints aligned.",
    "playbookRef": "../../reference/core/sdlc/01-playbooks/phase-1-business-signoff.md",
    "mandatoryEvidence": [
      { "artifact": "PRD", "schemaRef": "../schema/prd.schema.json", "status": "Approved" }
    ],
    "blockingCriteria": [
      { "criterion": "Scope is ambiguous", "action": "BLOCK — return to Phase 1" }
    ],
    "accountableRole": "Product Owner",
    "waiverAuthority": "Executive Sponsor",
    "waiverRequiredFields": ["criterion", "justification", "risk", "owner", "expirationDate", "mitigationPlan"]
  }
  ```

### Get Phase Requirements
* **Route:** `GET /api/v1/phases/:phase/requirements`
* **Summary:** Retrieves evidence requirements for an SDLC phase.
* **Parameters:** `phase` (e.g., `1`, `2`, `3`). The handler parses the first integer and matches `gate.phase`; `404 NOT_FOUND` when no gate matches.
* **Response `data`:** The same `PhaseGate` shape returned by [Get Gate](#get-gate).

---

## 3. Architecture & Topology Endpoints

These endpoints expose topology listings, satellite validation, and drift auditing.

### List Topologies
* **Route:** `GET /api/v1/architecture/topologies`
* **Summary:** Lists all available topologies.
* **Caching:** Responses are served from the Redis-backed cache (see `CacheInterceptor`) under the `topology` TTL. Use the [Invalidate Topology Cache](#invalidate-topology-cache) endpoint to force a refresh after the underlying topology manifests change.
* **Response `data`:** Array of topology manifests.

### Get Topology
* **Route:** `GET /api/v1/architecture/topologies/:id`
* **Summary:** Retrieves details of a specific topology.
* **Caching:** Cached under the `topology` TTL. Invalidated together with the topology list via [Invalidate Topology Cache](#invalidate-topology-cache).
* **Parameters:** `id` (e.g., `modular-monolith`)

### Validate Satellite
* **Route:** `POST /api/v1/architecture/validate-satellite`
* **Body:**
  ```json
  {
    "workspaceRef": "satellite-name-or-path"
  }
  ```
* **Response `data`:**
  ```json
  {
    "verdict": "passed",
    "violations": []
  }
  ```

### Detect Drift
* **Route:** `POST /api/v1/architecture/detect-drift`
* **Body:**
  ```json
  {
    "workspaceRef": "satellite-name-or-path",
    "declaredLevel": "F1"
  }
  ```
* **Response `data`:** List of drift violations and mismatch indicators.

### Invalidate Topology Cache
* **Route:** `POST /api/v1/architecture/cache/invalidate`
* **Summary:** Evicts the cached topology entries so the next `List Topologies` / `Get Topology` request is recomputed from the source manifests.
* **Body:** _none_
* **Response:** `200 OK`
* **Response `data`:**
  ```json
  {
    "invalidated": true,
    "keys": ["topology:list"]
  }
  ```

---

## 4. Phase & Gate Execution Endpoints

These endpoints trigger validation, proposed state advances, and phase transitions.

### Evaluate Gate
* **Route:** `POST /api/v1/gates/:gateId/evaluate`
* **Parameters:** `gateId` (e.g., `PG0-01`)
* **Body:**
  ```json
  {
    "workspaceRef": "satellite-name-or-path"
  }
  ```
* **Response `data`:** The controller returns the `GateEvidence` payload produced by `EvaluateGateUseCase.execute(...)` verbatim. This shape is owned by `@evolith/core-domain` (`domain/gate-evidence.ts`). `phase` is the canonical SDLC phase id resolved from `gateId`, and `evaluatedBy` defaults to `human` when the caller does not supply it.
  ```json
  {
    "gateId": "discovery-baseline-gate",
    "phase": "discovery",
    "verdict": "passed",
    "rulesetRef": "rulesets/phase-gates/phase-gates.rules.json",
    "rulesetVersion": "1.0.0",
    "violations": [],
    "evaluatedAt": "2026-06-21T14:00:00.000Z",
    "evaluatedBy": "human"
  }
  ```

### Transition Phase
* **Route:** `POST /api/v1/phases/transition`
* **Body:**
  ```json
  {
    "from": "discovery",
    "to": "design",
    "tools": ["validate-docs", "check-bilingual-parity"],
    "workspaceRef": "satellite-name-or-path"
  }
  ```

### Initialize Project
* **Route:** `POST /api/v1/projects/initialize`
* **Body:**
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
* **Note:** `options` is an optional free-form object (`@IsOptional()` `Record<string, unknown>`); its inner keys (`runtime`, `architecture`, `database`, `apiProtocol`, ...) are **not** validated against an enum by the DTO. They are passed through to the scaffolder as hints, so values such as `apiProtocol: "graphql"` are accepted by the API regardless of whether the scaffolder supports them.
* **Response:** `201 Created`

### Propose Phase Advance
* **Route:** `POST /api/v1/projects/propose-advance`
* **Body:**
  ```json
  {
    "workspaceRef": "satellite-name-or-path",
    "currentPhase": "phase-1",
    "targetPhase": "phase-2",
    "triggerDeploy": false
  }
  ```
* **Notes:** `currentPhase` is optional — when the caller omits it, the controller falls back to `targetPhase` so the exit gate is always evaluated.

---

## 5. Composable Validation (GT-312)

### Composable Validate
* **Route:** `POST /api/v1/validate/composable`
* **Summary:** Runs the composable validation engine, combining up to five modes (SDLC, Architecture, Ruleset, ADR, Ad-hoc) in a single call. Each mode activates when its trigger field is present.
* **Body:**
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
* **Fields:** `workspaceRef` (**required**, opaque ref); `engine` (`native` | `opa`, default `native`); `topology` activates Architecture mode; `phase` activates SDLC mode (canonical ids `discovery`, `design`, `construction`, `qa`, `release`); `ruleset` activates Ruleset mode; `adr` activates ADR mode; `file` activates Ad-hoc mode.
* **Recognised topologies:** `modular-monolith`, `distributed-modules`, `microservices`, `serverless`, `edge-computing`, `event-driven`, `data-mesh`, `agentic-ai`.
* **Recognised ADRs:** `adr-0002`, `adr-0005`, `adr-0010`, `adr-0018`, `adr-0032`, `adr-0040`, `adr-0050`.
* **Validation note:** `engine`, `topology`, and `adr` are declared with `@IsString()` only — the enum lists above are Swagger documentation metadata, not validation constraints. An arbitrary string passes DTO validation; an unrecognised value is rejected (or ignored) downstream by the validation engine, not as a `400` at the DTO layer.

---

## 6. Operational Endpoints (version-neutral)

These endpoints are **not** versioned (no `/api/v1` prefix) and are exempt from rate limiting (`@SkipThrottle()`) so orchestrator probes and Prometheus scrapers see stable URIs across major versions.

### Health
* **Route:** `GET /health` — returns `{ "status": "OK", "service": "Evolith Core API", "timestamp": "..." }`. This is a lightweight process check; it does **not** verify the corpus or dependencies (use [Readiness](#readiness) for that).

### Liveness
* **Route:** `GET /health/live` — returns `{ "status": "UP", "timestamp": "..." }` when the process is running.

### Readiness
* **Route:** `GET /health/ready` — verifies the corpus (`phase-gates.rules.json` under `CORE_PATH`) and metrics are reachable. Returns `200` with `{ "status": "UP", "checks": { "corpus": "UP", "metrics": "UP" }, "timestamp": "..." }`, or `503` with `status: "DOWN"` when a check fails.

### Metrics
* **Route:** `GET /metrics` — Prometheus text exposition (`Content-Type: text/plain`). Combines application and Redis-cache metrics. Returned raw (no envelope).

> **Rate limiting:** all other routes are throttled globally to **100 requests / 60 s** per client (`ThrottlerModule`); exceeding the limit returns `429 TOO_MANY_REQUESTS`.

---

[Back to Product Hub](./README.md)
