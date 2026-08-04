# Cuadro de escenarios E2E

> **Bilingual Navigation:** [English version](./e2e-scenario-board.md)

Qué ejercitan las suites de extremo a extremo, y qué observaron. **Generado — no editar a mano.**

> Esta página NO es un backlog. El estado de un defecto vive en [`gap-tracking.es.md`](../gaps/gap-tracking.es.md) y en ningún otro sitio; esta página cita `GT-NNN` y nunca es dueña de uno. Responde a *qué escenarios existen, cuáles corrieron y qué se vio*.

Regenerar con: `node .harness/scripts/generate-e2e-scenario-board.mjs`

## Core — exploración cross-superficie (CLI · MCP · REST)

Medido `2026-08-04T10:24:38.541Z`. Producido por: `npm run test:exploration`.

| Medida | Valor |
|---|---|
| Operations declared | 73 |
| Exposed per surface | CLI 42 · MCP 47 · REST 31 |
| Declared on all three | 14 |
| With a binding | 48 |
| Actually executed | 48 |
| Surface invocations | 66 |
| No-effect contracts | 3/3 checked · 3 contrast-verified |

### Declaradas en las tres superficies pero NO ejercitadas

Tienen binding en cada superficie y ninguna invocación llegó a ellas. Son el borde honesto de esta corrida: se listan en vez de redondearse.

- `satellite-create`
- `pattern-list`
- `pattern-get`
- `pattern-list-by-topology`

### Observaciones

Sin observaciones en la corrida registrada.

## Tracker — robots RoboSoft contra un clúster vivo

**Veredicto: `PASS`** — Medido `2026-08-04T03:52:26.502Z`, de la corrida `robosoft-2026-08-04T03-52-26-502Z.json`.

229 passed · 0 failed · 1 soft · 0 crashed

| Escenario | Veredicto | Comprobaciones |
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

