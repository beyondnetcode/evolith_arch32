# UP-001 — Estándar Canónico de Control de GAPs para Todos los Satélites

> Navegación bilingüe: [English](./UP-001-canonical-gap-tracking-standard.md)

| Campo | Valor |
|---|---|
| **ID** | UP-001 |
| **Estado** | PROPUESTO |
| **Fecha** | 2026-06-28 |
| **Última enmienda** | 2026-07-18 — Enmienda 1 (esquema de columnas del board, ver §6) |
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
| **Board** | `*-gap-tracking.md` | Tabla única `ID \| Gap \| Qué significa \| Ejemplo \| Componente \| Fase \| Criticidad \| Complejidad \| Estado` (reglas de columna en §6); `Criticality ∈ {P0,P1,P2,P3}`, `Complexity ∈ {XS,S,M,L,XL}`, `Status ∈ {PENDING,IN-PROGRESS,BLOCKED,DEFERRED,DONE}` en backticks; IDs enlazan al catálogo; orden pendientes-primero (P0→P3, luego XS→XL); footer con **Progress** + log de **Waves**. |
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

### 6. Enmienda 1 — Esquema de Columnas del Board (2026-07-18)

**Aprobada por el owner.** Esta enmienda es normativa y sustituye al esquema de siete columnas declarado en §1.1. Aplica a Core y a todo satélite que replique este estándar.

#### 6.1 Por qué

El board y el catálogo tienen trabajos distintos, y el estándar ya lo dice: el board es el conjunto de **titulares**, el catálogo es el **detalle**. La columna `Gap` dejó de honrar esa separación y se convirtió en un changelog — las filas acumulan historia sesión a sesión, fechas, hashes de commit, hallazgos ya superados y markdown anidado dentro de una sola celda de tabla. Una fila de varios cientos de palabras es ilegible como tabla y duplica la entrada de catálogo que ya contiene ese mismo material. La corrección restaura la separación y añade las dos columnas que un lector no especialista necesita para entender una fila sin abrir el catálogo.

#### 6.2 Nuevo esquema

| Idioma | Fila de cabecera |
|---|---|
| **EN** | `\| ID \| Gap \| What it means \| Example \| Component \| Phase \| Criticality \| Complexity \| Status \|` |
| **ES** | `\| ID \| Gap \| Qué significa \| Ejemplo \| Componente \| Fase \| Criticidad \| Complejidad \| Estado \|` |

Las dos columnas nuevas se insertan **después de `Gap`**. El resto de columnas conserva su significado, vocabulario y reglas de orden de §1.1. El `gap-board.schema.json` de §1.2, cuando se redacte, debe codificar esta forma de nueve columnas, no la de siete ya sustituida.

#### 6.3 Reglas de columna (la sustancia de esta enmienda)

| Columna | Regla |
|---|---|
| **`Gap`** | UNA sola frase, en presente, de unos 100 caracteres, que enuncie qué está roto. Sin historia, sin hashes de commit, sin fechas, sin prefijos `RESUELTO:`, sin markdown anidado. El avance y la narrativa de cierre van en la **entrada de catálogo**, nunca en la fila. |
| **`Qué significa`** | Lenguaje llano para un lector que no es ingeniero y no tiene contexto. Sin jerga, sin identificadores, sin rutas de archivo. Explica la **CONSECUENCIA**, no el mecanismo. |
| **`Ejemplo`** | Un caso concreto que lo haga evidente — un número medido o un comportamiento observado. No una reformulación de la celda `Gap` con otras palabras. |

#### 6.4 Ejemplos de referencia

Estos son los ejemplos trabajados aprobados por el owner. Los implementadores se calibran contra ellos.

| ID | Gap | Qué significa | Ejemplo |
|---|---|---|---|
| `GT-556` | Los checks resuelven rutas desde el directorio donde se los invocó | Una verificación automática daba una respuesta distinta según desde dónde la ejecutaras, y siempre decía que todo estaba bien | Desde la raíz del repo veía 8 elementos; desde `src/` veía 5. Aprobaba en ambos casos |
| `GT-560` | El interruptor de protección no está conectado a nada | Existe un mecanismo para evitar que una caída externa tumbe el servicio, pero no protege ninguna llamada real | La evaluación de arquitectura puntuó resiliencia 7/10 citando ese mecanismo, que nadie usa |
| `GT-563` | La validación de documentación nunca corrió en CI | El check existía y reportaba verde sin haber inspeccionado nada, porque solo corría si alguien lo lanzaba a mano | 174 errores reales convivieron con un CI en verde durante semanas |

