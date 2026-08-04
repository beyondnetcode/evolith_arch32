# E2E Scenario Board

> **Bilingual Navigation:** [Versión en Español](./e2e-scenario-board.es.md)

What the end-to-end suites exercise, and what they observed. **Generated — do not edit by hand.**

> This page is NOT a backlog. A defect's status lives in [`gap-tracking.md`](../gaps/gap-tracking.md) and nowhere else; this page cites `GT-NNN` and never owns one. It answers *which scenarios exist, which ran, what was seen*.

Regenerate with: `node .harness/scripts/generate-e2e-scenario-board.mjs`

## Core — cross-surface exploration (CLI · MCP · REST)

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

| Severity | Type | Operation | Surfaces | Observation |
|---|---|---|---|---|
| P1 | consistency | `gate-evaluate` | cli · mcp · rest | Cross-surface success divergence on gate-evaluate |
| P1 | consistency | `sdlc-status` | cli · mcp | Cross-surface success divergence on sdlc-status |
| P1 | consistency | `validate-satellite` | cli · mcp · rest | Cross-surface success divergence on validate-satellite |
| P1 | consistency | `dora-metrics` | cli · mcp | Cross-surface success divergence on dora-metrics |
| P1 | consistency | `agents-list` | cli · mcp | Cross-surface success divergence on agents-list |
| P2 | consistency | `phase-advance` | cli · mcp · rest | Cross-surface success divergence on phase-advance |
| P2 | consistency | `detect-drift` | cli · mcp · rest | Cross-surface success divergence on detect-drift |
| P2 | consistency | `evaluate` | cli · mcp · rest | Cross-surface success divergence on evaluate |
| P2 | consistency | `composable-validate` | cli · mcp · rest | Cross-surface success divergence on composable-validate |
| P2 | consistency | `recommend-topology` | cli · mcp · rest | Cross-surface success divergence on recommend-topology |
| P2 | consistency | `phase-artifacts-evaluate` | cli · mcp · rest | Cross-surface success divergence on phase-artifacts-evaluate |
| P2 | consistency | `topology-list` | mcp · rest | Cross-surface success divergence on topology-list |

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

