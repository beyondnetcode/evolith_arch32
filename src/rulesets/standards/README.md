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
from the snapshot, so rebuilding first launders a stale classification into a 412-row artifact and
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

Against **412 rules** in 180 ruleset files:

| Measure | Count | Share |
|---|---|---|
| Rules mapped to an ISO/IEC 5055 weakness | 37 | 9.0% |
| — of which the mapping is direct | 8 | |
| — of which the mapping is a partial / proxy | 29 | |
| Rules with no international equivalent (each with a stated reason) | 375 | 91.0% |
| Rules an existing analyser could decide outright | 46 | 11.2% |
| Rules an analyser could decide partially | 23 | 5.6% |

**The adopted fraction is 9.0% of the corpus.** That is a real result and it is smaller than the gap's
premise implied, for a structural reason: ISO/IEC 5055 measures the internal structure of source code,
and 318 of our 412 rules are not about source structure at all. They are ADR conformance (163),
topology contracts (66), governance invariants (55) and development process (34). No international
standard models "did you honour ADR-0092", and none ever will.

Where the standard does apply, it applies well: of the 26 rules classified `code-structure`, 18 map
and 13 are analyser-decidable.

### Rule classes, and the one that was missing

`ruleClass` says what KIND of thing a rule constrains, and it is **derived, never enumerated**. Until
GT-666 it was derived from a table of path prefixes with `governance` as the fallback, and the three
international-standard packs matched no prefix. All **16** of their rules — NIST SP 800-218 (8),
ISO/IEC 5055:2021 (4), SLSA v1.0 Build track (4) — were therefore published as `governance`, carrying
the governance reason verbatim:

> A governance invariant over Evolith artifacts (inheritance, open-core boundary, satellites,
> evidence). No international structural equivalent.

Every clause of that is false of an SSDF practice, and it was in the one document written to be
checkable by a reader who does not trust us. The class `international-standard` now covers them, and
it is derived from **the pack's own top-level `standard` block** rather than from its directory: a
declaration travels with the file, so a fourth pack classifies correctly wherever it lands. The
directory is the second signal and it is enforced in the other direction — a `*.rules.json` under
`standards/` that carries rules without declaring a standard **fails the generator**, rather than
falling through to the default. `65-validate-standards-rule-class.mjs` holds both directions in CI,
with a negative fixture built from the pre-fix artifact itself.

Each row's note is derived from that same declaration, so it names the standard the rule actually
belongs to. A class-wide sentence would have been the same defect one level down: one text asserted
over every standard, true of none of them in particular.

## Re-scoping the handler backlog

The gap statement sized the payoff against "~240 handlers to write". **That figure is already
retired.** GT-595 triaged the corpus and the real, decidable-from-the-repository backlog is **52
rules** — the `unimplemented-native` class. Of the 410 rules Core's triage loads, 170 already run and
the other 188 are 137 documentation-only generator placeholders, 14 underspecified rules with no
authored check, 20 that need an external system and 17 that need a running one.

(410, not 412: the two single-rule infrastructure files carry their rule metadata at the document root,
which Core's corpus loader does not read. They appear in the mapping as `not-in-snapshot`.)

60 → 48 on 2026-07-29: eight config-shaped rules got handlers (GT-595) and four module-boundary rules
turned out to already carry a complete `enforce` clause that normalization was dropping (GT-632).

48 → 52 on 2026-08-09: the four ISO/IEC 5055 rules (GT-662). They are `unimplemented-native` because no
NATIVE handler decides them, which is the design rather than a gap — they carry `enforce:` and are
decided by an adapter over a free analyser's SARIF. The SLSA pack's four rules (GT-665) did NOT land
here: `SlsaRuleHandler` claims them, so they are `native-handler`.

Folding this mapping onto that class is the number that matters:

| Of the 52-rule handler backlog | Count |
|---|---|
| Decidable today by an off-the-shelf analyser | 9 |
| Decidable partially (analyser gives a necessary-but-not-sufficient signal) | 5 |
| Genuinely has to be authored | 38 |

The 9 are `HXA-03` (layer structure — dependency-cruiser or ArchUnit), `SEC-INJ-01`, `SEC-PATH-01`,
`SEC-PATH-02` (CodeQL/Semgrep injection and path-traversal queries), `SEC-TIMING-01` (timing-safe
comparison) and the four `ISO5055-*` measures, which are an adapter over an analyser by construction —
that is what GT-662…GT-664 built. The 5 partials are listed in
`handlerBacklog.byEvaluabilityClass` in the mapping JSON.

So adoption is worth **17.3% of the backlog outright, 26.9% including partials** — 14 of 52 rules that
do not need bespoke handlers. **Nothing became easier to build.** The shares moved because the four
`ISO5055-*` rules had been counted as work that must be authored while an analyser was already deciding
them; GT-667 corrects `remainderToAuthor` to 38 — the same 38 the 48-rule backlog carried, which is the
point: the four rules GT-662 added were never author-work. Earlier, both shares fell when the backlog
shrank, and that was the right direction too: the twelve rules closed on 2026-07-29 include `HXA-01`,
`HXA-02`, `HXA-04` and `GIT-08`, which were four of the nine this table used to offer to an analyser.
Evolith wrote the handler first. What is left leans toward authoring, and the security rules still
point at analysers better than anything we would write.

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
