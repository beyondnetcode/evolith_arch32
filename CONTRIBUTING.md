# Contributing to Evolith Core

Welcome to **Evolith Core**! We are thrilled that you're interested in contributing.

Evolith is not a conventional application starter template. It is an **executable architectural governance framework** — a living set of technical laws, ADRs, OPA policies, JSON-Schema contracts, and AI agent definitions that act as the enterprise reference for satellite products.

To ensure everything flows smoothly, please take a moment to review our unique contribution model.

## 1. The BMAD Method and AI Agents

We use the **BMAD Method** (Specification-driven, AI-Driven Development) for the core repository. This means you do not have to code or write documentation alone. You can (and should) invoke our specialized AI agents in your IDE or prompts to assist you:

- **Winston (Principal Architect):** Use for architectural audits and to track gaps.
- **Architect Agent:** Assists in defining Data Mesh contracts, Event-Driven patterns, and drafting Architecture Decision Records (ADRs).
- **Developer Agent:** Helps implement secure patterns (OWASP) and progressive architecture patterns.
- **QA Agent:** Assists in contract testing and Rego policy validation.
- **DevOps Agent:** Helps orchestrate distributed deployments and GitHub Actions.
- **Docs Agent:** Manages translation and Markdown validations.

The agent roster, contracts, and handoffs are documented in [AGENTS.md](./AGENTS.md). For detailed orientation, see our [Quick Start Guide](./reference/core/foundations/inheritance-model/product-quick-start.md).

## 2. Prerequisites and Local Setup

Evolith is an **npm workspaces monorepo** (`sdk/*`, `apps/*`, `src/packages/*`). The Evolith CLI lives in `src/sdk/cli` (published as `@beyondnet/evolith-cli`), the Core-API in `src/apps/core-api`, and shared logic in `src/packages/*` (`core`, `core-domain`, `infra-providers`, `mcp-server`, `mcp-tools`, `sdk-client`).

### A. Prerequisites

- **Node.js 20** is what CI runs. The CLI declares `engines.node >= 18.0.0`, but pin to Node 20 locally to match the pipeline.
- **npm** (workspaces-aware; ships with Node).
- **Git** with the GitFlow branching model (see [ADR-0050](./reference/core/architecture/adrs/core/0050-gitflow-branching-strategy.md)).

### B. Clone and Install

```bash
# Fork and clone. The upstream URL below is read-only for you unless you are a
# maintainer -- pushing to it will be rejected, which is a confusing first
# experience, so fork first.
gh repo fork beyondnetcode/evolith_arch32 --clone
cd evolith_arch32

# Install all workspaces from the repo root
npm install
```

`npm install` resolves every workspace at once. Husky hooks are wired by the root `prepare` script during install.

### C. Build

Some workspaces depend on each other, so build the shared packages first, then the CLI:

```bash
npm run build
```

That is `tsc -b` over all eleven projects, which resolves the dependency order itself. The
per-workspace sequence this guide used to list omitted `@beyondnet/evolith-contracts` and
`@beyondnet/evolith-sdk`, so following it on a clean clone failed.

To compile the OPA policies to WASM (required for the OPA parity gate), run `npm run build:policy` from the root.

## 3. Running Tests

Tests run per workspace. The Evolith CLI carries the primary suites:

```bash
# Unit tests (Evolith CLI)
npm run test:unit -w @beyondnet/evolith-cli

# End-to-end tests (Evolith CLI)
npm run test:e2e -w @beyondnet/evolith-cli

# Unit + e2e together
npm test -w @beyondnet/evolith-cli

# Coverage (CI enforces an 80% statement threshold)
npm run test:cov -w @beyondnet/evolith-cli

# MCP stdio + HTTP smoke test
npm run mcp:smoke -w @beyondnet/evolith-cli

# Contract conformance suite (from root)
npm run test:contract
```

## 4. The Golden Rules of Evolith

Before you submit a Pull Request, you must adhere to these absolute rules. The CI gates listed in each section will block your PR if violated.

### A. Bilingual Parity on the Entry Surface

**This rule changed on 2026-08-16 ([ADR-0126](./reference/core/architecture/adrs/core/0126-bilingual-entry-surface.md)) and is much smaller than it used to be.** It used to require a Spanish twin for every English document under `reference/` — 783 pairs. It now applies to **sixteen** documents: the landing and community-health files, the `reference/` hubs linked from the README, and the gap board. They are listed by name in [`.harness/scripts/lib/bilingual-scope.mjs`](./.harness/scripts/lib/bilingual-scope.mjs).

