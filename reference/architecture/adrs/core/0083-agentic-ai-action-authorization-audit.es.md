# ADR-0083: Autorizacion y Auditoria de Acciones de IA Agentica

> **Navegacion bilingue:** [Version en ingles](./0083-agentic-ai-action-authorization-audit.md)

## Estado

Aceptado

## Fecha

2026-06-20

## Contexto y Problema

La identidad de un agente no basta para autorizar una accion. Necesita una capacidad delegada de alcance reducido, una ruta de aprobacion para mutaciones y evidencia durable de lo solicitado, autorizado, ejecutado y retornado. Sin este limite, los agentes se convierten en confused deputies con credenciales excesivas y efectos secundarios no verificables.

## Objetivo y Alcance

Definir requisitos de autorizacion y auditoria para acciones realizadas mediante una topologia de IA agentica. Este ADR cubre llamadas a herramientas y credenciales delegadas; no reemplaza la autorizacion de dominio ni la propiedad de workflows de negocio.

## Opciones Consideradas

- **Seleccionada: delegacion acotada por capacidades con evidencia append-only.** Las acciones se autorizan independientemente del prompt y se registran como eventos inmutables.
- **Credencial de servicio compartida para todas las herramientas.** Rechazada porque no puede expresar minimo privilegio ni atribuir una accion.
- **Logs de auditoria sin controles de aprobacion.** Rechazada porque detectar una accion irreversible despues de ejecutarla es insuficiente.

## Decision y Fundamentacion

Toda accion de agente DEBE llevar una identidad atribuible, identificador de correlacion, capacidad solicitada, alcance objetivo, decision de politica, referencia de aprobacion cuando corresponda, resultado y evidencia acotada de entradas y salidas. Las herramientas mutativas requieren `approval-required` antes de ejecutarse. Las credenciales DEBEN acotarse a una capacidad y expirar; ningun prompt, item de contexto o salida de herramienta puede otorgar una capacidad nueva.

La evidencia de acciones DEBE escribirse en un sink de auditoria append-only compatible con ADR-0016. La autorizacion de dominio sigue siendo el punto final de enforcement para transiciones de estado; el agente no puede evadir un `RequirementChecklist`, invariante de agregado ni politica de autorizacion de producto.

## Evidencia y Criterios de Evaluacion

La decision se evalua por si un auditor puede reconstruir quien solicito y aprobo una accion, que politica la permitio, que alcance se delego y si el resultado puede correlacionarse con eventos de dominio posteriores. Una accion de prueba sin aprobacion DEBE fallar antes de que ocurran efectos secundarios.

## Consecuencias, Riesgos y Trade-offs

- **Positivo:** Permite rendicion de cuentas, revocacion, analisis forense y automatizacion controlada.
- **Negativo:** Agrega integracion de autorizacion y auditoria a cada herramienta mutativa.
- **Trade-off:** El throughput autonomo se limita donde los efectos irreversibles requieren aprobacion.

## Referencias

- [Patron Human-in-the-Loop](../../../governance/standards/ai-augmented/05-agentic-patterns/human-in-the-loop.es.md)
- [Perfil de Topologia de IA Agentica](../../topologies/ai/agentic-ai/README.es.md)

## Decisiones y Estandares Relacionados

- [ADR-0016: Registro de Auditoria de Negocio Inmutable](./0016-immutable-business-audit-trail.es.md)
- [ADR-0069: Integracion del Protocolo de Contexto de Agente IA](./0069-ai-agent-context-protocol-integration.es.md)
- [ADR-0081: Limite de Aislamiento de Sandbox para IA Agentica](./0081-agentic-ai-sandbox-isolation.es.md)
- [ADR-0082: Limite de Confianza para Prompts, Contexto y Herramientas de IA Agentica](./0082-agentic-ai-trust-boundary.es.md)

---
[Volver al Indice de ADRs Core](./README.es.md)
