# ADR-AI-004: AGENTS.md as mandatory artifact in projects adopting level 1+


---

## Context
Los agentes de inteligencia artificial que ingresan a un repositorio carecen de memoria histórica de una sesión a otra. Sin un contexto explícito, redescubren el entorno en cada sesión, adivinan comandos de prueba/lint y, a menudo, violan las convenciones de estilo del equipo, lo que causa frustración entre los desarrolladores que deben arreglar su código ("limpiar el desorden de la IA").
## Decision
Cualquier proyecto que adopte el nivel 1 de aumento de IA (asistido por IA) o superior DEBE crear y mantener un archivo `AGENTS.md` en el directorio raíz del proyecto/espacio de trabajo, siguiendo estrictamente la estructura corporativa definida en `01-harness-engineering/agents-md-standard.md`.
## Consequences
* **Reducción drástica de las alucinaciones iniciales:** El agente sabe exactamente cómo compilar y qué convenciones seguir desde el primer turno de conversación.
* **Incorporación automática de IA:** Facilita el uso fluido de múltiples herramientas CLI de agentes (Claude, Aider, Mentat).
* **Mantenimiento:** Los humanos deben recordar actualizar `AGENTS.md` si cambian un comando de prueba crítico, o corren el riesgo de desorientar al agente. Se recomienda agregar una regla dentro del archivo que le recuerde al Agente que lo actualice ante cambios arquitectónicos.

---
[Volver al índice](./README.md)