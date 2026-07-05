# UP-001 — Estándar Canónico de Control de GAPs para Todos los Satélites

> Navegación bilingüe: [English](./UP-001-canonical-gap-tracking-standard.md)

| Campo | Valor |
|---|---|
| **ID** | UP-001 |
| **Estado** | PROPUESTO |
| **Fecha** | 2026-06-28 |
| **Iniciado por** | Evolith Tracker (satélite piloto) |
| **Dirigido a** | Architecture Board de Evolith Core |
| **Prioridad** | P0 |
| **Complejidad estimada** | XL |
| **GTs relacionados** | GT-292 · GT-335 · GT-367 · GT-369 · GT-373 · GT-275 · GT-280 |

## Contexto

El satélite **Evolith Tracker** importó el diseño de gap-tracking de Core (Board + Reference Catalog + Closure-Evidence Standard + `maturity-reconciliation.json`, con vocabulario `P0–P3` / `XS–XL` / status en backticks, IDs que enlazan al catálogo, orden pendientes-primero). La adopción confirmó que el diseño es sólido y reutilizable por satélites.

Sin embargo, hoy **cada repo controla sus gaps a su manera**, lo que rompe la regla de **fuente única de verdad**. Core es la autoridad de gobernanza: el estándar de control de GAPs debe nacer en Core, ser **obligatorio para todos los satélites**, y ser **operable desde las tres superficies de Core** (CLI, MCP, Core-API).

## Principio Rector (no negociable)

> *Un solo modelo, un solo esquema, un solo vocabulario y un solo flujo de cierre para los GAPs de cualquier repositorio Evolith (Core o satélite). Cero formatos ad-hoc.*

## Objetivo

Promover el sistema de gap-tracking de Core a **estándar canónico del ecosistema**, con **una sola forma de controlar gaps** para Core y todos los satélites, enforced por contrato y expuesto en CLI/MCP/API.

---

## Alcance — Entregables

### 1. Canonizar el Estándar (Esquema + ADR)

**1.1** Redactar un **ADR `core/00NN — Canonical Gap-Tracking Standard for All Satellites`** (ID calificado por categoría) que declare obligatorio, para Core y todo satélite, el sistema de 4 piezas:

| Pieza | Artefacto | Restricciones clave |
|---|---|---|
| **Board** | `*-gap-tracking.md` | Tabla única `ID \| Gap \| Component \| Phase \| Criticality \| Complexity \| Status`; `Criticality ∈ {P0,P1,P2,P3}`, `Complexity ∈ {XS,S,M,L,XL}`, `Status ∈ {PENDING,IN-PROGRESS,BLOCKED,DEFERRED,DONE}` en backticks; IDs enlazan al catálogo; orden pendientes-primero (P0→P3, luego XS→XL); footer con **Progress** + log de **Waves**. |
| **Catálogo** | `*-gap-reference-catalog.md` | `#### <ID>` + `**Title**` + viñetas (Purpose / Evidence / Impact / Risk / Affected files / Complexity / Proposed fix / Acceptance criteria con checkboxes / Dependencies). |
| **Closure-Evidence Standard** | `*-gap-closure-evidence-standard.md` + `*-gap-closure-evidence.json` | Un record por `DONE`: `{id, closedAt, closureCommit, evidence[], validationCommands[], dependencyDisposition, dependencyRationale}`. |
| **Maturity Reconciliation** | `*-maturity-reconciliation.json` | Conteos + readiness, **independiente por repo**. Core ya marca `Evolith Tracker → maturityIncluded:false`. |

**1.2** Crear los **JSON Schemas** en `rulesets/schema/`:

- `gap-board.schema.json`
- `gap-catalog-entry.schema.json`
- `gap-closure-evidence.schema.json`
- `maturity-reconciliation.schema.json`

Idioma canónico de artefactos machine-readable: **inglés** (ADR-0090).

---

### 2. Enforcement por Contrato (satellite-contracts + OPA)

**2.1** Extender **`rulesets/satellite-contracts/satellite-contracts.rules.json`** (GT-292) con un contrato `gap-tracking` que exija a cada satélite:

- Los cuatro archivos en ubicación canónica.
- Board válido contra schema.
- Sin `#detail-` rotos.
- Paridad board↔catálogo.
- Closure-records para cada `DONE` (con **grandfathering** explícito para registros legacy).

**2.2** Añadir las **reglas OPA** equivalentes y conectarlas al **pipeline `POST /api/v1/evaluate`** (`SatelliteEvaluationPipeline`), de modo que la **conformidad del gap-tracking sea criterio evaluado** de un satélite. Resultado por regla: `passed | failed | skipped`.

---

### 3. Superficie de Control en Core — Una Sola Forma, Tres Interfaces con Paridad (BR-008)

**3.1 CLI** — añadir el grupo **`evolith gap`** (hoy no existe; sí existen `adr / gate / phase / sdlc / validate`):

```
evolith gap list [--status --criticality --component --satellite <id>]
evolith gap show <ID>
evolith gap add
evolith gap close <ID> --commit <sha> --evidence <files>
evolith gap validate
evolith gap reconcile
evolith gap init          # scaffold de los 4 archivos canónicos
```

Promover la lógica ya existente en harness a dominio/CLI reutilizable: **`08-validate-tracking.mjs`**, **`reconcile-maturity.mjs`**, **`sync-tracking-order.mjs`**, **`fix-tracking-parity.mjs`**.

