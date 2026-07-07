# Arquitectura de Microservicios Orientada a Dominios (DOMA)

## Source Inspiration

- Domain-Driven Design (bounded contexts y context mapping)
- Arquitectura de Microservicios Orientada a Dominios de Uber
- Prácticas de strangler-fig y extraction-readiness de microservicios
- Principio arquitectónico "agrupar por capacidad de negocio, no por capa técnica"

## Problem

Cuando un producto alcanza la etapa de microservicios F3, la descomposición suele derivar hacia capas técnicas (un servicio de datos, un servicio de API, un servicio de notificaciones) o un servicio por entidad. Ambos producen un *monolito distribuido*: servicios que se liberan juntos, comparten datos entrelazados y se comunican de forma síncrona por la red — el costo de la distribución sin su autonomía.

## Evolith Position

DOMA es el principio organizador canónico para la descomposición en F3. Está gobernado por [ADR-0076](../../../../reference/core/architecture/adrs/core/0076-domain-oriented-microservice-architecture.es.md) y ligado al estándar de diseño de modelos de dominio y a sus gates de revisión.

## Principle

- Agrupar microservicios en **dominios de negocio acotados**, no en capas técnicas ni entidades.
- El dominio — no el servicio individual — es la frontera de autonomía y propiedad.
- El mapa de bounded contexts DDD autorado en Diseño es la fuente de verdad para las fronteras de dominio; la extracción nunca cruza la frontera de un contexto.

## Allowed Integration

- Llamadas directas **dentro** de un dominio.
- Interacción asíncrona y orientada a eventos **entre** dominios, a través de un contrato de gateway de dominio estable y versionado.

## Forbidden Integration

- Cadenas de llamadas síncronas cross-dominio.
- Joins de base de datos cross-dominio o esquemas compartidos.
- Fronteras de servicio que parten un único bounded context.

## Benefits

- Fronteras de microservicio predecibles y revisables (deben coincidir con un bounded context).
- Menor acoplamiento entre servicios y menor radio de impacto.
- El modelo de dominio en tiempo de Diseño dirige directamente la topología F3 — un artefacto, dos usos.

## Tradeoffs

- Más rigor de modelado de dominio por adelantado a cambio de una descomposición posterior más barata y segura.
- Un dominio que crece demasiado puede aún ocultar acoplamiento interno; mitigado con auditorías periódicas de frontera y los criterios de extraction-readiness.

## AI Impact

Las herramientas asistidas por IA pueden validar una descomposición de servicios propuesta contra el mapa de bounded contexts, señalando cualquier servicio que cruce la frontera de un contexto o introduzca una dependencia síncrona cross-dominio.

## Related ADR Candidates

- ADR-0076: Arquitectura de Microservicios Orientada a Dominios (DOMA)
- ADR-0047: Patrones Arquitectónicos — Monolito, SOA, Microservicios
- ADR-0045: Criterios de Extraction-Readiness de Microservicios
- ADR-0031: Schema por Contexto y Catálogo de Eventos de Dominio

---

[Volver a Architecture Intelligence](../README.es.md)
