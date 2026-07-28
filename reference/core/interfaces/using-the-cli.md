# How to use the Evolith CLI

> Bilingual navigation: [Version en Español](./using-the-cli.es.md)

A practical guide to driving Evolith Core from the command line. It is written
to be read end to end the first time, and to be consulted command by command
afterwards.

---

## 1. What the CLI is and how you invoke it

The CLI (`evolith-cli`) is the local way to operate Evolith Core: it validates
your satellite repository against the Core rules, evaluates the gates of every
lifecycle phase, detects architectural drift, generates code and more.
Everything runs on your machine against a checkout of the Core.

You invoke it like this:

```bash
evolith-cli <command> [subcommand] [options]
```

For example:

```bash
evolith-cli validate --satellite . --core ../evolith-core
```

If you installed the package, the binary is `evolith-cli` (the shorter alias
`evolith` is installed alongside it and is what the built-in help prints). If
you work inside the monorepo, the equivalent is
`node src/sdk/cli/dist/main.js <command>`.

To see the help for any command, add `--help`:

```bash
evolith-cli --help              # lists every command
evolith-cli gate --help         # help for the gate command
```

---

## 2. Three concepts that apply to (almost) every command

Before going command by command, it pays to understand three cross-cutting
things: they save repeating the same explanation everywhere.

### 2.1. Human mode vs. machine mode — `--format`

Almost every command accepts `--format`:

- **Without `--format` (or `--format human`)** → readable output, with colour
  and layout, meant for you to read.
- **`--format json`** → a **single JSON response** on standard output, meant
  for scripts, CI or agents. That response always follows the same shape (the
  ADR-0073 "envelope"):

```json
{
  "success": true,
  "data": { /* the result */ },
  "meta": { "command": "evolith-cli gate evaluate", "executedAt": "…", "correlationId": "…", "schemaVersion": "1.0.0" }
}
```

And when something fails:

```json
{
  "success": false,
  "error": { "code": "RULESET_NOT_FOUND", "message": "…" },
  "meta": { /* … */ }
}
```

> Useful rule: under `--format json`, **standard output contains only the
> JSON**. Progress messages and warnings go to the error channel (stderr), so
> you can safely pipe `evolith-cli … --format json | jq`.

### 2.2. Exit codes — for CI

The process exit code reflects the **verdict**, not merely whether the command
ran. There are four, and the distinction between them is the point:

| Code | Meaning | What a pipeline should do |
|:----:|---------|---------------------------|
| **`0`** | Pass — the command ran and nothing blocks | Continue |
| **`1`** | Tool failure — the command could **not** produce a verdict (I/O, network, an unresolvable ruleset corpus, a crash) | Fail the step, but do **not** report the repository as non-compliant |
| **`2`** | Blocked — the command ran and the verdict blocks (a failed gate, a rejected evaluation, a vetoed edit) | Fail the step; this **is** a finding about the code |
| **`3`** | Invalid input — the invocation itself is wrong (unknown action, missing flag, a prompt required with no TTY) | Fix the invocation and re-run |

The reason `1` and `2` are separate is that collapsing them makes a pipeline
claim something it did not establish. A repository whose validation crashed has
not been shown to be non-compliant — it has not been evaluated at all. Treating
those as the same is the inverse of a gate reporting green over an unevaluated
repository, and it is just as wrong.

Dropping `evolith-cli validate …` into a pipeline still works with no extra
logic: any non-zero code fails the step. Branch on the code only when you want
to tell "the gate blocked" from "the gate never ran" — for example, to retry a
`1` and to open an issue on a `2`.

The `evolith-validate` GitHub Action exposes this as `exit-code` alongside
`compliance-status`, where a `1` or a `3` surfaces as `error` / `invalid-input`
rather than as `non-compliant`.

### 2.3. Where your satellite is and where the Core is — `--satellite` and `--core`

Many commands need to know two paths:

- **`--satellite <path>`** (or `-s`): your satellite repository (the project
  being validated). If you omit it, it is resolved by walking up from the
  current directory looking for the nearest `evolith.yaml`.
- **`--core <path>`** (or `-c`): the Evolith Core checkout (where the rules come
  from). If you omit it, auto-detection is attempted; if no rules are found you
  will see the `RULESET_NOT_FOUND` error — point `--core` at your Core checkout.

---

## 3. Validating and evaluating (the day-to-day core)

These four commands are the ones you will use most: they verify that what you
built satisfies the rules and the gates.

### 3.1. `evolith-cli validate` — validate the satellite against the rules

**What it does.** Runs the Core governance rules (rulesets), the topology and
the phase gates over your satellite, and tells you what complies and what does
not.

**Basic usage:**

```bash
evolith-cli validate --satellite . --core ../evolith-core
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `-s, --satellite <path>` | The satellite to validate (default: nearest `evolith.yaml`). |
| `-c, --core <path>` | The Core checkout holding the rules (default: auto-detect). |
| `-f, --format <fmt>` | `human` (default) or `json`. |
| `-o, --output <file>` | Writes the JSON report to a file instead of printing it. |
| `-r, --ruleset <id>` | Validates a single ruleset (e.g. `adr-0002`, `acl`, `mcp`). |
| `-p, --phase <phase>` | Validates against one phase: `discovery`, `design`, `construction`, `qa`, `release`. |
| `-t, --topology <id>` | Validates against a topology: `modular-monolith`, `distributed-modules`, `microservices`. |
| `-a, --arch` | Validates the architecture across the whole maturity axis. |
| `-e, --engine <engine>` | Rule engine: `native` (default) or `opa`. |
| `--composable` | Uses the composable engine (resolves several modes automatically — see 3.2). |
| `--file <path>` | Validates a single file (ad-hoc mode). |

**Typical combinations:**

```bash
# Validate only the construction phase, saving the report to a file
evolith-cli validate -s . -c ../evolith-core --phase construction --format json -o report.json

# Validate compliance with one specific ADR
evolith-cli validate -s . -c ../evolith-core --ruleset adr-0002

# Validate the architecture against a specific topology
evolith-cli validate -s . -c ../evolith-core --topology microservices --arch
```

**What to expect.** In human mode, a summary with ✓/✗ per rule and per gate.
Under `--format json`, the envelope with `data.status` (`passed`/`failed`) and
the list of `issues`. If the verdict is `failed`, the command **exits non-zero**.

### 3.2. `evolith-cli validate --composable` — multi-mode validation

**What it does.** The composable engine automatically detects which validation
modes apply to your context (SDLC, architecture, ADRs, ad-hoc) and runs them
all, instead of you picking one by hand. Useful when what you want is "validate
everything that makes sense here".

```bash
evolith-cli validate --composable --satellite . --core ../evolith-core --format json
```

It accepts the same paths and `--format` as `validate`. You can narrow it with
`--phase` or `--topology` if you want to restrict the modes.

### 3.3. `evolith-cli evaluate` — evaluate a full context

**What it does.** Runs the Core's *stateless* evaluation (gates + compliance +
architecture) over a context you describe, and returns a global verdict. Unlike
`validate` (which is rule-centric), `evaluate` runs the complete evaluation
pipeline.

**Basic usage (context derived from flags):**

```bash
evolith-cli evaluate --workspace . --core ../evolith-core --phase construction
```

**Usage with an explicit context (JSON file):**

```bash
evolith-cli evaluate --context ./my-context.json --core ../evolith-core --format json
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `--context <path>` | JSON file holding a canonical `EvaluationContext`. |
| `-w, --workspace <path>` | Local workspace (interpreted as `workspaceRef`; default: profile/cwd). |
| `-c, --core <path>` | The Core checkout. |
| `-p, --phase <id>` | SDLC phase: `discovery`…`release`. |
| `-t, --topology <id>` | Topology to evaluate against. |
| `-f, --format <fmt>` | `json` (the default here) or `text`. |

