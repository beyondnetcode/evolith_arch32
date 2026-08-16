# Guard and Gap Freeze — 2026-08-16 to 2026-11-16

A 90-day moratorium on new governance machinery, declared so that the eight-week visibility
campaign has hours to exist in.

| Field | Value |
|---|---|
| **Declared** | 2026-08-16 |
| **Expires** | 2026-11-16 |
| **Scope** | `.harness/scripts/ci/`, the gap board, the ADR registry |
| **Reason** | The campaign in [`baseline-2026-08-16.md`](./baseline-2026-08-16.md) needs 8–12 h/week that do not currently exist |

---

## Why

The visibility work costs roughly 62 hours over eight weeks. The measured behaviour it has to
fit alongside: **979 commits in the preceding 30 days**, **76 CI guards**, **34 guard
self-tests**, a **676-row** gap board.

The honest statement is not *this fits*. It is:

> **This fits only if the thing currently consuming every hour stops for a quarter.**

Internal governance work is this project's demonstrated native mode, and it *feels*
productive — which is exactly why the predicted failure mode is that weeks 1–6 go to
refactors, the launch slips past week 8, and the scoreboard reads zero because nobody was
there to move it. This document exists to make that drift visible rather than deniable.

---

## What is frozen

**1. No new CI guards.** The count stays at **76**. A defect that would previously have earned
a guard gets fixed, and the fix is the deliverable — not the guard that would have prevented
a recurrence nobody has yet observed twice.

**2. No new `GT-###` rows**, with one carve-out: **P0 correctness or security**. A P0 is
registered and worked normally. Everything else goes in a plain list and waits for the review
date.

**3. No new ADRs**, except where a decision is being taken anyway and writing it down is
cheaper than not. [ADR-0126](../../architecture/adrs/core/0126-bilingual-entry-surface.md) —
which *removes* enforcement — is the shape that stays allowed.

**4. The 22 PENDING board rows are triaged, not bulk-deferred.** See below.

---

## The triage

A blanket deferral of all 22 PENDING rows was the original instruction and it is wrong. Three
of them are on the campaign's own critical path, and deferring them would defer the launch
they are meant to make possible.

### Stays active — 4 rows

| ID | Criticality | Why it cannot wait |
|---|:---:|---|
| `GT-671` | P1 | *"Nothing checks that what we published to npm still works after release day."* This **is** the week-2 deliverable — hardening `check-install-smoke.mjs` so the tarball is asserted to carry `policy.wasm` and to produce a real verdict. The entire release train hangs on it. |
| `GT-691` | P2 | A HIGH-severity CVE in a transitive dependency that **blocks every promotion**. Deferring it defers the week-3 release, which defers everything downstream of the release. Security carve-out applies on its own merits. |
| `GT-704` | P2 | *"Nobody runs the two engines side by side, so they can drift apart unnoticed."* Dual-engine parity is the **receipt** for the launch claim. Going to Hacker News saying two engines must agree, with nothing checking that they do, is the one thing a skeptic can end the thread with. |
| `GT-703` | P3 | **Work already in flight.** PR [#536](https://github.com/beyondnetcode/evolith_arch32/pull/536) is open against it. Deferring a row whose pull request is open does not save an hour — it orphans one that has already been spent, and leaves an open PR pointing at a deferred gap. It was flipped to `DEFERRED` in the first pass of this triage and reverted on noticing the PR. |

### Deferred to 2026-11-16 — 17 rows

`GT-669` · `GT-670` · `GT-672` · `GT-673` · `GT-674` · `GT-678` · `GT-680` · `GT-681` ·
`GT-682` · `GT-684` · `GT-685` · `GT-686` · `GT-687` · `GT-689` · `GT-690` · `GT-692` ·
`GT-698`

> **`GT-679` left this list by being CLOSED, not by being reconsidered.** It was deferred here on
> 2026-08-16, and [#542](https://github.com/beyondnetcode/evolith_arch32/pull/542) landed the MCP
> human-approval second factor on `develop` the same day. A deferral is a statement about the
> maintainer’s next quarter, not a claim over work already in flight elsewhere: the closure wins
> and the row is `DONE`. This was found by the merge conflict it caused, which is the honest way
> for two parallel sessions to discover they disagreed.

Criticality spread: 3 × P1, 12 × P2, 1 × P3 — GT-679 was the fourth P1. **None is a P0.** They are real work and they are
not urgent, which is the definition of the thing that eats a quarter.

Board after the pass, merged with `develop`: **643 DONE · 27 DEFERRED · 4 PENDING · 2 IN-PROGRESS**, identical in both
languages, with the `**Progress:**` counters on both boards updated to match.

Deferred means **deferred, not cancelled**: the rows keep their catalog entries, their
evidence and their identifiers, and the review on 2026-11-16 reopens them as a set.

---

## The drift tripwire

The freeze is worth nothing if nobody notices it being ignored. One check, cheap enough to run
weekly:

```bash
git log --since='7 days ago' --name-only --pretty=format: \
  | grep -c '^\.harness/scripts/ci/'
git log --since='7 days ago' --name-only --pretty=format: \
  | grep -cE '^(README|CONTRIBUTING|SECURITY)|^docs/|package\.json$'
```

**If the first number exceeds the second in any week, the freeze is being violated.** Not as a
judgement — as a measurement. Record it in the week-8 review either way.

---

## What happens on 2026-11-16

Read the [adoption scoreboard](./baseline-2026-08-16.md) first, then decide in this order:

1. **If the campaign worked** (≥4/5 placements, ≥1 external issue or PR): the 17 deferred rows
   reopen, but behind the work of converting the first external contributor into a second
   reviewer. A second pair of hands is worth more than any of the 17.
2. **If it did not work**: the diagnosis is almost never *wrong channel*. Do not reopen the 17
   as consolation — run the five cold-install sessions named in the plan first.
3. **Either way**: do not extend the freeze silently. Extending it is a decision and gets
   written down here, with the same shape as this one.

---

## Related

- [Adoption baseline, 2026-08-16](./baseline-2026-08-16.md) — the five numbers this trades hours for.
- [ADR-0126](../../architecture/adrs/core/0126-bilingual-entry-surface.md) — the other half of the capacity decision: the bilingual mandate narrowed from 783 pairs to 16 documents.
