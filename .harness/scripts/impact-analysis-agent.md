# Evolith Core Impact Analysis & Synchronization Agent

> **Navegación bilingüe:** [English version](./impact-analysis-agent.es.md)

The mandatory machine-readable governance synchronization mechanism for Evolith Core.

---

## Overview

The Impact Analysis & Synchronization Agent executes automatically after any relevant change to Evolith Core. It detects, classifies, and analyzes the scope of changes across all Evolith components, then executes targeted synchronization to maintain coherence.

**Triggered by:** `.husky/pre-commit` hook (automatic on every commit)

**Manual invocation:**
```bash
node .harness/scripts/ci/06-impact-analysis-synchronizer.mjs [options]
```

---

## Change Categories

| Category | Pattern | Impact Zones |
|---|---|---|
| **ADR** | `/adrs/*/ADR-*.md` | adrs, rulesets, documentation, navigation |
| **DOCS** | `/reference/**/*.md` | documentation, navigation, bilingual |
| **RULES** | `/reference/governance/standards/*.md`, `/rulesets/*.rules.json` | rulesets, harness, documentation |
| **ARCH** | `/reference/architecture/blueprints/*.md` | adrs, rulesets, documentation |
| **HARNESS** | `/.harness/**/*.{mjs,md,json}`, `/.husky/*` | harness, rulesets, validators |
| **SCHEMA** | `/rulesets/schema/*.json`, `/.harness/schemas/*.json` | rulesets, validators, harness |
| **TEMPLATE** | `/sdlc/04-artifact-templates/*.md` | templates, documentation, navigation |
| **NAVIGATION** | `/navigation/*.md`, `/README.md` | navigation, documentation |

---

## Impact Zones

Each change category cascades to multiple impact zones:

- **adrs** — ADR registry and indexes
- **rulesets** — Machine-readable rules and schemas
- **documentation** — Technical documentation
- **navigation** — Navigation indexes and MASTER_INDEX
- **harness** — Scripts, agents, and CI/CD configuration
- **templates** — Artifact templates
- **validators** — Validation scripts and schemas
- **bilingual** — EN/ES documentation pairs

---

## Synchronization Actions

| Action | Description |
|---|---|
| **index_update** | Updates ADR or ruleset index when new artifact is created |
| **bilingual_sync** | Validates bilingual counterpart exists and is consistent |
| **schema_update** | Validates JSON schema syntax and structural integrity |
| **navigation_sync** | Validates links in navigation files; refreshes MASTER_INDEX |
| **cross_ref_sync** | Updates cross-references (e.g., ADR matrix) |
| **rule_propagation** | Propagates rule changes to dependent components |
| **template_validation** | Validates artifact template structure |

---

## Quality Gates

The agent enforces these rules:

| Rule | Behavior |
|---|---|
| **No orphan bilingual files** | EN without ES → blocks commit |
| **Bilingual parity required** | Spanish creation without EN counterpart → warning |
| **Schema syntax validated** | Invalid JSON in `.rules.json` or `.schema.json` → error |
| **Navigation links validated** | Broken relative links → error |
| **HARNESS changes flagged** | Changes to `.harness/` or `.husky/` → risk warning |
| **ADR deletion requires board approval** | Deleted ADR → manual action required |

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Analysis passed, no critical risks |
| `1` | Synchronization failures or critical risks |

---

## Options

| Option | Description |
|---|---|
| `--staged` | Analyze only staged changes (default for pre-commit) |
| `--working-tree` | Analyze working tree (unstaged) changes |
| `--all` | Analyze all changes since last commit |
| `--dry-run` | Report only, no changes applied |
| `--verbose` | Detailed output with per-change analysis |
| `--report` | Save JSON + TXT report to `.harness/reports/` |
| `--fail-on-risk` | Exit with error if any risks identified |
| `--help` | Show help message |

---

## Report Output

Reports are saved to `.harness/reports/` with format:
- `impact-analysis-{timestamp}.json` — Machine-readable record
- `impact-analysis-{timestamp}.txt` — Human-readable summary

Report schema: `.harness/schemas/impact-analysis.schema.json`

---

## Idempotency

The agent is idempotent: running with the same inputs produces no duplicate changes. Repeating the analysis on the same set of changes will:
- Return identical synchronization results
- Mark the run as `idempotent: true` in the report
- Make no file modifications

---

## Manual Actions

Some situations require manual intervention:

| Scenario | Required Action |
|---|---|
| ADR deletion | Architecture Board review and approval |
| Bilingual counterpart mismatch | Manual sync of EN/ES content |
| Schema structural error | Manual fix of JSON structure |
| Broken navigation links | Manual update of link targets |

---

## Related Documents

| Document | Purpose |
|---|---|
| [AGENTS.md](../../AGENTS.md) | Agent rules and conventions |
| [Global Rules](../../.harness/rules/global-rules.md) | Harness validation rules |
| [Impact Analysis Schema](../../.harness/schemas/impact-analysis.schema.json) | JSON Schema for analysis records |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | Impact Analysis Agent</sub>
</div>