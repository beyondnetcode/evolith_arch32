# How to use Evolith Core over MCP (for agents)

A practical guide to operating Evolith Core from an **AI agent** through the MCP
(Model Context Protocol) server. Where the CLI is the local interface for a
person, MCP is the interface through which an agent exercises the same
capabilities — at full parity, filesystem and scaffolding operations included.

It is written to be read once and consulted per tool afterwards.

---

## 1. What the MCP server is, and how an agent connects to it

The Evolith MCP server exposes every Core capability as a **tool** (`evolith-*`)
that an agent invokes over JSON-RPC on HTTP (the StreamableHTTP transport). The
connection flow is always the same:

1. **`initialize`** — the client says hello; the server answers and issues an
   `mcp-session-id` in the headers. Keep it: it travels with every later request.
2. **`notifications/initialized`** — the client confirms that it is ready.
3. **`tools/list`** — (optional) lists the tools together with their `inputSchema`.
4. **`tools/call`** — invokes a tool with its arguments.

A tool call looks like this:

```json
{ "jsonrpc": "2.0", "id": 1, "method": "tools/call",
  "params": { "name": "evolith-gate-evaluate", "arguments": { "phase": "construction", "projectPath": "/path/to/satellite" } } }
```

If you use an MCP client (Claude, an SDK, and so on), the client performs the
handshake; you only pick the tool and its arguments.

---

## 2. Three concepts that apply to (almost) every tool

### 2.1. The response envelope (ADR-0073)

Every tool returns its result inside the same envelope, in the `text` of the
response content:

```json
{ "success": true, "data": { /* the result */ },
  "meta": { "command": "evolith-gate-evaluate", "tool": "evolith-gate-evaluate", "executedAt": "…", "correlationId": "…", "schemaVersion": "1.0.0" } }
```

And on failure:

```json
{ "success": false, "error": { "code": "RULESET_NOT_FOUND", "message": "…" }, "meta": { /* … */ } }
```

The error codes are consistent with the CLI and with REST (for example, a missing
rule corpus is `RULESET_NOT_FOUND` on all three surfaces).

### 2.2. Mutative tools — the approval gate

Tools that **write** (create repositories, generate code, modify files or state)
are marked as **mutative**. The server blocks them unless the agent explicitly
confirms the intent by passing, on top of the tool's own arguments:

```json
{ "apply": true, "approvalToken": "<approval-token>" }
```

Without `apply` + `approvalToken`, a mutative tool returns
`error.code: FORBIDDEN` with a message asking for the approval. This keeps an
agent from performing irreversible actions without a conscious decision.
Read-only tools (`*-list`, `*-get`, `*-status`, `evaluate`, `validate`,
`recommend`…) require none of this.

> Each tool below states whether it is **mutative** (needs approval) or
> **read-only**.

### 2.3. Access control (ABAC)

Every tool carries an access classification (`read` / `write` / `admin`), and the
server evaluates it against the role of the session before executing. In an
environment with no API key (`--allow-no-auth`, typical in development) every
session is granted the `admin` role; in production an API key is configured and
the roles are honoured. If a session is not authorized for a tool, the answer is
`error.code: FORBIDDEN`.

---

## 3. Evaluation, gates and validation

This is the operational heart of Evolith: seven tools for checking that your satellite complies with the Core rules, for evaluating the gates of each lifecycle phase, and for detecting architectural drift. All seven are **read-only**: they never modify your repository, so you can invoke them freely without the mutative gate (`apply` + `approvalToken`) that the write tools demand.

They all take a path to your satellite (and, almost always, an optional path to the Core checkout the rules come from). If you do not pass `corePath`, each tool tries to autodetect it by walking up the directory tree looking for a `rulesets/` folder; if it does not find one, you get a `RULESET_NOT_FOUND` error.

### 3.1. `evolith-evaluate` — the canonical evaluation engine

**What it does.** It is the MCP surface of the Core's stateless evaluation engine (ADR-0101). It takes a canonical `EvaluationContext` (gates, compliance, artifacts, rules) and returns a complete `EvaluationResult`. It is the tool with the closest parity to `POST /api/v1/evaluate` and to the CLI's `evolith-cli evaluate` command: use it when you want a rich, multi-dimensional evaluation in a single call. `tenant`, `product` and `initiative` are opaque context only (never entities the Core persists).

**Arguments**

| field | type | req | what for |
|-------|------|-----|----------|
| `kinds` | string[] | no | Which dimensions to evaluate, e.g. `['gate','compliance']`. If omitted, it evaluates `['gate','compliance']` by default. |
| `workspaceRef` | string | no | Opaque reference to the workspace; locally it is a path. Defaults to the current directory. |
| `corePath` | string | no | Explicit path to the Core repository (where the rules come from). |
| `tenant` | object | no | Opaque tenant context `{ tenantId }`, for traceability only. |
| `product` | object | no | Opaque product context `{ productId }`. |
| `initiative` | object | no | Opaque initiative context `{ initiativeId }`. |
| `phaseId` | string | no | Canonical SDLC phase to evaluate: `discovery`, `design`, `construction`, `qa` or `release`. |
| `gateId` | string | no | Id of a specific gate to evaluate. |
| `rulesetRef` | string | no | Versioned reference to the ruleset to apply. |
| `topologyRef` | string | no | Topology reference or override. |
| `executionMode` | string | no | Execution mode: `manual`, `hybrid` or `agentic`. |
| `correlationId` | string | no | The consumer's correlation id; it is echoed back unchanged in the response. |

**Example**

```json
{
  "name": "evolith-evaluate",
  "arguments": {
    "kinds": ["gate", "compliance"],
    "workspaceRef": "/path/to/my-satellite",
    "corePath": "/path/to/evolith-core",
    "phaseId": "construction"
  }
}
```

**What to expect.** An `EvaluationResult` wrapped in the success envelope (ADR-0073): `{ success, data, meta }`, where `data` carries the verdict per evaluated dimension, the timestamp (`evaluatedAt`), the schema version and the `correlationId` (yours if you passed one, otherwise a generated one). Because it is stateless, the result depends only on what you send: same context, same result.

### 3.2. `evolith-gate-evaluate` — evaluate a single phase gate

**What it does.** It evaluates the gate of one specific SDLC phase against your repository and returns the evidence: which criteria are met, which violations exist and at what severity. This is the tool you reach for to answer "can I close phase X?". You can ask for the full evidence or just a summary with the counts.

**Arguments**

| field | type | req | what for |
|-------|------|-----|----------|
| `phase` | string | yes | The phase whose gate is evaluated: `discovery`, `design`, `construction`, `qa` or `release`. If it is invalid, the tool returns a `PHASE_INVALID` error. |
| `projectPath` | string | yes | Path to the repository to validate. |
| `rulesetRef` | string | no | Optional reference to a specific ruleset. |
| `evidenceMode` | string | no | `full` (the default) returns every violation; `summary` hides them and returns only the count of errors and warnings. |
| `evaluatedBy` | string | no | Who is evaluating: `human`, `agent` (the default) or `ci`. It is recorded in the evidence. |
| `initiative` | string | no | Optional initiative context. |
| `tenant` | string | no | Optional tenant context. |

**Example**

```json
{
  "name": "evolith-gate-evaluate",
  "arguments": {
    "phase": "design",
    "projectPath": "/path/to/my-satellite",
    "evidenceMode": "summary",
    "evaluatedBy": "agent"
  }
}
```

**What to expect.** The `GateEvidence` payload (wrapped by the server in the standard envelope). In `full` mode it includes the list of `violations` with `ruleId`, `severity` and message; in `summary` mode, `violations` comes back empty and a `summary: { errors, warnings }` object appears instead. If the ruleset cannot be found, you get a `RULESET_NOT_FOUND` error.

