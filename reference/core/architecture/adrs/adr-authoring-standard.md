# ADR Authoring Standard

> **Bilingual Navigation:** [Versión en Español](./adr-authoring-standard.es.md)

**Status:** Accepted
**Owner:** Evolith Architecture Board
**Created:** 2026-06-10
**Applies to:** every ADR under `reference/core/architecture/adrs/` (core and platform categories)

---

## 1. Classification — Core vs Platform-Specific

Every ADR belongs to exactly one category, and the category determines both its location and its required depth:

| | **Core ADR** (`adrs/core/`) | **Platform ADR** (`adrs/nodejs/`, `adrs/dotnet/`, `adrs/android/`, …) |
|---|---|---|
| **Decides** | Transversal design decisions: patterns, artifacts, principles, rules, and practices that every satellite inherits regardless of stack | Technical decisions tied to a specific technology, product, or vendor |
| **May reference tools** | Only as *illustrative examples* of the principle | As the *subject* of the decision, with explicit comparison |
| **Must NOT** | Center the decision on comparing specific tools or vendors | Restate transversal principles (link the Core ADR instead) |
| **Litmus test** | If the chosen tool disappeared tomorrow, would the decision still stand? If yes → Core | If the decision *is* the tool/vendor choice → Platform |

A Core ADR that needs a concrete technology choice delegates it: the Core ADR states the agnostic rule, and a companion Platform ADR records the tool selection (e.g., Core "distributed caching strategy" → Platform "Redis as cache engine for Node.js runtime").

## 2. Required Sections — All ADRs

Every ADR must contain these sections. Accepted legacy aliases (left over from earlier templates) remain valid; new ADRs must use the canonical names.

| # | Canonical section | Content | Accepted legacy aliases |
|---|---|---|---|
| 1 | **Context and Problem** | The forces, constraints, and the problem requiring a decision | `Context`, `Problem Context`, `Problem Statement`, `Context and Problem Statement` |
| 2 | **Objective and Scope** | What the decision must achieve and the explicit boundaries of its applicability | `Scope`, `Objective` |
| 3 | **Options Considered** | Each viable option, including rejected ones, with an honest summary | `Alternatives Considered`, `Alternatives`, `Considered Options` |
| 4 | **Decision and Rationale** | The adopted option and why it won | `Decision`, `Rationale` (as companion) |
| 5 | **Evidence and Evaluation Criteria** | The criteria used to compare options and the evidence backing the choice (benchmarks, spikes, references, prior art) | `Evaluation Criteria`, `Architectural Drivers` |
| 6 | **Consequences, Risks, and Trade-offs** | Positive and negative consequences, accepted risks, explicit trade-offs | `Consequences` (+ `Positive`/`Negative` subsections), `Trade-offs`, `Risks` |
| 7 | **References** | Verifiable links: specs, documentation, issues, benchmarks | `Links` |
| 8 | **Related Decisions and Standards** | Links to related ADRs, Evolith standards, rulesets, and impacted artifacts | `Related ADRs`, `Relationships` |

Plus the standard header metadata: **Status** and **Date**.

**Status vocabulary (canonical).** The status value is a controlled enum, not prose. The only admissible values are those defined by the executable schema [`src/rulesets/schema/adr.schema.json`](../../../../src/rulesets/schema/adr.schema.json):

| Value | Meaning |
|---|---|
| `Proposed` | Recorded but not yet binding. Requires ratification before it becomes normative. |
| `Accepted` | Ratified and normative. |
| `Superseded` | Replaced by a later decision. Always qualify: `Superseded by ADR-XXXX`. |
| `Deprecated` | No longer applicable and not replaced. |

Rules:

- `Accepted` is the single ratification token. **`Approved` is retired** -- it was never in the schema enum, and the corpus was normalized to `Accepted` on 2026-07-19.
- **The enum value is written in English in both language editions.** Only the field *label* is translated (`**Status:**` in EN, `**Estado:**` in ES); the value stays `Accepted`, never `Aprobado` or `Aceptado`. This keeps the ES edition validatable against the same schema.
- Qualifying prose may follow the token on the same line (dates, ratification notes, links). The token must come first.
- Ratification provenance must be truthful. Record who ratified and when -- do not attribute a decision to an Architecture Board session that did not occur.

