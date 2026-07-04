# Factibilidad Técnica y NFRs

> **Navegación Bilingüe:** [English Version](./technical-feasibility-template.md)
> **Propósito:** Definir la factibilidad técnica de una iniciativa, analizando los Atributos de Calidad (NFRs: Latencia, Escalabilidad, Seguridad) y las restricciones técnicas.
> 
> **Fase SDLC:** 01 - Discovery / Ideación
> 
> **Responsable:** Architect / Tech Lead
> 
> **Quality Gate:** Compuerta de Aprobación de Arquitectura

## Metadatos del Artefacto

* **URL Upstream Evolith:** `En construcción - Solicitar a Upstream`
* **Entradas Requeridas:** Documento de Discovery Canvas aprobado.
* **Salidas Esperadas:** Canvas de Factibilidad Técnica aprobado, que habilita la estimación técnica macro (Ballpark Estimation).
* **Taxonomía Aplicada:** Alineado con glosario Evolith (NFRs, SLA, Technical Constraints).
* **Rules Evolith Aplicables:** R-03 (UTF-8 Clean).

---

## 1. Estructura Documental (Markdown)

```markdown
# Technical Feasibility: [Nombre de la Iniciativa]

## 1. Resumen Técnico
[Descripción breve del caso técnico basado en el Discovery Canvas.]

## 2. Atributos de Calidad (NFRs)
- **Latencia Objetivo:** [e.g., < 200ms en p95].
- **Concurrencia Estimada:** [e.g., 500 req/seg].
- **SLA de Disponibilidad:** [e.g., 99.9%].
- **Cumplimiento de Seguridad:** [e.g., OAuth2, cifrado en tránsito y reposo].

## 3. Restricciones Técnicas
- **Límites de Stack:** [Alineado con el Authoritative Tech Stack].
- **Límites de Cuotas de Cloud:** [Restricciones de CPU, Memoria o Almacenamiento requeridos].
```

---

## 2. Estructura de Datos (YAML)

Para integración con el CLI de Evolith y validadores de pipelines.

```yaml
schema: "http://json-schema.org/draft-07/schema#"
title: "Technical Feasibility"
type: "object"
required: ["initiativeId", "technicalSummary", "qualityAttributes", "technicalConstraints"]
properties:
  initiativeId:
    type: "string"
    description: "ID o enlace al Discovery Canvas"
  technicalSummary:
    type: "string"
  qualityAttributes:
    type: "object"
    required: ["latencyMs", "concurrencyRequestsSec", "availabilitySla"]
    properties:
      latencyMs:
        type: "integer"
      concurrencyRequestsSec:
        type: "integer"
      availabilitySla:
        type: "string"
      securityCompliance:
        type: "string"
  technicalConstraints:
    type: "array"
    items:
      type: "string"
```

---

## 3. Ejemplo Mínimo Aplicado

```yaml
initiativeId: "DISC-2023-001"
technicalSummary: "Automatización del proceso de Onboarding con endpoints de baja latencia."
qualityAttributes:
  latencyMs: 200
  concurrencyRequestsSec: 500
  availabilitySla: "99.9%"
  securityCompliance: "OAuth2 / OWASP Top 10"
technicalConstraints:
  - "Stack: Node.js/NestJS conforme a stack corporativo."
  - "Base de datos: PostgreSQL multi-tenant."
```

---

## 4. Trazabilidad Handoff hacia la Siguiente Fase

Una vez aprobado, el **Technical Feasibility Canvas** desencadena la **Ballpark Estimation**. Las especificaciones de atributos de calidad (`qualityAttributes`) e infraestructura informarán al Arquitecto sobre el nivel de esfuerzo técnico y escalabilidad requerida para planificar el dimensionamiento del equipo y los recursos técnicos.
