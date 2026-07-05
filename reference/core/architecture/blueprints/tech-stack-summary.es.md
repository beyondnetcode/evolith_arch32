# Cheat Sheet del Stack Node.js de Referencia (Específico por Runtime / Orientado a Demo)

> Alcance: este documento **no** es la política universal de arquitectura.
>
> Es una referencia rápida específica para el runtime Node.js / TypeScript y para el sandbox demo del repositorio. Las reglas transversales viven en la [Línea Base Agnóstica Universal](./authoritative-tech-stack-agnostic.es.md). Las alternativas por runtime viven en los perfiles [.NET](./authoritative-tech-stack-dotnet.es.md), [Node.js](./authoritative-tech-stack-nodejs.es.md) y [Android](./authoritative-tech-stack-android.es.md).

Esta hoja sirve como referencia de herramientas por capa arquitectónica para desarrolladores y agentes autónomos que trabajan en la implementación de referencia Node.js.

---

### 1. Runtime y Lenguaje
* **Entorno de Ejecución:** Node.js v20 LTS
* **Lenguaje:** TypeScript v5.4+ (Modo Estricto)
* **Motor Compilador:** SWC (`@swc/core`) dentro de Nx Monorepo
* **Calidad de Código:** ESLint v8 + Prettier v3
* **Puertas de Calidad Git:** Husky + lint-staged

### 2. Capa de API
* **Protocolos Internos:** gRPC (NestJS Microservices)
* **Protocolos Externos:** API REST (NestJS Express)
* **Estándar de Validación:** `class-validator` + `class-transformer`
* **Documentación de API:** OpenAPI v3 (Swagger) vía decoradores NestJS

### 3. Capa de Gateway
* **API Gateway:** Kong Gateway (Edición de Código Abierto)
* **Gestión de Sesión:** JSON Web Tokens (JWT) firmados con RS256
* **Seguridad Interna:** TLS mutuo (mTLS) vía Malla de Servicios Istio
* **Limitación de Tasa:** Limitador de Tasa de Ventana Deslizante (plugin Kong Redis)

### 4. Capa de Dominio y Aplicación
* **Patrón Arquitectónico:** Arquitectura Hexagonal (Puertos y Adaptadores)
* **Estrategia de Monorepo:** Nx Monorepo
* **Patrón de Ejecución:** Monolito Modular (Listo para Dapr)
* **Patrón de Segregación:** CQRS Híbrido (Regulado por Matriz [ADR-0034](../adrs/core/0034-cqrs-pattern-applicability-matrix.es.md))
* **Inyección de Dependencias:** Contenedor DI nativo de NestJS

### 5. Capa de Datos
* **Base de Datos Relacional Principal:** PostgreSQL v16 (Aislamiento Esquema Por Contexto, [ADR-0031](../adrs/core/0031-schema-per-context-domain-event-catalog.es.md))
* **Mapeo Relacional (ORM):** TypeORM (TypeScript)
* **Consultas de Alto Rendimiento:** Driver nativo `pg`
* **Motor de Migración de Esquema:** Migraciones TypeORM vía Init-Containers de Kubernetes
* **Caché en Memoria:** Redis v7.2 (Replicaciones Sentinel / Cluster)
* **Almacén de Objetos y Activos:** MinIO (Compatible con S3, Autohospedado)
* **Bróker de Mensajes Asíncrono:** RabbitMQ gobernado por control de flujo ([ADR-0036](../adrs/core/0036-message-bus-delivery-strategy-fifo-dlq.es.md)) y Outbox ([ADR-0033](../adrs/core/0033-transactional-outbox-pattern.es.md))

### 6. Estrategia de Multi-tenancy
* **Modelo de Aislamiento de Datos:** Base de Datos Compartida con Row-Level Security (RLS)
* **Contexto de Resolución de Inquilino:** Extracción de claims de JWT vía Guards de NestJS
* **Imposición de Aislamiento:** Inyección dinámica de sesión de transacción de base de datos (`SET LOCAL app.current_tenant`)

### 7. Infraestructura y Despliegue
* **Motor de Contenedores:** Docker v25 (Imágenes node distroless multi-etapa)
* **Plataforma Orquestadora:** Kubernetes (K8s v1.28+)
* **Gestión de Secretos y Claves:** OpenBao (fork de Vault, Linux Foundation)
* **Empaquetador de Despliegue:** Charts parametrizados de Helm v3

### 8. Observabilidad
* **Estándar de Instrumentación:** OpenTelemetry (SDKs Neutrales al Proveedor)
* **Agregador de Logs:** Grafana Loki (OSS)
* **Trazas Distribuidas:** Jaeger (OSS)
* **Servidor de Métricas:** Motor de Extracción Prometheus (Pulling)

### 9. Seguridad
* **Registros de Auth:** OIDC y SAML Federados + Almacén BCrypt Nativo del Esqueleto de Referencia
* **Control de Acceso:** RBAC Jerárquico + Control de Acceso Basado en Atributos (ABAC)
* **Auditoría de Dependencias:** CLI de Snyk + `npm audit` dentro de las pipelines de CI/CD

### 10. Estrategia de Gestión de Errores
* **Estándar de Patrón:** Patrón Result Funcional (`neverthrow`) según [ADR-0038](../adrs/nodejs/0038-error-handling-result-pattern-strategy.es.md)
* **Barrera Global:** NestJS ExceptionFilter capturando IDs de traza interna opacos.

### 11. Experiencia del Desarrollador (DevEx)
* **Servicios Locales:** Especificación de Docker Compose
* **Framework de Pruebas Unitarias:** Jest
* **Pruebas de Integración:** Jest + Supertest con **Testcontainers**
* **Verificación de Contratos:** Pact JS (Impulsado por el consumidor de microservicios)
* **Inyección de Rendimiento:** Scripts dinámicos de TypeScript de **k6** (Grafana)
* **Pruebas End-to-End (E2E):** Playwright

---
[Volver al Índice](./README.es.md)
