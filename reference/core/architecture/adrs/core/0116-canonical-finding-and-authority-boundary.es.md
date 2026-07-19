> **Navegación Bilingüe:** [Read in English](./0116-canonical-finding-and-authority-boundary.md)

# ADR-0116: Contrato Canónico de Hallazgo y una Frontera de Autoridad Consultiva Ejecutable

> **Firma del Agente:** Agente Arquitecto (Winston)

## Estado

Aceptado (2026-07-18 — implementado en `develop`)

Este ADR registra dos decisiones que **ya están implementadas y fusionadas**, no
dos decisiones que se proponen:

| Decisión | Gap | Commit | Artefacto |
|---|---|---|---|
| Contrato canónico `Finding` | GT-558 | `30013b07` | `src/packages/core-domain/src/evaluation/contracts/finding.ts` |
| Frontera de autoridad consultiva ejecutable | GT-559 | `e1f4901a` | `src/packages/core-domain/src/domain/authority-policy.ts` |

El número de ADR fue reservado con antelación para el carril de normalización del
harness en [COORDINATION.md](../../../control-center/COORDINATION.md).

## Fecha

2026-07-18

## Contexto y Problema

Dos defectos antiguos del Core afloraron juntos al normalizar el harness, y
comparten causa raíz: un principio de gobernanza que solo existe como prosa es un
principio que nada puede verificar.

**Los hallazgos tenían seis formas y ningún contrato.** Seis modelos coexistían en
`core-domain`, cada uno la forma de transporte de su propio subsistema:

| Forma | Ubicación |
|---|---|
| `EvidenceFinding` | `evaluation/contracts/quality-evidence.ts` |
| `RiskFinding` | `evaluation/contracts/evaluation-result.ts` |
| `GapFinding` | `evaluation/contracts/evaluation-result.ts` |
| `GateViolation` | `domain/gate-evidence.ts` |
| `ValidationIssue` | `application/validators/ruleset-validator.types.ts` |
| `Violation` | `domain/violation.ts` |

Su intersección real era únicamente `message` más *alguna* noción de severidad, y
las nociones no coincidían: había cuatro vocabularios distintos en juego
(`info|low|medium|high|critical`, `low|medium|high|critical`,
`error|warning|info`, `MUST|SHOULD|COULD`). En consecuencia, un hallazgo no podía
viajar de la revisión de PR al scorecard y a la base de conocimiento sin ser
traducido a mano en cada salto, y cada traducción perdía campos. Peor aún, cinco
de las seis formas **no llevaban procedencia alguna** y ninguna llevaba
**determinismo** — de modo que la opinión de un auditor LLM y la medición de una
herramienta determinista resultaban estructuralmente indistinguibles al salir de
su productor. [ADR-0111](./0111-quality-signal-provider-port.es.md) §6 hace
obligatoria la procedencia en `Evidence`; los hallazgos *dentro* de esa evidencia
escapaban al requisito.

**La frontera consultiva era prosa en sesenta archivos.** "binding: false", "solo
consultivo", "recomienda, no decide" — reformulado en unos sesenta archivos del
repositorio. La prosa no se puede señalar en una revisión ni puede rechazar nada.
No había forma de preguntar al código "¿puede este actor ejecutar esta acción
sobre este artefacto?" y recibir una respuesta, así que cada punto de llamada
rederivaba la regla de memoria y el ciclo de promoción de
[ADR-0097](./0097-knowledge-lifecycle-governance.es.md) se redescribía en vez de
codificarse.

El interés comercial no es abstracto. Evolith gobierna arquitecturas ajenas. Un
sistema de gobernanza cuyos controles se autoautorizan no da a los equipos que
gobierna ninguna razón para aceptar un veredicto con el que discrepan: la única
respuesta a "¿quién decidió esto?" sería "lo decidió la herramienta".

## Objetivo y Alcance

Dar a ambos principios un único hogar ejecutable en `core-domain`.

