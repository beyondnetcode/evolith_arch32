# Centro de Gobernanza SDLC Corporativa

> **Navegación bilingüe:** [English Version](./README.md)

Este centro es el hub de gobernanza autorizado del Ciclo de Vida de Desarrollo de Software dentro de Evolith. Define requisitos, fases, gates, artefactos, responsabilidades, trazabilidad y criterios de seguimiento para productos construidos desde esta plataforma de referencia.

---

## Vista Ejecutiva para Directores de Tecnología

Para Directores de Tecnología, el SDLC de Evolith no debe entenderse como un proceso documental, sino como un sistema de control de delivery.

Su propósito es asegurar que el trabajo financiado sea trazable, que el riesgo arquitectónico se resuelva antes de construir, que los gates de calidad sean objetivos y que la preparación operativa pueda demostrarse antes del despliegue.

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
> **Empieza aquí para briefings ejecutivos y workshops con clientes.** Estas presentaciones son el paquete oficial vigente para alinear valor ejecutivo, demostrar la aplicación real con UMS y guiar la operación técnica del SDLC Evolith.
>
> Usa los enlaces siguientes para descargar los archivos directamente.

### 📊 Kit de Comunicación Ejecutiva (Presentaciones)

| Artefacto | Formato | Propósito |
|---|---|---|
| **[Evolith: Propuesta de Valor Ejecutiva](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_value_proposition_executive.pptx)** | PPTX | Presentación ejecutiva para alinear visión comercial y tecnológica sobre los beneficios del SDLC Evolith. |
| **[Evolith: Caso Práctico UMS](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_ums_practical_case.pptx)** | PPTX | Caso de éxito demostrando la aplicación de las 8 fases en un entorno industrial real (Portal Autoservicio). |
| **[Evolith: Deep-Dive Técnico SDLC](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_sdlc_technical_deep_dive.pptx)** | PPTX | Guía operativa de ingeniería sobre las fases, Quality Gates y artefactos. |

### 🛠️ Kit de Herramientas Fase por Fase (Workbooks)

| Artefacto / Fase | Formato | Propósito |
|---|---|---|
| **[Master Workbook Integrador](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Master_Workbook.xlsx)** | XLSX | Tablero de control consolidado, registro de roles, trazabilidad cruzada y estado del proyecto. |
| **[Workbook F1: Ideación](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F1_Ideacion.xlsx)** | XLSX | Plantillas para el Business Case, Acta de Constitución y registro de riesgos iniciales. |
| **[Workbook F2: Análisis](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F2_Analisis.xlsx)** | XLSX | Documentación y trazabilidad de requerimientos de negocio. |
| **[Workbook F3: Diseño](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F3_Diseno.xlsx)** | XLSX | Registros de Decisiones de Arquitectura (ADRs) y Blueprint. |
| **[Workbook F4: Construcción](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F4_Construccion.xlsx)** | XLSX | Control de deuda técnica, Quality Gates en el Pipeline y Definition of Done. |
| **[Workbook F5: Pruebas](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F5_Pruebas.xlsx)** | XLSX | Plan maestro, ejecución de Casos de Prueba y bitácora de defectos. |
| **[Workbook F6: Despliegue](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F6_Despliegue.xlsx)** | XLSX | Ejecución de Runbooks, checklist pre-despliegue y planes de Rollback. |
| **[Workbook F7: Operación](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F7_Operacion.xlsx)** | XLSX | Dashboards SRE, registro de incidentes post-lanzamiento. |
| **[Workbook F8: Retiro](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/Evolith_Workbook_F8_Retiro.xlsx)** | XLSX | Checklist seguro para la desconexión y Sunset de sistemas legacy. |

> Los workbooks están diseñados para mesas de trabajo facilitadas con equipos cliente. Las presentaciones están diseñadas para alineamiento ejecutivo, caso aplicado UMS y guía operativa para líderes técnicos.

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

Un ADR es obligatorio cuando el trabajo introduce o cambia límites arquitectónicos, selección tecnológica, modelo de seguridad, modelo de multi-tenancy, estrategia de persistencia, estrategia de contratos API, topología de despliegue, topología de observabilidad o cualquier excepción a un estándar Evolith existente.

La matriz completa de cumplimiento aplica cuando el producto alcanza escala, ambientes regulados, multi-tenancy, APIs públicas, flujos críticos o dependencias entre equipos.

---

## Fase 01 — Concepción y Descubrimiento

> **Objetivo:** Establecer un entendimiento compartido de lo que debe lograr el producto y por qué antes de que comience cualquier diseño. Las salidas de esta fase autorizan la entrada al trabajo de arquitectura y diseño.
> **Gate de salida:** Aprobación de Negocio
> **Audiencia principal:** Product Owner, Sponsor Ejecutivo, Arquitecto de Software

