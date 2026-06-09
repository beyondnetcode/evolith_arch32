# Estándares Universales de Arquitectura (Línea Base Agnóstica)

> **Navegación Bilingüe:** [English Version](../blueprints/authoritative-tech-stack-agnostic.md)

**Tipo de Documento:** Estándar Corporativo 
**Aplicabilidad:** Obligatorio para todos los Entornos de Ejecución (.NET, Node.js, Android) 
**Soberanía:** 100% Agnóstico a la Nube / Capacidad On-Premise

---

## Límite de Alcance

Este documento define **reglas arquitectónicas agnósticas al runtime**. No debe leerse como mandato de Node.js, .NET, base de datos, gateway o proveedor cloud específico.

Las herramientas concretas pertenecen a los perfiles por runtime:

- [Perfil .NET / C#](./authoritative-tech-stack-dotnet.es.md)
- [Perfil Node.js / TypeScript](./authoritative-tech-stack-nodejs.es.md)
- [Perfil Android / Kotlin](./authoritative-tech-stack-android.es.md)

La implementación aplicada de referencia vive en el repositorio [UMS](https://github.com/beyondnetcode/ums). Evolith conserva únicamente estándares, ADRs, blueprints, reglas de gobierno y documentación reutilizable; los detalles ejecutables, herramientas concretas de producto y código de ejemplo aplicado pertenecen a UMS u otros repositorios satélite.

## 1. Restricciones Ejecutivas y No Negociables

Independientemente del stack tecnológico concreto elegido (Node.js, .NET o Kotlin), cada componente que se integre en el ecosistema DEBE cumplir estrictamente con estos invariantes arquitectónicos sistémicos. La violación de estas restricciones fallará automáticamente la validación de Puertas de Arquitectura.

* **Núcleo Arquitectónico:** Arquitectura Hexagonal (Puertos y Adaptadores). En la Fase 1, los Puertos (contratos del dominio) y los Adaptadores (implementaciones concretas) son OBLIGATORIOS pero simples y directos. Cada puerto debe tener una sola implementación directa, sin capas adicionales. Los Wrappers anticorrupción complejos y fachadas se posponen a fases con integración externa.
* **Política de Cero SDKs:** La capa de Dominio absoluto DEBE contener CERO referencias, importaciones o dependencias de SDKs de proveedores cloud (AWS, Azure), librerías ORM o frameworks HTTP específicos.
* **Infraestructura como Detalle:** Las capas de persistencia, buses de mensajería y almacenes de caché SOLO DEBEN interactuarse a través de Puertos de Dominio abstractos.
* **Garantía de Despliegue Progresivo:** Todos los componentes backend DEBEN ser empaquetados como contenedores estándar (OCI). La complejidad de la infraestructura evoluciona con la madurez del sistema: la Fase 1 admite despliegue sobre cómputo mínimo (VM, App Service o Docker Compose); Kubernetes se exige a partir del desacoplamiento de servicios (Fase 3+). La compatibilidad air-gapped se planifica desde el inicio pero su ejecución completa escala con la plataforma.

---

## 2. Estándares de Comunicación y Contratos

La integración entre servicios sigue la doctrina "Primero el Contrato" (*Contract First*) para garantizar la interoperabilidad políglota.

| Dominio del Estándar | Definición Requerida | Justificación |
| :--- | :--- | :--- |
| **Comunicación Síncrona Interna** | **gRPC (Protocol Buffers)** | Obligatorio desde Fase 2 para invocaciones entre servicios remotos ([ADR-0047](../adrs/core/0047-architectural-patterns-monolith-soa-microservices.es.md)). En Fase 1, la invocación es nativa intra-proceso. |
| **Estándar API Web Pública** | **RESTful (OpenAPI v3)** | Interoperabilidad canónica para integradores de terceros y SDKs Frontend. |
| **Arquitectura de Bus de Eventos** | **AMQP / CloudEvents** | Estructura de eventos autodescriptiva que sigue patrones de Transactional Outbox para una propagación segura. |

---

## 3. Estrategia de Frontend e Interfaz de Usuario

Obligatorio para todas las aplicaciones cliente para garantizar una evolución y escalabilidad consistentes.

| Estándar | Implementación Requerida | Justificación |
| :--- | :--- | :--- |
| **Entrega Progresiva de UI** | **Fase 1-2: UI monolítica modular. Fase 3+: Microfrontends por excepción.** | En Fase 1 NO se implementan microfrontends. Se inicia con una sola aplicación React modular y un solo deployable. La transición a **Module Federation** ([ADR-0055](../adrs/core/0055-estrategia-arquitectura-microfrontends.es.md)) ocurre solo al alcanzar Fase 3+ o cuando la escala del equipo, la contención de despliegues o los ciclos tecnológicos independientes exijan desplegabilidad independiente. |
| **Gestión de Estado** | **Caché Asíncrona (Cache-first)** | Uso de patrones `stale-while-revalidate` (ej. React Query) para resiliencia ante latencia del backend ([ADR-0004](../adrs/nodejs/0004-frontend-offline-resilience.es.md)). |
| **Consistencia de Diseño** | **Sistema de Diseño Atómico** | Todos los módulos de UI DEBEN compartir los tokens CSS corporativos y componentes atómicos para evitar derivas visuales. |

---

## 4. Infraestructura Fundacional Transversal


Primitivas centralizadas aprobadas que sirven a la red políglota. Los adaptadores concretos del entorno de ejecución simplemente deben apuntar a estos protocolos estándar.

### 3.1 Persistencia Relacional (SQL)
* **Estrategia de Motores:** Selección dependiente del runtime gobernada por [ADR-0051](../adrs/core/0051-estrategia-motor-base-datos-empresarial.es.md). La regla universal es consistencia relacional, ownership por esquema/contexto, seguridad transaccional y aislamiento del dominio; el motor concreto se selecciona por perfil de runtime o ADR de producto.
 * **Perfil .NET de referencia:** Microsoft SQL Server.
 * **Perfil Node.js de referencia:** PostgreSQL.
* **Restricción de Madurez:** REQUERIDO aislamiento de Esquema por Contexto. ESTÁN PROHIBIDOS los SQL Joins directos a través de las fronteras de esquemas de contextos delimitados.
* **Estándares de Diseño:** Todo el modelado de datos DEBE cumplir con los estándares definidos en el [ADR-0054](../adrs/core/0054-database-design-normalization-standards.es.md) (línea base 3NF para SQL).
* **Patrón de Aislamiento:** Estrategia de Seguridad Configurable ([ADR-0044](../adrs/core/0044-configurable-security-persistence-strategy.es.md)). La Seguridad a Nivel de Fila (RLS) nativa es OPCIONAL/RECOMENDADA para densidades multi-tenant, gobernada por el flag `SECURITY_STRATEGY_MODE`.

### 3.2 Caché Distribuida
* **Contrato:** Caché distribuida accedida mediante un puerto de caché. Las implementaciones compatibles con Redis son la opción de referencia, no una dependencia de la capa de dominio.
* **Rol:** Aceleración de grafos efímeros, optimización de lecturas cercanas a sesión y estado de rate limiting.

### 3.3 Almacenamiento de Objetos
* **Contrato Homologado:** **Protocolo Compatible con S3** (Estándar de facto de la industria) vía MinIO autohospedado.
* **Justificación:** El S3-API actúa como protocolo de cable universal, facilitando la soberanía e independencia de la nube.
* **Regla:** Prohibido el uso directo de SDKs propietarios de proveedores cloud. La lógica de almacenamiento DEBE interactuar exclusivamente vía Puertos de Dominio apuntando a endpoints que cumplan con la especificación S3.

---

## 4. Seguridad Reforzada y Perímetro

### 4.1 Identidad y Autorización
* **Protocolo:** Federación OpenID Connect (OIDC) / OAuth 2.0 / SAML 2.0.
* **Tipo de Token:** Verificación estadística de JWTs firmados con RS256.
* **Cumplimiento:** Red Zero Trust. Se requiere TLS mutuo (mTLS) obligatorio solo al activar la malla de red distribuida (Fase 3+).

### 4.2 Higiene de Secretos
* **Motor:** HashiCorp Vault (Empresarial o Comunitario Autohospedado).
* **Regla:** Prohibidos los secretos en texto plano en charts de Helm, repositorios Git o ConfigMaps de K8s. La inyección vía sidecar es el único patrón de consumo aprobado.

---

## 5. Observabilidad Empresarial Nativa

La telemetría agnóstica al entorno de ejecución es obligatoria. Se prohíbe a los equipos bloquear su lógica en agentes de proveedores SaaS específicos.

* **Instrumentación de Trazas/Logs:** Estándar **OpenTelemetry (W3C Trace Context)**.
* **Jerarquía de Recolección:** OpenTelemetry Collector como punto de entrega vendor-neutral. Prometheus, Jaeger, Tempo, Loki u otros backends OSS/SaaS son decisiones de despliegue.
* **Formato de Logs:** Registro estructurado JSON obligatorio para indexación y correlación confiable.

---

## 6. Contenerización y Estrategia de Despliegue

Estandarización del empaquetado y ejecución para garantizar paridad entre nube y on-premise.

* **Motor de Contenedores:** **Docker v25+** utilizando compilaciones multi-etapa (multi-stage) con imágenes base **Distroless** (Google Container Tools) para minimizar la superficie de ataque en producción.
* **Orquestación Progresiva:** En la Fase 1, basta con **Docker Compose** o servicios de contenedor directos (VM, Container Apps). **Kubernetes (K8s v1.28+)** se impone a partir de la Fase 3+ para gestionar servicios desacoplados. Los manifiestos de charts deben ser agnósticos al sabor de distribución (funcionar en EKS/AKS tanto como en MicroK8s/Rancher).
* **Gestor de Paquetes:** **Helm v3**. Los charts deben parametrizar completamente los recursos, permitiendo intercambios fáciles entre infraestructura real de nube y simuladores locales.

---

## 7. Pirámide de Verificación Holística

Obligatorio para garantizar que el software políglota respeta los contratos antes de desplegar.

* **Pruebas de Integración:** Deben validar contra dependencias compatibles con infraestructura real. Testcontainers es la estrategia de referencia, pero la regla es fidelidad: no reemplazar comportamiento crítico SQL/caché/bus con fakes en memoria irreales.
* **Seguridad de Contratos:** Contract testing requerido para APIs consumidas externamente y límites remotos de servicio. Pact es la implementación de referencia donde aplique.
* **Rendimiento y Carga:** Las pruebas de carga deben automatizarse para flujos sensibles a latencia. k6 es la implementación de referencia, no la única herramienta válida.

---

## 8. Directrices de Servicios de Terceros

Para entornos desconectados (air-gapped), las integraciones externas DEBEN ser opcionales y abstraídas.

| Nombre del Servicio | Caso de Uso | Restricción Local / Mitigación | Interfaz del Puerto Requerida |
| :--- | :--- | :--- | :--- |
| **Twilio** | SMS OTP / Alertas | Proveer configuración para Gateway SMTP-a-SMS local o módem hardware. | `ISmsPort` |
| **SendGrid** | Emails Transaccionales | Alternativa compatible vía servidor SMTP autohospedado (Postfix/Haraka). | `IEmailPort` |

---

## 9. Registro de Riesgos de Bloqueo del Proveedor (Vendor Lock-in)

Todas las decisiones de infraestructura base son auditadas bajo el prisma de soberanía tecnológica.

| Componente | Solución de Referencia | Nivel de Riesgo | Estrategia de Salida/Mitigación |
| :--- | :--- | :--- | :--- |
| **Base de Datos** | Motor SQL específico por runtime | **Bajo** | Disciplina ANSI SQL. Capa de dominio desacoplada mediante puertos. Cambios de motor requieren ADR de producto. |
| **Almacén de Objetos** | API compatible con S3 | **Bajo** | Contrato de puerto S3-compatible. Proveedores concretos intercambiables por configuración/adaptador. |
| **Secretos**| HashiCorp Vault | **Bajo** | Resolución abstraída por inyección dinámica de sidecars nativos de K8s. |
| **Gateway** | API gateway / ingress basado en estándares | **Bajo** | El comportamiento del gateway debe ser declarativo y reemplazable por configuración de ingress/API-management. |

---

## 10. Próximos Pasos Estructurales para la Lectura

Este documento cubre solo las **leyes universales**. AHORA DEBE identificar su Entorno de Ejecución activo y consumir el mapeo de cumplimiento técnico concreto:

1. -> **[Stack Tecnológico Específico para .NET / C#](./authoritative-tech-stack-dotnet.es.md)**
2. -> **[Stack Tecnológico Específico para Node.js / TypeScript](./authoritative-tech-stack-nodejs.es.md)**
3. -> **[Stack Tecnológico Móvil Específico para Android / Kotlin](./authoritative-tech-stack-android.es.md)**

---
[Volver al Índice](./README.md)
