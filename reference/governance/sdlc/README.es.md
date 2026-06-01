# Centro de Gobernanza SDLC Corporativa

> **Navegación bilingüe:** [English Version](./README.md)

Este centro es el hub de gobernanza autorizado del Ciclo de Vida de Desarrollo de Software dentro de Evolith. Define los requisitos procedimentales, las puertas de salida de fase, los formatos de artefactos, los gates de calidad, el modelo de responsabilidades, las reglas de trazabilidad y el mapeo de cumplimiento que rigen cada producto construido desde esta plataforma de referencia.

---

## Vista Ejecutiva para Directores de Tecnología

Para Directores de Tecnología, el SDLC de Evolith no debe entenderse como un proceso documental, sino como un sistema de control de delivery.

Su propósito es asegurar que el trabajo financiado sea trazable, que el riesgo arquitectónico se resuelva antes de construir, que los gates de calidad sean objetivos y que la preparación productiva se demuestre antes del despliegue.

| Necesidad ejecutiva | Ir a |
|---|---|
| Entender puntos de control a nivel directivo | [Vista Ejecutiva SDLC](./executive-view.es.md) |
| Validar criterios objetivos que bloquean releases inseguros | [Gates de Calidad SDLC](./quality-gates.es.md) |
| Confirmar quién decide cada gate | [Matriz de Responsabilidades SDLC](./responsibility-matrix.es.md) |
| Trazar intención de negocio hasta evidencia productiva | [Modelo de Trazabilidad SDLC](./traceability-model.es.md) |
| Revisar artefactos requeridos y opcionales por fase | [Mapeo SDLC–Artefactos Evolith](./sdlc-evolith-artifact-mapping.es.md) |
| Empezar a crear artefactos oficiales SDLC | [Hub de Plantillas de Artefactos](./04-artifact-templates/README.es.md) |

### Regla Operativa Directiva

Ninguna fase del ciclo de vida debe avanzar solo por acuerdo verbal. Cada gate requiere evidencia versionada, responsable accountable y criterio objetivo de aprobación.

---

## Materiales Ejecutivos Descargables

| Material | Formato | Propósito |
|---|---|---|
| [Presentación Ejecutiva SDLC Evolith](./assets/evolith_product_vision_sdlc_executive_v2.pptx) | PPTX | Visión ejecutiva del producto, flujo SDLC, artefactos clave, proceso y modelo de seguimiento. |
| [Workbook SDLC Workshop y Scorecard](./assets/evolith_sdlc_workshop_scorecard_workbook_bilingual.xlsx) | XLSX | Workbook bilingüe hands-on para definir fases aplicables, asignación nominal RACI, readiness de artefactos, gates de calidad, riesgos, decisiones y seguimiento ejecutivo del scorecard. |

---

## Modelo Operativo SDLC

```mermaid
flowchart LR
    classDef phase fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-weight:bold
    classDef gate fill:#4a3800,stroke:#f59e0b,color:#fff,font-size:12px

    P1["Fase 1\nConcepción"]:::phase
    P2["Fase 2\nDiseño"]:::phase
    P3["Fase 3\nConstrucción"]:::phase
    P4["Fase 4\nValidación"]:::phase
    P5["Fase 5\nEntrega"]:::phase
    G1(["Aprobación\nde Negocio"]):::gate
    G2(["Baseline\nde Diseño"]):::gate
    G3(["Build\nExitoso"]):::gate
    G4(["RC\nSellado"]):::gate
    G5(["Producción\nActiva"]):::gate

    P1 --> G1 --> P2 --> G2 --> P3 --> G3 --> P4 --> G4 --> P5 --> G5
```

---

## Gobernanza Mínima Viable

Para MVPs pequeños, la cadena mínima obligatoria de artefactos es:

```text
PRD -> Historia Funcional -> Historia Técnica -> Test Summary Report -> Release Notes
```

Un ADR es obligatorio cuando el trabajo introduce o cambia límites arquitectónicos, selección tecnológica, modelo de seguridad, modelo de multi-tenancy, estrategia de persistencia, estrategia de contratos API, topología de despliegue, topología de observabilidad o cualquier excepción a un estándar Evolith existente.

La matriz completa de cumplimiento aplica cuando el producto alcanza escala, ambientes regulados, multi-tenancy, APIs públicas, flujos críticos de producción o dependencias entre equipos.

---

## Fase 01 — Concepción y Descubrimiento

> **Objetivo:** Establecer una comprensión compartida de qué debe lograr el producto y por qué, antes de comenzar cualquier diseño. Los entregables de esta fase autorizan el ingreso al trabajo de arquitectura.
> **Puerta de salida:** Aprobación de Negocio
> **Audiencia principal:** Product Owner, Sponsor Ejecutivo, Arquitecto de Software

