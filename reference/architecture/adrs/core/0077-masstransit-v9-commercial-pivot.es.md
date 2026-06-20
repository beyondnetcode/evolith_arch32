# [ADR 0077](0077-masstransit-v9-commercial-pivot.md): Giro Comercial de MassTransit v9 — Quedarse en v8, Monitorear OpenTransit

> **Navegación Bilingüe:** [English Version](./0077-masstransit-v9-commercial-pivot.md)

## Estado

Aprobado — Comité de Arquitectura Evolith, 2026-06-15.

## Fecha

2026-06-15

## Contexto y Problema

MassTransit v9 migró a un modelo de licencia puramente comercial. La última versión open-source (v8, Apache 2.0) tiene soporte comunitario solo hasta fin de 2026. Cualquier producto .NET en el ecosistema Evolith que use MassTransit como abstracción de bus de mensajes enfrenta una migración forzosa antes de 2027-01-01 a menos que se tome una decisión y se ejecute.

El Stack Audit ([ALERTA ROJA 2](../../../governance/standards/engineering/detailed-stack-audit-2026.es.md)) marca esto como un elemento crítico, registrado bajo [GT-111](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-111).

Existen tres caminos viables:

1. **Mantenerse en v8 dentro de la ventana de soporte** — fijarse en MassTransit 8.3.x (último árbol OSS) hasta fin de 2026, luego migrar.
2. **Migrar a Rebus** — un bus de servicios .NET maduro con licencia MIT, con soporte de sagas y múltiples transportes (RabbitMQ, Azure SB, SQL, SQS).
3. **Inyección directa del driver** — eliminar la abstracción del bus y usar clientes específicos del transporte directamente.

Adicionalmente, surgió un fork comunitario — **OpenTransit** (fork de MassTransit v8 para .NET 10+) — a mediados de 2026 como una posible continuación OSS a largo plazo.

## Objetivo y Alcance

**Objetivo:** Elegir un camino que mantenga la abstracción de mensajería sobre una base OSS sostenible, minimice el costo de migración y preserve el patrón `IEventBusPort` independiente del transporte definido en [ADR-0015](./0015-event-driven-architecture-intra-domain.md).

**Dentro del alcance:**
- La decisión para productos .NET en el ecosistema Evolith (UMS, Tracker y futuros satélites .NET) hasta 2027.
- El impacto en la abstracción `IEventBusPort` y el transporte RabbitMQ existente.

**Fuera del alcance:**
- Otros aspectos de mensajería .NET (patrones de orquestación de sagas, políticas de DLQ — cubiertos por ADR-0036).
- Mensajería Node.js/TypeScript (usa `@golevelup/nestjs-rabbitmq` y `EventEmitter2` — no afectado).

## Decisión

**Mantenerse en MassTransit v8 (8.3.x) durante la ventana de soporte hasta fin de 2026, y monitorear OpenTransit como el camino principal de continuación OSS post-2026.**

Justificación:

| Criterio | v8 (quedarse) | Rebus | Driver Directo | OpenTransit (futuro) |
|---|---|---|---|---|
| Costo de migración | Cero (actual) | Alto (reescritura de API) | Muy alto (pierde todas las funciones del bus) | Bajo (fork compatible con API) |
| Ventana de soporte | Hasta fin 2026 | Indefinida (MIT) | N/A | TBD (comunitario, temprano) |
| Paridad de funciones | Completa | Sagas, pub/sub, reintentos | Ninguna (DIY) | Compatible con v8 |
| Madurez productiva | Probada | Probada (desde 2015) | Depende del transporte | Pre-producción |
| Madurez del ecosistema | Grande | Mediana | N/A | Mínima |

La recomendación maximiza la ventana de soporte restante de v8 (6 meses) para:
- Evitar una migración inmediata y costosa a Rebus o una reescritura del driver.
- Permitir que OpenTransit madure lo suficiente para evaluar su salud comunitaria y estabilidad de API.
- Mantener la alternativa de Rebus o driver directo si OpenTransit no gana tracción.

Se establece un punto de reevaluación para Q1 2027.

## Consecuencias

**Positivas:**
- Costo de migración cero durante 2026.
- OpenTransit podría proveer un reemplazo directo, eliminando la migración por completo.
- Rebus sigue siendo una alternativa conocida si ni la extensión de v8 ni OpenTransit se materializan.

**Negativas:**
- Debe ejecutarse la migración en un cronograma fijo (Q1 2027) independientemente del camino elegido.
- OpenTransit está en pre-producción; si se estanca, la migración alternativa a Rebus sigue siendo necesaria.
- La ventana de soporte de v8 crea presión de cronograma: cualquier satélite .NET que adopte MassTransit después de mediados de 2026 debe planificar la migración desde el inicio.

**Mitigaciones:**
- La abstracción `IEventBusPort` ([ADR-0015](./0015-event-driven-architecture-intra-domain.md)) ya desacopla la aplicación de la implementación del bus, limitando el radio de explosión de la migración a la capa del adaptador.
- Se redactará un plan de migración fechado para Q4 2026, activado por la evaluación de madurez de OpenTransit.
- Se programará un punto de control de reevaluación para 2027-01-15 en el Architecture Intelligence Portal.

## Cumplimiento

La decisión aplica a todos los repositorios de productos .NET en el ecosistema Evolith que usen MassTransit. Cualquier satélite que adopte MassTransit después de la aprobación de este ADR debe fijarse en v8.3.x y seguir la reevaluación de Q1 2027.

## Referencias

- Stack Audit: `reference/governance/standards/engineering/detailed-stack-audit-2026.es.md` (ALERTA ROJA 2)
- Seguimiento de gaps: [GT-111](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-111)
- ADR-0015: [Arquitectura Orientada a Eventos (Intra-Dominio)](./0015-event-driven-architecture-intra-domain.md)
- ADR-0036: [Estrategia de Entrega de Mensajes y Cartas Muertas](./0036-message-bus-delivery-strategy-fifo-dlq.md)
- Proyecto OpenTransit: [https://opentransitlab.github.io/OpenTransit/](https://opentransitlab.github.io/OpenTransit/)
- Proyecto Rebus: [https://github.com/rebus-org/Rebus](https://github.com/rebus-org/Rebus)

> **Agent Signature:** Architect Agent
