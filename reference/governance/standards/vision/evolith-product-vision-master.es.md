# Evolith — Visión Maestra del Producto

> **Navegación Bilingüe:** [English Version](./evolith-product-vision-master.md)

**Estado:** Aprobado
**Propietario:** Evolith Architecture Board
**Última Actualización:** 2026-06-06

---

## 1. Declaración de Visión

**Evolith** es un Framework de Gobernanza de Ingeniería AI-Native diseñado para democratizar el desarrollo de software de élite. Actúa como el salvavidas para empresas con alta carga operativa y brechas técnicas, convirtiendo sistemas complejos en procesos **predecibles, asistidos y blindados**.

---

## 2. Pilares del Ecosistema

### 2.1 Evolith Core (`evolith_arch32`)

La base de datos viva (Reference Corpus) que contiene la **Constitución** — guías de Monolito Progresivo, ADRs, estándares y taxonomía. Es la fuente de verdad leíble por humanos y consumible por máquinas.

```
Reference Corpus (Constitución)
├── Directivas Arquitectónicas
├── ADRs (Architecture Decision Records)
├── Estándares y Taxonomías
├── Rulesets (legibles por máquina + humanos)
└── Esquemas (artefactos de Phase Gates)
```

### 2.2 Evolith Tracker

La **Suite SaaS** que ejecuta y traza el SDLC propuesto por el Core. Actúa como el motor de auditoría y gestión, garantizando el cumplimiento de las reglas del Core.

**Responsabilidades Principales:**
- Ejecutar las 5 Phase Gates
- Rastrear Architecture Drift (índice de adherencia)
- Consolidar métricas DORA + SPACE
- Proveer scorecards ejecutivos en tiempo real

#### 2.2.6 Capa de Interfaces Técnicas — CLI · MCP · REST · Agentes

El Tracker no es una funcionalidad del CLI — es una plataforma independiente que
**orquesta** el CLI, el servidor MCP, servicios REST y agentes autónomos para
conducir el ciclo de vida SDLC. Cada interfaz sirve una clase distinta de consumidor:

```
┌─────────────────────────────────────────────────────┐
│                  SDLC Tracker                        │
│                                                      │
│  Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4/5          │
│     │          │           │           │             │
└─────┼──────────┼───────────┼───────────┼─────────────┘
      │          │           │           │
   REST API   MCP tools  CLI chatbox  Agentes
  (frontend  (IA/agentes)  (en UI)   (gates auto)
   + CI/CD)
      │          │           │           │
      └──────────┴───────────┴───────────┘
                       │
              Evolith Core (solo lectura)
           rulesets · ADRs · estándares
```

**Responsabilidades por interfaz:**

| Interfaz | Consumidor | Propósito |
|----------|-----------|----------|
| **MCP HTTP/SSE** | Agentes IA, LLMs | Evaluación de gates, métricas, validación de arquitectura |
| **REST API** | Frontend del Tracker, pipelines CI/CD | Gestión de fases, estado de gates, registro de satélites |
| **CLI chatbox embed** | Desarrollador (en UI) | Guía conversacional con sesión y contexto de fase |
| **Agentes autónomos** | Transiciones de fase | Evaluación automática de gates sin intervención humana |
| **Webhook / event bus** | Interno del Tracker | Propagación reactiva de gate pass/fail |

**Base de datos del Tracker — estado propio (escritura exclusiva del Tracker):**

El Tracker mantiene su propia base de datos como única fuente de verdad en runtime.
Evolith Core se consume en modo solo lectura para rulesets y definiciones de gobernanza.

| Entidad | Propósito |
|---------|----------|
| `SatelliteProject` | Repositorios satélite registrados |
| `SDLCProcess` | Una instancia de flujo activa por proyecto |
| `PhaseExecution` | Registro de ejecución por fase |
| `GateEvaluation` | Resultado de gate con evidencia y referencia al ruleset |
| `ChatboxSession` | Sesión conversacional con historial de turnos y log de tool-calls |
| `AgentRun` | Ejecución autónoma de agentes en transiciones de fase |

