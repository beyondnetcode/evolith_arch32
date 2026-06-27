# Guia de Resiliencia de IA Agentica

> **Navegacion bilingue:** [Version en ingles](./resilience.md)

## Semantica de Fallo

La IA agentica falla cerrado. Un timeout, cancelacion, fallo de evaluacion de politica, falta de procedencia, schema de herramienta invalido, aprobacion no disponible o violacion de sandbox deniega la accion. El llamador recibe un resultado acotado y puede elegir un respaldo humano o determinista; el agente no obtiene una capacidad mas amplia.

## Contencion de Recursos

Usa ejecucion efimera y aplica los limites de duracion, memoria y CPU de `agent.config.json`. Encola o rechaza trabajo cuando se agote la capacidad de concurrencia o dependencia. La cancelacion debe detener el trabajo de herramienta posterior donde la herramienta lo soporte y registrar el estado final en evidencia correlacionada.

## Aislamiento de Dependencias

Las herramientas son dependencias acotadas de forma independiente. Aplica timeout por herramienta, reintenta solo operaciones de lectura idempotentes bajo presupuesto finito y abre circuito para herramientas no saludables. Nunca reintentes una accion mutativa salvo que el contrato de herramienta proporcione una clave de idempotencia y la aprobacion siga vigente para esa accion exacta.

## Recuperacion

Recupera reproduciendo solo pasos deterministas aprobados y respaldados por evidencia. Readquiere contexto con validacion de procedencia; no reproduzcas prompts crudos ni salida de herramienta no validada como autoridad. Un respaldo humano debe usar el mismo limite de dominio y auditoria que la accion automatizada.

## Verificacion de Resiliencia

Los fixtures negativos deben mostrar comportamiento bloqueante para limites de recursos, politica, contexto y controles de auditoria invalidos. Ejercita timeout, indisponibilidad de herramienta, indisponibilidad de aprobacion y cancelacion en las pruebas de integracion del adoptante antes de uso operativo.

---
[Volver al Perfil de IA Agentica](./README.es.md)
