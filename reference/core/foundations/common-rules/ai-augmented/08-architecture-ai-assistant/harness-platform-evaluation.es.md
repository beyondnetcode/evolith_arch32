# Harness AI Agent — Evaluación de Plataforma Empresarial

> **Navegación bilingüe:** [English](./harness-platform-evaluation.md)  
> **Propietario:** Evolith Architecture Board  
> **Estado:** Evaluación — Recomendado para adopción en Fase 2  
> **Última revisión:** 2026-05-27

> **Disambiguación:** Este documento evalúa **Harness.io** (la plataforma empresarial DevOps) y sus capacidades de Agente AI como capa de orquestación para el Asistente AI de Arquitectura Evolith. Esto es distinto de "Harness Engineering" (la metodología para envolver modelos de IA, documentada en [01-harness-engineering](../01-harness-engineering/harness-reference.es.md)).

---

## 1. ¿Qué es Harness AI Agent?

Harness es una plataforma empresarial DevOps que provee CI/CD, gestión de costos en la nube, feature flags, testing de seguridad y — relevante aquí — **Harness AI (AIDA)**: una capa nativa de IA embebida en toda la plataforma que puede:

- **Generar y revisar código** via AI Developer (Code Intelligence)
- **Automatizar workflows de pipeline** con orquestación impulsada por IA
- **Análisis de causa raíz** para pipelines fallidos
- **Workflows de gobernanza y aprobación** para cambios generados por IA
- **Despliegue self-hosted** para aislamiento de conocimiento privado

### Harness AI Agent vs. Otras Herramientas del Ecosistema

| Capacidad | Claude Code | GitHub Copilot | Cursor / Cline | **Harness AI Agent** |
|---|---|---|---|---|
| Generación de código en IDE | Sí | Sí | Sí | No |
| Automatización de revisión de PR | Sí | Sí | No | Sí |
| Orquestación de pipeline | No | No | No | Sí |
| Workflow multi-agente | Sí | No | No | Sí |
| Bucles de aprobación humana | Sí | No | No | Sí |
| Despliegue privado | Sí | No | No | Sí |
| Integración CI/CD | No | Sí | No | Sí |
| Workflows de gobernanza | No | No | No | Sí |
| Seguimiento de costos | No | No | No | Sí |
| Knowledge base RAG | Sí | No | No | Sí (via MCP / custom) |

**Conclusión:** Harness AI Agent está posicionado de forma única como la **capa de orquestación y gobernanza** — no como el asistente de código principal, sino como la plataforma que gestiona workflows de IA, cadenas de aprobación y automatización de pipelines en todas las demás herramientas.

---

## 2. Arquitectura Recomendada: Harness como Orquestador

```
┌──────────────────────────────────────────────────────────────────┐
│                    ECOSISTEMA AI EVOLITH                         │
│                                                                  │
│  CAPA IDE (Herramientas del desarrollador)                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │   Claude   │ │   Cursor   │ │   Cline    │ │   Copilot    │  │
│  │   Code     │ │            │ │   / Roo    │ │              │  │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──────┬───────┘  │
│        │              │              │               │           │
│        └──────────────┴──────────────┴───────────────┘           │
│                              │                                   │
│                   Capa de Conocimiento Evolith (RAG)             │
│                   [ADRs · Patrones · Estándares]                 │
│                              │                                   │
│  ┌───────────────────────────▼──────────────────────────────┐   │
│  │              PLATAFORMA HARNESS AI AGENT                 │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │   │
│  │  │ Agente      │  │ Workflows    │  │ Automatización  │ │   │
│  │  │ Orquestador │  │ de Aprobación│  │ de Pipeline     │ │   │
│  │  │             │  │ (HITL)       │  │                 │ │   │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘ │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │   │
│  │  │ Gate de     │  │ Coordinación │  │ Costos y        │ │   │
│  │  │ Cumplimiento│  │ Multi-agente │  │ Gobernanza      │ │   │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────▼──────────────────────────────┐   │
│  │       CAPA DE ENTREGA (GitHub Actions / CI)              │   │
│  │  Gate cumplimiento ADR · Gate cobertura · Scan seguridad │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Posibilidades de Integración

### 3.1 Harness como Gate de Cumplimiento Arquitectónico

Los pipelines de Harness pueden integrar un **Paso de Cumplimiento Arquitectónico** personalizado que:
- Llama a la API RAG de Evolith
- Valida el diff del PR contra las restricciones ADR
- Bloquea el pipeline si se violan restricciones duras
- Genera un reporte de cumplimiento como comentario en el PR

```yaml
# Ejemplo de paso de pipeline Harness
- step:
    type: Plugin
    name: Evolith Architecture Gate
    identifier: evolith_arch_gate
    spec:
      connectorRef: evolith_rag_connector
      image: evolith/arch-gate:latest
      settings:
        adr_registry_url: ${EVOLITH_KNOWLEDGE_BASE_URL}
        fail_on_hard_violations: true
        report_warnings: true
        phase: ${PRODUCT_PHASE}
        runtime: ${PRODUCT_RUNTIME}
