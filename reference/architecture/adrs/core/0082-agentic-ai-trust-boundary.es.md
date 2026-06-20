# ADR-0082: Limite de Confianza para Prompts, Contexto y Herramientas de IA Agentica

> **Navegacion bilingue:** [Version en ingles](./0082-agentic-ai-trust-boundary.md)

## Estado

Aceptado

## Fecha

2026-06-20

## Contexto y Problema

Un agente recibe instrucciones de prompts de sistema, entrada de usuario, documentos recuperados, salida de herramientas y contenido de repositorio. Tratar todas como igualmente confiables permite que un prompt injection indirecto o respuesta de herramienta comprometida anule politicas, revele datos o active acciones inseguras.

## Objetivo y Alcance

Definir un modelo de confianza portable que mantenga distintas la politica, los prompts, el contexto y la salida de herramientas. Este ADR aplica a agentes de ingenieria asistida por IA y de producto; no prescribe un sistema de retrieval ni proveedor de modelos concreto.

## Opciones Consideradas

- **Seleccionada: procedencia y clasificacion de confianza explicitas.** Toda entrada se clasifica antes de que pueda influir en una accion.
- **Salvaguardas solo en prompts.** Rechazadas porque el contexto no confiable puede imitar instrucciones.
- **Confiar en toda herramienta autenticada.** Rechazado porque la autenticacion no prueba que una respuesta sea correcta, vigente o segura de ejecutar.

## Decision y Fundamentacion

La politica de sistema y las reglas de aprobacion son autoritativas y no pueden ser modificadas por contexto recuperado, texto de usuario, contenido de repositorio o salida de herramientas. Los prompts se almacenan separados de las raices de implementacion. El contenido no confiable es dato, no instruccion; DEBE etiquetarse con fuente y nivel de confianza, restringirse a la tarea y excluirse de la elevacion de permisos.

Antes de que el resultado de una herramienta impulse una accion mutativa, el agente DEBE validar su schema y procedencia, y luego atravesar el limite de autorizacion definido por ADR-0083. Las decisiones criticas requieren verificacion independiente o revision humana.

## Evidencia y Criterios de Evaluacion

La decision se evalua por si un atacante puede lograr que texto no confiable altere politica, si las salidas de herramientas son trazables a una fuente y schema, y si una instruccion recuperada puede obtener una capacidad no delegada explicitamente. Estos controles son independientes del comportamiento del modelo.

## Consecuencias, Riesgos y Trade-offs

- **Positivo:** Reduce riesgos de prompt injection, confused deputy y resultados de herramienta fabricados.
- **Negativo:** Requiere etiquetado de entradas, validacion de schema y ensamblaje de contexto mas explicito.
- **Trade-off:** El agente recibe menos contexto ambiental a cambio de un limite de autorizacion confiable.

## Referencias

- [Guia de Seguridad MCP](../../../governance/standards/ai-augmented/02-mcp-integration/mcp-security.es.md)
- [Principios de Diseno de Herramientas](../../../governance/standards/ai-augmented/03-tools-catalog/tool-design-principles.es.md)

## Decisiones y Estandares Relacionados

- [ADR-0058: Conocimiento de Arquitectura Consumible por IA](./0058-ai-consumable-architecture-knowledge.es.md)
- [ADR-0069: Integracion del Protocolo de Contexto de Agente IA](./0069-ai-agent-context-protocol-integration.es.md)
- [ADR-0081: Limite de Aislamiento de Sandbox para IA Agentica](./0081-agentic-ai-sandbox-isolation.es.md)

---
[Volver al Indice de ADRs Core](./README.es.md)
