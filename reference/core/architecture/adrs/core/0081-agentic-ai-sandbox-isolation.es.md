# ADR-0081: Limite de Aislamiento de Sandbox para IA Agentica

> **Navegacion bilingue:** [Version en ingles](./0081-agentic-ai-sandbox-isolation.md)

## Estado

Aceptado

## Fecha

2026-06-20

## Contexto y Problema

Un agente puede invocar herramientas, procesar contenido no confiable y producir comandos más rápido que un ciclo de revision humana. Declarar que existe un sandbox no es suficiente: los satelites necesitan una linea base portable para limites de filesystem, proceso, red, recursos, secretos y limpieza.

## Objetivo y Alcance

Definir el limite minimo de aislamiento agnostico de runtime para una carga de trabajo de IA agentica. Este ADR gobierna entornos de ejecucion y herramientas delegadas; no selecciona un runtime de contenedores, proveedor cloud ni framework de agentes.

## Opciones Consideradas

- **Seleccionada: limite de ejecucion aislado y de minimo privilegio.** Cada invocacion de herramienta se ejecuta con restricciones explicitas de filesystem, proceso, red, recursos y secretos.
- **Ejecucion en proceso host.** Rechazada porque una vulneracion del agente hereda credenciales de desarrollo o servicio.
- **Estandar de sandbox especifico de framework.** Rechazado porque haria que la regla corporativa dependa de un ecosistema de herramientas volatil.

## Decision y Fundamentacion

La ejecucion de herramientas de IA agentica DEBE ocurrir en un limite aislado. El limite DEBE denegar por defecto acceso de red y proceso, permitir solo allowlists explicitas, montar almacenamiento escribible solo donde sea necesario, usar estado de ejecucion efimero, imponer limites de tiempo y recursos, y evitar credenciales ambientales. Los secretos se delegan para una capacidad y una vida util, nunca se copian a prompts o archivos durables del workspace.

El contrato de topologia registra la postura requerida mediante `sandbox.mode`, `sandbox.network` y `sandbox.process`. Los perfiles de runtime pueden definir mecanismos mas estrictos, como contenedores, microVMs o workers restringidos.

## Evidencia y Criterios de Evaluacion

La opcion seleccionada se evalua por si evita que un prompt o respuesta de herramienta comprometidos ganen acceso ambiental al host, exfiltren datos por egress sin restricciones, persistan estado tras una ejecucion o consuman recursos sin limite. Sigue siendo valida si cambia la tecnologia de sandbox elegida.

## Consecuencias, Riesgos y Trade-offs

- **Positivo:** Limita el radio de impacto y hace explicita la revision de autorizacion.
- **Negativo:** Algunas herramientas requieren adaptadores para acceso controlado a filesystem, red o secretos.
- **Trade-off:** La comodidad de ejecucion local sin restricciones se intercambia por controles reproducibles.

## Referencias

- [Guia de Seguridad MCP](../../../sdlc/standards/ai-augmented/02-mcp-integration/mcp-security.es.md)
- [Perfil de Topologia de IA Agentica](../../topologies/ai/agentic-ai/README.es.md)

## Decisiones y Estandares Relacionados

- [ADR-0069: Integracion del Protocolo de Contexto de Agente IA](./0069-ai-agent-context-protocol-integration.es.md)
- [ADR-AI-001: Ingenieria de Harness](../../../sdlc/standards/ai-augmented/06-adrs/adr-ai-001-harness-strategy.es.md)
- [ADR-AI-005: Politica Human-in-the-Loop](../../../sdlc/standards/ai-augmented/06-adrs/adr-ai-005-human-in-the-loop-policy.es.md)

---
[Volver al Indice de ADRs Core](./README.es.md)

> **Agent Signature:** Architect Agent
