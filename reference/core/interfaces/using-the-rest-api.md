# How to use the Evolith Core REST API

A practical guide to integrating Evolith Core over its HTTP API. This is the surface
the **Evolith Tracker** consumes (and any other integrator): middleware over the
Core — which is a **stateless evaluation engine** — exposed behind a uniform
envelope.

It is meant to be read once and consulted per endpoint afterwards.

---

## 1. What the API is, and how you call it

The Core holds no state: it receives an **evaluation context** and returns a
**verdict**. The API exposes that evaluation, plus the reference data a consumer
needs (rulesets, topologies, phase requirements), over HTTP.

- **Base URL:** every business endpoint lives under `/api/v1/…` (URI versioning).
  For example: `POST /api/v1/evaluate`.
- **Format:** `application/json` on both request and response.
- **Health and metrics endpoints** (`/health`, `/metrics`) are *version-neutral* —
  no `/api/v1` prefix.

A call looks like this:

```http
POST /api/v1/gates/PG1/evaluate
Content-Type: application/json

{ "workspaceRef": "op_01j7wq8e2n", "evaluatedBy": "ci" }
```

---

## 2. Three concepts that apply to (almost) every endpoint

### 2.1. The response envelope (ADR-0073)

Every response — success or error — is wrapped the same way. On success:

```json
{ "success": true, "data": { /* the result */ },
  "meta": { "executedAt": "…", "correlationId": "…", "schemaVersion": "1.0.0" } }
```

On error, an envelope carrying the same domain `code` the CLI and MCP use:

```json
{ "success": false, "error": { "code": "RULESET_NOT_FOUND", "message": "…" }, "meta": { /* … */ } }
```

The HTTP status matches the semantics (`200` success, `422` unprocessable input,
`503` unavailable, and so on), but the envelope's `error.code` is the stable
contract you should read.

### 2.2. `workspaceRef`, not paths

The Core is stateless and **does not accept raw filesystem paths** over the
network. Instead, most endpoints ask for a **`workspaceRef`**: an opaque
reference the Tracker issues and the Core resolves server-side. Think of it as a
handle to the satellite's content, not as a local path.

### 2.3. Authentication

In production the API is protected by an **API key** (`ApiKeyGuard`). If
`EVOLITH_API_KEY` is not configured, the API runs **unauthenticated** — useful in
development, not in production, and the server warns about it in the logs. When
it is active, the key travels in the header your deployment agreed on.

---

## 3. Evaluation and architecture

This group is the heart of the Core: it takes a context you describe and returns a verdict. Every endpoint hangs off the `/api/v1` base. Because the Core is *stateless* (ADR-0101), it never receives raw paths into your repository: the Tracker BFF hands you an opaque `workspaceRef` that the Core resolves server-side. The one exception is `POST /evaluate`, which also accepts the satellite's content **inline** in the body itself.

### 3.1. `POST /evaluate` — evaluate a full context

**What it does.** This is the Core's canonical entry point (ADR-0101). You send an `EvaluationContext` and get back an `EvaluationResult` with the overall verdict (gates + compliance + architecture). It accepts three ways of saying "what to evaluate", in this order of precedence: **inline** (`evaluationInput.files` — the satellite's content travels in the body and is evaluated in memory, touching neither disk nor network), **canonical** (an opaque `workspaceRef` the Core resolves) and **legacy** (`satellitePath`, a disk path, kept for compatibility). Send none of the three and it answers `400`.

**Body** (`EvaluationContextDto`; the fields marked optional are optional because the chosen mode decides which ones apply):

