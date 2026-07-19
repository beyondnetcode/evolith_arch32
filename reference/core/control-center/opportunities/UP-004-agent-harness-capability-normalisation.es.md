# UP-004 — De Prompts Aislados a un Harness de Agentes Gobernado

> Navegación bilingüe: [English](./UP-004-agent-harness-capability-normalisation.md)

| Campo | Valor |
|---|---|
| **ID** | UP-004 |
| **Estado** | PROPOSED |
| **Fecha** | 2026-07-18 |
| **Iniciado por** | Carril de normalización del harness |
| **Dirigido a** | Evolith Core Architecture Board |
| **Prioridad** | P0 (fundaciones) / P1 (capa de inteligencia) |
| **Complejidad Estimada** | XL — se propone como una secuencia de slices que aterrizan de forma independiente |
| **ADR Relacionado** | ADR-0116 (reservado — `Finding` canónico + frontera de autoridad) · ADR-0101 · ADR-0097 · ADR-0111 · ADR-0115 |
| **GTs Relacionados** | GT-556 · GT-557 · GT-558 · GT-559 (todos aterrizados; esta propuesta los generaliza) |

## Método — qué fundamenta este análisis

Esto no es un inventario de lo que un harness de agentes podría contener. Cada
afirmación de abajo está **medida en este repositorio** o marcada explícitamente
como propuesta de diseño. Donde aparece un número, se obtuvo ejecutando el
código, no leyéndolo.

Esa distinción importa porque el hallazgo central de este análisis es que **los
checks de este repositorio han venido reportando éxito sistemáticamente sin
haberse ejecutado**. Un análisis de ese problema que a su vez no estuviera
verificado sería una instancia más del problema.

Se implementaron cuatro capacidades (GT-556…559) mientras se producía este
documento. Aquí se tratan como evidencia, no como la propuesta.

---

## Parte I — Qué se repetía realmente

### I.1 Seis modelos para "aquí hay algo mal"

| Modelo | Ubicación |
|---|---|
| `EvidenceFinding` | `core-domain/src/evaluation/contracts/quality-evidence.ts` |
| `RiskFinding` | `core-domain/src/evaluation/contracts/evaluation-result.ts` |
| `GapFinding` | `core-domain/src/evaluation/contracts/evaluation-result.ts` |
| `GateViolation` | `core-domain/src/domain/gate-evidence.ts` |
| `ValidationIssue` | `core-domain/src/application/validators/ruleset-validator.types.ts` |
| `Violation` | `core-domain/src/domain/violation.ts` |

Su **intersección real es `message` más alguna noción de severidad**. Cinco de
los seis no llevan procedencia. Ninguno lleva determinismo. Así, un hallazgo que
viaja de una revisión de PR a un scorecard y de ahí a la base de conocimiento no
solo se re-tipa en cada salto: no hay nada que preservar, porque los campos que
un consumidor necesitaría nunca se capturaron.

Una séptima duplicación (`parseFindingLocation`, implementada de forma
independiente en el exportador SARIF) la descubrió **el compilador** al cablear
el contrato canónico en el barrel. Nadie la había advertido en revisión.

### I.2 Las copias no se quedan copias — se bifurcan

`GateViolation` y `ValidationIssue` se duplicaron literalmente en
`sdk-client/src/mcp/types.ts`. Desde entonces han divergido:

- `GateViolation` — el SDK ensanchó `severity` y **reemplazó el `location`
  obligatorio por un `artifact?` opcional**.
- `ValidationIssue` — degradado a `severity: string`; la restricción
  `MUST|SHOULD|COULD` desapareció por completo.

Ninguno es asignable a su contraparte de dominio, en ninguna dirección. Esto
replantea el costo de la duplicación: no es desprolijidad, es **degradación
silenciosa**. Una copia es un fork que *todavía* no ha divergido.

### I.3 Sesenta archivos re-codificando una sola regla

Sesenta archivos reformulan por su cuenta la frontera advisory — "binding:
false", "advisory", "non-binding", "recomienda pero no decide". Cada autor
parafrasea. No había artefacto al que apuntar en revisión, ni nada capaz de
detectar una violación.

---

## Parte II — Tres clases de falla, cada una medida

### II.1 El falso verde — un check que cree haber corrido

Es la clase de defecto dominante en el harness. **Siete instancias confirmadas:**

