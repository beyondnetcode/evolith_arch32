# ADR-0125: Un único registro de artefactos, con el slug como identidad

> **Navegación Bilingüe:** [English](./0125-single-artifact-registry.md) · Español (este documento)

| Campo | Valor |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-08-02 |
| **Decisores** | Architecture Board |
| **Historia técnica** | GT-650 — dos vocabularios de artefactos sin reconciliar hacen impublicable un catálogo |

<!-- implementation-status: src/rulesets/sdlc/artifact-registry.json, src/rulesets/sdlc/artifact-registry.schema.json, src/packages/core-domain/src/application/services/gate-registry.service.ts, src/packages/core-domain/src/application/services/universal-phase-artifacts.generated.ts, src/apps/core-api/src/application/services/core-reference-query.service.ts, src/apps/core-api/src/presentation/controllers/reference.controller.ts, .harness/scripts/generate-phase-gates-rules.mjs, .harness/scripts/generate-universal-phase-artifacts.mjs, .harness/scripts/ci/59-validate-artifact-registry.mjs -->
> **Estado de implementación en este repositorio: implementado** — migración completada el
> 2026-08-03, `GT-650` está `DONE`. `src/rulesets/sdlc/artifact-registry.json` es la única
> declaración y contiene **33 artefactos: 24 `binding` y 9 `advisory`**. Los ficheros de compuerta lo
> referencian por `artifactId` y no llevan ni `schemaRef` ni `producedBy`; `phase-gates.rules.json` y
> `UNIVERSAL_PHASE_ARTIFACTS` se generan a partir de él; `GET /api/v1/phases/artifacts` lo publica.
> `57-validate-gate-corpora-parity` fue **borrada con su causa y ya no existe en este repositorio**;
> la guarda que hoy cubre de verdad el registro de artefactos es
> `.harness/scripts/ci/59-validate-artifact-registry.mjs`. Lo que NO está saldado se nombra abajo en
> **Brechas pendientes**, con rutas, en vez de quedar implícito.

## Status

Accepted — 2026-08-02. Implementado — 2026-08-03.

La decisión está en vigor y la migración que la lleva está completa. Los criterios de aceptación de
`GT-650` son los que aquí se escriben, incluido el más fácil de saltarse: el corpus perdedor había
que **borrarlo o derivarlo**, y se derivó en vez de limitarse a vigilarlo —
`src/rulesets/sdlc/phase-gates.rules.json` lo produce
`.harness/scripts/generate-phase-gates-rules.mjs` y CI lo verifica con `--check`, y la tablilla de
paridad se retiró junto con la causa por la que existía. Dos ficheros que hoy coinciden mañana
divergen; ese defecto es ahora irrepresentable, no gestionado. Las cláusulas que aún deben trabajo
están listadas en **Brechas pendientes** y son un backlog, no una excepción no declarada.

## Contexto

*El estado que describe esta sección es el del 2026-08-02, que es contra el que se tomó esta
decisión. Ya no es el estado del repositorio — véase el estado de implementación de arriba y las
Brechas pendientes de abajo.*

El Core responde a la pregunta *«¿qué artefactos exige la fase X?»* desde **tres** sitios, y no hay dos que coincidan.

| # | Dónde | Clave | Vocabulario | Alcance | Consumidor |
|---|---|---|---|---|---|
| A | `reference/governance/sdlc/gates/gate-f*.json` | `requiredArtifacts` | nombres humanos (`Coverage Report`) | 24 artefactos, 5 compuertas | el **evaluador** — `phase-gate-validator.service.ts`, `gate-registry.service.ts` |
| B | `UNIVERSAL_PHASE_ARTIFACTS` en `core-domain` | — | slugs (`coverage-report`) | 18 artefactos, 3 fases downstream | `PhaseArtifactProfileService` — completitud consultiva |
| C | `src/rulesets/sdlc/phase-gates.rules.json` | `mandatoryEvidence` | nombres humanos | los mismos 24 que A | la **superficie HTTP** que consultan los satélites |

**A y C son dos copias mantenidas a mano de la misma lista, y ya habían divergido.** `#378` cableó esquemas para cuatro artefactos y declaró tres como salida de herramienta; las siete ediciones llegaron a A y ninguna a C. Mientras eso pasó desapercibido, el Core evaluaba contra una respuesta y publicaba otra, sin nada en rojo. `57-validate-gate-corpora-parity` impidió que siguieran separándose, que era una tablilla y no una cura; se borró el 2026-08-03, en cuanto `phase-gates.rules.json` pasó a generarse y las dos copias dejaron de poder discrepar por construcción.