**What to expect.** The envelope with `data.overallVerdict` (`PASS`/`FAIL`) and
`data.outcome`. A `FAIL` verdict **exits non-zero**. If the `--context` file
does not exist or is not valid JSON you get `error.code: VALIDATION_FAILED`
(not an internal error) — so you can tell your input mistake from a bug.

### 3.4. `evolith-cli gate evaluate` — evaluate one phase gate

**What it does.** Evaluates **one specific gate** (the one for `discovery`,
`design`, `construction`, `qa` or `release`) and emits the evidence
(`GateEvidence`): which artifacts are required, which are present, and the
verdict.

`gate` is an **action** command: today the action is `evaluate`.

**Basic usage:**

```bash
evolith-cli gate evaluate --phase construction --satellite . --core ../evolith-core
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `-p, --phase <phase>` | The phase whose gate you evaluate (required). |
| `-s, --satellite <path>` | The satellite (default: nearest `evolith.yaml`). |
| `-c, --core <path>` | The Core checkout. |
| `--evaluated-by <actor>` | Who evaluates: `human` (default), `agent`, `ci`. Recorded in the evidence. |
| `--initiative <id>` / `--tenant <id>` | Opaque context (initiative/tenant) echoed in `meta.context`. |
| `--webhook-url <url>` | POSTs the evidence to that URL when it finishes. |
| `-f, --format <fmt>` | `human` or `json`. |

**How to read the result.** The envelope carries `data.verdict`
(`passed`/`failed`) and, if it failed, the list of `violations` with **which
artifact is missing** and where it was expected. The envelope's `success` means
"the evaluation ran"; the **verdict lives in `data`** and the **exit code
reflects it** (0 if it passed, non-zero if it failed). A real example of a gate
failing on absent evidence:

```json
{
  "success": true,
  "data": {
    "gateId": "business-sign-off",
    "phase": "discovery",
    "verdict": "failed",
    "violations": [
      { "ruleId": "PG-1-EVIDENCE-prd", "severity": "error", "location": "PRD",
        "message": "Artifact not found: docs/prd.md" }
    ]
  },
  "meta": { "command": "evolith-cli gate evaluate", "schemaVersion": "1.0.0" }
}
```

### 3.5. `evolith-cli drift` — detect architectural drift

**What it does.** Compares the maturity level your satellite **declares**
against the one **detected** in the code, and reports the drift (violations that
are new, persistent or resolved since the last run).

```bash
evolith-cli drift --path . --format json
```

**Options:** `--path <path>` (the satellite to analyse), `-l, --level <level>`
(the declared progressive-axis topology), `--history`, `--trend` and `--format`.

**What to expect.** The envelope with `data.driftDetected`, `data.declaredLevel`
vs. `data.detectedLevel` and the list of violations.

---

## 4. Architecture and scaffolding

These commands do not validate: they **build**. They generate the skeleton of
your satellite (the Nx workspace or the .NET solution), recommend how to compose
the topology from technical signals, measure how complete a phase's artifacts
are, and derive hexagonal code from a DDD model. The first one (`scaffold`) and
the last one (`sdlc generate domain`) **write to disk**; that is why both ship a
dry-run mode you should run first.

### 4.1. `evolith-cli scaffold` — generate the workspace by maturity phase

**What it does.** Generates the complete scaffold of an Evolith satellite along
the progressive maturity axis: phase 1 = `modular-monolith` (a standard SPA),
phase 2 = `distributed-modules` and phase 3 = `microservices` (a Module
Federation host with its remotes). It stands up the backend API, the frontend,
the cross-cutting shells (workflow-engine, integration-fabric, tenant-config),
one domain per bounded context you ask for, and the shared libraries. It is a
**mutating** command: it runs `npm install` and Nx generators inside `./src`.

**Basic usage:**

```bash
# Interactive mode: asks for framework, ORM, phase, names and domains
evolith-cli scaffold

# Non-interactive mode (everything through flags)
evolith-cli scaffold --frontend react --orm prisma --phase 1 --dry-run
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `--frontend [framework]` | Micro-frontend framework: `react`, `angular` (or `vue` in interactive mode). |
| `--orm [orm]` | ORM of the shared persistence layer: `prisma` or `typeorm`. |
| `--phase [phase]` | Progressive-axis phase: `1`/`2`/`3` or its canonical id (`modular-monolith`, `distributed-modules`, `microservices`). Phase 1 generates a SPA; 2/3 generate host + remotes. |
| `-d, --dry-run` | Simulates the whole scaffold without touching disk. Always use it before the real run. |
| `--runtime [runtime]` | Backend runtime: `nodejs` (default, Nx/React) or `dotnet` (UMS-style hexagonal ASP.NET Core solution). |
| `--api-name [name]` | Backend API name (default: `tracker-api`). |
| `--web-app-name [name]` | Phase-1 SPA name (default: `tracker-web`). |
| `--host-name [name]` | Micro-frontend host name for phase 2/3 (default: `tracker-host`). |
| `--remotes [remotes]` | Remote micro-frontend names (comma-separated) for phase 2/3. |
| `--domains [domains]` | Bounded contexts to generate as domain libraries (comma-separated). |

**Typical combinations:**

```bash
# 1. Simulate a modular monolith with two domains (nothing is written)
evolith-cli scaffold --frontend react --orm prisma --phase 1 \
  --domains discovery,construction --dry-run

# 2. Generate it for real (same line without --dry-run)
evolith-cli scaffold --frontend react --orm prisma --phase 1 \
  --domains discovery,construction

# 3. Phase 3 (microservices) with explicitly named host and remotes
evolith-cli scaffold --frontend angular --orm typeorm --phase 3 \
  --host-name tracker-host --remotes trackerRemoteAgile,trackerRemoteQa

# 4. A .NET satellite (hexagonal solution instead of the Nx workspace)
evolith-cli scaffold --runtime dotnet --api-name mms-api --phase 1 \
  --domains catalog,pricing --dry-run
```

**What to expect.** In human mode you see the scaffold step by step and, at the
end, a confirmation that the whole Evolith topology was generated under `./src`
(or the `DRY-RUN mode` notice if you simulated). The `nodejs` runtime operates
on `<cwd>/src`: if that directory does not exist or is not an Nx workspace, the
command **fails fast** with an actionable message (run `init` first) instead of
an opaque `spawn ENOENT`. Under `--format json`, `--frontend`, `--orm` and
`--phase` are **required**; omitting them returns
`error.code: VALIDATION_FAILED`, and the success envelope carries `data.status`
(`dry-run` or `scaffolded`) plus a summary of what was generated.

