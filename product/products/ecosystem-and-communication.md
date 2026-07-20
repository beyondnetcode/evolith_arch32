# Evolith Ecosystem and Communication Map

> **Bilingual navigation:** [Versión en Español](./ecosystem-and-communication.es.md)

This document is the cross-product relationship and communication map for the Evolith ecosystem. It shows how the Suite products sit on **Evolith Core**, how they talk to each other and to consumers, how an idea moves through the SDLC, and where the authoritative truth lives. It is a hub-level orientation: the canonical definitions stay in the [Ecosystem Glossary](../../reference/core/sdlc/glossary/glossary-ecosystem.md); the per-product detail stays in each product hub.

The dependency direction is one-way and non-negotiable: **products consume Core; they never redefine universal Core rules.**

## Goal and Objectives

> **Goal:** give the products hub a single picture of the ecosystem — who depends on whom, how surfaces communicate, and what counts as truth.

**Objectives:**

- Make the foundation-to-product dependency direction visible and auditable.
- Map the real communication surfaces (REST `/api/v1`, CLI, MCP `stdio` + HTTP, Agent Runtime API `/v1/agent`, structured files) without inventing channels.
- Separate the **SDLC phase** model (idea to product) from the **source-of-truth** model (human docs vs. structured validatable contracts).

## 1. Ecosystem: Core foundation and the Product Suite

Evolith Core (`src/packages/core`, `core-domain`, `contracts`, `infra-providers`, `sdk-client`, plus the `mcp-server` and `agent-runtime` packages) is the platform foundation: the universal rules plus the SDLC governance engine. Every product in the Suite consumes Core and exposes a slice of it through a specific surface. **Core API** (`src/apps/core-api`) is the REST exposure layer over the domain; **Evolith CLI** (`src/sdk/cli`) is the terminal surface and also ships the **MCP Services** (`src/packages/mcp-server`); the **Agent Runtime API** (`src/apps/agent-runtime-api`) is the HTTP surface over `src/packages/agent-runtime`; **Tracker** is the design-stage runtime-governance product that consumes Core strictly as an external client; **UMS Reference** is an open-source satellite that *adopts* Core rather than implementing the platform.

```mermaid
graph TD
    subgraph Foundation["Evolith Core (foundation)"]
        CORE["packages/core · core-domain · contracts<br/>infra-providers · sdk-client<br/>mcp-server · agent-runtime<br/>universal rules + SDLC governance engine"]
    end

    subgraph Suite["Evolith Product Suite (consumes Core)"]
        API["Core API<br/>apps/core-api · REST /api/v1"]
        CLI["Evolith CLI<br/>sdk/cli · @beyondnet/evolith-cli"]
        MCP["MCP Services<br/>packages/mcp-server · stdio + HTTP"]
        ART["Agent Runtime API<br/>apps/agent-runtime-api · REST /v1/agent"]
        TRK["Evolith Tracker<br/>runtime governance (design-stage)"]
    end

    subgraph Reference["Applied reference (adopts Core)"]
        UMS["UMS Reference<br/>open-source satellite"]
    end

    API -->|consumes| CORE
    CLI -->|consumes| CORE
    MCP -->|consumes| CORE
    ART -->|consumes| CORE
    CLI -->|ships| MCP
    TRK -->|external client| API
    UMS -.->|adopts rulesets / ADRs| CORE

    CORE -.->|UMS evidence informs ADRs| UMS
```

**Notes.** Core is the authoritative source of decisions, standards, and patterns; the Suite products implement it and cannot redefine it. Core API, Evolith CLI, MCP Services, and the Agent Runtime API all bind directly to the Core domain. MCP Services ship **inside** `@beyondnet/evolith-cli` (no separate install) and additionally run as a fail-closed HTTP service. Tracker is documented as **design-stage**: it reaches Core only as an external HTTP client of the Core API exposure layer (ADR-0074 / ADR-0075), never by redefining Core. UMS is *evidence, not policy* — it adopts Core rulesets and ADRs, and its evidence can inform new Core ADRs, but it never becomes authoritative.

## 2. How the products communicate

There are five real communication surfaces, all resolving through the same Core contracts and the shared ADR-0073 output envelope:

