# ADR 0104: Puerto de Adaptador de Interacción para Evolith Agent Runtime

**Date:** 2026-07-02
**Status:** Accepted
**Context:** AI-Augmented / Smart CLI / Agent Runtime

## Context and Problem Statement
El Evolith Agent Runtime necesita soportar múltiples interfaces de usuario sin problemas, específicamente Smart CLI (modo comando), Smart CLI (modo chat), Hermes Agent Chat Box y potencialmente Model Context Protocol (MCP). Cada interfaz tiene diferentes contextos de seguridad, comportamientos de ejecución por defecto (por ejemplo, el chat interactivo por defecto es `dry_run = true`), y requerimientos de interpretación de intenciones. El runtime debe aplicar las reglas de Gobernanza Core de forma segura a través de todas estas interfaces sin acoplar la lógica de orquestación a los detalles de la interfaz de usuario.

## Decision
Introducimos el `InteractionAdapterPort` como el punto de entrada unificado para todas las interacciones de las interfaces con el `AgentRuntimeService`.

1. **Extensión de AgentRuntimeRequestWire:** El contrato base de la solicitud ahora incluye `source_interface`, que define el origen (`smart_cli_command`, `smart_cli_chat`, `hermes_agent_chatbox`, etc.).
2. **Adaptadores de Interacción:** Cada interfaz implementa su propio adaptador (e.g., `SmartCliCommandInteractionAdapter`, `HermesChatBoxInteractionAdapter`) que actúa como capa de traducción límite. Estos adaptadores mapean entradas específicas de la interfaz hacia el `AgentRuntimeRequest` canónico e imponen valores por defecto del dominio (e.g., forzar `dry_run` para chat si no se provee explícitamente).
3. **Mejora de Gobernanza:** La postura de gobernanza (`GovernancePosture`) de las capacidades (`SkillDescriptor`) ahora soporta `allowedSourceInterfaces`. El `SkillRegistry` valida estos permisos durante la resolución, asegurando que operaciones críticas (e.g., una evaluación destructiva del Core Engine) no puedan ser ejecutadas desde una interfaz no autorizada como un chat box pasivo.
4. **Orquestación de Agent Runtime:** El `AgentRuntimeService` realiza una validación secundaria en `sourceInterface` y asegura un mensaje de respaldo claro si ocurre una interacción de chat cuando el motor de razonamiento (Hermes) está deshabilitado.

## Consequences

**Positive:**
- **Desacoplamiento:** La Core API y el Agent Runtime se mantienen estrictamente sin estado y agnósticos a la interfaz de usuario.
- **Seguridad:** Las interfaces de chat pueden explorar intenciones de manera segura sin eludir el HITL (Human-in-the-Loop) o modificar datos inadvertidamente, ya que pueden ser limitadas por `allowedSourceInterfaces` y un `dry_run` forzado.
- **Flexibilidad:** Nuevos clientes conversacionales (e.g., MCP) pueden integrarse fácilmente implementando un nuevo adaptador.

**Negative:**
- **Complejidad:** Añade una capa de mapeo antes de que las peticiones lleguen al runtime, requiriendo que nuevas capacidades declaren explícitamente las interfaces origen permitidas si desean restringir su acceso.

## References
- ADR-0101: Stateless Core Evaluation Engine
- ADR-0073: Evaluation Envelope Standard
