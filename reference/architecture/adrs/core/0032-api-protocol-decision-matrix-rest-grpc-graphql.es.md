# [ADR 0032](0032-api-protocol-decision-matrix-rest-grpc-graphql.md): Matriz de Selección de Protocolo de API (REST vs gRPC vs GraphQL)

## Estado
Aprobado

## Fecha
2026-05-11

## Contexto
A medida que el monolito modular evoluciona hacia un ecosistema multi-módulo con múltiples BFFs (Backend For Frontends), apps móviles e integraciones corporativas externas, la selección del protocolo de comunicación correcto para cada ruta de interacción es crítica. Emplear una estrategia de "talla única" conduce a un tráfico interno con bajo rendimiento (REST) o a clientes de navegador excesivamente complejos (gRPC/Protobuf). Necesitamos un marco decisivo que guíe a los desarrolladores sobre qué protocolo exacto adoptar en función del límite de interacción y del tipo de consumidor.

## Decisión
Establecemos una **Matriz de Ajuste de Protocolo Estricta** adaptada a niveles arquitectónicos específicos:

### 1. Comunicación Interna Servicio-a-Servicio
 **MANDATO: gRPC (Protocol Buffers sobre HTTP/2)**
* **Alcance**: Llamadas síncronas entre contextos delimitados internos (ej., el contexto de Pedidos validando la autorización del usuario con el contexto de Identidad).
* **Razón fundamental**: Alto rendimiento, la serialización binaria colapsa el uso del ancho de banda, y seguridad de tipos estricta a través de contratos `.proto` unificados.

### 2. Integración Externa y Terceros Públicos
 **MANDATO: REST (JSON sobre HTTPS)**
* **Alcance**: Integraciones de clientes externos, conexiones de gateways corporativos legacy, y APIs públicas globales para desarrolladores.
* **Razón fundamental**: Universalidad en la industria, consumo trivial vía librerías HTTP estándar, depuración/pruebas más sencillas, y documentación interactiva amplia (OpenAPI/Swagger).

### 3. Portales Frontend y Orquestación de BFF Dinámica
 **MANDATO: REST (Primario) / GraphQL (Enriquecimiento Dirigido)**
* **Flujos Estándar**: Por defecto a APIs REST convencionales para comandos transaccionales (Crear/Actualizar).
* **Escenarios de Lectura Ricos/Anidados**: Adoptar **GraphQL** estrictamente al nivel de BFF NestJS cuando una pantalla requiera agregación de datos compleja (obtener Entidades, Taxonomías asociadas, Auditorías y relaciones simultáneamente) para prevenir el over-fetching móvil/web y los múltiples roundtrips secuenciales.

### árbol de Decisión de Selección

| Escenario | Protocolo Preferido | Justificación |
| :--- | :--- | :--- |
| **Máquina-a-Máquina (Interno)** | **gRPC** | Baja latencia, compactación binaria, fuertemente tipado. |
| **Cargas/Streams de Archivos** | **gRPC / REST** | Capacidad de streaming nativa o multipart simple. |
| **Open API Pública / Docs Desarrollador** | **REST** | Estándar absoluto, adopción de proveedores más fácil. |
| **Tableros Agregados de Alta Densidad** | **GraphQL** | Resuelve el under-fetching / búsquedas recursivas. |
| **Recuperación de Datos Móviles Bajo Consumo**| **GraphQL** | El cliente define estrictamente la forma de los datos hasta el bit. |
| **CRUD Estándar (Guardar Usuario, Borrar Tarea)**| **REST** | Cacheabilidad predecible, semántica HTTP nativa. |

## Directrices de Arquitectura
- **Aislamiento de GraphQL**: La lógica de tiempo de ejecución de GraphQL DEBE existir solo dentro de los nodos de aplicación BFF del Tier-2. Las definiciones de API de dominio core nunca soportan nativamente resolutores de GraphQL para evitar la fuga de restricciones específicas de la vista hacia la lógica de negocio del dominio.
- **Centralización de Protobuf**: Todos los esquemas de servicios gRPC internos (.proto) se alojan y versionan en un espacio de trabajo unificado `libs/contracts` para evitar modelos de interfaz con deriva (drift).

## Consecuencias

### Positivas
- La aplicación correcta de herramientas optimiza la huella de red general.
- Empodera la velocidad del frontend permitiendo actualizaciones dinámicas de consultas de vista sin forzar ciclos de despliegue del backend (vía GraphQL).
- Asegura la máxima escalabilidad para interconexiones de microservicios vía conductos binarios multiplexados.

### Negativas
- Los desarrolladores deben navegar por tres ecosistemas de protocolos concurrentes.
- Introduce costos de configuración para capas de ejecución GraphQL y herramientas de gobernanza de esquemas dentro de los stacks BFF.

## Referencias
- [ADR-0027: Estrategia de Protocolo Dual](../../adrs/nodejs/0027-dual-protocol-rest-grpc-api-gateway.md)
- [ADR-0030: Patrones de Gateway de Dos Capas](../../adrs/core/0030-api-gateway-kong-vs-nestjs.md)

---
[Volver al Índice](./README.es.md)
