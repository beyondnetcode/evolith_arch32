# Guia de Adopcion de IA Agentica

> **Navegacion bilingue:** [Version en ingles](./adoption.md)

## Criterios de Entrada

Adopta IA agentica solo cuando un flujo acotado necesite razonamiento gobernado sobre contexto y uso acotado de herramientas. El bounded context propietario conserva la responsabilidad de la decision de negocio; el agente es un componente de ejecucion asistente, no un propietario de politica de dominio.

Antes de habilitar un agente, el adoptante DEBE identificar al propietario responsable, declarar un conjunto inicial de capacidades de solo lectura y registrar las herramientas, fuentes de contexto y autoridad de aprobacion. La topologia se compone con un perfil de eje progresivo; no reemplaza las reglas de extraccion ni de propiedad de datos de ese perfil.

## Secuencia de Adopcion

1. Crea `agent.config.json` con identidad estable, capacidades explicitas, sandbox aislado y politica mutativa `approval-required`.
2. Comienza con herramientas de solo lectura y contexto representativo que no sea de produccion.
3. Valida el contrato con `evolith validate --topology agentic-ai` mediante los motores Native y OPA.
4. Ejercita rutas de denegacion, timeout, contexto invalido y rechazo de aprobacion antes de habilitar una capacidad en un entorno superior.
5. Agrega una herramienta mutativa solo despues de revisar su propietario, delegacion acotada, ruta de aprobacion y evidencia append-only correlacionada.

## Lista de Adopcion

- Hay un propietario de bounded context y un propietario de herramienta identificados.
- Las fuentes de contexto tienen procedencia y clasificacion declaradas.
- Las fuentes de prompts y las raices deterministas de implementacion estan separadas.
- El sandbox tiene autoridad finita de CPU, memoria, duracion, proceso y red.
- Las herramientas mutativas fallan cerrado cuando falta aprobacion o evidencia de politica.
- Fixtures validos e invalidos bloqueantes cubren el contrato previsto.

## Salida y No Adopcion

No adoptes esta topologia para trabajo determinista que un servicio de aplicacion normal puede realizar, para flujos sin un limite seguro de herramientas o donde no se pueda retener evidencia y aprobacion. Deshabilita una capacidad cuando ya no esten disponibles su evidencia, propietario, control de sandbox o ruta de aprobacion requeridos.

## Guia Relacionada

Lee la [guia de seguridad](./security.es.md), [guia de operacion](./operations.es.md) y [guia de evolucion](./evolution.es.md) antes de la adopcion en produccion. [ADR-0081](../../../adrs/core/0081-agentic-ai-sandbox-isolation.es.md), [ADR-0082](../../../adrs/core/0082-agentic-ai-trust-boundary.es.md) y [ADR-0083](../../../adrs/core/0083-agentic-ai-action-authorization-audit.es.md) son autoridad obligatoria.

---
[Volver al Perfil de IA Agentica](./README.es.md)
