> **Navegación bilingüe:** [View English version](./0109-multi-project-satellite-governance.md)

# ADR-0109: Gobernanza de Satélites Multi-Proyecto (Satélites Monorepo)

> **Firma del agente:** Agente Arquitecto (Winston)

## Estado
Aceptado

## Fecha
2026-07-09

## Contexto y problema
Los tres productos .NET — **MMS**, **UMS** y **Evolith Tracker** — se consolidan en un único
**monorepo de productos**, mientras **Evolith Core** (`evolith_arch32`) permanece como corpus de
gobernanza/referencia soberano y separado. Esa dirección se eligió tras un análisis fundamentado y
verificado adversarialmente: absorber los productos *dentro* de Core violaría los cuatro invariantes
que lo definen (corpus-de-referencia-no-app, motor stateless por ADR-0101, UMS-como-ejemplar-externo,
toolchain único TS/Node) y exigiría *reemplazar* el estándar de Core (superar ADR-0048/0070/0079/0101).
En cambio, co-ubicar los tres productos habilita cambios atómicos productor+consumidor (justo el
flujo que necesita la migración de ownership del tenant M1–M4) y resuelve la duplicación del contrato
compartido (DS-12) con un solo `ProjectReference` — dejando a Core intacto.

**Pero el modelo de gobernanza de satélites de Core asume un repositorio por satélite, y esa premisa
bloquea el monorepo:**

1. **SVC-01** (`src/rulesets/governance/satellite-contracts.rules.json`, espejo OPA
   `src/rulesets/opa/satellite-contracts.rego`) dice *"El satélite debe tener exactamente un
   `evolith.yaml` en la raíz del repositorio. Los `evolith.yaml` anidados están prohibidos."*
2. El schema del manifiesto (`src/rulesets/schema/evolith-yaml.schema.json`) es
   `additionalProperties:false` y **no tiene noción de un producto dentro de un repo**;
   `spec.sdlc.currentPhase` es un único valor.
3. **`SatelliteRecord`** (`src/packages/core-domain/src/domain/satellite-record.ts`) llavea la
   identidad en `repoUrl`/`owner`/`name` **sin `subpath`/`manifestPath`** — un record por repo.
4. El CLI resuelve "qué satélite" de forma inconsistente: `validate` acepta `--satellite [path]`,
   `gate`/`phase` aceptan `--project [path]`, y **`upgrade` está atado a `process.cwd()` sin flag**
   (`src/sdk/cli/src/commands/upgrade/upgrade.command.ts`).

Colapsar los tres productos bajo un **manifiesto raíz único** para satisfacer SVC-01 gobernaría todo
el monorepo como **un** satélite y destruiría la madurez independiente por-producto (MMS fase 1 vs
Tracker fase 2), los `coreRef` distintos y los registros de ADR por-producto — una regresión de
gobernanza inaceptable. Por eso el cutover del monorepo **está condicionado a esta enmienda de
gobernanza**; es un cambio de gobernanza + tooling, no un `git move`.

## Decisión
Promover el modelo satélite a **satélites multi-proyecto de primera clase**. Un **workspace de
satélite** (un monorepo) puede contener **N proyectos-satélite**, cada uno gobernado **de forma
independiente** con su propio manifiesto, madurez, `coreRef` y registro de ADRs. Un satélite de un
solo repo es simplemente un workspace de un proyecto — el modelo actual se preserva como el caso
degenerado (retrocompatible).

### 1. Layout
- Un **proyecto-satélite** es un subárbol con exactamente un `evolith.yaml` en **la raíz del
  proyecto** (un subpath del workspace). El manifiesto es autocontenido (`metadata.name`,
  `spec.coreRef`, `spec.sdlc.currentPhase`, `spec.compliance.adrRegistry` propios).
- Un **workspace de satélite** declara sus raíces de proyecto en un descriptor raíz
  **`evolith.workspace.yaml`** (`kind: SatelliteWorkspace`):
  ```yaml
  apiVersion: evolith.dev/v1
  kind: SatelliteWorkspace
  metadata: { name: evolith-products }
  spec:
    projects:
      - { name: mms, path: mms }
      - { name: ums, path: ums }
      - { name: evolith-tracker, path: tracker }
  ```
- Anidar un manifiesto **dentro del árbol de otro proyecto** sigue prohibido. Las raíces de proyecto
  son el límite autoritativo; el descubrimiento se acota al conjunto declarado `spec.projects[].path`.

### 2. Enmienda de SVC-01
Reformular SVC-01 de alcance-repo a **alcance-proyecto**: *"Cada proyecto-satélite debe tener
exactamente un `evolith.yaml` en la raíz de su proyecto; un manifiesto anidado dentro del árbol de
otro proyecto está prohibido; un workspace declara sus raíces de proyecto en `evolith.workspace.yaml`."*
Actualizar el JSON de la regla, el fact OPA (`hasEvolyamlAtRoot` → `hasEvolyamlAtProjectRoot`,
evaluado contra el path del proyecto resuelto), y añadir **SVC-06 (integridad de workspace)**: todo
`evolith.yaml` en un workspace debe corresponder a un `spec.projects[].path` declarado, y viceversa.
(El handler nativo ya evalúa contra `ctx.satellitePath`, así que la evaluación por-proyecto no
requiere cambio de motor — solo el texto del contrato, el fact OPA y el descubrimiento de workspace.)

