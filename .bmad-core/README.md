# BMAD Core — Evolith Agent Framework

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

**Purpose:** Agent definitions, workflows, scripts, and tooling for the BMAD Method operating on Evolith Core.

## Structure

`.bmad-core/` is the **orchestration** layer — engine, workflows, and runtime state. Agent **definitions** (personas, skills, checklists) are NOT here: they are foundational and live in [`reference/core/foundations/agent-skills/`](../reference/core/foundations/agent-skills/) (see [repository taxonomy](../reference/core/control-center/taxonomy/migration-plan.md), Commit 2). Operational agent contracts live in [`.harness/agents/`](../.harness/agents/).

| Directory | Contents |
|-----------|----------|
| `engine/` | BMAD orchestration engine (workflow parser, step executor, state machine, handoff enforcer) |
| `workflows/` | Workflow definitions (greenfield development, governance gap closure, QA suite) |
| `state/` | Runtime workflow and artifact state |
| `scripts/` | BMAD-specific utility scripts (encoding cleanup) |

## First Read

Every agent **must** read [AGENTS.md](./AGENTS.md) before operating on this repository.

## Key References

- [Global Rules](../.harness/rules/global-rules.md)
- [Gap Tracking Board](../reference/core/control-center/gaps/gap-tracking.md)
- [Gap Reference Catalog](../reference/core/control-center/gaps/gap-reference-catalog.md)
- [Architecture Agents](./AGENTS.md)

---

*See [BMAD Method](https://github.com/beyondnetcode/bmad-method) for method details.*