**A y B no son dos formas de escribir una misma lista. Responden preguntas distintas**, y por eso todo intento previo de «unirlas» se atascó:

- A/C es **evidencia vinculante de compuerta**: qué debe estar presente, con su `validation` en prosa, sus ids de `rules` y su `templateRef`, para que una compuerta pase.
- B es **completitud consultiva**: qué se espera que contenga una fase downstream, unido en tiempo de ejecución con los `phaseProfiles` de cada topología confirmada, para dar un porcentaje. `PhaseArtifactProfileService` es explícitamente no vinculante — *«la compuerta del Tracker decide»*.

La discrepancia que lo hace concreto es `Coverage Report`. La compuerta `f3` lo exige como evidencia de construcción (*«cobertura de lógica de negocio >= 80%»*); `UNIVERSAL_PHASE_ARTIFACTS` lista `coverage-report` bajo `quality`. **Las dos son correctas.** Lo produce la build de construcción y se sigue esperando que esté presente cuando se mide QA. Ningún fichero puede expresar eso, así que cada uno dijo la mitad y juntos parecen una contradicción.

Dos hechos más acotan la elección:

1. **Los slugs ya son la identidad de máquina en otras partes.** Los manifiestos de topología indexan sus `phaseProfiles` por `artifactKind` (`data-product-contract-set`, `data-ownership-map`), y `PhaseArtifactProfileService` los une con las entradas de B en un mismo `Set`. Los nombres humanos sólo aparecen en A y C.
2. **Un satélite ya lo está pagando.** `evolith_tracker` publica `StandInPhaseArtifactProfileSource`, un espejo hecho a mano marcado `core-standin`, porque no hay nada que sincronizar. Su `GAP-004` está bloqueada por este ADR.

## Decisión

### 1. Un registro, y el slug es la identidad

Un único registro de artefactos pasa a ser el único sitio donde se declara un artefacto. Cada entrada lleva:

- `id` — el slug estable (`coverage-report`). **Esta es la identidad.** Es lo que ya usan los manifiestos de topología, el servicio de completitud, los esquemas y el Tracker.
- `label` — el nombre humano (`Coverage Report`). **Sólo para mostrar.** Ningún consumidor puede emparejar por él.
- `schemaId` — el `$id` publicado del esquema canónico, o ausente.
- `producedBy` — presente cuando el artefacto ES la salida propia de una herramienta, en cuyo caso `schemaId` está ausente. Son mutuamente excluyentes y su diferencia importa: *aún no hay esquema* y *deliberadamente no hay esquema* piden acciones opuestas.

Los nombres humanos se degradan en vez de borrarse porque son lo que una persona lee en un informe de compuerta, y porque borrarlos rompería en silencio el texto de `validation` que los nombra.

### 2. Un artefacto puede ser exigido por más de una fase

El registro guarda `phases`, una lista. `coverage-report` es exigido en `construction` **y** esperado en `quality`, que es lo que siempre fue cierto y lo que ningún modelo de un solo hogar podía expresar. Esto resuelve la discrepancia de `Coverage Report` admitiendo que nunca fue tal: eran dos ficheros, cada uno capaz de decir la mitad.

Una entrada distingue además `binding` (evidencia de compuerta — su ausencia hace fallar la compuerta) de `advisory` (sólo cuenta para la completitud). Esto conserva la distinción A/B que sí importa en vez de aplanarla, y mantiene `PhaseArtifactProfileService` no vinculante como exige el ADR-0104.

### 3. Los ficheros de compuerta referencian el registro; dejan de repetirlo

`gate-f*.json` conserva lo que es genuinamente propio de la compuerta —la `validation` en prosa, los ids de `rules`, el `templateRef`— y referencia cada artefacto **por su `id`**. Deja de llevar `schemaRef` y `producedBy`, porque son propiedades del artefacto y no de la compuerta que lo exige. La deriva de siete campos de `#378` pasa a ser irrepresentable, no meramente detectable.

**Enmendado por la implementación, 2026-08-03, y la enmienda va más lejos que la cláusula.** El `templateRef` también se movió al registro, precisamente por la razón que da esta cláusula: dónde vive la plantilla de autoría de un artefacto es propiedad del artefacto y no de cada compuerta que lo exige — que es exactamente como fue posible la deriva de siete campos. Hoy los ficheros de compuerta no llevan ningún `templateRef` (verificado: cero apariciones en `gate-f1..f5.json`); el registro lleva seis. En la compuerta se quedó lo que es de la compuerta: `validation`, `rules`, `status`, `waiverRequiredFields` y `exitCriteria`. La regla de la cláusula no cambia y se aplica más ampliamente; no se relaja.

