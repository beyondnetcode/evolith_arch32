# ADR-0057: Architecture Intelligence Catalog


---

## Status
Aceptado
## Fecha
2026-06-03

## Context
Evolith es un corpus de referencia de arquitectura progresiva. A medida que crece el ecosistema, los equipos necesitan una forma gobernada de capturar ideas arquitectónicas útiles de fuentes externas, como libros, charlas, vídeos, repositorios, experiencia de producción y lecciones de UMS.

Sin un catálogo controlado, las ideas externas se pueden copiar directamente al estándar sin contexto, análisis de compensaciones o validación.
## Decision
Evolith adopta un **Catálogo de Inteligencia de Arquitectura** en:```text
product/research/architecture-intelligence/
```Este catálogo sirve para:

- curar ideas arquitectónicas
- analizar compensaciones
- clasificar la madurez de adopción
- tarjetas de patrones de documentos
- conectar la inspiración externa con la gobernanza de Evolith
- preparar conocimientos seleccionados para la ingeniería asistida por IA
## Rules
Cada artefacto de Architecture Intelligence debe incluir:

- problema
- contexto
- recomendación
- compensaciones
- Posición de Evolith
- nivel de adopción
- Impacto de la IA cuando corresponda
- ADR relacionados o candidatos a ADR

Las ideas externas no son estándares por defecto. Un artículo del catálogo se vuelve normativo solo cuando se promociona a través de un ADR, estándar, modelo o patrón canónico aceptado.
## Consequences

### Positive
- Permite el aprendizaje arquitectónico controlado.
- Preserva Evolith como fuente de autoridad.
- Impide la copia incontrolada de prácticas externas.
- Mejora la calidad del conocimiento consumible por IA.
- Crea trazabilidad desde la idea hasta la decisión.
### Negative / Risks
- Requiere curación continua.
- Puede volverse ruidoso si no se filtran las ideas débiles.
- Requiere validación de enlaces, taxonomía y referencias ADR.
## Related Artifacts
- [Inteligencia de Arquitectura](../../../knowledge/architecture-intelligence/README.md)
- [Plantilla de tarjeta de patrón](../../../knowledge/architecture-intelligence/patterns/pattern-card-template.md)
- [Radar de Arquitectura](../../../knowledge/architecture-intelligence/tradeoffs/architecture-radar.md)
## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde context is unavailable, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Architecture Intelligence Catalog
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).


> **Agent Signature:** Architect Agent
