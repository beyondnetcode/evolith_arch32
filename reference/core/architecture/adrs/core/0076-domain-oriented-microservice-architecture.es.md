# ADR-0076: Arquitectura de Microservicios Orientada a Dominios (DOMA)

> **Navegación Bilingüe:** [English Version](./0076-domain-oriented-microservice-architecture.md)

## Estado

Aprobado — Evolith Architecture Board, 2026-06-14.

## Fecha

2026-06-14

## Contexto y Problema

La ruta de evolución progresiva de Evolith lleva a un producto desde un monolito modular (F1) hacia servicios desplegables de forma independiente (F3) solo cuando la demanda lo justifica ([ADR-0006](./0006-microservices-transition-sidecar-pattern.es.md), [ADR-0045](./0045-microservice-extraction-readiness-criteria.es.md), [ADR-0047](./0047-architectural-patterns-monolith-soa-microservices.es.md)). Cuando un producto alcanza la etapa de microservicios F3, el **principio organizador** de cómo se agrupan esos servicios queda implícito.

Sin un principio explícito, la descomposición en microservicios tiende a derivar hacia capas técnicas (un "servicio de datos", un "servicio de notificaciones", un "servicio de API") o a granularidad por entidad. Ambos producen un *monolito distribuido*: servicios que deben liberarse juntos, comparten datos entrelazados y se comunican de forma síncrona por la red — heredando el costo de la distribución sin su beneficio de autonomía. Esto contradice directamente la inmunización contra anti-patrones de Evolith y su disciplina de bounded contexts ([ADR-0031](./0031-schema-per-context-domain-event-catalog.es.md)).

El problema que requiere una decisión: **en F3, ¿alrededor de qué eje se agrupan los microservicios, y cómo se gobierna esa alineación durante el modelado de dominio y la revisión?**

## Objetivo y Alcance

**Objetivo:** Adoptar la Arquitectura de Microservicios Orientada a Dominios (DOMA) como el principio organizador canónico para la descomposición en F3 — los servicios se agrupan alrededor de dominios de negocio acotados, no de capas técnicas ni de entidades individuales — y ligar ese principio al estándar de diseño de modelos de dominio y a sus gates de revisión.

**En alcance:**
- La regla agnóstica para agrupar servicios por dominio de negocio en F3.
- Integración de DOMA en el estándar de diseño de modelos de dominio (el artefacto de modelo DDD).
- Un checkpoint de revisión en los gates de Fase 2/Fase 3 y en el portal de Architecture Intelligence.

**Fuera de alcance:**
- El runtime, mesh o transporte concreto (un ADR de Plataforma companion registra cualquier selección de herramienta).
- Forzar descomposición prematura: los productos F1/F2 permanecen como monolito modular hasta cumplir los criterios de extraction-readiness de [ADR-0045](./0045-microservice-extraction-readiness-criteria.es.md).

## Opciones Consideradas

- **Servicios orientados a capas** — agrupar servicios por preocupación técnica (datos, API, workflow). Rechazado: maximiza el acoplamiento entre servicios y el fan-out síncrono; produce un monolito distribuido.
- **Servicios orientados a entidad/CRUD** — un servicio por aggregate/entidad. Rechazado: explota el número de servicios, fragmenta la consistencia transaccional y dispersa una única capacidad de negocio entre muchos desplegables.
- **Arquitectura de Microservicios Orientada a Dominios (DOMA)** — agrupar servicios en dominios (capas de capacidades relacionadas) alineados con bounded contexts, con un gateway delgado y contract-first por dominio y eventos asíncronos entre dominios. Adoptado.

## Decisión y Justificación

Evolith adopta **DOMA** como el principio de descomposición en F3:

