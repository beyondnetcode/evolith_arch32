# Guía de Patrones Orientada a Eventos

> **Navegación Bilingüe:** [English](./patterns.md) | [Español](./patterns.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Orientada a Eventos

## Propósito

Documentar patrones fundamentales orientados a eventos: almacenamiento de eventos, CQRS, saga, outbox transaccional, captura de cambios de datos (CDC) y tradeoffs entre coreografía y orquestación.

## Almacenamiento de Eventos (Event Sourcing)

- Persistir estado como una secuencia inmutable de eventos en lugar de instantáneas del estado actual.
- Reconstruir estado reproduciendo eventos desde el inicio del flujo.
- Usar snapshots periódicamente para acotar el tiempo de reproducción (por ejemplo, cada 1,000 eventos).

## CQRS (Segregación de Responsabilidades de Comando y Consulta)

- Separar modelo de escritura (comandos) del modelo de lectura (consultas) para escalado independiente.
- Sincronizar modelo de lectura mediante eventos publicados desde el lado de escritura.
- Aceptar consistencia eventual entre modelos de escritura y lectura; diseñar UIs en consecuencia.

## Patrón Saga

- Coordinar procesos de negocio de múltiples pasos como una secuencia de transacciones locales.
- Implementar transacciones compensatorias para reversión cuando un paso falla.
- Preferir coreografía (orientada a eventos) para sagas simples; usar orquestación (coordinador central) para flujos de trabajo complejos y de larga ejecución.

## Outbox Transaccional — ED-R02

- Asegurar publicación confiable de eventos escribiendo eventos en un outbox dentro de la misma transacción de BD que la escritura de negocio.
- Usar CDC (Debezium) o un editor de sondeo para transmitir eventos del outbox al broker.
- Deduplicar del lado del consumidor; el outbox puede publicar duplicados durante failover.

## Captura de Cambios de Datos (CDC)

- Transmitir cambios de base de datos como eventos sin modificar el código de la aplicación.
- Usar Debezium o conectores equivalentes para PostgreSQL, MySQL o SQL Server.
- Monitorear retraso del conector; alertar cuando el retraso exceda 5 minutos.

## Coreografía vs. Orquestación — ED-R04

| Aspecto | Coreografía | Orquestación |
|---|---|---|
| Acoplamiento | Loose; los servicios reaccionan a eventos | Más fuerte; el coordinador invoca servicios |
| Visibilidad | Distribuida; más difícil de rastrear | Centralizada; más fácil de monitorear |
| Manejo de errores | Eventos compensatorios por servicio | Reintento y compensación centralizados |
| Caso de uso | Flujos simples de pocos pasos | Complejos, multi-servicio, larga ejecución |

## Aplicabilidad Componible

| Componible | Orientación |
|---|---|
| Monolito Modular | Almacenamiento de eventos y CQRS dentro de límites de módulos; outbox es intra-BD. |
| Módulos Distribuidos | Saga entre módulos; coreografía preferida para acoplamiento loose. |
| Microservicios | Saga completo con orquestación o coreografía; CDC para sincronización de datos. |
| Serverless | Almacenamiento de eventos con flujos gestionados; CDC vía conectores gestionados. |
| Computación Edge | Almacenamiento de eventos local con sincronización periódica a la nube. |

## Referencias ADR

- **ADR-0015**: Criterios de adopción de almacenamiento de eventos y CQRS.
- **ADR-0079**: Marco de decisión de orquestación vs. coreografía en saga.

---

[Volver al Perfil Orientado a Eventos](./README.es.md)
