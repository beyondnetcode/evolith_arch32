# ADR-0081: Limite de Aislamiento de Sandbox para IA Agentica

> **Navegacion bilingue:** [Version en ingles](./0081-agentic-ai-sandbox-isolation.md)

## Estado

Accepted

<!-- implementation-status: none -->
> **Estado de implementacion en este repositorio: ninguna** (verificado 2026-07-28).
> Este ADR es un estandar normativo publicado *para los satelites*; esta Accepted como decision,
> no como capacidad entregada. Nada en Evolith Core lo implementa, y nada lo hace cumplir.
> `sandbox.mode` aparece en `src/` exactamente dos veces, y ninguna es una implementacion de esta decision: `core-domain/.../handlers/architecture/agent-rules.ts` **evalua el** `agent.config.json` **de un satelite**, y `rulesets/topologies/agentic-ai/agentic-ai.rules.json` declara esa regla. El propio Agent Runtime de Evolith hace lo contrario de lo que este ADR manda: `packages/agent-runtime/src/adapters/harness/harness-process.adapter.ts` lanza cada proceso de capacidad con `{ ...process.env }`, de modo que un script de capacidad hereda `AGENT_RUNTIME_CORE_TOKEN`, el token del tracker y `EVOLITH_RAG_PG_URL` — credenciales ambientales que este ADR prohibe.
> El ruleset generado `rulesets/adr/generated/adr-0081-agentic-ai-sandbox-isolation-boundary.rules.json` lleva una unica regla `adr-conformance` cuyo propio texto dice que los chequeos concretos estan aun "to be wired into the harness", y ningun evaluador atiende esa categoria: `rg "adr-conformance" src/` solo encuentra los propios archivos generados. Seguimiento en GT-607.

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

- [Guia de Seguridad MCP](../../../foundations/common-rules/ai-augmented/02-mcp-integration/mcp-security.es.md)
- [Perfil de Topologia de IA Agentica](../../../../../src/rulesets/topologies/agentic-ai/README.es.md)

## Decisiones y Estandares Relacionados

- [ADR-0069: Integracion del Protocolo de Contexto de Agente IA](./0069-ai-agent-context-protocol-integration.es.md)
- [ADR-AI-001: Ingenieria de Harness](../../../foundations/common-rules/ai-augmented/06-adrs/adr-ai-001-harness-strategy.es.md)
- [ADR-AI-005: Politica Human-in-the-Loop](../../../foundations/common-rules/ai-augmented/06-adrs/adr-ai-005-human-in-the-loop-policy.es.md)

---
[Volver al Indice de ADRs Core](./README.es.md)

> **Agent Signature:** Architect Agent
