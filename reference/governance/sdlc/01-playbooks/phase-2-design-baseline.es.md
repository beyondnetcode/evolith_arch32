# Playbook de Fase 2 — Línea Base de Diseño Aprobada

> **Navegación Bilingüe:** [English Version](./phase-2-design-baseline.md)

**Fase:** [02 — Diseño y Arquitectura](../README.es.md#fase-02-diseño-y-arquitectura)
**Compuerta de Salida:** Design Baseline Approved (ver gate `phase: 2` en [`phase-gates.rules.json`](../../../../rulesets/sdlc/phase-gates.rules.json))
**Audiencia Principal:** Software Architect, Principal/Staff Engineer, Product Owner, QA/SDET
**Rol Responsable:** Software Architect
**Autoridad de Waiver:** Architecture Board
**Estado:** Aprobado

Este playbook operacionaliza la compuerta Design Baseline Approved. Toda salida de Fase 2 debe demostrar que las decisiones arquitectónicas, los bounded contexts y el comportamiento funcional están documentados, son trazables y se alinean al Reference Blueprint.

---

## 0. Orden de Ejecución Recomendado

| Paso | Actividad | Salida |
|------|-----------|--------|
| 0 | Verificar gate Fase 1 APPROVED; confirmar evolith.yaml `metadata.phase: F2` | Condiciones previas |
| 1 | Consultar ADR-0056; establecer lenguaje ubicuo; inicializar Registro ADR | Registro ADR iniciado |
| 2 | Evaluar Extraction Readiness (ADR-0045 ≥70%); confirmar progresión ADR-0047 justificada | Score documentado |
| 3 | Confirmar ADR-0002; ejecutar Checklist de Simplicidad Fase 1 | Baseline de arquitectura |
| 4 | Producir Mapa de Bounded Contexts (Plantilla DDD); aplicar ADR-0031 + ADR-0032 | Mapa de Bounded Contexts |
| 5 | Refinar Story Seeds → Historias Funcionales (KDD L2+) o escribir desde cero; descomponer → Historias de Usuario; organizar Agile Backlog | Historias Funcionales, Backlog |
| 6 | Documentar decisiones de límites como ADRs; completar Análisis de Impacto CLI; consultar ADR-0018; verificar Alineación con Blueprint | Registro ADR (completo) |
| 7 | Ejecutar `evolith validate --topology distributed-modules` — las 8 reglas DM deben pasar | Validación de topología |
| 8 | (Condicional) Validar DOMA si topología F3 en roadmap (ADR-0076) | Cumplimiento DOMA |
| 9 | Revisión Gate F2: completitud ADR, readiness de historias, alineación con blueprint, simplicidad, reglas de topología | APPROVED / BLOCKED / WAIVED |

---

## 1. Condiciones Previas

Antes de abrir la compuerta, confirmar:

- La Aprobación de Negocio de Fase 1 está registrada y no expirada.
- `evolith.yaml` en el repositorio satélite declara `metadata.phase: F2`.
- El Extraction Readiness Score (ADR-0045) está evaluado en ≥70%. Scores por debajo de este umbral bloquean la evaluación del gate F2 según la regla de contrato satélite SVC-04.
- El Blueprint de Referencia y la línea base de topología objetivo están confirmados.
- La ruta del registro ADR está establecida para la iniciativa.

---

## 2. Checklist de Recolección de Evidencia

| # | Evidencia Obligatoria | Plantilla / Esquema | Criterio de Aceptación |
|---|---|---|---|
| 1 | Registro de ADRs | [`adr-template.es.md`](../04-artifact-templates/adr-template.es.md) | Toda decisión que cruza fronteras tiene un ADR numerado y aceptado. No quedan decisiones "no documentadas". |
| 2 | Functional Stories | [`functional-story-template.es.md`](../04-artifact-templates/functional-story-template.es.md) · [`functional-story.schema.json`](../../../../rulesets/schema/functional-story.schema.json) | Todas las historias en `Ready` con criterios de aceptación BDD; estándar de redacción cumplido. Nota KDD: Si existen Story Seeds de Fase 1.1 KDD Nivel 2+, refinándolas aquí en Historias Funcionales. |
| 3 | Alineación con Reference Blueprint | Conjunto de diagramas de arquitectura | Diagramas trazables al Reference Blueprint; las desviaciones llevan ADR. El Blueprint de Referencia es un artefacto de consulta — no lo produces; el Gate F2 verifica trazabilidad. |
| 4 | Checklist de Simplicidad Fase 1 | Checklist de simplicidad | Aprobado — sin señales de over-engineering (abstracción prematura, capas especulativas, frameworks sin uso). A pesar del nombre 'Fase 1', este checklist se ejecuta en Fase 2. El identificador del artefacto está registrado en el validador de máquina — no renombrar. |
| 5 | Bounded Context Map | Artefacto de context map | Todos los contextos con propietario, estrategia de persistencia y estilo de integración |
| 6 | Reglas de Topología F2 | `evolith.yaml` · CLI `evolith validate` | Las 8 reglas DM (DM-R01 a DM-R08) deben pasar. Declaración topológica en evolith.yaml con `metadata.phase: F2` y validación via CLI. |

Si la topología F3 (microservicios) está en alcance, también aplica la regla de **Domain-Aligned Service Topology (DOMA)** — cada servicio debe mapear a exactamente un bounded context (ver [`quality-gates.es.md`](../quality-gates.es.md) y ADR-0076).

---

## 3. Procedimiento de Revisión

1. **Auditoría de completitud de ADRs (Software Architect).** Recorrer cada decisión arquitectónica contra el registro. Si existe en el diseño sin ADR correspondiente, marcarla pendiente y bloquear.
2. **Verificación de readiness de historias (Product Owner + QA/SDET).** Confirmar que cada Functional Story tiene criterios Given/When/Then, trazabilidad a un requisito del PRD y definición de listo.
3. **Verificación de blueprint y topología (Principal/Staff Engineer).** Validar el bounded context map contra la topología elegida y las reglas de composición multi-topología.
4. **Revisión de simplicidad.** Recorrer la Checklist de Simplicidad. Cualquier "sí" a señales de over-engineering bloquea la compuerta.
5. **Registro de decisión.** Producir resolución escrita `APROBADA` / `BLOQUEADA` / `CON WAIVER`, firmada por el Software Architect.

---

## 4. Criterios de Bloqueo

| Criterio | Acción |
|---|---|
| Decisiones arquitectónicas significativas sin documentar | BLOQUEAR — exigir ADR antes de la baseline |
| Fronteras de bounded context contradictorias | BLOQUEAR — resolver context map |
| Functional Stories sin criterios de aceptación | BLOQUEAR — regresar a redacción de historias |
| Microservicio F3 mapeado a más de un bounded context | BLOQUEAR — violación DOMA; ver ADR-0076 |
| Extraction Readiness Score por debajo de 70% | BLOQUEAR — evaluar ADR-0045; el score debe alcanzar ≥70% antes del gate F2 |
| Validación de topología F2 falla alguna regla DM | BLOQUEAR — resolver violación de regla DM; re-ejecutar `evolith validate --topology distributed-modules` |

---

## 5. Flujo de Waiver

Autoridad de waiver: Architecture Board. Campos requeridos (según [`quality-gates.es.md`](../quality-gates.es.md)):

- `criterion` · `justification` · `risk` · `owner` · `expirationDate` · `mitigationPlan`

Los waivers no pueden saltar decisiones sin documentar en subsistemas regulados (autenticación, residencia de datos, procesamiento de pagos).

---

## 6. Salidas

- Snapshot bloqueado del Registro de ADRs.
- Functional Stories listas para descomposición técnica.
- Bounded Context Map y declaración topológica alineada.
- Autorización para entrar a la [Fase 3 — Construcción](../README.es.md#fase-03-construcción).

---

## 7. Referencia de Topología

| Recurso | Propósito |
|---|---|
| `evolith validate --topology distributed-modules` | Validar reglas de topología F2 (DM-R01…DM-R08) |
| `evolith validate --topology distributed-modules --topology event-driven` | Validar topología compuesta |
| `evolith drift --level F2` | Detectar deriva de la arquitectura F2 declarada |
| [distributed-modules.rules.json](../../../../reference/architecture/topologies/progressive-axis/distributed-modules/distributed-modules.rules.json) | 8 reglas obligatorias F2 |
| [ADR-0045](../../../../reference/architecture/adrs/core/0045-microservice-extraction-readiness-criteria.es.md) | Criterios de Extraction Readiness Score |
| [ADR-0047](../../../../reference/architecture/adrs/core/0047-architectural-patterns-monolith-soa-microservices.es.md) | Framework de progresión F1→F2→F3 |
| [topology-dimensions.md](../../../../reference/architecture/topologies/topology-dimensions.md) | Dimensiones de topología componibles |

---

[Volver al Centro de Gobernanza SDLC](../README.es.md)