| Field | Type | Req | What for |
| --- | --- | --- | --- |
| `evaluationInput.files` | object `{ path: content }` | optional | The satellite's content, **inline**. A map of relative path → content; it must include `evolith.yaml` at the root. When present it wins over `workspaceRef`/`satellitePath`, and the Core evaluates it in memory. |
| `workspaceRef` | string | optional | Opaque workspace reference (ADR-0074) that the Core resolves server-side. This is the canonical path when you are not sending the content inline. |
| `kinds` | string[] | optional | Which evaluation kinds to ask for, e.g. `["gate","compliance"]`. |
| `phaseId` | string | optional | The canonical SDLC phase to evaluate (`discovery`…`release`). |
| `gateId` | string | optional | A specific gate to evaluate within the context. |
| `topologyRef` | string | optional | Topology to evaluate against, or to override with. |
| `tenant` / `product` / `initiative` | object | optional | Opaque context (tenant, product and initiative ids). These are never Core entities: they are echoed as context, never resolved. |
| `artifacts`, `evidence`, `checkpoint`, `deployment`, `architecture`, `design`, `sdlcConfig`, `customConstraints`, … | object/array | optional | Declared facts of the canonical `EvaluationContext`. The Core evaluates what you declare here; it does not scan your disk. |
| `satellitePath`, `corePath`, `topology`, `phase` | string | optional (legacy) | Disk paths to the satellite/Core plus overrides. Used only on the legacy path, when `workspaceRef` is absent. |

**Example** (the inline path — the Core evaluates the content you send it):

```
POST /api/v1/evaluate
Content-Type: application/json

{
  "kinds": ["gate", "compliance"],
  "phaseId": "construction",
  "evaluationInput": {
    "files": {
      "evolith.yaml": "coreRef:\n  version: 1.0.0\n",
      "docs/prd.md": "# PRD"
    }
  }
}
```

**What to expect.** The success envelope with `data` = the `EvaluationResult` (overall verdict + `outcome`) on the canonical or inline path, or the legacy verdict if you used `satellitePath`. In-memory evaluation is *stateless*: the files you send are never written to disk. If the Core has no inline path configured, or cannot resolve `corePath`, it answers `400` with the reason.

### 3.2. `POST /gates/{gateId}/evaluate` — evaluate a phase gate

**What it does.** Evaluates **one** phase gate and returns its evidence (`GateEvidence`): which artifacts it requires, which are present, and the verdict. The `gateId` goes in the path, and the Core reads its **first digit** to know which phase it belongs to: `1`→`discovery`, `2`→`design`, `3`→`construction`, `4`→`qa`, `5`→`release`. An id whose first digit is not in `1..5` is rejected with `400` — it will not quietly evaluate the wrong gate.

**Body** (`EvaluateGateDto`):

| Field | Type | Req | What for |
| --- | --- | --- | --- |
| `workspaceRef` | string | **yes** | Opaque workspace reference issued by the Tracker BFF; the Core resolves it to know which satellite to evaluate. |
| `evaluatedBy` | `human` \| `agent` \| `ci` | optional | Who is evaluating. Recorded in the `GateEvidence` (parity with CLI/MCP). Defaults to `human`. |

**Example:**

```
POST /api/v1/gates/PG3-01/evaluate
Content-Type: application/json

{
  "workspaceRef": "op_01j7wq8e2n",
  "evaluatedBy": "ci"
}
```

**What to expect.** The success envelope with `data` = the gate's evidence (phase, `passed`/`failed` verdict, violations naming the missing artifact and its location). In this example, `PG3-01` maps to the `construction` gate.

### 3.3. `POST /validate/composable` — multi-mode validation

**What it does.** Runs the "composable" engine, which detects automatically which validation modes apply to the context (SDLC, architecture, ruleset, ADR and ad-hoc) and runs them all, instead of making you pick one by hand. It is the REST equivalent of `evolith-cli validate --composable`.

**Body** (`ComposableValidateDto`):

