# Evidence Rulesets

> **Bilingual navigation:** [Versión en Español](./README.es.md)

Rules for traceable evidence used by SDLC gates, audits, release reviews, and executive reporting.

## Rulesets

| Ruleset | Purpose |
|---|---|
| [Evidence Manifest](./evidence-manifest.rules.json) | Defines the minimum evidence metadata needed to prove gate, rule, or waiver compliance. |
| [Probabilistic Evidence Admissibility](./probabilistic-evidence-admissibility.rules.json) | Decides whether a PROBABILISTIC quality signal (ADR-0111) may contribute to a blocking verdict: it may only while its measured true-positive and true-negative rates clear the declared floors and the measurement is still fresh. Absent calibration means cannot-block, never "assume good". |