### 4.2. `evolith-cli topology recommend` — recommend a topology composition

**What it does.** From technical signals (how many teams, whether you need
independent deployment, high scale, asynchronous integration…) it recommends
**how to compose** the topology and explains the reason for each piece. It is
*advisory* and **non-binding**: the Core recommends in Discovery, the tenant
confirms in Design. It writes nothing; it only reads the Core rules and
computes.

**Basic usage:**

```bash
evolith-cli topology recommend --async-integration --team-count 4
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `--team-count <n>` | Number of autonomous teams/squads that will work on the system. |
| `--deployment-independence` | Modules need independent CI/CD lifecycles. |
| `--high-scale` | High, independent scaling requirements per module. |
| `--async-integration` | Asynchronous / event-driven integration. |
| `--data-product-sharing` | Cross-domain analytical data sharing. |
| `--spiky-load` | Spiky / bursty workload profile. |
| `--latency-tolerant` | The workload tolerates higher latency. |
| `--edge-or-offline` | Edge or offline-first execution. |
| `--ai-agents` | AI agents participate in the runtime. |
| `-s, --signals <json>` | All signals at once as a JSON object, e.g. `'{"asyncIntegration":true,"teamCount":4}'`. Individual flags **refine** (override) whatever this payload sets. |
| `-c, --core <path>` | Core checkout holding the recommendation rules (default: profile, or the rulesets bundled with the CLI). |

**Typical combinations:**

```bash
# 1. Minimal recommendation with a couple of flags
evolith-cli topology recommend --high-scale --deployment-independence

# 2. Full signals through JSON (equivalent, ideal for scripts)
evolith-cli topology recommend \
  --signals '{"teamCount":4,"asyncIntegration":true,"highScale":true}'

# 3. JSON plus a flag that refines the payload, with machine output
evolith-cli topology recommend --signals '{"teamCount":2}' --team-count 6 --format json
```

**What to expect.** In human mode, a `Recommended Topology Composition` block
with the suggested `composition` and, underneath, the `Rationale`: one bullet
per topology with its `ruleId` and the reason it applies. Under `--format json`,
the envelope carries the same recommendation in `data` (`composition` +
`rationale`). It shares the exact engine
(`TopologyRecommendationService.recommend`) with the equivalent REST endpoint
and MCP tool, so all three surfaces return the same result.

### 4.3. `evolith-cli topology phase-artifacts` — measure phase-artifact completeness

**What it does.** For a **downstream** phase (`construction`, `quality` or
`deployment`) and an already confirmed topology composition, it measures the
artifacts you declare as present against the **union** of that phase's universal
artifacts plus the ones each topology requires in its profile. It returns a
completeness score from 0 to 100. It is also *advisory* and non-binding: the
Core **measures**, the tenant's gate decides.

**Basic usage:**

```bash
evolith-cli topology phase-artifacts --phase construction --topologies microservices
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `-p, --phase <phase>` | Downstream phase to measure: `construction`, `quality` or `deployment` (required; any other value returns `INVALID_PHASE`). |
| `-t, --topologies <list>` | Confirmed topology composition (comma-separated ids), e.g. `microservices,event-driven`. |
| `-d, --declared <list>` | Artifact kinds you declare as present (comma-separated), e.g. `test-summary-report,coverage-report`. |
| `-c, --core <path>` | Core checkout holding the topology catalogue (default: profile, or the bundled rulesets). |

**Typical combinations:**

```bash
# 1. Measure construction without declaring anything yet (you see everything missing)
evolith-cli topology phase-artifacts --phase construction --topologies microservices

# 2. Declare the artifacts you already have and see how much the score rises
evolith-cli topology phase-artifacts --phase quality \
  --topologies microservices,event-driven \
  --declared test-summary-report,coverage-report

# 3. Machine output for a CI check
evolith-cli topology phase-artifacts --phase deployment \
  --topologies microservices --declared release-notes --format json
```

**What to expect.** In human mode, a `Phase-Artifact Completeness` header with
the `completeness/100` score and three lists: `Present` (✓), `Missing` (✗) and,
where applicable, an informational `Conditional` (?). Under `--format json`, the
envelope carries `data.completeness`, `data.presentArtifacts`,
`data.missingArtifacts` and `data.conditionalArtifacts`. It shares its engine
(`PhaseArtifactProfileService.evaluate`) with the equivalent REST endpoint and
MCP tool.

### 4.4. `evolith-cli sdlc generate domain` — hexagonal scaffold from a DDD classDiagram

**What it does.** Reads a Markdown file containing a Mermaid `classDiagram` with
your DDD model (entities, aggregates, value objects…) and generates the matching
Hexagonal Architecture scaffold. It detects the classes by their stereotype and
creates the missing files without overwriting existing ones. Because it writes
to disk, it ships `--dry-run` so you can see first what it would generate.

**Basic usage:**

```bash
evolith-cli sdlc generate domain --from ddd-model.md
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `-f, --from <path>` | Markdown file with the DDD model (the ` ```mermaid ` block carrying the `classDiagram` directive). Required. |
| `-o, --output <dir>` | Target directory for the generated files (default: the current directory). |
| `--dry-run` | Prints what would be generated without writing any file. |

> The first positional argument is the generation **target** (`domain`); it is
> required together with `--from`. If either is missing, the command explains
> the usage and exits non-zero (in JSON: `error.code: VALIDATION_FAILED`).

**Typical combinations:**

```bash
# 1. Simulate the generation and review which files would come out
evolith-cli sdlc generate domain --from ddd-model.md --dry-run

# 2. Generate for real into a specific folder
evolith-cli sdlc generate domain --from ddd-model.md --output src/contexts/catalog

# 3. Machine output with the detail of created/skipped files
evolith-cli sdlc generate domain --from ddd-model.md --format json
```

**What to expect.** In human mode, a summary of the detected classes (with their
stereotype), the list of `Created` files (or `Would create` in dry-run) and the
`Skipped` ones that already existed; if the model has no supported stereotypes,
it reports `Nothing to generate`. Under `--format json`, the envelope carries
the `created` and `skipped` lists in `data`. If the `--from` file does not exist
or contains no valid `classDiagram`, the command ends with an error.

## 5. SDLC flow and transitions

These commands operate on your satellite's **lifecycle**: they propose moving
from one phase to the next, show the state of the gates guarding each phase, and
execute the handoff of artifacts between phases. They are the layer that governs
*when* you may advance, not only *what* you comply with.

> A naming warning that saves confusion: `phase advance` uses the **canonical
> SDLC phases** (`discovery`, `design`, `construction`, `qa`, `release`), whereas
> `sdlc handoff` uses a **different, numbered** scheme (`phase-0`, `phase-1`, …
> `phase-5`). They are not interchangeable: each command validates its own. Each
> section explains it.

### 5.1. `evolith-cli phase advance` — propose a phase transition

