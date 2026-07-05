# Guía de Resiliencia de Módulos Distribuidos

> **Navegación Bilingüe:** [English](./resilience.md) | [Español](./resilience.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Módulos Distribuidos

## Descripción General

Esta guía define patrones de resiliencia para módulos distribuidos, cubriendo circuit breakers, aislamiento bulkhead, estrategias de reintento, degradación graceful y prevención de cascadas de timeout.

## Circuit Breakers (DM-R07)

Toda llamada entre módulos debe estar protegida por un circuit breaker. Cuando una dependencia downstream falla más allá de su umbral, el circuito se abre y las solicitudes fallan rápidamente en lugar de consumir recursos.

- **Condiciones de disparo**: Tasas de falla configurables y umbrales de llamadas lentas por dependencia.
- **Recuperación half-open**: Periódicamente permite solicitudes de prueba para verificar recuperación antes de cerrar completamente.
- **Exposición de métricas**: Las transiciones de estado del circuito se emiten como métricas para tableros y alertas.

## Aislamiento Bulkhead

Los pools de recursos están aislados por dependencia de módulo para evitar que una dependencia lenta o fallida agote recursos compartidos.

- **Pools de conexión**: Cada dependencia downstream tiene su propio pool de conexión, independiente de otros.
- **Aislamiento de hilos/tareas**: Los recursos de procesamiento del módulo están particionados para que una llamada bloqueada no prive de recursos a otras operaciones.
- **Límites de concurrencia**: Los límites de concurrencia por dependencia previenen la propagación de sobrecarga.

## Reintentos con Backoff

Las fallas transitorias se manejan con reintentos utilizando backoff exponencial y jitter. Los reintentos están acotados para prevenir carga amplificada.

- **Reintentos máximos**: Configurables por ruta de llamada; predeterminado acotado para prevenir bucles infinitos.
- **Estrategia de backoff**: Backoff exponencial con jitter para evitar el efecto de manada al recuperarse.
- **Presupuesto de reintentos**: Un presupuesto global de reintentos limita el volumen total de reintentos relativo al tráfico base.

## Degradación Graceful

Cuando las dependencias no están disponibles, los módulos degradan funcionalidad en lugar de fallar completamente.

- **Alternativa de funcionalidad**: Las funcionalidades no críticas degradan a comportamiento en caché o predeterminado.
- **Respuestas parciales**: Los módulos retornan resultados parciales cuando algunos datos downstream no están disponibles.
- **Feedback al usuario**: Los estados degradados se comunican a los consumidores de forma transparente.

## Cascadas de Timeout

Los timeouts se configuran en cada límite de llamada para prevenir fallas en cascada a través de cadenas de módulos.

- **Timeouts por salto**: Cada llamada entre módulos tiene un timeout explícito más corto que el timeout del llamador.
- **Propagación de deadline**: Los llamadores propagan el deadline restante downstream para evitar trabajo desperdiciado.
- **Presupuestos de timeout**: Los presupuestos de timeout agregados previenen que cadenas largas excedan la latencia aceptable.

---

[Volver al Perfil de Módulos Distribuidos](./README.es.md)
