# Contribuyendo a Evolith Core

Bienvenido a **Evolith Core**! Estamos encantados de que tengas interés en contribuir.

Evolith no es una plantilla convencional de inicio de aplicaciones. Es un **marco de gobernanza arquitectónica ejecutable** — un conjunto vivo de leyes técnicas, ADRs, políticas OPA, contratos JSON-Schema y definiciones de Agentes de IA que actúan como la referencia corporativa para los productos satélite.

Para asegurar que todo fluya sin fricciones, por favor toma un momento para revisar nuestro modelo único de contribución.

## 1. El Método BMAD y los Agentes de IA

En el core utilizamos el **Método BMAD** (Desarrollo impulsado por IA y basado en Especificaciones). Esto significa que no tienes que codificar o escribir documentación solo. Puedes (y debes) invocar a nuestros agentes de IA especializados desde tu IDE o prompts para que te asistan:

- **Winston (Arquitecto Principal):** Úsalo para auditorías arquitectónicas y tracking de gaps.
- **Agente Arquitecto:** Ayuda a definir contratos Data Mesh, patrones Event-Driven, y a redactar ADRs.
- **Agente Desarrollador:** Ayuda a implementar patrones seguros (OWASP) y patrones de arquitectura progresiva.
- **Agente QA:** Asiste en las pruebas de contratos y validación de políticas Rego.
- **Agente DevOps:** Ayuda a orquestar despliegues distribuidos y flujos de GitHub Actions.
- **Agente Docs:** Gestiona traducciones y validaciones de Markdown.

El catálogo de agentes, contratos y handoffs está documentado en [AGENTS.es.md](./AGENTS.es.md). Para una orientación detallada, revisa nuestra [Guía de Inicio Rápido](./reference/core/foundations/inheritance-model/product-quick-start.es.md).

## 2. Prerrequisitos y Configuración Local

Evolith es un **monorepo de npm workspaces** (`src/sdk/*`, `src/apps/*`, `src/packages/*`). El Evolith CLI vive en `src/sdk/cli` (publicado como `@beyondnet/evolith-cli`), la Core-API en `src/apps/core-api`, y la lógica compartida en `src/packages/*` (`core`, `core-domain`, `infra-providers`, `mcp-server`, `mcp-tools`, `sdk-client`).

### A. Prerrequisitos

- **Node.js 20** es lo que ejecuta CI. El CLI declara `engines.node >= 18.0.0`, pero fija Node 20 localmente para coincidir con el pipeline.
- **npm** (compatible con workspaces; viene con Node).
- **Git** con el modelo de ramificación GitFlow (ver [ADR-0050](./reference/core/architecture/adrs/core/0050-gitflow-branching-strategy.es.md)).

### B. Clonar e Instalar

```bash
# Clona el repositorio
git clone https://github.com/beyondnetcode/evolith_arch32.git
cd evolith_arch32

# Instala todos los workspaces desde la raíz del repo
npm install
```

`npm install` resuelve todos los workspaces de una vez. Los hooks de Husky se conectan mediante el script `prepare` de la raíz durante la instalación.

### C. Build

Algunos workspaces dependen entre sí, así que construye primero los paquetes compartidos y luego el CLI:

```bash
# Construye los workspaces compartidos (el orden importa)
npm run build -w @beyondnet/evolith-core-domain
npm run build -w @beyondnet/evolith-infra-providers
npm run build -w @beyondnet/evolith-core
npm run build -w @beyondnet/evolith-mcp

# Construye el Evolith CLI
npm run build -w @beyondnet/evolith-cli
```

Para compilar las políticas OPA a WASM (requerido por el gate de paridad OPA), ejecuta `npm run build:policy` desde la raíz.

## 3. Ejecución de Pruebas

Las pruebas se ejecutan por workspace. El Evolith CLI concentra las suites principales:

```bash
# Pruebas unitarias (Evolith CLI)
npm run test:unit -w @beyondnet/evolith-cli

# Pruebas end-to-end (Evolith CLI)
npm run test:e2e -w @beyondnet/evolith-cli

# Unitarias + e2e juntas
npm test -w @beyondnet/evolith-cli

# Cobertura (CI exige un umbral del 80% de sentencias)
npm run test:cov -w @beyondnet/evolith-cli

# Smoke test de MCP stdio + HTTP
npm run mcp:smoke -w @beyondnet/evolith-cli

# Suite de conformidad de contratos (desde la raíz)
npm run test:contract
```

## 4. Las Reglas de Oro de Evolith

Antes de enviar un Pull Request, debes adherirte a estas reglas absolutas. Los gates de CI listados en cada sección bloquearán tu PR si se incumplen.