| Field | Type | Req | What for |
| --- | --- | --- | --- |
| `workspaceRef` | string | **yes** | Opaque workspace reference the Core resolves (it validates the format and refuses to escape the permitted root). |
| `engine` | `native` \| `opa` | optional | Which rule engine to use. Defaults to `native`. |
| `topology` | string | optional | Narrow to one topology: `modular-monolith`, `distributed-modules`, `microservices`, `serverless`, `edge-computing`, `event-driven`, `data-mesh`, `agentic-ai`. |
| `phase` | string | optional | Narrow to one phase: `discovery`…`release` (the legacy `f1`..`f5` aliases are accepted as deprecated). |
| `ruleset` | string | optional | Validate a single ruleset by id. |
| `adr` | string | optional | Validate conformance to one ADR (e.g. `adr-0002`). |
| `file` | string | optional | Validate a single file (ad-hoc mode). |

**Example:**

```
POST /api/v1/validate/composable
Content-Type: application/json

{
  "workspaceRef": "op_01j7wq8e2n",
  "engine": "native",
  "phase": "construction"
}
```

**What to expect.** The envelope with the combined results of every mode that applied. Narrowing with `topology`/`phase`/`ruleset`/`adr`/`file` reduces the modes that run.

### 3.4. `POST /architecture/validate-satellite` — validate a satellite against architecture rules

**What it does.** Validates a satellite against the Core's architecture rules. Pass a `manifest` and it triggers the end-to-end evaluation pipeline (gates included) and returns the ADR-0073 envelope; omit it and you get the direct validation result.

**Body** (`ValidateSatelliteDto`):

| Field | Type | Req | What for |
| --- | --- | --- | --- |
| `workspaceRef` | string | **yes** | Opaque workspace reference the Core resolves to locate the satellite. |
| `manifest` | object (`SatelliteManifestDto`) | optional | The manifest that switches on the full pipeline. Its key fields: `satellitePath` (the satellite's path), `corePath` (the Core), `topology` (override; auto-detected when omitted), `phase` (given, it evaluates only that phase's gates) and `facts` (declared facts projected from the canonical `EvaluationContext`: context, gate, evidence, waivers). |

**Example:**

```
POST /api/v1/architecture/validate-satellite
Content-Type: application/json

{
  "workspaceRef": "op_01j7wq8e2n",
  "manifest": {
    "satellitePath": "/path/to/satellite",
    "phase": "construction"
  }
}
```

**What to expect.** With a `manifest`, the evaluation envelope (gate verdict + compliance). Without one, the raw validation result object.

### 3.5. `POST /architecture/detect-drift` — detect architectural drift

**What it does.** Compares the satellite's **declared** maturity level against the one **detected** in the code, and reports the drift (new, persistent or resolved violations). It is the REST equivalent of `evolith-cli drift`.

**Body** (`DetectDriftDto`):

| Field | Type | Req | What for |
| --- | --- | --- | --- |
| `workspaceRef` | string | **yes** | Opaque workspace reference the Core resolves to analyse the project. |
| `declaredLevel` | string | optional | The maturity level you declare (e.g. `F2`), to contrast with the detected one. |

**Example:**

```
POST /api/v1/architecture/detect-drift
Content-Type: application/json

{
  "workspaceRef": "op_01j7wq8e2n",
  "declaredLevel": "F2"
}
```

**What to expect.** The drift result: whether there was drift, declared level versus detected, and the list of violations.

### 3.6. `POST /architecture/recommend-topology` — recommend a topology composition

**What it does.** From technical signals (team count, independent deployment, high scale, asynchronous integration and so on) it recommends **how to compose** the topology and explains why each piece is there. It is *advisory* and not binding (ADR-0104 / GT-430): the Core recommends in Discovery, the tenant confirms in Design. It shares the exact engine (`TopologyRecommendationService.recommend`) with the CLI `topology recommend` command and the equivalent MCP tool, so all three surfaces give the same answer.

**Body** (`RecommendTopologyDto`):

