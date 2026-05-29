# [ADR 0035](0035-distributed-saga-pattern-strategy.md): Estrategia de Implementación del Patrón Distributed Saga

## Estado
Aprobado

## Fecha
2026-05-11

## Contexto
A medida que la plataforma evoluciona de un Monolito Modular hacia servicios distribuidos, las transacciones ACID distribuidas tradicionales **2PC (Two-Phase Commit)** se vuelven imposibles o degradan gravemente el rendimiento. Para garantizar la consistencia eventual de los datos a través de los límites de servicios desacoplados sin bloquear recursos, se requiere el **Patrón Saga**. Sin embargo, las Sagas introducen una sobrecarga de lógica de compensación que solo debe desplegarse cuando sea estrictamente necesario.

## Decisión
Adoptar la siguiente matriz corporativa para definir la estrategia de implementación para transacciones de larga duración o multi-servicio:

### 1. La Regla de Local Primero
Antes de desplegar una Saga, verifica si el proceso de negocio puede ser contenido dentro de un **único Contexto Delimitado**. Si es así, IMPONER el uso del **Patrón Unit of Work** ([ADR-0019](0019-tactical-design-patterns-future-proofing.md)) para ejecutar una transacción ACID estándar localmente. Esto se prefiere el 100% de las veces.

### 2. Paso de Evolución: La Condición de Aplicabilidad de la Saga
Mandar una implementación de Saga ÚNICAMENTE cuando:
1. La transacción deba abarcar **dos o más bases de datos de microservicios separadas** (Particionadas físicamente según [ADR-0031](0031-schema-per-context-domain-event-catalog.md)).
2. No se requiera consistencia inmediata, pero la **Consistencia Eventual Garantizada** sea obligatoria.
3. Un fallo en el paso N requiera una **Acción de Rollback/Compensación** explícita en el paso N-1.

### 3. Gobernanza del Estilo de Implementación
* **Coreografía (Saga Dirigida por Eventos)**: Recomendación estándar para cadenas cortas (2 a 3 pasos). Los servicios escuchan el Bus de Eventos ([ADR-0015](0015-event-driven-architecture-intra-domain.md)) y reaccionan directamente a los eventos de finalización/fallo. Sin controlador central.
* **Orquestación (Saga Dirigida por Comandos)**: Recomendación obligatoria para flujos de trabajo complejos (> 3 pasos). Requiere un componente Orquestador de Saga dedicado que gestione la ejecución del flujo de trabajo centralizado y emita comandos de compensación explícitamente.

### 4. Mecánicas Obligatorias
Cualquier implementación de Saga DEBE implementar:
- **Consumidores Idempotentes**: Todos los pasos deben detectar e ignorar mensajes duplicados.
- **Transactional Outbox** ([ADR-0033](0033-transactional-outbox-pattern.md)): Para garantizar que el evento inicial de arranque nunca se pierda.

## Consecuencias

### Positivas
- Habilita operaciones distribuidas altamente resilientes a escala.
- Elimina el bloqueo de base de datos entre servicios y los riesgos de inanición (starvation).
- Proporciona un manejo estructurado para fallos de negocio parciales.

### Negativas
- Aumenta significativamente la complejidad debido a la lógica obligatoria de transacciones de "Deshacer" (Compensación).
- Depurar los flujos de trabajo entre servicios es más complejo, dependiendo en gran medida de la correlación unificada de trazas distribuidas ([ADR-0007](../nodejs/0007-observability-telemetry-loki-opentelemetry.md)).

## Referencias
- [Patrón de transacciones distribuidas Saga](https://learn.microsoft.com/es-es/azure/architecture/reference-architectures/saga/saga)
- [ADR-0033: Patrón Transactional Outbox](../../adrs/core/0033-transactional-outbox-pattern.md)

---
[Volver al Índice](./README.es.md)
