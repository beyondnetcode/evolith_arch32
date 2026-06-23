# Guía de Evolución de Microservicios

> **Navegación Bilingüe:** [English](./evolution.md) | [Español](./evolution.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Microservicios

## Descomposición de Servicios

Descomponga monolitos a lo largo de límites de dominio utilizando Diseño Dirigido por Dominio (DDD). Identifique contextos delimitados primero, luego extraiga servicios. No divida por capa técnica (por ejemplo, un "servicio de UI" o "servicio de base de datos" separado). Cada servicio debe poseer una capacidad de negocio cohesiva.

## Migración de Propiedad de Datos

Al extraer un servicio, migre sus datos de la base de datos compartida. Utilice el patrón Higo Estrangulador: enrute las lecturas al nuevo servicio, rellene los datos y luego cambie la escritura. Respete **MS-R06** (Sin Persistencia Compartida) — el servicio antiguo debe dejar de acceder a los datos migrados inmediatamente después del corte.

## Fusión de Servicios

Los servicios pueden fusionarse cuando el límite entre ellos genera más overhead que valor. Las señales incluyen: coordinación constante entre servicios, esquemas de datos compartidos y ciclos de lanzamiento acoplados. Fusione solo cuando ambos equipos estén de acuerdo y el servicio fusionado mantenga una estructura interna clara.

## Arquitectura Orientada a Dominio

Siga **ADR-0076** (Propiedad de Datos Orientada a Dominio). Cada dominio posee sus datos, APIs y responsabilidad operativa. Los dominios pueden ser atendidos por uno o más servicios. Utilice revisiones de dominio para evaluar los límites de servicio anualmente.

## Versionado de APIs

Versione todas las APIs públicas. Use versionado semántico para REST y gRPC. Descontinúe versiones antiguas con un encabezade de sunset y un calendario de migración documentado. Nunca elimine una versión sin al menos un ciclo de lanzamiento de aviso de descontinuación.

## Compatibilidad Retroactiva

Mantenga compatibilidad retroactiva para al menos dos versiones. Use cambios de esquema solo aditivos. Los cambios que rompen la compatibilidad requieren una nueva versión de API y un plan de migración coordinado con los consumidores.

## Baja de Servicio

Defina una lista de verificación de baja: archive los datos, elimine entradas DNS, actualice el catálogo de servicios, notifique a los equipos dependientes y elimine la infraestructura. Los servicios no deben dejar recursos huérfanos ni dependencias no documentadas.

## Referencias

| Regla | Descripción |
|-------|-------------|
| **MS-R01** | Despliegue Independiente |
| **MS-R06** | Sin Persistencia Compartida |
| **ADR-0076** | Propiedad de datos orientada a dominio |

---
[Volver al Perfil de Microservicios](./README.es.md)