**En alcance:** (1) una forma `Finding` normalizada con origen obligatorio, más
mapeadores puros de un solo sentido desde las seis formas existentes; (2) una
reconciliación de severidad auditable en vez de con pérdida; (3) una guarda
tipada `evaluateAuthority()` que responde si un actor dado puede ejecutar una
acción dada, portando una razón citable, un id de regla estable y la cláusula del
ADR de la que deriva.

**Fuera de alcance:** reemplazar cualquiera de las seis formas (este trabajo es
estrictamente aditivo); decidir *qué* oficina puede ratificar, dispensar o
imponer (eso es RBAC); y la compuerta de evidencia de KI-R03, que permanece en
`knowledge-intake.rego`.

## Opciones Consideradas

### Opción A: Dejar las seis formas como están y seguir traduciendo ad hoc

Continuar mapeando a mano en cada salto y añadir procedencia a formas
individuales según haga falta. *Rechazada.* Es el statu quo cuyo costo ya está
medido: N traducciones en N saltos, cada una capaz de perder un campo de forma
independiente, sin ningún lugar donde declarar qué es un hallazgo como mínimo.
Añadir procedencia forma por forma produciría seis bloques de procedencia casi
idénticos que derivan, que es el modo de falla de autoridad duplicada que este
repositorio no deja de pagar.

### Opción B: Reemplazar las seis formas por un único modelo unificado

Un solo tipo `Finding`, migrar todo productor y consumidor, borrar las seis.
*Rechazada.* Es un cambio incompatible en todos los subsistemas a la vez, para un
beneficio que un contrato puramente aditivo entrega sin ese radio de impacto.
Además destruye información deliberadamente: `GateViolation.severity: 'error'`
*significa* "bloquea la compuerta", y `ValidationIssue` separa título de
descripción — significados correctos en su propio subsistema que habría que
aplanar o promover al modelo canónico como universales, cosa que no son.

### Opción C: Mantener la frontera consultiva como prosa e imponerla en revisión

Documentar bien la regla y confiar en los revisores. *Rechazada.* Sesenta
archivos ya demuestran que documentarla bien no la vuelve verificable. Una
revisión es el instrumento equivocado para un invariante que debe sostenerse en
tiempo de ejecución: atrapa la ocurrencia que le toca leer, no la clase. De forma
decisiva, una regla en prosa no puede producir un *rechazo* — y un rechazo que
cita un id de regla y una cláusula de ADR es lo que distingue la gobernanza de la
opinión.

### Opción D: Un contrato canónico aditivo más una función de frontera ejecutable (adoptada)

Un contrato `Finding` que ninguna forma existente está obligada a adoptar,
alcanzado mediante mapeadores puros de un solo sentido; y una función
`evaluateAuthority()` que devuelve una decisión tipada. Ver abajo.

## Decisión y Justificación

### 1. El `Finding` canónico — la procedencia no es opcional (GT-558, `30013b07`)

`finding.ts` declara una forma normalizada y seis mapeadores. Tres invariantes
sostienen la decisión:

- **`FindingOrigin` es un argumento obligatorio en todo mapeador.** Ninguna forma
  fuente lleva procedencia ni determinismo, así que quien llama debe suministrar
  ambos. Un hallazgo sin atribución es por tanto un *error de compilación*, no
  una sorpresa en tiempo de ejecución.
- **`determinism` es obligatorio, nunca por defecto.** Un hallazgo probabilístico
  jamás debe poder presentarse como un hecho. El predicado `isFactual()` existe
  para que quien llama no rederive esa regla — y la equivoque — en cada salto.
- **`advisory` es el tipo literal `true`.** Reflejando
  `DecisionRecommendation.binding: false` ([ADR-0101](./0101-core-stateless-evaluation-engine.es.md)),
  esto vuelve la naturaleza consultiva infalsificable en vez de convencional. No
  hay `blocking`, ni `verdict`, ni `outcome` en el tipo. La opinión bloqueante del
  propio productor (`ValidationIssue.blocking`, `Violation.frozen`) sobrevive en
  `attributes` como anotación opaca y no autoritativa.