**3.2 MCP** — expandir **`read-gap-tracking`** (`packages/mcp-tools/src/tools/read-gap-tracking.js`, GT-335) a un toolset con paridad CLI:

```
evolith-gap-list
evolith-gap-show
evolith-gap-add
evolith-gap-close
evolith-gap-validate
```

Las herramientas mutativas: human-in-the-loop + ABAC, igual que el resto de tools mutativas.

**3.3 Core-API** — exponer, vía registro de satélites (GT-367/369/373), con envelope **ADR-0073** (REST-only per ADR-0074):

| Endpoint | Descripción |
|---|---|
| `GET /api/v1/gaps` | Board de gaps de Core como dato |
| `GET /api/v1/satellites/{id}/gaps` | Board de gaps de cualquier satélite |
| `GET /api/v1/gaps/summary` | Agregado cross-ecosistema |

Esto habilita que el Tracker renderice **un único panel de gaps de todo el ecosistema**.

---

### 4. Dominio y Registro

**4.1** Modelar el gap como dato consultable (reutilizar el patrón GT-280 "SDLC como datos"): un loader `GapBoardLoaderService` + tipos `GapRecord` / `ClosureRecord` en `core-domain`, consumidos por CLI/MCP/API sin duplicar parsing.

**4.2** Vincular con el registro de satélites (GT-369 `SatelliteRecord`, GT-367 registry CRUD, GT-373 Tracker integration): cada `SatelliteRecord` referencia su board/catálogo y su `maturity-reconciliation.json`.

---

### 5. Migración y Referencia

**5.1** Proveer **`evolith gap init`** para scaffolding y una guía de migración desde registros legacy **con grandfathering** (como hizo Core en GT-275 y el Tracker con sus 80 entradas `DONE` legacy).

**5.2** Usar la **implementación de referencia ya hecha en Evolith Tracker** como satélite piloto:

| Archivo | Descripción |
|---|---|
| `docs/audit/tracker-gap-tracking.md` | Board de gaps (piloto) |
| `docs/audit/tracker-gap-reference-catalog.md` | Catálogo (piloto) |
| `docs/audit/tracker-gap-closure-evidence-standard.md` | Estándar de cierre (EN) |
| `docs/audit/tracker-gap-closure-evidence-standard.es.md` | Estándar de cierre (ES) |
| `docs/audit/tracker-gap-closure-evidence.json` | Registros de cierre |
| `docs/audit/tracker-maturity-reconciliation.json` | Reconciliación de madurez |

---

## Criterios de Aceptación

- [ ] ADR `core/00NN` aprobado: el estándar de 4 piezas es **obligatorio** para Core y todos los satélites.
- [ ] 4 JSON Schemas en `rulesets/schema/` + contrato `gap-tracking` en `satellite-contracts` + reglas OPA conectadas a `/evaluate`.
- [ ] `evolith gap …` (CLI), `evolith-gap-*` (MCP) y `/api/v1/gaps[…]` (API) operativos **con paridad** (BR-008) y envelope ADR-0073.
- [ ] Un satélite no conforme **falla** la evaluación de Core (regla `gap-tracking` en estado `failed`).
- [ ] **Cero formatos divergentes**: queda una única forma de controlar gaps; los registros ad-hoc quedan deprecados.
- [ ] Bilingüe donde aplica (docs) e inglés canónico para artefactos machine-readable (ADR-0090).
- [ ] Tracker consume `/api/v1/gaps/summary` y muestra el panel unificado de gaps del ecosistema.

---

## Anclas Reales de Core

| Artefacto | Ruta |
|---|---|
| Gap Tracking Board | `reference/core/control-center/gaps/gap-tracking.md` |
| Gap Reference Catalog | `reference/core/control-center/gaps/gap-reference-catalog.md` |
| Closure-Evidence Standard | `reference/core/control-center/evidence/gap-closure-evidence-standard.md` |
| Maturity Reconciliation | `reference/core/control-center/maturity-reports/maturity-reconciliation.json` |
| Satellite Contracts Ruleset | `rulesets/satellite-contracts/satellite-contracts.rules.json` |
| Validate Tracking Harness | `.harness/scripts/ci/08-validate-tracking.mjs` |
| Reconcile Maturity Harness | `.harness/scripts/reconcile-maturity.mjs` |
| Sync Tracking Order Harness | `.harness/scripts/sync-tracking-order.mjs` |
| MCP Read Gap Tracking | `packages/mcp-tools/src/tools/read-gap-tracking.js` |
| Core API | `apps/core-api` (ADR-0074 / ADR-0073) |

---

## Notas de Implementación

- **Solo REST** — sin GraphQL/SSE (Core es REST-only per ADR-0074).
- **Fuente única de verdad** permanece inviolable: el board de Core y el de cada satélite son distintos; el agregado lo sirve Core-API.
- Entregar: ADR + schemas + ruleset/OPA + CLI/MCP/API + guía de migración + actualización del gap-tracking de Core registrando esta iniciativa como nuevos `GT-*`.
- **Satélite piloto**: Evolith Tracker (implementación de referencia ya completa y operativa).

---

[Volver al Índice de Propuestas Upstream](../../sdlc/governance/DECISIONS.es.md) · [Hub de Gobernanza](../../sdlc/governance/README.es.md)
