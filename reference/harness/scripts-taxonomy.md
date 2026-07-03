# Evolith Scripts Taxonomy

> **Bilingual navigation:** [Versión en Español](./scripts-taxonomy.es.md)

**Status:** Active Reference Document  
**Owner:** Evolith Architecture Board  
**Last Updated:** 2026-07-03

---

## 1. Purpose

This document catalogs every executable script in the `.harness/` tree, classifies its output type, and documents the relationship between entry points, playbooks, and CI hooks. It serves as the canonical reference for "which script do I run for what?"

---

## 2. Classification

Each script is classified by:

| Attribute | Values |
|---|---|
| **Type** | `executable` — produces output directly (structured report, HTML, SVG); `prompt` — prints an LLM prompt for a persona (Winston, etc.) |
| **Scope** | `entry` — user-facing entry point; `playbook` — reusable engine called by entry points; `ci` — runs in pre-commit/pre-push hooks; `utility` — helper/one-shot |
| **Output** | JSON, Markdown, HTML, SVG, plain text, or prompt block |

---

## 3. Entry Points

User-facing entry points under `.harness/scripts/`. These are the scripts you run from the command line.

| Script | Type | Delegates To | Purpose |
|---|---|---|---|
| `run-evolith-audit.mjs` | `prompt` | `.harness/playbooks/winston-audit-playbook.md` | Prints the Winston architectural audit prompt for copy-paste into an LLM context |
| `run-evolith-audit.mjs --bmad` | `prompt` | same playbook (BMAD section) | Prints the BMAD Agent Evolution prompt |
| `run-evolith-audit.mjs --all` | `prompt` | same playbook (both sections) | Prints both prompts sequentially |
| `run-evolith-audit.mjs --es` | `prompt` | `.harness/playbooks/winston-audit-playbook.es.md` | Spanish version of the architectural audit prompt |
| `run-evolith-topology.mjs` | `executable` | `.harness/playbooks/topology-compliance-audit.mjs` | Evaluates structural parity across all topology directories against the exemplar |
| `run-evolith-topology.mjs --markdown` | `executable` | same playbook | Same audit, formatted as human-readable Markdown |
| `run-evolith-deep.mjs` | `executable` | `.harness/playbooks/sdlc-deep-audit.mjs` | Evaluates Evolith Core against the 8-dimensional executable SDLC vision (JSON) |
| `run-evolith-deep.mjs --markdown` | `executable` | same playbook | Same 8-dimension audit, formatted as Markdown report |
| `skills/self-improving-loop.mjs` | `executable` | `.harness/playbooks/self-improving-loop.md` | Emits a progress-audit snapshot for harness self-improvement runs |
| `run-winston-audit.mjs` | `alias` | delegates to the three above | DEPRECATED — compatibility alias that detects `--topology`, `--deep`, or defaults to `run-evolith-audit.mjs` |

### Usage examples

```bash
node .harness/scripts/run-evolith-topology.mjs
node .harness/scripts/run-evolith-topology.mjs --markdown
node .harness/scripts/run-evolith-deep.mjs
node .harness/scripts/run-evolith-deep.mjs --markdown
node .harness/scripts/run-evolith-audit.mjs
node .harness/scripts/run-evolith-audit.mjs --es
node .harness/scripts/run-evolith-audit.mjs --bmad
node .harness/scripts/run-evolith-audit.mjs --all
node .harness/scripts/skills/self-improving-loop.mjs --task "audit harness drift" --dry-run
```

---

## 4. Playbooks

Reusable audit logic under `.harness/playbooks/`. These are called by entry points, never directly by users.

| Playbook | Output | Used By | Purpose |
|---|---|---|---|
| `topology-compliance-audit.mjs` | JSON / Markdown | `run-evolith-topology.mjs` | Checks every topology directory for structural parity with the agentic-ai exemplar |
| `sdlc-deep-audit.mjs` | JSON / Markdown | `run-evolith-deep.mjs` | 8-dimension evaluation of Evolith Core against the executable SDLC vision |
| `winston-audit-playbook.md` | LLM prompt block | `run-evolith-audit.mjs` | The Winston persona prompt for architectural analysis |
| `winston-audit-playbook.es.md` | LLM prompt block | `run-evolith-audit.mjs --es` | Spanish version of the Winston architectural analysis prompt |
| `self-improving-loop.md` | Markdown / JSONL schema reference | `skills/self-improving-loop.mjs` | Operational detect-context-execute-validate-register-learn feedback loop |

---

## 5. CI Hooks

Scripts triggered automatically by git hooks. These are not user-facing.

| Hook | Script | What It Does |
|---|---|---|
| `.husky/pre-commit` | `generate-executive-summary.mjs` | Refreshes EN/ES executive governance summary from canonical gap/maturity evidence |
| `.husky/pre-commit` | `ci-runner.mjs` | Runs numbered CI validation scripts (docs validation, bilingual parity, stale-summary check) |
| `.husky/pre-push` | `02-optimize-repo.mjs` | Repository optimization |
| `.husky/pre-push` | `sync-project-board.mjs` | Bidirectional gap tracking synchronization |
| `.husky/pre-push` | `generate-executive-summary.mjs` | Blocks push if executive summary changed outside the current commit |

---

## 6. CI Validation Scripts

Numbered scripts under `.harness/scripts/ci/` triggered by `ci-runner.mjs`.

| Script | Checks |
|---|---|
| `01-validate-docs.mjs` | Links, anchors, encoding, Mermaid syntax |
| `01-validate-docs.mjs --render-mermaid` | Renders Mermaid diagrams to SVG for visual validation |
| `04-check-bilingual-parity.mjs` | EN/ES pairs have identical `##` and `###` header counts |

---

## 7. Utility / One-Shot Scripts

| Script | Purpose |
|---|---|
| `bilingual-coverage.mjs` | Reports which files lack bilingual counterparts |
| `coverage-dashboard.mjs` | Generates visual HTML/MD coverage report by area |
| `generate-executive-summary.mjs` | Generates the bilingual executive governance summary |
| `generate-es-skeleton.mjs <file.md>` | Creates ES skeleton from EN file (`--dry-run` flag) |
| `cleanup-markdown-encoding.py` | Sanitizes UTF-8 encoding issues in Markdown files |
| `skills/self-improving-loop.mjs` | Emits a progress-audit JSON record and can append approved JSONL audit events |

---

## 8. Design Rules

### Entry point rules

1. **Name pattern**: `run-evolith-<purpose>.mjs` where `<purpose>` is a single noun or short compound (`topology`, `deep`, `audit`).
2. **Single responsibility**: Each entry point does one thing. If a script supports multiple modes via `--flags`, extract each mode into its own entry point when the logic diverges significantly.
3. **Alias lifecycle**: Deprecated aliases (`run-winston-audit.mjs`) emit a warning to stderr and delegate. Remove after one minor version.

### Playbook rules

1. **Name pattern**: `<domain>-<action>.mjs` (e.g., `topology-compliance-audit.mjs`).
2. **Idempotent**: Same input always produces same output.
3. **Markdown flag**: If the playbook supports both JSON and Markdown output, use `--markdown` to toggle.

### CI hook rules

1. **Fast exit**: CI scripts must complete in under 5 seconds or delegate to background jobs.
2. **Non-blocking warnings**: Non-critical findings should warn, not fail.
