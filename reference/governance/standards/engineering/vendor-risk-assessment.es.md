# Evaluación de Bloqueo de Proveedor (Vendor Lock-In) y Riesgo Financiero

## Estado
Aprobado

## Fecha
2026-05-10

## Contexto
A medida que el Sistema de Referencia adopta varios frameworks, bases de datos y herramientas de terceros, debemos evaluar continuamente las decisiones de **"Construir vs. Comprar"** para prevenir cargas financieras inesperadas, conflictos de licencias o el bloqueo del proveedor.

Este documento sirve como línea base arquitectónica para evaluar el stack tecnológico actual frente a la escalabilidad de costos, el cumplimiento de código abierto y el mantenimiento operativo.

---

## 1. Frameworks Core y Lenguajes
**Estado:** Riesgo Cero

El núcleo de la aplicación está completamente aislado del bloqueo de proveedor gracias a la estricta adherencia a la Arquitectura Hexagonal ([ADR-0002](../../../architecture/adrs/nodejs/0002-clean-architecture-nestjs.es.md)).
* **TypeScript & Node.js**: Código Abierto (Apache 2.0 / MIT).
* **NestJS**: Código Abierto (MIT), framework empresarial altamente adoptado.
* **Nx Monorepo**: Código Abierto (MIT). *Nota: Nx Cloud ofrece caché SaaS, pero el caché local es 100% gratuito.*

---

## 2. Riesgos de Infraestructura Identificados y Mitigaciones

### Riesgo Financiero Alto: Proveedor de Identidad (IdP)
* **Contexto**: [ADR-0020](../../../architecture/adrs/core/0020-identity-provider-abstraction-strategy.es.md) abstrae el Proveedor de Identidad, permitiendo integraciones con soluciones SaaS como Auth0 o Azure Entra ID.
* **El Riesgo**: Las plataformas comerciales SaaS de Identidad facturan por Usuarios Activos Mensuales (MAU) o tokens M2M. A una alta escala B2C o B2B, los costos operativos pueden dispararse exponencialmente.
* **Estrategia de Mitigación**: Si los costos de licencia se vuelven prohibitivos, el adaptador de infraestructura debe cambiarse a **Keycloak** (100% Código Abierto y gratuito). Sin embargo, esto traslada el costo financiero de la licencia al mantenimiento de DevOps (escalado de Kubernetes, gestión de base de datos).

### Riesgo de Licenciamiento Medio: Caché Distribuido Redis
* **Contexto**: [ADR-0014](../../../architecture/adrs/core/0014-distributed-caching-strategy-redis.es.md) impone Redis para el almacenamiento en caché.
* **El Riesgo**: Redis Inc. cambió recientemente su licencia de BSD a RSALv2 (Fuente Disponible, no estrictamente Código Abierto OSI). Aunque es gratuito para uso interno, plantea preocupaciones legales para el alojamiento de servicios gestionados.
* **Estrategia de Mitigación**: En caso de requisitos estrictos de cumplimiento de código abierto o despliegue autohospedado ([ADR-0028](../../../architecture/adrs/core/0028-self-hosted-hybrid-infrastructure-on-premise.es.md)), el equipo de operaciones está autorizado a usar **Valkey** (el fork de Código Abierto de Redis de la Linux Foundation) como un reemplazo directo.

### Riesgo de Mantenimiento Medio: Motor de Feature Flags
* **Contexto**: [ADR-0017](../../../architecture/adrs/core/0017-feature-flagging-strategy.es.md) utiliza adaptadores de Infraestructura para Feature Flags (ej. Unleash, ConfigCat).
* **El Riesgo**: Las plataformas comerciales como LaunchDarkly o Unleash Enterprise tienen altas cuotas de suscripción. La versión gratuita y de código abierto de Unleash requiere autohospedaje.
* **Estrategia de Mitigación**: El equipo del producto debe determinar si existe el ancho de banda de DevOps para alojar y mantener el servidor Unleash de código abierto. Si no, se debe asignar presupuesto para una alternativa SaaS rentable como ConfigCat. La base de código central no se verá afectada debido al `IFeatureTogglePort`.

### Riesgo Bajo: Stack de Observabilidad
* **Contexto**: [ADR-0007](../../../architecture/adrs/nodejs/0007-observability-telemetry-loki-opentelemetry.es.md) utiliza el stack LGTM (Loki, Grafana, Tempo) y OpenTelemetry.
* **El Riesgo**: Grafana utiliza una licencia AGPLv3.
* **Estrategia de Mitigación**: Mientras el equipo del Esqueleto de Referencia solo consuma Grafana internamente para monitorización y no distribuya una versión modificada del código fuente de Grafana como un producto comercial, el riesgo legal o financiero es cero.

---

## Conclusión
La arquitectura actual del Esqueleto de Referencia ha sido diseñada deliberadamente para minimizar el bloqueo. Cualquier herramienta comercial (IdP, Feature Flags, Base de Datos) se mantiene completamente fuera de los límites del dominio utilizando puertos y adaptadores, asegurando que el negocio pueda pivotar instantáneamente a alternativas de código abierto si los modelos de precios de los proveedores cambian.

---
[Volver al Índice](./README.es.md)
