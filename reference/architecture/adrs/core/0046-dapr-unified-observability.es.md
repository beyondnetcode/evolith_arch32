# [ADR 0046](0046-dapr-unified-observability.es.md): Adopción de Dapr y unificación de trazabilidad con el stack de observabilidad existente

## Estado
Aprobado

## Fecha
2026-05-12

## Contexto
Durante la **Fase 1 (pre-Dapr)** de la evolución arquitectónica, el ecosistema desarrolló un stack de observabilidad corporativo maduro. Este stack implementa logs estructurados (JSON), inyecta manualmente un identificador de correlación distribuida (`x-correlation-id`) en el punto de entrada (BFF/Gateway), y consolida los datos en Elastic/Grafana para su posterior diagnóstico y alerta.

En la **Fase 2 (actual)**, iniciamos la adopción sistémica de **Dapr** como sidecar de infraestructura para facilitar la transición evolutiva hacia microservicios y abstraer las capacidades transversales (State, PubSub, Secrets). 

Dapr introduce un comportamiento nativo y automático de telemetría basado en el estándar W3C TraceContext, inyectando el header `traceparent`. Esto genera un **problema de diseño detectado**: si la aplicación conserva el uso del `x-correlation-id` manual operando de forma paralela a la traza de Dapr, se fragmentará la trazabilidad en dos hilos disjuntos dentro de Elastic/Grafana (uno de infraestructura y otro de runtime), imposibilitando el diagnóstico unificado de extremo a extremo (E2E) y violando el principio corporativo de trazabilidad única.

## Decisión
Establecemos la unificación absoluta de la telemetría de infraestructura y runtime bajo las siguientes directrices de ingeniería:

1. **Adopción del Sidecar**: Consolidar a Dapr como el mecanismo primario de comunicación inter-servicio e integración de componentes de infraestructura, alineado con el [ADR-0006](../core/0006-future-microservices-transition-dapr.md).
2. **Unificación de Correlación (Pivot a W3C)**: La aplicación **cesará la generación de identificadores de correlación manuales**. En su lugar, extraerá dinámicamente el `trace-id` del header `traceparent` inyectado automáticamente por el sidecar de Dapr y lo establecerá como el valor primario en todos los metadatos de los logs estructurados de aplicación.
3. **Vinculación de Spans**: Los logs de aplicación DEBEN incluir también el `span-id` activo para permitir el anclaje directo entre una línea de log y un segmento específico del árbol de ejecución en el trazado distribuido.
4. **Instrumentación vía OpenTelemetry**: Se utilizará el SDK agnóstico de OpenTelemetry en el runtime para heredar y propagar la cabecera TraceContext a lo largo de toda la ejecución interna del dominio, garantizando la continuidad de la traza.
5. **Alineación en Ingesta**: Los agentes de transporte (Filebeat, Vector, APM Server) se reconfigurarán para mapear sus campos de indexación al identificador de campo estándar `trace_id` (reemplazando `x-correlation-id`), salvaguardando la compatibilidad retroactiva de los tableros de Grafana tras una refactorización de consultas menor.
6. **Prohibición de SDKs Propietarios**: Se prohíbe estrictamente importar SDKs clientes de Dapr o Elastic dentro del modelo de dominio core. Toda comunicación con el sidecar Dapr se canalizará estrictamente a través de llamadas HTTP/gRPC locales mediante puertos y adaptadores de infraestructura, asegurando la independencia del framework.

## Consecuencias

### Positivas
- **Trazabilidad Holística**: Garantiza que un flujo que viaja de un cliente al Gateway, cruza por el Sidecar Dapr y entra a la lógica del servicio, se visualice como una sola línea de tiempo ininterrumpida.
- **Depuración Acelerada**: Los dashboards integrados ahora pueden correlacionar latencias de infraestructura (inyectadas por Dapr) con errores de lógica de negocio (extraídos de los logs de la app) bajo un mismo ID de filtrado.
- **Mantenibilidad del Código**: Preserva la infraestructura de logging estructurado actual, modificando únicamente el Middleware/Interceptor encargado de la extracción de identidad en el perímetro.

### Negativas
- **Actualización de Tableros**: Exige un ciclo de refactorización de los Dashboards de Grafana actuales y las búsquedas guardadas en Elastic para apuntar al nuevo esquema de metadatos (`trace_id`).
- **Curva de Aprendizaje**: Requiere la capacitación técnica del equipo de desarrollo sobre la mecánica y estructura del estándar W3C TraceContext.

## Referencias
- [ADR-0006: Transición Futura a Microservicios con Dapr](../core/0006-future-microservices-transition-dapr.md)
- [ADR-0007: Telemetría de Observabilidad OTel](../../adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.md)
- [Engineering Manifesto - Aislamiento de Infraestructura](../../../governance/standards/engineering/engineering-manifesto.md)
- [Authoritative Tech Stack - Frameworks Aprobados](../../blueprints/authoritative-tech-stack.md)





## Objetivo y Alcance

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Evidencias y Criterios de Evaluación

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Decisiones y Estándares Relacionados

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

---
[Volver al Índice](./README.es.md)