### 4. `phase-gates.rules.json` se genera, no se mantiene

Pasa a ser artefacto derivado, construido desde el registro más los ficheros de compuerta, con modo `--check`, registrado como eslabón de la cadena de artefactos derivados (`GT-630`) para verificar que está en punto fijo. Su gemelo mantenido a mano desaparece. `57-validate-gate-corpora-parity` queda entonces redundante y se elimina en el mismo cambio: una guarda que sobrevive a su causa se convierte en ruido, y el ruido enseña a saltarse los rojos.

**Sus rutas relativas `../schema/…` siguen siendo relativas.** Resuelven correctamente desde `src/rulesets/sdlc/`; las que estaban rotas eran las de A. Reescribirlas para que se parezcan a las de A sería un cambio sin causa.

### 5. `UNIVERSAL_PHASE_ARTIFACTS` se deriva del registro

La constante escrita a mano se sustituye por una proyección sobre el registro (entradas `advisory` y `binding` cuyas `phases` incluyan la fase downstream). `PhaseArtifactProfileService` conserva su comportamiento, incluida la unión con los `phaseProfiles` de topología, que ya habla slugs y por tanto no necesita traducción.

### 6. El registro se publica

`GET /api/v1/phases/artifacts` (todas las fases) y `GET /api/v1/phases/:phase/artifacts` devuelven la proyección del registro: por cada artefacto su `id`, `label`, `schemaId` **o** `producedBy`, y si es vinculante. Un satélite puede entonces consumir en vez de espejar, y `evolith_tracker` puede sustituir su fuente `core-standin` por `core-sync`.

La respuesta da el `$id` del esquema y no una ruta de repositorio, siguiendo el razonamiento ya registrado en el `CORE_ARTIFACT_SCHEMAS` del Tracker: una ruta es un hecho sobre dónde está un fichero en un repositorio en un momento; el `$id` es la identidad del esquema y sobrevive a que el Core reorganice su árbol.

### 7. Lo que este ADR NO decide

**No convierte al Core en autoridad sobre lo que un tenant puede registrar.** El registro dice qué exige el *Core* en sus propias compuertas. Según el `T-056` del Tracker, la validación de contenido es configuración del tenant y no código del motor: un satélite puede añadir artefactos y campos de los que el Core nunca ha oído hablar, y este registro no lo contradice. El catálogo publicado es una referencia que se ofrece a quien rellena un artefacto, no una lista cerrada en la que deba encajar.

## Consecuencias

- **[HECHO 2026-08-03] La migración es mecánica para A y C, y una decisión de criterio para B.** Los 24 artefactos de A/C tienen correspondencia uno a uno con slugs, diez de ellos ya escritos en el `CORE_ARTIFACT_SCHEMAS` del Tracker — esa tabla es prueba de que la correspondencia es una decisión ya tomada y revisable, no algo derivado. Los 18 slugs de B incluyen nueve que ninguna compuerta exige (`source-change-set`, `architecture-drift-result`, `spec-traceability-map`, `contract-test-result`, `cfr-metric`, `defect-log`, `exception-status`, `release-plan`, `operational-sign-off`). Cada uno hay que clasificarlo `advisory` o promoverlo a `binding` deliberadamente; poner un valor por defecto cambiaría en silencio qué bloquea una release.
- **[HECHO 2026-08-03] Tres consumidores cambian a la vez**, y la migración no es segura a medias: el evaluador, el servicio de completitud y la superficie HTTP leen todos el registro, así que una migración parcial reintroduce exactamente la escisión que este ADR elimina. Debe entrar como un solo cambio junto al generador y al eslabón de la cadena.
- **[HECHO 2026-08-03] La guarda de paridad se borra, no se conserva.** Su causa desaparece en cuanto un fichero se genera desde el otro. `57-validate-gate-corpora-parity` ya no existe en este repositorio; el hueco numerado `57` lo ocupa hoy `.harness/scripts/ci/57-validate-closure-reachability.mjs`, una guarda sin relación con esto.
- **[PARCIAL] Se desbloquea la mitad Core del `GAP-004` de `evolith_tracker`**, y su `StandInPhaseArtifactProfileSource` puede retirarse. Las dos mitades de UMS de esa ficha no se ven afectadas. La mitad Core está entregada —el registro se publica— y el satélite ya escribió `CoreSyncPhaseArtifactProfileSource`, pero la fuente cableada sigue siendo el espejo; véanse las Brechas pendientes.
- **[SIGUE ABIERTO — verificado 2026-09-01] Siete artefactos no tienen esquema y no son salida de herramienta** (`MoSCoW Prioritization Matrix`, `ADR Registry`, `Reference Blueprint Alignment`, `Simplicity Checklist Phase 1`, `Documentation Delta`, `Acceptance Validation`, `Deployment Evidence`). El registro lo hace visible entrada a entrada en vez de dejarlo implícito, y eso se leerá como un backlog — correctamente. En particular, `adr.schema.json` **no** debe cablearse a `ADR Registry`: un registro es una *lista* de ADRs y no un ADR, así que el mapeo validaría verde sobre el papel y produciría un falso negativo contra el artefacto real.

