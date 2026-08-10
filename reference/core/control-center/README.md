# Control Center

> **Bilingual Navigation:** [Versión en Español](./README.es.md)
>
> **Location:** [Core Concepts](../README.md) › Control Center

> Tracking, assessment, and improvement observability.

| Area | Entry point | Content |
|------|------|---------|
| **Gaps** | [`gaps/`](./gaps/gap-tracking.md) | Gap tracking board · [Reference catalog](./gaps/gap-reference-catalog.md) |
| **Maturity Reports** | [`maturity-reports/`](./maturity-reports/maturity-assessment.md) | Maturity assessment · [Executive summary](./maturity-reports/executive-summary.md) · [Inventory](./maturity-reports/inventory-summary.md) |
| **Audits** | [`audits/`](./audits/architectural-directives.md) | Architectural directives · [Deep coherence analysis](./audits/deep-coherence-analysis-2026-06-16.md) |
| **Opportunities** | [`opportunities/`](./opportunities/README.md) | Improvement proposals, upstream proposals |
| **Evidence** | [`evidence/`](./evidence/gap-closure-evidence-standard.md) | Gap closure evidence standard, normative evidence records |
| **Taxonomy** | [`taxonomy/`](./taxonomy/MASTER_INDEX.md) | Master index · [Repository taxonomy](./taxonomy/repository-taxonomy.md) · [E2E traceability](./taxonomy/e2e-traceability-matrix.md) |

## Debt economics: principal and interest

Every board row carries a criticality (`P0`–`P3`) and a complexity (`XS`–`XL`). Neither of those is a cost, so the ordering of the backlog is an opinion. The SEI technical-debt item model (Kruchten, Nord, Ozkaya, *Managing Technical Debt*) names the two fields that turn it into an economic decision:

- **Principal** — what it costs to repay the item, once.
- **Interest** — what it costs to keep *not* repaying it, per period.

Principal alone ranks nothing: it is an estimate of work, which `Complexity` already approximates. Interest is the discriminator — a 40-hour repayment that costs 1 hour a month to carry loses to a 4-hour repayment that costs 8.

### Units

An unlabelled number is not a measurement, so the unit is part of the format:

