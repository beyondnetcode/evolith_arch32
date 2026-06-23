# Guía de Evolución de Módulos Distribuidos

> **Navegación Bilingüe:** [English](./evolution.md) | [Español](./evolution.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Módulos Distribuidos

## Descripción General

Esta guía define la ruta de evolución desde módulos distribuidos (F2) hasta microservicios (F3), incluyendo criterios de preparación para extracción, evaluación de independencia de módulos y el proceso de gobernanza regido por ADR-0045 y ADR-0047.

## Umbral de Preparación F2 a F3 (DM-R08)

Un módulo es elegible para extracción a un microservicio independiente cuando su Puntuación de Preparación para Extracción alcanza el 80% o más.

- **Componentes de la puntuación de extracción**: Independencia de despliegue, aislamiento de datos, estabilidad de contratos, autonomía del equipo, madurez operativa.
- **Metodología de puntuación**: Cada componente se puntúa de 0-100; el agregado debe alcanzar o superar el 80%.
- **Frecuencia de evaluación**: La preparación para extracción se evalúa trimestralmente o ante cambios arquitectónicos significativos.
- **Aplicación de compuerta**: Ningún módulo puede ser extraído sin alcanzar la puntuación umbral y la aprobación de la junta de arquitectura.

## Criterios de Independencia del Módulo

Antes de la extracción, un módulo debe demostrar independencia en múltiples dimensiones.

- **Independencia de despliegue**: El módulo se despliega y revierte independientemente sin coordinación cross-module.
- **Aislamiento de datos**: El módulo es dueño de su almacén de datos sin esquemas compartidos o acceso directo cross-module (DM-R03).
- **Estabilidad de contratos**: Las APIs y eventos del módulo están versionados, documentados y son compatibles retroactivamente (DM-R02).
- **Autonomía del equipo**: Un equipo dedicado posee el módulo de extremo a extremo incluyendo operaciones (DM-R01).
- **Madurez operativa**: El módulo tiene observabilidad, alertas y runbooks de nivel producción.

## Extracción a Microservicios (ADR-0047)

Cuando se cumplen los criterios de extracción, el módulo transiciona a un microservicio independiente siguiendo el proceso de gobernanza.

- **Propuesta de extracción**: El propietario del módulo presenta una propuesta de extracción con evidencia de preparación.
- **Revisión de arquitectura**: La junta de arquitectura revisa la propuesta contra los criterios de extracción.
- **Extracción piloto**: La primera extracción es un piloto con monitoreo mejorado y preparación de reversión.
- **Extracción completa**: Después del piloto exitoso, el módulo se extrae completamente como servicio independiente.

## Proceso de Gobernanza (ADR-0045)

La transición de topología progresiva está gobernada por registros de decisión arquitectónica explícitos.

- **Redacción de ADRs**: Las decisiones de extracción se capturan en ADRs con contexto, opciones y justificación.
- **Revisión de partes interesadas**: Las propuestas de extracción requieren revisión del propietario del módulo, equipo de plataforma y junta de arquitectura.
- **Registro de decisión**: Las extracciones aprobadas se documentan como ADRs para referencia futura.
- **Plan de reversión**: Toda extracción incluye un plan de reversión documentado en caso de problemas posteriores a la extracción.

---

[Volver al Perfil de Módulos Distribuidos](./README.es.md)
