# Evolith Tracker — Flujo de Comunicación de Ingesta y Oportunidad (Registro de Aprendizaje de Agentes)

> **Navegación Bilingüe:** [English Version](./tracker-intake-flow.md)

**Estado:** Activo — Evolutivo (sesión de diseño guiada por el dueño)
**Dueños:** `@winston` (lente de arquitectura) · `@po` (lente de negocio)
**Última Actualización:** 2026-07-04
**Alcance:** Modelo de entrada de Evolith Tracker (Fase 0 — Strategic Intake). Cross-repo: estas decisiones tienen implicaciones en el corpus de Core.
**Autoridad:** Este es un **registro de aprendizaje/conocimiento**, no una regla vinculante. Los cambios vinculantes requieren su propio ADR (Core) o artefacto de diseño del Tracker. Alineación con la visión de producto: [Product Vision Master](../../../../product/suite/vision/evolith-product-vision-master.md).

---

## 1. Propósito

Capturar las decisiones guiadas por el dueño sobre **cómo entra el trabajo a Evolith Tracker**, para que `@winston` y `@po` lleven este contexto a futuras auditorías, historias y trabajo de gaps. Doce decisiones (L-001…L-012) cerraron el bloque de "puntos de ingreso" el 2026-07-04.

## 2. Modelo de Entrada Consolidado

```
   OPORTUNIDAD (origen interno)             INTAKE (origen externo)
   humano | agente                          PPM / sistema externo
        │                                         │
   IOportunidad ──► OpportunityACL          IIntake ──► IntakeACL
        │                                         │
        └──────── ambos normalizan a ────────────┘
                          │
                    IIniciativa  (interface única)
                    [formato unificado de entrada — CANÓNICO en Core]
                          │
              Loop Engineer → FeasibilityVerdict
                          │
              ┌───── Gate 0 — INTELIGENTE ─────┐
              │  criterios: default en Core     │
              │  + override tenant/producto     │
              │  piso inmutable: lo fija Core   │
              │  aprobación: humano | agente-normativo │
              └───────────────┬─────────────────┘
                   │                     │
              APROBADA               RECHAZADA
                   │                     │
          Iniciativa              feedback DUAL (humano + agente)
          estado: PENDIENTE           │
                   │             v2, v3… (versionado) ──► re-evalúa
      activación agéntica/mixta       │
      (agente de priorización +  o proponente ACEPTA / expira
       confirmación humana opc.) (terminación configurable)
                   │                     │
                   ▼                cerrada con historial
            DISCOVERY (formal)
```

## 3. Registros de Aprendizaje (L-001 … L-012)