**What it does.** Evaluates whether moving from the current phase (`--from`) to
a target phase (`--to`) makes sense, and emits a **transition proposal** with
its evidence, without mutating the satellite's canonical state. It is a decision
step: it tells you whether the transition is *recommended* or *not recommended*
given the violations it finds, so you can decide with judgement before moving
anything.

`phase` is a command with a **positional action**: today the only supported
action is `advance`. Any other action is rejected with `VALIDATION_FAILED`.

**Basic usage:**

```bash
evolith-cli phase advance --from construction --to qa --satellite . --core ../evolith-core
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `--from <phase>` | Current SDLC phase. Required and validated: `discovery`, `design`, `construction`, `qa`, `release`. |
| `--to <phase>` | Target SDLC phase, from the same set of valid phases. Required. |
| `-s, --satellite [path]` | The satellite to evaluate (default: nearest-ancestor `evolith.yaml` from cwd). |
| `-c, --core [path]` | The Core checkout with the rules (default: auto-detect). |
| `--evaluated-by [actor]` | Who evaluates: `agent` (default), `human` or `ci`. Recorded in the evidence. |
| `--initiative [id]` / `--tenant [id]` | Opaque context echoed in `meta.context`. |
| `--webhook-url <url>` | POSTs the evidence to that URL when it finishes. |
| `-f, --format [fmt]` | `human` (default) or `json`. |

**Typical combinations:**

```bash
# Simple: propose the jump from construction to QA, read by a person
evolith-cli phase advance --from construction --to qa -s . -c ../evolith-core

# In CI: JSON output and the "ci" actor, so a pipeline decides on the exit code
evolith-cli phase advance --from qa --to release -s . -c ../evolith-core \
  --evaluated-by ci --format json

# Notifying an external system of the transition evidence
evolith-cli phase advance --from design --to construction -s . -c ../evolith-core \
  --webhook-url https://hooks.example.com/evolith
```

**What to expect.** In human mode you see whether the transition is
`RECOMMENDED` (green) or `NOT RECOMMENDED` (red), the evidence verdict
(`ruleset@version`) and the list of violations with severity, rule and location.
Under `--format json`, the envelope with `data` = the proposal (`fromPhase`,
`toPhase`, `isRecommended`, `evidence.violations`, `proposedAt`). The key detail
for CI: **if the transition is NOT recommended, the command exits non-zero**, so
a pipeline stops precisely when the phase is not ready to advance. If `--from`
or `--to` are not valid phases you get `error.code: INVALID_PHASE`; if the rules
cannot be found, `RULESET_NOT_FOUND`.

### 5.2. `evolith-cli sdlc gate-status` — gate status and DORA metrics

**What it does.** Shows, for the project in the current directory, the status of
**every** phase gate (how many pass, fail or are pending, with the detail of
each required piece of evidence) and, on top of that, computes the four **DORA
metrics** from the git history. It is the snapshot of "where am I in the cycle
and how is my delivery going?".

Unlike other commands, `gate-status` takes no `--satellite`: it always operates
on the current directory (`cwd`). It does accept `-c, --core` to point at the
checkout holding the canonical SDLC gates (auto-detected by default).

**Basic usage:**

```bash
evolith-cli sdlc gate-status
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `--since <days>` | Git-history window analysed for DORA (default: 90). Invalid values or < 1 fall back to the default. |
| `-f, --format <fmt>` | `human` (default) or `json`. |

**Typical combinations:**

```bash
# The full readable snapshot: gates + DORA for the last 90 days
evolith-cli sdlc gate-status

# Widen the DORA window to six months
evolith-cli sdlc gate-status --since 180

# For a dashboard or script: one JSON with gateStatus + doraMetrics
evolith-cli sdlc gate-status --format json | jq '.data.doraMetrics'
```

**What to expect.** In human mode, a summary (current phase, gates
passed/failed/pending) followed by the per-gate detail — responsible role,
waiver authority if it failed, evidence marked ✓/✗ and `[REQUIRED]` /
`[OPTIONAL]`, and any blocking criteria triggered — and then a DORA block with
deployment frequency, lead time, change failure rate and time to restore, each
with its rating badge (`elite`/`high`/`medium`/`low`). Under `--format json`,
the envelope with `data.gateStatus` and `data.doraMetrics` (the latter is `null`
when the directory is not a git repository; the metrics are skipped and, in
human mode, you see a notice in their place).

### 5.3. `evolith-cli sdlc handoff` — hand artifacts over between phases

**What it does.** Executes the actual **handoff** from one phase to the next: it
transitions the artifacts, validates the phase gates and leaves the project
positioned in the target phase. It has two modes: **guided/interactive** (it
asks you for source phase, target phase, whether to validate gates, which tools
to configure) and **direct/non-interactive** (you pass `--from` and `--to` and
it runs without asking).

Here the phases use the **numbered** scheme `phase-0`, `phase-1`, … `phase-5`
(not the canonical SDLC phases of `phase advance`).

**Basic usage (interactive):**

```bash
evolith-cli sdlc handoff
```

**Direct usage (non-interactive):**

```bash
evolith-cli sdlc handoff --from phase-1 --to phase-2
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `-f, --from [phase]` | Source phase (`phase-0`, `phase-1`, …). Passing it together with `--to` runs the direct mode without prompts. |
| `-t, --to [phase]` | Target phase. Requires `--from` for the direct mode. |
| `-a, --artifacts` | Declares the intent to generate evidence artifacts (relevant in the guided flow). |
| `--validate` | Declares that phase gates should be validated (relevant in the guided flow). |
| `--force` | Forces the handoff despite failed gates (requires an Architecture Board waiver). |
| `--format <fmt>` | `human` (default) or `json`. |

> Practical note: on the **direct** path (`--from` + `--to`) the transition runs
> immediately and the `--artifacts`, `--validate` and `--force` flags do not
> alter that path — they are options of the **guided** flow, where `--force`
> makes sense to skip failed gates with the corresponding waiver. To automate,
> stick to `--from`, `--to` and `--format json`.

**Typical combinations:**

```bash
# Guided: walks you through source phase, target phase and tooling
evolith-cli sdlc handoff

# Direct, for a script: transitions and returns the JSON envelope
evolith-cli sdlc handoff --from phase-1 --to phase-2 --format json