| Field | Unit | Canonical form | Explicit form |
|---|---|---|---|
| `Principal` | engineer-hours (one person's working hours, not calendar time) | band `XS`…`XL` | `12h`, `3d` (1 d = 8 h) |
| `Interest` | engineer-hours per **30-day period** | band `NONE`…`SEVERE` | `4h/30d` |
| `Basis` | — (a method, not a magnitude) | `atdm`, `sqale` or `estimate` | — |

The interest period is fixed at 30 days and is never "per sprint": sprint length is a local convention, and two rows measured against different sprints are not comparable. A bare `4h` is rejected as an interest — a rate without a period is just a second principal.

`Basis` records how the figure was obtained, because "derived" and "guessed" cannot be told apart afterwards: `atdm` is the OMG Automated Technical Debt Measure V2 v1.0 (2024-08), whose repair effort is derived from ISO/IEC 5055 weakness occurrences; `sqale` is the SQALE remediation-cost model behind the technical-debt ratio; `estimate` is a human estimate, recorded as such.

### Bands

| Band | Principal (engineer-hours) | Band | Interest (h / 30 d) |
|---|---|---|---|
| `XS` | 1–2 | `NONE` | 0 |
| `S` | 2–8 | `LOW` | 0.5–2 |
| `M` | 8–24 | `MED` | 2–8 |
| `L` | 24–80 | `HIGH` | 8–24 |
| `XL` | 80–240 | `SEVERE` | 24–80 |

A point estimate on an un-started item is false precision, so a band is the normal form. The explicit form is for figures that were computed rather than judged: an ATDM-derived principal is a real number and should not be flattened into a band.

### Where the fields go

One field line inside the row's `#### GT-NNN` section of the [gap reference catalog](./gaps/gap-reference-catalog.md), next to `- **Component:**`:

```markdown
- **Principal:** `M` · **Interest:** `MED` · **Basis:** `estimate`
```

The English catalog is canonical. The Spanish catalog may mirror the line (`- **Principal:** … · **Interés:** … · **Base:** …`); a mirror that disagrees with the English one is a defect, while an absent mirror is not — a number does not need translating. The board table may additionally carry `Principal` / `Interest` columns, and if it does they must agree with the catalog: two figures for one debt item are worse than none. Only OPEN rows need economics — a closed row's cost is history, not a decision.

### Measuring the gap

`node .harness/scripts/board/report-debt-economics.mjs` reports how many open rows carry both fields **out of how many open rows exist**, so the gap is measurable before it is filled. `--strict` turns the remaining gap into a non-zero exit and is the form the tracking guard calls once the back-fill has landed; `--json` emits the same report machine-readably; `--emit-schema` prints the JSON Schema kept at `.harness/scripts/board/debt-economics.schema.json` (generated from the module — do not hand-edit).

As measured on 2026-08-01 by that command: **19 of 19 open rows** carry a principal and an interest. All current figures use `Basis: estimate`: principal follows the row's declared complexity band, interest follows its criticality band, and the unit is engineer-hours per 30-day period. The denominator moves as rows open and close — read it from the command, never from this sentence.

### Which rows ATDM can price, and which need a person

The OMG **Automated Technical Debt Measure** computes one thing: `debt = Σ occurrences(w) × repairEffortHours(w)`, where `w` ranges over the 138 ISO/IEC 5055 structural weaknesses and the repair times come from CISQ's developer survey. Every term is about **source code that already contains a weakness**. A row that is a decision to reverse, nineteen documents in the wrong language slot, or a milestone is not a weakness occurrence, and no repair-time survey prices it.

So the honest question is not "what does ATDM say this row costs" but "is an ATDM figure computable for this row at all". `node .harness/scripts/board/report-atdm-principal.mjs` answers it per row and publishes its denominator. It needs four inputs:

| Input | Where it comes from | Status |
|---|---|---|
| rule linkage | a `- **Rules:** \`HXA-01\`, \`SEC-INJ-01\`` line in the row's catalog section | **declared by a human**; a rule merely mentioned in the prose is reported as a *candidate* and never priced |
| rule → weakness + analyser | [`src/rulesets/standards/iso-5055-mapping.json`](../../../src/rulesets/standards/iso-5055-mapping.json) (GT-598) | present, 412 rules |
| occurrence counts | an analyser run scoped to the row (`--occurrences`) | absent — no analyser adapter is integrated yet |
| repair-effort table | the OMG specification (`--effort-table`) | absent, and deliberately not vendored: the figures are the substance of a copyrighted spec, and a table of invented hours wearing an `atdm` label would be worse than no table |

Both input schemas are printed by `--emit-schema`. There is **no fallback constant** anywhere in the deriver: a missing input blocks the row and names itself, because a defaulted repair time is an `estimate` wearing the `atdm` badge.

As measured on 2026-08-01: **0 of 19 open rows are ATDM-derivable**, all 19 for the same reason — no row declares a `- **Rules:**` linkage that can be priced against occurrence counts and an effort table. **All 19 open rows therefore carry a human estimate.**

One thing ATDM never supplies, on any row: an **interest**. It is a repair-cost model with no carrying-cost term, so the interest is a human judgement even where the principal becomes derivable.

### The requirement is armed forward-only

`node .harness/scripts/board/new-row-economics-guard.mjs` rejects an open row that carries no principal and no interest — but only for rows opened after [`debt-economics-baseline.json`](../../../.harness/scripts/board/debt-economics-baseline.json) was recorded. The baseline remains as a forward-only detector for new rows, but the current board is no longer relying on the exemption: every currently open row is priced.

That list only ever shrinks, and its size is pinned by a test so an edit that grandfathers a *new* row cannot pass unnoticed. Being exempt from stating a number is not an exemption from stating it correctly: a malformed figure is reported on any row, open or closed, listed or not.

Run the tests with `node --test .harness/scripts/board/*.test.mjs`.

This is enforced in CI through two layers: `08-validate-tracking.mjs` fails when any open row lacks valid economics, and the governance self-test job runs the board economics suites, including the new-row negative fixture.
