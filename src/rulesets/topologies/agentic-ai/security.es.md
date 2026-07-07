# Guia de Seguridad de IA Agentica

> **Navegacion bilingue:** [Version en ingles](./security.md)

## Limite de Confianza

Trata prompts, documentos recuperados, entrada de usuario y salida de herramientas como entradas distintas. El contenido no confiable es solo dato: no puede seleccionar herramientas, alterar capacidades, omitir aprobacion ni modificar la implementacion determinista. Se requieren procedencia y validacion de schema antes de usar el resultado de una herramienta en el flujo.

## Aislamiento de Ejecucion

Toda llamada de herramienta se ejecuta mediante el sandbox aislado definido por `agent.config.json`. El sandbox DEBE limitar acceso de red y proceso, ejecutarse de forma efimera y aplicar limites de duracion, memoria y CPU. Se prohibe acceso directo a repositorio, base de datos, proceso host, almacen de credenciales o red sin restricciones.

## Autorizacion y Secretos

Una identidad de agente y una capacidad declarada son prerequisitos, no autorizacion general. La delegacion debe ser acotada y expirable. Las herramientas mutativas requieren una decision de aprobacion registrada antes de ejecutarse. Los secretos permanecen fuera de prompts y contexto; las herramientas recuperan solo la credencial de minimo privilegio necesaria para su accion.

## Respuesta de Control

Ante fallo de politica, procedencia, schema, aprobacion o control de sandbox, deniega la accion, conserva evidencia correlacionada y devuelve un fallo acotado al llamador. No reintentes ampliando permisos ni sustituyendo una herramienta no revisada.

## Autoridad

Aplica conjuntamente [ADR-0081](../../../../reference/core/architecture/adrs/core/0081-agentic-ai-sandbox-isolation.es.md), [ADR-0082](../../../../reference/core/architecture/adrs/core/0082-agentic-ai-trust-boundary.es.md) y [ADR-0083](../../../../reference/core/architecture/adrs/core/0083-agentic-ai-action-authorization-audit.es.md). Los controles ejecutables son AAI-R01 a AAI-R07 en el [ruleset](./agentic-ai.rules.json) y la [politica OPA](./agentic-ai.rego).

---
[Volver al Perfil de IA Agentica](./README.es.md)
