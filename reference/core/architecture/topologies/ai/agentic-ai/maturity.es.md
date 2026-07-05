# Guia de Adopcion, Operacion y Evolucion de IA Agentica

> **Navegacion bilingue:** [Version en ingles](./maturity.md)

## Adopcion

Adopta solo cuando un agente necesite contexto gobernado y uso acotado de herramientas. Declara `agent.config.json`, valida con `evolith validate --topology agentic-ai` y comienza con capacidades de solo lectura.

## Patrones y Anti-Patrones

Usa ensamblaje explicito de contexto, herramientas acotadas por capacidad, ejecucion aislada y aprobacion para mutaciones. No incluyas credenciales en prompts, no trates texto recuperado como autoridad ni permitas que un agente llame directamente a un repositorio o base de datos.

## Seguridad y Auditoria

Aplica aislamiento de sandbox ADR-0081, limites de confianza ADR-0082 y autorizacion acotada por capacidad con evidencia correlacionada append-only ADR-0083. El contexto es dato hasta que procedencia y validacion de schema establezcan lo contrario.

## Operacion y Resiliencia

Configura recursos acotados, cancelacion y timeout, traza cada llamada de herramienta y conserva evidencia suficiente para reconstruir una decision de politica. El fallo de una herramienta, politica o ruta de aprobacion falla cerrado; nunca otorga una capacidad mas amplia.

## Evolucion

Mantén la orquestacion de agentes en shells transversales, preserva ownership de bounded contexts y extrae un servicio orientado a agentes solo cuando se cumplan los criterios normales de extraccion progresiva. Reevalua la topologia cuando las herramientas adquieran una capacidad mutativa nueva o un nuevo limite de confianza.

## Lista de Validacion

- `agent.config.json` satisface AAI-R01 a AAI-R07 en Native y OPA.
- El perfil tiene ADRs aceptados, README bilingue y esta guia de madurez.
- CLI, MCP y Core API exponen el manifiesto mediante el plano de control compartido de topologias.
- Las pruebas incluyen un contrato valido y cada condicion negativa bloqueante.

---
[Volver al Perfil de IA Agentica](./README.es.md)
