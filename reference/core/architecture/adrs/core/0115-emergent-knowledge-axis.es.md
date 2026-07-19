# ADR-0115: Eje de Conocimiento Emergente — Conocimiento Originado al Aplicar el Estándar

> Navegación bilingüe: [English](./0115-emergent-knowledge-axis.md)

> **Firma del Agente:** Agente Arquitecto (Winston)

## Estado

Proposed

## Fecha

2026-07-18

## Contexto y Problema

[ADR-0097](./0097-knowledge-lifecycle-governance.es.md) estableció un ciclo de vida gobernado para el conocimiento — `candidate → evaluated → accepted → executable`, custodiado por `@winston`, con la promoción gateada por decisiones del Architecture Board y aplicada por `knowledge-intake.rego` (KI-R01..R07). Esa maquinaria es sólida y ya valida registros reales.

Tiene un solo origen: **fuentes externas**. El `knowledge-intake.schema.json` se titula *External Knowledge Intake Candidate*, su enum `source.class` es `book | public-article | official-docs`, y todo candidato debe apuntar a una entrada `SRC-*` con términos de licencia y retención. El pipeline responde a "leímos algo externo y queremos adoptarlo".

No tiene respuesta para la dirección contraria: el conocimiento que **emerge de aplicar el estándar**. Cuando un repositorio satélite incumple una regla de forma instructiva, cuando dos equipos leen la misma regla distinto, cuando una revisión concluye algo que merece preservarse, o cuando la misma pregunta se repite, ese conocimiento no tiene vía de entrada. Sobrevive, si acaso, como prosa en un pull request.

No es hipotético. Evidencia concreta hoy en este repositorio:

- Ninguna interfaz publicada puede capturar ese hallazgo (CLI 31 comandos, MCP 50 tools, Core API ~25 endpoints, agent-runtime 7 skills — ninguna es de intake).
- `approved_knowledge_ids` está vacío: nunca se ha promovido nada a retrieval.
- El paso `ground` de la cadena gobernada consulta `IKnowledgePort` en cada ejecución y descarta el resultado — la señal más rica de vacío de conocimiento se calcula y se tira.

El coste de no abordarlo es que Evolith detecta un incumplimiento pero no acumula comprensión sobre él. El mismo incidente se vuelve a analizar en cada repositorio que lo sufre.

## Objetivo y Alcance

Dar al conocimiento que se origina **dentro** del ecosistema la misma vía gobernada que ya tiene el externo, sin duplicar la gobernanza que ADR-0097 estableció.

**En alcance:** un segundo origen (`KO-*`) sobre el ciclo existente; la evidencia y trazabilidad que un hallazgo emergente debe portar; las reglas de qué puede y qué no puede capturarse; y la frontera entre lo que un agente puede hacer y lo que exige un humano.

**Fuera de alcance:** las heurísticas de detección en sí (qué señales, umbrales y puntuación de confianza — evolucionan y no deben congelarse en un ADR); la infraestructura de retrieval (ADR-0090 / ADR-0112); y el intake de propuestas de usuario, que es un asunto distinto rastreado por [UP-003](../../../control-center/opportunities/UP-003-user-contribution-intake-mechanism.es.md) y su ADR-0114 reservado.

## Opciones Consideradas

**Opción A — Una Knowledge Base separada con su propio ciclo de vida.** Almacén, esquema, estados y flujo de revisión paralelos, dedicados al conocimiento emergente.
*Rechazada.* Duplicaría un modelo de gobernanza que ya está aceptado, ya tiene aplicación OPA y ya nombra un custodio. Dos ciclos driftearían, y el drift sería silencioso: nada reconciliaría una entrada `KB-*` con una `KI-*` que cubra lo mismo. Este repositorio ha pagado repetidamente por fuentes de verdad duplicadas.

**Opción B — Reutilizar `KI-*` sin cambios, tratando un hallazgo interno como "fuente".** Modelar el repositorio originador como una entrada `SRC-*`.
*Rechazada.* Corrompe el significado de los campos. `source.rights_status` y los términos de licencia de una entrada `SRC-*` existen para gobernar material de terceros; un hallazgo en nuestro propio repositorio no tiene titular de derechos, ni fecha de recuperación, ni restricciones de cita. Los revisores perderían la capacidad de distinguir teoría externa adoptada de práctica interna observada — una distinción que importa al decidir cuánta autoridad carga una afirmación.