| # | Script | Qué reportó | Qué era cierto |
|---|---|---|---|
| 1 | `30-validate-phase-topology-disjoint` | OK, 8 ids de topología | 8 desde la raíz del repo, **5 desde `src/`**, exit 0 en ambos casos |
| 2 | `31-detect-duplicate-rulesets` | verde | escaneó un **corpus vacío**; el real tiene 145 rulesets |
| 3 | `32-validate-ruleset-schemas` | verde | el mismo corpus vacío |
| 4 | `12-validate-bmad-signatures` | imprimía su línea de éxito "BMAD Signatures validated" | `if (existsSync(adrDir))` se saltaba el bucle entero |
| 5 | `11-validate-product-docs` | — | leía el `package.json` equivocado, con lo que `pkg.version` era siempre `undefined` y la aserción de deriva de versión **nunca podía dispararse** |
| 6 | `33-check-adapter-freshness` | verde | el check del barrel nunca se disparaba (faltaba el prefijo `src/`) |
| 7 | `27-opa-parity-gate` | verde | 26 fixtures desde `/tmp`, **0 desde la raíz del repo**, exit 0 en ambos casos |

**El matiz que importa.** El arreglo obvio — "verificar que la ruta exista" — es
insuficiente, y #2/#3 lo demuestran. `rulesets/` **existe**; simplemente contiene
solo `agents/`, así que ningún `.rules.json` hizo match. `existsSync` pasó, la
ruta estaba viva, y la respuesta seguía siendo fabricada.

> Confirmar que una ruta existe no confirma que hayas mirado nada.

Por eso el guardrail que aterrizó asierta sobre **ítems escaneados**, no sobre
validez de la ruta. Un escaneo que arroja cero ítems debe fallar, porque cero
escaneados significa que el check no corrió — no significa que el check pasó.

### II.2 Promoción silenciosa de alcance — una operación cuyo alcance real difiere del aparente

Esta clase **no era visible en el análisis anterior**. Tres instancias, una de
ellas mía:

1. **`27-opa-parity-gate`** capturaba una excepción de `git diff` (que heredaba
   el cwd) y, en el `catch`, **se promovía silenciosamente a alcance FULL**. Una
   falla ensanchaba la operación en lugar de detenerla.
2. **El plugin `unimar-core`** imponía el estándar de arquitectura de una
   organización sobre todo repositorio que el usuario abriera, porque estaba
   habilitado a nivel de *usuario* y no al alcance de los repos que gobierna.
   Bloqueaba escrituras a un `.harness/` sobre el que no tenía autoridad.
3. **Este autor** ejecutó todos los scripts de CI en un bucle para recolectar
   exit codes, incluido `02-optimize-repo.mjs`, y **borró cinco archivos
   trackeados** — entre ellos el marcador de raíz del repo del que depende el
   nuevo resolver. El script se invocó sin verificar qué hacía.

Las tres comparten la misma forma: **el radio de impacto real excedió al radio
asumido, y nada hizo visible la diferencia.** #1 se ensanchó ante el error, #2
se ensanchó por defecto, #3 se ensanchó por invocación sin verificar.

Un harness que gobierna agentes debe hacer el alcance explícito y estrecharlo
ante la falla, nunca ensancharlo.

### II.3 Autoautorización

- Un validador de conocimiento escribió `promoted_by:` nombrándose **a sí mismo**.
- Se le pidió a un agente que certificara propuestas que él mismo había redactado.
- `AP-R03` (autoautorización) se ordena deliberadamente **antes** que `AP-R02`
  (el actor no es humano), porque "no puedes certificar tu propia salida" es la
  razón que un revisor necesita; "los agentes no son humanos" es la que ya daba
  por supuesta.

---

## Parte III — Un patrón de razonamiento que vale la pena estandarizar

Cinco instancias independientes, tres en código y dos en comportamiento de
agente, convergieron en el mismo sesgo sin haber sido diseñadas para ello:

