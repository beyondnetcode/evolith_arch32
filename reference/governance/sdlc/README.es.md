# Centro de Gobernanza SDLC Corporativa

> **Navegación bilingüe:** [English Version](./README.md)

Este centro es el hub de gobernanza autorizado del Ciclo de Vida de Desarrollo de Software dentro de Evolith. Define requisitos procedimentales, gates de fase, formatos de artefactos, gates de calidad, asignaciones de responsabilidad, expectativas de trazabilidad y la cadena mínima de artefactos para MVPs pequeños y programas empresariales escalados.

---

## Vista Ejecutiva para Directores de Tecnología

Para Directores de Tecnología, el SDLC de Evolith no es un proceso documental, sino un sistema de control de delivery.

Su propósito es asegurar que el trabajo financiado sea trazable, que el riesgo arquitectónico se resuelva antes de construir, que los gates de calidad sean objetivos y que la preparación operativa esté probada antes de ir a producción.

| Necesidad ejecutiva | Ir a |
|---|---|
| Entender puntos de control a nivel directivo | [Vista Ejecutiva SDLC](./executive-view.es.md) |
| Validar criterios objetivos de calidad | [Gates de Calidad SDLC](./quality-gates.es.md) |
| Confirmar quién decide cada gate | [Matriz de Responsabilidades SDLC](./responsibility-matrix.es.md) |
| Trazar intención de negocio hasta evidencia operativa | [Modelo de Trazabilidad SDLC](./traceability-model.es.md) |
| Revisar artefactos requeridos y opcionales por fase | [Mapeo SDLC–Artefactos Evolith](./sdlc-evolith-artifact-mapping.es.md) |
| Empezar a crear artefactos oficiales SDLC | [Hub de Plantillas de Artefactos](./04-artifact-templates/README.es.md) |

### Regla Operativa Directiva

Ninguna fase del ciclo de vida debe avanzar solo por acuerdo verbal. Cada gate requiere evidencia versionada, responsable accountable y criterio objetivo de aprobación.

---

## Centro de Descargas — Materiales Ejecutivos SDLC

> [!IMPORTANT]
> **Empieza aquí para briefings ejecutivos y workshops con clientes.** Estas presentaciones son el paquete oficial vigente para alinear valor ejecutivo, demostrar la aplicación real del caso UMS y guía operativa para líderes técnicos.
>
> Usa los enlaces siguientes para descargar los archivos directamente.

###  Kit de Comunicación Ejecutiva (Presentaciones)

| Artefacto | Formato | Propósito |
|---|---|---|
| **[Evolith: Propuesta de Valor Ejecutiva](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_value_proposition_executive.pptx)** | PPTX | Presentación ejecutiva del valor estratégico de Evolith, impacto de gobernanza e ROI para liderazgo tecnológico. |
| **[Evolith: Caso Práctico UMS](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_ums_practical_case.pptx)** | PPTX | Caso de éxito demostrando la aplicación del framework Evolith en una transformación real de monolito modular a microservicios. |
| **[Evolith: Deep-Dive Técnico SDLC](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_sdlc_technical_deep_dive.pptx)** | PPTX | Guía operativa de ingeniería sobre fases, Quality Gates y artefactos. |

### ️ Workbook de Implementación

| Artefacto / Alcance | Formato | Propósito |
|---|---|---|
| **[Workbook de Implementación SDLC Evolith F0](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_sdlc_implementation_workbook_F0.xlsx)** | XLSX | Workbook integrado consolidado para todas las fases SDLC: concepción, diseño, construcción, validación, despliegue y operaciones. Incluye plantillas, registros de roles, matrices de trazabilidad cruzada y dashboards de orquestación de proyectos para mesas de trabajo facilitadas con equipos cliente. |

> El workbook está diseñado para mesas de trabajo facilitadas con equipos cliente. Las presentaciones están diseñadas para alineamiento ejecutivo, caso aplicado UMS y guía operativa para líderes técnicos.

---

## Modelo Operativo SDLC

```mermaid
flowchart LR
    classDef phase fill:#1e3a5f,stroke:#3b82f6,color:#fff,font-weight:bold
    classDef gate fill:#4a3800,stroke:#f59e0b,color:#fff,font-size:12px

    P1["Fase 1<br/>Concepción"]:::phase
    P2["Fase 2<br/>Diseño"]:::phase
    P3["Fase 3<br/>Construcción"]:::phase
    P4["Fase 4<br/>Validación"]:::phase
    P5["Fase 5<br/>Entrega"]:::phase
    G1(["Aprobación<br/>de Negocio"]):::gate
    G2(["Baseline<br/>de Diseño"]):::gate
    G3(["Build<br/>Exitoso"]):::gate
    G4(["RC<br/>Sellado"]):::gate
    G5(["Producción<br/>Activa"]):::gate

    P1 --> G1 --> P2 --> G2 --> P3 --> G3 --> P4 --> G4 --> P5 --> G5
```

