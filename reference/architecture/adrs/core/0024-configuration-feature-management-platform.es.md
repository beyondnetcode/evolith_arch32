# [ADR 0024](0024-configuration-feature-management-platform.md): Plataforma de Gestión de Características y Configuración

## Estado
Aprobado

## Fecha
2026-05-09

## Contexto
El SaaS moderno demanda agilidad total en tiempo de ejecución. Codificar rígidamente los enlaces de Proveedores de Identidad, variables operativas (ej. TTL de sesión, branding de la empresa) o parámetros de feature flags directamente en variables de entorno de la aplicación crea una pesada fricción de despliegue, invalida la auditoría inmediata y mata la personalización flexible específica de inquilinos en tiempo de ejecución.

## Decisión
Introducir un **Contexto Delimitado de Gestión de Características y Configuración** autoritativo que consolide los comportamientos del sistema:

1. **Almacén de IdP Dinámico**: Trasladar las configuraciones de identidad fuera de los archivos de entorno hacia pools de bases de datos multi-tenant, cifrados con AES-256 haciendo referencia a bóvedas de secretos externas. Permite cambiar los proveedores SSO de los inquilinos instantáneamente con cero empuje de código.
2. **Dinámica del Sistema**: Entregar configuraciones JSON versionadas que gobiernan comportamientos (requisitos MFA, branding, acceso a características) leídas directamente por los controladores de la aplicación en la instanciación del ciclo de vida o empujes de sockets en tiempo real.
3. **Marco de Banderas (Flag Framework)**: Desplegar un motor integrado de Banderas Booleanas/Variantes que soporte una profunda segmentación multidimensional (Rol, Entorno, Rama, Grupo) y división de tráfico basada en porcentajes.
4. **Capa de Velocidad Redis**: Aislar las evaluaciones de configuración en namespaces Redis dedicados (`cfg:*`, `flags:*`), garantizando evaluaciones de decisión sub-3ms en las intersecciones de ejecución.

## Consecuencias

### Positivas
- Verdadero multi-tenancy dinámico: los sistemas se adaptan en tiempo real por perfil de empresa sin recargas.
- Seguimiento completo del ciclo de vida: cualquier pivotaje de configuración crea registros históricos absolutos.
- Aislamiento directo del riesgo a través de puertas de despliegue incremental seguras.

### Negativas
- Modesta expansión de la topología del esquema de base de datos y de las estrategias de gobernanza de claves Redis activas.

## Referencias
- [ADR-0025: Estrategia de Abstracción de Feature Flags](../../adrs/core/0025-feature-flag-provider-abstraction.md)
- [ADR-0014: Estrategia de Caché Redis](../../adrs/core/0014-distributed-caching-strategy-redis.md)

---
[Volver al Índice](./README.es.md)
