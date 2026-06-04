# Business Case ROI

> **Propósito:** Definir el sustento comercial de una iniciativa, analizando el ROI esperado, el Time to Market, métricas principales y viabilidad.
> 
> **Fase SDLC:** 01 - Discovery / Ideación
> 
> **Responsable:** Product Owner
> 
> **Quality Gate:** Compuerta de Aprobación de Financiamiento / Arquitectura

## Metadatos del Artefacto

* **URL Upstream Evolith:** `En construcción - Solicitar a Upstream`
* **Entradas Requeridas:** Documento de Discovery Canvas aprobado.
* **Salidas Esperadas:** Business Case aprobado, que habilita la asignación de presupuesto y la estimación técnica (Ballpark Estimation).
* **Taxonomía Aplicada:** Alineado con glosario Evolith (MVP, Time to Market).
* **Rules Evolith Aplicables:** R-03 (UTF-8 Clean).

## 1. Estructura Documental (Markdown)

```markdown
# Business Case: [Nombre de la Iniciativa]

## 1. Resumen Ejecutivo
[Descripción breve del caso de negocio basado en el Discovery Canvas.]

## 2. Alineación Estratégica
[¿Cómo se alinea esto con los OKRs de la compañía?]

## 3. Análisis Financiero (ROI)
- **Beneficio Esperado (Monetizado):** [e.g., $X aumento en ventas / ahorros].
- **Costo de Oportunidad:** [¿Qué pasa si no lo hacemos?].
- **Time to Market Deseado:** [Meses para el MVP].

## 4. Métricas de Éxito y KPIs
| KPI | Situación Actual | Meta Esperada |
| --- | --- | --- |
| [Métrica 1] | [Valor] | [Valor] |
```

## 2. Estructura de Datos (YAML)

Para integración con el CLI de Evolith y sistemas de PPM (Project Portfolio Management).

```yaml
schema: "http://json-schema.org/draft-07/schema#"
title: "Business Case ROI"
type: "object"
properties:
  initiativeId:
    type: "string"
    description: "ID o enlace al Discovery Canvas"
  executiveSummary:
    type: "string"
  strategicAlignment:
    type: "array"
    items:
      type: "string"
  financialAnalysis:
    type: "object"
    properties:
      expectedBenefit:
        type: "number"
        description: "Valor monetario esperado"
      currency:
        type: "string"
      opportunityCost:
        type: "string"
      targetTimeInMonths:
        type: "integer"
  kpis:
    type: "array"
    items:
      type: "object"
      properties:
        name:
          type: "string"
        current:
          type: "string"
        target:
          type: "string"
```

## 3. Ejemplo Mínimo Aplicado

```yaml
initiativeId: "DISC-2023-001"
executiveSummary: "Automatización del proceso de Onboarding para reducir el abandono en un 25%."
strategicAlignment:
  - "Reducción de costos operativos (OPEX)."
  - "Mejora de experiencia de usuario en canales digitales."
financialAnalysis:
  expectedBenefit: 150000
  currency: "USD"
  opportunityCost: "Pérdida de 40% de prospectos de clientes a la competencia."
  targetTimeInMonths: 3
kpis:
  - name: "Tasa de conversión de Onboarding"
    current: "60%"
    target: "85%"
  - name: "Tiempo de alta"
    current: "48h"
    target: "10m"
```

## 4. Trazabilidad Handoff hacia la Siguiente Fase

Una vez aprobado, el **Business Case ROI** desencadena la **Ballpark Estimation**. El valor `targetTimeInMonths` y las expectativas de retorno informarán al Arquitecto sobre el nivel de esfuerzo (CAPEX/OPEX técnico) que es viable invertir en el proyecto.