### A. Paridad Bilingüe Obligatoria

Evolith opera globalmente. **Cada archivo de documentación debe tener una versión en inglés (`.md`) y otra en español (`.es.md`).** Ambas deben ser estructuralmente idénticas: la misma cantidad de encabezados `##` y `###` (el gate `04-check-bilingual-parity.mjs` cuenta únicamente los encabezados de nivel 2 y nivel 3; el título de nivel `#` no se cuenta). El Agente Docs puede asistirte con esta traducción.

### B. Sin Emojis ni Caracteres Decorativos

El gate `01-validate-docs.mjs` rechaza emojis, símbolos pictográficos, el BOM UTF-8, el carácter de reemplazo, finales de línea CRLF y mojibake conocido. Escribe Markdown con puntuación ASCII simple y finales de línea LF.

### C. Solo Enlaces Relativos Válidos

Cada enlace relativo de Markdown (y su `#ancla`) debe resolver a un archivo existente. Confirma el destino antes de enlazar; los enlaces rotos hacen fallar el gate de docs.

### D. Agnosticismo Arquitectónico

A menos que estés editando un *Authoritative Tech Stack Profile* específico, mantén la referencia agnóstica. No asumas un runtime, framework o proveedor cloud específico en los estándares base sin un ADR aprobado.

### E. Quality Gates de Validación

Debes validar tu trabajo localmente. Los hooks `pre-commit` de Husky revisan tu trabajo automáticamente, pero ejecuta estos scripts manualmente desde la raíz antes de hacer commit:

```bash
# Valida todos los enlaces Markdown, anclas, diagramas Mermaid y caracteres prohibidos
node .harness/scripts/ci/01-validate-docs.mjs

# Verifica la paridad estructural bilingüe (igual cantidad de ## y ###)
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

Si estos scripts fallan, el pipeline de CI bloqueará tu PR.

## 5. Estándares por Área de Contribución

Cada superficie tiene sus propios validadores. Confirma tu cambio contra los archivos reales antes de editar — si un hallazgo es un falso positivo, repórtalo en lugar de cambiar código correcto.

### A. Documentación

Mantén EN y ES en sincronía (Regla 4.A), sin emojis (Regla 4.B), enlaces válidos (Regla 4.C). El lint de terminología bilingüe (`bilingual-terminology-lint.mjs`) y el chequeo de cobertura (`bilingual-coverage.mjs`) también corren en CI.

### B. Schemas

Los contratos JSON-Schema viven en `src/rulesets/schema/`. Los cambios se verifican con el gate de conformidad de contratos (`10-validate-contract-conformance.mjs`) y el gate de envelope/versionado REST (`19-validate-rest-versioning.mjs`). Mantén el contrato máquina en `src/rulesets/contracts/` sincronizado.

### C. Rulesets y OPA

Las reglas nativas se declaran por dominio bajo `src/rulesets/<dominio>/`, y sus contrapartes Rego ejecutables viven en `src/rulesets/opa/`. **Native y OPA deben mantenerse en paridad de rule-ID:** los gates de paridad fallan en cerrado ante cualquier drift de verdict, rule-ID, severidad o evidencia.

- Fixtures del evaluador nativo: `28-native-evaluator-parity.mjs`.
- Paridad semántica Native/OPA: `27-opa-parity-gate.mjs` (acotado por commit; un barrido completo programado corre a diario). Recompila las políticas con `npm run build:policy` tras tocar cualquier archivo `.rego`.

### D. Fases, Gates y Topologías

Las fases SDLC son `f1` Conception and Discovery hasta `f5` Delivery and Operations, con gates `gate-f1` a `gate-f5`. `F1`–`F5` son **niveles de madurez, no fases**. Las ocho topologías son modular-monolith, distributed-modules, microservices, event-driven, serverless, edge-computing, data-mesh y agentic-ai. Los namespaces de fase y topología deben mantenerse disjuntos — el guard `30-validate-phase-topology-disjoint.mjs` lo impone. La cobertura y composición de reglas de topología se verifican con `26-validate-topology-rule-coverage.mjs` y `22-validate-topology-composition.mjs`.

### E. CLI

El Evolith CLI (`@beyondnet/evolith-cli`, actualmente v1.1.4) usa las familias de claves discovery / design / construction / qa / release, configuradas mediante `evolith.yaml`. Ejecuta el lint de fronteras de arquitectura (`eslint-plugin-boundaries`) y el type check antes de hacer push:

```bash
npm run lint -w @beyondnet/evolith-cli
npm run build -w @beyondnet/evolith-cli
```

### F. MCP

El servidor MCP se distribuye dentro de `@beyondnet/evolith-cli` y soporta los transportes stdio y Streamable HTTP. Valídalo con `npm run mcp:smoke -w @beyondnet/evolith-cli`. La paridad de superficie y compatibilidad se imponen con `20-validate-surface-compatibility.mjs` y `24-check-surface-parity.mjs`.

### G. Core-API

La Core-API es **solo REST** (sin GraphQL, sin SSE), servida bajo `/api/v1`. Cada respuesta usa el envelope plano de ADR-0073 (`meta.command`, `executedAt`, `durationMs`, `correlationId`, `context`, `schemaVersion`); los errores siguen RFC 9457. El gate `19-validate-rest-versioning.mjs` impone el versionado y la forma del envelope.

### H. Tracker

Las superficies de seguimiento viven bajo [`reference/core/control-center/`](./reference/core/control-center/README.es.md):

- [`gaps/gap-tracking.es.md`](./reference/core/control-center/gaps/gap-tracking.es.md) — el board, una fila por gap. Es la fuente canónica de estado.
- [`gaps/gap-reference-catalog.es.md`](./reference/core/control-center/gaps/gap-reference-catalog.es.md) — el detalle completo detrás de cada fila del board.
- [`maturity-reports/maturity-assessment.es.md`](./reference/core/control-center/maturity-reports/maturity-assessment.es.md) — la superficie de madurez.
- [`evidence/gap-closure-evidence.json`](./reference/core/control-center/evidence/gap-closure-evidence.json) — el registro de cierre legible por máquina.

Estas son las **únicas** superficies de seguimiento. Actualízalas a través de sus pares bilingües y mantén la evidencia de cierre sincronizada; los gates `08-validate-tracking.mjs` y `09-reconcile-maturity.mjs` las verifican. La Sección 6 describe el procedimiento de alta de punta a punta.

## 6. Cómo Registrar un Gap

Un gap (`GT-###`) es la forma en que un hallazgo se convierte en trabajo rastreado. Nada se genera automáticamente: todos los artefactos de abajo se escriben a mano, y `08-validate-tracking.mjs` hace fallar el build si alguno falta o es inconsistente. Lee el [Estándar de Evidencia de Cierre de Gaps](./reference/core/control-center/evidence/gap-closure-evidence-standard.es.md) antes de empezar.