| ID | Decisión | Lente `@po` (outcome de negocio) | Lente `@winston` (arquitectura) |
|---|---|---|---|
| L-001 | Dos puntos de ingreso distinguidos por **origen**: Oportunidad (interno, humano/agente) vs Intake (externo, sistema vía ACL). | Nuevo concepto de negocio "Oportunidad"; el discriminador es el origen, no la madurez/autoridad. | `StrategicInitiative` necesita discriminador de origen (`INTERNAL_HUMAN`/`INTERNAL_AGENT`/`EXTERNAL_SYSTEM`); el ACL no es solo externo (ver L-005). |
| L-002 | Un **formato unificado de entrada** a nivel Tracker; humano o agente con contexto puede completar el BusinessCase. | Cualquier proponente alcanza el mismo estándar antes del Gate 0. | Schema canónico versionado; la asistencia de agente es una capability gobernada. |
| L-003 | Aprobación: **humano por defecto**, opcionalmente un **agente de verificación normativa**. | Human-Driven por defecto, Agent-Driven opcional (Visión §2.4), configurable por tenant. | El agente aprobador necesita skills normativas declaradas + `evaluatedByAgentId` auditable; encaja en `IApprovalPort`. |
| L-004 | Feedback de rechazo **dual** (humano+agente), **evolutivo**, **versionado**; itera hasta lograrlo o hasta que el proponente acepta. | El rechazo no es terminal por defecto; ciclo de mejora gobernado con historial. | La propuesta de entrada es un artefacto versionado en el grafo de evidencias; Gate 0 es **re-entrante**. |
| L-005 | `IIniciativa` es una **interface única**; Intake y Oportunidad tienen cada una su interface + ACL que adapta a ella. Aprobada → estado **PENDIENTE**. | Un solo concepto río abajo; la diversidad de origen se encapsula en la frontera. | **ACLs simétricos** (`OpportunityACL` interno, `IntakeACL` externo); ningún concepto de origen se filtra al dominio; nuevo estado `PENDIENTE`. |
| L-006 | **Gate 0 inteligente**: Core define criterios mínimos de aceptación por defecto; el **tenant puede override** a su realidad. | El default protege el estándar; el override respeta la realidad tenant/producto (valor enterprise). | Extiende `TenantConfig`. **Responde directamente a los gaps GT-08…GT-11 de Core** (existencia → contenido/umbral + parametrización). |
| L-007 | Activar una iniciativa PENDIENTE **inicia Discovery formal**. | PENDIENTE → Discovery = "aceptada" → "en elaboración". | `PENDIENTE` precede a Discovery; realinear con el `Initiative (DRAFT)` actual. |
| L-008 | **Todo lo canónico vive en Core** y se hereda (Tracker **y** satélites) como formato. | Un estándar sirve a todo el ecosistema; menor costo de gobernanza. | Confirma Hub-and-Spoke (Visión §4.1); los overrides locales nunca mutan el canon sin aprobación del Board. |
| L-010 | El **piso inmutable lo define CORE** (no el ADMIN ROOT del SaaS). El ADMIN ROOT solo opera la capa overrideable. | Los tenants no pueden vaciar el gate; nuevo actor de plataforma (ADMIN ROOT) acotado. | Preserva Visión §4.3 ("Core rule definition → Evolith Core"); resuelve la divergencia de satélites — el piso es de Core para todos. |
| L-011 | La **terminación del ciclo de rechazo es configurable** (default en Core + override tenant). | Parametrizable (máx iteraciones / ventana de estancamiento). | Política `rejectionCycle` en el corpus de Core; el Gate 0 la lee para auto-archivo/escalamiento. |
| L-012 | La activación PENDIENTE → Discovery es **agéntica/mixta** (agente de priorización + confirmación humana opcional). | Confirma "aprobada ≠ activada"; PENDIENTE es una cola de portafolio gobernada. | El agente de priorización = capability gobernada (capacidad/ROI/deps) + `IApprovalPort`; punto de transición auditable. |

## 4. Implicaciones Cross-Repo y de Core

- **Adiciones implícitas al corpus de Core:** schema del formato unificado de entrada (L-002/L-008), criterios default de aceptación del Gate 0 + designación del piso inmutable (L-006/L-010), política `rejectionCycle` (L-011). Candidatos a `src/rulesets/schema/` + rulesets, heredados por Tracker y satélites.
- **Conexión estratégica:** L-006 aporta el requisito de producto para cerrar **GT-08…GT-11** (validación de contenido/umbral de gates) — la mayor brecha de credibilidad del maturity assessment actual.
- **Nuevo actor:** ADMIN ROOT (super-admin del SaaS) — opera solo la capa overrideable; no tiene autoridad del piso (L-010).
- **Cambio de máquina de estados:** el modelo one-shot `PROMOTED | REJECTED` del Intake se reemplaza por una máquina iterativa, versionada y re-entrante (L-004/L-011).

## 5. Ítems Abiertos

- Realinear `PENDIENTE` con el `Initiative (DRAFT)` actual del Tracker (US-DIS-001): renombrar vs. preceder.
- Decidir el detalle de precedencia dentro de la capa overrideable (tenant vs producto).

## 6. Procedencia

Capturado durante una sesión de flujo de producto guiada por el dueño (2026-07-04). Notas de trabajo fuente rastreadas en la sesión. Próximo bloque: **Discovery (Fase 1)**. La promoción de cualquier ítem a reglas vinculantes de Core requiere un ADR.

---

_Ver [Persona Winston](./winston.es.md) · [Persona PO](./po.es.md) · [Product Vision Master](../../../../product/suite/vision/evolith-product-vision-master.es.md)._