El módulo es **estrictamente aditivo**: no modifica ninguna de las seis, y las
seis siguen siendo las formas de transporte de sus subsistemas. Donde una fuente
no puede llenar un campo canónico, el mapeador lo deja *ausente* en vez de
inventar un valor por defecto — notablemente `id`, porque sintetizarlo fabricaría
una estabilidad que la fuente no tiene.

### 2. La severidad se reconcilia a cinco niveles, y la proyección es auditable

La escala canónica es `info | low | medium | high | critical`. Se elige porque es
el único vocabulario en juego que es un *superconjunto* estricto de otro
(`RiskLevel` literalmente), de modo que dos de las seis mapean por identidad y
ningún productor queda forzado a una granularidad más gruesa que la que ya usaba.

`error` mapea a `high` y **deliberadamente no a `critical`**. `critical` queda
reservado a productores que distinguen explícitamente una banda superior. Un
productor de tres niveles *no puede* querer decir "critical" — no dispone de ese
token — y promoverlo inflaría la severidad en silencio a lo largo del salto.

Como `error|warning|info` y `MUST|SHOULD|COULD` son *disposiciones* y no
magnitudes, proyectarlas sobre una escala de magnitud es inherentemente
interpretativo y por tanto no reversible. En consecuencia, todo hallazgo conserva
el token literal del productor en `sourceSeverity`. Ese campo es lo que vuelve
auditable la proyección en vez de con pérdida.

### 3. La frontera de autoridad consultiva, ejecutable (GT-559, `e1f4901a`)

`authority-policy.ts` responde una pregunta: *¿puede este actor ejecutar esta
acción sobre este artefacto?* `evaluateAuthority()` devuelve un
`AuthorityDecision` que porta un booleano `permitted`, una `reason` de una frase
escrita para pegarse literalmente en un comentario de revisión, un id `rule`
estable (`AP-R01`..`AP-R06`) y la `citation` — la cláusula del ADR de la que
deriva la regla. Un rechazo que un revisor no puede rastrear hasta un registro de
decisión es solo otra opinión.

La aserción es ilimitada a propósito: `observe`, `recommend`, `attach-evidence` y
`draft-candidate` están abiertos a todo actor, porque el costo de una observación
sobrante es una revisión mientras que el costo de una faltante es un punto ciego.
`accept`, `promote`, `ratify`, `waive` y `enforce` exigen autoridad humana
nombrada, porque esos actos confieren peso institucional y retractarlos es caro.

De forma crítica, el ciclo de vida de ADR-0097 se **codifica como datos, no se
redescribe**: `PROMOTION_SEQUENCE` guarda el orden y `PROMOTION_AUTHORITY` mapea
cada etapa a los tipos de actor que pueden mover un registro hacia ella
(`candidate` abierto, `evaluated` a custodio o Board, `accepted` y `executable`
solo al Board). La promoción son entonces dos preguntas que no deben colapsarse
— si el *movimiento* es legal (AP-R04) y si este actor es quien puede hacerlo
(AP-R05) — para que un revisor distinga "etapa equivocada" de "persona
equivocada".

Este módulo **no es RBAC**. `domain/rbac` responde "¿esta persona ostenta el rol
que exige la compuerta?". Este responde la pregunta previa: "¿se requiere una
persona aquí, siquiera?". Ambos componen.

### 4. AP-R03 se ordena antes que AP-R02, deliberadamente

Los controles se ordenan para que gane el rechazo *más preciso* y no el primero
aplicable. Un agente que promueve su propio hallazgo es rechazado por ambas
reglas; AP-R03 (autoautorización) corre primero porque "no puedes certificar tu
propia salida" es la razón que el revisor necesita, mientras que AP-R02 ("los
agentes no son humanos") es la razón que ya daba por supuesta.

