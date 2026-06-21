# Core API Technical API Reference

> **Bilingual Navigation:** [Versión en Español](./api-reference.es.md)

This document provides detailed technical specifications for all public endpoints exposed by the **Evolith Core API**.

---

## 1. Global Standards & Envelope Conformance

All API endpoints enforce versioning in their URI path using the `/api/v1/...` prefix. Every request response conforms to the **ADR-0073** standard output envelope.

### Successful Response Envelope (`200 OK` / `201 Created`)

```json
{
  "success": true,
  "data": {
    "...": "Endpoint-specific response payload"
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

### Error Response Envelope (`4xx` / `5xx`)

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable description of the error",
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

## 2. Reference Endpoints

These endpoints provide metadata about active rulesets, gates, and SDLC requirements.

### List Rulesets
* **Route:** `GET /api/v1/rulesets`
* **Summary:** Lists all rulesets currently available to API clients.
* **Response `data`:**
  ```json
  [
    {
      "id": "rulesets/governance/satellite-contracts.rules.json",
      "name": "Satellite Contracts ruleset",
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
* **Parameters:** `gateId` (e.g. `PG1`)
* **Response `data`:**
  ```json
  {
    "id": "PG1",
    "phase": "conception",
    "name": "Conception Baseline Gate",
    "mandatoryEvidence": ["PRD", "architecture-proposal"]
  }
  ```

### Get Phase Requirements
* **Route:** `GET /api/v1/phases/:phase/requirements`
* **Summary:** Retrieves evidence requirements for an SDLC phase.
* **Parameters:** `phase` (e.g., `1`, `2`, `3`)

---

## 3. Architecture & Topology Endpoints

These endpoints expose topology listings, satellite validation, and drift auditing.

### List Topologies
* **Route:** `GET /api/v1/architecture/topologies`
* **Summary:** Lists all available topologies.
* **Response `data`:** Array of topology manifests.

### Get Topology
* **Route:** `GET /api/v1/architecture/topologies/:id`
* **Summary:** Retrieves details of a specific topology.
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
* **Response `data`:** Conforms to `GateEvidence` structure:
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
* **Response:** `201 Created`

### Propose Phase Advance
* **Route:** `POST /api/v1/projects/propose-advance`
* **Body:**
  ```json
  {
    "targetPhase": "design",
    "workspaceRef": "satellite-name-or-path",
    "triggerDeploy": false
  }
  ```

---

[Back to Product Hub](./README.md)
