# Plantilla: Discovery Knowledge Brief

> **Navegación Bilingüe:** [English Version](./discovery-knowledge-brief-template.md)
> **Propósito:** Documento base que captura el problema, el valor, los actores, el contexto, las restricciones y los riesgos. Esta es la semilla de conocimiento para toda la iniciativa.
>
> **Fase SDLC:** 01 - Discovery / Ideación
>
> **Subfase:** 01.1 - Knowledge-First Discovery / KDD Readiness
>
> **Responsable sugerido:** Product Owner / Business Analyst
>
> **Quality Gate:** Aprobación del Knowledge Brief

## Metadatos del Artefacto

* **URL Upstream Evolith:** `En construcción - Solicitar a Upstream`
* **Entradas Requeridas:** Disparador de negocio o problema detectado, patrocinador identificado, mapa de stakeholders.
* **Salidas Esperadas:** Knowledge Brief aprobado que alimenta el Registro de Supuestos y Preguntas, el Paquete de Contexto de Discovery y el Mapa de Capacidades.
* **Taxonomía Aplicada:** Alineado con el glosario Evolith (Bounded Context, Value Stream, Risk, Assumption).
* **Rules Evolith Aplicables:** R-03 (UTF-8 Clean), R-09 (Readability), R-13 (Functional Structure).

---

## 1. Estructura Documental (Markdown)

```markdown
# Discovery Knowledge Brief: [Nombre de la Iniciativa]

## 1. Declaración del Problema
[¿Qué problema u oportunidad específica se está abordando? Usa lenguaje de negocio claro (Rule R-09).]

## 2. Propuesta de Valor
[¿Qué valor medible o cualitativo genera resolver este problema? Cuantifica cuando sea posible.]

## 3. Stakeholders / Actores
[¿Quiénes son los actores clave? Incluye patrocinador, usuarios finales, equipos afectados y tomadores de decisiones.]

| Rol | Nombre / Equipo | Responsabilidad |
|---|---|---|
| Patrocinador | [Nombre] | [Responsabilidad] |
| Product Owner | [Nombre] | [Responsabilidad] |
| Arquitecto | [Nombre] | [Responsabilidad] |
| Usuarios Afectados | [Equipo/Grupo] | [Descripción del impacto] |

## 4. Contexto de Dominio
[Describe el dominio de negocio, los bounded contexts involucrados y cómo esta iniciativa se relaciona con sistemas existentes.]

## 5. Restricciones
[¿Qué restricciones organizativas, técnicas, regulatorias o de recursos limitan el espacio de soluciones?]

- [Restricción 1]
- [Restricción 2]

## 6. Riesgos
[¿Qué podría impedir el éxito o reducir la entrega de valor? Incluye probabilidad e impacto.]

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| [Riesgo 1] | [Alta/Media/Baja] | [Alta/Media/Baja] | [Estrategia] |

## 7. Supuestos
[¿Qué condiciones deben cumplirse para que esta iniciativa tenga éxito?]

- [Supuesto 1]
- [Supuesto 2]

## 8. Candidatos de Decisión
[¿Qué decisiones arquitectónicas o de producto deben tomarse antes de avanzar?]

| Decisión | Opciones | Estado |
|---|---|---|
| [Decisión 1] | [Opción A vs Opción B] | Abierta |

## 9. Enlaces de Evidencia
[Enlaces a documentos de soporte, fuentes de datos, investigación o artefactos previos.]

| Evidencia | Tipo | Enlace |
|---|---|---|
| [Evidencia 1] | [Datos/Investigación/ADR] | [URL o ruta] |
```

---

## 2. Estructura de Datos (JSON)