**Opción C — Un segundo origen sobre el mismo ciclo de vida.** Introducir `KO-*` (Knowledge Opportunity) compartiendo estados, custodio, gates de promoción y reglas OPA de `KI-*`, difiriendo solo en el bloque que describe de dónde vino el conocimiento.
*Adoptada.* Ver abajo.

**Opción D — Que los agentes escriban conocimiento directamente, con revisión humana posterior a la publicación.** Optimiza para volumen.
*Rechazada.* Invierte la carga de la prueba. El conocimiento publicado porta autoridad institucional; retractarlo es mucho más costoso que no publicarlo. Además contradice los gates de promoción de ADR-0097 y el contrato no vinculante que gobierna toda recomendación del Core.

## Decisión y Justificación

Adoptamos la **Opción C**: un segundo origen sobre el ciclo de vida que ADR-0097 ya gobierna.

Un registro `KO-*` es estructuralmente un `KI-*` en el que el bloque `source` — que describe una obra externa — se reemplaza por un bloque `origin` que describe la observación:

| `KI-*` (externo) | `KO-*` (emergente) |
|---|---|
| `source.class: book \| public-article \| official-docs` | `origin.class: violation \| interpretation \| exception \| review-decision \| recurrence \| incident` |
| `source.author` / `work` / `locator` | `origin.repository` / `component` / `commit` / `pull_request` |
| `source.rights_status` | `origin.sensitivity` |
| `source_registry_id → SRC-*` | `origin.evidence_ref → Evidence.provenance.artifactHash` |

Todo lo demás queda igual, y deliberadamente: los mismos estados `candidate → evaluated → accepted → executable`, el mismo custodio `@winston`, el mismo bloque `promotion` y los mismos gates de decisión del Board. Crucialmente, **KI-R03 ya codifica la vía Knowledge → Rule → Automation** — `executable` exige un ADR, una regla nativa, una política OPA y fixtures que pasen. El conocimiento emergente hereda ese gate en vez de inventar uno.

Justificación, por peso:

1. **Un ciclo de vida no puede driftear consigo mismo.** El modo de fallo que este repositorio encuentra una y otra vez es autoridad duplicada que se queda obsoleta. Un segundo origen comparte por construcción el único conjunto de reglas de promoción.
2. **La gobernanza ya existe y se aplica.** `knowledge-intake.rego` porta siete reglas; reutilizarlas significa que el conocimiento emergente está gobernado desde el día uno, no tras escribir una segunda política y mantenerla en paridad.
3. **La procedencia ya está modelada.** `Evidence.provenance` ([ADR-0111](./0111-quality-signal-provider-port.es.md)) registra `collectedBy`, `adapterVersion`, `artifactHash` y `timestamp` — exactamente la trazabilidad que un hallazgo emergente requiere. Referenciarla evita un modelo de evidencia paralelo.
4. **La frontera advisory tiene un precedente que heredar.** `DecisionRecommendation` es `binding: false` por contrato ([ADR-0101](./0101-core-stateless-evaluation-engine.es.md)). Un agente que propone conocimiento hereda esa forma en vez de adquirir una autoridad nueva.

### Frontera de autoridad

Un agente PUEDE detectar, analizar, buscar conocimiento existente, evaluar duplicidad, proponer una acción y redactar un `KO-*` en `candidate`. Un agente NO DEBE avanzar un registro más allá de `candidate`, ni redactar o modificar una entrada aceptada, ni convertir una inferencia en regla. La autoridad de promoción queda exactamente como ADR-0097 la asignó: `@winston` para `evaluated`, el Architecture Board para `accepted` y `executable`.

Un borrador DEBE separar **hechos confirmados** (lo que muestra la evidencia) de **interpretación del agente** (lo que el agente concluye) y **verificación pendiente**. Una inferencia presentada como decisión establecida es un defecto de gobernanza, no de formato.

### Exclusiones

NO DEBE crearse un `KO-*` para un hallazgo puramente sintáctico, sin impacto arquitectónico, ya cubierto completamente por conocimiento existente, o que descanse en opinión sin evidencia. NO DEBE contener credenciales, secretos, datos personales ni información identificativa de cliente; `origin.sensitivity` gobierna qué puede publicarse, y el material que no pueda generalizarse sin exponer a un cliente no pertenece al conocimiento compartido.