> Contratos completos de interfaces, modelos de datos y requisitos de extensión del CLI:
> [SDLC Tracker — Diseño de Interfaces Técnicas](./sdlc-tracker-technical-interfaces.es.md)

### 2.3 Exposición Tecnológica (CLI + MCP)

La capa de interoperabilidad que expone el conocimiento del Core vía CLI y servidores MCP, permitiendo que cualquier LLM o IDE consuma la gobernanza como contexto en tiempo real.

```
CLI Commands          MCP Servers
    │                     │
    └────► Evolith Core ◄─┘
              │
              ▼
         Reference Corpus
```

---

## 3. Modelo Operativo: Gobernanza Federada

Evolith opera mediante un **Modelo de Herencia y Gobernanza Federada (Hub-and-Spoke)**:

### 3.1 Herencia

Los productos satélites (ej. UMS) heredan las reglas, artefactos y SDLC del Core, asegurando consistencia en toda la organización.

```
        ┌─────────────────┐
        │   Evolith Core  │  Nivel 0 — Fuente de Verdad
        │  (Constitución) │
        └────────┬────────┘
                 │ hereda
                 ▼
        ┌─────────────────┐
        │  UMS (Satélite) │  Nivel 1 — Instancia de Producto
        └────────┬────────┘
                 │ extiende (con aprobación del Architecture Board)
                 ▼
        ┌─────────────────┐
        │ Producto Custom  │  Nivel 2 — Satélite Extendido
        └─────────────────┘
```

### 3.2 Anti-Corruption Layers (ACLs)

Integración con sistemas externos (Jira, Trello, Linear) que **normaliza y valida** datos externos contra los artefactos del Core, impidiendo que el caos externo contamine la gobernanza de Evolith.

```
  Sistemas Externos       ACL (Anti-Corruption Layer)        Evolith Core
  ┌──────────────┐       ┌──────────────────────────┐        ┌────────────┐
  │ Jira         │──────►│ Normalizar & Validar      │──────►│ Rules      │
  │ Trello       │       │ contra artefactos Core    │       │ Schemas    │
  │ Linear       │       │ Bloquear datos no         │       │ ADRs       │
  │ GitHub       │       │ conformes                 │       │ Estándares │
  └──────────────┘       │ Transformar al modelo     │       └────────────┘
                         │ Core                      │
                         └──────────────────────────┘
```

**Reglas de ACL:**
- Todos los datos externos DEBEN ser validados contra schemas del Core antes de su ingestión
- Las transformaciones DEBEN preservar trazabilidad al origen externo original
- Los datos no conformes DEBEN ser rechazados, no normalizados
- Las implementaciones de ACL DEBEN ser versionadas junto con la evolución del Core

---

## 4. El Ciclo de Vida del Desarrollo (SDLC)

El Tracker sistematiza el desarrollo en **5 Phase Gates auditables**:

```
Fase 1         Fase 2          Fase 3          Fase 4           Fase 5
Discovery ──── Specification ── Construction ── Automated QA ─── Release
   │               │                │               │               │
   ▼               ▼                ▼               ▼               ▼
 Business      Design Baseline   Successful      RC Stamped     Production
 Sign-Off      ADRs + Stories    Build           Test Summary     Live
```

| Gate | Evidencia Requerida | Criterio de Pass |
|------|---------------------|------------------|
| **Business Sign-Off** | PRD, Discovery Canvas, ROI, Ballpark | Aceptación de stakeholders |
| **Design Baseline** | ADRs, Functional Stories, alineación Blueprint | Revisión del Architecture Board |
| **Successful Build** | Technical Stories, pipeline CI, checklist DoD | Todos los gates CI verdes |
| **RC Stamped** | Test Summary Report, umbrales de coverage | Métricas de calidad cumplidas |
| **Production Live** | Release Notes, observabilidad, plan rollback | Sign-off de Operaciones |

---

