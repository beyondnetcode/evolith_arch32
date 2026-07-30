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
| `native-evaluability-snapshot.json` | Captured per-rule evaluability class from Core's triage, so the backlog arithmetic below is scoped to the real backlog. Generated — do not edit by hand. |
| `capture-native-evaluability-snapshot.mjs` | The capture. Runs Core's real triage through `ts-node`; `--check` fails when the committed snapshot is no longer what Core computes. |
| `build-iso-5055-mapping.mjs` | The generator. `--check` fails when the table has fallen behind the corpus. |
| `iso-5055-mapping.test.mjs` | The guard. `node --test src/rulesets/standards/iso-5055-mapping.test.mjs`. |

### Regenerating, in order

```
node src/rulesets/standards/capture-native-evaluability-snapshot.mjs   # 1. snapshot
node src/rulesets/standards/build-iso-5055-mapping.mjs                 # 2. mapping
```

The order is not a preference. The generator stamps `nativeEvaluability` onto every row of the mapping
from the snapshot, so rebuilding first launders a stale classification into a 391-row artifact and
overstates the handler backlog by however many rules Core has closed since the last capture.

No text of ISO/IEC 5055 or ISO/IEC 25010 is reproduced here. Only CWE identifiers, MITRE CWE names and
measure membership are recorded.

## Provenance of the 138

The weakness list was extracted programmatically from Tables 1–4 of the **OMG Automated Technical Debt
Measure, Version 2** (OMG document `ptc/23-09-04`), which enumerates the same weaknesses. The union of
the four tables is exactly 138, matching the count CISQ publishes: Security 74, Reliability 74,
Performance Efficiency 18, Maintainability 31 — the overlap between Security and Reliability is what
makes the union smaller than the sum. The extraction date and method are recorded in the JSON.

## Result

Against **391 rules** in 175 ruleset files:

| Measure | Count | Share |
|---|---|---|
| Rules mapped to an ISO/IEC 5055 weakness | 37 | 9.5% |
| — of which the mapping is direct | 8 | |
| — of which the mapping is a partial / proxy | 29 | |
| Rules with no international equivalent (each with a stated reason) | 354 | 90.5% |
| Rules an existing analyser could decide outright | 42 | 10.7% |
| Rules an analyser could decide partially | 23 | 5.9% |

**The adopted fraction is 9.5% of the corpus.** That is a real result and it is smaller than the gap's
premise implied, for a structural reason: ISO/IEC 5055 measures the internal structure of source code,
and 313 of our 391 rules are not about source structure at all. They are ADR conformance (162),
topology contracts (66), governance invariants (51) and development process (34). No international
standard models "did you honour ADR-0092", and none ever will.

Where the standard does apply, it applies well: of the 26 rules classified `code-structure`, 18 map
and 13 are analyser-decidable.

## Re-scoping the handler backlog

The gap statement sized the payoff against "~240 handlers to write". **That figure is already
retired.** GT-595 triaged the corpus and the real, decidable-from-the-repository backlog is **48
rules** — the `unimplemented-native` class. Of the 389 rules Core's triage loads, 154 already run and
the other 187 are 136 documentation-only generator placeholders, 14 underspecified rules with no
authored check, 20 that need an external system and 17 that need a running one.

(389, not 391: the two single-rule infrastructure files carry their rule metadata at the document root,
which Core's corpus loader does not read. They appear in the mapping as `not-in-snapshot`.)

60 → 48 on 2026-07-29: eight config-shaped rules got handlers (GT-595) and four module-boundary rules
turned out to already carry a complete `enforce` clause that normalization was dropping (GT-632).

Folding this mapping onto that class is the number that matters:

| Of the 48-rule handler backlog | Count |
|---|---|
| Decidable today by an off-the-shelf analyser | 5 |
| Decidable partially (analyser gives a necessary-but-not-sufficient signal) | 5 |
| Genuinely has to be authored | 38 |

The 5 are `HXA-03` (layer structure — dependency-cruiser or ArchUnit), `SEC-INJ-01`, `SEC-PATH-01`,
`SEC-PATH-02` (CodeQL/Semgrep injection and path-traversal queries) and `SEC-TIMING-01` (timing-safe
comparison). The 5 partials are listed in `handlerBacklog.byEvaluabilityClass` in the mapping JSON.

So adoption is worth **10.4% of the backlog outright, 20.8% including partials** — 10 of 48 rules that
do not need bespoke handlers. Both shares fell when the backlog shrank, and that is the right
direction: the twelve rules closed on 2026-07-29 include `HXA-01`, `HXA-02`, `HXA-04` and `GIT-08`,
which were four of the nine this table used to offer to an analyser. Evolith wrote the handler first.
What is left leans further toward authoring, and the security rules still point at analysers better
than anything we would write.

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

## How drift is caught

The snapshot was hand-maintained until GT-598, and it drifted: it declared `documentation-only: 129`
long after Core had moved to 136, and the guard that was meant to notice compared the snapshot against
six numbers typed into the test — the same six the snapshot already contained. It compared the snapshot
to itself and could only ever pass. Three checks replace it, in the two jobs that can afford them:

| Where | What it proves |
|---|---|
| `rule-corpus-triage.spec.ts` (core-domain jest) | The committed snapshot equals a **freshly computed** triage — counts and every per-rule class. This is the real guard; it has the dependencies to recompute the truth. |
| `iso-5055-mapping.test.mjs` (documentation job, no `node_modules`) | The snapshot's counts equal the counts **read out of** that spec, its header agrees with its own body, and every class stamped into the mapping matches the snapshot. |
| `capture-native-evaluability-snapshot.mjs --check` | The end-to-end re-derivation, runnable anywhere the workspace is installed. |
