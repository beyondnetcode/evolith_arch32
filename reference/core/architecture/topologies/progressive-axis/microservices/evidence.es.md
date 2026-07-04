# Guía de Evidencia de Microservicios

> **Navegación Bilingüe:** [English](./evidence.md) | [Español](./evidence.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Microservicios

## Métricas DORA

Rastree las cuatro métricas DORA por servicio: Frecuencia de Despliegue, Tiempo de Generación para Cambios, Tiempo para Restaurar Servicio y Tasa de Fallo de Cambios. Publique paneles por equipo. Los equipos de alto rendimiento logran despliegues diarios con < 15% de tasa de fallo de cambios.

## Cumplimiento de SLO

Monitoree el cumplimiento de **MS-R07** (SLOs) para cada servicio. Rastree las tasas de consumo del presupuesto de errores. Genere informes de cumplimiento mensuales. Escale cuando cualquier servicio agote su presupuesto de errores durante dos períodos consecutivos.

## Resultados de Pruebas de Contrato

Recopile los resultados de **MS-R05** (Pruebas de Contrato/Pact) en CI. Rastree las tasas de éxito/fallo en todos los pares consumidor-proveedor. Falle la compilación en cualquier violación de contrato. Mantenga una matriz de compatibilidad de contratos visible para todos los equipos.

## Resultados de Experimentos de Caos

Registre cada experimento de caos con hipótesis, acción y resultado. Categorice los resultados: aprobado, parcialmente aprobado o fallido. Alimente las fallas en el backlog de resiliencia del servicio. Publique resúmenes trimestrales de experimentos de caos.

## Catálogo de Servicios

Mantenga un catálogo de servicios en vivo con: propietario, dominio, versiones de API, objetivos de SLO, dependencias y estado de despliegue. El catálogo es la única fuente de verdad para los metadatos de servicios. Poblar automáticamente desde manifiestos de servicio cuando sea posible.

## Atribución de Costos

Atribute los costos de infraestructura a los servicios usando etiquetas de recursos. Rastree el costo por servicio por mes. Identifique valores atípicos para optimización. Incluya tendencias de costos en revisiones arquitectónicas trimestrales.

## Cobertura de Observabilidad

Mida la cobertura de observabilidad: porcentaje de servicios con rastreo distribuido, registro estructurado y sondas de salud. Apunte a 100% de cobertura. Señale servicios por debajo del umbral para remediación.

## Referencias

| Regla | Descripción |
|-------|-------------|
| **MS-R05** | Pruebas de Contrato / Pact |
| **MS-R07** | SLOs |

---
[Volver al Perfil de Microservicios](./README.es.md)
