> **Bilingual Navigation:** [Ver versión en Español](./0109-multi-project-satellite-governance.es.md)

# ADR-0109: Multi-Project Satellite Governance (Monorepo Satellites)

> **Agent Signature:** Architect Agent (Winston)

## Status
Accepted

## Date
2026-07-09

## Context and Problem
The three .NET products — **MMS**, **UMS**, and **Evolith Tracker** — are being consolidated into a
single **products monorepo**, while **Evolith Core** (`evolith_arch32`) remains a separate,
sovereign governance/reference corpus. That direction was chosen after a grounded, adversarially
verified analysis: absorbing the products *into* Core would violate Core's four defining invariants
(reference-corpus-not-app, stateless engine per ADR-0101, UMS-as-external-exemplar, single TS/Node
toolchain) and would require *replacing* the Core standard (superseding ADR-0048/0070/0079/0101). By
contrast, co-locating the three products delivers atomic producer+consumer changes (the exact
workflow the tenant-ownership migration M1–M4 needs) and a one-`ProjectReference` resolution of the
shared-contract duplication (DS-12) — with Core left pristine.

**But Core's satellite-governance model assumes one repository per satellite, and that assumption
blocks the monorepo:**

1. **SVC-01** (`src/rulesets/governance/satellite-contracts.rules.json`, mirror
   `src/rulesets/opa/satellite-contracts.rego`) reads *"Satellite must have exactly one `evolith.yaml`
   in repository root. Nested `evolith.yaml` files are prohibited."*
2. The manifest schema (`src/rulesets/schema/evolith-yaml.schema.json`) is `additionalProperties:false`
   and has **no notion of a product within a repo**; `spec.sdlc.currentPhase` is a single value.
3. **`SatelliteRecord`** (`src/packages/core-domain/src/domain/satellite-record.ts`) keys satellite
   identity on `repoUrl`/`owner`/`name` with **no `subpath`/`manifestPath`** — one record per repo.
4. The CLI resolves "which satellite" inconsistently: `validate` accepts `--satellite [path]`,
   `gate`/`phase` accept `--project [path]`, and **`upgrade` is hard-bound to `process.cwd()` with no
   flag at all** (`src/sdk/cli/src/commands/upgrade/upgrade.command.ts`).

Collapsing the three products under a **single root manifest** to satisfy SVC-01 would govern the
whole monorepo as **one** satellite and destroy independent per-product maturity (MMS phase 1 vs
Tracker phase 2), distinct `coreRef` pins, and per-product ADR registries — an unacceptable
governance regression. Therefore the monorepo cutover is **gated on this governance amendment**; it
is a governance + tooling change, not a `git` move.

## Decision
Promote the satellite model to **first-class multi-project satellites**. A **satellite workspace**
(a monorepo) may contain **N satellite projects**, each governed **independently** with its own
manifest, maturity, `coreRef`, and ADR registry. A single-repo satellite is simply a workspace of
one project — the existing model is preserved as the degenerate case (backward compatible).

### 1. Layout
- A **satellite project** is a subtree with exactly one `evolith.yaml` at **its project root** (a
  subpath of the workspace). The manifest is fully self-contained (own `metadata.name`,
  `spec.coreRef`, `spec.sdlc.currentPhase`, `spec.compliance.adrRegistry`).
- A **satellite workspace** declares its project roots in a root descriptor
  **`evolith.workspace.yaml`** (`kind: SatelliteWorkspace`), e.g.:
  ```yaml
  apiVersion: evolith.dev/v1
  kind: SatelliteWorkspace
  metadata: { name: evolith-products }
  spec:
    projects:
      - { name: mms, path: mms }
      - { name: ums, path: ums }
      - { name: evolith-tracker, path: tracker }
  ```
- Nesting a manifest **inside another project's tree** remains prohibited. The project roots are the
  authoritative boundary; discovery is bounded to the declared `spec.projects[].path` set.

### 2. SVC-01 amendment
Reframe SVC-01 from repo-scoped to **project-scoped**: *"Each satellite project must have exactly one
`evolith.yaml` at its project root; a manifest nested within another project's tree is prohibited; a
workspace declares its project roots in `evolith.workspace.yaml`."* Update the rule JSON, the OPA
fact (`hasEvolyamlAtRoot` → `hasEvolyamlAtProjectRoot`, evaluated against the resolved project path),
and add **SVC-06 (workspace integrity)**: every `evolith.yaml` found in a workspace must correspond
to a declared `spec.projects[].path`, and vice versa. (The native handler already evaluates against
`ctx.satellitePath`, so per-project evaluation needs no engine change — only the contract text, the
OPA fact, and workspace discovery.)