| Field | Type | Req | What for |
| --- | --- | --- | --- |
| `signals` | object `{ signal: boolean \| number }` | optional | Technical signals that steer the recommendation. Booleans (`deploymentIndependence`, `asyncIntegration`, `highScale`, `dataProductSharing`, `spikyLoad`, `latencyTolerant`, `edgeOrOffline`, `aiAgents`) plus a numeric `teamCount`. Omit it and the recommendation runs over empty signals. |

**Example:**

```
POST /api/v1/architecture/recommend-topology
Content-Type: application/json

{
  "signals": { "deploymentIndependence": true, "asyncIntegration": true, "teamCount": 4 }
}
```

**What to expect.** The recommendation with the suggested `composition` and the `rationale` — one reason per topology, each with its `ruleId`. If the Core cannot find the recommendation ruleset in its checkout, it answers `404`.

### 3.7. `POST /architecture/evaluate-phase-artifacts` — measure phase artifact completeness

**What it does.** For a **downstream** phase and an already-confirmed topology composition, it measures the artifacts you declare as present against the **union** of that phase's universal artifacts plus the ones each topology requires in its profile, and returns a completeness score. This is *advisory* too (ADR-0104 / DN-06 / GT-434): the Core measures, the tenant's gate decides. It shares its engine (`PhaseArtifactProfileService.evaluate`) with the CLI `topology phase-artifacts` and the MCP tool.

**Body** (`EvaluatePhaseArtifactsDto`):

| Field | Type | Req | What for |
| --- | --- | --- | --- |
| `phase` | `construction` \| `quality` \| `deployment` | **yes** | The downstream phase to measure. Any other value is rejected. |
| `topologies` | string[] | **yes** | The confirmed topology composition (e.g. `["microservices","event-driven"]`); the per-topology artifact profile comes from here. |
| `declaredArtifacts` | string[] | optional | Artifact types you declare as present (e.g. `["test-summary-report","coverage-report"]`). Omit it and everything reads as missing. |

**Example:**

```
POST /api/v1/architecture/evaluate-phase-artifacts
Content-Type: application/json

{
  "phase": "quality",
  "topologies": ["microservices", "event-driven"],
  "declaredArtifacts": ["test-summary-report", "coverage-report"]
}
```

**What to expect.** The result with the completeness score and the lists of required, present, missing and conditional artifacts.

### 3.8. `GET /architecture/topologies` — list the available topologies

**What it does.** Returns the full catalog of topology manifests the Core knows about (the ones `recommend-topology` and `validate/composable` use). It takes no body, and the response is cached server-side.

**Example:**

```
GET /api/v1/architecture/topologies
```

**What to expect.** The envelope with an array of topology manifests (id, name, spec, phase profiles, and so on).

### 3.9. `GET /architecture/topologies/{id}` — get one topology by id

**What it does.** Returns the manifest of **one** topology by its id. Useful for inspecting a specific profile — which artifacts it requires in each phase, for instance — before composing.

**Arguments** (in the path):

| Field | Type | Req | What for |
| --- | --- | --- | --- |
| `id` | string (path) | **yes** | Id of the topology to fetch, e.g. `microservices`. |

**Example:**

```
GET /api/v1/architecture/topologies/microservices
```

**What to expect.** The envelope with that topology's manifest. If the id does not exist, it answers `404`.

### 3.10. `POST /architecture/cache/invalidate` — invalidate the topology cache

**What it does.** Invalidates the server-side cache of the topology catalog — the one behind `GET /architecture/topologies`, and consumed by `recommend-topology` and `validate/composable`. Use it after publishing changes to the Core's topology manifests so the next read picks them up without waiting for the cache to expire. This is an **infra/ops-only** operation: it has no CLI or MCP equivalent (deliberately exempt on those surfaces) and is exposed over REST alone.

**Arguments.** None; it takes no body.

**Example:**

```
POST /api/v1/architecture/cache/invalidate
```

**What to expect.** The success envelope confirming the cache was invalidated; the next topology query resolves from the Core's corpus again.

