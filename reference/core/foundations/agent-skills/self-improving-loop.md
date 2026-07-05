# Self Improving Loop

> **Bilingual Navigation:** [Versión en Español](./self-improving-loop.es.md)

## Purpose

Operate the Evolith harness feedback loop: detect drift, load minimal context, execute the assigned role, validate evidence, register gaps or closure records, and promote repeated lessons into durable rules, skills, playbooks, schemas, or CI checks.

## Contract

| Field | Value |
|-------|-------|
| ID | `self-improving-loop` |
| Owner | `@winston` |
| Version | `1.0.0` |
| Inputs | `AGENTS.md`, `.harness/rules/global-rules.md`, `.harness/playbooks/self-improving-loop.md`, gap board, closure registry, validation outputs |
| Outputs | Progress audit JSON record, prioritized next actions, gap/closure update recommendation |

## Algorithm

1. Read the global rules, assigned agent role, task request, and canonical gap board.
2. Build a minimal context pack that cites every source loaded during the run.
3. Execute or delegate the task through the appropriate BMAD role.
4. Run the smallest relevant validation gates and record pass/fail/blocker evidence.
5. Convert unresolved findings into `GT-*` entries or update closure evidence when criteria are satisfied.
6. Promote repeated findings into a rule, skill, playbook, schema, or CI validator.
7. Emit one progress-audit record using `.harness/schemas/progress-audit.schema.json`.

## Usage

```bash
node .harness/scripts/skills/self-improving-loop.mjs --task "audit harness drift" --agent @winston --dry-run
node .harness/scripts/skills/self-improving-loop.mjs --task "audit harness drift" --agent @winston --append .harness/reports/progress-audit.jsonl
```

## Output Format

The script prints a JSON object compatible with `.harness/schemas/progress-audit.schema.json`. When `--append` is used without `--dry-run`, it appends the compact JSON object as one JSONL line to the selected audit file.
