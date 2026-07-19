> **Bilingual Navigation:** [Ver versión en Español](./0117-bilingual-parity-scope-authored-sources.es.md)

# ADR-0117: Bilingual Parity Applies to Authored Sources, Not Generated Projections

> **Agent Signature:** Architect Agent (Winston)

## Status

Accepted (2026-07-18 — implemented in `develop`)

This ADR records a policy decision that is **already implemented**, not one
being proposed:

| Decision | Commit | Artefact |
|---|---|---|
| Parity is scoped to authored sources | `8481443b` | `.harness/scripts/lib/generated-doc-exclusions.mjs` |

The ADR number was reserved in advance for the harness-normalisation lane in
[COORDINATION.md](../../../control-center/COORDINATION.md).

## Date

2026-07-18

## Context and Problem

`.harness/scripts/ci/suites/bilingual-suite.mjs` enforced a single rule: *every
English document under `reference/` must have a Spanish counterpart.* It had
**no exclusion mechanism at all** — not a config file, not a glob, not an
escape hatch.

Meanwhile four generators write English-only Markdown into that same tree:

| Tree | Files | Generator |
|---|---|---|
| `reference/knowledge/okf/**` | 15 | `.harness/scripts/knowledge-okf-project.mjs` |
| `reference/wiki/**` | 6 | `.harness/scripts/sync-wiki.mjs` |
| `reference/core/interfaces/how-to-*.md` | 5 | `src/tests/exploration/gen-howto.ts` |
| `reference/core/control-center/audits/COVERAGE_REPORT.md` | 1 | `.harness/scripts/coverage-dashboard.mjs` |

The rule was therefore **unsatisfiable by construction**. Satisfying it required
hand-writing Spanish siblings that the next build would delete, and no build
could ever leave the tree green. The guard was permanently red.

A permanently red guard reports nothing. Its information content is identical to
a guard that is permanently green: in both cases the output is the same on the
day a regression lands as on the day before. A newly unpaired *authored*
document — a real defect, the exact thing the rule exists to catch — would have
landed invisibly among 38 pre-existing failures, indistinguishable from the
backlog. This is the false-signal class that `lib/coverage.mjs` closes from the
opposite direction (a guard that scans nothing and exits green); the same
disease, mirrored.

The problem was not that the generators were misbehaving. It was that the policy
had never stated **what it is a policy about**.

## Objective and Scope

State the subject of the bilingual rule precisely enough that a machine can
decide membership, and make the guard able to pass.

**In scope:** the scope predicate of bilingual parity; a declared, reasoned
exclusion mechanism that cannot be widened silently; and the recording of the
two false-signal surfaces this exposed.

**Out of scope:** translating any generated tree; changing any generator;
paying down the hand-authored translation debt that remains (that debt is real
and stays red on purpose); and the question of whether the wiki should be
published bilingually, which is recorded below as an open question rather than
decided.

## Options Considered

### Option A: Make the generators emit both languages

Teach `knowledge-okf-project.mjs`, `sync-wiki.mjs` and `gen-howto.ts` to write a
`.es.md` beside every `.md`. *Rejected.* It answers the wrong question. The OKF
bundle is a projection of `reference/knowledge/canonical/`, and the wiki is
assembled from repo documents that are *already* under parity — so their Spanish
already exists upstream. Emitting a second copy downstream creates two places
where the same Spanish can rot independently, and nothing reconciles them. It
also mistakes the mechanism for the goal: machine-translating a projection to
satisfy a rule about human-authored documents produces a green check and no
reader. Where a generated tree genuinely has a Spanish audience, the correct
form of this option is narrow and is preserved as an open question below.

### Option B: Drop the bilingual parity rule entirely

Delete the guard; parity becomes a convention. *Rejected.* The rule is not
wrong — it is correctly aimed at authored documentation and only misaimed at
projections. Deleting it would discard a genuine invariant to escape a scoping
bug, and would convert the visible translation debt into invisible translation
debt. A repository whose governance is published in two languages cannot let one
of them silently fall behind; that is precisely the drift the guard exists to
detect.

### Option C: Suppress the failures with a broad ignore glob

Add `reference/knowledge/**`, `reference/wiki/**` to an ignore list and move on.
*Rejected.* A broad glob lets an entire tree drift out of policy on one careless
line, and it excludes by *location* rather than by *provenance* — so a
hand-written document dropped into an excluded directory silently inherits the
exemption it does not deserve. It also states no reason, which means no future
reader can tell a considered exemption from an expedient one.

### Option D: Scope the policy to authored sources, with proven exclusions (adopted)

Declare that parity is a property of the source; let projections inherit
whatever parity their sources have; and implement the exclusion so that
membership is *proven* rather than asserted. See below.

## Decision and Rationale

### 1. Parity belongs to the source, not the projection

**Bilingual parity applies to AUTHORED sources. Generated trees inherit
whatever parity their sources have, and are out of scope for the rule.**

