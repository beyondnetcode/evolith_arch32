# ADR-0126: The Bilingual Mandate Narrows to an Entry Surface

> **Bilingual Navigation:** English (this document) · [Versión en Español](./0126-bilingual-entry-surface.es.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-08-16 |
| **Deciders** | Architecture Board |
| **Technical story** | A repo-wide translation mandate priced at 783 pairs, spent on documents nobody opens, that also made the first PR from an outside contributor fail by construction |

<!-- implementation-status: full -->
> **Implementation status in this repository: full** (2026-08-16).
> The scope module is `.harness/scripts/lib/bilingual-scope.mjs`; both guards read it and both
> print the released denominator on every run. Verified by running each guard before and after
> the change: the pre-change run reported the four defects this ADR predicts, including the
> `<div>` imbalance in `README.es.md` that two purpose-built bilingual guards had been green over.

## Status

Accepted — 2026-08-16. In force and implemented.

## Context

Every English `.md` under `reference/` was required to carry an `.es.md` twin, and every
existing pair anywhere in the tree was required to move on both sides within a single range.
Measured on the day of this decision: **527** English documents under `reference/`, **783**
existing EN/ES pairs repo-wide, **1,661** markdown files scanned per run.

The mandate was not wrong. It was unaffordable, and it charged its whole cost at the wrong
door. Three effects, each measured rather than argued:

**1. It spent the translation budget on documents nobody reads.** Over the preceding 14 days
the repository served **66 views to 14 unique visitors**. `traffic/popular/paths` lists a
single `.es.md` among them. The mandate was buying parity on a corpus whose measured readership
is approximately zero, at the same time as the landing surface itself was broken.

**2. It did not catch the defect it most needed to catch.** `README.es.md` lost its opening
`<div align="center">` and kept the closing `</div>` on line 24. GitHub rendered the Spanish
landing page left-aligned while the English one was centred — the first thing a Spanish-speaking
visitor saw, wrong, for as long as it took someone to notice. Both bilingual guards were green
throughout, and **correctly so**: the file existed, its heading count matched, and it read as
Spanish. Every question they asked was about the document's text. Nothing asked whether the
markup still bracketed. Breadth was bought at the cost of depth on the one file that matters
most.

**3. It made the first PR from an outside contributor fail by construction.**
`66-validate-bilingual-sync` rejects a range that edits an English document without its Spanish
twin. Its escape hatch is a commit-sha-keyed `ALLOWED` map — and a stranger cannot populate it,
because the sha does not exist until after they have committed, and editing a guard file is not
something a first contribution should have to do. Applied to 783 pairs, that hatch was a wall
in front of exactly the people the project is trying to attract.

## Decision

### 1. The mandate applies to an entry surface, not to a path prefix

Sixteen documents, declared by name in `.harness/scripts/lib/bilingual-scope.mjs`. The bar for
membership: **a stranger reaches the document within two clicks of the repository landing page,
or the project treats it as authoritative.** The list is the six community-health and landing
files, the eight `reference/` hubs linked directly from `README.md` — the navigational spine,
which is what makes them reachable at all — and `gap-tracking.md`, included not because a
stranger reads it but because the project treats both halves as its record of truth, which is
the defect GT-702 registered guard 66 to close.

### 2. Nothing outside the surface is deleted, moved, or stamped

All 783 released pairs keep their `.es.md` exactly where it is. The saving comes from **ending
the enforcement, not from touching the files.** A migration that edits 712 files to record that
they are no longer being checked would cost more than the mandate it replaces.

### 3. A narrowed guard must print what it stopped checking

This is the load-bearing clause. Narrowing a guard's scope and leaving its success message
unchanged produces the precise defect this repository sells a product against: a green tick that
reads as *the corpus is consistent* when it means *a corpus I no longer look at was not
examined*. **A rule that was not evaluated is not a rule that passed.**

Both guards therefore print the released denominator on every run, pass or fail, and their
success lines state the limit of the claim in words:

```
bilingual scope (ADR-0126): 16/16 entry-surface document(s) enforced; 783 EN/ES pair(s)
outside the entry surface were NOT evaluated — their state is unknown, not verified.
```

Any future caller of the scope module prints it too. A scope module whose output can be consumed
silently is a scope module that will be.

### 4. Depth bought with the breadth: markup balance on the entry surface

The budget freed by dropping 783 pairs buys a check the old mandate could not afford to run
anywhere: block-level HTML tags that open and never close, or close having never opened, on the
sixteen entry-surface documents and both their halves. Deliberately narrow — only `div`,
`details`, `table`, `picture`, `figure`; void and inline elements are excluded because
`README.md` uses them unclosed and legally; fenced code is stripped first or every heredoc
becomes a finding.

### 5. Adding to the surface is a decision, not a convenience

Adding a file is cheap to write and expensive to keep: it commits the maintainer to mirroring
every future edit, forever. A document that fails the two-click test does not go on the list to
make a red guard green. Removing one requires saying why here.

### 6. What this does NOT decide

It does not deprecate Spanish as a project language, it does not decide the fate of the released
corpus, and it does not claim the released pairs are consistent. Their state is **unknown**.
Whether they are eventually re-enforced, generated, or allowed to age is a separate decision
that should be taken with readership data this project does not yet have.

## Consequences

**Gained.** The first PR from an outside contributor no longer hits a guard whose escape hatch
they cannot reach. The landing surface gains a markup check that would have caught the `<div>`
defect on the day it landed. `SECURITY.md` and `MASTER_INDEX.md` — root files the old
`reference/`-only orphan rule never examined — acquired Spanish counterparts as a direct
consequence of being named, having gone without for the entire life of the mandate that was
supposed to guarantee them.

**Given up.** 783 pairs are no longer checked for structural parity, language-slot correctness,
or one-sided edits. Some of them will drift. That is the accepted cost, and the guards say so
out loud rather than letting a green tick imply otherwise.

**Reversible.** The scope is one exported array. Re-widening is a one-line change plus the
translation debt accumulated in the interim — which is exactly why the released count is printed
on every run rather than computed once and forgotten.

## Related ADRs

- ADR-0125 — a single artifact registry, keyed by slug: the same preference for one declared
  list over a rule that infers membership from paths.
