# Fase 00 — Intake & Architecture Planning Gate

> **Navegación Bilingüe:** [See English version](./00-architecture-planning-gate-intake.md)

**Fase:** 00 — Intake
**Subfase:** 00.0 — Architecture Planning Gate
**Tipo de Gate:** Límite de ingesta obligatorio
**Rol Responsable:** Architecture Lead / Product Owner
**Autoridad de Excepción:** Architecture Board

---

## Propósito

Este playbook operacionaliza el Architecture Planning Gate (Gate 0). Actúa como el límite de ingesta para todos los nuevos requerimientos en Evolith. Antes de que comience cualquier proceso formal de SDLC, un requerimiento crudo debe ser evaluado para determinar su impacto arquitectónico, riesgos y el modo SDLC correcto a aplicar (`full`, `tailored`, `minimal`, o `rejected`).

---

## Cuándo Aplicar

| Escenario | Requerimiento |
|----------|-------------|
| Cualquier solicitud de nueva funcionalidad | Obligatorio |
| Refactorización arquitectónica mayor | Obligatorio |
| Resolución de deuda técnica | Obligatorio |
| Actualizaciones menores de documentación | Obligatorio (se enruta a auto-aprobación `minimal`) |
| Hotfix de emergencia | Obligatorio (se enruta a `tailored` o se omite con post-mortem) |

---

## Agentes de Planificación Arquitectónica

El proceso de intake es asistido por el Agent Runtime (Hermes), que actúa como el **Architecture Plan Interpreter**.

| Capacidad del Agente | Artefacto Producido | Contexto de Ejecución |
|---|---|:---:|
| Architecture Plan Interpreter | Architecture Plan Draft (JSON/YAML) | Pre-Discovery |

*Nota: Los agentes no pueden aprobar planes. La evaluación de gobernanza es realizada por OPA, y la aprobación final requiere un humano en el ciclo (Human-in-the-loop) para modos no mínimos.*

---

## Procedimiento del Gate

### Paso 1: Ingesta
Un usuario o sistema envía un requerimiento en lenguaje natural ("prompt") a través de Smart CLI o Evolith Tracker.
`evolith plan create --from-prompt "..."`

### Paso 2: Interpretación y Generación
Hermes lee el prompt, consulta la base de conocimiento (ADRs, Blueprints, topología actual) y genera un **Architecture Plan Draft** que contiene:
- Alcance funcional y técnico
- Componentes impactados
- Riesgos de seguridad y arquitectura
- Artefactos y gates requeridos

### Paso 3: Evaluación de Políticas OPA
La Core API evalúa el plan borrador contra las políticas OPA activas para recomendar el `sdlc_mode`:
- `full`: Alta criticidad, impacto de seguridad o alcance transversal a tenants.
- `tailored`: Alcance de producto limitado, riesgo medio.
- `minimal`: Baja complejidad, documentación o ajustes menores de interfaz.
- `rejected`: Violación de política o información insuficiente.

### Paso 4: Refinamiento y Revisión
El plan entra en estado `under_review`.
El Architecture Lead revisa el plan. Si es necesario, pueden añadir comentarios o solicitar refinamientos, que Hermes usará para generar una nueva versión del plan (`v2`, `v3`).

### Paso 5: Decisión del Gate

| Resultado | Acción |
|---------|--------|
| **APROBAR** | Proceder a ejecución. El plan se bloquea. |
| **RECHAZAR**| El plan se cierra. Se devuelve al solicitante para reformulación. |

---

## Traspaso (Handoff)

Después de que un plan es **APROBADO** y **EJECUTADO**, el sistema instancia el SDLC:

```
Architecture Plan (Aprobado) ──→ Iniciativa Creada 
                                     │
                                     ├──→ Fase SDLC 01.1 (Knowledge-First Discovery)
                                     │
                                     └──→ ADRs Obligatorios / Artefactos vinculados
```

---

## Checklist de Calidad

- [ ] El plan refleja con precisión la intención del prompt.
- [ ] La evaluación OPA fue exitosa.
- [ ] La recomendación `sdlc_mode` está justificada.
- [ ] Todas las alertas de alto riesgo han sido revisadas por un humano.
- [ ] Los IDs de trazabilidad se generan al momento de la ejecución.

---

## Referencias
- [ADR-0103: Architecture Planning Gate como Intake de Gobernanza](../../../architecture/adrs/core/0103-architecture-planning-gate-intake.es.md)