| Instancia | Comportamiento |
|---|---|
| `KnowledgeOpportunityProvider` | no emite nada cuando el corpus está vacío — cero citas ahí significa "no hay corpus", no "no hay respuesta" |
| `resolveDuplicate` | devuelve `inconclusive` ante corpus vacío o fallo de recuperación; un `create` ahí significa "no sabemos nada", no "esto es nuevo" |
| `assessAutomationCandidate` | "¿es esto decidible mecánicamente?" pesa más que cualquier conteo, por grande que sea |
| Subagente frente al hook `S-16` | podía haberlo evadido con un heredoc de shell; se negó, con el argumento de que el guardrail existe precisamente para que la parte gobernada no pueda descartarlo |
| Subagente redactando `authority-policy` | se negó a codificar la autorrevisión humana, porque ningún ADR la exige — en su lugar la marcó como gap que requiere una decisión |

**Sesgo hacia el silencio bajo incertidumbre.** En todos los casos protege lo
mismo: la confianza en el sistema. Un check que se equivoca a menudo le enseña a
los ingenieros a esquivar *todos* los checks, incluidos los correctos. Una regla
equivocada es peor que ninguna regla.

Esto debería ser un patrón de razonamiento explícito y documentado del Harness —
lo más transferible que ha producido este trabajo.

---

## Parte IV — Matriz de capacidades

| Capacidad | Hoy | Problema | Normalizar como | Harness | Skill | Tool | Knowledge | Prioridad |
|---|---|---|---|---|---|---|---|---|
| Modelo de hallazgo | 6 interfaces + 2 forks en SDK | no viaja entre superficies sin perder campos | `Finding` canónico | X | | | | **P0** * |
| Resolución de rutas | hardcodeada en 17 scripts | respuesta dependiente del cwd, siempre verde | `PathResolver` fail-closed | X | | | | **P0** * |
| Cobertura de escaneo | inexistente | 0 ítems = verde | `assertScanned` | X | | | | **P0** * |
| Frontera de autoridad | prosa en 60 archivos | no auditable, no detectable | `AuthorityPolicy` | X | | | | **P0** * |
| Alcance de operación | implícito | se ensancha en error o por defecto | `ScopeContract` | X | | | | **P0** |
| Evidencia + procedencia | `Evidence` existe, sin cablear | `collect()` nunca se invoca desde la cadena | Evidence Engine | X | | | | **P1** |
| Recuperación de conocimiento | RAG + `IKnowledgePort` | sin trazabilidad de qué regla/versión se usó | Knowledge Engine | X | | | X | **P1** |
| Ensamblado de contexto | ad-hoc por agente | contexto grande, irrelevante o contradictorio | Context Engine | X | | | | **P1** |
| Detección de recurrencia | construida (KO detector) | acoplada al eje de conocimiento | `RecurrenceDetector` | | | | | **P1** |
| Dedup semántico | construido | solo se usa para KB; sirve a gaps, ADRs, propuestas | `DuplicateResolver` skill | | X | | | **P1** |
| Madurez para automatizar | construida | criterio general, uso particular | `AutomationEvaluator` | | X | | | **P1** |
| Ciclo petición→aprobación | `Waiver` + `KI/KO` separados | dos implementaciones del mismo ciclo | `GovernedRequest` | X | | | | **P1** |
| Revisión de arquitectura | prompt | no reproducible ni versionable | `ArchitectureReviewSkill` | | X | | | **P1** |
| Memoria por ámbito | dispersa | sin política de retención ni caducidad | Memory Engine | X | | | | **P2** |
| Observabilidad de agentes | ausente | no se puede auditar una ejecución | `AgentRun` trace (OTel) | X | | | | **P2** |
| Registro de capacidades | 3 registros parciales | deriva entre ellos | Capability Registry | X | | | | **P2** |
| Adapters de enforcement | 5 con forma común | ya resuelto como seam | Tools Registry | | | X | | **P2** |
| Declaración de dependencias | rota 2 veces en producción | `ora` sin usar, `pg` sin declarar | guard de release-drift | | | | | **P2** |
| Orquestación multiagente | manual | recomendaciones potencialmente contradictorias | Workflow Engine | X | | | | **P3** |

* = ya implementado (2026-07-18).

---

## Parte V — Capa de Inteligencia de Agentes

```text
                    EVOLITH AGENT HARNESS
  ┌──────────────────────────────────────────────────────┐
  │  Context Engine   Knowledge Engine   Rules Engine     │
  │  Evidence Engine  Memory Engine      Policy Engine    │
  │  Capability Registry   Skills   Tools   Evaluators    │
  │  Observability Engine                                 │
  └──────────────────────────────────────────────────────┘
                            ↓
                     WINSTON AGENTS
        Razona → Detecta → Explica → Recomienda → Aprende
```