- **REST `/api/v1`** — Core API is REST-only (no GraphQL, no SSE), URI-versioned under `/api/v1`, with a flat ADR-0073 envelope (`success`, `data`, `meta` carrying `command` / `executedAt` / `durationMs` / `correlationId` / `context` / `schemaVersion`) and RFC 9457 problem details for errors. `/health` and `/metrics` are version-neutral.
- **CLI** — `evolith-cli` runs governance, validation, and SDLC commands from the terminal against a satellite repo.
- **MCP** — governed AI tool access over `stdio` (JSON-RPC 2.0) and Streamable HTTP (fail-closed, API-key).
- **Agent Runtime API `/v1/agent`** — the HTTP surface for governed agent orchestration (`src/apps/agent-runtime-api`, NestJS, fail-closed API-key/JWT guard): `POST handle`, `POST converse`, `POST hermes`, `POST stream` (SSE), `GET skills`, plus version-neutral `/health` and `/metrics`.
- **Structured files** — schemas, manifests (`evolith.yaml`), rulesets, and OPA `.rego`/`policy.wasm` are the machine-validatable contracts every surface resolves.

**Agent Runtime API.** `src/apps/agent-runtime-api` is the NestJS HTTP exposure over `src/packages/agent-runtime`, the hexagonal agentic layer defined by [ADR-0102](../../reference/core/architecture/adrs/core/0102-evolith-agent-runtime.md). Where Core API exposes *evaluation* and MCP exposes *tools*, the Agent Runtime API exposes *governed orchestration*: it routes an interaction through the runtime's ports and adapters — agent engine, policy validation (OPA), approvals (HITL), memory, knowledge, skills, and tracker tracing — so an agent action is subject to the same Core rules as any other surface. Its controller is mounted at `@Controller('v1/agent')` and its routes are `handle` (single governed action), `converse` (multi-turn), `hermes` (Hermes chatbox entry point), `stream` (SSE token/event stream), and `skills` (registry listing). It ships as its own container (`src/apps/agent-runtime-api/Dockerfile`) with its own Helm chart (`product/infra/helm/evolith-agent-runtime/`) and runs at `evolithruntime.beyondnet.cloud`. Like every other surface it *consumes* Core and never redefines it.

```mermaid
graph LR
    DEV["Developer"]
    CI["CI / Pipeline"]
    AGENT["AI Agent<br/>Cursor · Claude Desktop"]

    DEV -->|terminal| CLI["Evolith CLI"]
    CI -->|terminal / REST| CLI
    DEV -->|HTTP| API["Core API<br/>REST /api/v1"]
    CI -->|HTTP| API
    AGENT -->|stdio JSON-RPC| MCP["MCP Services"]
    AGENT -->|Streamable HTTP<br/>API-key, fail-closed| MCP
    AGENT -->|HTTP POST /v1/agent<br/>handle · converse · hermes · skills| ART["Agent Runtime API<br/>apps/agent-runtime-api"]
    AGENT -->|SSE POST /v1/agent/stream| ART

    CLI -->|reads / writes| FILES["Structured files<br/>evolith.yaml · schemas<br/>rulesets · OPA .rego/.wasm"]
    API -->|evaluates| FILES
    MCP -->|evaluates| FILES
    ART -->|evaluates| FILES

    CLI -->|ADR-0073 envelope| CORE["Evolith Core domain"]
    API -->|ADR-0073 envelope| CORE
    MCP -->|ADR-0073 envelope| CORE
    ART -->|ADR-0102 ports and adapters| CORE
```

**Sync vs. async.** All **governance** surfaces are **synchronous request/response**: REST `/api/v1` calls, CLI invocations, and MCP `stdio`/HTTP tool calls each return a single envelope, and Core API exposes no SSE stream. The one streaming channel in the ecosystem is the Agent Runtime API's `POST /v1/agent/stream`, declared with NestJS `@Sse`: the client opens a single HTTP request and the server pushes an ordered sequence of Server-Sent Events over that one connection as the orchestration progresses, closing the stream when the run ends. It is still **client-initiated and unidirectional** (server → client, over the client's own request) — it is not a pub/sub channel and it does not deliver anything to a third party. There is **no event bus and no webhook delivery** in the shipped surfaces: nothing subscribes, and nothing is pushed to an external endpoint. Asynchronous, event-driven integration remains a topology *option* (`event-driven`), not a current ecosystem channel. Beyond that, the only "async" notion in scope is the SDLC itself: evidence accumulates across phases over time, but each individual governance call is synchronous.

## 3. From idea to product across SDLC phases

