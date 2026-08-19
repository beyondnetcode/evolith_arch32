# Agentes de Intake y Discovery (Fases 00 y 01.1)

> **Navegación Bilingüe:** [English Version](./discovery-agents.md)

Los siguientes agentes soportan el Architecture Planning Gate (Fase 00). Cada agente sigue la regla de Calidad de Actualización de Agente: alcance, entradas, salidas, restricciones, handoff, checklist de validación y formato de auditoría.

| Agente | Alcance | Entradas | Salidas | Handoff A |
|--------|---------|----------|---------|-----------|
| **Architecture Plan Interpreter** | Analizar requerimientos crudos para generar un Architecture Plan para evaluación en Gate 0 | Prompt de requerimiento de negocio crudo, ADRs, blueprints | Architecture Plan Draft (JSON/YAML) | OPA Evaluation Engine / Aprobador Humano |
| **Business Discovery Agent** | Extraer declaración de problema, propuesta de valor y contexto de negocio de stakeholders o prompts | Disparador de negocio, entrevistas con stakeholders, contexto de mercado | Discovery Knowledge Brief (borrador) | Product Framing Agent |
| **Product Framing Agent** | Estructurar contexto del dominio, identificar actores y definir límites de alcance | Knowledge Brief, conocimiento del dominio, visión del producto | Knowledge Brief (validado), Mapa de Capacidades (semilla) | Capability Modeling Agent |
| **Capability Modeling Agent** | Descomponer dominio en capacidades con prioridad y dependencias | Knowledge Brief validado, modelo de dominio, prioridades de stakeholders | Mapa de Capacidades | Epic Discovery Agent |
| **Epic Discovery Agent** | Mapear capacidades a candidatos de épica con prioridad MoSCoW y estimación de tamaño | Mapa de Capacidades, prioridades de negocio, restricciones técnicas | Matriz de Candidatos a Épica | Story Slicing Agent |
| **Story Slicing Agent** | Crear semillas mínimas de historia de candidatos de épica con borradores de criterios de aceptación | Matriz de Candidatos a Épica, roles de usuario, expectativas de comportamiento | Banco de Semillas de Historia | Acceptance Criteria Agent |
| **Acceptance Criteria Agent** | Validar y refinar criterios de aceptación para semillas de historia, asegurar testabilidad | Banco de Semillas de Historia, reglas de dominio, estándares de calidad | Banco de Semillas de Historia (refinado) | Architecture Discovery Agent |
| **Architecture Discovery Agent** | Identificar restricciones técnicas, candidatos a ADR, spikes y enablers | Knowledge Brief, Mapa de Capacidades, contexto técnico | Sección de restricciones arquitectónicas, Candidatos a Decisión | Discovery Gate Agent |
| **Discovery Gate Agent** | Validar suficiencia del conocimiento contra requisitos de nivel de adopción | Todos los artefactos 01.1, nivel de adopción, checklist de calidad | Gate de Preparación de Discovery (PASS/CONDITIONAL/FAIL) | Siguiente fase (Ballpark / Backlog / Diseño) |
| **Knowledge Drift Agent** | Detectar cuándo cambios de código ocurren sin actualizaciones de conocimiento correspondientes | git diff, globs de ownership de artefactos de conocimiento, Discovery Context Pack | Señales de drift (FYI, no bloqueante) | Owner de la fase actual |

**Restricciones comunes para todos los Agentes de Discovery:**
- No deben crear épicas, historias o ítems de backlog — solo artefactos de conocimiento
- Deben mantener IDs de trazabilidad en todas las salidas
- Deben producir salidas bilingües cuando el repositorio lo requiera
- No deben introducir dependencias de vendor o framework
- Deben declarar nivel de adopción en todos los artefactos
