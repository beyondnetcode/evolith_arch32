# AI-Augmented Maturity Matrix


---

## Matrix 3 Levels x 5 Dimensions
| Dimensión | Nivel 1: asistido por IA | Nivel 2: Integrado con IA | Nivel 3: Orquestado por IA |
| :--- | :--- | :--- | :--- |
| **Documentación** | `AGENTS.md` presente en la raíz con reglas y comandos básicos del equipo. | Servidores MCP internos autodocumentados enumerados oficialmente en el catálogo de herramientas corporativo. | Patrones multiagente con orquestadores diagramados en C4 y ADR específicos de cada agente. |
| **Herramientas** | Uso pasivo de herramientas IDE (Claude Code, Cursor, GitHub Copilot). | El producto expone sus propias API como servidores MCP consumidos por los modelos. | Sistema con ciclo agente de llamada de herramientas recursivo completo y memoria semántica. |
| **Verificación** | Presencia de "ganchos de confirmación previa" y linter post-edición local automatizado. | CI Pipeline ejecuta pruebas automatizadas (evaluaciones) que validan que los resultados de LLM no rompan los contratos. | Agentes de verificación dedicados patrullan el ecosistema y auditan anomalías en segundo plano. |
| **Modelos** | Uso gratuito de modelos autorizados utilizando claves API de desarrollador individuales. | Selección de modelo formal a través de ADR corporativo basado en benchmarks y costo por token. | Estrategia híbrida multimodelo basada en roles con gobernanza activa y alertas de costos en tiempo real. |
| **Seguridad** | Restricción total: los agentes IDE no tienen credenciales ni acceso a la base de datos de producción. | Acceso limitado del agente a la producción a través de servidores MCP con autenticación explícita y límites de alcance. | Sandbox completo para herramientas de código y registro de auditoría inmutable para cada llamada de herramienta, lo que garantiza una trazabilidad total. |
## Objective Criteria per Level (Certification)
Para certificar que su producto pertenece a un nivel específico, el equipo debe presentar la siguiente evidencia a la auditoría de arquitectura:
### Evidence Required for Level 1:
- [] Existencia del archivo `.husky/pre-commit` (o equivalente) que valida la sintaxis del código generado.
- [] Archivo `AGENTS.md` actualizado en los últimos 30 días.
### Evidence Required for Level 2:
- [] Esquema JSON del catálogo de herramientas publicado en la wiki del equipo.
- [] Registros de CI que demuestran la ejecución de conjuntos de pruebas que invocan simulacros de modelos.
- [] El documento firmado que confirma que el backend no expone la PII no tokenizada al LLM.
### Evidence Required for Level 3:
- [] Panel de costos de tokens desglosado por agente/función.
- [] Demostración física del interruptor "Human-in-the-Loop" que bloquea una transacción simulada.
- [] Diagrama de arquitectura multiagente aprobado por el comité.

---
[Volver al índice](./README.md)