### 3.3. `evolith-validate` — validate the satellite against the rules

**What it does.** It runs the Core's governance rules over your satellite and tells you what complies and what does not. It has two modes: the simple mode (direct validation against the rulesets) and the end-to-end pipeline mode, which switches on the moment you pass `topology`, `phase` or `manifest` and evaluates topology plus phase gates in one go, flattening the evidence per gate.

**Arguments**

| field | type | req | what for |
|-------|------|-----|----------|
| `path` | string | yes | Path to the satellite repository to validate. |
| `format` | string | no | Output format: `json` (the default), `summary` or `table`. Pick `summary`/`table` for a quick human read. |
| `ruleset` | string | no | Id of a specific ruleset to load instead of validating everything. |
| `corePath` | string | no | Explicit path to the Core; if omitted, it is autodetected by walking up until a `rulesets/` folder is found. |
| `topology` | string | no | Topology to evaluate (autodetected from the manifest if omitted). **Switches on the end-to-end pipeline.** |
| `phase` | string | no | SDLC phase to evaluate (`discovery`…`release`). **Switches on the end-to-end pipeline.** |
| `manifest` | string | no | A `SatelliteManifest` as inline JSON or a path to a file; it takes precedence over `path`/`topology`/`phase`. |

**Example**

```json
{
  "name": "evolith-validate",
  "arguments": {
    "path": "/path/to/my-satellite",
    "corePath": "/path/to/evolith-core",
    "phase": "construction",
    "topology": "modular-monolith"
  }
}
```

**What to expect.** In simple mode, a `ValidationResult` with `status`, `rulesChecked` and `issues`. In pipeline mode (as in the example), a `type: 'pipeline'` object with `passed`, the resolved `topology` and a `gates` array, each gate carrying its `evaluations` (rule, artifact, `passed`, message, severity and remediation). If the manifest is invalid, the response comes back marked as an error with the detail of why.

### 3.4. `evolith-composable-validate` — validation by combinable modes

**What it does.** It exposes the composable validation engine (GT-312): instead of one monolithic validation, you switch on the modes you need — SDLC, architecture, ruleset, ADR or ad-hoc over a single file — and you can combine them in one call. Every argument you pass turns on its corresponding mode. It is the most flexible tool when you want to aim at something very specific (for instance, "validate ADR-0032 only, with the OPA engine").

**Arguments**

| field | type | req | what for |
|-------|------|-----|----------|
| `path` | string | yes | Path to the satellite repository. |
| `corePath` | string | no | Optional path to the Core. |
| `engine` | string | no | Validation engine: `native` (the default) or `opa`. |
| `topology` | string | no | Switches on architecture mode for that topology (`modular-monolith`, `distributed-modules`, `microservices`, `serverless`, `edge-computing`, `event-driven`, `data-mesh`, `agentic-ai`). |
| `phase` | string | no | Switches on SDLC mode for that phase (`discovery`…`release`). |
| `ruleset` | string | no | Switches on ruleset mode for one specific ruleset (e.g. `compliance-baseline`, `definition-of-done`). |
| `adr` | string | no | Switches on ADR mode for one specific decision (`adr-0002`, `adr-0005`, `adr-0010`, `adr-0018`, `adr-0032`, `adr-0040`, `adr-0050`). |
| `file` | string | no | Switches on ad-hoc mode to validate a single file. |

**Example**

```json
{
  "name": "evolith-composable-validate",
  "arguments": {
    "path": "/path/to/my-satellite",
    "engine": "opa",
    "phase": "qa",
    "adr": "adr-0032"
  }
}
```

**What to expect.** A `type: 'composable'` object with the aggregated result of every mode you switched on, plus a timestamp. If you switch on no mode at all (just `path`), the engine runs with no criteria and the result comes back empty; switch on at least one mode to get useful evaluations.

### 3.5. `evolith-architecture-validate` — validate architecture along the maturity axis

**What it does.** It validates the architecture of the repository along the progressive maturity axis: modular monolith → distributed modules → microservices. It cumulatively checks modular independence, contract boundaries and extraction readiness, according to the level you ask for. With `deep: true` it adds deep static analysis of the import graph (layer violations, coupling between contexts, instability metrics).

**Arguments**

| field | type | req | what for |
|-------|------|-----|----------|
| `path` | string | yes | Path to the repository to analyse. |
| `level` | string | no | Target topology on the progressive axis: `modular-monolith` (the default), `distributed-modules` or `microservices`. The higher the level, the more cumulative checks are applied. |
| `deep` | boolean | no | `true` to enable the deep static analysis (import graph, layers, coupling). `false` by default. |

**Example**

```json
{
  "name": "evolith-architecture-validate",
  "arguments": {
    "path": "/path/to/my-satellite",
    "level": "microservices",
    "deep": true
  }
}
```

**What to expect.** An object with `level`, `status` (`passed`/`failed`, depending on whether there are blocking issues), `issuesChecked`, `blockingIssues` and the `issues` array (each with `ruleId`, `level`, `title`, `severity` and `blocking`). With `deep: true` you also see `ARCH-COUPLING` issues carrying the coupling metrics. The shared OPA checks are added best-effort: if they fail, the native validation still applies.

### 3.6. `evolith-drift-detect` — detect architectural drift

**What it does.** It compares the current state of the repository against what the Core rules expect and reports the architectural drift: whatever has pulled away from the declared architecture. It is a quick diagnostic tool, with no configuration beyond the two paths.

**Arguments**

| field | type | req | what for |
|-------|------|-----|----------|
| `path` | string | yes | Path to the repository to analyse. |
| `corePath` | string | no | Explicit path to the Core; if you omit it, a sibling folder `../evolith` is assumed. |

**Example**

```json
{
  "name": "evolith-drift-detect",
  "arguments": {
    "path": "/path/to/my-satellite",
    "corePath": "/path/to/evolith-core"
  }
}
```

**What to expect.** An object with `repository`, the timestamp and `result`, which holds the drift report computed by the drift service. If detection fails (because it cannot find the Core, for example), the response comes back marked as an error carrying the failure message rather than throwing an exception.

### 3.7. `evolith-phase-artifacts-evaluate` — phase artifact completeness (advisory)

**What it does.** It measures, in an advisory and non-binding way (ADR-0104), how complete the artifacts of a downstream phase are for a topology composition that has already been confirmed. It compares the artifacts you declare as present against the UNION of that phase's universal artifacts and the phase profiles (`phaseProfiles`) of each topology. It is stateless: it tells you what is missing, but it blocks nothing. It produces the same result as `POST /api/v1/architecture/evaluate-phase-artifacts` and `evolith-cli topology phase-artifacts`.

**Arguments**

| field | type | req | what for |
|-------|------|-----|----------|
| `phase` | string | yes | Downstream phase to measure: `construction`, `quality` or `deployment`. |
| `topologies` | string[] | yes | Ids of the confirmed topologies whose composition determines the required artifacts. |
| `declaredArtifacts` | string[] | no | Artifact types the consumer declares as already present; what is missing is computed against this. |
| `corePath` | string | no | Explicit path to the Core; if you omit it, `../evolith` is assumed. |

**Example**

```json
{
  "name": "evolith-phase-artifacts-evaluate",
  "arguments": {
    "phase": "deployment",
    "topologies": ["microservices", "event-driven"],
    "declaredArtifacts": ["dockerfile", "helm-chart"],
    "corePath": "/path/to/evolith-core"
  }
}
```

**What to expect.** The result in the success envelope (ADR-0073), with the `required`, `present` and `missing` artifacts for that phase and composition, plus a `completeness` metric. Being advisory, it is there to steer the outstanding work, not to approve or reject a transition. If `phase` is not one of the three valid values, you get an error response listing the allowed values.

