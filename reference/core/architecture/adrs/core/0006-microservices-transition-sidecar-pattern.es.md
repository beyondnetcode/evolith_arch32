# ADR-0006: Transición a Microservicios con Patrón Sidecar

## Estado
Aprobado - Backlog (Hito de Fase 3)

## Fecha
2026-05-08

## Contexto y Problema
El sistema es actualmente un Monolito Modular (un solo proceso, contextos delimitados lógicamente aislados). A medida que los requisitos de negocio escalen --mayor tráfico, ciclos de despliegue independientes o integración de servicios políglotas-- se requiere un camino claro y seguro hacia los microservicios. La transición no debe requerir la reescritura de ninguna lógica de dominio.

## Objetivo y Alcance
Establecer el patrón arquitectónico estándar para gestionar las preocupaciones de infraestructura distribuida (estado, pub/sub, secretos) cuando se extraen servicios del monolito, abstrayéndolas del código de la aplicación.

## Opciones Consideradas
- **Seleccionada:** Patrón Sidecar para la Transición a Microservicios
- **Otras:** 
  - SDKs Pesados / Librerías Compartidas (rechazadas debido al acoplamiento de lenguaje y fricción de despliegue).
  - Service Mesh puro (rechazado ya que no abstrae recursos a nivel de aplicación como Estado o Pub/Sub).

## Decisión y Justificación
Adoptar el **Patrón Sidecar** como el runtime distribuido estándar de aplicación cuando se divida el monolito en servicios independientes.

**Hitos de migración:**
| Hito | Descripción |
| :--- | :--- |
| **M1 - Monolito Modular** | Estado actual. Proceso único con módulos de contexto delimitado aislados. |
| **M2 - Extracción de Servicios** | Contextos de alto tráfico o desplegables independientemente extraídos como microproyectos aislados. Se activa bajo las reglas en [ADR-0045](../core/0045-microservice-extraction-readiness-criteria.es.md). |
| **M3 - Malla Completa (Full Mesh)** | Estado avanzado del ecosistema donde la interacción a nivel de infraestructura utiliza la abstracción de Sidecar. |

### Puerta de Activación del Sidecar
Para prevenir el over-engineering prematuro, los Sidecars **NO** están activos por defecto en el Hito 2. La organización operará inicialmente mediante despliegues Kubernetes puros utilizando comunicación gRPC explícita entre servicios. La activación del Sidecar está condicionada a:
- El conjunto total de servicios extraídos supera los cinco (5).
- O BIEN: Se exige reintento automático / circuit breaking transparente avanzado que exceda la capacidad del cliente estándar.
- O BIEN: Integración políglota que requiere abstracción Pub/Sub uniforme (cargas Go/Python).

### Mecánica del Patrón Strangler Fig vía Gateway
La evolución utiliza el **Patrón Strangler Fig** aprovechando el API Gateway de borde existente para gobernar el desvío gradual de tráfico desde endpoints legados hacia micro-unidades extraídas sin modificar el monolito.

**Restricción clave:** El Core de dominio debe cambiar **cero líneas** cuando se introduzca el sidecar. Todas las llamadas de infraestructura se envuelven detrás de las abstracciones existentes `IEventBusPort` e `ICachePort` ([ADR-0015](0015-event-driven-architecture-intra-domain.es.md), [ADR-0014](0014-multi-layer-distributed-caching-strategy.es.md)). *(Ejemplo de implementación: Dapr)*.

## Evidencias y Criterios de Evaluación
Evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad. Abstraer la infraestructura a través de un Sidecar (como Dapr) permite cambiar los componentes subyacentes (Redis a Kafka) sin redesplegar la aplicación.

## Consecuencias, Riesgos y Trade-offs

### Positivas
- Arquitectura políglota: otros servicios pueden escribirse en Go o Python mientras comparten las capacidades de infraestructura.
- El intercambio de infraestructura solo requiere un cambio de YAML en el componente sidecar.
- Políticas nativas de reintento, circuit breakers y trazado distribuido integrados en el sidecar.

### Negativas
- Añade orquestación de contenedores como un prerrequisito para la fase de malla completa.
- El desarrollo local añade una sobrecarga de proceso sidecar por servicio.

## Addenda: Integración de Observabilidad (Sidecar + App)
Con la introducción de sidecars en fases avanzadas, se formalizan los siguientes mandatos de observabilidad para evitar duplicidad de hilos de correlación:
1. **Cero SDKs en Core**: La instrumentación de infraestructura en la lógica de dominio debe invocarse EXCLUSIVAMENTE a través del sidecar HTTP/gRPC, nunca importando el SDK nativo en capas de dominio.
2. **Unificación TraceContext**: El identificador de correlación manual pre-sidecar (`x-correlation-id`) debe converger con el estándar W3C TraceContext (`traceparent`) inyectado automáticamente por el sidecar, gobernado por el **[ADR-0046](0046-unified-observability-tracecontext.es.md)**.
3. **Exportación Centralizada**: Ambas fuentes de telemetría (Sidecar + App) deben utilizar el recolector OpenTelemetry unificado para garantizar vistas de traza de extremo a extremo coherentes.

## Referencias
- Ninguna

## Decisiones y Estándares Relacionados
- [ADR-0015: Arquitectura Dirigida por Eventos](../../adrs/core/0015-event-driven-architecture-intra-domain.es.md)
- [ADR-0031: Esquema por Contexto y Catálogo de Eventos de Dominio](../../adrs/core/0031-schema-per-context-domain-event-catalog.es.md)
- [ADR-0046: Observabilidad Unificada](./0046-unified-observability-tracecontext.es.md)

---
[Volver al Índice](./README.es.md)

> **Agent Signature:** Architect Agent
