# Session Coordination Ledger

> **Purpose.** Multiple agent sessions sometimes work the same `develop` in parallel
> (closing gaps, registering ADRs). The gap *code* is naturally partitioned (different
> gaps → different files), but three **global allocators** are shared and collide if two
> sessions read-then-write them at once: the board **Progress** counter, **ADR numbers**,
> and **GT-IDs**. This ledger is the single place to reserve those, and to declare which
> gaps each session owns. **Read it (after `git fetch`) before allocating anything.**

## How reservation works (reserve-then-push)

To claim an ADR number or a GT-ID:

1. `git fetch origin` and read the **Allocator registers** below.
2. Take the current next-free value, **bump the register here, and push THIS file first**
   in a tiny commit — that reserves the number for you.
3. If the push is rejected (someone bumped first), re-fetch, take the new next-free, retry.
4. Only then create the ADR/gap files that use the number.

Whoever pushes the ledger bump first owns the number. No `--force`, ever.

## Allocator registers (authoritative next-free values)

| Allocator | Next free | Last claimed | By |
|-----------|-----------|--------------|-----|
| ADR number (`reference/core/architecture/adrs/core/NNNN-*`) | **0118** | 0117 — Bilingual parity applies to authored sources, not generated projections | harness-normalisation lane (0114 still earmarked by UP-003) |
| GT-ID (`gap-tracking.md` rows) | **GT-560** | GT-559 — advisory-authority single source (P0 wave) | harness-normalisation lane |

> The board **`**Progress:**`** counter is NOT block-reserved — see its protocol below.
> `gap-closure-evidence.json` is append-only (low collision); still push promptly.

## Active lanes (who owns which gaps)

Two sessions never edit the same board/catalog rows if they stay in their lane.

| Session | Lane / thread | Gap scope (owns) | Status |
|---------|---------------|------------------|--------|
| **RAG model maturity assessment** | RAG / embeddings / maturity | GT-538…541 + follow-ons + RAG ADRs (0112) | active (not running now; last push 12:24) |
| **Gap-closing waves (Winston)** | enforcers / evidence-seam / runtime | GT-533-wire, GT-516, GT-524, GT-520, GT-513, GT-535 | **paused** pending coordination |
| **Harness normalisation (P0)** | shared harness capabilities | GT-556…559 + ADR-0116 | active |

If you need a gap outside your lane, claim it here first (add a row / note) before touching it.

## Progress-counter protocol (highest-contention line)

The single `**Progress:** N / T done · … ` line is edited by every board sync. Rules:

1. Edit it **only** in a small, dedicated board-sync commit.
2. `git fetch` immediately before, recompute counts against the **just-fetched** board rows,
   then push immediately. Keep the window tiny.
3. If the push is rejected, re-fetch, recompute against the new baseline, retry. Never force.
4. Run `node .harness/scripts/ci/08-validate-tracking.mjs` (must be green) before pushing.

## Current baseline snapshot (informational — the board is authoritative)

- `develop` tip: `29d00afb`
- Board: **506 / 541 done · 17 in progress · 14 pending · 4 deferred** — guard green
- ADR numbering: `0111` Quality Signal port · `0112` RAG embedding/vector-store · `0113` Lighthouse evidence adapter

## Log

- **2026-07-13** — Ledger created after an ADR-number collision: both lanes independently
  grabbed ADR-0112 (RAG vs Lighthouse). Resolved by renumbering Lighthouse to 0113; RAG
  keeps 0112. Lanes and reservation protocol established above.
