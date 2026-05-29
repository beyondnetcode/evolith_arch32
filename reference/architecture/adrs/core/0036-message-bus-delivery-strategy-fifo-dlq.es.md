# [ADR 0036](0036-message-bus-delivery-strategy-fifo-dlq.md): Estrategia de Entrega y Control de Flujo del Bus de Mensajes

## Estado
Aprobado

## Fecha
2026-05-11

## Contexto
Las arquitecturas asíncronas dirigidas por eventos requieren diversas garantías de comunicación dependiendo de la criticidad y naturaleza de la carga útil. Aplicar ciegamente el orden estricto (FIFO) en todas partes degrada el rendimiento masivamente, mientras que aplicar el estándar "fuego y olvido" sin respaldo conduce a la pérdida de datos en flujos financieros críticos. Requerimos reglas canónicas que especifiquen qué modo de entrega de mensajería DEBE aplicarse por tipo de transacción.

## Decisión
Adoptar el siguiente **Marco de Decisión de Entrega de Eventos** mapeando el contexto de negocio a los comportamientos de la cola de infraestructura:

### 1. Modo: "Fuego y Olvido" (Standard Fan-out / Topic)
* **Definición**: Procesamiento asíncrono sin garantía de orden, máximo paralelismo horizontal de consumidores.
* **Puntos de inflexión / Cuándo Usar**:
 * Métricas, rastreo y logs de alto volumen.
 * Efectos secundarios secundarios que no impactan el flujo de negocio core inmediato (ej. envío de notificaciones por email, invalidación de caché cálido).
 * Sincronización de datos donde los mensajes más nuevos contienen nativamente sobrescrituras totales del estado.
* **Compromiso**: Máximo rendimiento. Potencial ejecución fuera de orden.

### 2. Modo: "Orden FIFO Estricto" (Secuencia Garantizada)
* **Definición**: Procesamiento estrictamente en el orden recibido, vinculado a una clave de partición (ej. `AggregateId`).
* **Puntos de inflexión / Cuándo Usar**:
 * **Contabilidad Transaccional**: Secuencias de entrada del libro mayor (el débito debe completarse antes de la lógica de comprobación de balance).
 * **Bloqueo de Inventario**: Operaciones consecutivas de decremento/incremento de stock.
 * **Transiciones de Máquina de Estados**: Flujos de trabajo de negocio secuenciales de múltiples pasos donde el Paso 3 colapsa si el Paso 2 no se ha confirmado.
* **Barandilla de Implementación**: Las colas FIFO restringen la concurrencia a un único consumidor por fragmento/partición. Utilizado quirúrgicamente solo donde la corrupción de datos ocurriría sin ello.

### 3. Política Global: "Dead Letter Queues (DLQ)" y Defensa contra la Píldora Venenosa
* **Política**: OBLIGATORIA para cada cola del dominio de negocio.
* **Puntos de inflexión / Configuración**:
 * Todos los errores del consumidor disparan un **Mecanismo de Reintento** local con backoff exponencial (Máximo 3 Intentos).
 * Tras el 4 fallo consecutivo (Píldora Venenosa), el mensaje DEBE ser re-enrutado automáticamente a un contenedor de retención `.{nombre_de_cola}.dlq`.
 * Previene que un solo JSON corrupto / punto de lógica con bugs bloquee infinitamente toda la pipeline principal.
* **Acción Requerida**: Establecer alertas automatizadas cuando el tamaño de la DLQ > 0. El personal de soporte debe inspeccionar y re-lanzar (Re-Drive / Retry) o Archivar los paquetes corruptos.

### 4. Modo: "Entrega Retrasada / Programada"
* **Definición**: Mensajes empujados al bróker con una Cabecera de retraso obligatoria, haciéndolos invisibles para los consumidores hasta el momento designado.
* **Puntos de inflexión**:
 * **Timeouts de Negocio**: "Si el Pedido no se paga en 30 minutos, disparar la comprobación de cancelación".
 * **Recordatorios Estrangulados**: Empujar un email de notificación destinado para mañana a las 8:00 AM sin usar cronjobs del sistema.
* **Mecanismo**: Depende de plugins de exchanges retrasados nativos del Bróker o bucles de enrutamiento TTL + DLX.

### 5. Escalonamiento de Rendimiento: "Colas de Prioridad"
* **Definición**: Ponderación numérica de los mensajes que permite a los paquetes de alta prioridad saltarse los paquetes no críticos que esperan en la cola.
* **Puntos de inflexión**:
 * **SLAs de Nivel de Cliente**: Acelerar las peticiones de usuarios VIP durante ráfagas de alto volumen de tráfico.
 * **Señales de Emergencia**: Revocaciones administrativas críticas que se saltan el flujo estándar de telemetría de auditoría.
* **Regla**: No sobre-utilizar (máx. 3-5 niveles), ya que puede ocurrir una inanición infinita de bajo nivel.

### 6. Regla de Arquitectura: "Mandato de Consumidor Idempotente"
* **Regla**: TODA consumición de mensajes DEBE asumir una semántica de "Entrega Al Menos Una Vez".
* **Requisito**: La aplicación Consumidora debe registrar las claves `MessageId` procesadas (en Redis o BD) y comprobar su existencia ANTES de proceder con la lógica interna. Si el `MessageId` ya fue procesado, DEBE ser instantáneamente confirmado (ACK) y descartado como un duplicado SIN efectos secundarios.

## Consecuencias

### Positivas
- Elimina el cuello de botella común del bloqueo excesivo de colas globales.
- Garantiza cero pérdida de datos para eventos críticos a través de la cuarentena DLQ garantizada.
- Protege el rendimiento del sistema manteniendo la consistencia estricta exactamente donde se necesita.

### Negativas
- Los equipos deben clasificar intencionalmente cada nuevo tipo de evento durante la revisión del diseño.
- FIFO requiere atención al diseño de la clave de partición dentro de los adaptadores Productores.

## Referencias
- [RabbitMQ Dead Letter Exchanges](https://www.rabbitmq.com/dlx.html)
- [ADR-0015: Mecanismo de Bus de Eventos Inyectable](./0015-event-driven-architecture-intra-domain.md)
- [ADR-0033: Patrón Transactional Outbox](../../adrs/core/0033-transactional-outbox-pattern.md)

---
[Volver al Índice](./README.es.md)
