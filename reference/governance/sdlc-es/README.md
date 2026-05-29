# Centro de Gobernanza SDLC Corporativa

> **Navegación Bilingüe:** [English Version](../sdlc/README.md)

Este centro es el hub de gobernanza autorizado del Ciclo de Vida de Desarrollo de Software dentro de Evolith. Define los requisitos procedimentales, las puertas de salida de fase, los formatos de artefactos y el mapeo de cumplimiento que rigen cada producto construido desde esta plataforma de referencia.

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

## Mapa de Fases SDLC

### Fase 01: Concepción y Descubrimiento
Definición de alcance, perfilado de personas, mapeo de OKRs y alineación con restricciones arquitectónicas.

| Recurso | Descripción |
|---|---|
| [Plantilla PRD](../sdlc/04-artifact-templates/prd-template.es.md) | Plantilla de formato con ejemplo completo de UMS |
| [Mapeo SDLC–Artefactos — Fase 1](../sdlc/sdlc-evolith-artifact-mapping.es.md#2-fase-1--concepción-y-descubrimiento) | Artefactos Evolith requeridos y opcionales para esta fase |

### Fase 02: Diseño y Arquitectura
Selección de patrones, producción de ADRs, definición de bounded contexts, contratos de API y escritura de historias funcionales.

| Recurso | Descripción |
|---|---|
| [Framework SDLC Orientado a Construcción](./02-engineering/construction-focused-sdlc-framework.md) | Definiciones de fase, umbrales de calidad y DoD |
| [Plantilla ADR](../sdlc/04-artifact-templates/adr-template.es.md) | Plantilla de formato con ejemplo completo (ADR-0010) |
| [Plantilla Historia Funcional](../sdlc/04-artifact-templates/functional-story-template.es.md) | Plantilla de formato con ejemplo UMS FS-01 |
| [Estándar de Escritura de Historias Funcionales](./03-documentation/functional-story-writing-standard.md) | Reglas normativas para la estructura de historias funcionales |
| [Mapeo SDLC–Artefactos — Fase 2](../sdlc/sdlc-evolith-artifact-mapping.es.md#3-fase-2--diseño-y-arquitectura) | Artefactos Evolith requeridos y opcionales para esta fase |

### Fase 03: Construcción
Composición de código fuente, testing automatizado, aplicación de CI/CD y Definición de Terminado.

| Recurso | Descripción |
|---|---|
| [Framework SDLC — §3 Bucle Interno y §4 DoD](./02-engineering/construction-focused-sdlc-framework.md) | Sub-fases de construcción y métricas de puerta de calidad |
| [Plantilla Historia Técnica](../sdlc/04-artifact-templates/technical-story-template.es.md) | Plantilla de formato con ejemplo UMS TS-003 |
| [Buenas Prácticas de Documentación SDLC](./03-documentation/sdlc-documentation-best-practices.md) | Reglas de documentación-como-código obligatorias en esta fase |
| [Mapeo SDLC–Artefactos — Fase 3](../sdlc/sdlc-evolith-artifact-mapping.es.md#4-fase-3--construcción) | Artefactos Evolith requeridos y opcionales para esta fase |

### Fase 04: Validación y QA
Verificación de regresión, escaneo de seguridad, UAT y sellado del Release Candidate.

| Recurso | Descripción |
|---|---|
| [Plantilla Reporte de Resumen de Testing](../sdlc/04-artifact-templates/test-summary-report-template.es.md) | Plantilla de formato con ejemplo UMS MVP RC-1 |
| [Mapeo SDLC–Artefactos — Fase 4](../sdlc/sdlc-evolith-artifact-mapping.es.md#5-fase-4--validación-y-qa) | Artefactos Evolith requeridos y opcionales para esta fase |

### Fase 05: Entrega y Operaciones
Despliegue a producción, validación de observabilidad y nominalidad de monitoreo.

| Recurso | Descripción |
|---|---|
| [Plantilla Release Notes](../sdlc/04-artifact-templates/release-notes-template.es.md) | Plantilla de formato con ejemplo UMS v0.1.0 |
| *Próximamente: Playbook de Lanzamientos Zero-Downtime* | |
| [Mapeo SDLC–Artefactos — Fase 5](../sdlc/sdlc-evolith-artifact-mapping.es.md#6-fase-5--entrega-y-operaciones) | Artefactos Evolith requeridos y opcionales para esta fase |

---

## Referencias Transversales a Fases

| Recurso | Descripción |
|---|---|
| **[Mapeo SDLC–Artefactos Evolith](../sdlc/sdlc-evolith-artifact-mapping.es.md)** | Qué artefactos Evolith son Requeridos u Opcionales en cada una de las cinco fases, con matriz de 40+ artefactos |
| **[Hub de Plantillas de Artefactos](../sdlc/04-artifact-templates/README.es.md)** | Las seis plantillas de formato con ejemplos completos, organizadas por fase |

---

[Volver al Nivel Superior](../../README.es.md)
