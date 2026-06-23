# Guía de Evidencia de Módulos Distribuidos

> **Navegación Bilingüe:** [English](./evidence.md) | [Español](./evidence.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Módulos Distribuidos

## Descripción General

Esta guía define las prácticas de evidencia y validación requeridas para demostrar la preparación operativa de módulos distribuidos. La evidencia cubre comandos de validación, métricas de despliegue, pruebas de contratos, preparación para extracción y datos de rastreo.

## Comandos de Validación

La preparación operativa se verifica a través de comandos de validación repetibles que los módulos deben aprobar.

- **Validación de contratos**: Validar todos los contratos del módulo contra el registro de esquemas para compatibilidad y completitud.
- **Validación de dependencias**: Verificar que el grafo de dependencias del módulo no tenga ciclos y respete los límites de kernel compartido.
- **Validación de endpoints de salud**: Confirmar que todos los módulos exponen endpoints de liveness y readiness que retornan estado correcto.
- **Validación de secretos**: Verificar que no haya secretos presentes en código, archivos de configuración o imágenes de contenedor.

## Métricas de Despliegue

La frecuencia de despliegue y el tiempo de entrega se rastrean como indicadores clave de madurez operativa del módulo.

- **Frecuencia de despliegue**: Objetivo de al menos un despliegue en producción por módulo por semana.
- **Tiempo de entrega**: Tiempo desde commit hasta producción; objetivo menor a 30 minutos para cambios estándar.
- **Tasa de fallo de cambios**: Porcentaje de despliegues que causan incidentes; objetivo inferior al 5%.
- **Tasa de reversión**: Porcentaje de despliegues que requieren reversión; rastreado para análisis de tendencias.

## Resultados de Pruebas de Contrato

Las pruebas de contrato validan la corrección de la comunicación entre módulos y la compatibilidad retroactiva.

- **Pruebas de proveedor**: Cada módulo ejecuta pruebas de contrato de proveedor contra sus contratos publicados.
- **Pruebas de consumidor**: Cada módulo ejecuta pruebas de contrato de consumidor contra sus dependencias upstream.
- **Matriz de compatibilidad**: El CI produce una matriz de compatibilidad mostrando qué pares de versiones de contrato son válidos.
- **Detección de cambios de ruptura**: Detección automatizada de cambios de contrato que rompen la compatibilidad retroactiva.

## Evidencia de Preparación para Extracción

La evidencia que soporta la preparación de un módulo para extracción F3 se documenta y revisa.

- **Reporte de puntuación de extracción**: Puntuación actual de preparación para extracción con desglose por componentes.
- **Lista de verificación de independencia**: Evidencia para cada criterio de independencia (despliegue, datos, contrato, equipo, operaciones).
- **Evaluación de riesgos**: Riesgos identificados y mitigaciones para la extracción propuesta.
- **Resultados del piloto**: Si se realizó una extracción piloto, resultados y lecciones aprendidas.

## Evidencia de Rastreo

Los datos de rastreo distribuido proporcionan evidencia de la salud y rendimiento de la comunicación entre módulos.

- **Cobertura de rastreo**: Porcentaje de llamadas entre módulos capturadas en rastros; objetivo superior al 95%.
- **Percentiles de latencia**: P50, P95, P99 de latencia para cada ruta de llamada entre módulos.
- **Tasa de rastros con errores**: Porcentaje de rastros que contienen errores; monitoreado para anomalías.
- **Exactitud del mapa de servicio**: Los datos de rastreo validan que el grafo de dependencias real coincide con la topología declarada.

---

[Volver al Perfil de Módulos Distribuidos](./README.es.md)
