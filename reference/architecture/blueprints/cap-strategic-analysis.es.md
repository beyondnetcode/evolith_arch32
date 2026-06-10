# Análisis Estratégico del Teorema CAP y Perfil de Riesgo

Este artefacto presenta un análisis riguroso, matemático y teórico de nuestra Arquitectura Monolítica Progresiva a través de la lente del **Teorema CAP** (Consistencia, Disponibilidad, Tolerancia a la Partición).

> Alcance: las decisiones CAP en este documento son ejemplos de trade-off arquitectónico. Los nombres de tecnologías concretas ilustran el perfil de referencia/demo y pueden variar por runtime o ADR de producto.

---

## 1. Análisis del Continuo CAP

El Teorema CAP dicta que un sistema distribuido solo puede proporcionar simultáneamente dos de tres garantías:
* **Consistencia (C)**: Cada lectura recibe la escritura más reciente o un error.
* **Disponibilidad (A)**: Cada petición recibe una respuesta que no es un error, sin la garantía de que contenga la escritura más reciente.
* **Tolerancia a la Partición (P)**: El sistema continúa operando a pesar de que un número arbitrario de mensajes sea caído o retrasado por la red entre los nodos.

### Elección Arquitectónica: Estrategia CAP Híbrida
Nuestra arquitectura no elige ciegamente un solo lado. En su lugar, segmenta el espacio del problema para emplear **CP** para la lógica core de misión crítica y **AP** para la entrega de canales/lectura a gran escala.

---

## 2. Segmentación por Niveles de Componentes

### Nivel 1: API Core y Persistencia (La Persona **CP**)
* **Enfoque**: Consistencia Absoluta y Tolerancia a Particiones sobre el 100% de Disponibilidad durante fallos profundos.
* **Perfil Tecnológico**: Runtime transaccional de API + motor SQL relacional con garantías ACID.
* **Comportamiento ante Partición**: Si el modelo relacional primario de escritura experimenta una partición de cerebro dividido (split-brain), las operaciones de escritura se detienen para prevenir la corrupción de datos en lugar de aceptar escrituras sucias.
* **Referencias ADR**:
 * [ADR-0010: Aislamiento Doble Capa](../adrs/core/0010-multi-tenancy-architecture-strategy.es.md)
 * [ADR-0019: Patrón de Unidad de Trabajo](../adrs/core/0019-tactical-design-patterns-future-proofing.es.md)
* **Pros**: Cero corrupción de saldos, inventario preciso, verdad completa de auditoría de seguridad.
* **Contras**: Altamente degradado durante la interrupción del clúster de base de datos.

### Nivel 2: Caché de Borde, CDN y Bus de Mensajes (La Persona **AP**)
* **Enfoque**: Alta Disponibilidad y Tolerancia a Particiones sobre la Consistencia inmediata.
* **Perfil Tecnológico**: Caché distribuida + bróker de mensajería durable + caché CDN/cliente.
* **Comportamiento ante Partición**: Si el Nodo A no puede hablar con el Nodo B, ambos continuarán sirviendo datos desde su caché o cola local, incluso si los datos están ligeramente desactualizados (Consistencia Eventual).
* **Referencias ADR**:
 * [ADR-0014: Caché Distribuida de 4 Niveles](../adrs/core/0014-distributed-caching-strategy-redis.es.md)
 * [ADR-0036: Control de Flujo del Bus de Mensajes](../adrs/core/0036-message-bus-delivery-strategy-fifo-dlq.es.md)
 * [ADR-0004: Resiliencia Offline del Frontend](../adrs/nodejs/0004-frontend-offline-resilience.es.md)
* **Pros**: Latencia extremadamente baja, operacional durante la degradación parcial de la red.
* **Contras**: La mecánica "Stale-While-Revalidate" requiere que los desarrolladores diseñen UIs que manejen la llegada eventual de datos.

---

## 3. Modelo de Gestión de Riesgos

| Divergencia del Eje CAP | Escenario de Riesgo Real | Defensa y Mitigación Arquitectónica |
| :--- | :--- | :--- |
| **Consistencia vs Disponibilidad** | La caché distribuida retiene una versión antigua de los permisos de un inquilino tras un cambio de rol dinámico. | **Mitigación**: Políticas de desalojo cache-aside en escritura + compilación de autorización híbrida imponiendo búsqueda inmediata de gráfico en BD para alcances de alta seguridad ([ADR-0021](../adrs/nodejs/0021-high-performance-auth-and-graph-compilation.es.md)). |
| **Fallos de Particionado** | La red del bus de mensajes cae mientras se escriben las actualizaciones de la BD (fallo de escritura doble). | **Mitigación**: **Patrón Transactional Outbox ([ADR-0033](../adrs/core/0033-transactional-outbox-pattern.es.md))** guarda el evento en el almacén relacional (zona CP) y garantiza su publicación posterior al bróker, convirtiendo una crisis en un retraso gestionado. |
| **Sincronización de Estado** | Dos microservicios separados procesan eventos fuera de secuencia debido al lag de la red. | **Mitigación**: **Estándar de Consumidor Idempotente e imposición de FIFO ([ADR-0036](../adrs/core/0036-message-bus-delivery-strategy-fifo-dlq.es.md))** asegura que la convergencia eventual regrese exactamente al estado correcto. |

---

## 4. Resumen Estratégico de Pros y Contras

### Pros del Modelo Híbrido Actual
1. **Máximo Rendimiento**: El 95% del tráfico de alta lectura golpea el **nivel AP** (Caché/CDN), proporcionando respuestas en microsegundos.
2. **Núcleo Fortificado**: Las mutaciones críticas ocurren en el **nivel CP**, garantizando el cumplimiento de ACID y cero pérdida de datos financieros.
3. **Degradación Elegante**: Si la base de datos se desconecta, el nivel AP aún puede servir catálogos de solo lectura y encolar peticiones de usuario para su procesamiento posterior.

### Contras y Compromisos Aceptados
1. **Complejidad Mental**: Los ingenieros deben decidir constantemente si un flujo necesita consistencia fuerte o puede sobrevivir con datos "Eventualmente Consistentes".
2. **Retraso de Sincronización**: Existe una latencia no nula (milisegundos) entre el commit de la base de datos y la finalización global de la invalidación del caché.

---
**Estado de Evaluación**: Verificado consistente con Estándares Internacionales de Arquitectura Empresarial.

---
[Volver al Índice](./README.es.md)
