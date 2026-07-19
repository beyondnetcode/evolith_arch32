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

> **Estado de gobierno:** ningún ADR gobierna por sí solo la adopción de Event Sourcing. En el corpus aparece únicamente como criterio 4 ("Reconstrucción de Estado") de la matriz Tier 3 de ADR-0034. Tratar la guía anterior como descriptiva, no como mandato.

## CQRS (Segregación de Responsabilidades de Comando y Consulta)

**Puerta de aplicabilidad — ADR-0034 (Accepted).** CQRS no es el valor por defecto. ADR-0034 existe justamente para frenar su adopción ciega: el CRUD básico y los cambios de estado simples permanecen en la ruta de modelo único (Tier 1), y las necesidades de conformado de vistas se resuelven en Tier 2 con proyecciones de solo lectura a nivel BFF mientras los comandos siguen dirigidos al repositorio central. El CQRS completo (Tier 3, separación física de código/lógica) se exige solo cuando se cumplen **al menos dos** de estas condiciones: ratio de lecturas a escrituras superior a **100:1**; lecturas analíticas pesadas que compiten con las transacciones y requieren una proyección en réplica de lectura; múltiples proyecciones de vista distintas no derivables del agregado sin cómputo pesado; o lógica de auditoría que requiere almacenar el flujo de historia.

Una vez que aplica Tier 3:

- Separar modelo de escritura (comandos) del modelo de lectura (consultas) para escalado independiente.
- Sincronizar modelo de lectura mediante eventos publicados desde el lado de escritura.
- Aceptar consistencia eventual entre modelos de escritura y lectura; diseñar UIs en consecuencia.

## Patrón Saga

- Coordinar procesos de negocio de múltiples pasos como una secuencia de transacciones locales.
- Implementar transacciones compensatorias para reversión cuando un paso falla.
- **Umbral de estilo — ADR-0035 (Accepted):** la coreografía es la recomendación estándar para cadenas cortas (**2 a 3 pasos**); la orquestación con un Saga Orchestrator dedicado es la recomendación obligatoria para flujos complejos (**más de 3 pasos**).
- Antes de desplegar una Saga, aplicar la Regla Local First de ADR-0035: si el proceso cabe en un solo contexto delimitado, usar una transacción ACID local en su lugar.

## Outbox Transaccional — ED-R02

- Asegurar publicación confiable de eventos escribiendo eventos en un outbox dentro de la misma transacción de BD que la escritura de negocio.
- Usar CDC (Debezium) o un editor de sondeo para transmitir eventos del outbox al broker.
- Deduplicar del lado del consumidor; el outbox puede publicar duplicados durante failover.

## Captura de Cambios de Datos (CDC)

- Transmitir cambios de base de datos como eventos sin modificar el código de la aplicación.
- Usar Debezium o conectores equivalentes para PostgreSQL, MySQL o SQL Server.
- Monitorear retraso del conector; alertar cuando el retraso exceda 5 minutos.

## Coreografía vs. Orquestación

La elección está gobernada por ADR-0035 (2–3 pasos → coreografía; más de 3 pasos → orquestación), no por ninguna regla ejecutable. ED-R04 gobierna únicamente la garantía de ordenamiento que un satélite debe declarar, y no decide este tradeoff.

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

- **ADR-0034**: Matriz de Aplicación del Patrón CQRS — la puerta de aplicabilidad (Tiers 1–3) de CQRS.
- **ADR-0035**: Estrategia de Implementación del Patrón Saga Distribuido — aplicabilidad de saga y umbral coreografía vs. orquestación.
- **ADR-0015**: Arquitectura Orientada a Eventos para Comunicación Intra-Dominio — el bus de eventos al que publican estos patrones.
- **Event Sourcing**: sin ADR que lo gobierne; solo cubierto como criterio Tier 3 dentro de ADR-0034.

---

[Volver al Perfil Orientado a Eventos](./README.es.md)