The SDLC is the governed lifecycle from idea to product, expressed as five ordered **phases**, each closed by a **gate** that evaluates required artifacts, schemas, rulesets, ADRs, and OPA policies before a transition is allowed. The governance phase names are `f1` Conception & Discovery, `f2` Design & Architecture, `f3` Construction, `f4` Validation & QA, `f5` Delivery & Operations. The CLI/API expose operational **phase keys** (`discovery`, `design`, `construction`, `qa`, `release`) that map onto f1..f5 — a known surface-label difference, not a different model. The final phase is **Delivery & Operations**, not "Release"; Release is an act that occurs *within* f5 and is closed by `gate-f5`.

```mermaid
graph LR
    IDEA(["Idea"]) --> F1
    F1["f1 Conception & Discovery<br/>key: discovery"] -->|gate-f1<br/>Business Sign-Off| F2
    F2["f2 Design & Architecture<br/>key: design"] -->|gate-f2<br/>Design Baseline Approved| F3
    F3["f3 Construction<br/>key: construction"] -->|gate-f3<br/>Successful Build| F4
    F4["f4 Validation & QA<br/>key: qa"] -->|gate-f4<br/>RC Stamped| F5
    F5["f5 Delivery & Operations<br/>key: release"] -->|gate-f5<br/>Production Live| PROD(["Product in operation"])
```

**Notes.** A phase advances only when its exit gate passes; a failed mandatory gate cannot be overridden by informal approval (only an explicit governance waiver applies). These SDLC phases are distinct from the **maturity levels F1–F5** (positions on the progressive architecture axis: `modular-monolith` → `distributed-modules` → `microservices`) and from the **8 topologies** (`modular-monolith`, `distributed-modules`, `microservices`, `event-driven`, `serverless`, `edge-computing`, `data-mesh`, `agentic-ai`). Phases answer "where in the idea-to-product lifecycle am I?"; maturity and topology answer "how decomposed / what shape is the architecture?" — never conflate them (see [`topology-dimensions.md`](../../reference/core/architecture/topologies/topology-dimensions.md)).

## 4. Source-of-truth model

The ecosystem keeps two complementary kinds of truth. **Markdown** is human-facing documentation: hubs, glossaries, ADR narrative, and guides — read by people, not gate-enforced for structure. **Structured contracts** — JSON Schemas, manifests, rulesets, and OPA policies — are the machine-validatable truth: gates evaluate them, and every enforceable rule keeps Native (TypeScript) + OPA parity under the same rule ID (R-25), with the parity gate failing on drift.

```mermaid
graph TD
    subgraph Human["Human documentation (Markdown)"]
        DOCS["Product hubs · glossaries<br/>ADR narrative · guides"]
    end

    subgraph Structured["Structured validatable truth"]
        SCHEMA["JSON Schemas<br/>*.schema.json"]
        MANIFEST["Manifests<br/>evolith.yaml · topology.manifest.json"]
        RULESET["Rulesets (Native / TypeScript)"]
        OPA["OPA policies<br/>.rego → policy.wasm"]
    end

    SCHEMA -->|validates| MANIFEST
    RULESET <-->|R-25 parity, same rule ID| OPA
    MANIFEST -->|resolved by| SURFACES["Surfaces: CLI · Core API · MCP"]
    RULESET -->|evaluated by| SURFACES
    OPA -->|evaluated by| SURFACES
    SURFACES -->|gates pass/fail on| MANIFEST
    DOCS -.->|describes, must not contradict| Structured
```

**Notes.** Documentation describes the structured truth and must not contradict it; when they diverge, the schema/ruleset/OPA layer wins because gates enforce it. Manifests are valid only against their declared schema, and a manifest exposes only the technical contract (not business or Funnel-0 data, which belongs to Tracker). This split is why a doc-only edit cannot loosen a gate: the enforceable rule lives in the ruleset and its matching `.rego` policy, not in the prose.

---

## Related references

- [Ecosystem Glossary (canonical)](../../reference/core/sdlc/glossary/glossary-ecosystem.md) — authoritative terminology for every term used above.
- [Topology dimensions](../../reference/core/architecture/topologies/topology-dimensions.md) — phase vs. maturity vs. topology de-conflation.
- Product hubs: [Tracker](./evolith-tracker/README.md) · [Evolith CLI](./smart-cli/README.md) · [Core API](./core-api/README.md) · [MCP Services](./mcp-services/README.md) · [UMS Reference](./ums-reference/README.md).

[Back to Product-Specific Designs](./README.md)
