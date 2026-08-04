# E2E Scenario Board

> **Bilingual Navigation:** [Versión en Español](./e2e-scenario-board.es.md)

What the end-to-end suites exercise, and what they observed. **Generated — do not edit by hand.**

> This page is NOT a backlog. A defect's status lives in [`gap-tracking.md`](../gaps/gap-tracking.md) and nowhere else; this page cites `GT-NNN` and never owns one. It answers *which scenarios exist, which ran, what was seen*.

Regenerate with: `node .harness/scripts/generate-e2e-scenario-board.mjs`

## Core — cross-surface exploration (CLI · MCP · REST)

Measured `2026-08-04T22:17:22.757Z`. Produced by: `npm run test:exploration`.

| Measure | Value |
|---|---|
| Operations declared | 73 |
| Exposed per surface | CLI 42 · MCP 47 · REST 31 |
| Declared on all three | 14 |
| With a binding | 51 |
| Actually executed | 51 |
| Surface invocations | 75 |
| No-effect contracts | 3/3 checked · 3 contrast-verified |

### Declared on all three surfaces but NOT exercised

These carry a binding on every surface and no invocation reached them. They are the honest edge of this run, listed rather than rounded away.

- `satellite-create`

### Observations

No observations in the recorded run.

## Tracker — RoboSoft robots against a live cluster

**Verdict: `PASS`** — Measured `2026-08-04T15:50:43.110Z`, from run `robosoft-2026-08-04T15-50-43-110Z.json`.

13 passed · 0 failed · 1 soft · 0 crashed

| Scenario | Verdict | Checks |
|---|---|---|
| `core-integration` | PASS | 13 ok · 0 failed · 1 soft |

