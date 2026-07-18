# UP-003 — Intake de Contribuciones de Usuario: Un Camino Trazable desde la Interfaz del Producto hasta el Release

> Navegación bilingüe: [English](./UP-003-user-contribution-intake-mechanism.md)

| Campo | Valor |
|---|---|
| **ID** | UP-003 |
| **Estado** | PROPOSED |
| **Fecha** | 2026-07-18 |
| **Iniciado por** | Evolith Architecture Board (análisis del mecanismo de contribución) |
| **Dirigido a** | Evolith Core Architecture Board |
| **Prioridad** | P1 |
| **Complejidad Estimada** | L |
| **ADR Relacionado** | ADR-0114 (propuesto — Intake de Contribuciones y Propuestas) · ADR-0101 (Core como Motor de Evaluación Stateless — restringe dónde puede persistirse una propuesta) |
| **GTs Relacionados** | [GT-552](../gaps/gap-reference-catalog.es.md#gt-552) · [GT-553](../gaps/gap-reference-catalog.es.md#gt-553) · [GT-554](../gaps/gap-reference-catalog.es.md#gt-554) · [GT-555](../gaps/gap-reference-catalog.es.md#gt-555) |

## Contexto

Un usuario que opera Evolith a través de cualquiera de sus interfaces publicadas **no tiene forma de proponer una mejora, solicitar una funcionalidad ni reportar un problema**. No es una brecha de documentación: la capacidad no existe en el código.

Verificado contra el source:

- **CLI** — 31 comandos (`adr`, `evaluate`, `gate`, `validate`, `waiver`, ...). Ninguno es `feedback`, `propose`, `suggest`, `issue` ni `report`.
- **Servidor MCP** — 47 tools `evolith-*`. Ninguna de intake; toda tool con capacidad de escritura escribe un artefacto de gobernanza (ADR, MoSCoW, scaffold, config, satélite).
- **Core API** — unos 25 endpoints. Ninguno acepta una propuesta. `POST /projects/propose-advance` es un cálculo de preparación de fase SDLC, no un envío de usuario.
- **agent-runtime** — 7 skills, todas de evaluación. `publish-trace-event` está declarada como placeholder no-op en `.harness/manifest.yaml`, y su vocabulario `TraceEventType` está cerrado a nueve eventos de ciclo de vida sin ningún tipo con contenido de usuario.
- Una búsqueda en todo el TypeScript del repositorio devuelve **cero ocurrencias** de `feedback`.

El único primitivo de petición originada por usuario que existe es el flujo de **waiver** (supresión de un hallazgo concreto de evaluación), y el único canal de usuario final que funciona es el reporte privado de vulnerabilidades de GitHub vía `SECURITY.md` — solo seguridad.

La consecuencia es que la mitad exterior de la trazabilidad está ausente. Lo que hoy se verifica por máquina es unidimensional e interno:

```
fila del board (GT-NNN) <-> sección de catálogo (#gt-nnn) <-> registro de cierre <-> {SHA de commit, rutas de evidencia, comandos de validación}
```

Nada registra **quién lo pidió**, qué **issue** lo discutió, qué **pull request** lo revisó ni qué **release** lo publicó. En 551 gaps hay cero referencias a un issue o pull request de GitHub, y la frase "reported by" aparece dos veces en todo el catálogo.

## Principio Rector (no negociable)

> Una propuesta es **entrada gobernada**, no una entidad que el Core posea. Según [ADR-0101](../../architecture/adrs/core/0101-core-stateless-evaluation-engine.md) el Core sigue siendo un evaluador stateless: puede **clasificar y enriquecer** una propuesta, pero el registro durable y la decisión viven fuera de él. Evolith **recomienda**; un humano **decide**. Ninguna propuesta entra al backlog sin aceptación humana explícita.

## Objetivo

Dar a cualquier usuario de cualquier interfaz de Evolith una forma única y trazable de proponer un cambio y seguirlo hasta el release que lo publica, sin debilitar las garantías de gobernanza existentes.

## Alcance — Entregables

### 1. Decisión y frontera (ADR)

Redactar `ADR-0114 — Intake de Contribuciones y Propuestas`: dónde se persiste una propuesta, qué puede y qué no puede hacer el Core con ella, y qué transiciones requieren un humano.

### 2. El agregado `Proposal` (core-domain)

No inventar un primitivo nuevo. Fusionar los dos que ya funcionan:

| Pieza existente | Qué aporta |
|---|---|
| `Waiver` (`src/packages/core-domain/src/domain/waiver.ts`) | El ciclo de vida: `requestedBy`, `requestedAt`, `approvedBy`, `approvedAt`, `status`, `version`, `supersedes`, más un store durable y una superficie CLI `request/approve/revise/list` ya en producción |
| Front-matter de `UP-NNN` | La metadata de gobernanza: `Iniciado por`, `Dirigido a`, `Prioridad`, `Complejidad Estimada`, `GTs Relacionados`, y la cadena probada UP a ADR a GT a evidencia de cierre |

`Proposal` = la máquina de estados del waiver portando la metadata del UP, más los campos de origen que el sistema nunca ha capturado: **superficie** (cli / mcp / rest), **versión del producto** y **fingerprint** para deduplicación.

### 3. Intake en las tres superficies (paridad BR-008)

`evolith propose` en la CLI, una tool MCP equivalente y un endpoint REST. La paridad no es opcional: es el contrato vigente de superficies.

### 4. Clasificación advisory por Winston

Una skill `classify-proposal` que enriquezca la propuesta con categoría propuesta (defecto, funcionalidad, deuda, gobernanza), verificación de duplicados contra fingerprints existentes, carril sugerido (`GT-` / `OPP-` / `UP-`) y pista de ADR relacionado. **Solo advisory**, coherente con el `DecisionRecommendation` no vinculante de ADR-0101.

### 5. Asignación de identificadores

**Este es el bloqueador estructural y debe resolverse antes del intake.** Los identificadores `GT-` se asignan mediante un ledger manual de bloqueo optimista (`../COORDINATION.md`): *"quien pushee primero el bump del ledger se queda el número"*. No hay script ni lint. El ledger está actualmente **desfasado en diez identificadores** — anuncia `GT-542` como próximo libre mientras el board ya llega a `GT-551`, lo que es en sí mismo la evidencia de que un ledger humano no puede absorber un intake automatizado.

Resolución propuesta: las propuestas reciben su propia secuencia `PR-NNN`, asignada programáticamente e independiente de `GT-`. La promoción a gap `GT-` ocurre **solo** con aceptación humana, lo que mantiene curado el backlog curado.

### 6. Cerrar la cadena exterior

Extender el esquema de evidencia de cierre (`../evidence/gap-closure-evidence-standard.md`) con `proposalRef`, `pullRequest` y `releasedIn`, para poder responder al usuario la pregunta que hoy el sistema no puede responder: *¿qué release contiene el arreglo de lo que propuse?*

### 7. Puente a GitHub

Un workflow que abra un issue a partir de una propuesta aceptada, portando el identificador `PR-NNN` y sus labels. Nótese que hoy **ningún workflow reacciona a eventos de issue, discussion, comment ni repository_dispatch**, y el único workflow que crea un issue automáticamente está condicionado a algo que nunca puede volverse cierto (ver [GT-552](../gaps/gap-reference-catalog.es.md#gt-552)).

## Frontera de automatización

| Automatizar (determinista, auditable) | Mantener humano (irreversible o de criterio) |
|---|---|
| Creación del registro, fingerprint, deduplicación | Aceptar o rechazar una propuesta |
| Clasificación y enriquecimiento por Winston | Asignar prioridad y carril |
| Creación del issue y referencias cruzadas | Aprobar el ADR cuando cambia la arquitectura |
| Mapeo a versión y notificación al usuario | Revisar y mergear el pull request |

## Qué debe conservarse para auditoría

Todo registro de propuesta debe ser inmutable y versionado (`supersedes`, como ya lo es el waiver), reteniendo: el **originador**, la **superficie y versión del producto** desde la que se levantó, la clasificación de Winston **con su razonamiento**, la decisión humana **con su autor y fecha**, y la cadena resuelta `ADR -> issue -> pull request -> commit -> release`.

## Riesgos

- **Dilución del backlog.** Mitigado por la secuencia `PR-NNN`: las propuestas nunca entran al board de gaps sin aceptación humana.
- **Identidad y privacidad.** Hoy `requestedBy` es un actor de texto libre; un intake real exige una decisión explícita sobre qué identidad se captura y se retiene.
- **Dependencia de un pipeline de release roto.** El entregable 6 no puede honrarse mientras `release-please` no pueda cortar una versión ([GT-552](../gaps/gap-reference-catalog.es.md#gt-552)).

## Decisiones Relacionadas

- [ADR-0101 — Core como Motor de Evaluación Stateless](../../architecture/adrs/core/0101-core-stateless-evaluation-engine.md)
- [UP-001 — Estándar Canónico de Gap-Tracking para Todos los Satélites](./UP-001-canonical-gap-tracking-standard.es.md)
- [UP-002 — Modelo de Gobernanza de Producto/Iniciativa](./UP-002-product-initiative-governance-model.es.md)