### 3. Schema del manifiesto
Añadir un schema opcional raíz `evolith.workspace.yaml` (`kind: SatelliteWorkspace`) y mantener el
schema del `evolith.yaml` por-proyecto sin cambios. No se fuerza ningún campo nuevo al manifiesto de
proyecto — la identidad del producto es su propio `metadata.name` en su `path`.

### 4. Registro
Extender `SatelliteRecord` con un **`subpath` opcional** (el path del proyecto dentro del repo;
ausente = satélite en la raíz del repo, preservando los records actuales). La identidad pasa a
**(`repoUrl`, `subpath`)**; un workspace es N records que comparten `repoUrl`. Actualizar
`satellite-record.schema.json`. `initialize-satellite`/`sync-satellite` aprenden a enumerar los
proyectos de un workspace.

### 5. CLI — unificar la resolución de satélite
- Enhebrar una única opción canónica **`--satellite <path>`** por **`validate`, `gate`, `phase` y
  `upgrade`**; mantener `--project` como alias deprecado en `gate`/`phase`.
- Orden de resolución en todo comando: `--satellite` explícito → **`evolith.yaml` ancestro más
  cercano desde `cwd`** (así `cd mms && evolith upgrade` y `evolith upgrade --satellite mms` funcionan
  ambos) → `profile.satellite` → error. Esto cierra el cwd-hardcode de `upgrade`.

### 6. Guardia de alcance
Esto gobierna **solo monorepos de producto**. El **repositorio de Evolith Core no es un workspace de
satélite** y queda explícitamente fuera de alcance — Core sigue siendo la autoridad de gobernanza
upstream soberana (ADR-0101), con su taxonomía raíz y sus guards `.harness` intactos. La taxonomía
raíz de satélite (ADR-0070, dicotomía `src/`/`docs/`) sigue aplicando **por proyecto**.

## Consecuencias
- **Positivo:** el monorepo de productos se vuelve gobernable con madurez independiente por-producto;
  sin regresión de manifiesto-único; DS-12 colapsa a un `ProjectReference` in-repo; Core queda
  intacto; los satélites de un solo repo siguen funcionando sin cambios.
- **Implementación requerida (condiciona el cutover, se trackea como gaps):**
  1. Reescritura de SVC-01 + SVC-06 en `satellite-contracts.rules.json` + `satellite-contracts.rego`
     (+ input schema, + handler nativo consciente de workspace).
  2. Schema `evolith.workspace.yaml` (`kind: SatelliteWorkspace`) en `rulesets/schema/`.
  3. `SatelliteRecord.subpath` + `satellite-record.schema.json` + enumeración del registro.
  4. Unificación `--satellite` en validate/gate/phase/upgrade + resolución por ancestro + flag en
     `upgrade`.
  5. Un **spike de gobernanza (Fase 0b)**: probar `validate`/`evaluate`/`upgrade` por-producto por
     subpath antes de archivar los repos fuente.
- **Negativo / trade-offs:** es ingeniería real de gobernanza + tooling, no un ajuste de config; el
  modelo ambiental de "único satélite activo" del CLI se reemplaza por resolución explícita/ancestro.

## Alternativas consideradas
- **Manifiesto raíz único para todo el monorepo** — rechazado: gobierna el monorepo como un solo
  satélite, perdiendo madurez/`coreRef`/registros de ADR por-producto.
- **Mantener tres repos separados + NuGet/subtree compartido de `Evolith.Messaging.Contracts` (Opción
  C)** — el camino materialmente más barato que preserva el modelo satélite a costo de migración casi
  nulo; se conserva como fallback explícito. Se rechaza aquí porque el flujo atómico
  productor+consumidor de la Opción A lo exige la migración inminente de ownership M1–M4.
- **Absorber los productos en `evolith_arch32`** — rechazado: viola los cuatro invariantes de Core y
  reemplazaría el estándar de Core (superar ADR-0048/0070/0079/0101). Es la fusión dañina.

## Referencias
- ADR-0070 (taxonomía raíz lean de satélite — aplica por proyecto) · ADR-0101 (Core stateless — Core
  queda separado) · ADR-0048/0079 (invariantes de taxonomía de Core) · ADR-0106/0107/0108 (sustrato
  de proyección de datos maestros).
- SVC-01: `src/rulesets/governance/satellite-contracts.rules.json` · `src/rulesets/opa/satellite-contracts.rego`.
- Schema del manifiesto: `src/rulesets/schema/evolith-yaml.schema.json`. Registro: `src/packages/core-domain/src/domain/satellite-record.ts`.
- Resolución del CLI: `src/sdk/cli/src/commands/{validate,gate,phase,upgrade}/`.
- Base de la decisión: el análisis fundamentado y verificado adversarialmente del monorepo (monorepo de productos, Core soberano).
- Estrategia de despliegue: `product/suite/architecture/evolith-suite-deployment-strategy.md`.