## 3. Additional Required Sections — Platform ADRs Only

Because platform ADRs bet on concrete technologies, they must also justify the bet's durability:

| # | Section | Content |
|---|---|---|
| 9 | **Technology Watch** | Trend analysis: market direction, maturity stage (e.g., Gartner-style emerging/growth/mature/declining), community adoption signals (downloads, stars, surveys), vendor/maintainer support model and SLA, and expected technological vigencia (how long the choice is defensible). |
| 10 | **Current Sources** | Dated, verifiable sources for the watch analysis (release notes, roadmaps, adoption surveys, security advisories). State the consultation date — stale sources invalidate the section. |

Platform ADRs must define a **review trigger**: the condition (date or event, e.g., "major version EOL announced") that forces re-evaluation.

## 4. File and Identity Rules

- **One ADR = one decision = one English-slug file pair**: `NNNN-english-slug.md` (EN) + `NNNN-english-slug.es.md` (ES). Spanish-slug filenames are prohibited (legacy duplicates were removed 2026-06-10).
- **IDs**: take the next free number across *all* categories. Historical per-category collisions (e.g., `core/0044` vs `nodejs/0044`) are grandfathered; when citing a colliding ID, always qualify with the category (`core/ADR-0044`).
- **Traceability**: an ADR enforced by a machine-readable rule must be referenced from the corresponding `rulesets/adr/*.rules.json` file, and vice versa.
- **Relocation**: moving an ADR between categories requires updating every inbound link in the same change and a note in the ADR header (`Relocated from <category> on <date>`).

## 5. Implementation Status Declaration

An `Accepted` ADR is a claim a reader will act on. Seven agentic ADRs (0081, 0082, 0086, 0088, 0089, 0092, 0094) sat at `Accepted` with no implementing code, which [GT-607](../../control-center/gaps/gap-reference-catalog.md#gt-607) registered as the fastest available way to lose a technical due diligence. The remedy is not to implement on demand — most of this corpus is normative standards published *for satellites* — it is to say so where a machine can read it.

Every ADR whose status is `Accepted` **must** carry a machine-readable directive next to its status:

```markdown
## Status

Accepted

<!-- implementation-status: none -->
```

```markdown
<!-- implementation-status: src/packages/agent-runtime/src/adapters/harness/harness-process.adapter.ts, src/rulesets/topologies/agentic-ai/agentic-ai.rules.json -->
```

Rules:

- **`none` is a legitimate, permanent answer** for a standard addressed to satellites. It is not a defect and must not be worked around by naming a file that merely mentions the topic.
- **Any other value is a comma-separated list of repo-relative paths**, and every path must exist. The declaration is deliberately falsifiable: an ADR that claims `foo.ts` implements it goes red the day `foo.ts` is deleted or moved.
- **The directive states a pointer, not a proof.** No automated check can decide that a file implements a decision, and this standard does not pretend otherwise — the same overreach [GT-576](../../control-center/gaps/gap-reference-catalog.md#gt-576) caught in the maturity assessment. What is enforced is that the claim exists, is specific, and still resolves.
- **EN and ES must declare the same thing.** A reader of either language gets the same answer.
- **Statuses other than `Accepted`** (`Proposed`, `Superseded`, …) carry no implementation claim and need no directive.
- Prose alongside the directive is encouraged — the directive is for the guard, the blockquote is for the human.

ADRs predating this convention are held in an explicit baseline that may only shrink; new and modified ADRs are not eligible for it.

## 6. Compliance

- New ADRs: full compliance with this standard is a Design Baseline gate criterion.
- Existing ADRs: structural sections were normalized on 2026-06-10; content backfill of sections 2, 3, 5, 8 (and 9–10 for platform ADRs) is tracked as [GT-20](../../control-center/gaps/gap-reference-catalog.md#gt-20). Placement review of tool-centric Core ADRs is tracked as [GT-21](../../control-center/gaps/gap-reference-catalog.md#gt-21).
- Canonical template: [ADR Template](../../sdlc/04-artifact-templates/adr-template.md).

---
[Back to ADR Registry](./README.md)
