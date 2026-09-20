# Known limitations

> **Bilingual Navigation:** [Versión en Español](./known-limitations.es.md)

Everything the [front page](../README.md) does not say, on a single page. Every claim carries the date it was measured: if a number changed and this page did not, the page is what is wrong. It exists because a README that only tells the good part is exactly the defect Evolith detects: *coverage* and *compliance* painted the same green.

Full audit of our own claims, with what blocks each pending item and who can unblock it: [pending items, 2026-08-16](../reference/core/control-center/adoption/pending-2026-08-16.md).

---

## The two engines do not cover the same ground

`evolith validate` runs the native evaluator by default; `--engine opa` evaluates with the compiled Rego bundle. On this very repository, measured on 2026-08-21 with `@beyondnet/evolith-cli@1.3.2`:

| Engine | Evaluates | Skips |
|---|---|---|
| `--engine opa` | 133 of 159 | 26 |
| native (default) | 41 of 159 | 118 |

CI holds them to agreement over **facts**, not over coverage; that part is by design. That the default command never says so is not ([#628](https://github.com/beyondnetcode/evolith_arch32/issues/628)). That is why the front page uses `--engine opa` everywhere.

## Two infrastructure rules are in no denominator

The loader rejects three ruleset files from its own corpus, and as of 1.3.2 it no longer even says so on stderr ([#575](https://github.com/beyondnetcode/evolith_arch32/issues/575)). The rules they carry show up neither as evaluated nor as skipped.

## The file count and the rule count answer different questions

Measured on 2026-08-21: the tree carried 182 `*.rules.json` files, of which four declare a non-ruleset schema and contribute no rules by design — they are named in every report, not dropped. That left 178 packs with 413 rules. The CLI published at the time (1.3.2) carried its own snapshot: 177 packs, 412 rules.

None of those numbers is the live one. The tree's is measured by CI on every PR and published in the [corpus inventory](../reference/core/control-center/maturity-reports/inventory-summary.md), with its date; your installation's is printed by `evolith rulesets`, pack by pack.

## The first run fails on a fresh repository

A repository freshly configured with `init` is a baseline, not a pass: many rules assume a fuller layout. The full capture of that first run — 71 rows, 37 blocking, 9 of them rules the engine could not decide — is in [first-run-capture](./evidence/first-run-capture.md). Bringing the default to zero is tracked as GT-571 on the [gap board](../reference/core/control-center/gaps/gap-tracking.md).

## `gate evaluate` and `phase advance` need a checkout of this repository on disk

Measured on 2026-09-20 with `@beyondnet/evolith-cli@1.3.2` in a clean container: on a satellite fresh from `init`, `evolith gate evaluate --phase discovery` exits `1` with `ENOENT … reference/governance/sdlc/gates`, and so does `phase advance`. The tarball carries the rules but not the gate definitions, and without `--core` (or `EVOLITH_CORE_PATH`, or a profile) the resolver looks for them inside the satellite. With `--core` pointing at a clone of this repository both commands work and exit `2` — the [phase-gate capture](./evidence/phase-gate-capture.md) has both runs. The MCP package fixed the same defect for itself in GT-705; the CLI has not: GT-714 on the [gap board](../reference/core/control-center/gaps/gap-tracking.md), open as [#775](https://github.com/beyondnetcode/evolith_arch32/issues/775). Until it lands, the front page shows the commands with `--core ../evolith`, because that is what runs.

## The Tracker sent the Core a repository, and the Core answered 500

Measured on 2026-09-20 against the Core image built from `main@142b8324`, the one the UAT environment runs: the Tracker's repository-conformance call (`POST /products/{id}/evaluate-architecture` → Core `POST /api/v1/evaluate` with the repository inline, 150 files, ~1 MB) came back `500 INTERNAL_ERROR "An unexpected error occurred"`, with no log line on the Core. Reproduced locally on the same image: 14 files (99.8 KB) → `200`, 15 files (101.6 KB) → `500`. Express's default 100 KB JSON ceiling, never raised, never named. Fixed as GT-715 — a configurable ceiling (`EVOLITH_MAX_BODY_BYTES`, 2 MiB by default), a `413 PAYLOAD_TOO_LARGE` that states both sizes, and a log line for every masked 5xx — and promoted the same day: Promoted in #778 (`9c5deedf`) and redeployed by the `Deploy UAT (Coolify)` job of run 35490911533 on 2026-09-20; measured right after: the same `evaluate-architecture` call answers `200`, `provenance: core`, `status: COMPLETED`, `resultDecision: FAILED` — a real verdict on 150 files (gates f1–f5 failed for missing phase artifacts), 174 ms in the Core. The Tracker screenshot on the front page is the phase gate around an initiative — taken before the redeploy, and kept because it shows what the CLI does not have — not the repository verdict, which is the measurement above.

## What is not built

The "LLM proposes, a deterministic verifier disposes" half is a documented direction, not shipped behaviour. No command in the installed CLI reaches an LLM.

## Network egress

Local-first: the CLI, the rules, the OPA policies and the evaluation Core run on your machine, and your code is never uploaded. There is exactly **one** outbound integration (`GeminiProvider`, Google Gemini API), it is **off by default**, and no command in the published CLI reaches it today. The tarballs on the registry predate that hardening: **treat the published `GeminiProvider` as ungoverned and do not wire it up.**

Full disclosure — sub-processors, credential, limits, redaction, what leaves and what does not, and the known limitations of these controls: [Network Egress and Data Handling](../SECURITY.md#network-egress-and-data-handling). Report an egress defect there, never in a public issue.

## Verified platforms

Installation is verified in CI on Linux. macOS and Windows are not covered by that gate.

## Adoption

1,109 npm downloads in the month measured (2026-07-21 → 2026-08-19), no confirmed external adoption. The repository governs itself, and that is all the evidence there is.