# Force the handoff despite failed gates (guided flow; requires a waiver)
evolith-cli sdlc handoff --force
```

**What to expect.** In direct mode on success, a `✓ Transitioned from … to …`
(or the success envelope in JSON with the transition result). In the guided
flow you additionally see the gate validation results (✓/✗ per gate, marked
`[REQUIRED]`/`[OPTIONAL]`), the tools configured, and a list of *Next Steps* for
the target phase. If the transition fails, the errors are listed; and if any
**required** gate did not pass, the command reminds you to fix it or use
`--force` with the Architecture Board waiver. Under `--format json`, a failed
handoff is reported as `error.code: INTERNAL_ERROR` with the errors concatenated
in the message.

## 6. Governance and documentation

These commands neither validate nor evaluate: they **administer your
satellite's governance artifacts** (architecture decisions, corporate standards)
and generate the base documentation Evolith expects to find. All three are
*multi-action*: instead of having subcommands, each **action flag** (`--list`,
`--get`, `--create`, …) chooses what the command does. They work on the current
directory, need neither `--core` nor `--satellite`, and — like the rest of the
CLI — honour `--format json` with the same envelope described in section 2.

### 6.1. `evolith-cli adr` — manage Architecture Decision Records

**What it does.** It is the Swiss army knife for your ADRs (the architecture
decision records living under `reference/architecture/adrs/`). A different flag
creates, lists, queries, updates the status of, or prints the summary matrix of
every ADR. If you invoke it **without any action flag** it enters interactive
mode and asks you what you want to do.

**Basic usage:**

```bash
evolith-cli adr --list
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `-l, --list` | Lists every ADR with its id, title, status and date. |
| `-g, --get <id>` | Shows one full ADR (context, decision, consequences, tags). E.g. `--get ADR-0001`. |
| `-m, --matrix` | Prints the matrix summary: totals by status (proposed/accepted/deprecated) and the recent ADRs. |
| `-c, --create` | Creates a new ADR. Opens an interactive questionnaire (title, context, decision, consequences, tags). |
| `-u, --update <id>` | Changes the status of an existing ADR. Requires `--status`. |
| `-s, --status <status>` | The new status for `--update`: `Accepted`, `Deprecated`, `Superseded` or `Amended`. |
| `-r, --reason <text>` | Reason for the status change (recorded alongside the ADR). |
| `-d, --dry-run` | Simulates `--create` / `--update` without writing to disk. |
| `-f, --format <fmt>` | `human` (default) or `json`. |

**Typical combinations:**

```bash
# See the state of the decision register at a glance
evolith-cli adr --matrix

# Query one specific ADR as JSON (for a script or an agent)
evolith-cli adr --get ADR-0002 --format json

# Mark an ADR as superseded, recording why —
# first as a dry run to review, then for real
evolith-cli adr --update ADR-0005 --status Superseded --reason "Replaced by ADR-0011" --dry-run
evolith-cli adr --update ADR-0005 --status Superseded --reason "Replaced by ADR-0011"
```

**What to expect.** In human mode, readable tables and cards; the created ADR is
written to `reference/architecture/adrs/<id>.md`. Under `--format json`, the
envelope with the data (`adrs`, the requested ADR, or the matrix summary). If
you ask for an ADR that does not exist (`--get`, or `--update` on a missing id),
the command **exits non-zero** and returns an error envelope. Remember that
`--update` without `--status` does nothing: it warns you the status is required.

### 6.2. `evolith-cli standards` — manage the Evolith standards

**What it does.** Administers the corporate standards (architecture, governance,
operations) living under `reference/standards/`. Like `adr`, every flag is an
action: it initialises the folder structure, lists the standards, shows the
detail of one, validates code against their rules, or exports a standard to
Markdown or JSON. With no action flag it enters interactive mode.

**Basic usage:**

```bash
evolith-cli standards --list
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `--init` | Creates the base structure under `reference/standards/` (with `rulesets/` and `templates/`). It is the first step in a new satellite. |
| `-l, --list` | Lists the registered standards with their id, name, version, category and rule count. |
| `-c, --category <cat>` | Narrows `--list` to one category. |
| `-g, --get <id>` | Shows a full standard: description and its rules (with severity and remediation). |
| `-v, --validate <code>` | Validates a code fragment against the standards' rules and reports how many pass/fail. |
| `-e, --export <id>` | Exports a standard. The format comes from `--format`. |
| `-f, --format <fmt>` | Dual purpose: the export format for `--export` (`markdown` —default— or `json`), and also the command's output mode (`json` for the envelope). |

**Typical combinations:**

```bash
# Bootstrap standards governance in a freshly created satellite
evolith-cli standards --init

# List only the standards of one category, as JSON for tooling
evolith-cli standards --list --category architecture --format json

# Export a standard to Markdown to paste into the documentation
evolith-cli standards --export STD-0001 --format markdown
```

**What to expect.** In human mode, tables and cards with the rules and their
severities (error / warning / info). Under `--format json`, the envelope with
the listing, the requested standard, or the validation result (`totalRules`,
`passed`, `failed`). Asking for a non-existent standard with `--get` **exits
non-zero**. Mind the overloaded `--format`: if you export as JSON with
`--export … --format json`, you get the standard's content serialised as JSON,
not just the CLI envelope.

### 6.3. `evolith-cli docs` — generate the base documentation

**What it does.** Scaffolds the documentation files Evolith expects at the root
of a satellite: `README.md`, `AGENTS.md`, `MASTER_INDEX.md` and a sample
`evolith.yaml` (the satellite contract). It is what you run when starting a
project so you do not begin from zero. For safety it **never overwrites**
existing files unless you ask with `--force`.

**Basic usage:**

```bash
evolith-cli docs
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `-t, --template <type>` | Which set to generate: `default` (all four files) or `minimal` (only `README.md` and `AGENTS.md`). |
| `-d, --dry-run` | Shows what it would create/update without writing anything. Use it to review before applying. |
| `-f, --force` | Overwrites files that already exist (skipped by default). |
| `-f, --format <fmt>` | `human` (default) or `json`. |

**Typical combinations:**

```bash
# See which files would be generated, without touching anything
evolith-cli docs --dry-run

# Minimal scaffold (README + AGENTS) in a repo that only needs the basics
evolith-cli docs --template minimal

# Regenerate all the base documentation, overwriting whatever was there
evolith-cli docs --force
```

**What to expect.** In human mode, a summary of how many files were created,
updated and skipped, plus one line per written file. Under `--format json`, the
envelope with `created`, `updated`, `skipped` and the list of `files`. If every
file already exists and you do not pass `--force`, the command changes nothing
and says so. Note: `docs` always writes to the **current directory**, so run it
from the satellite root.

## 7. Satellite and agents

These commands operate on the *satellite's own lifecycle*: creating it,
registering it, populating it with governance agents and keeping it current when
the Core publishes new rules. Unlike the validation commands, here the effect is
to **create or modify files** (or remote repositories), so almost all of them
have a dry-run mode or a confirmation before writing.

### 7.1. `evolith-cli init` — initialise a satellite repository

**What it does.** Creates the scaffold of an Evolith satellite in the current
directory: `evolith.yaml`, the folder structure and the base artifacts the
standard requires, according to the runtime, architecture and database you
choose. By default it is **interactive** (it asks you questions); for CI or
scripts it has a prompt-free batch mode.

**Basic usage (interactive):**

```bash
evolith-cli init
```

**Batch usage (no prompts):**

```bash
evolith-cli init --name my-satellite --runtime nodejs --arch clean --yes
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `-n, --name <name>` | Project name. Required in batch mode (through the flag or inside `--config`). |
| `-y, --yes` | Turns on non-interactive batch mode: uses the flags and fills the rest with defaults, asking nothing. |
| `-c, --config <file>` | Path to an `evolith.setup.json` supplying the whole configuration; bypasses the prompts entirely. Individual flags override individual fields of the file. |
| `-r, --runtime <id>` | Project runtime: `nodejs`, `dotnet`, `python`. |
| `-m, --monorepo <id>` | Monorepo strategy: `none`, `nx`, `npm-workspaces`, `rush`. |
| `-a, --arch <id>` | Architecture pattern: `clean`, `hexagonal`, `ddd`. |
| `--db <id>` | Database: `postgresql`, `mongodb`, `sqlserver`. |
| `-d, --dry-run` | Dry run: writes no files. |

**Typical combinations:**

```bash
# Interactive: guides you step by step (the normal first time)
evolith-cli init

