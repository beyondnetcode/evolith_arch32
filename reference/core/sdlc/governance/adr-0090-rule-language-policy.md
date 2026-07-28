# ADR 0090 – Language rule for machine-readable rulesets

**Status:** Accepted

## Context
- Rulesets (JSON files) carry the governance validation logic that automated tooling consumes directly — the CLI, pipelines, OPA and the rest.
- Keeping duplicate versions of the same ruleset in different languages causes:
  - Drift, inevitably.
  - More maintenance for no added meaning.
  - The risk that one version goes stale and produces false positives or false negatives.

## Decision
1. **English is canonical** – each ruleset's JSON file is the single, definitive artifact, and it is written in English.
2. **Exempt from the bilingual rule** – no `*.es.json` files are created or maintained.
3. **Bilingual documentation** – every ruleset must have a README, or a section in the catalog, describing it in English and Spanish. The *structural definition* remains English-only.
4. **Validation** – the pre-commit scripts (`check-orphan-bilingual.mjs`, `validate-docs.mjs`) are configured to ignore `*.json` files when checking language parity.

## Consequences
- Less technical debt: machine artifacts are not translated at all.
- Teams read the bilingual documentation to understand a rule's intent.
- A rule that must differ by region becomes a new ruleset with its own identifier, never a translated variant of an existing one.

## References
- GT-36 – language coverage policy for machine-readable rules.
- `.harness/scripts/check-orphan-bilingual.mjs` – updated to exclude `*.json`.
- `reference/core/control-center/gaps/gap-tracking.md` – recorded as **DONE**.
