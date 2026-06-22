# Índice Antigravity & Gemini Harness

Punto de entrada maestro para la orquestación de contexto de agentes de IA.

## Arquitectura de Carga de Contexto
Para minimizar el uso de tokens, cargue solo los documentos específicos necesarios para el alcance activo:

- **/rules**: Reglas de gobernanza vinculantes. Lea `global-rules.md` al iniciar.
- **/agents**: Personas de agente y especificaciones de alcance.
- **/standards**: Líneas base de formato, arquitectura y documentación.
- **/playbooks**: Flujos de trabajo estructurados para tareas recurrentes de ingeniería y devops.
- **/templates**: Planillas vacías para historias de usuario, ADRs y especificaciones.
- **/adr**: Registros de decisiones arquitectónicas específicas del Harness.

## Cumplimiento Normativo
Antes de ejecutar tareas, los agentes deben resolver:
1. `ai-harness/.antigravityignore` (Límites de exclusión).
2. `ai-harness/rules/global-rules.md` (Límites de ejecución).
