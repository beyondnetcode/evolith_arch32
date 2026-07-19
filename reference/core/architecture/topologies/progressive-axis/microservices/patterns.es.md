# Guía de Patrones de Microservicios

> **Navegación Bilingüe:** [English](./patterns.md) | [Español](./patterns.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Microservicios

## Orquestación de Saga

Utilice el patrón Saga para transacciones distribuidas que abarcan múltiples servicios. Según **ADR-0035**, aplique la Regla Local First antes de recurrir a una Saga: si el proceso cabe en un solo contexto delimitado, use una transacción ACID local. Cuando la Saga está justificada, el estilo lo fija el número de pasos — coreografía para cadenas cortas (**2 a 3 pasos**), orquestación con un Saga Orchestrator dedicado para flujos complejos (**más de 3 pasos**). Cada paso del saga debe ser compensable. Defina acciones de reversión para cada acción hacia adelante.

## CQRS (Separación de Responsabilidades de Comando y Consulta)

**Puerta de aplicabilidad — ADR-0034 (Accepted).** CQRS no es el valor por defecto de un servicio. El CRUD básico y los cambios de estado simples permanecen en la ruta de modelo único (Tier 1); las necesidades de conformado de vistas se resuelven en Tier 2 con proyecciones de solo lectura a nivel BFF mientras los comandos siguen dirigidos al repositorio central. El CQRS completo (Tier 3) se exige solo cuando se cumplen **al menos dos** de estas condiciones: ratio de lecturas a escrituras superior a **100:1**; lecturas analíticas pesadas que compiten con las transacciones y requieren una proyección en réplica de lectura; múltiples proyecciones de vista distintas no derivables del agregado sin cómputo pesado; o lógica de auditoría que requiere almacenar el flujo de historia.

Una vez que aplica Tier 3, separe los modelos de lectura y escritura, publique proyecciones del modelo de lectura a partir de eventos del lado de escritura y acepte consistencia eventual en los modelos de lectura.

## Event Sourcing

Almacene el estado como una secuencia inmutable de eventos en lugar de filas mutables. El event sourcing proporciona un registro de auditoría completo y permite consultas temporales. Combine con CQRS para la materialización práctica del lado de lectura. Utilice registros de esquemas de eventos para gestionar la evolución.

## Puerta de Enlace de API

Despliegue una puerta de enlace de API como el punto de entrada único para consumidores externos. La puerta maneja enrutamiento, autenticación, límites de velocidad y traducción de protocolos. Evite el antipatrón de puerta de enlace上帝 — mantenga la lógica de la puerta delgada y agnóstica de dominio.

## Descubrimiento de Servicios

Utilice un registro de servicios (Consul, DNS de Kubernetes o Eureka) para la ubicación dinámica de servicios. Verifique la salud de las instancias registradas y elimine automáticamente los endpoints no saludables. Prefiera descubrimiento del lado del cliente para rutas sensibles a latencia y del lado del servidor para simplicidad.

## Base de Datos por Servicio

Aplique **MS-R06** (Sin Persistencia Compartida) — cada servicio posee su base de datos. Ningún servicio puede leer o escribir directamente en la base de datos de otro servicio. El acceso a datos entre servicios se realiza a través de APIs publicadas o eventos. Utilice principios de data mesh (**ADR-0084**) para la propiedad de datos descentralizada y orientada a dominio. La agrupación de servicios en sí está gobernada aparte por **ADR-0076** (DOMA), que no trata la propiedad de datos.

## Pruebas de Contrato

Aplique **MS-R05** (Pruebas de Contrato/Pact) para validar la compatibilidad de API entre consumidores y proveedores. Ejecute pruebas de contrato en CI para cada cambio. Rechace despliegues que rompan contratos publicados. Utilice Pact u otros frameworks de contratos dirigidos por el consumidor.

## Referencias

| Regla | Descripción |
|-------|-------------|
| **MS-R05** | Pruebas de Contrato / Pact |
| **MS-R06** | Sin Persistencia Compartida |
| **ADR-0034** | Matriz de Aplicación del Patrón CQRS (puerta de aplicabilidad) |
| **ADR-0035** | Estrategia de Implementación del Patrón Saga Distribuido (umbral coreografía/orquestación) |
| **ADR-0076** | Arquitectura de Microservicios Orientada a Dominio (DOMA) — agrupación de servicios |
| **ADR-0084** | Data Mesh y Datos como Producto — propiedad de datos orientada a dominio |

---
[Volver al Perfil de Microservicios](./README.es.md)