### 3.11. `POST /phases/transition` — execute a phase transition

**What it does.** Performs the handover from one phase to another: it transitions the artifacts by running the tools you name and leaves the project positioned in the target phase. Unlike the CLI's transition proposal (`phase advance`), this one **executes** the transition. A naming note: it uses the numbered scheme `phase-0`, `phase-1`, … rather than the canonical SDLC phases.

**Body** (`TransitionPhaseDto`, all required):

| Field | Type | Req | What for |
| --- | --- | --- | --- |
| `from` | string | **yes** | Source phase (e.g. `phase-0`). |
| `to` | string | **yes** | Target phase (e.g. `phase-1`). |
| `tools` | string[] | **yes** | Tools to run during the transition (e.g. `["lint","test"]`). |
| `workspaceRef` | string | **yes** | Opaque workspace reference the Core resolves, so it operates on the right project. |

**Example:**

```
POST /api/v1/phases/transition
Content-Type: application/json

{
  "from": "phase-0",
  "to": "phase-1",
  "tools": ["lint", "test"],
  "workspaceRef": "op_01j7wq8e2n"
}
```

**What to expect.** The success envelope with `data` = the transition result, under the canonical command name `evolith-cli phase transition`.

### 3.12. `POST /architecture-plans/evaluate` — evaluate an architecture plan

**What it does.** Takes a draft **architecture plan** (Design-phase Advisory Governance, ADR-0104), runs it through the OPA engine and returns the **evaluated** plan: it suggests the SDLC mode (`full`/`tailored`/`minimal`/`rejected`) and the approvals required. The Core is stateless: it suggests the transition but **does not persist it**, leaving the plan in `under_review`.

**Body** (`Partial<ArchitecturePlan>` — you send the draft, and absent fields take defaults):

| Field | Type | Req | What for |
| --- | --- | --- | --- |
| `title` | string | optional | The plan's title. |
| `prompt_source` | string | optional | Where the prompt or request behind the plan came from. |
| `scope` | object | optional | Scope `{ functional, technical }`. |
| `impact` | object | optional | Impact `{ components[], interfaces[] }`. |
| `risk_assessment` | object | optional | Risk `{ criticality, complexity, security_risks[], architectural_risks[] }` (criticality and complexity are `low`/`medium`/`high`). |
| `execution_plan` | object | optional | Plan `{ suggested_sdlc_phases[], mandatory_gates[], suggested_adrs[], applicable_policies[] }`. |
| `governance` | object | optional | Governance; the engine fills in `sdlc_mode_suggested` and `required_approvals`. |

**Example:**

```
POST /api/v1/architecture-plans/evaluate
Content-Type: application/json

{
  "title": "New checkout microservice",
  "prompt_source": "initiative-3ds",
  "scope": { "functional": "3DS payments", "technical": "Isolated service + queue" },
  "risk_assessment": { "criticality": "high", "complexity": "medium", "security_risks": ["PCI"], "architectural_risks": [] }
}
```

**What to expect.** The evaluated plan, with `governance.sdlc_mode_suggested`, `governance.required_approvals` and `status: "under_review"`. Fields you did not send take their defaults (version `1`, a generated `audit_trail`).

## 4. Reference data, satellites, projects and health

This group gathers the read-only endpoints over the Core's rule corpus
(rulesets, gates and phase requirements), the satellite registry, the project
lifecycle operations, and the health and observability probes your orchestrator
uses. Apart from `/metrics`, every response follows the envelope and the
authentication conventions described at the top of this guide.

### 4.1. `GET /api/v1/rulesets` — list the Core's rulesets

**What it does.** Returns the catalog of rulesets (governance rule sets) the Core
has loaded and exposes to API clients. It is the starting point for discovering
which rules exist before querying one in detail. Read-only: it does not touch the
satellite and does not require the mutative gate.

**Arguments.** None. No path parameters and no body.

