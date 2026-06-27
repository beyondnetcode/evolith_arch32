# Guía de Evolución Orientada a Eventos

> **Navegación Bilingüe:** [English](./evolution.md) | [Español](./evolution.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Orientada a Eventos

## Propósito

Guiar la evolución de sistemas orientados a eventos: migración de patrones síncronos a asincrónicos, evolución de esquemas, estrategias de versionado y gobernanza del catálogo de eventos.

## Migración de Síncrono a Asincrónico

- Identificar cadenas de llamadas síncronas que bloquean en dependencias externas; candidatas para extracción de eventos.
- Comenzar con rutas no críticas (notificaciones, analíticas) antes de migrar flujos transaccionales.
- Ejecutar rutas síncronas y asincrónicas en paralelo durante la migración; deprecar la síncrona después de validación.

## Evolución de Esquemas — ED-R06

- Preferir cambios aditivos: agregar campos opcionales con valores predeterminados sobre eliminar o renombrar campos.
- Mantener compatibilidad hacia atrás por al menos 2 ciclos de lanzamiento mayores.
- Usar modos de compatibilidad del registro de esquemas: BACKWARD (consumidores toleran nuevos campos), FORWARD (productores toleran consumidores antiguos), FULL (ambos).

## Estrategia de Versionado

- Incrustar versión en el sobre del evento: `event-version: "1.2.0"`.
- Usar versionado semántico para cambios de esquema: mayor (ruptura), menor (aditivo), parche (correcciones).
- Mantener una tabla de mapeo de versiones para rutas de migración entre versiones mayores.

## Gobernanza del Catálogo de Eventos — ED-R07

- Registrar cada tipo de evento en un catálogo centralizado con metadatos de propiedad, dominio y retención.
- Requerir entrada en el catálogo antes de publicar un nuevo tipo de evento en cualquier entorno.
- Revisar el catálogo trimestralmente; archivar eventos no utilizados después de confirmación de partes interesadas.

## Proceso de Depreciación

- Marcar eventos deprecados con `deprecated: true` en el catálogo y registro de esquemas.
- Mantener eventos deprecados por un mínimo de 6 meses o 2 ciclos de lanzamiento, lo que sea mayor.
- Monitorear uso de eventos deprecados por consumidores; notificar a equipos propietarios cuando los consumidores permanezcan.

## Aplicabilidad Componible

| Componible | Orientación |
|---|---|
| Monolito Modular | Evolución de esquemas dentro del módulo; catálogo es intra-proceso. |
| Módulos Distribuidos | Coordinación de esquemas entre módulos; catálogo compartido requerido. |
| Microservicios | Catálogo de eventos por dominio; registro de esquemas como infraestructura compartida. |
| Serverless | Registro de esquemas gestionado; versionado enforced por la plataforma. |
| Computación Edge | Caché local de esquemas con sincronización periódica desde catálogo central. |

## Referencias ADR

- **ADR-0015**: Política de evolución de esquemas y versionado.
- **ADR-0079**: Gobernanza del catálogo de eventos y gestión del ciclo de vida.

---

[Volver al Perfil Orientado a Eventos](./README.es.md)