The OKF bundle derives from `reference/knowledge/canonical/`; the wiki is
assembled from repository documents already under parity. Enforcing the rule on
the derivative rather than the original is enforcing it on the shadow instead of
the object: the shadow can be made to conform while the object rots, and the
object can be perfect while the shadow shows red. If the Spanish of the
canonical corpus is complete, the projection's Spanish coverage is a *fact about
the projector*, not a fact anyone needs to enforce twice.

This also fixes the accountability: when the OKF bundle lacks Spanish, the
actionable defect is in `reference/knowledge/canonical/` or in the projector —
never in `reference/knowledge/okf/`, where no human may write.

### 2. A translated derivative cannot stay correct

The second argument is stronger than the first, because it does not depend on
taste.

`knowledge-okf-project.mjs` **removes its entire output directory on every
run** and rewrites it whole — the projector is the only hand that writes there.
Any `.es.md` committed into `reference/knowledge/okf/` is therefore destroyed by
the next projection. The policy would have been demanding an artefact that the
build actively deletes: not merely burdensome, but incoherent.

The `how-to-*.md` files have the same shape with a slower failure. They are
regenerated from live capture of the tested CLI/MCP/REST bindings, so a
hand-written Spanish sibling does not get deleted — it goes **stale silently**,
which is worse, because it keeps reading like a document while ceasing to
describe the system. Their bodies are in any case mostly command invocations and
captured responses: literal text with nothing to translate.

`COVERAGE_REPORT.md` closes the argument by reductio. It is a machine-written
measurement *of bilingual coverage itself*. Requiring it to be translated in
order to satisfy the rule it reports on is circular.

### 3. The exclusion mechanism proves membership rather than asserting it

An exclusion list is a hole in a guard, so the implementation
(`.harness/scripts/lib/generated-doc-exclusions.mjs`) is built to be harder to
abuse than the rule it relaxes. Four constraints carry the design:

- **Declared in source, nowhere else.** No env var, no config file, no glob read
  from disk. Granting an exemption means editing this file, which means it
  appears in a diff beside its justification. An exemption grantable from
  outside the code is an exemption nobody reviews.
- **Every entry must name its `generator` and its `reason`.** An entry missing
  either is rejected at load time by `validateEntries()`, not quietly accepted.
- **Membership is verified against content.** Where a generator stamps its
  output, the entry declares that `marker` and a file is excluded *only if it
  actually carries the stamp*. Drop a hand-written `.md` into `reference/wiki/`
  and it has no marker, so it is not excluded and the guard fails on it — which
  is the correct outcome.
- **Exclusions are reported, never hidden.** `formatExclusionReport()` prints
  every entry, its file count and its reason on every run, pass or fail. A
  silent exclusion is a false green, which is the disease being treated.

### 4. Where membership cannot be proven, the exclusion refuses itself

As first implemented in `8481443b`, the OKF entry was the one that could not use
a marker: its generator stamped nothing, because the bundle emits OKF-conformant
frontmatter rather than a provenance banner. That entry was instead
**count-pinned** to its exact inventory (15 files).

The pin was deliberately fail-closed. If the real count drifted in *either*
direction, the exclusion was **refused entirely** and all 15 files returned to
scope — the guard going red rather than quietly stretching to cover whatever
appeared. An exclusion that grows to fit its contents is not an exclusion; it is
a wildcard with extra steps.

Count-pinning is nevertheless the **weaker mechanism**, and this ADR records
that rather than presenting the four entries as ever having been equivalent. A
pin proves only *how many*, never *which*: delete one projected file and add one
hand-written file in the same commit and the count still matches. The fix was
for `knowledge-okf-project.mjs` to stamp a provenance banner into each projected
file, making the OKF entry marker-verified like the other three so the pin could
be removed. That banner has since landed
(`GENERATED by .harness/scripts/knowledge-okf-project.mjs`), and **all four
entries are now content-verified**; the reasoning is retained here because the
principle — prefer proven membership to asserted cardinality — governs any
future entry.

### 5. What was deliberately NOT decided

- **The wiki's Spanish audience.** The wiki is the one excluded tree that is a
  *publication* surface with readers, not an intermediate artefact. If its
  Spanish readership matters, the fix belongs in `sync-wiki.mjs` emitting both
  languages from the already-translated sources it assembles from — never in
  hand-authoring Spanish alongside generated output, which the next sync
  overwrites. This is recorded here as an **open question**, not as a decision.
- **The remaining hand-authored translation debt.** Orphans under
  `reference/core/control-center/`, `reference/core/foundations/`, the
  `README`/`playbook-*`/`using-the-*` set under `reference/core/interfaces/`,
  and `reference/knowledge/` are real debt and stay in scope. Suppressing them
  through this mechanism would convert an honest bill into a forged receipt.

## Evidence and Evaluation Criteria

The decision was judged on three criteria: whether the rule becomes
*satisfiable*, whether the exclusion can be widened without a reviewer noticing,
and whether the remaining debt stays visible.

- `.harness/scripts/lib/generated-doc-exclusions.mjs` — four entries, each with
  `generator` and `reason`, all four now marker-verified.
