# [ADR 0037](0037-performance-concurrency-chaos-strategy.md): Estrategia Empresarial de Verificación de Rendimiento, Concurrencia y Caos

## Estado
Aprobado

## Fecha
2026-05-11

## Contexto
Las pruebas funcionales estándar (Unit/E2E) verifican que el código se comporta correctamente bajo condiciones ideales y de un solo usuario. Fallan completamente al predecir el comportamiento del sistema bajo concurrencia extrema, alta latencia de red o condiciones de fallo parcial. Para garantizar la escalabilidad futura y la seguridad absoluta en producción, requerimos un marco de verificación obligatorio definido conjuntamente por Arquitectura, QA y gestión de Producto.

## Decisión
Establecer el **Marco de Verificación Estratégica** para rendimiento, carga y resiliencia operativa:

### 1. Arsenal de Herramientas
* **Pruebas de Carga y Rendimiento**: **k6** (Grafana). Obligatorio debido a sus scripts nativos en TypeScript, baja huella y profunda integración con métricas de rastreo OTel.
* **Pruebas de Contrato**: **Pact JS**. Usado para verificar cargas útiles de gRPC y Eventos entre productores/consumidores antes del despliegue.
* **Caos Operativo**: **Chaos Mesh / Litmus**. Terminar pods periódicamente o inducir retrasos de red en entornos de staging.

### 2. Escenarios de Estrés Hipotéticos (Verificación Obligatoria)
Producto y Arquitectura requieren pruebas contra los siguientes flujos extremos hipotéticos:

#### Escenario A: "La Carrera de Hiper-Contienda"
* **Concepto**: 5,000 Usuarios Virtuales intentan comprar exactamente las últimas 5 unidades disponibles de un artículo de inventario simultáneamente (ventana de 100ms).
* **Meta de Verificación**: La BD previene la sobreventa a través de Bloqueo de Filas / Unit of Work, y el Circuit Breaker se dispara grácilmente si la contienda de bloqueos detiene los hilos locales. Cero inventario negativo.
* **Métrica**: Tasa de éxito respuesta < 500ms @ percentil 95.

#### Escenario B: "El Gateway Envenenado (Inyección de Latencia)"
* **Concepto**: Utilizando Chaos Mesh, inyectar 5 segundos de retraso artificial en todas las respuestas del endpoint externo de la API de Banca/Aduanas.
* **Meta de Verificación**: Confirmar que los Circuit Breakers Distribuidos ([ADR-0011](0011-fault-tolerance-resiliency-patterns.md)) se disparan globalmente en 3 segundos, recurriendo al estado cacheado o mensajes amigables para el usuario sin propagar fallos en cascada a servicios de la app no relacionados.

#### Escenario C: "El Apagón Logístico"
* **Concepto**: Desconectar el contenedor de RabbitMQ por completo mientras se empujan 1,000 transacciones por segundo a la BD.
* **Meta de Verificación**: La **Outbox Transaccional ([ADR-0033](0033-transactional-outbox-pattern.md))** registra todos los eventos en PostgreSQL. Una vez reconectado, verificar una reproducción de consumición con 100% cero pérdida y sin ejecución de lógica duplicada.

### 3. Puertas de Verificación Obligatorias
- **Instantáneas de Línea Base**: Pruebas de carga semanales con K6 contra el entorno de staging para detectar regresiones de latencia > 10% comparado con la semana anterior.
- **Pruebas de Contrato en CI**: Cualquier modificación de `.proto` de gRPC dispara la verificación PACT aguas abajo automáticamente. El fallo detiene la construcción.

## Consecuencias

### Positivas
- Demuestra matemáticamente que el sistema puede escalar antes de que llegue el tráfico real.
- Establece puntos de referencia (benchmarks) empíricos inmutables para los SLAs del sistema.
- Protege la experiencia del usuario contra condiciones de carrera ocultas y deadlocks.

### Negativas
- El scripting de rendimiento requiere conjuntos de habilidades especializadas de QA.
- Requiere entornos de Staging aislados y persistentes configurados para imitar tamaños de infraestructura de producción 1:1 para obtener datos de referencia confiables.

## Referencias
- [Documentación de Grafana k6](https://k6.io/docs/)
- [Pact.io - Contratos Dirigidos por el Consumidor](https://docs.pact.io/)
- [ADR-0011: Circuit Breakers Distribuidos](../../adrs/core/0011-fault-tolerance-resiliency-patterns.md)
- [ADR-0033: Outbox Transaccional](../../adrs/core/0033-transactional-outbox-pattern.md)

---
[Volver al Índice](./README.es.md)