```

### 3.2 Harness AI + Workflow de Revisión ADR

Cuando un desarrollador propone un nuevo ADR via PR, Harness orquesta:

```
PR abierto con nuevo ADR
        │
        ▼
[Harness] Trigger: Pipeline de Revisión AI ADR
        │
        ▼
[Agente 1] Validar completitud de plantilla ADR
  - ¿Sección de Contexto presente?
  - ¿Decisión claramente indicada?
  - ¿Consecuencias documentadas?
  - ¿Referencias ADRs existentes?
        │
        ▼
[Agente 2] Verificar conflictos con ADRs existentes
  - Búsqueda de similitud semántica contra el corpus ADR
  - Detectar si el nuevo ADR reemplaza a uno existente
  - Detectar contradicciones
        │
        ▼
[Aprobación Humana] Notificación al Architecture Board
  - Gate de aprobación Harness con lista de miembros del Board
  - Mínimo 2 aprobaciones requeridas
  - El rechazo requiere justificación documentada
        │
        ▼
[Agente 3] En aprobación: Actualizar índice ADR + activar re-ingestión de conocimiento
```

### 3.3 Workflow Multi-Agente de Harness para Desarrollo de Features

```
El desarrollador crea una feature branch
        │
        ▼
[Trigger Harness] Pipeline AI-Assisted Feature
        │
   ┌────┴──────────────────────────────────────┐
   │                                           │
   ▼                                           ▼
[Architect Agent]                    [Coder Agent]
  Consulta: "¿Qué ADRs aplican        Genera: scaffold siguiendo
  a esta feature?"                    patrón canónico CP-04
  Output: lista ADR + restricciones   Output: esqueleto de código
   │                                           │
   └────────────────┬──────────────────────────┘
                    │
                    ▼
            [Reviewer Agent]
            Validar código generado
            contra ADRs recuperados
                    │
            ┌───────┴──────────┐
            │                  │
        VIOLACIONES         CHECK OK
        ENCONTRADAS             │
            │                  ▼
            ▼           [QA Agent]
     Devolver al         Generar scaffold
     Coder Agent         de tests
     con instrucciones           │
     de corrección               ▼
                    [Gate de Revisión Humana]
                    El desarrollador revisa
                    todo el output AI
                    antes de commitear
