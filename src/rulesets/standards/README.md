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
| `native-evaluability-snapshot.json` | Per-rule evaluability class, **generated** from Core's live triage by `rule-corpus-triage.spec.ts`, which pins it byte-for-byte. Never hand-edit it: recapture with `UPDATE_EVALUABILITY_SNAPSHOT=1 npx jest src/application/validators/rule-corpus-triage.spec.ts` from `src/packages/core-domain`. |
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

Against **388 rules** in 174 ruleset files:

| Measure | Count | Share |
|---|---|---|
| Rules mapped to an ISO/IEC 5055 weakness | 37 | 9.5% |
| — of which the mapping is direct | 8 | |
| — of which the mapping is a partial / proxy | 29 | |
| Rules with no international equivalent (each with a stated reason) | 351 | 90.5% |
| Rules an existing analyser could decide outright | 42 | 10.8% |
| Rules an analyser could decide partially | 23 | 5.9% |

**The adopted fraction is 9.5% of the corpus.** That is a real result and it is smaller than the gap's
premise implied, for a structural reason: ISO/IEC 5055 measures the internal structure of source code,
and 313 of our 388 rules are not about source structure at all. They are ADR conformance (162),
topology contracts (66), governance invariants (51) and development process (34). No international
standard models "did you honour ADR-0092", and none ever will.

Where the standard does apply, it applies well: of the 26 rules classified `code-structure`, 18 map
and 13 are analyser-decidable.

## Re-scoping the handler backlog

The gap statement sized the payoff against "~240 handlers to write". **That figure is already
retired.** GT-595 triaged the corpus and the real, decidable-from-the-repository backlog is **48
rules** — the `unimplemented-native` class. The other 338 are 136 documentation-only generator
placeholders, 14 underspecified rules with no authored check, 20 that need an external system, 17 that
need a running one, and 151 a native handler already evaluates.

Folding this mapping onto that class is the number that matters:

| Of the 48-rule handler backlog | Count |
|---|---|
| Decidable today by an off-the-shelf analyser | 5 |
| Decidable partially (analyser gives a necessary-but-not-sufficient signal) | 5 |
| Genuinely has to be authored | 38 |

The 5 are `HXA-03` (layer structure — dependency-cruiser or ArchUnit), `SEC-INJ-01`, `SEC-PATH-01`,
`SEC-PATH-02` (CodeQL/Semgrep injection and path-traversal queries) and `SEC-TIMING-01` (timing-safe
comparison). The 5 partials are listed in `handlerBacklog.byEvaluabilityClass` in the mapping JSON.

So adoption is worth **10% of the backlog outright, 21% including partials** — 10 of 48 rules that do
not need bespoke handlers. Not the order-of-magnitude the gap hoped for, but a concrete, named
reduction, and it points the security rules at analysers that are better than anything we would write.

The backlog shrank from 60 to 48 because handlers were *written*, not because the denominator was
re-cut: `HXA-01/02/04/05` (GT-632) and `GIT-08` with seven other config-shaped rules (GT-595) all moved
into `native-handler`, which is also why four of the nine names above have left this list.

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