Este es el defecto que todo el módulo existe para prevenir. Un actor que ratifica
su propia inferencia no está controlado por nada: lo que produce la afirmación y
lo que la certifica son el mismo proceso, así que el certificado no aporta
información. Un motor que pudiera promover su propio hallazgo a regla y luego
imponer esa regla estaría corrigiendo su propia tarea en bucle, y toda evaluación
posterior heredaría el error original como si fuera un estándar.

### 5. Lo que deliberadamente NO se decidió

Tres omisiones son elecciones, no vacíos:

- **La autorrevisión humana no está codificada.** AP-R03 rechaza la
  autoautorización solo para actores no humanos. Ningún ADR existente impide a un
  miembro del Board aceptar un borrador de su autoría, así que codificar tal
  impedimento aquí *inventaría* gobernanza en vez de expresarla. Si el Board
  quiere revisión de cuatro ojos sobre sus propios miembros, esa es una decisión
  que el Board debe registrar primero.
- **Qué oficina puede ratificar, dispensar o imponer queda a RBAC.** AP-R06
  establece que estos exigen una persona y se detiene ahí. ADR-0101 sitúa la
  decisión vinculante enteramente fuera del Core, así que la oficina es asunto
  del consumidor.
- **La compuerta de evidencia de KI-R03 permanece en `knowledge-intake.rego`.**
  El requisito de que `executable` exija un ADR, una regla nativa, una política
  OPA y fixtures que pasen ya se impone por política y no se reformula en
  TypeScript. Dos puntos de imposición para una regla es la deriva que este ADR
  existe para evitar.

## Evidencia y Criterios de Evaluación

Ambas decisiones se juzgaron por si crean un único hogar verificable para una
regla, si pueden adoptarse sin una migración incompatible, y si una violación
produce un *rechazo* en vez de un comentario.

- `src/packages/core-domain/src/evaluation/contracts/finding.ts` — el contrato
  canónico, con `FINDING_SCHEMA_VERSION` en `1.0.0`; verificado por
  `finding.spec.ts` (38 casos), incluida una aserción en tiempo de compilación de
  que el `ValidationIssue` real es asignable a `ValidationIssueLike`, de modo que
  el espejo estructural no puede derivar en silencio.
- `src/packages/core-domain/src/domain/authority-policy.ts` — la frontera;
  verificada por `authority-policy.spec.ts` (25 casos).
- **El estratificado se sostiene.** `ValidationIssueLike` se *declara* en vez de
  importarse porque `application/` está por encima de `domain/`; importar hacia
  arriba invertiría el estratificado que impone `eslint-plugin-boundaries`.
- **La aditividad es el criterio de aceptación de GT-558.** No se modificó ningún
  productor ni consumidor de las seis formas, así que el contrato puede adoptarse
  salto a salto.
- **Prueba de fuego.** Si las seis formas de hallazgo se reemplazaran mañana, la
  decisión (una forma canónica, origen obligatorio, proyección de severidad
  auditable) seguiría en pie — las seis son las entradas actuales, no el objeto
  de la decisión.

## Consecuencias, Riesgos y Compromisos

**Positivo.** Un hallazgo puede ahora cruzar subsistemas sin traducción manual y
sin perder su origen. Procedencia y determinismo se vuelven imposibles de omitir
justo en la frontera donde antes se perdían. El principio consultivo adquiere una
redacción, un hogar y un valor de retorno; un rechazo ahora cita `AP-R0n` y una
cláusula de ADR, que es lo que vuelve un veredicto discutible por sus méritos y no
por la palabra de la herramienta.

