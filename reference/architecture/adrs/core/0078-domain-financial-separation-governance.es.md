# ADR-0078: Domain Financial Separation Governance

- **Status:** Accepted
- **Deciders:** Evolith Architecture Board
- **Date:** 2026-06-18

> **Bilingual Navigation:** [English Version](./0078-domain-financial-separation-governance.md)

## Contexto y Problema

Durante las revisiones arquitectónicas del repositorio Evolith Core (específicamente en los artefactos del SDLC de la Fase 1: Concepción y Descubrimiento), detectamos un problema de "sangrado de dominio" (Domain Bleed / Contaminación de Dominio). Varias plantillas, esquemas de validación y pautas contenían campos y lógica relacionados con finanzas, presupuestos, inversiones, CAPEX/OPEX y ROI de negocio.

Evolith Core está diseñado como un repositorio de referencia técnica de arquitectura pura, enfocado en patrones de diseño de software, AI-DD dirigido por especificaciones, requisitos no funcionales (NFRs) y reglas de código ejecutables. El seguimiento y la orquestación financiera centrada en el negocio son responsabilidad exclusiva del orquestador del SDLC, **Evolith Tracker**.

Permitir que las variables financieras se infiltren en el Core viola los principios de aislamiento de Domain-Driven Design (DDD), complica la lógica de validación de la CLI y acopla los frameworks técnicos a flujos de trabajo de presupuestos empresariales altamente variables.

## Objetivo y Alcance

**Objetivo:** Estandarizar una separación estricta de responsabilidades que purgue todos los parámetros financieros del espacio de trabajo del Core y exija que las especificaciones de Core dependan únicamente de restricciones técnicas y Atributos de Calidad (NFRs).

**En alcance:**
- Todas las plantillas de artefactos de SDLC, esquemas de validación y políticas dentro del repositorio Core.
- Criterios de evaluación de gates para la Fase 1.

**Fuera de alcance:**
- La implementación de esquemas de seguimiento financiero dentro del repositorio Evolith Tracker.

## Decisión

**Purgar absolutamente todas las referencias a parámetros financieros de Evolith Core y delegar todo el seguimiento financiero, presupuestos y lógica de ROI empresarial exclusivamente a Evolith Tracker.**

Todas las especificaciones y plantillas en Core deben sustituir los conceptos comerciales/financieros con Restricciones Técnicas y Atributos de Calidad (NFRs):

1. **Discovery Canvas**: Reemplazar la expectativa de valor comercial/monetario (`expectedValue`) con Atributos de Calidad esperados (`expectedQualityAttributes` / NFRs: Latencia, Escalabilidad, Seguridad).
2. **Business Case ROI**: Renombrar la plantilla de Core a **Technical Feasibility Canvas** (`technical-feasibility-template.md`), reemplazando las secciones de monetización y ROI con criterios detallados de NFR y restricciones técnicas.
3. **Ballpark Estimation**: Reemplazar la sección "Costos Asociados (CAPEX / OPEX)" y sus propiedades del esquema con límites técnicos y cuotas (p.ej., Cuotas de Nube, restricciones de recursos de CPU/Memoria, limitaciones del stack tecnológico).
4. **Comandos de transición en la CLI**: Cualquier comando de scaffolding automático en la CLI debe purgarse de propiedades financieras, enfocándose estrictamente en mapear requisitos técnicos y scaffolding de código.

Se prohíbe que las especificaciones futuras del Core introduzcan parámetros de presupuesto, costo o monetización.

## Consecuencias

**Positivas:**
- Fuerza límites limpios de DDD entre Evolith Core y Evolith Tracker.
- Simplifica la lógica de la CLI de Core, que ya no necesita validar monedas, asignaciones presupuestarias ni métricas financieras de OKR corporativos.
- Alinea los artefactos de ingeniería en torno a métricas técnicas (NFRs y límites de recursos) que los desarrolladores pueden medir objetivamente.

**Negativas / Trade-offs:**
- Los equipos deben consultar tanto las plantillas de Core (para factibilidad técnica) como las de Tracker (para casos de negocio financieros) para obtener el Business Sign-Off completo.
- Cambio disruptivo en los esquemas de verificación de gates de la Fase 1.

**Mitigaciones:**
- Los mapeos de comandos de la CLI y las pruebas de validación se actualizan para soportar la transición hacia el Technical Feasibility Canvas.
- Referencias claras guían a los equipos de los satélites hacia el repositorio Tracker para plantillas financieras.

## Referencias

- [Domain-Driven Design (DDD) - Bounded Contexts](https://martinfowler.com/bliki/BoundedContext.html)
- [Repositorio de producto Evolith Tracker](https://github.com/beyondnetcode/ums)
- Seguimiento de gaps: separación de responsabilidades de dominio
