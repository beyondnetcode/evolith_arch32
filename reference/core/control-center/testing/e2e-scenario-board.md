# E2E Scenario Board

> **Bilingual Navigation:** [Versión en Español](./e2e-scenario-board.es.md)

What the end-to-end suites exercise, and what they observed. **Generated — do not edit by hand.**

> This page is NOT a backlog. A defect's status lives in [`gap-tracking.md`](../gaps/gap-tracking.md) and nowhere else; this page cites `GT-NNN` and never owns one. It answers *which scenarios exist, which ran, what was seen*.

Regenerate with: `node .harness/scripts/generate-e2e-scenario-board.mjs`

## Core — cross-surface exploration (CLI · MCP · REST)

Measured `2026-08-04T10:24:38.541Z`. Produced by: `npm run test:exploration`.

| Measure | Value |
|---|---|
| Operations declared | 73 |
| Exposed per surface | CLI 42 · MCP 47 · REST 31 |
| Declared on all three | 14 |
| With a binding | 48 |
| Actually executed | 48 |
| Surface invocations | 66 |
| No-effect contracts | 3/3 checked · 3 contrast-verified |

### Declared on all three surfaces but NOT exercised

These carry a binding on every surface and no invocation reached them. They are the honest edge of this run, listed rather than rounded away.

- `satellite-create`
- `pattern-list`
- `pattern-get`
- `pattern-list-by-topology`

### Observations

No observations in the recorded run.

## Tracker — RoboSoft robots against a live cluster

**Verdict: `PASS`** — Measured `2026-08-04T03:52:26.502Z`, from run `robosoft-2026-08-04T03-52-26-502Z.json`.

229 passed · 0 failed · 1 soft · 0 crashed

| Scenario | Verdict | Checks |
|---|---|---|
| `audit-trail` | PASS | 25 ok · 0 failed |
| `exception-governance` | PASS | 21 ok · 0 failed |
| `gate-enforcement` | PASS | 25 ok · 0 failed |
| `governance-journey` | PASS | 53 ok · 0 failed · 1 soft |
| `intake` | PASS | 12 ok · 0 failed |
| `phase-artifact-catalog` | PASS | 18 ok · 0 failed |
| `provider-connections` | PASS | 19 ok · 0 failed |
| `qa-quality-gate` | PASS | 13 ok · 0 failed |
| `scorecard` | PASS | 33 ok · 0 failed |
| `tenant-isolation` | PASS | 10 ok · 0 failed |

