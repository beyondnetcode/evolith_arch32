# Guía de Evidencia Orientada a Eventos

> **Navegación Bilingüe:** [English](./evidence.md) | [Español](./evidence.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Orientada a Eventos

## Propósito

Definir comandos de validación, métricas y verificaciones de cumplimiento para evidenciar la salud de arquitecturas orientadas a eventos: throughput, retraso de consumidores, latencia de procesamiento, profundidad de DLQ y cumplimiento de contratos.

## Comandos de Validación

| Verificación | Comando |
|---|---|
| Salud del broker | `kafka-broker-api-versions.sh --bootstrap-server <host>:9092` |
| Estado del grupo de consumidores | `kafka-consumer-groups.sh --bootstrap-server <host>:9092 --group <group> --describe` |
| Listado de temas | `kafka-topics.sh --bootstrap-server <host>:9092 --list` |
| Verificación de registro de esquemas | `curl -s <schema-registry>/subjects` |
| Profundidad de DLQ | Consultar conteo de mensajes del tema DLQ vía API de métricas del broker |

## Throughput de Eventos — ED-R08

- Medir mensajes producidos y consumidos por segundo por tema.
- Mantener throughput sostenido dentro del 70% de la capacidad pico del broker.
- Alertar en caídas de throughput que excedan el 20% del promedio móvil de 7 días.

## Retraso de Consumidores — ED-R08

- Reportar retraso actual por grupo de consumidores por partición.
- Agregar retraso entre particiones para evaluación de salud a nivel de grupo.
- Rastrear tendencia del retraso: estable, creciente o decreciente en ventanas de 24 horas.

## Latencia de Procesamiento — ED-R08

- Medir latencia de extremo a extremo: marca de tiempo de producción del evento a marca de tiempo de consumo del evento.
- Mantener latencia P99 bajo 5 segundos para rutas en tiempo real; bajo 60 segundos para rutas por lotes.
- Alertar en picos de latencia que excedan 3x la línea base.

## Profundidad de DLQ — ED-R03

- Monitorear conteo de mensajes DLQ por tema por grupo de consumidores.
- Alertar cuando la profundidad de DLQ exceda 100 mensajes o crezca >10% por hora.
- Reportar antigüedad de DLQ: marca de tiempo del mensaje más antiguo por tema DLQ.

## Cumplimiento de Contratos — ED-R01, ED-R06

- Validar esquemas de productores contra la especificación AsyncAPI registrada.
- Ejecutar verificaciones de compatibilidad de esquemas: `kafka-schema-registry.sh check-compatibility`.
- Reportar deriva de esquemas: eventos publicados con esquemas no registrados o deprecados.

## Aplicabilidad Componible

| Componible | Orientación |
|---|---|
| Monolito Modular | Métricas recolectadas a nivel de proceso; validación ligera. |
| Módulos Distribuidos | Agregación de métricas entre módulos; paneles centralizados. |
| Microservicios | Métricas por servicio con plataforma de observabilidad centralizada. |
| Serverless | Métricas nativas del proveedor; exportar a monitoreo centralizado. |
| Computación Edge | Recolección local de métricas con carga periódica a la nube. |

## Referencias ADR

- **ADR-0015**: Estándares de monitoreo de throughput y retraso de eventos.
- **ADR-0079**: Requisitos de recolección de evidencia de observabilidad.

---

[Volver al Perfil Orientado a Eventos](./README.es.md)