## Evidencia y Criterios de Evaluación

Las opciones se juzgaron por: si preservan una única fuente de gobernanza; si reutilizan aplicación ya existente; si mantienen acotada la autoridad del agente; y si pueden validarse con los guards que ya están en el repositorio.

Evidencia de apoyo en el código actual:

- `src/rulesets/schema/knowledge-intake.schema.json` — la estructura que se extiende; `review.owner` es un `const` de esquema con valor `@winston`.
- `src/rulesets/opa/knowledge-intake.rego` — KI-R01..R07, 9 tests que pasan; KI-R03 es el gate de automatización que esta decisión hereda.
- `src/packages/core-domain/src/evaluation/contracts/quality-evidence.ts` — los modelos `Evidence` y `Provenance` referenciados por `origin.evidence_ref`.
- `.harness/scripts/ci/17-validate-knowledge-intake.mjs` / `18-validate-knowledge-parity.mjs` — la validación dual-engine que un registro emergente también debe satisfacer.

Arte previo considerado: los architecture decision records como género resuelven *por qué se tomó una decisión* pero no *qué se aprendió al aplicarla*; los postmortems de incidentes capturan aprendizaje operativo pero no tienen vía de promoción hacia política ejecutable. El hueco que este ADR aborda está entre ambos.

## Consecuencias, Riesgos y Compromisos

**Positivas.** El conocimiento emergente se vuelve gobernable sin ciclo de vida nuevo. La vía Knowledge → Rule → Automation se vuelve alcanzable desde la práctica real y no solo desde teoría adoptada. Los satélites pueden originar casos sin poseer conocimiento, y referenciar un identificador estable en vez de copiar prosa.

**Negativas / compromisos aceptados.** La superficie de intake se amplía, así que crece la carga de revisión — mitigado exigiendo evidencia y priorizando reutilizar sobre crear. Un esquema compartido implica que un cambio específico de `origin` arriesga tocar la ruta de `source`; se acepta deliberadamente, porque la alternativa (dos esquemas) es el drift que esta decisión existe para evitar.

**Riesgos.**
- *Dilución del backlog* — muchos candidatos de bajo valor. Mitigado por las reglas de exclusión y porque un `KO-*` en `candidate` no porta autoridad.
- *Automatización prematura* — un patrón promovido a regla con evidencia fina. Mitigado por KI-R03, que ya exige fixtures y un ADR antes de `executable`.
- *Fuga de sensibilidad* — un detalle específico de cliente llegando al conocimiento compartido. Mitigado por `origin.sensitivity` como campo obligatorio, pero es un riesgo residual que la revisión debe vigilar activamente; ningún esquema lo detecta del todo.

## Referencias

- [ADR-0097 — Estándar de Gobernanza del Ciclo de Vida del Conocimiento](./0097-knowledge-lifecycle-governance.es.md)
- [ADR-0090 — Estándar de Gobernanza de Conocimiento RAG](./0090-rag-knowledge-governance.es.md)
- [ADR-0101 — Core como Motor de Evaluación Stateless](./0101-core-stateless-evaluation-engine.es.md)
- [ADR-0111 — Puerto Quality Signal Provider](./0111-quality-signal-provider-port.es.md)
- [ADR-0112 — Plataforma de Embeddings y Vector-Store RAG](./0112-rag-embedding-and-vector-store-platform.es.md)
- `src/rulesets/schema/knowledge-intake.schema.json` · `src/rulesets/opa/knowledge-intake.rego`

## Decisiones y Estándares Relacionados

- **Extiende** ADR-0097: mismos estados, mismo custodio, mismos gates de promoción; añade un origen.
- **Restringido por** ADR-0101: el Core evalúa y recomienda; no decide.
- **Consume** el `Evidence`/`Provenance` de ADR-0111 como portador de evidencia para `origin.evidence_ref`.
- **Alimenta** ADR-0090 / ADR-0112: el conocimiento aprobado llega a retrieval por la allow-list de proyección existente.
- **Distinto de** [UP-003](../../../control-center/opportunities/UP-003-user-contribution-intake-mechanism.es.md) y su ADR-0114 reservado: aquel gobierna propuestas levantadas por *usuarios a través de una interfaz*; este gobierna conocimiento observado por *agentes aplicando el estándar*. Convergen en el mismo ciclo de vida y no deben implementarse como dos sistemas.
