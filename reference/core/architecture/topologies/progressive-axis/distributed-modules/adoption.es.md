# Guía de Adopción de Módulos Distribuidos

> **Navegación Bilingüe:** [English](./adoption.md) | [Español](./adoption.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Módulos Distribuidos

## Descripción General

Esta guía define el proceso de adopción de la topología de módulos distribuidos, incluyendo criterios de entrada, topología de equipos, modelo de propiedad, lista de verificación de adopción y criterios de salida para progresión a F3.

## Criterios de Entrada

Un sistema debe cumplir la madurez F1 (>= 70% en la puntuación de extracción de monolito modular) antes de adoptar la topología de módulos distribuidos.

- **Línea base de monolito modular**: El sistema primero debe alcanzar la madurez F1 con límites de módulo bien definidos.
- **Umbral de puntuación de extracción**: La puntuación de extracción F1 debe ser >= 70% según lo validado por la junta de arquitectura.
- **Preparación del equipo**: Al menos un equipo debe tener capacidad de propiedad de extremo a extremo para un módulo.
- **Infraestructura operativa**: La malla de servicios, pila de observabilidad y pipelines CI/CD deben estar operativos.

## Topología de Equipo

La estructura del equipo debe alinearse con la propiedad de módulos para permitir operación autónoma.

- **Equipos alineados por módulo**: Cada módulo es poseído por un solo equipo responsable de diseño, desarrollo y operaciones.
- **Equipo de plataforma**: Un equipo de plataforma proporciona infraestructura compartida, herramientas y capacidades de autoservicio.
- **Junta de arquitectura**: La junta de arquitectura gobierna estándares cross-module, revisión de contratos y decisiones de extracción.
- **Canales de comunicación**: Existen rutas de comunicación claras entre equipos de módulos, equipo de plataforma y junta de arquitectura.

## Modelo de Propiedad

Cada módulo tiene un propietario claramente definido responsable de su ciclo de vida completo (DM-R01).

- **Propiedad de diseño**: El propietario del módulo es responsable del diseño de API, contratos de eventos y esquema de datos.
- **Propiedad de desarrollo**: El propietario del módulo posee la base de código, pruebas y pipeline de despliegue.
- **Propiedad operativa**: El propietario del módulo es responsable del monitoreo, respuesta a incidentes y planificación de capacidad.
- **Propiedad de ciclo de vida**: El propietario del módulo gestiona el módulo desde su inicio hasta su posible extracción o deprecación.

## Lista de Verificación de Adopción

Antes de distribuir un módulo, se debe completar la siguiente lista de verificación.

- [ ] El módulo tiene límites bien definidos y responsabilidad de dominio clara.
- [ ] Los contratos del módulo están registrados, versionados y son compatibles retroactivamente.
- [ ] El módulo tiene su propio almacén de datos sin acceso directo cross-module.
- [ ] El módulo tiene un pipeline CI/CD automatizado con capacidad de reversión.
- [ ] El módulo tiene verificaciones de salud de liveness y readiness.
- [ ] El módulo tiene observabilidad (logs, métricas, trazas) con alertas.
- [ ] El equipo propietario del módulo tiene runbooks operativos para modos de falla conocidos.
- [ ] La junta de arquitectura ha revisado y aprobado la distribución.

## Criterios de Salida para F3

Un módulo puede progresar a F3 (microservicios) cuando se cumplen los criterios de preparación para extracción (DM-R08).

- **Puntuación de extracción >= 80%**: El módulo alcanza el umbral de preparación para extracción.
- **Extracción piloto exitosa**: El módulo ha sido pilotizado como servicio independiente.
- **Sin acoplamiento de datos cross-module**: El módulo no tiene esquemas compartidos ni acceso directo a base de datos.
- **Despliegue independiente demostrado**: El módulo ha demostrado despliegue y reversión independientes en producción.
- **Aprobación de la junta de arquitectura**: Aprobación final de la junta de arquitectura para la extracción completa.

---

[Volver al Perfil de Módulos Distribuidos](./README.es.md)
