# PRD — [Nombre del Producto]

<p align="right">
  <img src="https://img.shields.io/badge/Versión-[ej.%200.1.0--draft]-f39c12?style=flat-square" alt="Versión">
  <img src="https://img.shields.io/badge/Estado-Borrador-ff7f50?style=flat-square" alt="Estado">
  <img src="https://img.shields.io/badge/Alcance-Solo%20Funcional-8e44ad?style=flat-square" alt="Solo Funcional">
</p>

> **Fase:** 1 — Concepción y Descubrimiento
> **Alcance del documento:** Este PRD describe **únicamente requisitos funcionales y de negocio**. Las decisiones técnicas (stack, arquitectura, protocolos de integración, diagramas de infraestructura) viven en los artefactos de arquitectura y ADRs, no aquí.

---

## 1. Metadatos

- **Identificador:** `PRD-[PRODUCTO]-001`
- **Producto:** [Nombre del Producto]
- **Versión:** [ej. 0.1.0-draft]
- **Estado:** [Borrador | En Revisión | Aprobado | Supersedido]
- **Autor(es):** [Nombre del Product Manager]
- **Aprobador de Negocio:** *(pendiente)*
- **Fecha de Aprobación:** *(pendiente)*

## 2. Resumen Ejecutivo

### 2.1 Declaración del Problema

[Describe el problema de negocio que este producto resuelve. Enfócate en el volumen actual, los procesos manuales, las horas/hombre perdidas, la tasa de errores y la falta de trazabilidad. Usa placeholders `{X}` para valores aún no cuantificados.]

### 2.2 Solución Propuesta

[Describe brevemente qué hace el sistema y cómo resuelve el problema. Define el alcance del MVP y qué fases posteriores ampliarán la solución.]

### 2.3 Alcance del MVP

El MVP cubre las siguientes funcionalidades:

| Categoría | Funcionalidades |
| :-------- | :-------------- |
| **[Categoría 1]** | [Funcionalidades incluidas] |
| **[Categoría 2]** | [Funcionalidades incluidas] |

### 2.4 Beneficios Esperados

| Beneficio | Valor Esperado |
| :-------- | :------------- |
| [Beneficio 1] | [Valor medible] |
| [Beneficio 2] | [Valor medible] |

### 2.5 Fases de Entrega

| Fase | Entregable | Horizonte |
| :--- | :--------- | :-------- |
| **Fase 1 — MVP** | [Entregable del MVP] | [ej. Q3 2026] |
| **Fase 2 — [Nombre]** | [Entregable de Fase 2] | [ej. Q4 2026] |
| **Fase 3 — [Nombre]** | [Entregable de Fase 3] | [ej. Q1 2027] |

## 3. Contexto y Problema

### 3.1 Contexto Actual

- **Operación actual:** [Describe cómo funciona el proceso hoy, paso a paso, incluyendo herramientas utilizadas (hojas de cálculo, llamadas, WhatsApp, etc.)]
- **Tiempo promedio de [proceso principal]:** {X} horas desde [evento inicio] hasta [evento fin]
- **Tasa de errores:** {X}% de [entidad] presentan datos inconsistentes
- **Volumen de [entidad]:** {X} [unidades]/mes

### 3.2 Problema Identificado

| Problema | Impacto | Consecuencia Operativa |
| :------- | :------ | :--------------------- |
| **[Problema 1]** | [Impacto directo] | [Consecuencia en el negocio] |
| **[Problema 2]** | [Impacto directo] | [Consecuencia en el negocio] |

### 3.3 Impacto Estimado

| Métrica | Valor Estimado | Nota |
| :------ | :------------- | :--- |
| [Métrica 1] | {X} [unidades]/mes | [Nota adicional] |
| [Métrica 2] | USD {X}/mes | [Nota adicional] |

### 3.4 Visión Estratégica

[Describe por qué este producto es clave en la estrategia del negocio y qué habilita a futuro.]

## 4. Objetivos y Métricas de Éxito

| Objetivo | Métrica | Valor Inicial | Meta | Horizonte |
| :--- | :--- | :--- | :--- | :--- |
| [Objetivo 1] | [Métrica medible] | [Estado actual] | [Valor objetivo] | [Fecha] |
| [Objetivo 2] | [Métrica medible] | [Estado actual] | [Valor objetivo] | [Fecha] |

## 5. Alcance

### 5.1 Dentro del Alcance — MVP

| Categoría | Funcionalidades Incluidas |
| :-------- | :------------------------ |
| **[Categoría 1]** | [F-01 Descripción, F-02 Descripción] |
| **[Categoría 2]** | [F-03 Descripción, F-04 Descripción] |

### 5.2 Fuera del Alcance MVP — Fases Posteriores

| Fase | Funcionalidad | Horizonte |
| :--- | :------------ | :-------- |
| **Fase 2** | [Funcionalidad excluida del MVP] | [Fecha] |
| **Fase 3** | [Funcionalidad excluida del MVP] | [Fecha] |

### 5.3 Alcance Funcional del MVP

[Organiza el MVP en bloques funcionales y describe brevemente cada uno. Lista los actores principales que interactúan con estos bloques.]

## 6. Actores y Casos de Uso de Alto Nivel

### 6.1 Descripción de Actores

| Actor | Rol en el Sistema | Responsabilidades Principales |
| :---- | :---------------- | :---------------------------- |
| **[Actor 1]** | [Rol] | [Responsabilidades] |
| **[Actor 2]** | [Rol] | [Responsabilidades] |

