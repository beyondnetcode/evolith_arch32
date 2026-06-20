# ADR-0058: AI-Consumable Architecture Knowledge


---

## Status
Aceptado
## Context
Evolith está destinado a guiar a los humanos y a los agentes de ingeniería asistidos por IA. Las herramientas de inteligencia artificial como Claude, Codex, Copilot, Cursor y Harness Agents requieren un conocimiento de arquitectura estructurado, estable y semánticamente claro para operar de manera segura.

Si la documentación es ambigua, obsoleta, no estructurada o desconectada de los ADR, los agentes de IA pueden generar código o recomendaciones que violen el estándar de arquitectura.
## Decision
Evolith preparará conocimientos de arquitectura seleccionados para el consumo de IA utilizando una estructura explícita, una taxonomía estable y enlaces rastreables a artefactos autorizados.

El conocimiento consumible por IA puede incluir:

- ADR
- estándares
- planos
- patrones canónicos
- Tarjetas de patrones de Inteligencia de Arquitectura
- Entradas de radar de arquitectura.
- Evidencia aplicada UMS
## Required Structure
Los documentos consumibles de IA deben incluir:

- título
- propósito
- alcance
- decisión o recomendación
- compensaciones
- reglas de validación
- ADR relacionados
- normas relacionadas
- enlaces a fuentes autorizadas
## Governance Rules
Los agentes de IA no deben inventar reglas arquitectónicas.

Los agentes de IA deben:

- respetar la taxonomía del repositorio
- distinguir los estándares universales de la evidencia específica de un producto
- artefactos de control de referencia
- proponer ADR cuando se necesite autoridad reutilizable
- informar incertidumbre o contexto faltante
## Consequences

### Positive
- Mejora la calidad del desarrollo asistido por IA.
- Reduce la deriva arquitectónica.
- Hace que los estándares sean más fáciles de consultar y explicar.
- Soporta asistentes de arquitectura de empresas privadas.
### Negative / Risks
- Requiere disciplina de documentación adicional.
- Una indexación deficiente puede amplificar el contenido desactualizado.
- La revisión humana sigue siendo obligatoria para las decisiones promovidas.
## Related Artifacts
- [Estrategia de conocimiento de IA](../../../knowledge/architecture-intelligence/ai/ai-knowledge-strategy.md)
- [Estándares aumentados con IA](../../../governance/standards/ai-augmented/README.md)
- [Taxonomía del repositorio](../../../governance/standards/repository-taxonomy.md)
## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde context is unavailable, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** AI-Consumable Architecture Knowledge
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).


> **Agent Signature:** Architect Agent