---

## Gobernanza Mínima Viable

Para MVPs pequeños, la cadena mínima obligatoria de artefactos es:

```text
PRD -> Historia Funcional -> Historia Técnica -> Test Summary Report -> Release Notes
```

Un ADR es obligatorio cuando el trabajo introduce o cambia límites arquitectónicos, selección tecnológica, modelo de seguridad, modelo de multi-tenancy, estrategia de persistencia, estrategia de contrato de API, topología de despliegue, instrumentación de observabilidad o lógica de integración transversal.

La matriz completa de cumplimiento aplica cuando el producto alcanza escala, ambientes regulados, multi-tenancy, APIs públicas, flujos críticos o dependencias entre equipos.

---

## Fase 01 — Concepción y Descubrimiento

> **Objetivo:** Establecer un entendimiento compartido de lo que debe lograr el producto y por qué antes de que comience cualquier diseño. Las salidas de esta fase autorizan la entrada al trabajo de arquitectura y diseño.
> **Gate de salida:** Aprobación de Negocio
> **Audiencia principal:** Product Owner, Sponsor Ejecutivo, Arquitecto de Software

Definición de alcance, perfiles de usuario, mapeo de OKRs y alineación de restricciones arquitectónicas.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [PRD — Documento de Requisitos de Producto](./04-artifact-templates/prd-template.es.md) | Captura el alcance completo del producto: personas de usuario, OKRs de negocio, límites funcionales, restricciones y requisitos no funcionales. Requerido antes de iniciar diseño. | Product Owner, Sponsor Ejecutivo, Arquitecto de Software |
| [Mapeo SDLC–Artefactos — Fase 1](./sdlc-evolith-artifact-mapping.es.md#2-fase-1-concepción-y-descubrimiento) | Tabla de referencia de artefactos requeridos y opcionales en Fase 1. | Product Owner, Arquitecto |

---

## Fase 02 — Diseño y Arquitectura

> **Objetivo:** Producir decisiones de diseño verificables y trazables que acoten el espacio solución antes de construir.
> **Gate de salida:** Baseline de Diseño Aprobado
> **Audiencia principal:** Arquitecto, Principal Engineer, PO, QA

Selección de patrones, ADRs, bounded contexts, contratos de API e historias funcionales.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [Framework SDLC Orientado a Construcción](./02-engineering/construction-focused-sdlc-framework.es.md) | Estándar normativo que gobierna el progreso de fases, umbrales de calidad, inner build loop y Definition of Done. | Todos los Perfiles de Ingeniería |
| [ADR — Registro de Decisión Arquitectónica](./04-artifact-templates/adr-template.es.md) | Captura una decisión arquitectónica significativa: contexto, opciones consideradas, opción elegida, trade-offs y consecuencias. Requerido cuando el trabajo cruza límites arquitectónicos. | Arquitecto, Principal Engineer |
| [Historia Funcional — Especificación de Comportamiento de Negocio](./04-artifact-templates/functional-story-template.es.md) | Describe una capacidad orientada al usuario en lenguaje de negocio. Define actores, flujos, reglas de negocio, criterios de aceptación y expectativas no funcionales. | Product Owner, Business Analyst |
| [Estándar de Escritura de Historias Funcionales](./03-documentation/functional-story-writing-standard.es.md) | Reglas normativas para estructura, lenguaje y completitud de Historias Funcionales. Todo autor debe conformar a este estándar. | Product Owner, Business Analyst, Revisor |
| [Mapeo SDLC–Artefactos — Fase 2](./sdlc-evolith-artifact-mapping.es.md#3-fase-2-diseño-y-arquitectura) | Tabla de referencia para esta fase. Úsala en revisión de gate. | Arquitecto, Revisor de Gobierno |

---

## Fase 03 — Construcción

> **Objetivo:** Traducir decisiones en software funcional, probado y documentado que cumpla Definition of Done.
> **Gate de salida:** Build Exitoso
> **Audiencia principal:** Desarrolladores, Tech Lead, QA, DevOps

Código fuente, pruebas automatizadas, CI/CD y Definition of Done.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [Historia Técnica — Item de Trabajo de Implementación](./04-artifact-templates/technical-story-template.es.md) | Desglosa una Historia Funcional en tareas técnicas concretas con requisitos específicos de implementación, testing y documentación. | Desarrolladores, Tech Lead |
| [Buenas Prácticas de Documentación SDLC](./03-documentation/sdlc-documentation-best-practices.es.md) | Reglas obligatorias de documentación como código: versionado, actualización de ADRs, documentación inline y checkpoints de revisión. | Todos los Perfiles de Ingeniería |
| [Gates de Calidad SDLC](./quality-gates.es.md) | Umbrales canónicos para cobertura, complejidad, CVEs, deuda técnica, delta de documentación y evidencia de observabilidad. | Tech Lead, QA / SDET, Security Engineer |
| [Mapeo SDLC–Artefactos — Fase 3](./sdlc-evolith-artifact-mapping.es.md#4-fase-3-construcción) | Tabla de referencia para esta fase. Úsala como checklist de DoD. | Tech Lead, QA / SDET |

---

## Fase 04 — Validación y QA

> **Objetivo:** Verificar formalmente que el software cumple criterios de aceptación y umbrales de calidad antes de sellar el RC.
> **Gate de salida:** RC Sellado
> **Audiencia principal:** QA / SDET, Tech Lead, PO, Security Engineer

Verificación de regresión, escaneo de seguridad, UAT y sellado de RC.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [Test Summary Report — Registro de Validación de Quality Gate](./04-artifact-templates/test-summary-report-template.es.md) | Agrega resultados de ejecución de pruebas en capas unit, integration y E2E. Confirma que todos los quality gates estén cumplidos o explícitamente waived antes de sellar RC. | QA / SDET, Tech Lead, Security Engineer |
| [Gates de Calidad SDLC](./quality-gates.es.md) | Umbrales canónicos. Úsalos para confirmar si un RC puede ser sellado o debe bloquearse. | QA / SDET, Tech Lead, Security Engineer |
| [Mapeo SDLC–Artefactos — Fase 4](./sdlc-evolith-artifact-mapping.es.md#5-fase-4-validación-y-qa) | Tabla de referencia para esta fase. Úsala para verificar que todos los artefactos requeridos estén presentes. | QA / SDET, Tech Lead |

---

## Fase 05 — Entrega y Operaciones

> **Objetivo:** Desplegar el RC sellado a producción y confirmar que el sistema está activo, observable y nominal.
> **Gate de salida:** Producción Activa
> **Audiencia principal:** DevOps / SRE, Tech Lead, PO

Despliegue a producción, validación de observabilidad y nominality de monitoreo.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [Release Notes — Registro de Despliegue en Producción](./04-artifact-templates/release-notes-template.es.md) | Registro formal de despliegue: nuevas características, cambios breaking, bug fixes, pasos de despliegue, procedimientos de rollback y baselines de observabilidad. | DevOps / SRE, Tech Lead, PO |
| *Próximamente: Playbook de Zero-Downtime Release* | Runbook operativo para despliegues blue-green y canary con restricciones de zero-downtime. | DevOps / SRE |
| [Mapeo SDLC–Artefactos — Fase 5](./sdlc-evolith-artifact-mapping.es.md#6-fase-5-entrega-y-operaciones) | Tabla de referencia para esta fase. Úsala para verificar que todos los artefactos de delivery estén presentes. | DevOps / SRE, Tech Lead |

---

## Referencias Transversales

Los siguientes documentos aplican en toda la vida del ciclo y deben consultarse sin importar donde el equipo esté operando.

| Documento | Rol transversal |
|---|---|
| [Vista Ejecutiva SDLC](./executive-view.es.md) | Modelo operativo a nivel directivo para inversión, riesgo, gates y readiness operativo. |
| [Gates de Calidad SDLC](./quality-gates.es.md) | Umbrales canónicos de calidad y política de waivers. |
| [Matriz de Responsabilidades SDLC](./responsibility-matrix.es.md) | Expectativas accountable, responsible, consulted y evidencia por gate. |
| [Modelo de Trazabilidad SDLC](./traceability-model.es.md) | Cadena de evidencia end-to-end desde PRD hasta observabilidad operativa. |
| [Mapeo SDLC–Artefactos Evolith](./sdlc-evolith-artifact-mapping.es.md) | Matriz de cumplimiento: 40+ artefactos Evolith mapeados a las cinco fases SDLC con señal Requerido/Opcional. Referencia definitiva de alcance de artefactos por fase. |
| [Content Management Abstraction](../standards/engineering/content-management-abstraction.es.md) | Buena práctica opcional para acelerar Time to Market mediante contenido administrable sin contaminar el core transaccional. |
| [Hub de Plantillas de Artefactos](./04-artifact-templates/README.es.md) | Índice de todas las plantillas con estructuras en blanco y ejemplos UMS. Punto de partida para crear artefactos SDLC oficiales. |

---

[Volver al Nivel Superior](../../README.es.md)