## 4. Topology, SDLC and scaffolding

This group covers three related things: querying and recommending the
architectural **topology** (how your system is grouped), viewing and advancing
through the **lifecycle phases** (SDLC), and **generating starter code and
documentation** for a new satellite.

Before going tool by tool, it is worth being clear that **three different phase
vocabularies** coexist here, and they are not interchangeable:

- **Progressive topology axis** (`modular-monolith`, `distributed-modules`,
  `microservices`, or their aliases `1`/`2`/`3`): it describes how distributed
  the architecture is. `evolith-scaffold` uses it.
- **Scaffolding phases** (`phase-0` … `phase-5`): milestones with required
  artifacts that Evolith checks for in the repo. `evolith-sdlc-status` and
  `evolith-sdlc-handoff` use these.
- **SDLC gate phases** (`discovery`, `design`, `construction`, `qa`,
  `release`): the governance stages whose gates are evaluated.
  `evolith-phase-advance` uses these.

The tools that **write** to disk (`evolith-sdlc-handoff`,
`evolith-sdlc-generate`, `evolith-scaffold`, `evolith-docs-scaffold`) are
**mutative** and go through the cross-cutting `{ apply:true, approvalToken }`
gate described at the top of this guide. The query and recommendation tools are
read-only.

### 4.1. `evolith-topology-list` — list the available topologies

**What it does.** It returns the full catalogue of architectural topologies the
Core knows about. It is the starting point for seeing what options exist before
asking for the detail of one, or for a recommendation. Read-only.

**Arguments**

| field | type | req | what for |
| --- | --- | --- | --- |
| `corePath` | string | no | Explicit path to the Core checkout the topologies come from. If you omit it, a default sibling path is resolved (`../evolith`). |

**Example**

```json
{ "name": "evolith-topology-list", "arguments": {} }
```

**What to expect.** An object with `count` (how many topologies there are) and
`topologies` (the array with every catalogue definition), plus a `timestamp`. If
it cannot find the catalogue under `corePath`, it returns `{ error: true,
message: "Failed to list topologies: …" }`.

### 4.2. `evolith-topology-get` — get a topology by its id

**What it does.** It retrieves the complete definition of a single topology from
its identifier (for example `modular-monolith`). Use it once you know which one
you care about and want to see its specification in detail (including its
per-phase artifact profiles). Read-only.

**Arguments**

| field | type | req | what for |
| --- | --- | --- | --- |
| `id` | string | yes | The id of the topology to retrieve; it is the only mandatory field. |
| `corePath` | string | no | Explicit path to the Core checkout. If you omit it, the default sibling path is used. |

**Example**

```json
{ "name": "evolith-topology-get", "arguments": { "id": "modular-monolith" } }
```

**What to expect.** An object with the `id` you queried and `topology` (the full
definition), plus `timestamp`. If the id does not exist, it returns `{ error:
true, message: "Topology not found: <id>" }`.

### 4.3. `evolith-topology-recommend` — recommend a topology composition

**What it does.** From a set of **technical signals** about your project, it
recommends a topology composition and explains why. It is **advisory** and
stateless (ADR-0104): the Core *recommends* in Discovery, but it is the tenant
who *confirms* in Design; nothing is bound. It produces the same result as
`POST /api/v1/architecture/recommend-topology` and as `evolith-cli topology recommend`.

**Arguments**

| field | type | req | what for |
| --- | --- | --- | --- |
| `signals` | object | no | Map of technical signals (booleans or numbers) describing your context: `teamCount`, `deploymentIndependence`, `highScale`, `asyncIntegration`, `dataProductSharing`, `spikyLoad`, `latencyTolerant`, `edgeOrOffline`, `aiAgents`. The more signals you give, the better informed the recommendation. If it is empty, it falls back to `modular-monolith`. |
| `corePath` | string | no | Explicit path to the Core checkout; it is used to locate the recommendation rules file. |

**Example**

```json
{
  "name": "evolith-topology-recommend",
  "arguments": {
    "signals": { "teamCount": 6, "deploymentIndependence": true, "highScale": true }
  }
}
```

**What to expect.** The result (recommended composition + rationale) wrapped in
the ADR-0073 success envelope `{ success, data, meta }`. If it cannot read the
rules, it returns `{ error: true, message: "Failed to recommend topology: …" }`.

### 4.4. `evolith-sdlc-status` — see the phase state of the satellite

**What it does.** It reads the repo's `evolith.yaml` to find out which phase
(`phase-0` … `phase-5`) it is in and, for each phase, checks which required
artifacts already exist on disk and which are missing. It is the progress
snapshot of the satellite and the basis the handoff operates on. Read-only.

**Arguments**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | yes | Path to the satellite repository whose state you want to inspect. |

**Example**

```json
{ "name": "evolith-sdlc-status", "arguments": { "path": "/path/to/my-satellite" } }
```

**What to expect.** An object with `currentPhase`, `nextPhase`, and
`phaseStatus`: one array entry per phase with its `status` (`complete` / `next` /
`pending`) and the list of `requirements` marking `exists: true|false` for each
artifact. If `path` is missing, it returns `{ error: true, message: "path is
required" }`.

### 4.5. `evolith-sdlc-handoff` — perform the handoff to the next phase

**What it does.** It performs the handoff from one scaffolding phase to the
**immediately following one** (for example `phase-0` → `phase-1`). Before
writing, it demands that the source phase be `complete` (all of its artifacts
present) and that the destination be consecutive; otherwise it fails. When it
does proceed, it writes a handoff manifest to `.evolith/handoff-manifest.json`.
**It is mutative** (it goes through the `{ apply:true, approvalToken }` gate).

**Arguments**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | yes | Path to the satellite repository the handoff is performed on. |
| `fromPhase` | string | yes | Source phase (`phase-0` … `phase-5`); it must be complete. |
| `toPhase` | string | yes | Destination phase; it must be the one consecutive to `fromPhase`. |
| `confirm` | boolean | no | Confirmation flag for the mutative operation. |

**Example**

```json
{
  "name": "evolith-sdlc-handoff",
  "arguments": { "path": "/path/to/my-satellite", "fromPhase": "phase-0", "toPhase": "phase-1" }
}
```

**What to expect.** The handoff manifest: `handoff` (from/to, timestamp, repo),
the list of `artifacts` with their presence, a `validation` block
(`allArtifactsPresent`) and `recommendations` for the phase you are leaving
behind. If the source phase is not complete, or the destination is not
consecutive, the operation throws an error.

### 4.6. `evolith-sdlc-generate` — generate the hexagonal scaffolding from a DDD model

**What it does.** It generates a Hexagonal Architecture skeleton from a Mermaid
`classDiagram` embedded in a DDD model written in Markdown. It reuses the same
core-domain generators the CLI uses (`sdlc generate`), so it is a thin transport
adapter with no logic of its own. **It is mutative**: it writes files unless you
use `dryRun`.

**Arguments**