**Example:**

```http
GET /api/v1/rulesets
```

**What to expect.** In `data`, an array of ruleset summaries (canonical identifier
and basic metadata for each). The array may come back empty if the Core has no
rules loaded at the configured path.

### 4.2. `GET /api/v1/rulesets/:id` — get a ruleset by its identifier

**What it does.** Returns the full content of one ruleset, identified by its
canonical identifier. Use it once you know which ruleset you care about — after
listing, for instance — and want to see its rules.

**Arguments:**

| Field | Type | Req | What for |
|-------|------|-----|----------|
| `id` | string (path) | Yes | The ruleset's canonical identifier, **URL-encoded**. Identifiers usually contain `/` or other characters, so they must be encoded to travel in the path. |

**Example:**

```http
GET /api/v1/rulesets/sdlc%2Fphase-gates
```

**What to expect.** In `data`, the ruleset's content. If the identifier does not
exist, the response is `404` with `success: false` and the error
`Ruleset '<id>' was not found`.

### 4.3. `GET /api/v1/gates/:gateId` — get a phase gate definition

**What it does.** Returns the definition of one SDLC gate: what that gate
evaluates, and the criteria under which passage to the next phase is approved or
blocked. Useful for inspecting a gate's rules without running an evaluation.

**Arguments:**

| Field | Type | Req | What for |
|-------|------|-----|----------|
| `gateId` | string (path) | Yes | Identifier of the gate to fetch, e.g. `PG1`. It decides which gate is returned. |

**Example:**

```http
GET /api/v1/gates/PG1
```

**What to expect.** In `data`, the gate definition. If the `gateId` does not
exist, the response is `404` with the error `Gate '<gateId>' was not found`.

### 4.4. `GET /api/v1/phases/:phase/requirements` — an SDLC phase's requirements

**What it does.** Returns the evidence and the blocking requirements of one
lifecycle phase: what a project must satisfy in that phase before it can advance.
This is the reference for knowing what the gates will ask of you before you
propose an advance.

**Arguments:**

| Field | Type | Req | What for |
|-------|------|-----|----------|
| `phase` | string (path) | Yes | The phase identifier, e.g. `1`. Selects the phase whose requirements are returned. |

**Example:**

```http
GET /api/v1/phases/1/requirements
```

**What to expect.** In `data`, the phase's requirements (evidence and blocking
requirements). If the phase does not exist, the response is `404` with the error
`Phase '<phase>' was not found`.

### 4.5. `POST /api/v1/satellites` — register a satellite

**What it does.** Registers a new satellite in the Core's registry. A satellite is
a repository governed by the Core; registering it makes it visible to the rest of
the operations (query, update, link). This is mutative: it creates a new record.

**Body:**

| Field | Type | Req | What for |
|-------|------|-----|----------|
| `id` | string | Yes | Unique identifier for the satellite (e.g. `sat_001`). This is the key you will reference it by afterwards. |
| `name` | string | Yes | Human-readable name (e.g. `auth-service`), so a person can identify it. |
| `parentCorePath` | string | No | Path to the core satellite this one extends (e.g. `/cores/auth`). It declares which core it derives from. |

**Example:**

```http
POST /api/v1/satellites
Content-Type: application/json

{
  "id": "sat_001",
  "name": "auth-service",
  "parentCorePath": "/cores/auth"
}
```

**What to expect.** `201 Created` and, in `data`, the newly created satellite
record: it carries `status` (`registered`) and `registeredAt` (an ISO timestamp)
alongside the fields you sent.

### 4.6. `GET /api/v1/satellites` — list every satellite

**What it does.** Returns every satellite registered in the Core. It is the
registry's overview; read-only.

**Arguments.** None.

**Example:**

```http
GET /api/v1/satellites
```

**What to expect.** In `data`, an array of satellite records. Each carries `id`,
`name`, `status`, `registeredAt` and, where they apply, `parentCorePath`,
`linkedSatelliteId` and `linkedAt`.

