# Cuadro de escenarios E2E

> **Bilingual Navigation:** [English version](./e2e-scenario-board.md)

Qué ejercitan las suites de extremo a extremo, y qué observaron. **Generado — no editar a mano.**

> Esta página NO es un backlog. El estado de un defecto vive en [`gap-tracking.es.md`](../gaps/gap-tracking.es.md) y en ningún otro sitio; esta página cita `GT-NNN` y nunca es dueña de uno. Responde a *qué escenarios existen, cuáles corrieron y qué se vio*.

Regenerar con: `node .harness/scripts/generate-e2e-scenario-board.mjs`

## Core — exploración cross-superficie (CLI · MCP · REST)

Medido `2026-08-04T22:17:22.757Z`. Producido por: `npm run test:exploration`.

| Medida | Valor |
|---|---|
| Operations declared | 73 |
| Exposed per surface | CLI 42 · MCP 47 · REST 31 |
| Declared on all three | 14 |
| With a binding | 51 |
| Actually executed | 51 |
| Surface invocations | 75 |
| No-effect contracts | 3/3 checked · 3 contrast-verified |

### Declaradas en las tres superficies pero NO ejercitadas

Tienen binding en cada superficie y ninguna invocación llegó a ellas. Son el borde honesto de esta corrida: se listan en vez de redondearse.

- `satellite-create`

### Observaciones

Sin observaciones en la corrida registrada.

## Tracker — robots RoboSoft contra un clúster vivo

**Veredicto: `PASS`** — Medido `2026-08-04T15:50:43.110Z`, de la corrida `robosoft-2026-08-04T15-50-43-110Z.json`.

13 passed · 0 failed · 1 soft · 0 crashed

| Escenario | Veredicto | Comprobaciones |
|---|---|---|
| `core-integration` | PASS | 13 ok · 0 failed · 1 soft |

