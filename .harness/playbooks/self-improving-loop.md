# Evolith Harness Self Improving Loop

> **Bilingual Navigation:** [Versión en Español](./self-improving-loop.es.md)

**Status:** Active Playbook  
**Owner:** Evolith Architecture Board  
**Last Updated:** 2026-07-03

## Purpose

Define the operational loop that lets Evolith agents improve the harness without depending on implicit LLM memory. The loop turns every meaningful run into traceable evidence, maps unresolved findings to the canonical gap board, and promotes repeated lessons into rules, skills, playbooks, schemas, or CI validators.

## Loop Contract

| Stage | Owner | Input | Output | Gate |
|---|---|---|---|---|
| Detect | Harness Orchestrator / `@winston` | Task, repo state, gap board, runtime evidence | Candidate findings and risks | Findings cite source paths |
| Context | Harness Orchestrator | Global rules, role, task, retrieved artifacts | Minimal context pack | Context sources are listed |
| Execute | Assigned BMAD role | Context pack and task contract | Changed files, report, or blocker | No bypass of Core/Tracker boundaries |
| Validate | `@qa` / `@devops` | Diff, checks, schemas, policies | Reproducible validation evidence | Relevant gates run or blocker recorded |
| Register | `@winston` / `@sm` | Findings and validation result | `GT-*` gap, closure record, or no-op rationale | Canonical tracker updated |
| Learn | `@architect` / `@docs` | Repeated finding or new standard | Rule, skill, playbook, schema, or docs update | EN/ES and validation parity kept |
| Complete | Harness Orchestrator | Evidence, next actions, residual risk | Progress audit JSONL record | Record matches progress audit schema |

## Context Budget

| Context Type | Budget | Rule |
|---|---:|---|
| Global rules | <= 2k tokens | Load only `AGENTS.md` and `.harness/rules/global-rules.md` unless a rule references another artifact. |
| Agent role | <= 1k tokens | Load only the assigned persona or skill contract. |
| Task context | <= 4k tokens | Read the smallest source files that prove the issue. |
| Retrieved docs | <= 8k tokens | Prefer links, indexes, and targeted excerpts over full corpus dumps. |
| Code excerpts | As needed | Read exact files and line ranges; avoid broad concatenation. |
| Output schema | Compact | Use JSON/JSONL for machine outputs and Markdown for human reasoning. |

## Required Artifacts

| Artifact | Purpose |
|---|---|
| [AGENTS.md](../../AGENTS.md) | Global repository contract for agents. |
| [Global Rules](../rules/global-rules.md) | Binding validation and governance rules. |
| [Agent Personas](../agents/agent-specs.md) | Role contracts and handoff expectations. |
| [Progress Audit Schema](../schemas/progress-audit.schema.json) | JSONL event contract for run evidence. |
| [Gap Tracking](../../reference/core/control-center/gaps/gap-tracking.md) | Single source of truth for unresolved work. |
| [Gap Closure Evidence](../../reference/core/control-center/evidence/gap-closure-evidence.json) | Machine-readable closure registry. |
| [Harness Manifest](../manifest.yaml) | Runtime-discoverable capability contract. |

## Progress Audit Record

Every approved loop run should emit one JSON object per line using `.harness/schemas/progress-audit.schema.json`. A run may be local, CI, scheduled, or runtime-triggered, but it must declare:

- run id, timestamp, agent, role, task, trigger, model/provider when known
- context sources, files read, files modified
- decisions, risks, validations, status, evidence, and next actions
- token and cost estimates when the execution environment can provide them

Use the MVP skill to create a snapshot:

```bash
node .harness/scripts/skills/self-improving-loop.mjs --task "audit harness drift" --agent @winston --dry-run
```

Append an approved audit record as JSONL:

```bash
node .harness/scripts/skills/self-improving-loop.mjs --task "audit harness drift" --agent @winston --append .harness/reports/progress-audit.jsonl
```

## Learning Rules

1. A repeated finding must become one of: `GT-*`, rule update, skill update, playbook update, schema update, or CI validator.
2. A gap may become `DONE` only when `gap-closure-evidence.json` records a real commit, evidence, validation commands, and dependency disposition.
3. A new architectural rule must keep Native and OPA parity.
4. A documentation or agent-contract change must keep EN/ES parity.
5. A runtime capability must stay behind ports/adapters and must not embed tenant/product lifecycle state in Evolith Core.
6. A model-specific behavior must be isolated behind a provider adapter or documented as a non-portable limitation.

## Validation

Run the smallest relevant set:

```bash
node .harness/scripts/ci/01-validate-docs.mjs
node .harness/scripts/ci/04-check-bilingual-parity.mjs
node .harness/scripts/generate-executive-summary.mjs --check
node .harness/scripts/ci/08-validate-tracking.mjs
```

`08-validate-tracking.mjs` is expected to fail until every historical `DONE` gap has semantic closure evidence; that residual work is tracked as `GT-417`.