## 5. Estrategia de Negocio: Open-Core

```
┌─────────────────────────────────────────────────────────────┐
│                   Ecosistema Evolith                         │
├─────────────────────────┬───────────────────────────────────┤
│   OPEN SOURCE (Gratis)  │    ENTERPRISE SAAS (Pagado)        │
├─────────────────────────┼───────────────────────────────────┤
│ Constitución Core       │ Tracker Suite                      │
│ ADRs & Estándares       │ Dashboards Avanzados               │
│ CLI + MCP               │ ACLs (Jira, Trello, Linear)        │
│ Reference Corpus        │ Scorecards Ejecutivos              │
│ Soporte Comunitario     │ Soporte Prioritario                │
│                         │ Reports de Auditoría y Compliance  │
└─────────────────────────┴───────────────────────────────────┘
```

**Vector de Monetización:** Automatización, gobernanza de satélites, vistas ejecutivas e integración inteligente con legados.

---

## 6. Visión Ejecutiva (Scorecards)

Evolith Tracker elimina la microgestión proporcionando:

### 6.1 Predictibilidad
Estado en tiempo real de las phase gates — sabe exactamente dónde está cada producto en el pipeline SDLC.

### 6.2 Adherencia
**Architecture Drift Index** — mide la desviación de los estándares del Core. Drift bajo = alta compliance.

### 6.3 Eficiencia
**Métricas DORA + SPACE Consolidadas:**
- Frecuencia de Despliegue
- Lead Time para Cambios
- Tasa de Fallo en Cambios
- Tiempo para Restaurar
- Confiabilidad (observabilidad)
- Cultura (salud del equipo)
- Ejecución (throughput)
- Comunicación (visibilidad)
- Patrocinio (alineación de liderazgo)

---

## 7. Vista Maestra Conceptual

El siguiente diagrama ilustra la arquitectura completa del ecosistema Evolith:

![Vista Maestra de Evolith](../../sdlc/assets/master-view.png)

*Figura 1: Arquitectura del ecosistema Evolith mostrando Core, Tracker, ACLs y el ciclo de vida SDLC de 5 fases.*

---

## 8. Relación con Este Repositorio

Este repositorio (**Evolith**) sirve como el **Evolith Core** — el Reference Corpus y la Constitución para todos los productos satélite.

| Artefacto | Ubicación |
|-----------|-----------|
| Directivas Arquitectónicas | `reference/governance/standards/vision/architectural-directives.md` |
| Roadmap Evolutivo | `reference/governance/standards/vision/evolutionary-strategy-roadmap.md` |
| Mapeo de Artefactos SDLC | `reference/governance/sdlc/sdlc-evolith-artifact-mapping.md` |
| Rulesets (Legibles por Máquina) | `rulesets/` |
| Esquemas (Artefactos Phase Gate) | `rulesets/schema/` |
| Agente de Análisis de Impacto | `.harness/scripts/impact-analysis-synchronizer.mjs` |

---

## 9. Lectura Suplementaria

- [Directivas Arquitectónicas](./architectural-directives.es.md) — Restricciones técnicas no negociables
- [Roadmap de Estrategia Evolutiva](./evolutionary-strategy-roadmap.es.md) — Hoja de ruta técnica fase por fase
- [Evaluación de Madurez](./maturity-assessment.es.md) — Evaluación TOGAF ACMM, inmunización anti-pattern y preparación de patrones
- [Mapeo de Artefactos SDLC](../../sdlc/sdlc-evolith-artifact-mapping.es.md) — Trazabilidad completa artefacto-a-gate
- [SDLC Tracker — Diseño de Interfaces Técnicas](./sdlc-tracker-technical-interfaces.es.md) — Contratos de interfaces CLI/MCP/REST/Agentes y modelo de BD del Tracker

---

*Este documento constituye la visión oficial del producto Evolith. Todas las decisiones arquitectónicas, reglas y estándares deben alinearse con esta visión.*

---
[Back to Índice de Visión](./README.es.md)