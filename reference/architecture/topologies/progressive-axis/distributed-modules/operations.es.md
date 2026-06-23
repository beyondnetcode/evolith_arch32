# Guía de Operaciones de Módulos Distribuidos

> **Navegación Bilingüe:** [English](./operations.md) | [Español](./operations.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Módulos Distribuidos

## Descripción General

Esta guía define las prácticas operativas para módulos distribuidos, cubriendo despliegue independiente, versionado de contratos, descubrimiento de servicios, verificaciones de salud, rastreo distribuido y respuesta a incidentes.

## Despliegue Independiente

Cada módulo debe desplegarse de forma independiente sin requerir lanzamientos coordinados en todo el sistema. El ciclo de vida del módulo es responsabilidad de su equipo designado (DM-R01).

- **Aislamiento de pipeline de despliegue**: Cada módulo tiene su propio pipeline CI/CD con etapas de compilación, prueba y despliegue delimitadas por módulo.
- **Estrategia de migración de base de datos**: Los módulos son dueños de sus esquemas; las migraciones se ejecutan dentro del contexto de despliegue del módulo utilizando el patrón expand-contract.
- **Capacidad de reversión**: Todo despliegue debe soportar reversión automatizada dentro de una ventana definida.

## Versionado de Contratos

Contratos versionados explícitos gobiernan la comunicación entre módulos (DM-R02). Los cambios de ruptura requieren una nueva versión principal y una ventana de deprecación.

- **Versionado semántico**: Los módulos aplican semver a contratos de API y eventos.
- **Ventana de compatibilidad retroactiva**: Mínimo 90 días de superposición para versiones decontrato deprecadas.
- **Registro de contratos**: Registro centralizado que cataloga todas las versiones de contrato activas y deprecadas.

## Descubrimiento de Servicios

Los módulos se registran con la malla de servicios o mecanismo de descubrimiento al iniciar. Los datos de descubrimiento incluyen versión, capacidades y endpoint de salud.

- **Registro**: Registro automático al iniciar, cancelación de registro al apagado graceful.
- **Búsqueda**: Los consumidores resuelven los endpoints del módulo a través del descubrimiento, no direcciones codificadas.
- **Filtrado por versión**: El descubrimiento soporta enrutamiento a versiones de contrato específicas durante transiciones.

## Verificaciones de Salud

Todo módulo expone endpoints de liveness y readiness. El estado de alimentación alimenta al orquestador y equilibrador de carga.

- **Liveness**: Verifica que el proceso del módulo está ejecutándose y respondiendo.
- **Readiness**: Verifica que el módulo puede aceptar tráfico, incluyendo dependencias downstream.
- **Sondas de salud personalizadas**: Los módulos definen verificaciones de salud específicas del dominio más allá de la conectividad básica.

## Rastreo Distribuido

Todas las llamadas entre módulos propagan contexto de rastreo (DM-R05). Los rastros abarcan el ciclo completo de solicitud a través de los límites del módulo.

- **Propagación de rastreo**: Los encabezados HTTP y metadatos de mensajes transportan IDs de rastreo y span.
- **Estrategia de muestreo**: Muestreo adaptativo equilibra visibilidad con sobrecarga; los errores siempre se rastrean.
- **Almacenamiento de rastros**: Los rastros se almacenan en un backend de observabilidad centralizado con retención configurable.

## Respuesta a Incidentes

Los procedimientos de respuesta a incidentes consideran el aislamiento de módulos. Las fallas en un módulo no deben propagarse a áreas no relacionadas.

- **Ruta de escalación**: El propietario del módulo es el primer respondedor; la junta de arquitectura para incidentes entre módulos.
- **Vínculo a runbooks**: Cada módulo mantiene runbooks operativos para modos de falla conocidos.
- **Revisión post-incidente**: El análisis de causa raíz documenta lecciones; los hallazgos retroalimentan actualizaciones de módulo y gobernanza.

---

[Volver al Perfil de Módulos Distribuidos](./README.es.md)