Definición de alcance, perfilado de personas, mapeo de OKRs y alineación con restricciones arquitectónicas.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [PRD — Documento de Requisitos de Producto](./04-artifact-templates/prd-template.es.md) | Captura el alcance completo del producto: personas de usuario, OKRs de negocio, límites funcionales, restricciones y no-objetivos. Se crea una vez por producto o iniciativa de release mayor. Requerido antes de cualquier trabajo de arquitectura o diseño. | Product Owner, Sponsor Ejecutivo — escrito por PO, revisado y firmado por Sponsor y Arquitecto |
| [Mapeo SDLC–Artefactos — Fase 1](./sdlc-evolith-artifact-mapping.es.md#2-fase-1-concepción-y-descubrimiento) | Tabla de referencia que lista qué artefactos Evolith son Requeridos u Opcionales durante esta fase. Usar como checklist de cumplimiento antes de declarar la Aprobación de Negocio. | Product Owner, Revisor de Gobernanza, Arquitecto de Software |

---

## Fase 02 — Diseño y Arquitectura

> **Objetivo:** Producir decisiones de diseño verificables y trazables que acoten el espacio de solución antes de comenzar la construcción. Las decisiones de arquitectura tomadas aquí restringen todas las fases posteriores.
> **Puerta de salida:** Baseline de Diseño Aprobado
> **Audiencia principal:** Arquitecto de Software, Principal / Staff Engineer, Product Owner, QA / SDET

Selección de patrones, producción de ADRs, definición de bounded contexts, contratos de API y escritura de historias funcionales.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [Framework SDLC Orientado a Construcción](./02-engineering/construction-focused-sdlc-framework.es.md) | Estándar normativo que gobierna la progresión de fases, umbrales de calidad, el bucle interno de construcción y la Definición de Terminado. Todo ingeniero debe leerlo antes de comenzar la construcción. | Arquitecto de Software, Tech Lead, Todos los Ingenieros — lectura obligatoria, aplicado por Tech Lead |
| [ADR — Registro de Decisión Arquitectónica](./04-artifact-templates/adr-template.es.md) | Captura una sola decisión arquitectónica: contexto, opciones evaluadas, opción elegida, trade-offs y consecuencias. Un ADR por decisión significativa. Requerido antes de implementar cualquier elección arquitectónica no trivial. | Arquitecto de Software, Principal / Staff Engineer — escrito por Arquitecto, revisado por Engineering Lead |
| [Historia Funcional — Especificación de Comportamiento de Negocio](./04-artifact-templates/functional-story-template.es.md) | Describe una capacidad orientada al usuario en lenguaje de negocio. Define actores, flujos, reglas de negocio, criterios de aceptación y restricciones técnicas sin prescribir implementación. Sirve como contrato entre Producto e Ingeniería. | Product Owner, Analista de Negocio — escrito por PO/BA, revisado por Arquitecto y QA |
| [Estándar de Escritura de Historias Funcionales](./03-documentation/functional-story-writing-standard.es.md) | Reglas normativas que rigen la estructura, el lenguaje y la completitud de las Historias Funcionales. Todos los autores de Historias Funcionales deben leerlo antes de escribir. | Product Owner, Analista de Negocio, QA / SDET — referencia normativa para todos los autores de historias |
| [Mapeo SDLC–Artefactos — Fase 2](./sdlc-evolith-artifact-mapping.es.md#3-fase-2-diseño-y-arquitectura) | Tabla de referencia con artefactos Requeridos y Opcionales para esta fase. Usar como checklist antes de declarar el Baseline de Diseño. | Arquitecto de Software, Revisor de Gobernanza, Product Owner |

---

## Fase 03 — Construcción

> **Objetivo:** Traducir las decisiones de diseño en software funcional, probado y documentado que cumpla la Definición de Terminado. Todo código integrado a main debe pasar las puertas de calidad antes de que esta fase se cierre.
> **Puerta de salida:** Build Exitoso (todas las puertas de calidad en verde)
> **Audiencia principal:** Desarrollador Backend, Desarrollador Frontend, Tech Lead, DevOps / SRE, QA / SDET

Composición de código fuente, testing automatizado, aplicación de CI/CD y Definición de Terminado.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [Historia Técnica — Elemento de Trabajo de Implementación de Ingeniería](./04-artifact-templates/technical-story-template.es.md) | Descompone una Historia Funcional en una tarea de ingeniería concreta con pasos de implementación específicos, criterios de aceptación técnica y checklist de DoD. Una Historia Técnica por unidad de implementación discreta. | Desarrollador Backend, Desarrollador Frontend, Tech Lead — escrito por Ingeniero, revisado por Tech Lead y QA |
| [Buenas Prácticas de Documentación SDLC](./03-documentation/sdlc-documentation-best-practices.es.md) | Reglas obligatorias de documentación-como-código: versionado, actualización de ADRs, documentación inline y cadencia de revisión. Aplica a toda contribución de código durante la construcción. | Todos los Ingenieros, Tech Lead — normativo, aplica a cada commit |
| [Gates de Calidad SDLC](./quality-gates.es.md) | Baseline canónica de umbrales para cobertura, complejidad, CVEs, deuda técnica, delta documental y evidencia de observabilidad. | Tech Lead, QA / SDET, Revisor de Gobernanza |
| [Mapeo SDLC–Artefactos — Fase 3](./sdlc-evolith-artifact-mapping.es.md#4-fase-3-construcción) | Tabla de referencia con artefactos Requeridos y Opcionales para esta fase. Usar como checklist de cumplimiento del DoD en cada sprint. | Tech Lead, QA / SDET, Revisor de Gobernanza |

---

## Fase 04 — Validación y QA

> **Objetivo:** Verificar formalmente que el software cumple todos los criterios de aceptación y umbrales de calidad antes de sellar el Release Candidate. Ningún despliegue a producción procede sin un RC sellado.
> **Puerta de salida:** RC Sellado
> **Audiencia principal:** QA / SDET, Tech Lead, Product Owner, Ingeniero de Seguridad

Verificación de regresión, escaneo de seguridad, UAT y sellado del Release Candidate.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [Reporte de Resumen de Testing — Registro de Validación de Puerta de Calidad](./04-artifact-templates/test-summary-report-template.es.md) | Agrega los resultados de ejecución de pruebas en las capas unitaria, de integración y E2E. Confirma que todos los umbrales de calidad obligatorios se cumplen (cobertura, complejidad, CVEs, deuda técnica). Requerido antes de sellar el RC. | QA / SDET — escrito por QA, aprobado por Tech Lead y Product Owner |
| [Gates de Calidad SDLC](./quality-gates.es.md) | Baseline canónica de umbrales. Usar para confirmar si un RC puede sellarse o debe bloquearse. | QA / SDET, Tech Lead, Ingeniero de Seguridad |
| [Mapeo SDLC–Artefactos — Fase 4](./sdlc-evolith-artifact-mapping.es.md#5-fase-4-validación-y-qa) | Tabla de referencia para esta fase. Usar para verificar que todos los artefactos de QA requeridos estén presentes antes de la aprobación del RC. | QA / SDET, Tech Lead, Revisor de Gobernanza |

---

## Fase 05 — Entrega y Operaciones

> **Objetivo:** Desplegar el Release Candidate sellado a producción y confirmar que el sistema está activo, observable y nominal. La Producción Activa no puede declararse hasta que todos los controles de observabilidad pasen.
> **Puerta de salida:** Producción Activa
> **Audiencia principal:** DevOps / SRE, Tech Lead, Product Owner

Despliegue a producción, validación de observabilidad y nominalidad de monitoreo.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [Release Notes — Registro de Despliegue a Producción](./04-artifact-templates/release-notes-template.es.md) | Registro formal del despliegue: nuevas funcionalidades, cambios incompatibles, correcciones, pasos de despliegue, procedimiento de rollback y checklist de observabilidad. Requerido antes de declarar Producción Activa. | DevOps / SRE, Tech Lead — escrito por DevOps/Tech Lead, revisado por Product Owner |
| *Próximamente: Playbook de Lanzamientos Zero-Downtime* | Runbook operativo para despliegues blue-green y canary con restricciones de zero-downtime. | DevOps / SRE |
| [Mapeo SDLC–Artefactos — Fase 5](./sdlc-evolith-artifact-mapping.es.md#6-fase-5-entrega-y-operaciones) | Tabla de referencia para esta fase. Usar para verificar que todos los artefactos de entrega estén en lugar antes de declarar Producción Activa. | DevOps / SRE, Revisor de Gobernanza |

---

## Referencias Transversales a Fases

Los siguientes documentos aplican a todo el ciclo de vida y deben consultarse independientemente de en qué punto se encuentre el equipo.

| Documento | Rol transversal |
|---|---|
| [Vista Ejecutiva SDLC](./executive-view.es.md) | Modelo operativo práctico a nivel directivo para inversión, riesgo, gates y preparación productiva. |
| [Gates de Calidad SDLC](./quality-gates.es.md) | Umbrales canónicos de calidad y política de waivers. |
| [Matriz de Responsabilidades SDLC](./responsibility-matrix.es.md) | Expectativas accountable, responsible, consulted y evidencia por gate. |
| [Modelo de Trazabilidad SDLC](./traceability-model.es.md) | Cadena de evidencia end-to-end desde PRD hasta observabilidad productiva. |
| [Mapeo SDLC–Artefactos Evolith](./sdlc-evolith-artifact-mapping.es.md) | Matriz de cumplimiento maestra: 40+ artefactos Evolith mapeados a las cinco fases SDLC con señal Requerido / Opcional. La referencia definitiva para revisores de gobernanza y líderes técnicos. |
| [Hub de Plantillas de Artefactos](./04-artifact-templates/README.es.md) | Índice de las seis plantillas de formato con estructuras en blanco y ejemplos completos de UMS. El punto de partida para crear cualquier nuevo artefacto SDLC. |

---

[Volver al Nivel Superior](../../README.es.md)
