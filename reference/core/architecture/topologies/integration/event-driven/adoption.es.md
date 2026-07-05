# Guía de Adopción Orientada a Eventos

> **Navegación Bilingüe:** [English](./adoption.md) | [Español](./adoption.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Orientada a Eventos

## Propósito

Definir criterios de entrada, procedimientos de configuración y listas de verificación de adopción para equipos que adoptan arquitectura orientada a eventos: configuración del catálogo de eventos, contratos de productor/consumidor y validación de preparación.

## Criterios de Entrada

Antes de adoptar patrones orientados a eventos, verificar:

- Se ha identificado al menos un caso de uso asincrónico (por ejemplo, notificación entre dominios, requisito de consistencia eventual).
- El equipo tiene acceso a un broker de mensajes (gestionado o auto-hospedado).
- El equipo comprende los tradeoffs de orientado a eventos vs. alternativas síncronas.
- La infraestructura de registro de esquemas está disponible o planificada.

## Configuración del Catálogo de Eventos

- Crear entrada en el catálogo para cada tipo de evento con: nombre, dominio, propietario, versión del esquema, política de retención.
- Asignar un propietario de dominio responsable de cambios de esquema y deprecación.
- Publicar el catálogo en una ubicación accesible (wiki, portal o repositorio de código).

## Contratos de Productor — ED-R01

- Registrar especificación AsyncAPI para cada tipo de evento antes de la primera publicación.
- Definir campos requeridos y opcionales con tipos y valores predeterminados.
- Incluir metadatos del evento: event-id, event-version, timestamp, correlation-id.

## Contratos de Consumidor — ED-R05

- Declarar tipos de eventos esperados y versiones de esquemas en el registro del consumidor.
- Documentar estrategia de idempotencia y ventana de deduplicación.
- Definir tolerancia de retraso y umbrales de alerta para el consumidor.

## Lista de Verificación de Preparación

- [ ] Especificación AsyncAPI registrada en el registro de esquemas
- [ ] Entrada del catálogo de eventos creada con propietario y retención
- [ ] Productor implementa validación de esquemas antes de publicar
- [ ] Consumidor implementa procesamiento idempotente
- [ ] Enrutamiento DLQ configurado con política de reintento
- [ ] Paneles de monitoreo creados para retraso y throughput
- [ ] Manuales operativos documentados para escenarios de falla
- [ ] Equipo capacitado en patrones y tradeoffs orientados a eventos

## Aplicabilidad Componible

| Componible | Orientación |
|---|---|
| Monolito Modular | Catálogo ligero; broker embebido; validación de eventos intra-proceso. |
| Módulos Distribuidos | Catálogo compartido; se requiere revisión de contratos entre módulos. |
| Microservicios | Catálogo completo con propiedad de dominio; registro de contratos por servicio. |
| Serverless | Catálogo gestionado por plataforma; ejecución de contratos vía políticas de plataforma. |
| Computación Edge | Catálogo local con sincronización a la nube; contrato simplificado para restricciones de edge. |

## Referencias ADR

- **ADR-0015**: Estándares de catálogo de eventos y contratos de productor.
- **ADR-0079**: Requisitos de contratos de consumidor y preparación.

---

[Volver al Perfil Orientado a Eventos](./README.es.md)