# Minimal batch for CI: name + --yes; the rest takes defaults (nodejs/clean/postgresql…)
evolith-cli init --name payments-api --yes

# Reproducible from a setup file versioned in the repository
evolith-cli init --config ./evolith.setup.json --format json
```

> Important detail about batch mode: the prompt-free path is triggered **only**
> by `--config` or `--yes`. A bare `--name my-sat` (without `--yes`) still
> enters the interactive wizard.

**What to expect.** In human mode, a summary of the created *artifacts*, the
warnings, and a list of "next steps" (`cd`, `validate`, `agents install`…).
Under `--format json`, the envelope with `data.artifacts`, `data.warnings` and
`data.success`.

### 7.2. `evolith-cli init-wizard` — step-by-step interactive assistant

**What it does.** It is the purely guided variant of initialisation: it walks
you through a four-step wizard (name, runtime, monorepo, architecture) and
creates the project at the end. Useful when you want the full conversational
flow instead of remembering flags.

**Basic usage:**

```bash
evolith-cli init-wizard
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `--no-wizard` | Turns the wizard off; redirects you to use `evolith-cli init`. |
| `--no-interactive` | Runs without interaction (for automation/CI), taking each step's default values. |
| `-f, --format <fmt>` | `human` (default) or `json`. |

**Typical combinations:**

```bash
# The full guided wizard
evolith-cli init-wizard

# No prompts, with machine output (CI)
evolith-cli init-wizard --no-interactive --format json
```

**What to expect.** At the end, the created project with its list of
*artifacts*. Under `--format json` you get the envelope; if you cancel or it
fails, it exits non-zero with an `error.code` (`VALIDATION_FAILED` on cancel,
`INTERNAL_ERROR` if creation fails).

> `init` or `init-wizard`? For day-to-day work use `evolith-cli init`: it is
> already interactive and additionally has the batch mode. `init-wizard` is the
> dedicated, narrower assistant (it covers name/runtime/monorepo/architecture).

### 7.3. `evolith-cli satellite:create` — create the GitHub repo and register it

**What it does.** Creates a **new repository on GitHub** and registers it as an
Evolith satellite in a single step, with its topology and its lifecycle phase.
Unlike `init` (which builds the local scaffold), this command talks to GitHub,
so it needs a token.

**Basic usage:**

```bash
export GITHUB_TOKEN=ghp_xxx
evolith-cli satellite:create --name my-satellite --owner my-org
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `-n, --name <name>` | Name of the repository to create. If you omit it, you are asked. |
| `-o, --owner <owner>` | GitHub user or organisation that will own the repository. |
| `--topology <id>` | Architecture topology: `monolith`, `modular`, `micro`, `distributed`. |
| `--phase <id>` | Initial SDLC phase: `discovery`, `design`, `construction`, `qa`, `release`. |
| `--private` | Creates the repository as private (public by default). |
| `-d, --description <text>` | Optional description for the repository. |
| `-t, --token <token>` | GitHub personal access token. If omitted, the `GITHUB_TOKEN` environment variable is used. |

**Typical combinations:**

```bash
# Private repo, microservices, starting in discovery
evolith-cli satellite:create --name checkout-svc --owner acme \
  --topology micro --phase discovery --private

# With no flags: the command asks for name, owner, topology and phase
evolith-cli satellite:create

# For automation: explicit token + JSON output
evolith-cli satellite:create --name payments --owner acme --token "$GH_PAT" --format json
```

**What to expect.** In human mode, a "Satellite Registered" card with the ID,
the repository URL, the topology, the phase and the status. Under
`--format json`, the envelope with `data.satellite`. If there is no token
(neither `--token` nor `GITHUB_TOKEN`), the command creates nothing and tells
you the token is missing.

### 7.4. `evolith-cli satellite:adopt` — adopt an existing repository

**What it does.** Takes a **GitHub repository that already exists** and places it
under Evolith governance **without creating anything new**: it registers it as a
satellite with its topology and phase. It is the counterpart of
`satellite:create` when the repository is already running.

**Basic usage:**

```bash
export GITHUB_TOKEN=ghp_xxx
evolith-cli satellite:adopt --repo https://github.com/my-org/my-repo
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `--repo <url>` | URL of the repository to adopt (`https://github.com/owner/repo`). The owner and the name are parsed from it. |
| `--owner <owner>` | Forces the owner; by default the one appearing in `--repo` is used. |
| `--topology <id>` | Topology: `monolith`, `modular`, `micro`, `distributed`, `custom`. |
| `--phase <id>` | Satellite phase: `alpha`, `beta`, `rc`, `ga`. |
| `--token <token>` | GitHub personal access token (defaults to `GITHUB_TOKEN`). |
| `-f, --format <fmt>` | `human` or `json`. |

**Typical combinations:**

```bash
# Minimal adoption: just the URL; topology/phase default (modular/alpha) or are asked
evolith-cli satellite:adopt --repo https://github.com/acme/legacy-api

# Declaring topology and maturity phase
evolith-cli satellite:adopt --repo https://github.com/acme/legacy-api \
  --topology modular --phase beta

# In a pipeline, everything through flags + JSON
evolith-cli satellite:adopt --repo https://github.com/acme/legacy-api \
  --topology micro --phase ga --token "$GH_PAT" --format json
```

**What to expect.** A "Satellite adopted successfully" summary with ID, owner,
repository, topology, phase and status; under `--format json`, the envelope with
`data.satellite`.

> Mind the phases: those of `satellite:adopt` describe **release maturity**
> (`alpha`/`beta`/`rc`/`ga`) and are different from the SDLC phases
> (`discovery`…`release`) used by `satellite:create` and the validation
> commands. If you do not pass `--phase` in JSON mode, `alpha` is adopted by
> default.

### 7.5. `evolith-cli agents` — manage agents in the satellite

**What it does.** Administers the governance agents installed in the satellite:
installing them (with a template and a set of ADRs/rulesets), listing,
validating, upgrading, running them against the Agent Runtime, or removing them.
With no arguments it opens an **interactive menu**; you can also go straight to
an action.

**Basic usage:**

```bash
evolith-cli agents            # interactive menu
evolith-cli agents --list     # lists the installed agents
```

**Main actions and options:**