Las responsabilidades, enunciadas como **lo que cada engine se niega a hacer**,
porque ahí es donde vive la gobernanza:

| Engine | Provee | Se niega a |
|---|---|---|
| **Context** | contexto acotado, rankeado y versionado por tarea | crecer sin límite; servir fuentes contradictorias sin señalar el conflicto |
| **Knowledge** | reglas, ADRs, patrones y casos con cita | responder sin nombrar la regla, su fuente y su versión |
| **Rules** | resolución de las reglas aplicables por alcance | inventar una regla que el Board no ha aceptado |
| **Evidence** | evidencia normalizada con procedencia obligatoria | emitir una observación sin atribución |
| **Memory** | recuerdo por ámbito (sesión…organizacional) | convertirse en un almacén sin límite; cada nivel declara su retención |
| **Policy** | `evaluateAuthority()` — ¿puede este actor hacer esto? | dejar que un actor certifique su propia salida |
| **Capability Registry** | un único catálogo de skills/tools/detectores | dejar que una capacidad corra sin estar declarada |
| **Observability** | una traza `AgentRun` completa | dejar que una ejecución termine sin auditar |

**El punto que sostiene todo lo demás:** estos engines en su mayoría *no son
código nuevo*. Los seams ya existen — `IQualitySignalProvider`,
`IKnowledgePort`, `EvaluationOrchestrator`, `IEnforcerAdapter`, el modelo
`Evidence`/`Provenance` de ADR-0111. Lo que falta es **cableado, no diseño**.
`Evidence.collect()` está implementado y jamás se invoca desde la cadena
gobernada.

---

## Parte VI — Modelos estándar

### Finding (aterrizado)

Severidad canónica `info|low|medium|high|critical` — el único vocabulario que es
superconjunto estricto de uno existente, de modo que ningún productor pierde
granularidad. Dos propiedades son innegociables y las hace cumplir el sistema de
tipos:

- **`FindingOrigin` es un argumento obligatorio en todo mapper.** Un hallazgo sin
  atribución es un error de compilación.
- **`determinism`** distingue una medición de una inferencia. Un hallazgo
  probabilístico jamás debe poder presentarse como un hecho.
- **`advisory: true`** como tipo literal, en espejo con
  `DecisionRecommendation.binding: false`.

Las proyecciones interpretativas son **no reversibles**, por lo que el token
literal del productor se conserva en `sourceSeverity`. Eso es lo que mantiene
distinguibles `warning` y `SHOULD` después de que ambos aterrizan en `medium`.

### Evidence

Extiende ADR-0111. Obligatorios: `source`, `dimension`, `determinism`,
`provenance{collectedBy, adapterVersion, timestamp}`. Adiciones propuestas:
`corpusVersion` e **`inconclusive`** — la lección de `knowledge-dedup`
generalizada.

> La distinción entre *"miré y no encontré nada"* y *"no pude mirar"* debe
> sobrevivir hasta el consumidor. Colapsarlas es la forma en que se fabrica la
> falsa confianza.

### Knowledge Opportunity

Ya implementado según ADR-0115: recurrencia → búsqueda de conocimiento → gap →
propuesta → revisión humana. **Debería ser una capacidad del Harness disponible
para todo agente**, no una funcionalidad del eje de conocimiento. Todo agente
que responde dos veces la misma pregunta sin citar ha encontrado un gap de
conocimiento.

---

## Parte VII — Ingeniería de Contexto

```text
Tarea del agente → Resolver de contexto → Organización → Producto → Repositorio
                 → Feature/PRD → Arquitectura → Reglas aplicables → ADR
                 → Base de conocimiento → Hallazgos previos → Evidencia actual
```

Frente a los cuatro riesgos enunciados:

| Riesgo | Mecanismo |
|---|---|
| Contexto demasiado grande | **selección antes que ranking** — resolver primero el alcance y rankear dentro de él. Rankear un corpus que no debiste cargar es el error caro. |
| Información irrelevante | contrato de alcance por tarea; el resolver declara qué incluyó **y qué excluyó**. |
| Información contradictoria | el conflicto se **expone, nunca se resuelve en silencio**. Una contradicción entre dos ADRs aceptados es un defecto de gobernanza y debe llegar a un humano. |
| Conocimiento obsoleto | `corpusVersion` estampado en cada recuperación; un hallazgo cita la versión de la que se derivó. |