### A. Reserva Primero el Identificador

Los números `GT-` son un **asignador global compartido**: las sesiones en paralelo colisionan si dos leen-y-escriben a la vez. El [Ledger de Coordinación de Sesiones](./reference/core/control-center/COORDINATION.es.md) es el único lugar para reclamar uno, con el protocolo reservar-luego-push:

1. `git fetch origin` y lee la tabla *Allocator registers* del ledger.
2. Toma el valor `GT-` libre actual, incrementa el registro en el ledger y **haz push de ese archivo primero**, en su propio commit mínimo. Eso reserva el número para ti.
3. Si el push es rechazado, alguien se adelantó: vuelve a hacer fetch, toma el nuevo valor libre y reintenta. Nunca uses `--force`.
4. Solo entonces crea la fila del board y la entrada de catálogo que usan ese número.

Quien haga push del incremento primero es dueño del número. El mismo protocolo rige los números de ADR. Declara tu carril en la tabla *Active lanes* para que dos sesiones no editen las mismas filas.

### B. Agrega la Fila del Board

Agrega una fila a `gap-tracking.md` **y** a su contraparte en español `gap-tracking.es.md`. Las columnas son `ID | Gap | Component | Phase | Criticality | Complexity | Status`:

- `ID` es un enlace al ancla del catálogo, escrito como ``[`GT-###`](./gap-reference-catalog.es.md#gt-###)``. El guard lee el ID desde los backticks, así que el formato no es cosmético.
- `Gap` es un enunciado en negrita del problema, en una línea, seguido de la evidencia y el fix propuesto.
- `Criticality` es `P0`-`P3`; `Complexity` es `XS`-`XL`.
- `Status` es uno de `PENDIENTE`, `EN-PROGRESO`, `COMPLETADO`, `DIFERIDO` (inglés: `PENDING`, `IN-PROGRESS`, `DONE`, `DEFERRED`). El guard compara EN y ES fila por fila: mismo orden de IDs y estado semánticamente igual, o falla.

Las filas se ordenan primero las pendientes (por criticidad, luego complejidad) y después las completadas. Actualiza el contador `**Progreso:** N / T completados · ... ` en un commit pequeño y dedicado de sincronización del board, inmediatamente después de un `git fetch`, y haz push enseguida — esa única línea es el texto de mayor contención del repositorio.

### C. Escribe la Entrada de Catálogo en Ambos Idiomas

Cada fila del board necesita una sección en `gap-reference-catalog.md` **y** en `gap-reference-catalog.es.md`. El encabezado debe ser exactamente `#### GT-###` en su propia línea; el guard busca esa forma literal. El cuerpo sigue el esquema establecido:

```markdown
#### GT-###

**Título:** Una frase que nombra el defecto, no el deseo.

- **Propósito:** Qué debe lograr el cambio.
- **Evidencia:** Los hechos observados, con rutas, conteos y comandos reales.
- **Impacto:** Qué se rompe o es inalcanzable hoy.
- **Riesgo:** Qué cuesta dejarlo sin arreglar.
- **Archivos afectados:** Las rutas concretas.
- **Componente:** `Nombre` · **Dimensión:** Gobernanza · **Tipo:** docs
- **Criticidad:** P2 · **Complejidad:** S
- **Fix propuesto:** Cómo se pretende cerrarlo.
- **Criterios de aceptación:**
  - [ ] Un enunciado verificable, uno por entregable.
- **Dependencias:** Otros gaps o propuestas, o `ninguna`.
- **Estado:** `PENDIENTE`
```

Todo criterio de aceptación debe ser verificable por alguien que no lo escribió. Al cerrar el gap, **cada** `- [ ]` debe pasar a `- [x]` en **ambos** idiomas: un criterio sin marcar bajo un estado `COMPLETADO` hace fallar al guard.

### D. Registra la Evidencia de Cierre

Una fila `COMPLETADO` sin registro de cierre es un fallo de build. Añade exactamente un objeto al arreglo `closures` de [`gap-closure-evidence.json`](./reference/core/control-center/evidence/gap-closure-evidence.json):

```json
{
  "id": "GT-###",
  "closedAt": "2026-07-18",
  "closureCommit": "83539a29",
  "evidence": ["ruta/a/un/archivo/que/lo/prueba.ts"],
  "validationCommands": ["node .harness/scripts/ci/08-validate-tracking.mjs"],
  "dependencyDisposition": "none",
  "dependencyRationale": "Obligatorio cuando la disposición no es none."
}
```

`closedAt` no puede estar en el futuro, `closureCommit` debe ser un commit que exista en el repositorio, y cada ruta de `evidence` debe resolver a un archivo real — el guard verifica las tres cosas. `dependencyDisposition` es uno de `none`, `satisfied`, `accepted-scope`, `deferred`. El registro es append-only y su idioma canónico es el inglés. Los gaps pendientes, en progreso y diferidos **no** deben tener un registro de cierre activo. No se acepta ningún commit de relleno, evidencia especulativa ni criterio dispensado.

### E. Valida Antes de Hacer Push

Ejecuta el guard desde la raíz del repositorio y asegúrate de que esté en verde:

```bash
node .harness/scripts/ci/08-validate-tracking.mjs
node .harness/scripts/ci/01-validate-docs.mjs
node .harness/scripts/ci/04-check-bilingual-parity.mjs
```

Si solo quieres reportar un hallazgo y no rastrearlo tú mismo, abre un issue — el [selector de issues](https://github.com/beyondnetcode/evolith_arch32/issues/new/choose) ofrece reporte de bug, solicitud de funcionalidad, gap de documentación y propuesta de ADR. Un mantenedor asignará el `GT-###` por ti.

## 7. Proceso de Pull Request

1. **Ramificación (Branching):** Sigue el [ADR-0050](./reference/core/architecture/adrs/core/0050-gitflow-branching-strategy.es.md). El trabajo de features fluye hacia `develop`, y `develop` se promueve a `main`. Prefija tus ramas correctamente (ej. `feature/`, `docs/`, `fix/`).
2. **Actualización de ADRs:** Si tu PR introduce un cambio arquitectónico o una nueva herramienta, *debe* ir acompañado de una actualización a un ADR existente o un nuevo ADR según el [ADR-0068](./reference/core/architecture/adrs/core/0068-documentation-release-gitflow.es.md).
3. **Mensajes de Commit:** Usamos versionamiento semántico y release-please. Tus commits deben seguir la especificación [Conventional Commits](https://www.conventionalcommits.org/), usando tipos como `feat`, `fix`, `docs`, `ci` y `chore` (ej. `feat:`, `docs:`, `fix:`).
4. **Issues:** Abre un issue antes de cambios grandes para que el diseño pueda discutirse. Referencia el identificador de gap `GT-###` correspondiente cuando tu trabajo cierre un gap rastreado.
5. **Revisión de Código:** Todos los PR requieren revisión. Nuestros flujos automatizados publican en tu PR el impacto de cobertura, la validación estructural y los resultados de la revisión agéntica de Winston.

Gracias por ayudarnos a evolucionar el core!