| Option / action | What it is for |
| --- | --- |
| `-l, --list` (or `agents list`) | Lists the agents installed in the repository. |
| `-i, --install [name]` (or `agents install`) | Installs a new agent: asks for name, template (`standard`/`minimal`/`enterprise`), description and which ADRs/rulesets to include. |
| `-r, --remove [name]` (or `agents remove`) | Removes an installed agent (asks for confirmation; it is irreversible). |
| `agents validate` | Validates an agent's ruleset against the schema and reports the problems found. `--name <agent>` is required with `--format json`. |
| `agents upgrade` | Bumps the agent's *patch* version and updates its ruleset. |
| `--run [intent]` (or `agents run`) | Sends an *intent* to the Agent Runtime (URL in `AGENT_RUNTIME_URL`, `http://localhost:3000` by default) and prints the result. |
| `--format [type]` | Output format: `json`, `table`, `yaml`. |

**Typical combinations:**

```bash
# See which agents exist, as JSON for a script
evolith-cli agents --list --format json

# Install an agent (it guides you through template and rulesets)
evolith-cli agents install

# Validate and then bump an agent's version
evolith-cli agents validate
evolith-cli agents upgrade

# Run an intent against the Agent Runtime
evolith-cli agents run --run "Draft the architecture plan for the new microservice"
```

**What to expect.** Each action returns its envelope: `list` carries
`data.agents` and `data.count`; `install`/`remove`/`upgrade` carry the affected
agent and a message; `validate` carries `data.passed` and the list of `issues`.
When validation fails, or there are no agents for the operation, the command
**exits non-zero**.

> About the actions: `validate` and `upgrade` are invoked as a **positional
> action** (`evolith-cli agents validate`), not as a flag. `--install`,
> `--remove`, `--list` and `--run` do have a flag shortcut in addition to their
> positional form; when you pass both, the positional action wins.

### 7.6. `evolith-cli upgrade` — update the satellite for new rules

**What it does.** When the Core (upstream) publishes new rules, this command
**plans** which changes your satellite needs to catch up, shows you the plan
(with risk level and the breaking changes) and, if you confirm, applies them.

**Basic usage:**

```bash
evolith-cli upgrade --satellite . --core ../evolith-core
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `-s, --satellite <path>` | The satellite to update (default: nearest-ancestor `evolith.yaml` from cwd). |
| `-c, --core <path>` | The Core checkout the new rules come from. |
| `-d, --dry-run` | Computes and shows the plan **without applying** any change. |
| `-f, --force` | Applies the upgrade **even when there are breaking changes** (without it, the command stops and warns you). |
| `--report` | Shows the detailed upgrade report. |

**Typical combinations:**

```bash
# First look at what would change, touching nothing
evolith-cli upgrade --satellite . --core ../evolith-core --dry-run

# Apply (it asks for confirmation before writing)
evolith-cli upgrade --satellite . --core ../evolith-core

# Force even with breaking changes, as JSON for CI
evolith-cli upgrade -s . -c ../evolith-core --force --format json
```

**What to expect.** First the **plan**: current version → target version, risk
level (`low`/`medium`/`high`), the list of changes (with `+`/`~`/`-`/`»`
according to whether something is added, modified, removed or migrated) and
which ones are breaking. If the satellite is already current, it says so and
does nothing. With `--dry-run` it ends there. If there are breaking changes and
you did **not** pass `--force`, the upgrade is cancelled so you can review. On
apply, an "Upgrade Report" with the number of changes applied. Under
`--format json`, all of this travels inside the envelope.

## 8. Utilities

This group gathers the support commands: managing your local configuration, reviewing what you have run, saving keystrokes, seeding sample data, exploring the API surface, integrating the CLI with your shell, and keeping the binary itself current. They take no part in rule evaluation or in the gates; they make life around them more comfortable.

They all accept `--format json` (the same ADR-0073 envelope from section 2) except `completion`, which emits raw shell scripts.

### 8.1. `evolith-cli profile` — configuration profiles

**What it does.** Stores and switches between named configuration sets (`core` and `satellite` paths, `tenant`, `initiative`) so you do not repeat the same flags on every command. You work with several projects or environments and change context with a single command. The action is a positional argument; if you omit it, the active profile is shown.

**Basic usage:**

```bash
evolith-cli profile              # shows the active profile (equivalent to 'current')
evolith-cli profile list         # lists every profile
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `<action>` (positional) | What to do: `current` (default), `list`, `create`, `switch`, `delete`. |
| `-n, --name <name>` | The profile you operate on (required for `switch` and `delete`; for `create` you are asked if it is missing). |
| `-f, --format <fmt>` | `human` (default) or `json`. |

**Typical combinations:**

```bash
# Create a new profile (it asks for core/satellite/tenant/initiative interactively)
evolith-cli profile create --name staging

# Switch to the staging profile
evolith-cli profile switch --name staging

# Delete a profile you no longer use
evolith-cli profile delete --name staging
```

**What to expect.** `current` and `list` return the configuration and the active profile (marked with `*` in human mode). `create` without `--name` opens an interactive assistant asking for the paths one by one (you may leave them empty). Usage errors — missing profile, duplicate name — exit non-zero under `--format json`.

### 8.2. `evolith-cli history` — command history

**What it does.** The CLI automatically records every command you run (with timestamp, duration, success and exit code). This command lets you list it, search it, see usage statistics, inspect one entry or clear it. Useful to recall "what did I run yesterday" or to audit your own usage.

**Basic usage:**

```bash
evolith-cli history              # last 20 entries
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `-l, --list` | Lists the recent entries (the default behaviour). |
| `-n, --limit <n>` | How many entries to show (default: 20). |
| `-g, --get <id>` | Shows the full detail of one entry by its ID. |
| `-s, --search <query>` | Searches entries matching a text. |
| `--stats` | Statistics: total, success rate, last 24 h and most used commands. |
| `--replay <id>` | Shows (does not run) the command of an entry, ready to copy. |
| `--clear` | Deletes the entire history (asks for confirmation in human mode). |
| `-f, --format <fmt>` | `human` (default) or `json`. |

**Typical combinations:**

```bash
# See the last 50 commands
evolith-cli history --limit 50

# Find every validation you ran
evolith-cli history --search validate

# Review the detail of one specific entry
evolith-cli history --get a1b2c3
```

**What to expect.** An `ID | Time | Command | Status | Duration` table in human mode (✓/✗ per result), or the array of entries in JSON. Careful: `--replay` **does not re-run** the command, it only prints it for you to launch yourself. `--clear` is destructive and permanent.

### 8.3. `evolith-cli alias` — command aliases

**What it does.** Defines your own shortcuts for commands you type often. An alias maps a short name to a command string, so `evolith-cli v` runs whatever you want.

**Basic usage:**

```bash
evolith-cli alias --list
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `--add <alias=command>` | Creates an alias with the `name=command` syntax. |
| `--remove <alias>` | Removes an existing alias. |
| `--list` | Lists every defined alias. |
| `-f, --format <fmt>` | `human` (default) or `json`. |

**Typical combinations:**

```bash
# Create a shortcut for validating against the neighbouring Core
evolith-cli alias --add "v=validate -c ../evolith-core"

# Remove it
evolith-cli alias --remove v
```

**What to expect.** Confirmation of the alias created/removed, or the list of mappings. If `--add` does not carry the `alias=command` format you get `VALIDATION_FAILED` (non-zero exit under JSON). With no flag at all, the command reminds you to use `--add`, `--remove` or `--list`.

