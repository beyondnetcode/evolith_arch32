# Guía de Patrones de Integración de Módulos Distribuidos

> **Navegación Bilingüe:** [English](./patterns.md) | [Español](./patterns.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Módulos Distribuidos

## Descripción General

Esta guía define patrones de integración para módulos distribuidos, cubriendo contratos de API, coreografía de eventos, límites de kernel compartido y prácticas de desarrollo contract-first.

## Contratos de API (DM-R02)

Los módulos se comunican sincrónicamente a través de contratos de API explícitos y versionados. Los contratos se definen utilizando lenguajes de esquema estándar de la industria.

- **Protobuf**: Preferido para RPC interno de alto rendimiento con tipado fuerte y evolución de esquemas.
- **OpenAPI**: Utilizado para APIs HTTP/REST expuestas a consumidores externos o integraciones entre sistemas.
- **Registro de esquemas**: Todos los contratos se registran en un registro centralizado de esquemas con versionado y verificaciones de compatibilidad.
- **Compatibilidad retroactiva**: Los cambios de contrato deben mantener compatibilidad retroactiva dentro de una versión principal.

## Coreografía de Eventos (DM-R04)

Los cambios de estado cross-module se comunican vía eventos asíncronos utilizando coreografía sobre orquestación.

- **Validación de esquema de eventos**: Todos los eventos se conforman a un esquema registrado; eventos inválidos se rechazan al momento de publicar (DM-R04).
- **Consumidores idempotentes**: Los consumidores de eventos deben manejar la entrega duplicada gracefulmente.
- **Orden de eventos**: El orden por agregado está garantizado dentro de un módulo; el orden cross-module es best-effort.
- **Colas de carta muerta**: Los eventos no procesables se enrutan a colas de carta muerta para inspección y reproducción.

## Límites de Kernel Compartido

Donde los módulos deben compartir tipos o utilidades, se utilizan bibliotecas de kernel compartido con gobernanza estricta.

- **Kernels compartidos versionados**: Los paquetes de kernel compartido se versionan y lanzan independientemente.
- **Dirección de dependencia**: Los kernels compartidos son dependencias hoja; los módulos nunca dependen de otros módulos directamente.
- **Superficie mínima**: Los kernels compartidos contienen solo tipos, contratos y utilidades mínimas; sin lógica de negocio.

## Desarrollo Contract-First

Todas las interfaces de módulos se diseñan antes de la implementación. El diseño de contratos es el artefacto principal que impulsa el desarrollo.

- **Revisión de contratos**: Los contratos nuevos o modificados requieren revisión de arquitectura antes de que comience la implementación.
- **Generación de mocks**: Los contratos generan mocks de servidor y cliente para desarrollo paralelo y pruebas.
- **Verificaciones de compatibilidad**: Los pipelines de CI verifican la compatibilidad retroactiva de contratos en cada cambio.
- **Documentación**: Los contratos sirven como la documentación principal entre módulos; la documentación de API se genera a partir de las definiciones de contrato.

---

[Volver al Perfil de Módulos Distribuidos](./README.es.md)
