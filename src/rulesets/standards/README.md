# Standards mapping — ISO/IEC 5055:2021

This directory answers one question for the Evolith ruleset corpus: **which of our rules did
somebody already standardise, and which ones do we genuinely have to author ourselves?**

The corpus was 100% proprietary. That is not a virtue — it means every coverage number was
self-asserted, and every unevaluated rule was being costed as bespoke engineering. ISO/IEC 5055:2021
publishes 138 structural weaknesses, each of them a CWE identifier, across four measures. A rule whose
predicate *is* one of those weaknesses does not need a handler written; it needs an adapter to an
analyser that already decides it — and its coverage becomes countable by an auditor who does not have
to trust us.

## Artifacts

| File | What it is |
|---|---|
| `iso-5055-weaknesses.json` | The 138 CWE identifiers of ISO/IEC 5055, split per measure, with provenance. |
| `iso-5055-mapping.json` | One row per corpus rule: CWE mapping (or an explicit "no equivalent" with a reason), analyser adoptability, and the rule's native evaluability class. |
| `iso-5055-mapping.csv` | The same table, flat, for spreadsheets and auditors. |
| `native-evaluability-snapshot.json` | Captured per-rule evaluability class from Core's triage, so the backlog arithmetic below is scoped to the real backlog. |
| `build-iso-5055-mapping.mjs` | The generator. `--check` fails when the table has fallen behind the corpus. |
| `iso-5055-mapping.test.mjs` | The guard. `node --test src/rulesets/standards/iso-5055-mapping.test.mjs`. |

No text of ISO/IEC 5055 or ISO/IEC 25010 is reproduced here. Only CWE identifiers, MITRE CWE names and
measure membership are recorded.

## Provenance of the 138

The weakness list was extracted programmatically from Tables 1–4 of the **OMG Automated Technical Debt
Measure, Version 2** (OMG document `ptc/23-09-04`), which enumerates the same weaknesses. The union of
the four tables is exactly 138, matching the count CISQ publishes: Security 74, Reliability 74,
Performance Efficiency 18, Maintainability 31 — the overlap between Security and Reliability is what
makes the union smaller than the sum. The extraction date and method are recorded in the JSON.

## Result

Against **381 rules** in 167 ruleset files:

| Measure | Count | Share |
|---|---|---|
| Rules mapped to an ISO/IEC 5055 weakness | 37 | 9.7% |
| — of which the mapping is direct | 8 | |
| — of which the mapping is a partial / proxy | 29 | |
| Rules with no international equivalent (each with a stated reason) | 344 | 90.3% |
| Rules an existing analyser could decide outright | 42 | 11.0% |
| Rules an analyser could decide partially | 23 | 6.0% |

**The adopted fraction is 9.7% of the corpus.** That is a real result and it is smaller than the gap's
premise implied, for a structural reason: ISO/IEC 5055 measures the internal structure of source code,
and 300 of our 381 rules are not about source structure at all. They are ADR conformance (155),
topology contracts (66), governance invariants (51) and development process (34). No international
standard models "did you honour ADR-0092", and none ever will.

Where the standard does apply, it applies well: of the 26 rules classified `code-structure`, 18 map
and 13 are analyser-decidable.

## Re-scoping the handler backlog

The gap statement sized the payoff against "~240 handlers to write". **That figure is already
retired.** GT-595 triaged the corpus and the real, decidable-from-the-repository backlog is **60
rules** — the `unimplemented-native` class. The other 180 are 129 documentation-only generator
placeholders, 14 underspecified rules with no authored check, 20 that need an external system and 17
that need a running one.

Folding this mapping onto that class is the number that matters:

| Of the 60-rule handler backlog | Count |
|---|---|
| Decidable today by an off-the-shelf analyser | 9 |
| Decidable partially (analyser gives a necessary-but-not-sufficient signal) | 8 |
| Genuinely has to be authored | 43 |

The 9 are `HXA-01`…`HXA-04` (layer structure — dependency-cruiser or ArchUnit), `GIT-08` (commitlint),
`SEC-INJ-01`, `SEC-PATH-01`, `SEC-PATH-02` (CodeQL/Semgrep injection and path-traversal queries) and
`SEC-TIMING-01` (timing-safe comparison). The 8 partials are listed in
`handlerBacklog.byEvaluabilityClass` in the mapping JSON.

So adoption is worth **15% of the backlog outright, 28% including partials** — 17 of 60 rules that do
not need bespoke handlers. Not the order-of-magnitude the gap hoped for, but a concrete, named
reduction, and it points the security rules at analysers that are better than anything we would write.

## Companion taxonomy: ISO/IEC 25010:2023

ISO/IEC 25010:2023 (2nd edition, superseding :2011) defines **nine** top-level product-quality
characteristics: Functional suitability, Performance efficiency, Compatibility, **Interaction
capability** (formerly Usability), Reliability, Security, Maintainability, **Flexibility** (formerly
Portability) and **Safety** (new). ISO/IEC 5055 automates four of them — Reliability, Security,
Performance efficiency and Maintainability. Any mapping to the 2011 eight-characteristic model is
stale, and `iso-5055-mapping.test.mjs` fails the build if anything in this directory reintroduces it.

## Reading a row

`analyser.adoptable` is a claim about the *shape* of the rule, not a verified integration:

- `yes` — an off-the-shelf analyser already decides this predicate; the work is an adapter.
- `partial` — an analyser yields a necessary-but-not-sufficient signal; the rest is ours.
- `no` — the predicate is repository- or product-specific and must be authored.

`nativeEvaluability` is copied from the Core triage snapshot. The authority for it is
`src/packages/core-domain/src/application/validators/rule-evaluability.ts` and its pinned spec; if the
counts there move, the snapshot here is stale and must be recaptured.