| field | type | req | what for |
| --- | --- | --- | --- |
| `model` | string | no* | The DDD model in Markdown, **inline** (it must contain a ```` ```mermaid ```` block with a `classDiagram`). An alternative to `from`. |
| `from` | string | no* | Path to a Markdown file holding the DDD model. It is resolved against `output` (or the cwd). An alternative to `model`. |
| `output` | string | no | Destination directory for the generated files (the working directory by default). |
| `dryRun` | boolean | no | If `true`, it reports which files would be created without writing anything. `false` by default. |

\* There are no `required` fields in the schema, but **you must supply either `model` or `from`**;
if both are missing, the tool throws an error.

**Example**

```json
{
  "name": "evolith-sdlc-generate",
  "arguments": { "from": "docs/model.md", "output": "src", "dryRun": true }
}
```

**What to expect.** An object with `targetDir`, `dryRun`, a summary of the
`diagram` (number of classes and relationships, and the list of classes with
their stereotype), and the `created` and `skipped` arrays. If the Markdown does
not contain a valid `classDiagram`, it throws an error explaining that the
Mermaid block is missing.

### 4.7. `evolith-scaffold` — scaffold a satellite along the progressive axis

**What it does.** It creates a full Nx workspace for a new satellite, placing it
on the progressive maturity axis: **phase 1** (`modular-monolith`) generates a
standard SPA; **phases 2–3** (`distributed-modules` / `microservices`) generate a
Module Federation host with its remotes. In every case it adds the NestJS Service
API, the cross-cutting shells and the DDD bounded-context libraries. It drives
the same strategy as the CLI (`evolith-cli scaffold`). **It is mutative**: it
writes the workspace under `<path>/src`.

**Arguments**

| field | type | req | what for |
| --- | --- | --- | --- |
| `frontend` | string | yes | Frontend framework (`react`, `angular`, `vue`). |
| `orm` | string | yes | ORM of the persistence layer (`prisma`, `typeorm`). |
| `phase` | string | yes | `1|2|3` or the id on the progressive axis (`modular-monolith`, `distributed-modules`, `microservices`); it decides SPA vs. host+remotes. |
| `path` | string | no | Root of the satellite under which `<path>/src` is generated (the server's cwd by default). |
| `apiName` | string | no | Name of the NestJS Service API. `tracker-api` by default. |
| `webAppName` | string | no | Name of the phase-1 SPA. `tracker-web` by default. |
| `hostName` | string | no | Name of the host app (MF) in phases 2/3. `tracker-host` by default. |
| `remotes` | array\|string | no | Names of the remotes in phases 2/3 (an array or a comma-separated string). |
| `domains` | array\|string | no | SDLC bounded contexts to materialise as domain libraries (an array or a comma-separated string). |
| `dryRun` | boolean | no | Reports the planned nx/npm commands without writing or executing anything. `false` by default. |

**Example**

```json
{
  "name": "evolith-scaffold",
  "arguments": {
    "frontend": "react",
    "orm": "prisma",
    "phase": "modular-monolith",
    "domains": "billing,catalog",
    "dryRun": true
  }
}
```

**What to expect.** An object with `status` (`scaffolded` or `dry-run`), the
`frontendFramework`, the `orm`, the normalised `phase` (`1`/`2`/`3`), the
`apiName`, the `domains` and the `baseDir`. Progress is emitted on stderr. If
`phase` is not recognisable, it throws an error listing the valid values.

### 4.8. `evolith-docs-scaffold` — scaffold the baseline documentation

**What it does.** It creates the set of baseline documents Evolith expects in a
satellite (`README.md`, `AGENTS.md`, `MASTER_INDEX.md` and `evolith.yaml`) in a
destination directory. It is the MCP counterpart of the CLI `docs` command.
**It is mutative**: it writes files unless you use `dryRun`.

**Arguments**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | no | Destination directory where the documentation is scaffolded (the server's cwd by default). |
| `template` | string | no | Template set: `default` (every file) or `minimal` (only `README.md` + `AGENTS.md`). `default` by default. |
| `force` | boolean | no | If `true`, it overwrites (updates) files that already exist instead of skipping them. `false` by default. |
| `dryRun` | boolean | no | Computes the create/update/skip plan without writing anything. `false` by default. |

**Example**

```json
{
  "name": "evolith-docs-scaffold",
  "arguments": { "path": "/path/to/my-satellite", "template": "minimal", "dryRun": true }
}
```

**What to expect.** In normal mode, an object with `targetDir`, `created`,
`updated`, `skipped` and the `files` / `skippedFiles` lists. In `dryRun`, the
plan with `toCreate`, `toUpdate`, `skipped` and the detail of each planned file.
Without `force`, files that already exist are counted as skipped.

### 4.9. `evolith-phase-advance` — propose an SDLC gate phase transition

**What it does.** It proposes moving from one governance phase (`discovery`,
`design`, `construction`, `qa`, `release`) to another, **evaluating the exit
gates** of the current phase. It is an **advisory proposal**: it does not mutate
the repo, it only reports whether the gate passes and why. Use it to find out
whether a satellite is ready to move on before deciding on the handoff.

**Arguments**

| field | type | req | what for |
| --- | --- | --- | --- |
| `fromPhase` | string | yes | Current gate phase (`discovery`, `design`, `construction`, `qa`, `release`). |
| `toPhase` | string | yes | Destination phase you want to advance to. |
| `projectPath` | string | yes | Path to the repository the gates are evaluated against. |
| `evaluatedBy` | string | no | Who is evaluating: `human`, `agent` or `ci`. `agent` by default. It is recorded in the proposal. |
| `initiative` | string | no | Optional initiative context for the evaluation. |
| `tenant` | string | no | Optional tenant context for the evaluation. |

**Example**

```json
{
  "name": "evolith-phase-advance",
  "arguments": {
    "fromPhase": "design",
    "toPhase": "construction",
    "projectPath": "/path/to/my-satellite",
    "evaluatedBy": "agent"
  }
}
```

**What to expect.** The proposal payload (gate verdict and criteria evaluation)
wrapped in the ADR-0073 envelope. If `fromPhase` or `toPhase` are not valid gate
phases, it returns a `PHASE_INVALID` error; if it cannot find the rules or the
project, a `RULESET_NOT_FOUND` error.

## 5. Satellite, agents and maintenance

This group covers the *lifecycle of the satellite itself*: creating or adopting it on GitHub and querying it in the local registry, populating it with governance agents, initialising its scaffolding in batch mode, keeping it current when the Core publishes new rules, and two supporting utilities (seeding fixtures and applying automatic fixes). Most of them **write to disk or to remote repositories**: those tools are marked as **mutative** and, as explained at the top of this guide, the call must pass the `{ apply: true, approvalToken }` gate; the read-only ones (`*-list`, `*-status`, `*-validate`, `upgrade-plan`) do not need it.

### 5.1. `evolith-satellite-create` — create the repo on GitHub and register it · **mutative**

**What it does.** It creates a **new repository on GitHub** (via the REST v3 API) and registers it as an Evolith satellite in the local `satellite-registry.json`, in a single step. It is the MCP counterpart of the CLI's `satellite:create` command: it touches GitHub, so it needs a token with the `repo` scope. The registry entry is born with `status: "provisioning"` and `mode: "create"`.

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `token` | string | yes | GitHub personal token (`repo` scope) used to create the repository. |
| `name` | string | yes | Name of the repository to create. |
| `owner` | string | yes | The GitHub user or organisation that will own the repo. |
| `topology` | string | no | Topology to assign: `monolith` \| `modular` \| `micro` \| `distributed` \| `custom` (default `modular`). |
| `phase` | string | no | Initial SDLC phase: `discovery` \| `design` \| `construction` \| `qa` \| `release` (default `discovery`). |
| `description` | string | no | Optional description of the repository. |
| `private` | boolean | no | Creates the repo as private (default `false`, that is, public). |
| `path` | string | no | Directory where the `satellite-registry.json` lives (default: the server's cwd). |

**Example:**

```json
{
  "name": "evolith-satellite-create",
  "arguments": {
    "token": "ghp_xxx",
    "name": "checkout-svc",
    "owner": "acme",
    "topology": "micro",
    "phase": "discovery",
    "private": true
  }
}
```

**What to expect.** The success envelope carries the created registry entry in `data.satellite`: `id` (UUID), `name`, `owner`, `repoUrl`, `cloneUrl`, `sshUrl`, `topology`, `phase`, `status: "provisioning"`, `mode: "create"` and timestamps. If the `owner` is a personal account, the tool transparently retries against `/user/repos`. A GitHub error (invalid token, duplicate name) propagates as an error envelope.

### 5.2. `evolith-satellite-adopt` — adopt an existing repository · **mutative**

**What it does.** It takes a **GitHub repository that already exists**, verifies that it is reachable and brings it under Evolith governance **without creating anything new**: it registers it in the `satellite-registry.json` with `status: "linked"` and `mode: "adopt"`. It is the counterpart of `satellite-create` for a repo that is already running.

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `repoUrl` | string | yes | Full URL of the repository to adopt (`https://github.com/owner/repo`). The owner and the name are extracted from it. |
| `token` | string | yes | GitHub personal token (`repo` scope) used to verify the repository. |
| `topology` | string | no | Topology to assign: `monolith` \| `modular` \| `micro` \| `distributed` \| `custom` (default `modular`). |
| `phase` | string | no | SDLC phase to assign: `discovery` \| `design` \| `construction` \| `qa` \| `release` (default `discovery`). |
| `owner` | string | no | Forces the owner; by default the one appearing in `repoUrl` is taken. |
| `path` | string | no | Directory where the `satellite-registry.json` lives (default: the server's cwd). |

**Example:**

```json
{
  "name": "evolith-satellite-adopt",
  "arguments": {
    "repoUrl": "https://github.com/acme/legacy-api",
    "token": "ghp_xxx",
    "topology": "modular",
    "phase": "design"
  }
}
```

**What to expect.** The success envelope with `data.satellite` (the same shape as `create`, but with `status: "linked"`, `mode: "adopt"` and a `linkedAt` field). If the URL cannot be parsed, or the repository does not exist / is not reachable with that token, the tool throws an error that dispatch turns into an error envelope.

### 5.3. `evolith-satellite-list` — list the registered satellites

**What it does.** It reads the local `satellite-registry.json` and returns every registered satellite (the ones the two previous tools created or adopted). It is read-only; if there is no registry file, it returns an empty list instead of failing.

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `format` | string | no | Output format: `json` (default) or `table` (a readable Markdown table). |
| `path` | string | no | Directory holding the `satellite-registry.json` (default: cwd). |

**Example:**

```json
{
  "name": "evolith-satellite-list",
  "arguments": { "format": "json" }
}
```

**What to expect.** In `json`, the envelope with `data.count` and `data.satellites` (the array of registry entries). With `format: "table"`, `data` is a string holding a `| ID | Name | Owner | Topology | Phase | Status | Mode |` table (the ID truncated to 8 characters), or the text `No satellites registered.` if the registry is empty.

### 5.4. `evolith-satellite-status` — status of one satellite by ID

**What it does.** It looks up one specific satellite in the `satellite-registry.json` by its ID and returns its full record. It accepts the complete UUID or just a **prefix** (a starts-with match), so you do not have to copy the whole UUID.

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `id` | string | yes | Satellite ID, either complete or a prefix of the UUID. |
| `path` | string | no | Directory holding the `satellite-registry.json` (default: cwd). |

**Example:**

```json
{
  "name": "evolith-satellite-status",
  "arguments": { "id": "3f9a" }
}
```

**What to expect.** On a match, the envelope carries `data.found: true` and `data.satellite` with the full record. Otherwise, `data.found: false` with the `id` that was searched for and a "not found" message (this is not an execution error: the envelope is still a success envelope, only with `found: false`).

### 5.5. `evolith-agent-list` — list the installed agents

**What it does.** It walks `rulesets/agents/` under the given directory and lists the installed governance agents, reading their `agent.rules.json` to report version, template and installation date. Read-only.

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `dir` | string | no | Root directory in which to look for `rulesets/agents/` (default: cwd). |

**Example:**

```json
{
  "name": "evolith-agent-list",
  "arguments": { "dir": "." }
}
```

**What to expect.** The envelope with `data.agents` (each with `name`, `version`, `template`, `installedAt`, `rulesetPath`) and `data.count`. If the `rulesets/agents/` folder does not exist, it returns `agents: []` with a `No agents directory found` message.

### 5.6. `evolith-agent-validate` — validate the ruleset of an agent

**What it does.** It validates an installed agent's `agent.rules.json` against the minimum schema: it demands `agent.name`, `ruleset.version` and at least one principle (`principles`). It reports every problem it finds. Read-only.

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `name` | string | yes | Name of the agent to validate (its folder under `rulesets/agents/`). |
| `dir` | string | no | Root directory where the agent lives (default: cwd). |

**Example:**

```json
{
  "name": "evolith-agent-validate",
  "arguments": { "name": "architect-guard" }
}
```

**What to expect.** The envelope with `data.valid` (`true`/`false`), `data.agent`, the `data.issues` list (each with `field` and `message`) and a `timestamp`. If the agent does not exist, `data.valid: false` with an `error` explaining that it was not found.

### 5.7. `evolith-agent-install` — install a governance agent · **mutative**

**What it does.** It installs a new agent: it creates `rulesets/agents/<name>/agent.rules.json` from a template with its principles already populated. Each template brings a different set of principles: `minimal` (one, non-blocking), `standard` (two: standard governance + bilingual support) and `enterprise` (three: full governance, audit trail and approval chain).

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `name` | string | yes | Name of the agent to install (it becomes the name of its folder and of its ruleset). |
| `template` | string | no | Principle template: `standard` (default) \| `minimal` \| `enterprise`. |
| `dir` | string | no | Root directory to install into (default: cwd). |
| `confirm` | boolean | no | Confirmation flag for the mutative operation (on top of the `apply`/`approvalToken` gate described at the top). |

**Example:**

```json
{
  "name": "evolith-agent-install",
  "arguments": { "name": "architect-guard", "template": "enterprise" }
}
```

**What to expect.** The envelope with `data.success: true`, `data.agent`, `data.template`, `data.rulesetPath` (the path that was written) and a confirmation `message`.

### 5.8. `evolith-agent-upgrade` — bump the version of an agent · **mutative**

**What it does.** It bumps the **patch** version of the agent (for example `1.0.0 → 1.0.1`) and rewrites its `agent.rules.json` with the new version. Useful after editing its principles, or to leave a record of a change.

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `name` | string | yes | Name of the agent to upgrade. |
| `dir` | string | no | Root directory where the agent lives (default: cwd). |
| `confirm` | boolean | no | Confirmation flag for the mutative operation (alongside the `apply`/`approvalToken` gate). |

**Example:**

```json
{
  "name": "evolith-agent-upgrade",
  "arguments": { "name": "architect-guard" }
}
```

**What to expect.** The envelope with `data.success: true`, `data.agent`, `data.fromVersion` and `data.toVersion`. If the agent does not exist, the operation **throws an error** (an error envelope), unlike `validate`, which reports it as data.

### 5.9. `evolith-agent-remove` — delete an agent · **mutative**

**What it does.** It deletes the agent's `rulesets/agents/<name>/` folder entirely. It is **irreversible**: it removes its ruleset from disk.

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `name` | string | yes | Name of the agent to delete. |
| `dir` | string | no | Root directory where the agent lives (default: cwd). |
| `confirm` | boolean | no | Confirmation flag for the mutative operation (alongside the `apply`/`approvalToken` gate). |

**Example:**

```json
{
  "name": "evolith-agent-remove",
  "arguments": { "name": "architect-guard" }
}
```

**What to expect.** The envelope with `data.success: true`, `data.agent` and a confirmation `message`. If the agent does not exist, the operation throws an error.

### 5.10. `evolith-agent-run` — run an intent against the Agent Runtime · **mutative**

**What it does.** It sends an *intent* (a goal in natural language) to the **Agent Runtime** and returns the result of the agentic pipeline. It does not write to the satellite directly, but it delegates to a runtime that can execute actions, which is why it is marked mutative. It automatically attaches the server's `cwd` as a parameter.

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `intent` | string | yes | The goal or intention the agent has to resolve. |
| `url` | string | no | URL of the Agent Runtime (default `http://localhost:3000`). |

**Example:**

```json
{
  "name": "evolith-agent-run",
  "arguments": {
    "intent": "Produce the architecture plan for the new payments microservice"
  }
}
```

**What to expect.** If the runtime answers, the envelope with `data.success: true` and `data.result` (the pipeline's response). If the call to the runtime fails (because nothing is listening on that URL, for example), `data.success: false` with `data.error` describing the failure.

### 5.11. `evolith-init-batch` — initialise a satellite in batch mode · **mutative**

**What it does.** **Non-interactive** (batch/CI) initialisation of a satellite: it generates `evolith.yaml`, the folder structure and the baseline artifacts under `<path>/<name>/`, according to the chosen runtime, monorepo, architecture and database. It is the MCP parity of the CLI's `evolith-cli init --config … / --name … --yes`, **with no prompts**: every field comes from the arguments or from a default. It delegates the scaffolding to the same core use case (`InitializeProjectUseCase`) the CLI runs.

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `name` | string | yes | Name of the project/satellite (through this field or inside `config`). |
| `path` | string | no | Directory under which the `<name>/` folder is created (default: the server's cwd). |
| `runtime` | string | no | Runtime: `nodejs` (default) \| `typescript` \| `dotnet` \| `python`. |
| `monorepo` | string | no | Monorepo strategy: `none` (default) \| `nx` \| `npm-workspaces` \| `pnpm-workspaces` \| `rush`. |
| `architecture` / `arch` | string | no | Architecture pattern: `clean` (default) \| `hexagonal` \| `ddd` \| `clean-hex` \| `hex-ddd` \| `event-driven`. `arch` is an alias (it mirrors the CLI's `--arch` flag). |
| `database` / `db` | string | no | Database: `postgresql` (default) \| `mongodb` \| `sqlserver`… `db` is an alias (`--db`). |
| `apiProtocol` | string | no | API protocol: `rest` (default) \| `graphql` \| `grpc` \| `websocket` \| `webhook`. |
| `ciCd` | string | no | CI/CD provider (default `github-actions`). |
| `observability` | string | no | Observability stack (default `opentelemetry`). |
| `features` | string[] | no | Feature flags to scaffold (e.g. `adr`, `hooks`, `acl`). |
| `agents` | string[] | no | Ids of agents to register up front. |
| `config` | object | no | Inline `evolith.setup.json` (`Partial<InitProjectInput>`) used as the base; the individual fields above **override** it. |

**Example:**

```json
{
  "name": "evolith-init-batch",
  "arguments": {
    "name": "payments-api",
    "runtime": "nodejs",
    "architecture": "hexagonal",
    "db": "postgresql"
  }
}
```

**What to expect.** The envelope with `data.input` (the resolved input with every default applied) and `data.result` (the use case's result: created artifacts, warnings and errors). If a `name` cannot be resolved (neither from the field nor from `config`), the tool throws an error, exactly like the CLI's guard.

### 5.12. `evolith-upgrade-plan` — plan a satellite upgrade (read-only)

**What it does.** When the Core (upstream) publishes new rules, it computes **which changes** your satellite needs in order to catch up: the change plan, which of those changes break compatibility, and the estimated risk. **It writes nothing** — it is the read-only half of the CLI's `upgrade` (the CLI combines plan and apply in one command; MCP splits them into two tools, because a single tool cannot be both `read` and `mutative`).

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `satellitePath` | string | no | Path to the satellite project (default: the server's cwd). |
| `corePath` | string | no | Path to the Evolith Core checkout the rules come from (default: the `satellitePath`). |

**Example:**

```json
{
  "name": "evolith-upgrade-plan",
  "arguments": { "satellitePath": ".", "corePath": "../evolith" }
}
```

**What to expect.** If the satellite is already current, the envelope with `data.upToDate: true` and the message "already up to date". If there are changes, `data.upToDate: false`, `data.dryRun: true`, `data.plan` (the full plan), `data.breakingChanges` (how many break compatibility) and a message with the count of planned but unapplied changes.

### 5.13. `evolith-upgrade-apply` — apply the satellite upgrade · **mutative**

**What it does.** It applies the upgrade plan: it **writes the files** into the satellite to bring it up to date with the upstream Core. It is the mutative half of the pair: by default it creates a backup before touching anything and, if it detects breaking changes, it stops unless you pass `force: true`.

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `satellitePath` | string | no | Path to the satellite project (default: the server's cwd). |
| `corePath` | string | no | Path to the Evolith Core checkout (default: the `satellitePath`). |
| `force` | boolean | no | Applies the upgrade **even when there are breaking changes** (default `false`; without it, it stops on breaking changes). |
| `skipBackup` | boolean | no | Skips creating the backup before applying (default `false`). |

**Example:**

```json
{
  "name": "evolith-upgrade-apply",
  "arguments": { "satellitePath": ".", "corePath": "../evolith", "force": false }
}
```

**What to expect.** The envelope with `data.result` (the upgrade result: changes applied, backup, and so on) and `data.report` (the readable upgrade report). Remember to run `evolith-upgrade-plan` first, to review the plan before applying it.

### 5.14. `evolith-fixtures` — seed sample data · **mutative**

**What it does.** It generates reproducible fixtures (sample data) for demos and tests: an `evolith.yaml`, sample ADRs, rulesets, or the whole set, depending on `type`. It uses the same deterministic templates as the CLI's `evolith-cli fixtures` command. It ships a `dryRun` so you can review what it would write before touching disk.

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `type` | string | no | What to seed: `demo` (default: `evolith.yaml` + ADRs) \| `adr` \| `ruleset` \| `evolith` \| `full` (everything). |
| `dir` | string | no | Destination directory for the fixtures (default: cwd). |
| `dryRun` | boolean | no | Previews the files that would be written without touching the filesystem (default `false`). |

**Example:**

```json
{
  "name": "evolith-fixtures",
  "arguments": { "type": "full", "dryRun": true }
}
```

**What to expect.** The envelope with `data.type`, `data.targetDir`, `data.dryRun` and `data.created` (the list of relative paths written, or that would be written in a dry run). A `type` outside the enum, or a write failure, propagates as an error envelope.

### 5.15. `evolith-auto-fix` — fix architecture violations · **mutative**

**What it does.** It applies **automatic fixes** to the violations reported by the Core's rule evaluators. From a `rulesetId` and the list of violations, it picks a fix strategy per rule (strip framework imports out of the domain, enforce hexagonal boundaries, generate a domain interface stub, remove side effects, replace static instantiation with injection) and rewrites the affected files. It ships a `dryRun` for previewing.

**Arguments:**

| field | type | req | what for |
| --- | --- | --- | --- |
| `rulesetId` | string | yes | Ruleset to fix; it selects the strategy (e.g. `domain-purity`, `hexagonal-boundaries`, `service-purity`, `dependency-injection`, `missing-domain-interface`). |
| `violations` | object[] | no | Array of violations exactly as the validator emits them (each with `ruleId`, `filePath`, `message`, `suggestedFix`). Without them there is nothing to fix. |
| `dryRun` | boolean | no | Previews the changes without applying them (default `false`). |
| `dir` | string | no | Destination directory against which relative paths are resolved (default: cwd). |

**Example**

```json
{
  "name": "evolith-auto-fix",
  "arguments": {
    "rulesetId": "domain-purity",
    "violations": [
      { "ruleId": "domain-purity", "filePath": "src/domain/order.ts", "message": "Framework import in domain layer" }
    ]
  }
}
```

**What to expect.** The envelope with `data.rulesetId`, `data.totalViolations`, `data.fixesApplied` (how many were applied), `data.fixesPreview` (in `dryRun` only, the per-file detail) and `data.summary` (a roll-up of applied / preview / failed / manual-review-required). Violations whose `ruleId` matches no strategy are marked `manual-review-required` instead of failing.

## 6. ADRs, MoSCoW, config and metrics

This group brings together four families of tools that support the governance of the satellite: the **ADRs** (architecture decision records), **MoSCoW** prioritization, the **configuration** in `evolith.yaml`, and the **metrics** (of the MCP server itself, and DORA approximations over the Git history).

They all operate on a local repository: most accept a `path` (or `dir`) field pointing at the root of the satellite and, if you omit it, they use the server's current working directory. The ones that write to disk (create/update ADRs, create/edit/delete MoSCoW analyses, set configuration) are **mutative** and therefore go through the `{ apply:true, approvalToken }` gate described at the top of this guide.

### 6.1. `evolith-adr-list` — list the ADRs of the repository

**What it does.** It reads the satellite's `reference/architecture/adrs` folder and returns every ADR in summary form (id, title, status and date). It is the starting point for finding out which decisions are on record before consulting one or creating a new one. Read-only.

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | no | Root of the repository holding `reference/architecture/adrs`. If you omit it, the server's current directory is used. |

**Example.**

```json
{ "name": "evolith-adr-list", "arguments": { "path": "/repos/my-satellite" } }
```

**What to expect.** An object with `count` (number of ADRs) and `adrs`, an array where each entry carries `id`, `title`, `status` and `date`. If there are no ADRs, `count` is `0` and `adrs` comes back empty.

### 6.2. `evolith-adr-get` — view a complete ADR

**What it does.** It retrieves the whole content of a single ADR, identifying it by its id (`ADR-0001`) or by its number (`1`). Use it once you know which one you care about and you need its context, decision and consequences in full. Read-only.

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | no | Root of the repository holding the ADRs (the current directory by default). |
| `id` | string | yes | Identifier of the ADR to read: the full id (`ADR-0001`) or just the number (`1`). |

**Example.**

```json
{ "name": "evolith-adr-get", "arguments": { "id": "ADR-0073" } }
```

**What to expect.** The complete ADR object (id, title, status, date, context, decision, consequences, related decisions and tags). If the id does not exist, the tool throws an `ADR <id> not found` error, which the gateway turns into an error envelope.

### 6.3. `evolith-adr-create` — create a new ADR (mutative)

**What it does.** It records a new architecture decision: it writes the file `reference/architecture/adrs/<id>.md` and updates the ADR matrix. The new ADR is born in `Proposed` status. It is **mutative**, so the call must carry the `{ apply:true, approvalToken }` gate. If you only want a preview without touching disk, use `dryRun:true`.

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | no | Root of the repository the ADR will be written into (the current directory by default). |
| `title` | string | yes | Title of the ADR; 5 characters minimum. It is the human heading of the decision. |
| `context` | string | yes | The problem or context that motivates the decision. |
| `decision` | string | yes | The decision that was actually taken. |
| `consequences` | object | no | Consequences classified into three string arrays: `positive`, `negative`, `neutral`. |
| `relatedAdrs` | string[] | no | Ids of other related ADRs, to weave traceability between decisions. |
| `tags` | string[] | no | Free-form classification tags for grouping or filtering the decision. |
| `dryRun` | boolean | no | If `true`, it simulates the creation without writing files. `false` by default. |

**Example.**

```json
{
  "name": "evolith-adr-create",
  "arguments": {
    "path": "/repos/my-satellite",
    "title": "Adopt a message queue for domain events",
    "context": "Events are processed synchronously and block the request",
    "decision": "Introduce a queue with asynchronous consumers",
    "consequences": {
      "positive": ["Decoupling", "Better resilience"],
      "negative": ["Operational complexity"]
    },
    "tags": ["messaging", "async"],
    "apply": true,
    "approvalToken": "<token>"
  }
}
```

**What to expect.** An object with `dryRun` (the effective value) and `adr` carrying the summary of the created ADR (`id`, `title`, `status`, `date`). If `title` is shorter than 5 characters, or `context`/`decision` are missing, the tool throws a validation error.

### 6.4. `evolith-adr-update` — change the status of an ADR (mutative)

**What it does.** It rewrites the status of an existing ADR, both in its Markdown file and in the matrix. It is how you move it along its lifecycle: from `Proposed` to `Accepted`, or marking it `Deprecated`, `Superseded` or `Amended`. It is **mutative** (it requires the gate). It supports `dryRun` for simulating.

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | no | Root of the repository holding the ADRs (the current directory by default). |
| `id` | string | yes | The ADR to update: id (`ADR-0001`) or number. |
| `status` | string | yes | The new status. It must be one of: `Proposed`, `Accepted`, `Deprecated`, `Superseded`, `Amended`. |
| `reason` | string | no | Reason for the status change, useful for leaving a trace of why it moved. |
| `dryRun` | boolean | no | If `true`, it simulates the change without writing. `false` by default. |

**Example.**

```json
{
  "name": "evolith-adr-update",
  "arguments": {
    "id": "ADR-0073",
    "status": "Accepted",
    "reason": "Approved by the architecture board",
    "apply": true,
    "approvalToken": "<token>"
  }
}
```

**What to expect.** An object with `id`, `newStatus` and `dryRun`. If `status` is not in the valid list, the tool answers with an error explaining the accepted values; if the ADR does not exist, it throws `ADR <id> not found`.

### 6.5. `evolith-adr-matrix` — aggregated ADR summary

**What it does.** It returns the ADR matrix: totals per status plus the recent ADRs. It is the at-a-glance view for knowing how many decisions are accepted, proposed or deprecated without walking the whole list. Read-only.

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | no | Root of the repository holding the ADRs (the current directory by default). |

**Example.**

```json
{ "name": "evolith-adr-matrix", "arguments": { "path": "/repos/my-satellite" } }
```

**What to expect.** The matrix object with the counts per status and a list of recent ADRs.

### 6.6. `evolith-moscow-create` — create a MoSCoW analysis (mutative)

**What it does.** It creates a new MoSCoW prioritization analysis for a phase of the repository, with the list of items classified as `MUST` / `SHOULD` / `COULD` / `WONT`. It is **mutative** (it persists the analysis in the repo, so it requires the gate). If you do not give a `phase`, `phase-0` is assumed.

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | yes | Root of the repository the analysis will be saved into. |
| `phase` | string | no | The phase the analysis belongs to (`phase-0` by default). |
| `items` | object[] | yes | Items to prioritize. Each one: `title` (req), `category` (req: `MUST`/`SHOULD`/`COULD`/`WONT`), and optionally `description`, `effort` (`high`/`medium`/`low`) and `value` (`high`/`medium`/`low`). |

**Example.**

```json
{
  "name": "evolith-moscow-create",
  "arguments": {
    "path": "/repos/my-satellite",
    "phase": "phase-1",
    "items": [
      { "title": "Authentication", "category": "MUST", "effort": "high", "value": "high" },
      { "title": "Dark mode", "category": "COULD", "effort": "low", "value": "low" }
    ],
    "apply": true,
    "approvalToken": "<token>"
  }
}
```

**What to expect.** `{ success:true, analysis, message }` with the created analysis. If `path` is missing or `items` is empty, it returns `{ error:true, message }` describing what is missing.

### 6.7. `evolith-moscow-load` — load an existing analysis

**What it does.** It retrieves the MoSCoW analysis already saved for one specific phase. It is how you read back what was created earlier. Read-only.

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | yes | Root of the repository. |
| `phase` | string | yes | The phase whose analysis you want to load. |

**Example.**

```json
{ "name": "evolith-moscow-load", "arguments": { "path": "/repos/my-satellite", "phase": "phase-1" } }
```

**What to expect.** The complete analysis for that phase. If it does not exist, `{ error:true, message: "No MoSCoW analysis found for <phase>" }`.

### 6.8. `evolith-moscow-list` — list every analysis in the repo

**What it does.** It enumerates every MoSCoW analysis present in the repository, without looking at any particular phase. Useful for discovering which phases already have their prioritization done. Read-only.

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | yes | Root of the repository to inspect. |

**Example.**

```json
{ "name": "evolith-moscow-list", "arguments": { "path": "/repos/my-satellite" } }
```

**What to expect.** `{ analyses, count }` with the array of analyses and how many there are. If there are none, `analyses` comes back empty and `count` is `0`.

### 6.9. `evolith-moscow-update` — edit an item of an analysis (mutative)

**What it does.** It modifies one specific item inside a MoSCoW analysis (for example, reclassifying it from `COULD` to `SHOULD`, or adjusting its effort/value). It is **mutative** (it requires the gate). The item is identified by its `itemId`.

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | yes | Root of the repository. |
| `phase` | string | yes | The phase holding the analysis. |
| `itemId` | string | yes | Id of the item to modify. |
| `updates` | object | yes | Item fields to change (for example `category`, `effort`, `value`, `title`, `description`). |

**Example.**

```json
{
  "name": "evolith-moscow-update",
  "arguments": {
    "path": "/repos/my-satellite",
    "phase": "phase-1",
    "itemId": "item-2",
    "updates": { "category": "SHOULD", "value": "medium" },
    "apply": true,
    "approvalToken": "<token>"
  }
}
```

**What to expect.** `{ success:true, analysis, message }` with the updated analysis. If the `itemId` is not in that phase, `{ error:true, message: "Item <id> not found in <phase>" }`.

### 6.10. `evolith-moscow-remove` — drop an item from an analysis (mutative)

**What it does.** It removes an item from a MoSCoW analysis by its `itemId`. It is **mutative** (it requires the gate).

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | yes | Root of the repository. |
| `phase` | string | yes | The phase holding the analysis. |
| `itemId` | string | yes | Id of the item to remove. |

**Example.**

```json
{
  "name": "evolith-moscow-remove",
  "arguments": {
    "path": "/repos/my-satellite",
    "phase": "phase-1",
    "itemId": "item-2",
    "apply": true,
    "approvalToken": "<token>"
  }
}
```

**What to expect.** `{ success:true, analysis, message }` with the resulting analysis. If the item does not exist, `{ error:true, message: "Item <id> not found in <phase>" }`.

### 6.11. `evolith-moscow-validate` — validate the rules of the analysis

**What it does.** It checks that a MoSCoW analysis satisfies its distribution rules (the 60/20/20 split between categories, for example) and reports the findings. Read-only.

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | yes | Root of the repository. |
| `phase` | string | yes | The phase whose analysis is validated. |

**Example.**

```json
{ "name": "evolith-moscow-validate", "arguments": { "path": "/repos/my-satellite", "phase": "phase-1" } }
```

**What to expect.** `{ valid, issues, analysis }`: `valid` says whether it passes, `issues` lists the problems and `analysis` includes the evaluated analysis. If there is no analysis for that phase, it returns an error.

### 6.12. `evolith-moscow-report` — generate the Markdown report

**What it does.** It produces a readable Markdown report out of a MoSCoW analysis, ready to paste into documentation or into a review. Read-only.

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | yes | Root of the repository. |
| `phase` | string | yes | The phase whose analysis is reported. |

**Example.**

```json
{ "name": "evolith-moscow-report", "arguments": { "path": "/repos/my-satellite", "phase": "phase-1" } }
```

**What to expect.** `{ report, analysis }`, where `report` is the Markdown string and `analysis` the analysis it was built from. If the analysis does not exist, it returns an error.

### 6.13. `evolith-config-get` — read a value from `evolith.yaml`

**What it does.** It reads the repository's `evolith.yaml` file and returns the value of a key, supporting nested paths in dot notation (for example `product.phase`). Read-only.

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `key` | string | yes | Key to read; use dots to navigate nested objects (`coreRef.version`). |
| `dir` | string | no | Directory holding the `evolith.yaml` (the current directory by default). |

**Example.**

```json
{ "name": "evolith-config-get", "arguments": { "key": "product.phase", "dir": "/repos/my-satellite" } }
```

**What to expect.** `{ key, value }` with the value that was found (or `null` if the key does not exist). If there is no `evolith.yaml` in the directory, it throws `evolith.yaml not found`.

### 6.14. `evolith-config-set` — set a value in `evolith.yaml` (mutative)

**What it does.** It writes a value into the `evolith.yaml`, creating the intermediate keys if it has to (dot notation). It is **mutative**: it modifies the file, so it requires the `{ apply:true, approvalToken }` gate.

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `key` | string | yes | Key to write; with dots for nesting (`governance.version`). |
| `value` | string | yes | The new value to assign to that key. |
| `dir` | string | no | Directory holding the `evolith.yaml` (the current directory by default). |
| `confirm` | boolean | no | Confirmation flag for the mutative operation. |

**Example.**

```json
{
  "name": "evolith-config-set",
  "arguments": {
    "key": "product.phase",
    "value": "phase-2",
    "dir": "/repos/my-satellite",
    "apply": true,
    "approvalToken": "<token>"
  }
}
```

**What to expect.** `{ key, value, updated:true }` when the write succeeds. If it cannot find the `evolith.yaml`, it throws `evolith.yaml not found`.

### 6.15. `evolith-metrics` — metrics of the MCP server

**What it does.** It returns an in-memory snapshot of the MCP server's own metrics: uptime, total calls and failures, per-tool statistics (calls, failures, average latency) and a bounded ring of recent errors. It is there to observe how the gateway is being used. It takes no arguments. Read-only.

**Arguments.** None.

**Example.**

```json
{ "name": "evolith-metrics", "arguments": {} }
```

**What to expect.** An object with `uptimeMs`, `totalCalls`, `totalFailures`, `tools` (a map from tool name to `{ calls, failures, totalLatencyMs, avgLatencyMs }`) and `recentErrors` (the latest error messages, up to 20). Note: these are metrics of the running process, and they reset when the server restarts.

### 6.16. `evolith-dora-metrics` — DORA metrics approximated from Git

**What it does.** It computes approximations of the DORA metrics from the repository's Git commit history, over a window of days. It gives a quick read on deployment frequency and recent activity. Read-only (it reads Git, but writes nothing).

**Arguments.**

| field | type | req | what for |
| --- | --- | --- | --- |
| `path` | string | yes | Root of the Git repository to analyse. |
| `days` | number | no | Look-back window in days for the computation (`90` by default). |

**Example.**

```json
{ "name": "evolith-dora-metrics", "arguments": { "path": "/repos/my-satellite", "days": 30 } }
```

**What to expect.** An object with `repository`, `windowDays`, `timestamp` and `metrics`: `deploymentFrequency` (commits per day, as text), `leadTimeForChanges` (an approximation), `totalCommits` and `mergeCommits`. If `path` is not a Git repository, it returns `{ error:true, message: "Not a git repository" }`.