```

### 3.4 Aislamiento de Conocimiento Privado

Harness soporta **despliegue self-hosted** y **enrutamiento de modelo AI privado**, habilitando:
- Los ADRs y estándares propietarios nunca salen de la red corporativa
- Los modelos AI pueden ser self-hosted (Llama, Mistral) o contratados corporativamente (Claude, GPT-4 via API privada)
- Knowledge base almacenada en vector store privado (Qdrant self-hosted)
- Todo el tráfico AI permanece dentro del perímetro VPC

---

## 4. Modelo de Gobernanza

### 4.1 Gates de Aprobación Harness en el Workflow AI

| Gate | Disparador | Aprobadores | SLA |
|---|---|---|---|
| Revisión de Borrador ADR | PR con nuevo ADR abierto | Architecture Board (2 de 3) | 48h |
| Sobrescritura de Violación Dura | IA bloquea un patrón como violación | Architecture Board (unánime) | 24h |
| Adopción de Nueva Herramienta | IA señala herramienta desconocida | Arquitecto + Security Engineer | 72h |
| Cambio de Infra en Producción | IaC generado por IA apunta a prod | Engineering Manager + DevOps Lead | 24h |
| Actualización de Base de Conocimiento | Bump de versión Evolith | Architecture Board | 1 semana |

### 4.2 Trazabilidad de Auditoría

Cada acción AI en el workflow de Harness se registra con:
- ID y versión del agente
- Versión de la base de conocimiento usada
- ADRs recuperados en contexto
- Aprobaciones humanas registradas
- Violaciones encontradas y disposición

Esto crea una **cadena de trazabilidad completa**: requerimiento → ADR → sugerencia AI → aprobación humana → commit.

---

## 5. Controles de Seguridad y Conocimiento Privado

| Control | Implementación |
|---|---|
| **Aislamiento de red** | Todos los agentes Harness corren en VPC privada; sin llamadas a API AI externas sin conector aprobado |
| **Clasificación de conocimiento** | ADRs etiquetados `public` / `internal` / `confidential`; ADRs confidenciales excluidos de contextos de vendor |
| **Aislamiento de credenciales** | Los agentes AI acceden a la knowledge base via cuentas de servicio con scopes de solo lectura |
| **Log de auditoría** | Todas las consultas y respuestas AI registradas en audit trail inmutable (extiende ADR-0016) |
| **Gobernanza de modelos** | Solo modelos aprobados via ADR-AI-003 pueden ser invocados desde pipelines Harness |
| **Residencia de datos** | Harness self-hosted + vector store self-hosted asegura que los datos nunca salgan de la región |

---

## 6. Resumen de Evaluación

| Dimensión | Puntaje | Notas |
|---|---|---|
| Capacidad de orquestación | [Excelente] | Multi-agente nativo, workflows de aprobación, integración de pipeline |
| Integración de knowledge base | [Bueno] | Via MCP o plugin personalizado; sin RAG nativo |
| Experiencia IDE | [Limitado] | No es una herramienta IDE para desarrolladores; mejor como capa CI/CD |
| Soporte self-hosted | [Excelente] | Opción self-hosted completa para despliegues privados |
| Workflows de gobernanza | [Excelente] | Gates de aprobación HITL nativos, audit trails |
| Costo | [Medio] | Precios empresariales; justificado para uso en gran organización |
| Complejidad de configuración | [Medio] | Requiere experiencia en configuración de pipelines |
| Soporte multi-agente | [Excelente] | Orquestación nativa de agentes |

### Recomendación

**Adoptar Harness AI Agent como capa de orquestación y gobernanza (Fase 2+).**

- **Fase 1:** Usar enfoque de harness engineering (AGENTS.md + system prompts) en herramientas IDE
- **Fase 2:** Agregar pasos de pipeline AI de Harness para gates de cumplimiento y workflows de revisión ADR
- **Fase 3:** Orquestación multi-agente completa via Harness para pipelines de desarrollo de features

Harness **no es un reemplazo** para las herramientas IDE (Claude Code, Cursor, Copilot). Es el **plano de control empresarial** que rige lo que los agentes AI pueden hacer y asegura supervisión humana en puntos de decisión críticos.

---

*Parte de la [Estrategia del Asistente AI de Arquitectura](./ai-architecture-assistant-strategy.es.md)*
