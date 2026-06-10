# Arquitectura AI-Augmented

> **Navegación Bilingüe:** [English Version](../../standards/ai-augmented/README.md)

## ¿Qué es esto?
Esta sección es una extensión opcional de la arquitectura de referencia corporativa para equipos que buscan incorporar agentes de IA. Define estándares para aprovechar agentes autónomos, engineering de harness, Model Context Protocol (MCP), herramientas y flujos de trabajo aumentados por IA.

## ¿Para quién es?
Diseñado para equipos de producto e ingenieros que desean integrar agentes de IA de manera controlada, segura y escalable en su ciclo de desarrollo o en las funcionalidades de sus productos finales.

## Nota de Adopción Obligatoria
> [!IMPORTANT]
> **Esta sección es completamente opcional.** Ningún producto está obligado a adoptarla. Los estándares corporativos base no dependen de ella, y el ecosistema opera perfectamente sin implementarla. La adopción es Estrictamente Opt-In.

---

## Mapa de Navegación

| Módulo | Descripción |
|--------|-------------|
| **[Referencia de Frameworks](./frameworks/README.es.md)** | **Documentación del framework AI-DD portátil — habilidades, reglas y agentes BMAD-METHOD listos para copiar a cualquier repositorio.** |
| [00 - Visión General](./00-overview/what-is-this.es.md) | Introducción, guía de adopción de 3 niveles y glosario básico de patrones agentic. |
| [01 - Harness Engineering](./01-harness-engineering/harness-reference.es.md) | Diseño del entorno que envuelve el modelo: pilares, estándar AGENTS.md y validación por capas. |
| [02 - Integración MCP](./02-mcp-integration/mcp-overview.es.md) | Model Context Protocol para estandarizar la conexión del agente con servicios y datos. |
| [03 - Catálogo de Herramientas](./03-tools-catalog/tool-design-principles.es.md) | Principios de diseño para herramientas determinísticas consumibles por agentes autónomos. |
| [04 - Modelos y Selección](./04-models-and-selection/model-selection-guide.es.md) | Criterios de gobernanza, costos y selección del modelo correcto para cada caso de uso. |
| [05 - Patrones Agentic](./05-agentic-patterns/patterns-overview.es.md) | Catálogo de patrones de diseño para agente único, multi-agente y planificación dinámica. |
| [06 - ADRs de IA](./06-adrs/README.es.md) | Registro de Decisiones Arquitectónicas específicas del ecosistema agentic. |
| [07 - Modelo de Madurez](./07-maturity-model/ai-maturity-matrix.es.md) | Matriz de evaluación de madurez agentic a través de 5 dimensiones operacionales. |
| **[08 - Asistente de Arquitectura IA](./08-architecture-ai-assistant/README.es.md)** | **Estrategia para transformar el conocimiento de Evolith en el AI Arquitecto Principal empresarial — ingestión RAG, ecosistema de agentes, evaluación de Harness, guardrails, roadmap.** |

---

## Decisiones Arquitectónicas (ADRs de IA)
- [ADR-AI-001: Estrategia de Harness](./06-adrs/adr-ai-001-harness-strategy.es.md)
- [ADR-AI-002: Estándar MCP](./06-adrs/adr-ai-002-mcp-as-integration-standard.es.md)
- [ADR-AI-003: Criterios de Selección de Modelos](./06-adrs/adr-ai-003-model-selection-criteria.es.md)
- [ADR-AI-004: Gobernanza AGENTS.md](./06-adrs/adr-ai-004-agents-md-governance.md)
- [ADR-AI-005: Política de Humano en el Circuito](./06-adrs/adr-ai-005-human-in-the-loop-policy.es.md)

---
[Volver al Nivel Superior](../README.es.md)