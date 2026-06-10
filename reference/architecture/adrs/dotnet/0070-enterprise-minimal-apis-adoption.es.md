# [ADR-0070](0070-enterprise-minimal-apis-adoption.md): Estrategia de Endpoints en APIs .NET

## 1. Estado
**Estado**: Propuesto 
**Fecha**: 2026-05-13 
**Alcance**: Stack Tecnológico - APIs .NET 

---

## 2. Contexto
En .NET 8/9/10, las **Minimal APIs** son maduras para producción (*production-ready*) y Microsoft las posiciona como el futuro de ASP.NET Core. Para garantizar eficiencia, rendimiento y gobernanza técnica a gran escala, necesitamos definir cuándo adoptar cada modelo en la organización.

---

## 3. Decisión
Se adopta una **estrategia híbrida** con los siguientes criterios de selección específicos:

### A. Criterios de Selección

* **Minimal APIs**:
 * Nuevos microservicios de alto rendimiento.
 * Servicios serverless y event-driven.
 * Backend-for-Frontend (BFFs).
 * Módulos desarrollados bajo Vertical Slice Architecture.
* **Controllers Tradicionales**:
 * APIs enterprise con lógica de filtros MVC complejos.
 * Módulos legacy en mantenimiento activo.
 * Servicios que requieren lógica de model binding avanzado no soportada en Minimal APIs.

### B. Estándares para Minimal APIs
Para mitigar el desorden del código, se imponen las siguientes reglas no negociables:
* **Handlers**: Deben definirse como métodos de clase dedicados (prohibidas las lambdas inline).
* **Organización**: Uso obligatorio de *Extension Methods* por cada módulo de funcionalidad (Feature Module).
* **Estructura**: Uso de `MapGroup` por recurso con políticas (policies) de seguridad y CORS compartidas.
* **SDK Corporativo**: Utilización del SDK base corporativo para abstraer helpers de registro, versionamiento y observabilidad de los endpoints.

---

## 4. Consecuencias

### Positivas
* **Rendimiento**: Mejor performance y compatibilidad Native AOT en nuevos servicios.
* **Evolución**: Adopción incremental controlada sin forzar reescrituras masivas.

### Negativas
* **Curva de Aprendizaje**: Los equipos de desarrollo deben dominar ambos patrones operativos simultáneamente.
* **Fricción de Onboarding**: Al coexistir dos modelos diferentes, se requiere documentación robusta para prevenir confusiones.

---

## 5. Revisión
Evaluar en **Q2 del siguiente año** si la madurez del ecosistema permite deprecar formalmente el uso de Controllers en todos los nuevos proyectos de software.






## Objetivo y Alcance

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Decisiones y Estándares Relacionados

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Fuentes Actuales

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

---
[Volver al Índice](./README.es.md)