#### 6.5 Restricción impuesta a los implementadores

El guard de tracking (`.harness/scripts/ci/08-validate-tracking.mjs`) localiza la columna de estado **por nombre de cabecera, no por posición**: abre una tabla en una línea que empieza con `| ID |` y halla el índice de estado comparando el texto de cabecera contra `Status` / `State` / `Estado` / `Estat`. Añadir columnas es por tanto seguro — pero solo mientras se cumplan estas tres condiciones, que el estándar exige a todo board conforme:

- La fila de cabecera sigue **empezando con `| ID |`**.
- La fila de cabecera sigue **conteniendo `Status` (EN) o `Estado` (ES)** como nombre de columna.
- El id del gap permanece en la **primera columna**.

Un board que renombre la cabecera de estado, saque el id de la posición uno o rompa el prefijo `| ID |` dejará de ser parseado en silencio. Todo cambio futuro de columnas debe preservar estos tres invariantes.

#### 6.6 La migración puede hacerse por olas

El commit `ce658404` corrigió el guard para parsear las filas **posicionalmente**. Antes partía las filas con `filter(Boolean)`, que descartaba las celdas vacías en lugar de solo las vacías producidas por los pipes inicial y final — así que una sola celda en blanco desplazaba todas las columnas siguientes y el estado se leía de la columna equivocada, o como `undefined`.

Gracias a esa corrección, **un board parcialmente migrado parsea correctamente en vez de leerse mal**: las filas que ya llevan las nueve columnas y las que aún llevan siete pueden convivir mientras una migración está en vuelo, y las filas con la celda `Qué significa` o `Ejemplo` sin rellenar mantienen alineadas el resto de columnas. Esta es la propiedad que hace tratable la migración, y es la razón por la que los boards **pueden** migrarse por olas en vez de en una única reescritura atómica. Regístrese como precondición: un satélite cuyo guard sea anterior a `ce658404` debe incorporar esa corrección antes de iniciar una migración por olas.

#### 6.7 Alcance de la migración

| Board | Filas a migrar |
|---|---|
| Evolith Core — `gap-tracking.md` + `gap-tracking.es.md` | 565 filas por idioma |
| Evolith Tracker — `tracker-gap-tracking.md` (+ ES) | 215 filas |

La historia desplazada de una celda `Gap` no se descarta: se traslada a la entrada de catálogo correspondiente, que es donde el estándar ya ubica el detalle.

---

## Criterios de Aceptación

- [ ] ADR `core/00NN` aprobado: el estándar de 4 piezas es **obligatorio** para Core y todos los satélites.
- [ ] 4 JSON Schemas en `rulesets/schema/` + contrato `gap-tracking` en `satellite-contracts` + reglas OPA conectadas a `/evaluate`.
- [ ] `evolith gap …` (CLI), `evolith-gap-*` (MCP) y `/api/v1/gaps[…]` (API) operativos **con paridad** (BR-008) y envelope ADR-0073.
- [ ] Un satélite no conforme **falla** la evaluación de Core (regla `gap-tracking` en estado `failed`).
- [ ] **Cero formatos divergentes**: queda una única forma de controlar gaps; los registros ad-hoc quedan deprecados.
- [ ] Bilingüe donde aplica (docs) e inglés canónico para artefactos machine-readable (ADR-0090).
- [ ] Tracker consume `/api/v1/gaps/summary` y muestra el panel unificado de gaps del ecosistema.
- [ ] **Enmienda 1**: todo board conforme lleva el esquema de nueve columnas de §6.2, y `Gap` / `Qué significa` / `Ejemplo` cumplen las reglas de §6.3 — ninguna fila conserva historia, fechas ni hashes de commit en la celda `Gap`.
- [ ] **Enmienda 1**: Core (565 filas por idioma) y Tracker (215 filas) están migrados, con la historia desplazada reubicada en el catálogo y los tres invariantes del guard de §6.5 intactos.

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