Para integración con el CLI de Evolith y herramientas automáticas de scaffolding.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Discovery Knowledge Brief",
  "type": "object",
  "required": ["id", "businessTriggerId", "problem", "value", "actors", "context", "constraints", "risks", "assumptions", "decisionCandidates", "evidenceLinks", "adoptionLevel", "status"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Identificador único de este Knowledge Brief."
    },
    "businessTriggerId": {
      "type": "string",
      "description": "Referencia al disparador de negocio o ticket de problema."
    },
    "problem": {
      "type": "string",
      "description": "Descripción en lenguaje claro del problema u oportunidad."
    },
    "value": {
      "type": "string",
      "description": "Valor o beneficio esperado de resolver el problema."
    },
    "actors": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["role", "name", "responsibility"],
        "properties": {
          "role": { "type": "string" },
          "name": { "type": "string" },
          "responsibility": { "type": "string" }
        }
      },
      "description": "Stakeholders clave y sus roles."
    },
    "context": {
      "type": "string",
      "description": "Contexto del dominio de negocio y relaciones con bounded contexts."
    },
    "constraints": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Restricciones organizativas, técnicas o regulatorias."
    },
    "risks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["description", "probability", "impact"],
        "properties": {
          "description": { "type": "string" },
          "probability": { "type": "string", "enum": ["High", "Medium", "Low"] },
          "impact": { "type": "string", "enum": ["High", "Medium", "Low"] },
          "mitigation": { "type": "string" }
        }
      },
      "description": "Riesgos identificados con probabilidad e impacto."
    },
    "assumptions": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Condiciones que deben cumplirse para el éxito."
    },
    "decisionCandidates": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["decision", "options", "status"],
        "properties": {
          "decision": { "type": "string" },
          "options": { "type": "string" },
          "status": { "type": "string", "enum": ["Open", "Decided", "Deferred"] }
        }
      },
      "description": "Decisiones pendientes que requieren resolución."
    },
    "evidenceLinks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["label", "type", "url"],
        "properties": {
          "label": { "type": "string" },
          "type": { "type": "string" },
          "url": { "type": "string" }
        }
      },
      "description": "Evidencia de soporte y referencias."
    },
    "adoptionLevel": {
      "type": "string",
      "enum": ["Mandatory", "Recommended", "Optional"],
      "description": "Nivel de adopción de este artefacto."
    },
    "status": {
      "type": "string",
      "enum": ["Draft", "In Review", "Approved", "Superseded"],
      "description": "Estado actual del ciclo de vida."
    }
  }
}
```

---

## 3. Ejemplo Mínimo Aplicado

```json
{
  "id": "KB-2024-001",
  "businessTriggerId": "JIRA-PROJ-456",
  "problem": "El onboarding de clientes tarda 48 horas debido a la verificación manual de identidad, causando un 40% de abandono en las primeras 24 horas.",
  "value": "Reducir el tiempo de onboarding a menos de 5 minutos y disminuir la tasa de abandono en un 60% en dos cuatrimestres.",
  "actors": [
    { "role": "Patrocinador", "name": "VP de Experiencia de Cliente", "responsibility": "Autoridad presupuestaria y alineación estratégica" },
    { "role": "Product Owner", "name": "María López", "responsibility": "Propiedad del backlog y comunicación con stakeholders" },
    { "role": "Arquitecto", "name": "Carlos Ruiz", "responsibility": "Factibilidad técnica y diseño de bounded context" }
  ],
  "context": "El onboarding digital abarca los bounded contexts de Verificación de Identidad y Ciclo de Vida del Cliente. Los sistemas existentes usan un módulo de autenticación monolítico que no puede escalar a integraciones de canales de socios.",
  "constraints": [
    "Debe cumplir con regulaciones KYC/AML para todos los mercados objetivo",
    "El contrato actual del proveedor de identidad vence en 6 meses",
    "La capacidad del equipo se limita a 4 ingenieros en Q1"
  ],
  "risks": [
    { "description": "El SLA del proveedor de identidad está por debajo del 99.9% en períodos de pico", "probability": "Medium", "impact": "High", "mitigation": "Negociar cláusula de SLA o evaluar proveedor alternativo" },
    { "description": "Retrasos en aprobación regulatoria para el nuevo flujo de verificación", "probability": "Low", "impact": "High", "mitigation": "Compromiso temprano con el equipo de Compliance" }
  ],
  "assumptions": [
    "Los requisitos KYC/AML son estables para los próximos 12 meses",
    "Las cuotas del proveedor de nube soportan la concurrencia proyectada de 500 req/s",
    "El bus de eventos existente puede absorber los eventos del dominio de onboarding sin re-arquitectura"
  ],
  "decisionCandidates": [
    { "decision": "Selección del proveedor de identidad", "options": "Proveedor actual vs. alternativo con soporte OAuth2", "status": "Open" },
    { "decision": "Patrón de orquestación del onboarding", "options": "Saga vs. Corografía vs. Orquestación", "status": "Open" }
  ],
  "evidenceLinks": [
    { "label": "Informe de Abandono Q3", "type": "Data", "url": "./docs/reports/q3-abandonment.md" },
    { "label": "Resumen Regulatorio KYC", "type": "Research", "url": "./docs/compliance/kyc-regulatory-brief.md" }
  ],
  "adoptionLevel": "Mandatory",
  "status": "In Review"
}
```

---

## 4. Handoff hacia la Siguiente Fase

Una vez aprobado, el **Knowledge Brief** alimenta directamente:

1. **Registro de Supuestos y Preguntas** — todos los supuestos y decisiones abiertas migran al registro vivo para seguimiento.
2. **Paquete de Contexto de Discovery** — los campos del Knowledge Brief poblan el paquete de contexto para agentes de IA y repositorios satélite.
3. **Mapa de Capacidades** — el contexto del dominio y la declaración del problema informan la descomposición de capacidades.

Los campos `actors`, `risks` y `decisionCandidates` son consumidos por artefactos descendentes sin transformación.

---

## Quality Checklist

- [ ] La declaración del problema es específica, medible y escrita en lenguaje de negocio claro
- [ ] La propuesta de valor incluye al menos una métrica cuantificable
- [ ] Todos los stakeholders clave están identificados con responsabilidades claras
- [ ] Las restricciones están listadas explícitamente (no enterradas en prosa)
- [ ] Los riesgos incluyen evaluaciones de probabilidad e impacto
- [ ] Los supuestos son verificables de forma independiente
- [ ] Los candidatos de decisión listan opciones concretas (no áreas vagas)
- [ ] Los enlaces de evidencia resuelven a documentos o fuentes de datos reales
- [ ] El lenguaje es consistente (sin mezcla de EN/ES dentro del archivo)
- [ ] El documento está almacenado en control de versiones junto con el código o artefactos de diseño relevantes

---

## Nivel de Adopción Recomendado

**Obligatorio** para todas las iniciativas nuevas que ingresan a Discovery. El Knowledge Brief es el prerrequisito para el Registro de Supuestos y Preguntas, el Paquete de Contexto de Discovery y el Mapa de Capacidades.

---

## Criterios de Actualización

| Disparador | Acción |
|---|---|
| Nuevo stakeholder identificado | Agregar a la tabla de actores y al array actors del JSON |
| Riesgo materializado o nuevo riesgo emergente | Actualizar la sección de riesgos con probabilidad/impacto actual |
| Supuesto validado o invalidado | Actualizar supuestos y sincronizar con el Registro de Supuestos y Preguntas |
| Candidato de decisión resuelto | Marcar como Decided, registrar resultado y enlazar al ADR |
| Cambio en el alcance del disparador de negocio | Revisar la declaración del problema y la propuesta de valor |
| Revisión trimestral | Revisión completa del artefacto; degradar o cerrar si la iniciativa está inactiva |