If you are editing one of those sixteen, edit both halves in the same pull request: they must carry the same number of `##` and `###` headings (the top-level `#` title is not counted), the Spanish file must actually read as Spanish, and block tags (`<div>`, `<details>`, `<table>`) must open and close. **If you are editing anything else, there is nothing to mirror** — write in whichever language the file is in.

The guards say out loud what they no longer check, so you can tell an unenforced file from a verified one:

```
bilingual scope (ADR-0126): 16/16 entry-surface document(s) enforced; 784 EN/ES pair(s)
outside the entry surface were NOT evaluated — their state is unknown, not verified.
```

### B. No Emojis or Decorative Characters

The `01-validate-docs.mjs` gate rejects emojis, pictographic symbols, the UTF-8 BOM, the replacement character, CRLF line endings, and known mojibake. Write Markdown with plain ASCII punctuation and LF line endings.

### C. Valid Relative Links Only

Every relative Markdown link (and its `#anchor`) must resolve to a file that exists. Confirm the target before linking; broken links fail the docs gate.

### D. Architectural Agnosticism

Unless you are editing a specific *Authoritative Tech Stack Profile*, keep the reference agnostic. Do not assume a specific runtime, framework, or cloud provider in the core standards without an accepted ADR.

### E. Validation Quality Gates

You must validate your work locally. The Husky `pre-commit` hooks check your work automatically, but run these scripts manually from the root before committing:

```bash
# Validate all Markdown links, anchors, Mermaid diagrams, and forbidden characters
node .harness/scripts/ci/01-validate-docs.mjs

# Verify bilingual structural parity (equal ## and ### counts)
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

If these scripts fail, the CI pipeline will block your PR.

### F. What the git hooks do, and what they will not do to you

Three hooks run locally. **None of them will touch your push.**

| Hook | What it does for you |
|---|---|
| `pre-commit` | Offers a local validation mode. Choosing *Skip* is fine — CI is the real gate. |
| `prepare-commit-msg` | Adds your DCO `Signed-off-by` line so you do not have to remember `-s`. |
| `commit-msg` | Checks Conventional Commits and that the sign-off is present. |

`pre-push` contains a release macro — merge `develop` into `main`, push both — that belongs
to whoever runs this project's releases. **It is owner-only and it never fires on a feature
branch.** Before 2026-08-16 it did: it read an intent recorded at commit time and ignored the
refs git actually hands it, so `git push -u origin my-branch` ran `git push origin develop`.
If you ever saw that, it was this, and it is fixed.

Non-interactive contexts (an editor, a script, CI, an agent) commit without prompting. If you
want the local checks there anyway:

```bash
EVOLITH_CI_MODE=fast git commit -m "docs: fix a broken link"
```

Modes are `skip` (default), `fast`, `governance`, `auto`, `full`.

Verify the hooks yourself — the suite runs in a throwaway clone with a local remote, so it
cannot reach GitHub:

```bash
sh .husky/hooks.test.sh
```

## 5. Standards by Contribution Area

Each surface has its own validators. Confirm your change against the actual files before editing — if a finding is a false positive, report it rather than changing correct code.

### A. Documentation

Keep EN and ES in lockstep (Rule 4.A), no emojis (Rule 4.B), valid links (Rule 4.C). The bilingual terminology lint (`bilingual-terminology-lint.mjs`) and coverage check (`bilingual-coverage.mjs`) also run in CI.

### B. Schemas

JSON-Schema contracts live in `src/rulesets/schema/`. Changes are checked by the contract conformance gate (`10-validate-contract-conformance.mjs`) and the REST envelope/versioning gate (`19-validate-rest-versioning.mjs`). Keep the machine contract in `src/rulesets/contracts/` in sync.

### C. Rulesets and OPA

Native rules are declared per domain under `src/rulesets/<domain>/`, and their executable Rego counterparts live in `src/rulesets/opa/`. **Native and OPA must stay at rule-ID parity:** the parity gates fail closed on any verdict, rule-ID, severity, or evidence drift.

- Native evaluator verdicts: `native-opa-parity.spec.ts` (core-domain jest suite).
- Native evaluator fixture **coverage** (every fixture is actually exercised by that spec): `28-native-evaluator-parity.mjs`.
- Native/OPA semantic parity: `27-opa-parity-gate.mjs` (scoped per commit; a full scheduled sweep runs daily). Recompile policies with `npm run build:policy` after touching any `.rego` file.

### D. Phases, Gates, and Topologies

The SDLC phases are `f1` Conception and Discovery through `f5` Delivery and Operations, with gates `gate-f1` through `gate-f5`. `F1`–`F5` are **maturity levels, not phases**. The eight topologies are modular-monolith, distributed-modules, microservices, event-driven, serverless, edge-computing, data-mesh, and agentic-ai. Phase and topology namespaces must stay disjoint — the `30-validate-phase-topology-disjoint.mjs` guard enforces this. Topology rule coverage and composition are checked by `26-validate-topology-rule-coverage.mjs` and `22-validate-topology-composition.mjs`.

### E. CLI

The Evolith CLI (`@beyondnet/evolith-cli`, currently v1.1.4) uses key families discovery / design / construction / qa / release, configured via `evolith.yaml`. Run the architecture boundary lint (`eslint-plugin-boundaries`) and type check before pushing:

```bash
npm run lint -w @beyondnet/evolith-cli
npm run build -w @beyondnet/evolith-cli
```

### F. MCP

The MCP server ships inside `@beyondnet/evolith-cli` and supports stdio and Streamable HTTP transports. Validate with `npm run mcp:smoke -w @beyondnet/evolith-cli`. Surface and compatibility parity are enforced by `20-validate-surface-compatibility.mjs` and `24-check-surface-parity.mjs`.

### G. Core-API

The Core-API is **REST-only** (no GraphQL, no SSE), served under `/api/v1`. Every response uses the flat ADR-0073 envelope (`meta.command`, `executedAt`, `durationMs`, `correlationId`, `context`, `schemaVersion`); errors follow RFC 9457. The `19-validate-rest-versioning.mjs` gate enforces versioning and envelope shape.

### H. Tracker

The tracking surfaces live under [`reference/core/control-center/`](./reference/core/control-center/README.md):

- [`gaps/gap-tracking.md`](./reference/core/control-center/gaps/gap-tracking.md) — the board, one row per gap. This is the canonical status source.
- [`gaps/gap-reference-catalog.md`](./reference/core/control-center/gaps/gap-reference-catalog.md) — the full detail behind every board row.
- [`maturity-reports/maturity-assessment.md`](./reference/core/control-center/maturity-reports/maturity-assessment.md) — the maturity surface.
- [`evidence/gap-closure-evidence.json`](./reference/core/control-center/evidence/gap-closure-evidence.json) — the machine-readable closure registry.

These are the **only** tracking surfaces. Update them through their bilingual pairs and keep closure evidence in sync; the `08-validate-tracking.mjs` and `09-reconcile-maturity.mjs` gates verify them. Section 6 below describes the intake procedure end to end.

## 6. Filing a Gap

A gap (`GT-###`) is how a finding becomes tracked work. Nothing is generated for you: every artifact below is hand-written, and `08-validate-tracking.mjs` fails the build if any of them is missing or inconsistent. Read the [Gap Closure Evidence Standard](./reference/core/control-center/evidence/gap-closure-evidence-standard.md) before you start.