## Brechas pendientes

La decisión está implementada; estas son las partes de ella que no lo están, cada una con la ruta que
lo demuestra. Se registran aquí para que este ADR siga siendo útil en vez de decorativo.

1. **Un cuarto corpus sigue declarando artefactos a mano, y el §1 dice que sólo debe haber uno.**
   `src/rulesets/schema/phase-artifact-registry.json` cataloga 36 tipos de artefacto —23 `universal`
   más los derivados de topología—, cada uno con su propio `title` y `description`, y ningún
   generador lo escribe. Sus 23 tipos `universal` están hoy todos en el registro, pero sólo se
   comprueba una dirección y sólo para las fases downstream:
   `src/packages/core-domain/src/application/services/phase-artifacts.e2e.spec.ts:41-58` exige que
   cada tipo de `UNIVERSAL_PHASE_ARTIFACTS` aparezca allí. Nada comprueba el sentido inverso, y nada
   cubre los artefactos `binding` de `discovery` y `design`. Es la misma clase de defecto por la que
   se abrió este ADR, un corpus más tarde. El Contexto nombraba tres corpus; hay cuatro.

2. **La guarda que cubre el registro ha sobrevivido a la condición de retirada escrita en ella
   misma.** `.harness/scripts/ci/59-validate-artifact-registry.mjs:17-21` dice que muere «cuando las
   compuertas referencien el registro POR ID y dejen de llevar `schemaRef`». Ambas cosas son ciertas
   desde el 2026-08-03 y la guarda sigue ejecutándose — su cuerpo se reescribió con un sujeto más
   estrecho y aún útil (que toda fase que nombra un artefacto esté en el vocabulario declarado, que
   ninguna compuerta exija un artefacto `advisory`, y que ningún `binding` falte en todas las
   compuertas). O la cabecera o la guarda está obsoleta, y la propia regla de este ADR —una guarda
   que sobrevive a su causa se convierte en ruido, y el ruido enseña a saltarse los rojos— convierte
   eso en una decisión que hay que tomar, no que dejar.

3. **Siete artefactos `binding` siguen sin esquema y sin declaración de salida de herramienta.**
   Verificado en `src/rulesets/sdlc/artifact-registry.json`: `acceptance-validation`, `adr-registry`,
   `deployment-evidence`, `documentation-delta`, `moscow-prioritization-matrix`,
   `reference-blueprint-alignment`, `simplicity-checklist-phase-1`. Las Consecuencias predijeron que
   esto se leería como un backlog. Se lee así, y sigue abierto.

4. **La mitad del satélite está desbloqueada pero no conmutada.** `evolith_tracker` ya escribió
   `src/apps/tracker-api/Tracker.Infrastructure/Governance/CoreSyncPhaseArtifactProfileSource.cs`, y
   el contenedor sigue registrando el espejo:
   `src/apps/tracker-api/Tracker.Application/DependencyInjection.cs:71` liga
   `IPhaseArtifactProfileSource` a `StandInPhaseArtifactProfileSource`. El «un satélite puede
   entonces consumir en vez de espejar» del §6 es cierto como capacidad y todavía no como cableado.

## ADRs relacionados

- [ADR-0104](./0104-topology-driven-advisory-design-governance.es.md) — gobernanza consultiva de diseño dirigida por topología; `PhaseArtifactProfileService` sigue siendo no vinculante bajo este ADR.
- [ADR-0101](./0101-core-stateless-evaluation-engine.es.md) — el Core es un motor de evaluación sin estado; el registro es corpus, no estado.
- **T-056** de `evolith_tracker` — separación en tres capas; el §7 de arriba está acotado por él.

---
[Back to Index](./README.md)

> **Agent Signature:** Architect Agent
