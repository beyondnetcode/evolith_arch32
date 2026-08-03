# ADR-0125: Un único registro de artefactos, con el slug como identidad

> **Navegación Bilingüe:** [English](./0125-single-artifact-registry.md) · Español (este documento)

| Campo | Valor |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-08-02 |
| **Decisores** | Architecture Board |
| **Historia técnica** | GT-650 — dos vocabularios de artefactos sin reconciliar hacen impublicable un catálogo |

<!-- implementation-status: none -->
> **Estado de implementación en este repositorio: ninguno** (2026-08-02).
> Aceptado como DECISIÓN, no como capacidad entregada. El Core sigue teniendo dos copias a mano del
> corpus de compuertas más un tercer vocabulario de slugs; `57-validate-gate-corpora-parity` impide
> que se separen, que es una tablilla y no esta decisión. `GT-650` sigue la migración. Se declara en
> vez de dejarlo en blanco para que este ADR aparezca en el mismo censo que `GT-607` —ADRs
> aceptados sin código que los implemente— en lugar de leerse como hecho.

## Status

Accepted — 2026-08-02.

La decisión de abajo está en vigor. Todavía NO está implementada: el Core sigue
teniendo dos copias a mano del corpus de compuertas más un tercer vocabulario de slugs, a las que
`57-validate-gate-corpora-parity` impide separarse. `GT-650` sigue la migración, y sus criterios de
aceptación son los que aquí se escriben — incluido el más fácil de saltarse: el corpus perdedor hay
que **borrarlo o derivarlo**, porque dos ficheros que hoy coinciden mañana divergen, que es el
defecto que este ADR existe para terminar y no para gestionar.

## Contexto

El Core responde a la pregunta *«¿qué artefactos exige la fase X?»* desde **tres** sitios, y no hay dos que coincidan.

| # | Dónde | Clave | Vocabulario | Alcance | Consumidor |
|---|---|---|---|---|---|
| A | `reference/governance/sdlc/gates/gate-f*.json` | `requiredArtifacts` | nombres humanos (`Coverage Report`) | 24 artefactos, 5 compuertas | el **evaluador** — `phase-gate-validator.service.ts`, `gate-registry.service.ts` |
| B | `UNIVERSAL_PHASE_ARTIFACTS` en `core-domain` | — | slugs (`coverage-report`) | 18 artefactos, 3 fases downstream | `PhaseArtifactProfileService` — completitud consultiva |
| C | `src/rulesets/sdlc/phase-gates.rules.json` | `mandatoryEvidence` | nombres humanos | los mismos 24 que A | la **superficie HTTP** que consultan los satélites |

**A y C son dos copias mantenidas a mano de la misma lista, y ya habían divergido.** `#378` cableó esquemas para cuatro artefactos y declaró tres como salida de herramienta; las siete ediciones llegaron a A y ninguna a C. Mientras eso pasó desapercibido, el Core evaluaba contra una respuesta y publicaba otra, sin nada en rojo. `57-validate-gate-corpora-parity` impide ahora que sigan separándose, que es una tablilla, no una cura.

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

- **La migración es mecánica para A y C, y una decisión de criterio para B.** Los 24 artefactos de A/C tienen correspondencia uno a uno con slugs, diez de ellos ya escritos en el `CORE_ARTIFACT_SCHEMAS` del Tracker — esa tabla es prueba de que la correspondencia es una decisión ya tomada y revisable, no algo derivado. Los 18 slugs de B incluyen nueve que ninguna compuerta exige (`source-change-set`, `architecture-drift-result`, `spec-traceability-map`, `contract-test-result`, `cfr-metric`, `defect-log`, `exception-status`, `release-plan`, `operational-sign-off`). Cada uno hay que clasificarlo `advisory` o promoverlo a `binding` deliberadamente; poner un valor por defecto cambiaría en silencio qué bloquea una release.
- **Tres consumidores cambian a la vez**, y la migración no es segura a medias: el evaluador, el servicio de completitud y la superficie HTTP leen todos el registro, así que una migración parcial reintroduce exactamente la escisión que este ADR elimina. Debe entrar como un solo cambio junto al generador y al eslabón de la cadena.
- **La guarda de paridad se borra, no se conserva.** Su causa desaparece en cuanto un fichero se genera desde el otro.
- **Se desbloquea la mitad Core del `GAP-004` de `evolith_tracker`**, y su `StandInPhaseArtifactProfileSource` puede retirarse. Las dos mitades de UMS de esa ficha no se ven afectadas.
- **Siete artefactos no tienen esquema y no son salida de herramienta** (`MoSCoW Prioritization Matrix`, `ADR Registry`, `Reference Blueprint Alignment`, `Simplicity Checklist Phase 1`, `Documentation Delta`, `Acceptance Validation`, `Deployment Evidence`). El registro lo hace visible entrada a entrada en vez de dejarlo implícito, y eso se leerá como un backlog — correctamente. En particular, `adr.schema.json` **no** debe cablearse a `ADR Registry`: un registro es una *lista* de ADRs y no un ADR, así que el mapeo validaría verde sobre el papel y produciría un falso negativo contra el artefacto real.

## ADRs relacionados

- [ADR-0104](./0104-topology-driven-advisory-design-governance.es.md) — gobernanza consultiva de diseño dirigida por topología; `PhaseArtifactProfileService` sigue siendo no vinculante bajo este ADR.
- [ADR-0101](./0101-core-stateless-evaluation-engine.es.md) — el Core es un motor de evaluación sin estado; el registro es corpus, no estado.
- **T-056** de `evolith_tracker` — separación en tres capas; el §7 de arriba está acotado por él.
