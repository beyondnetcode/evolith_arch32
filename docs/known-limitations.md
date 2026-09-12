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

A repository freshly configured with `init` is a baseline, not a pass: many rules assume a fuller layout. The full capture of that first run — 72 rows, 37 blocking, 9 of them rules the engine could not decide — is in [first-run-capture](./evidence/first-run-capture.md). Bringing the default to zero is tracked as GT-571 on the [gap board](../reference/core/control-center/gaps/gap-tracking.md).

## What is not built

The "LLM proposes, a deterministic verifier disposes" half is a documented direction, not shipped behaviour. No command in the installed CLI reaches an LLM.

## Network egress

Local-first: the CLI, the rules, the OPA policies and the evaluation Core run on your machine, and your code is never uploaded. There is exactly **one** outbound integration (`GeminiProvider`, Google Gemini API), it is **off by default**, and no command in the published CLI reaches it today. The tarballs on the registry predate that hardening: **treat the published `GeminiProvider` as ungoverned and do not wire it up.**

Full disclosure — sub-processors, credential, limits, redaction, what leaves and what does not, and the known limitations of these controls: [Network Egress and Data Handling](../SECURITY.md#network-egress-and-data-handling). Report an egress defect there, never in a public issue.

## Verified platforms

Installation is verified in CI on Linux. macOS and Windows are not covered by that gate.

## Adoption

1,109 npm downloads in the month measured (2026-07-21 → 2026-08-19), no confirmed external adoption. The repository governs itself, and that is all the evidence there is.
