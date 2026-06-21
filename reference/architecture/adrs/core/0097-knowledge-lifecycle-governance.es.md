> **Bilingual Navigation:** [View English version](./0097-knowledge-lifecycle-governance.md)

# ADR-0097: Estándar de Gobernanza del Ciclo de Vida del Conocimiento

## Estado
Aceptado

## Fecha
2026-06-21

## Contexto y Problema
El pipeline de ingesta de conocimiento externo (establecido por GT-152) valida la estructura de los candidatos y la procedencia de las fuentes, pero carece de un modelo formal de gobernanza para **cómo** el conocimiento progresa de candidato crudo a referencia autoritativa. Actualmente:

- Todos los candidatos ingresan en estado `candidate` sin una compuerta de promoción definida.
- No hay un custodio responsable de las decisiones del ciclo de vida.
- El conocimiento rechazado o retirado no tiene registro de disposición, lo que hace imposible distinguir "aún no revisado" de "revisado y rechazado".
- No existe un rastro de decisión del Architecture Board para eventos de promoción, lo que significa que el conocimiento promovido carece de la autoridad arquitectónica requerida para consumo `executable` en compuertas CI y flujos agénticos.

Sin una gobernanza explícita del ciclo de vida, la ingesta de conocimiento corre el riesgo de convertirse en un pipeline de solo escritura — los candidatos se acumulan sin revisión arquitectónica, y el conocimiento obsoleto o reemplazado permanece indistinguible de la guía vigente.

## Decisión
Establecemos a **Winston (`@wilson`)** como custodio del ciclo de vida para todo el conocimiento externo y definimos un pipeline de promoción de cuatro etapas con evidencia obligatoria en cada transición:

`candidate → evaluated → accepted → executable`

Cada promoción requiere una decisión del Architecture Board registrada en un ADR (para `accepted` y `executable`) o un registro de revisión fechado (para `evaluated`). Los candidatos rechazados y retirados se conservan con un motivo de disposición en el registro fuente.

---

### 1. Pipeline de Promoción

| Etapa | Compuerta de Entrada | Evidencia Requerida | Custodio |
|---|---|---|---|
| `candidate` | Archivo YAML en `reference/knowledge/intake/` con esquema KI-* válido | Validación de contrato GT-152 pasa | CI |
| `evaluated` | Revisión completada por @wilson | Registro de revisión fechado en el registro de promoción; estado `evaluated` | @wilson |
| `accepted` | Decisión del Architecture Board | Referencia ADR-* en el registro de promoción; estado `accepted` | Architecture Board |
| `executable` | Artefactos de gobernanza dual-engine completos | ADR, regla Native, política OPA y fixtures pasando | Architecture Board |

#### Reglas de Transición

- Las etapas son secuenciales: un candidato **no debe saltar** una etapa (ej. `candidate → accepted` es inválido).
- Cualquier etapa puede transicionar a `retired` con un motivo de disposición.
- `retired` es un estado terminal — no se permite promoción adicional.

---

### 2. Custodia del Ciclo de Vida por Winston

`@wilson` es el responsable designado para:

| Responsabilidad | Artefacto |
|---|---|
| Revisión inicial y promoción `candidate → evaluated` | `promotion.promoted_by: "@wilson"` |
| Seguimiento de frescura de revisión | `review.next_review_at` y `review.review_freshness` |
| Recomendar candidatos para `accepted` al Architecture Board | Registro de revisión con resumen de evidencia |
| Decisiones de disposición para candidatos rechazados | Cadena `promotion.disposition` |

El Architecture Board retiene autoridad exclusiva para las promociones `accepted` y `executable`, las cuales deben referenciar un ADR aceptado.

---

### 3. Esquema del Registro de Promoción

Cada evento de promoción se registra en el candidato KI-* de la siguiente manera:

```yaml
promotion:
  status: evaluated
  promoted_at: "2026-06-21"
  promoted_by: "@wilson"
  adr: null
  native_rule: null
  opa_policy: null
  fixtures: []
  disposition: null
```

Cuando `status` es `retired` o cuando un candidato es rechazado antes de llegar a `evaluated`:

```yaml
promotion:
  status: retired
  promoted_at: "2026-06-21"
  promoted_by: "@wilson"
  disposition: "Reemplazado por ADR-0100 — guía de agregados actualizada"
```

---

### 4. Validación de la Máquina de Estados

La validación CI (`17-validate-knowledge-intake.mjs`) hace cumplir:

1. Solo transiciones válidas: `candidate → evaluated → accepted → executable`, o cualquier → `retired`.
2. `promoted_at` debe estar presente para cualquier estado que no sea `candidate`.
3. `promoted_by` debe estar presente para cualquier estado que no sea `candidate`.
4. Los estados `accepted` y `executable` requieren un campo `adr` no nulo.
5. Las disposiciones `retired` y de rechazo deben tener una cadena `disposition` no nula.

---

## Consecuencias

### Positivas
- **Trazabilidad**: Cada evento de promoción está fechado, atribuido y es legible por máquina — sin cambios de estado silenciosos.
- **Autoridad**: El conocimiento `executable` lleva una decisión verificable del Architecture Board, lo que lo hace seguro para usar en compuertas CI y recuperaciones agénticas.
- **Claridad**: Los candidatos rechazados y retirados se conservan con motivos, evitando ciclos de revisión y re-promoción accidental.
- **Pista de auditoría**: El ciclo de vida completo de cada candidato KI-* es recuperable solo desde el registro YAML.

### Negativas
- **Sobrecarga de proceso**: Cada promoción requiere evidencia explícita — ligera para `evaluated` (revisión de Wilson), más pesada para `accepted`/`executable` (ADR).
- **Latencia de transición**: Los candidatos pueden permanecer en `evaluated` mientras esperan ciclos del Architecture Board; el modelo de gobernanza acepta esto como una característica (sin promociones silenciosas).

## Referencias
- [ADR-0090: Estándar de Gobernanza de Conocimiento RAG](./0090-rag-knowledge-governance.es.md)
- [GT-152: Contrato de Conocimiento Externo y Esquema de Registro Fuente](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-152)
- [KI-EVANS-AGGREGATE-001](../../../knowledge/intake/KI-EVANS-AGGREGATE-001.yaml)
- [Esquema de Ingesta de Conocimiento](../../../../rulesets/schema/knowledge-intake.schema.json)

---
[Volver al Índice de ADRs Core](./README.es.md)

> **Firma del Agente:** Architect Agent