### 4.7. `GET /api/v1/satellites/:id` — get a satellite by ID

**What it does.** Returns one satellite's record by identifier. Use it to check a
satellite's current state — whether it is already linked, for example.

**Arguments:**

| Field | Type | Req | What for |
|-------|------|-----|----------|
| `id` | string (path) | Yes | Identifier of the satellite to fetch. It selects which record is returned. |

**Example:**

```http
GET /api/v1/satellites/sat_001
```

**What to expect.** In `data`, the satellite record. If the `id` does not exist,
the response is `404` with the error `Satellite '<id>' not found`.

### 4.8. `PATCH /api/v1/satellites/:id` — update a satellite

**What it does.** Modifies fields of an already-registered satellite. Only the
fields you send change; the rest are preserved. This is mutative.

**Path arguments:**

| Field | Type | Req | What for |
|-------|------|-----|----------|
| `id` | string (path) | Yes | Identifier of the satellite to update. |

**Body (all optional; send only what you want to change):**

| Field | Type | Req | What for |
|-------|------|-----|----------|
| `name` | string | No | New human-readable name for the satellite. |
| `linkedSatelliteId` | string | No | ID of the core satellite this one links to. |
| `parentCorePath` | string | No | Path to the parent core satellite. |
| `linkedAt` | string | No | ISO timestamp of the link. The service normally sets this automatically when linking, so you rarely send it by hand. |

**Example:**

```http
PATCH /api/v1/satellites/sat_001
Content-Type: application/json

{
  "name": "auth-service-v2"
}
```

**What to expect.** In `data`, the updated satellite record with your changes
applied.

### 4.9. `POST /api/v1/satellites/:id/link` — link a satellite to its parent core

**What it does.** Links a satellite (the one in the path, the source) to a parent
core satellite (the target). After linking, the source record carries
`linkedSatelliteId` pointing at the target, `status` set to `linked`, and
`linkedAt` with the timestamp. Both satellites must already exist in the registry.

**Path arguments:**

| Field | Type | Req | What for |
|-------|------|-----|----------|
| `id` | string (path) | Yes | ID of the source satellite to link. |

**Body:**

| Field | Type | Req | What for |
|-------|------|-----|----------|
| `targetSatelliteId` | string | Yes | ID of the target satellite (the parent core) the source links to. |

**Example:**

```http
POST /api/v1/satellites/sat_001/link
Content-Type: application/json

{
  "targetSatelliteId": "sat_core_001"
}
```

**What to expect.** `200 OK` and, in `data`, the source record already updated:
`status: "linked"`, `linkedSatelliteId` equal to the target, and `linkedAt` set.

### 4.10. `POST /api/v1/projects/initialize` — initialize a project

**What it does.** Starts a new project by materializing its skeleton from a set of
technology decisions (runtime, architecture, database and so on). It operates on
the workspace the Tracker's opaque reference resolves to, not on a local path.
This is mutative.

**Body:**

| Field | Type | Req | What for |
|-------|------|-----|----------|
| `workspaceRef` | string | Yes | Opaque workspace reference issued by the Tracker BFF (e.g. `op_01j7wq8e2n`). The Core resolves it to know which workspace to materialize into. |
| `name` | string | Yes | The project's name. |
| `type` | string | Yes | Project type (e.g. `nestjs`). It acts as the default runtime when you do not set one in `options`. |
| `options` | object | No | Further scaffolding decisions. Each key overrides a default. |

Inside `options` the recognised keys include `runtime` (default `nodejs`),
`monorepo` (`npm-workspaces`), `architecture` (`clean`), `database`
(`postgresql`), `apiProtocol` (`rest`), `ciCd` (`github-actions`),
`observability` (`opentelemetry`), plus the `features` and `agents` arrays. Send
none of them and those defaults apply.

**Example:**