**Negativo / compromisos aceptados.** Ahora existen siete formas donde había
seis, y es deliberado — el modelo canónico es un *contrato*, no un séptimo formato
de transporte, pero la distinción debe mantenerse activamente en revisión o se
convierte en proliferación. La proyección de severidad es de un solo sentido:
quien necesite el resultado de una compuerta debe seguir usando `deriveVerdict()`
sobre las violaciones *originales*, porque `findingFromGateViolation()`
deliberadamente no puede reconstruir el significado bloqueante que descarta.

**Riesgos.**
- *La adopción se estanca.* Un contrato aditivo que nadie adopta es peso muerto.
  Mitigado por `findingsFromEvidence()`, la única vía donde el origen no debe
  suministrarse a mano, que da a la adopción un punto de entrada barato.
- *La frontera se elude.* `evaluateAuthority()` no rechaza nada en un punto de
  llamada que nunca la invoca. Mitigado por `requireAuthority()` para puntos de
  llamada que fallan cerrado, pero la cobertura sigue siendo un riesgo residual
  que ningún tipo puede cerrar.
- *Deriva del espejo estructural.* Mitigada por la aserción de asignabilidad en
  tiempo de compilación del spec, que convierte la deriva en un fallo de build.

## Seguimiento Conocido

`PromotionStatus` está ahora declarado **dos veces**: en
`src/packages/core-domain/src/domain/authority-policy.ts` y en
`src/packages/agent-runtime/src/application/automation-candidate.ts:25`, con
miembros idénticos. `agent-runtime` debería importar el tipo desde `core-domain`;
el sentido inverso no está permitido, porque `core-domain` no puede depender de la
capa agéntica ([ADR-0102](./0102-evolith-agent-runtime.es.md)). Hasta que esa
importación aterrice, las dos declaraciones pueden derivar en silencio — nada las
reconcilia actualmente.

## Referencias

- `src/packages/core-domain/src/evaluation/contracts/finding.ts` ·
  `finding.spec.ts` (GT-558, commit `30013b07`)
- `src/packages/core-domain/src/domain/authority-policy.ts` ·
  `authority-policy.spec.ts` (GT-559, commit `e1f4901a`)
- `src/packages/core-domain/src/evaluation/contracts/quality-evidence.ts` — los
  tipos `Determinism` y `Provenance` de los que dependen ambas decisiones.
- `src/rulesets/opa/knowledge-intake.rego` — KI-R01..R07; KI-R03 es la compuerta
  de automatización que este ADR deliberadamente no reformula.
- [COORDINATION.md](../../../control-center/COORDINATION.md) — el carril de
  normalización del harness que reservó GT-556..559 y este número de ADR.

## Decisiones y Estándares Relacionados

- [ADR-0101](./0101-core-stateless-evaluation-engine.es.md) — origen del principio
  consultivo. `advisory: true` refleja `binding: false`; AP-R01, AP-R02 y AP-R06
  citan todos §3.
- [ADR-0097](./0097-knowledge-lifecycle-governance.es.md) — el ciclo de promoción
  que `PROMOTION_SEQUENCE` y `PROMOTION_AUTHORITY` codifican como datos. Este ADR
  lo **codifica**; no lo modifica.
- [ADR-0111](./0111-quality-signal-provider-port.es.md) — la procedencia
  obligatoria de §6, extendida desde `Evidence` hasta los hallazgos individuales
  que contiene.
- [ADR-0115](./0115-emergent-knowledge-axis.es.md) — su frontera de autoridad
  ("un agente puede redactar un `KO-*` en `candidate`, y no puede avanzarlo") es
  precisamente lo que `PROMOTION_AUTHORITY` y AP-R03 vuelven ejecutable.
- [ADR-0102](./0102-evolith-agent-runtime.es.md) — la dirección de dependencia que
  vuelve unidireccional el seguimiento de `PromotionStatus`.
- `domain/rbac` — compone con esta frontera, y no la reemplaza: responde *qué*
  humano, después de que AP-R02 haya respondido *si* hace falta un humano.

---
[Volver al Nivel Superior](./README.es.md)
