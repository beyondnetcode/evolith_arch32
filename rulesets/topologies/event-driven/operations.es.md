# Guía de Operaciones Orientada a Eventos

> **Navegación Bilingüe:** [English](./operations.md) | [Español](./operations.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Orientada a Eventos

## Propósito

Definir procedimientos operativos para la gestión de brokers de eventos, el monitoreo de retraso de consumidores, el manejo de colas de letras muertas (DLQ), la observabilidad del flujo de eventos y la gestión de particiones en arquitecturas orientadas a eventos.

## Gestión del Broker

### Monitoreo de Salud

- Rastrear tiempo de actividad del broker, conteo de conexiones y throughput por tema.
- Configurar verificaciones de salud en probes de disponibilidad y vitalidad del broker.
- Alertar cuando el uso de memoria del broker exceda el 80% de la capacidad asignada.

### Planificación de Capacidad

- Monitorear el conteo de particiones del tema contra el paralelismo del consumidor.
- Escalar nodos del broker cuando el throughput sostenido exceda el 70% de la capacidad pico.
- Revisar configuraciones de retención trimestralmente para alinear con presupuestos de almacenamiento.

## Monitoreo de Retraso de Consumidores

- Exponer métricas de retraso del consumidor mediante herramientas nativas del broker (por ejemplo, Consumer Groups de Kafka).
- Configurar umbrales de alerta: advertencia a 10,000 mensajes, crítico a 100,000 mensajes de retraso.
- Rastrear tendencias de retraso semanalmente; investigar crecimiento persistente del retraso.

## Manejo de Cola de Letras Muertas (DLQ) — ED-R03

- Enviar mensajes no procesables a DLQ después del agotamiento configurable de reintentos (predeterminado: 3 intentos).
- Monitorear la profundidad de DLQ diariamente; mensajes mayores a 72 horas requieren triaje manual.
- Implementar herramientas de reproducción de DLQ con protecciones de idempotencia antes de reprocesar.

## Observabilidad del Flujo de Eventos — ED-R08

- Instrumentar productores y consumidores con tracing distribuido (OpenTelemetry).
- Capturar metadatos del evento: tema, partición, offset, timestamp, ID del productor.
- Mantener paneles de control del flujo de eventos mostrando tasas de producción/consumo, tasas de error y latencia de extremo a extremo.

## Gestión de Particiones — ED-R04

- Diseñar claves de partición para garantizar ordenamiento donde sea necesario.
- Evitar particiones calientes distribuyendo claves en dominios de alta cardinalidad.
- Monitorear throughput por partición; rebalancear cuando la varianza exceda 3x entre particiones.

## Aplicabilidad Componible

| Componible | Orientación |
|---|---|
| Monolito Modular | Broker embebido; la gestión de particiones es intra-proceso. |
| Módulos Distribuidos | Cluster de broker compartido; se requiere monitoreo de retraso de consumidores entre módulos. |
| Microservicios | Infraestructura completa de broker; aislamiento de grupo de consumidores por servicio. |
| Serverless | Servicios de broker gestionados; el escalado de particiones lo maneja el proveedor. |
| Computación Edge | Instancias de broker locales con sincronización periódica a la nube. |

## Referencias ADR

- **ADR-0015**: Infraestructura de broker de eventos y estrategia de particionamiento.
- **ADR-0079**: Estándares de observabilidad y monitoreo de eventos.

---

[Volver al Perfil Orientado a Eventos](./README.es.md)