### 3. Manifest schema
Add an optional root `evolith.workspace.yaml` schema (`kind: SatelliteWorkspace`) and keep the
per-project `evolith.yaml` schema unchanged. No new field is forced onto the project manifest —
product identity is the project manifest's own `metadata.name` at its `path`.

### 4. Registry
Extend `SatelliteRecord` with an **optional `subpath`** (the project's path within the repo; absent =
repo-root satellite, preserving today's records). Identity becomes **(`repoUrl`, `subpath`)**; a
workspace is N records sharing a `repoUrl`. Update `satellite-record.schema.json` accordingly.
`initialize-satellite`/`sync-satellite` learn to enumerate a workspace's projects.

### 5. CLI — unify satellite resolution
- Thread a single canonical **`--satellite <path>`** option through **`validate`, `gate`, `phase`,
  and `upgrade`**; keep `--project` as a deprecated alias on `gate`/`phase`.
- Resolution order for every command: explicit `--satellite` → **nearest-ancestor `evolith.yaml`
  from `cwd`** (so `cd mms && evolith upgrade` and `evolith upgrade --satellite mms` both work) →
  `profile.satellite` → error. This closes the `upgrade` cwd-hardcode.

### 6. Scope guard
This governs **product monorepos only**. The **Evolith Core repository is not a satellite workspace**
and is explicitly out of scope — Core remains the sovereign upstream governance authority
(ADR-0101), its root taxonomy and `.harness` guards unchanged. Satellite root-taxonomy (ADR-0070,
`src/`/`docs/` dichotomy) continues to apply **per project**.

## Consequences
- **Positive:** the products monorepo becomes governable with independent per-product maturity;
  no single-manifest regression; DS-12 collapses to an in-repo `ProjectReference`; Core stays
  pristine; single-repo satellites keep working unchanged.
- **Required implementation (gated before cutover, tracked as gaps):**
  1. SVC-01 rewrite + SVC-06 in `satellite-contracts.rules.json` + `satellite-contracts.rego`
     (+ input schema, + native handler workspace-awareness).
  2. `evolith.workspace.yaml` schema (`kind: SatelliteWorkspace`) in `src/rulesets/schema/`.
  3. `SatelliteRecord.subpath` + `satellite-record.schema.json` + registry enumeration.
  4. CLI `--satellite` unification across validate/gate/phase/upgrade + nearest-ancestor resolution
     + `upgrade` flag.
  5. A **governance spike (Phase 0b)**: prove per-product `validate`/`evaluate`/`upgrade` works by
     subpath before archiving the source repos.
- **Negative / trade-offs:** this is real governance + tooling engineering, not a config tweak; the
  CLI's ambient single-active-satellite model is replaced by explicit/ancestor resolution.

## Alternatives Considered
- **Single root manifest for the whole monorepo** — rejected: governs the monorepo as one satellite,
  losing per-product maturity/`coreRef`/ADR registries.
- **Keep three separate repos + shared `Evolith.Messaging.Contracts` NuGet/subtree (Option C)** — the
  materially cheaper path that preserves the satellite model at near-zero migration cost; retained as
  the explicit fallback. Rejected here because Option A's atomic producer+consumer workflow is
  required by the imminent M1–M4 tenant-ownership migration.
- **Absorb the products into `evolith_arch32`** — rejected: violates Core's four invariants and would
  replace the Core standard (supersede ADR-0048/0070/0079/0101). This is the harmful merge.

## References
- ADR-0070 (lean-root satellite taxonomy — applies per project) · ADR-0101 (stateless Core — Core
  stays separate) · ADR-0048/0079 (Core taxonomy invariants) · ADR-0106/0107/0108 (master-data
  projection substrate).
- SVC-01: `src/rulesets/governance/satellite-contracts.rules.json` · `src/rulesets/opa/satellite-contracts.rego`.
- Manifest schema: `src/rulesets/schema/evolith-yaml.schema.json`. Registry: `src/packages/core-domain/src/domain/satellite-record.ts`.
- CLI resolution: `src/sdk/cli/src/commands/{validate,gate,phase,upgrade}/`.
- Decision basis: the grounded, adversarially-verified monorepo analysis (products-monorepo, Core sovereign).
- Deployment strategy: `product/suite/architecture/evolith-suite-deployment-strategy.md`.