### 6.2 Casos de Uso por Actor

| Actor | Casos de Uso — MVP (Fase 1) | Casos de Uso — Fase 2+ |
| :---- | :-------------------------- | :---------------------- |
| **[Actor 1]** | [F-01, F-02, F-03] | [F-07, F-15] |
| **[Actor 2]** | [F-04, F-05] | [F-16] |

### 6.3 Matriz de Interacción

| Actor | [Sistema] | [Sistema Externo 1] | [Sistema Externo 2] |
| :---- | :-------- | :------------------ | :------------------ |
| **[Actor 1]** | [Acciones] | [Acciones] | [Acciones] |
| **[Actor 2]** | [Acciones] | — | — |

## 7. Funcionalidades Detalladas del MVP

| ID | Funcionalidad | Descripción |
| :-- | :------------ | :---------- |
| F-01 | [Nombre de la funcionalidad] | [Descripción detallada de qué hace, quién la ejecuta y qué restricciones tiene] |
| F-02 | [Nombre de la funcionalidad] | [Descripción detallada] |

## 8. Reglas de Negocio Explícitas

> **Prioridad (MoSCoW):** **M** = Must (imprescindible MVP) · **S** = Should (importante, no bloquea MVP) · **C** = Could (deseable / fase posterior).

| ID | Regla | Prioridad |
| :-- | :---- | :-------: |
| RN-01 | [Regla de negocio con texto claro y preciso] | M |
| RN-02 | [Regla de negocio] | S |
| RN-03 | [Regla de negocio] | C |

## 9. Restricciones y Supuestos

### 9.1 Restricciones

| ID | Restricción | Categoría |
| :-- | :---------- | :-------- |
| R-01 | [Restricción identificada] | [Regulatoria | Técnica | Operativa | Dependencia | Alcance] |

### 9.2 Supuestos

| ID | Supuesto | Riesgo si no se cumple |
| :-- | :------- | :--------------------- |
| S-01 | [Supuesto identificado] | [Consecuencia si no se cumple] |

## 10. Riesgos de Negocio

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
| :-- | :----- | :----------- | :------ | :--------- |
| RS-01 | [Riesgo identificado] | [Baja | Media | Alta] | [Bajo | Medio | Alto] | [Estrategia de mitigación] |

## 11. Criterios de Aceptación del PRD

El PRD se considera aprobado cuando se cumplan todos los siguientes criterios:

### 11.1 Contenido del PRD

| ID | Criterio | Responsable | Estado |
| :-- | :------- | :---------- | :----- |
| CA-01 | Resumen ejecutivo validado por el Aprobador de Negocio | [Nombre] | ☐ |
| CA-02 | Métricas de éxito con valor inicial y meta medibles | [Nombre] | ☐ |
| CA-03 | Alcance (5.1 y 5.2) firmado por Producto | [Nombre] | ☐ |
| CA-04 | Reglas de negocio (RN-01 a RN-XX) sin contradicciones y priorizadas | [Nombre] | ☐ |
| CA-05 | Restricciones y supuestos revisados y aprobados | [Nombre] | ☐ |
| CA-06 | Actores y casos de uso validados con stakeholders clave | [Nombre] | ☐ |
| CA-07 | Funcionalidades (F-01 a F-XX) con criterios de aceptación individuales | [Nombre] | ☐ |
| CA-08 | Reglas de negocio priorizadas (Must/Should/Could) | [Nombre] | ☐ |
| CA-09 | Glosario completo y consistente con el dominio | [Nombre] | ☐ |

### 11.2 Producto

| ID | Criterio | Responsable | Estado |
| :-- | :------- | :---------- | :----- |
| CA-10 | Prototipos/wireframes aprobados por UX | [Nombre] | ☐ |
| CA-11 | Plan de datos maestros (mapeo, calidad, limpieza) aprobado | [Nombre] | ☐ |

### 11.3 Proyecto

| ID | Criterio | Responsable | Estado |
| :-- | :------- | :---------- | :----- |
| CA-12 | Cronograma del MVP con hitos y fecha de entrega definidos | [Nombre] | ☐ |
| CA-13 | Recursos de desarrollo asignados y disponibles | [Nombre] | ☐ |
| CA-14 | Plan de testing (unitario, integración, aceptación) definido | [Nombre] | ☐ |
| CA-15 | Plan de despliegue y capacitación definido | [Nombre] | ☐ |

## 12. Glosario

| Término | Definición |
| :------ | :--------- |
| **[Término 1]** | [Definición clara y precisa] |
| **[Término 2]** | [Definición clara y precisa] |

## 13. Historial de Cambios

| Versión | Fecha | Autor | Cambios |
| :------ | :---- | :---- | :------ |
| 0.1.0-draft | [AAAA-MM-DD] | [Nombre] | Versión inicial |

---

## Anexos

### A.1 Prototipos de Pantallas (MVP)

Los prototipos de las pantallas del MVP se encuentran disponibles en [Figma / herramienta de diseño]. Se debe revisar y validar cada pantalla con el Product Owner antes del inicio del desarrollo.

| Pantalla | Funcionalidad | Referencia |
| :------- | :------------ | :--------- |
| [Nombre de pantalla] | [F-XX] | [Enlace o referencia] |

> *Nota: Los prototipos en [herramienta] son la fuente de verdad para el diseño de UI/UX. Este documento solo referencia las pantallas y sus funcionalidades asociadas.*

---

<p align="center">
  <strong>© Evolith</strong> · www.beyondnet.info
</p>