- `node .harness/scripts/ci/04-check-bilingual-parity.mjs` prints the exclusion
  report on every run: **27 files exempt**, itemised by entry with the
  verification method stated per entry (`verified by: content marker "…"`).
- **Satisfiability is the acceptance criterion.** Before the change no state of
  the working tree could make the guard pass. After it, the guard's remaining
  failures are all actionable defects in authored documents.
- **Litmus test.** If all four generators were replaced tomorrow, the decision
  — parity is a property of sources, projections inherit it — still stands. The
  four entries are the current inputs, not the subject of the decision.

## Consequences, Risks, and Trade-offs

**Positive.** The bilingual guard can pass, so it can once again report a
regression. Its remaining red is a list of real, fixable translation debt rather
than a wall. The policy now has a stated subject, so future documents can be
classified without argument, and every exemption arrives with its generator and
its reason attached.

**Negative / accepted trade-offs.** An exclusion list exists where none did
before; it is small and self-validating, but it is still a hole and must be
defended in review. And generated trees are now, by policy, monolingual — a
Spanish-only reader gets no OKF bundle and no wiki. That is accepted here on the
grounds that both are derivatives of sources that *are* translated, but it is a
real cost and the wiki open question exists because of it.

**Two false-signal surfaces this exposed, recorded and not fixed here:**

- **`COVERAGE_REPORT.md` asserted completeness over a red check.** It has been
  reporting `Coverage: 100.0% | Paired: 586` while the very guard it purports to
  measure was failing on 38 files. A dashboard that reports 100% about a failing
  check is a second false-signal surface, and arguably a worse one than the red
  guard: red at least invites investigation, while a green dashboard actively
  discourages it.
- **Five documents hold the English slot but are written in Spanish.**
  `reference/knowledge/README.md`, `reference/knowledge/canonical/glossary/knowledge.md`
  and the three `reference/core/interfaces/using-the-*.md` occupy the `.md`
  (English) path while their content is entirely Spanish. Their `.es.md`
  siblings now exist, so the guard passes on them — but the **English versions
  do not exist**. The debt is inverted, and the guard cannot see it, because it
  checks for the presence of a file and not the language of its contents.

**Risks.**
- *Count-pinning gives false assurance.* A pin proves cardinality, not identity;
  an equal-sized swap passes. Retired for the OKF entry by the provenance banner,
  and no longer available to future entries by the rule stated in §4.
- *The exclusion list grows.* Each new entry is another tree outside policy.
  Mitigated by the mandatory `generator`/`reason` fields and the always-on
  report, which make growth visible in both the diff and the CI log.
- *Language-blind checking.* The five inverted documents show that a
  presence-based guard can be satisfied by a file in the wrong language. No part
  of this decision closes that; it is named so it is not mistaken for solved.

## Known Follow-up

The OKF provenance banner described in §4 **has landed** — the
`knowledge-okf-bundle` entry now declares a `marker` and no longer pins
`expectedFiles`, closing the equal-sized-swap gap. No exclusion in the table is
count-pinned any more, and none should be added: an entry whose generator cannot
stamp its output should gain that stamp rather than a pin.

Separately, `coverage-dashboard.mjs` should derive its coverage figure from the
same scope predicate the guard uses, so the dashboard cannot report 100% while
the guard is red. Until then the two disagree by construction.

## References

- `.harness/scripts/lib/generated-doc-exclusions.mjs` — the exclusion table and
  its `validateEntries()` load-time check (commit `8481443b`).
- `.harness/scripts/ci/suites/bilingual-suite.mjs` ·
  `.harness/scripts/ci/04-check-bilingual-parity.mjs` — the guard and its entry
  point.
- `.harness/scripts/knowledge-okf-project.mjs` — the projector that clears its
  output directory on every run; `--verify` polices its own drift.
- `.harness/scripts/sync-wiki.mjs` · `src/tests/exploration/gen-howto.ts` ·
  `.harness/scripts/coverage-dashboard.mjs` — the other three generators.
- `.harness/scripts/lib/coverage.mjs` — the `allowEmpty` pattern this exclusion
  mechanism deliberately borrows.
- [COORDINATION.md](../../../control-center/COORDINATION.md) — the
  harness-normalisation lane that reserved this ADR number.

## Related Decisions and Standards

- [ADR-0105](./0105-okf-knowledge-projection.md) — establishes the OKF bundle as
  a *projection* of the canonical corpus. This ADR draws the direct consequence:
  a projection does not carry its own parity obligation.
- [ADR-0116](./0116-canonical-finding-and-authority-boundary.md) — the same
  harness-normalisation lane, and the same underlying principle: a rule that
  nothing can satisfy or check is not a rule. There, prose that could not refuse;
  here, a check that could not pass.
- [ADR-0115](./0115-emergent-knowledge-axis.md) — the knowledge corpus whose
  canonical layer is the parity-bearing source for the OKF projection.
- `reference/core/control-center/audits/COVERAGE_REPORT.md` — the dashboard whose
  disagreement with the guard is recorded above as a consequence, not resolved.

---
[Back to Upper Level](./README.md)