El caché se versiona por `corpusVersion` + versión del ruleset, de modo que un
caché obsoleto sea detectable en lugar de invisible. **La compresión va
deliberadamente al final** — un contexto comprimido que descartó el dato
decisivo falla en silencio, que es la misma clase que el falso verde.

---

## Parte VIII — Memoria, Observabilidad, HITL y Versionado

**Niveles de memoria** — cada uno debe declarar retención e invalidación, o se
convierte en la base de datos descontrolada contra la que advierte la petición:

| Nivel | Vigencia | Invalidado por |
|---|---|---|
| Sesión | una ejecución | fin de la ejecución |
| Tarea | una cadena de tareas | finalización de la tarea |
| Repositorio | durable | commit que la contradice |
| Producto | durable | cambio de PRD |
| Arquitectura | durable | ADR que la supersede |
| Organizacional | durable | solo decisión del Board |

> El corpus ya tiene un mecanismo de gobernanza (`approved_knowledge_ids`) y está
> **vacío desde junio**. El cuello de botella no es el almacenamiento: es que
> nada se ha promovido. Añadir infraestructura de memoria no resuelve un cuello
> de botella de decisión.

**Observabilidad.** Una traza `AgentRun` por ejecución (OpenTelemetry), con spans
para recuperación de contexto, recuperación de conocimiento, llamadas a tools,
análisis, evaluación y recomendación. Cada ejecución responde: qué agente, qué
tarea, qué contexto, qué tools, qué reglas, qué evidencia, qué recomendación, qué
costo, qué latencia, qué confianza.

**Human-in-the-loop — acciones que un agente nunca debe tomar automáticamente:**

1. Promover conocimiento más allá de `candidate` (ADR-0097, ADR-0115).
2. Convertir una inferencia en regla exigible.
3. Otorgar una excepción arquitectónica o un waiver.
4. Certificar su propia salida.
5. Ensanchar su propio alcance ante una falla.

**Versionado.** Toda capacidad lleva una versión semántica; todo hallazgo cita la
versión de la capacidad y la versión del corpus que lo produjeron. Una capacidad
cuyos veredictos cambian debe hacer bump, para que un hallazgo histórico siga
siendo interpretable.

---

## Parte IX — Workflows multiagente y conflicto

```text
PR abierto → [Arquitectura · Seguridad · Calidad de código · SDLC] (en paralelo)
           → Agente de evidencia → Coordinador Winston → Revisión unificada
```

Resolución de conflictos, en orden:

1. **El determinismo gana sobre la inferencia.** Un hallazgo determinista pesa
   más que uno probabilístico sobre el mismo artefacto.
2. **La evidencia gana sobre la afirmación.** Un hallazgo sin evidencia pierde
   frente a uno que la tiene.
3. **El conflicto irresoluble escala.** Nunca se promedia dentro de un score —
   un desacuerdo entre dos agentes sobre una regla es información, y promediarla
   la destruye.

---

## Parte X — Qué NO debe normalizarse

La sección más importante, y la que suele faltar.

**Los umbrales.** ADR-0115 los dejó fuera deliberadamente. Recurrencia=2,
amplitud=3, similitud=0.9 son heurísticas que deben poder moverse sin una
decisión de gobernanza. Congelarlas dentro del Harness las vuelve inamovibles.

**El juicio "¿vale la pena capturar esto?"** Es exactamente lo que
`assessAutomationCandidate` se niega a inferir a partir de conteos. Normalizarlo
fabricaría certeza.

**La autorrevisión humana.** Ningún ADR prohíbe a un miembro del Board aceptar un
borrador que él mismo redactó. La revisión a cuatro ojos es una política real,
pero **separada**; codificarla sería un agente inventando gobernanza. Queda
registrada como gap abierto que requiere primero una línea de ADR.

**Qué instancia puede ratificar, waivear o hacer cumplir.** Los ADRs zanjan que
se requiere *un humano*, no *cuál*. Eso pertenece al RBAC, y ambos componen en
lugar de fusionarse.

---

## Parte XI — Roadmap

### P0 — Fundaciones · *el Harness debe ser confiable antes de ser inteligente*

