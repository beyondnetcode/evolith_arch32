# Guía de Patrones de Microservicios

> **Navegación Bilingüe:** [English](./patterns.md) | [Español](./patterns.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Microservicios

## Orquestación de Saga

Utilice el patrón Saga para transacciones distribuidas que abarcan múltiples servicios. Elija orquestación (coordinador central) sobre coreografía cuando el proceso de negocio tiene lógica de decisión compleja. Cada paso del saga debe ser compensable. Defina acciones de reversión para cada acción hacia adelante.

## CQRS (Separación de Responsabilidades de Comando y Consulta)

Separe los modelos de lectura y escritura cuando las cargas de trabajo de lectura y escritura tengan requisitos diferentes de escala o consistencia. Use CQRS para servicios con altas ratios de lectura a escritura. Publique proyecciones del modelo de lectura a partir de eventos del lado de escritura. Acepte consistencia eventual en los modelos de lectura.

## Event Sourcing

Almacene el estado como una secuencia inmutable de eventos en lugar de filas mutables. El event sourcing proporciona un registro de auditoría completo y permite consultas temporales. Combine con CQRS para la materialización práctica del lado de lectura. Utilice registros de esquemas de eventos para gestionar la evolución.

## Puerta de Enlace de API

Despliegue una puerta de enlace de API como el punto de entrada único para consumidores externos. La puerta maneja enrutamiento, autenticación, límites de velocidad y traducción de protocolos. Evite el antipatrón de puerta de enlace上帝 — mantenga la lógica de la puerta delgada y agnóstica de dominio.

## Descubrimiento de Servicios

Utilice un registro de servicios (Consul, DNS de Kubernetes o Eureka) para la ubicación dinámica de servicios. Verifique la salud de las instancias registradas y elimine automáticamente los endpoints no saludables. Prefiera descubrimiento del lado del cliente para rutas sensibles a latencia y del lado del servidor para simplicidad.

## Base de Datos por Servicio

Aplique **MS-R06** (Sin Persistencia Compartida) — cada servicio posee su base de datos. Ningún servicio puede leer o escribir directamente en la base de datos de otro servicio. El acceso a datos entre servicios se realiza a través de APIs publicadas o eventos. Utilice principios de data mesh (**ADR-0076**) para la propiedad de datos orientada a dominio.

## Pruebas de Contrato

Aplique **MS-R05** (Pruebas de Contrato/Pact) para validar la compatibilidad de API entre consumidores y proveedores. Ejecute pruebas de contrato en CI para cada cambio. Rechace despliegues que rompan contratos publicados. Utilice Pact u otros frameworks de contratos dirigidos por el consumidor.

## Referencias

| Regla | Descripción |
|-------|-------------|
| **MS-R05** | Pruebas de Contrato / Pact |
| **MS-R06** | Sin Persistencia Compartida |
| **ADR-0076** | Propiedad de datos orientada a dominio |

---
[Volver al Perfil de Microservicios](./README.es.md)