### 8.4. `evolith-cli fixtures` — seed sample data

**What it does.** Generates reproducible sample files — an `evolith.yaml`, ADRs, rulesets — in a directory, to quickly stand up a demo, a test case or a minimal satellite to experiment with. You can preview before writing.

**Basic usage:**

```bash
evolith-cli fixtures demo        # seeds evolith.yaml + sample ADRs
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `[type]` (positional) or `-t, --type <type>` | What to seed: `demo` (default), `adr`, `ruleset`, `evolith`, `full`. |
| `-d, --dir <directory>` | Target directory (default: current directory). |
| `-n, --dry-run` | Previews which files would be created, writing nothing. |
| `-f, --format <fmt>` | `human` (default) or `json`. |

**Typical combinations:**

```bash
# See what the full set would create, without touching disk
evolith-cli fixtures full --dry-run

# Seed only ADRs into a specific directory
evolith-cli fixtures adr --dir ./sandbox

# Seed everything (evolith.yaml + ADRs + rulesets)
evolith-cli fixtures full
```

**What to expect.** The list of created files (or ones marked `[dry-run]`). An invalid `type` returns `VALIDATION_FAILED`; if some file cannot be written, the envelope carries `IO_ERROR` with the per-file detail and exits non-zero.

### 8.5. `evolith-cli api` — API explorer

**What it does.** Browses and describes the Evolith surface without leaving the terminal: the MCP tools and resources, the phase-gate schemas and the CLI commands, with their input/output schemas. It serves as a quick reference when you are building an agent or a client and need to know which operations exist and what they take.

**Basic usage:**

```bash
evolith-cli api --list                     # lists the available categories
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `-l, --list` | Lists the categories, or the contents of one if you add `--category`. |
| `-c, --category <cat>` | Narrows to one category: `tools`, `resources`, `schemas`, `commands`. |
| `-i, --inspect <name>` | Shows the detailed schema of a tool, resource or command. |
| `-f, --format <fmt>` | `human` (default) or `json`. |

**Typical combinations:**

```bash
# List every MCP tool
evolith-cli api --list --category tools

# Inspect the input/output schema of a tool
evolith-cli api --inspect gate-evaluate

# Inspect an MCP resource by its URI
evolith-cli api --inspect evolith://rulesets
```

**What to expect.** With `--list` and no category, the catalogue of categories; with `--category`, its entries. With `--inspect`, the description plus the `inputSchema`/`outputSchema` (tools), the `mimeType` (resources) or the options (commands). An unknown name returns `VALIDATION_FAILED` with suggestions of valid examples.

### 8.6. `evolith-cli completion` — shell completion

**What it does.** Generates and installs tab-completion scripts and hook functions for your shell, so the terminal completes commands and shows project state (`evolith_status`, `evolith_phase`, `evolith_gate`, …). It detects your shell automatically from `$SHELL`.

**Basic usage:**

```bash
evolith-cli completion                     # shows the help and the detected shell
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `--install <shell>` | Installs completion for `bash`, `zsh` or `fish` (edits your rc file or copies the script). |
| `--shell <shell>` | Forces a specific shell instead of the auto-detected one. |
| `--hooks` | Prints the hook functions to stdout (to review or redirect them). |
| `--install-hooks <shell>` | Installs those hook functions into the given shell. |

**Typical combinations:**

```bash
# Install completion for zsh (appends it to ~/.zshrc)
evolith-cli completion --install zsh

# Also install the status hook functions
evolith-cli completion --install-hooks zsh
```

**What to expect.** Confirmation of where it was installed and what to reload (`source ~/.zshrc`, `fish -l`, …). `--hooks` dumps the script as-is so you can inspect it. If it was already installed, it tells you without duplicating entries. Unlike the rest of the group, this command does **not** use the JSON envelope: it emits shell text directly.

### 8.7. `evolith-cli update` — keep the CLI current

**What it does.** Queries the npm registry to find out whether a newer version of the CLI itself (`@beyondnet/evolith-cli`) exists and, if so, installs it for you. With no flags it just shows help.

**Basic usage:**

```bash
evolith-cli update --check                 # checks whether an update exists
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `-c, --current` | Shows the installed version and the latest published one. |
| `--check` | Checks the npm registry for a newer version. |
| `-i, --install` | Installs the latest version (`npm install -g`). |
| `-f, --format <fmt>` | `human` (default) or `json`. |

**Typical combinations:**

```bash
# See which version you are on and which is the latest
evolith-cli update --current

# Update to the latest if applicable
evolith-cli update --install
```

**What to expect.** The `updateAvailable` field (or the `⚠ Update available: X → Y` notice). `--install` runs `npm install -g` and confirms the resulting version; if it cannot reach the registry it returns `IO_ERROR` (non-zero exit). It needs network access and permission for a global npm install.

### 8.8. `evolith-cli chat` — conversational interaction with the Agent Runtime

**What it does.** Sends a natural-language intent to the Evolith Agent Runtime, which interprets and executes it through the agentic layer. It is the conversational door ("Evolith CLI Chat") for asking for actions without remembering exact commands. It runs in **dry-run by default** (it plans without applying) unless you turn that off.

**Basic usage:**

```bash
evolith-cli chat "validate the construction phase"
```

**Main options:**

| Option | What it is for |
| --- | --- |
| `<message>` (positional) | The intent to process; it is taken from all the loose arguments. |
| `--dry-run [boolean]` | Controls simulation mode; it simulates by default. Pass `--dry-run false` to allow effects. |
| `-f, --format <fmt>` | `human` (default) or `json`. |

**Typical combinations:**

```bash
# Simulate (the default) the effect of an intent
evolith-cli chat "scaffold a react frontend"

# Allow the intent to apply real changes
evolith-cli chat "create the initial evolith.yaml" --dry-run false
```

**What to expect.** In human mode, the run `status`, a `summary` and the number of `findings`. In JSON, the full Agent Runtime result. If you pass no message, you are asked for one. Because it depends on the Agent Runtime, its availability and behaviour are subject to that layer; always start with the dry run before enabling effects.

## 9. Chaining commands — a typical construction flow

The commands combine into a flow. A usual cycle while you build:

```bash
# 1. Generate the scaffold (if applicable)
evolith-cli scaffold --frontend react --orm prisma --phase 1 --dry-run   # simulate first
evolith-cli scaffold --frontend react --orm prisma --phase 1             # then write

# 2. Validate what you built and review the drift
evolith-cli validate -s . -c ../evolith-core --phase construction
evolith-cli drift --path .

# 3. Evaluate and confirm the phase gate
evolith-cli evaluate --workspace . -c ../evolith-core --phase construction
evolith-cli gate evaluate --phase construction -s . -c ../evolith-core
```

Because every command **exits non-zero** when its verdict is negative, this same
block works as-is inside a CI pipeline: it stops at the first step that does not
pass.

---

> **Equivalent guides.** This is the guide for the **CLI** interface. A user
> driving Evolith through **MCP** (agents) or **REST** (integration/Tracker) has
> their own guide in the same format: [Using MCP](using-the-mcp.md) and
> [Using the REST API](using-the-rest-api.md).