```http
POST /api/v1/projects/initialize
Content-Type: application/json

{
  "workspaceRef": "op_01j7wq8e2n",
  "name": "my-service",
  "type": "nestjs",
  "options": {
    "database": "postgresql",
    "features": ["auth", "audit"]
  }
}
```

**What to expect.** `201 Created` and, in `data`, the project initialization
result — the materialized skeleton and the decisions applied.

### 4.11. `POST /api/v1/projects/propose-advance` — propose a phase advance

**What it does.** Proposes that a project advance from one lifecycle phase to the
next. The Core evaluates the current phase's exit gate and returns whether the
advance holds. Omit `currentPhase` and the Core uses `targetPhase` as the source
phase, so the evaluation always has a defined starting point.

**Body:**

| Field | Type | Req | What for |
|-------|------|-----|----------|
| `workspaceRef` | string | Yes | Opaque workspace reference from the Tracker BFF. It identifies the project to evaluate. |
| `targetPhase` | string | Yes | The phase to advance to (e.g. `phase-2`). |
| `currentPhase` | string | No | The current phase, whose exit gate is evaluated (e.g. `phase-1`). Omitted, it falls back to `targetPhase`. |
| `triggerDeploy` | boolean | No | When `true`, triggers the deployment after advancing. |

**Example:**

```http
POST /api/v1/projects/propose-advance
Content-Type: application/json

{
  "workspaceRef": "op_01j7wq8e2n",
  "currentPhase": "phase-1",
  "targetPhase": "phase-2",
  "triggerDeploy": false
}
```

**What to expect.** `200 OK` and, in `data`, the results of the advance proposal:
the gate's verdict and the detail of which requirements are met or are blocking
the passage.

### 4.12. `GET /health` — health check (liveness + readiness)

**What it does.** Confirms at a glance that the service is healthy. It is the
combined liveness and readiness probe. This endpoint is **version-neutral** (no
`/api/v1`) and **public**: it requires no API key, so orchestrators can poll it.

**Arguments.** None.

**Example:**

```http
GET /health
```

**What to expect.** In `data`, an object with `status: "OK"`, `service: "Evolith
Core API"` and an ISO `timestamp`. It follows the standard envelope.

### 4.13. `GET /health/live` — liveness probe

**What it does.** Reports only that the process is alive — started and
responding. It checks no dependencies. This is the lightweight probe that tells
the orchestrator whether to restart the process. Version-neutral and public.

**Arguments.** None.

**Example:**

```http
GET /health/live
```

**What to expect.** In `data`, `status: "UP"` and an ISO `timestamp`.

### 4.14. `GET /health/ready` — readiness probe

**What it does.** Reports whether the service is ready to take traffic: it
verifies that the rule corpus (the phase-gates file) is reachable and that the
metrics subsystem is available. Unlike `live`, it does check dependencies.
Version-neutral and public.

**Arguments.** None.

**Example:**

```http
GET /health/ready
```

**What to expect.** With everything up, `data` carries `status: "UP"`, a `checks`
object with `corpus` and `metrics` both `UP`, and a `timestamp`. If a dependency
fails, the response is `503 Service Unavailable` with `status: "DOWN"`, the same
`checks` object naming what is `DOWN`, and a `timestamp`.

### 4.15. `GET /metrics` — Prometheus metrics

**What it does.** Exposes the application and cache metrics in Prometheus text
format, for a scraper to collect. It is version-neutral (no `/api/v1`) and,
unlike everything else in this guide, it does **not** follow the JSON envelope:
it returns plain Prometheus exposition text. Access is protected by its own
metrics guard.

**Arguments.** None.

**Example:**

```http
GET /metrics
```

**What to expect.** `Content-Type: text/plain` and, in the body, the metrics in
Prometheus exposition format (application metrics followed by cache metrics).
There is no envelope and no `data` field: the body is the text Prometheus
consumes, directly.