### A. Reserve the Identifier First

`GT-` numbers are a **globally shared allocator**: parallel sessions collide if two of them read-then-write it at once. The [Session Coordination Ledger](./reference/core/control-center/COORDINATION.md) is the only place to claim one, using the reserve-then-push protocol:

1. `git fetch origin` and read the *Allocator registers* table in the ledger.
2. Take the current next-free `GT-` value, bump the register in the ledger, and **push that file first**, in its own tiny commit. That reserves the number for you.
3. If the push is rejected, someone bumped first: re-fetch, take the new next-free value, retry. Never use `--force`.
4. Only then create the board row and catalog entry that use the number.

Whoever pushes the ledger bump first owns the number. The same protocol governs ADR numbers. Declare your lane in the *Active lanes* table so two sessions do not edit the same rows.

### B. Add the Board Row

Add one row to `gap-tracking.md` **and** its Spanish counterpart `gap-tracking.es.md`. The columns are `ID | Gap | Component | Phase | Criticality | Complexity | Status`:

- `ID` is a link to the catalog anchor, written as ``[`GT-###`](./gap-reference-catalog.md#gt-###)``. The guard reads the ID from the backticks, so the format is not cosmetic.
- `Gap` is a bolded one-line statement of the problem followed by the evidence and the proposed fix.
- `Criticality` is `P0`-`P3`; `Complexity` is `XS`-`XL`.
- `Status` is one of `PENDING`, `IN-PROGRESS`, `DONE`, `DEFERRED` (Spanish: `PENDIENTE`, `EN-PROGRESO`, `COMPLETADO`, `DIFERIDO`). The guard compares EN and ES row-by-row: identical ID order and semantically equal status, or it fails.

Rows are ordered pending first (by criticality, then complexity), then completed. Update the `**Progress:** N / T done · ... ` counter in a small, dedicated board-sync commit, immediately after a `git fetch`, and push at once — that single line is the highest-contention text in the repository.

### C. Write the Catalog Entry in Both Languages

Every board row needs a section in `gap-reference-catalog.md` **and** in `gap-reference-catalog.es.md`. The heading must be exactly `#### GT-###` on its own line; the guard matches that shape literally. The body follows the established entry schema:

```markdown
#### GT-###

**Title:** One sentence naming the defect, not the wish.

- **Purpose:** What the change must achieve.
- **Evidence:** The observed facts, with real paths, counts and commands.
- **Impact:** What breaks or is unreachable today.
- **Risk:** What it costs to leave unfixed.
- **Affected files:** The concrete paths.
- **Component:** `Name` · **Dimension:** Governance · **Type:** docs
- **Criticality:** P2 · **Complexity:** S
- **Proposed fix:** How it is intended to be closed.
- **Acceptance criteria:**
  - [ ] A verifiable statement, one per deliverable.
- **Dependencies:** Other gaps or proposals, or `none`.
- **Status:** `PENDING`
```

Every acceptance criterion must be checkable by someone who did not write it. When the gap is closed, **every** `- [ ]` must become `- [x]` in **both** languages: an unchecked criterion under a `DONE` status fails the guard.

### D. Record the Closure Evidence

A `DONE` board row without a closure record is a build failure. Append exactly one object to the `closures` array of [`gap-closure-evidence.json`](./reference/core/control-center/evidence/gap-closure-evidence.json):

```json
{
  "id": "GT-###",
  "closedAt": "2026-07-18",
  "closureCommit": "83539a29",
  "evidence": ["path/to/a/file/that/proves/it.ts"],
  "validationCommands": ["node .harness/scripts/ci/08-validate-tracking.mjs"],
  "dependencyDisposition": "none",
  "dependencyRationale": "Required whenever the disposition is not none."
}
```

`closedAt` must not be in the future, `closureCommit` must be a commit that exists in the repository, and every `evidence` path must resolve to a real file — the guard checks all three. `dependencyDisposition` is one of `none`, `satisfied`, `accepted-scope`, `deferred`. The registry is append-only and English is its canonical language. Pending, in-progress and deferred gaps must **not** carry an active closure record. No placeholder commit, speculative evidence, or waived checkbox is acceptable.

### E. Validate Before You Push

Run the guard from the repository root and make sure it is green:

```bash
node .harness/scripts/ci/08-validate-tracking.mjs
node .harness/scripts/ci/01-validate-docs.mjs
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

If you only want to report a finding and not track it yourself, open an issue instead — the [issue chooser](https://github.com/beyondnetcode/evolith_arch32/issues/new/choose) offers a bug report, a feature request, a documentation gap, and an ADR proposal. A maintainer will allocate the `GT-###` for you.

## 7. Pull Request Process

1. **Branching:** Follow [ADR-0050](./reference/core/architecture/adrs/core/0050-gitflow-branching-strategy.md). Feature work flows into `develop`, and `develop` is promoted to `main`. Prefix your branches correctly (e.g., `feature/`, `docs/`, `fix/`).
2. **ADR Updates:** If your PR introduces an architectural change or a new tool, it *must* be accompanied by an update to an existing ADR or a new ADR following [ADR-0068](./reference/core/architecture/adrs/core/0068-documentation-release-gitflow.md).
3. **Commit Messages:** We use semantic versioning and release-please. Your commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification, using types such as `feat`, `fix`, `docs`, `ci`, and `chore` (e.g., `feat:`, `docs:`, `fix:`).
4. **Sign your commits off (DCO):** see the section below. `git commit -s` does it.
5. **Issues:** Open an issue before large changes so the design can be discussed. Reference the relevant `GT-###` gap identifier when your work closes a tracked gap — see Section 6 for how to file one.
6. **Code Review:** All PRs require review. Our automated workflows post coverage impact, structural validation, and Winston agentic review results on your PR.

### Developer Certificate of Origin

Every commit must carry a `Signed-off-by` line. Add it automatically:

```bash
git commit -s -m "docs: fix the broken quickstart link"
```

That appends one line using your `user.name` and `user.email`:

```
Signed-off-by: Ada Lovelace <ada@example.com>
```

**What you are certifying.** That you wrote the change, or have the right to submit it under this repository's MIT licence — the full text is the [Developer Certificate of Origin 1.1](https://developercertificate.org/). It is a statement about provenance, not an assignment: **you keep the copyright in your contribution.**

**Why a DCO and not a CLA.** A Contributor Licence Agreement would mean a form to sign before your first line of code is read, which is a poor trade for a project this size — and this project sells itself on traceability, so having no provenance record at all was the wrong place to be. A sign-off line costs one flag and answers the question an adopter's legal review actually asks.

Forgot it? `git commit --amend -s` fixes the last commit; `git rebase --signoff <base>` fixes a branch.

Thank you for helping us evolve the core!