Definición de alcance, perfiles de usuario, mapeo de OKRs y alineación de restricciones arquitectónicas.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [PRD — Documento de Requisitos de Producto](./04-artifact-templates/prd-template.es.md) | Captura el alcance completo del producto. Requerido antes de iniciar arquitectura. | Product Owner, Sponsor Ejecutivo |
| [Mapeo SDLC–Artefactos — Fase 1](./sdlc-evolith-artifact-mapping.es.md#2-fase-1-concepción-y-descubrimiento) | Tabla de referencia de artefactos requeridos y opcionales. | Product Owner, Arquitecto |

---

## Fase 02 — Diseño y Arquitectura

> **Objetivo:** Producir decisiones de diseño verificables y trazables.
> **Gate de salida:** Baseline de Diseño Aprobado
> **Audiencia principal:** Arquitecto, Principal Engineer, PO, QA

Selección de patrones, ADRs, bounded contexts, contratos de API e historias funcionales.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [Framework SDLC Orientado a Construcción](./02-engineering/construction-focused-sdlc-framework.es.md) | Estándar normativo que gobierna el progreso. | Todos los ingenieros |
| [ADR — Registro de Decisión Arquitectónica](./04-artifact-templates/adr-template.es.md) | Captura una decisión arquitectónica significativa. | Arquitecto |
| [Historia Funcional](./04-artifact-templates/functional-story-template.es.md) | Describe una capacidad orientada al usuario en lenguaje de negocio. | PO, BA |
| [Estándar de Escritura de Historias Funcionales](./03-documentation/functional-story-writing-standard.es.md) | Reglas normativas para estructurar historias. | PO, BA, QA |
| [Mapeo SDLC–Artefactos — Fase 2](./sdlc-evolith-artifact-mapping.es.md#3-fase-2-diseño-y-arquitectura) | Tabla de referencia para esta fase. | Arquitecto, Revisor de Gobierno |

---

## Fase 03 — Construcción

> **Objetivo:** Traducir decisiones en software funcional y documentado.
> **Gate de salida:** Build Exitoso
> **Audiencia principal:** Desarrolladores, Tech Lead, QA, DevOps

Código fuente, pruebas automatizadas, CI/CD y Definition of Done.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [Historia Técnica](./04-artifact-templates/technical-story-template.es.md) | Desglosa una Historia Funcional en tareas técnicas concretas. | Desarrolladores, Tech Lead |
| [Buenas Prácticas de Documentación](./03-documentation/sdlc-documentation-best-practices.es.md) | Reglas de documentación como código. | Todos los ingenieros |
| [Gates de Calidad SDLC](./quality-gates.es.md) | Umbrales canónicos para calidad. | Tech Lead, QA |
| [Mapeo SDLC–Artefactos — Fase 3](./sdlc-evolith-artifact-mapping.es.md#4-fase-3-construcción) | Tabla de referencia para esta fase. | Tech Lead, QA |

---

## Fase 04 — Validación y QA

> **Objetivo:** Verificar formalmente que el software cumple los criterios de aceptación.
> **Gate de salida:** RC Sellado
> **Audiencia principal:** QA, Tech Lead, PO, Seguridad

Verificación de regresión, escaneo de seguridad, UAT.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [Test Summary Report](./04-artifact-templates/test-summary-report-template.es.md) | Agrega resultados de pruebas y calidad. | QA, Tech Lead |
| [Gates de Calidad SDLC](./quality-gates.es.md) | Umbrales canónicos. | QA, Seguridad |
| [Mapeo SDLC–Artefactos — Fase 4](./sdlc-evolith-artifact-mapping.es.md#5-fase-4-validación-y-qa) | Tabla de referencia para esta fase. | QA, Tech Lead |

---

## Fase 05 — Entrega y Operaciones

> **Objetivo:** Desplegar el RC a producción.
> **Gate de salida:** Producción Activa
> **Audiencia principal:** DevOps, Tech Lead, PO

Despliegue a producción y validación de observabilidad.

| Artefacto | Objetivo y cuándo usarlo | Perfiles recomendados |
|---|---|---|
| [Release Notes](./04-artifact-templates/release-notes-template.es.md) | Registro formal de despliegue. | DevOps, Tech Lead |
| [Mapeo SDLC–Artefactos — Fase 5](./sdlc-evolith-artifact-mapping.es.md#6-fase-5-entrega-y-operaciones) | Tabla de referencia para esta fase. | DevOps |

---

## Referencias Transversales

| Documento | Rol transversal |
|---|---|
| [Vista Ejecutiva SDLC](./executive-view.es.md) | Modelo operativo a nivel directivo para inversión, riesgo, gates y readiness operativo. |
| [Gates de Calidad SDLC](./quality-gates.es.md) | Umbrales canónicos de calidad y política de waivers. |
| [Matriz de Responsabilidades SDLC](./responsibility-matrix.es.md) | Expectativas accountable, responsible, consulted y evidencia por gate. |
| [Modelo de Trazabilidad SDLC](./traceability-model.es.md) | Cadena de evidencia end-to-end desde PRD hasta release. |
| [Mapeo SDLC–Artefactos Evolith](./sdlc-evolith-artifact-mapping.es.md) | Matriz de cumplimiento por fase. |
| [Hub de Plantillas de Artefactos](./04-artifact-templates/README.es.md) | Punto de partida para crear artefactos SDLC oficiales. |

---

[Volver al Nivel Superior](../../README.es.md)
