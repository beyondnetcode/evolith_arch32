# ADR-0046: Trazabilidad Unificada vía W3C TraceContext

## Estado
Accepted

## Fecha
2026-05-12

## Contexto y Problema
Originalmente, el ecosistema dependía de identificadores de correlación distribuida inyectados manualmente (`x-correlation-id`) en los puntos de entrada (BFF/Gateway) para agregar telemetría en tableros de Elastic/Grafana. A medida que la arquitectura evolucionó para incorporar sidecars y mallas de servicios complejas, estas cabeceras manuales causaron flujos de telemetría fracturados. Los sidecars emiten automáticamente telemetría siguiendo el estándar W3C TraceContext (`traceparent`). Mantener el identificador manual en paralelo al contexto de traza inyectado por el sidecar fractura la visibilidad de extremo a extremo (E2E) y viola directamente la directiva corporativa de trazabilidad unificada.

## Objetivo y Alcance
Imponer la unificación absoluta de la telemetría de infraestructura y aplicación para mantener una línea de tiempo cronológica ininterrumpida de los flujos de trabajo a través de gateways, sidecars y lógica de dominio.

## Opciones Consideradas
- **Seleccionada:** Trazabilidad Unificada vía W3C TraceContext
- **Otras:** Mantener IDs de correlación paralelos (rechazada debido a la telemetría fracturada y la imposibilidad de trazado E2E).

## Decisión y Justificación
Establecemos la unificación absoluta de la telemetría de infraestructura y aplicación bajo las siguientes directrices de ingeniería:

1. **Unificación de Correlación (Pivot a W3C)**: La aplicación **cesará la generación de identificadores de correlación manuales**. En su lugar, extraerá dinámicamente el `trace-id` del header `traceparent` inyectado automáticamente por los sidecars de infraestructura, estableciéndolo como el valor primario en todos los metadatos de los logs estructurados.
2. **Vinculación de Spans**: Los logs de aplicación DEBEN incluir también el `span-id` activo para permitir el anclaje directo entre una línea de log y un segmento específico del árbol de ejecución en el trazado distribuido.
3. **Instrumentación OpenTelemetry**: Se utilizará el SDK agnóstico de OpenTelemetry en tiempo de ejecución para heredar y propagar la cabecera TraceContext a lo largo de toda la ejecución interna del dominio.
4. **Alineación en Ingesta**: Los agentes de transporte (Filebeat, Vector, APM Server) deben reconfigurarse para mapear sus campos de indexación al identificador de campo estándar `trace_id` (reemplazando `x-correlation-id`).

## Evidencias y Criterios de Evaluación
Evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad. El trazado unificado es el estándar de la industria (W3C) y garantiza cero puntos ciegos en topologías de microservicios distribuidos.

## Consecuencias, Riesgos y Trade-offs

### Positivas
- **Trazabilidad Holística**: Garantiza que los flujos de trabajo que navegan desde las peticiones de los clientes, cruzan por los gateways de borde, a través de los sidecars y entran a la lógica de servicio, se presenten en una línea de tiempo cronológica única e ininterrumpida.
- **Depuración Acelerada**: Los tableros consolidados ahora agregan inherentemente los cuellos de botella granulares de latencia de infraestructura y los errores de lógica de negocio bajo un criterio de filtrado unificado.

### Negativas
- **Refactorización de Tableros**: Exige un ciclo de corrección para migrar tableros heredados y consultas guardadas para rastrear contra el esquema de metadatos revisado (`trace_id`).
- **Curva de Aprendizaje**: Requiere la capacitación técnica del equipo de entrega sobre la mecánica y topología del estándar W3C TraceContext.

## Referencias
- [Especificación W3C Trace Context](https://www.w3.org/TR/trace-context/)

## Decisiones y Estándares Relacionados
- [ADR-0006: Transición a Microservicios con Patrón Sidecar](./0006-microservices-transition-sidecar-pattern.es.md)
- [Node.js ADR-0007: Telemetría de Observabilidad OTel](../nodejs/0007-observability-telemetry-loki-opentelemetry.es.md)

---
[Volver al Índice](./README.es.md)

> **Agent Signature:** Architect Agent