| | Estado |
|---|---|
| `Finding` canónico + mappers | **aterrizado** (GT-558) |
| `PathResolver` fail-closed | **aterrizado** (GT-556) |
| Guardrail de cobertura cero | **aterrizado** (GT-557) |
| Frontera de autoridad ejecutable | **aterrizado** (GT-559) |
| `ScopeContract` — alcance explícito, se estrecha ante la falla | propuesto |
| Retirar los forks de `sdk-client` hacia el contrato canónico | propuesto |

Estos no agregan razonamiento. Impiden que el sistema se reporte mal a sí mismo.
Cualquier capa de inteligencia construida sobre un piso poco confiable hereda esa
falta de confiabilidad.

### P1 — Inteligencia

Cablear `Evidence.collect()` en la cadena gobernada; Context Engine con contratos
de alcance y exposición de conflictos; Knowledge Engine con cita obligatoria;
promover los tres componentes construidos para ADR-0115 (detector de recurrencia,
resolver de duplicados, evaluador de automatización) a capacidades compartidas;
unificar `Waiver` y `KI/KO` en un único `GovernedRequest`.

### P2 — Automatización

Capability Registry como fuente única; observabilidad `AgentRun`; niveles de
memoria con retención declarada; guard de declaración de dependencias.

### P3 — Optimización

Workflow Engine y resolución de conflictos multiagente; compresión de contexto;
federación de conocimiento entre productos.

---

## Respuestas a las preguntas clave

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Qué se repetía? | modelos de hallazgo (6+2 forks+1), resolución de rutas (17), regla advisory (60), aserciones de cobertura (7 falsos verdes) |
| 2 | ¿Qué normalizar? | los cuatro P0 (hechos) + contratos de alcance + cableado de evidencia |
| 3 | ¿Harness Core? | Finding, PathResolver, cobertura, autoridad, alcance, evidencia, contexto, conocimiento |
| 4 | ¿Skills? | revisión de arquitectura, resolución de duplicados, evaluación de automatización, scorecard, detección de deriva |
| 5 | ¿Tools? | GitHub, Git, OPA, CI/CD, OTel — ya son un seam vía `IEnforcerAdapter` |
| 6 | ¿Knowledge? | ADRs, patrones, antipatrones, casos reales, interpretaciones — vía el eje KO |
| 7 | ¿Compartido por todos los agentes? | contexto, evidencia, autoridad, observabilidad, memoria |
| 8 | ¿Específico de Winston? | coordinación y resolución de conflictos — no los primitivos |
| 9 | ¿Inyectado automáticamente? | reglas aplicables, ADRs relevantes, hallazgos previos sobre el mismo artefacto |
| 10 | ¿Totalmente automatizable? | detección, recolección de evidencia, validación determinista |
| 11 | ¿Requiere HITL? | promoción, ratificación, excepciones, creación de reglas |
| 12 | ¿Nunca automático? | los cinco listados en la Parte VIII |
| 13 | ¿Hallazgos reutilizables entre agentes? | solo una vez que compartan el contrato canónico — de ahí el P0 |
| 14 | ¿Cómo aprende Evolith? | eje KO: recurrencia → gap → propuesta → revisión humana → conocimiento |
| 15 | ¿Evitar duplicación? | Capability Registry + el compilador (fue quien encontró la séptima duplicación) |
| 16 | ¿Versionado? | semver por capacidad; los hallazgos citan versión de capacidad + de corpus |
| 17 | ¿Una capacidad mejora al agente? | medir los hallazgos que sobreviven a la verificación adversarial, no los hallazgos emitidos |

---

## Observación de cierre

Se resolvieron dos problemas el mismo día: un guardrail imponiendo un estándar
sobre un repositorio que no gobernaba, y un conjunto de guards reportando éxito
sobre corpus que nunca leyeron.

Son el mismo defecto. **En ambos casos el alcance real de un check difería de su
alcance aparente, y nada hizo visible la diferencia.** El plugin creía gobernar
Evolith. El script 30 creía haber examinado ocho topologías cuando había visto
cinco.

Un Harness cuyo propósito es gobernar agentes debe ser, antes que cualquier otra
cosa, **honesto sobre lo que realmente hizo**. Toda capacidad propuesta aquí es
consecuencia de eso.