1. **Los dominios son la unidad de agrupación.** Cada microservicio pertenece a exactamente un dominio de negocio acotado (p.ej. Discovery, Construction, Release). Un dominio puede contener varios servicios colaborativos, pero el dominio — no el servicio — es la frontera de autonomía y propiedad.
2. **Los bounded contexts mapean a dominios.** El mapa de bounded contexts DDD autorado durante el Diseño es la fuente de verdad para las fronteras de dominio; la extracción DOMA nunca cruza la frontera de un contexto.
3. **Gateways de dominio contract-first.** Cada dominio expone un contrato estable y versionado; las llamadas intra-dominio pueden ser directas, la interacción cross-dominio es asíncrona y orientada a eventos, nunca una cadena síncrona cross-dominio.
4. **La propiedad de datos sigue al dominio.** Sin joins cross-dominio ni esquemas compartidos — consistente con schema-per-context ([ADR-0031](./0031-schema-per-context-domain-event-catalog.es.md)).

Justificación: agrupar por dominio mantiene la propiedad de alta cohesión/bajo acoplamiento del monolito modular mientras gana despliegue independiente donde la demanda lo requiere, y reutiliza la maquinaria DDD y de bounded contexts existente de Evolith en vez de inventar una taxonomía paralela.

## Evidencia y Criterios de Evaluación

Las opciones se juzgaron contra: acoplamiento (llamadas síncronas entre servicios), despliegue independiente, radio de impacto del cambio, claridad de propiedad de datos y reutilización de primitivas existentes de Evolith.

- DOMA puntúa más alto en acoplamiento y despliegue preservando la claridad de propiedad de datos. Las opciones orientadas a capa y a entidad fallan los criterios de acoplamiento y radio de impacto.
- Prior art: la arquitectura de microservicios orientada a dominios de Uber, los patrones strangler-fig y bounded-context ya canónicos en Evolith ([ADR-0047](./0047-architectural-patterns-monolith-soa-microservices.es.md)), y los criterios de extraction-readiness ([ADR-0045](./0045-microservice-extraction-readiness-criteria.es.md)).

## Consecuencias, Riesgos y Trade-offs

**Positivas**
- Las fronteras de microservicio se vuelven predecibles y revisables: deben coincidir con un bounded context.
- Menor acoplamiento entre servicios y menor radio de impacto; el anti-patrón de monolito distribuido se previene activamente.
- El modelo de dominio autorado en Diseño dirige directamente la topología F3 — un artefacto, dos usos.

**Negativas / Riesgos**
- Un dominio que crece demasiado puede aún ocultar acoplamiento interno; mitigado con auditorías periódicas de frontera y los criterios de extraction-readiness.
- Requiere disciplina para mantener asíncrona la interacción cross-dominio; mitigado con la regla del contrato de gateway de dominio y el checkpoint de revisión.

**Trade-offs**
- DOMA acepta más rigor de modelado de dominio por adelantado a cambio de una descomposición posterior más barata y segura. Los productos que nunca llegan a F3 no cargan costo de runtime — el principio solo gobierna *cuándo* se descomponen.

## Referencias

- [ADR-0047 Patrones Arquitectónicos: Monolito, SOA, Microservicios](./0047-architectural-patterns-monolith-soa-microservices.es.md)
- [ADR-0045 Criterios de Extraction-Readiness de Microservicios](./0045-microservice-extraction-readiness-criteria.es.md)
- [ADR-0031 Schema por Contexto y Catálogo de Eventos de Dominio](./0031-schema-per-context-domain-event-catalog.es.md)
- [Template de Modelo DDD](../../../sdlc/04-artifact-templates/ddd-model-template.es.md)
- [Portal de Architecture Intelligence](../../../../../product/research/architecture-intelligence/README.es.md)

## Decisiones y Estándares Relacionados

- [ADR-0006 Transición a Microservicios vía Patrón Sidecar](./0006-microservices-transition-sidecar-pattern.es.md)
- [ADR-0015 Arquitectura Orientada a Eventos (intra-dominio)](./0015-event-driven-architecture-intra-domain.es.md)
- [ADR-0029 Biblioteca de Primitivas DDD Tácticas](../nodejs/0029-tactical-ddd-primitives-library.es.md)
- [SDLC Quality Gates](../../../sdlc/quality-gates.es.md)
- [Patrón DOMA — Architecture Intelligence](../../../../../product/research/architecture-intelligence/patterns/domain-oriented-microservice-architecture.es.md)

---
[Volver al Registro de ADRs](../README.es.md)

> **Agent Signature:** Architect Agent
