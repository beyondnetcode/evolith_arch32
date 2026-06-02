# Centro de Gobernanza SDLC Corporativa

> **Navegación bilingüe:** [English Version](./README.md)

Este centro es el hub de gobernanza autorizado del Ciclo de Vida de Desarrollo de Software dentro de Evolith. Define requisitos, fases, gates, artefactos, responsabilidades, trazabilidad y criterios de calidad para toda entrega de software en la organización.

---

## Vista Ejecutiva para Directores de Tecnología

Para Directores de Tecnología, el SDLC de Evolith no debe entenderse como un proceso documental, sino como un sistema de control de delivery.

Su propósito es asegurar que el trabajo financiado sea trazable, que el riesgo arquitectónico se resuelva antes de construir, que los gates de calidad sean objetivos y que la preparación operativa sea verificable antes de ir a producción.

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

## 📥 Centro de Descargas — Materiales Ejecutivos SDLC

> [!IMPORTANT]
> **Empieza aquí para briefings ejecutivos y workshops con clientes.** Estos materiales son el paquete oficial simplificado para explicar cómo adoptar Evolith SDLC, seleccionar fases aplicables, asignar hitos de gobernanza y entrenar a equipos de ingeniería.
>
> Usa los enlaces siguientes para descargar los archivos directamente.

| Descarga | Formato | Mejor uso |
|---|---|---|
| **[⬇️ Presentación Ejecutiva UMS v4](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_arch32_ums_executive_reference_v4.pptx)** | PPTX | Briefing ejecutivo, alineamiento de stakeholders, presentación de modelo SDLC a líderes |
| **[⬇️ Workbook de Referencia UMS v4](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_arch32_ums_workbook_reference_v4.xlsx)** | XLSX | Planificación de sprints, mapeo de hitos SDLC, seguimiento de fases y gates |
| **[⬇️ Workbook Scorecard Bilingüe](https://github.com/beyondnetcode/evolith_arch32/raw/main/reference/governance/sdlc/assets/evolith_sdlc_workshop_scorecard_workbook_bilingual.xlsx)** | XLSX | Evaluación de madurez SDLC, mesas de trabajo facilitadas, scoring de cumplimiento |

> El workbook está diseñado para mesas de trabajo facilitadas con equipos cliente. La presentación está diseñada para alineamiento ejecutivo, visión de producto y comunicación con líderes de tecnología. El scorecard permite evaluar el nivel de adopción actual y definir un roadmap de mejora.

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

Un ADR es obligatorio cuando el trabajo introduce o cambia límites arquitectónicos, selección tecnológica, modelo de seguridad, modelo de multi-tenancy, estrategia de persistencia, estrategia de API, o estrategia de observabilidad.

La matriz completa de cumplimiento aplica cuando el producto alcanza escala, ambientes regulados, multi-tenancy, APIs públicas, flujos críticos o dependencias entre equipos.

---

## Fases y Artefactos Clave

| Fase | Gate | Artefactos principales |
|---|---|---|
| Fase 1 — Concepción y Descubrimiento | Aprobación de Negocio | [PRD](./04-artifact-templates/prd-template.es.md), [Mapeo SDLC–Artefactos](./sdlc-evolith-artifact-mapping.es.md) |
| Fase 2 — Diseño y Arquitectura | Baseline de Diseño | [ADR](./04-artifact-templates/adr-template.es.md), [Historia Funcional](./04-artifact-templates/functional-story-template.es.md), [Estándar de Escritura](./03-documentation/functional-story-writing-standard.es.md) |
| Fase 3 — Construcción | Build Exitoso | [Historia Técnica](./04-artifact-templates/technical-story-template.es.md), [Buenas Prácticas de Documentación](./03-documentation/sdlc-documentation-best-practices.es.md), [Gates de Calidad](./quality-gates.es.md) |
| Fase 4 — Validación y QA | RC Sellado | [Test Summary Report](./04-artifact-templates/test-summary-report-template.es.md), [Gates de Calidad](./quality-gates.es.md) |
| Fase 5 — Entrega y Operaciones | Producción Activa | [Release Notes](./04-artifact-templates/release-notes-template.es.md), checklist de observabilidad y rollback |

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
