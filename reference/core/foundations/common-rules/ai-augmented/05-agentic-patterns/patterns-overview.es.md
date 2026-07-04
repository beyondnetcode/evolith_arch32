# Patterns Overview: Agentic Pattern Catalog


---

## When do you need an agent?
No todos los problemas de LLM requieren un bucle agente autónomo. Si la tarea se puede resolver en una única llamada directa al modelo (finalización de una sola vez), **no utilice un agente**. Los agentes añaden latencia, costo computacional y no determinismo que sólo se justifica si existe una exploración dinámica del problema.

Utilice agentes cuando el resultado del Paso 1 condicione lo que debería ser el Paso 2 y el árbol de decisión sea demasiado grande para programarlo con código determinista tradicional.
## Available Patterns Matrix
| Patrón | Caso de uso canónico | Complejidad | Humano en bucle |
| :--- | :--- | :--- | :--- |
| **Agente único** | Tarea limitada (por ejemplo, generar un archivo Léame, corregir un error sintáctico específico) con herramientas limitadas. | Bajo | Opcional |
| **Planificar y ejecutar** | Tareas que requieren secuencialidad lógica garantizada (por ejemplo, refactorizar 5 archivos en estricto orden). | Medio | Recomendado |
| **Multiagente** | Sistemas donde convergen múltiples dominios de experiencia (por ejemplo, Agente Arquitecto + Agente de Control de Calidad + Agente de Ciberseguridad). | Alto | Obligatorio |
| **Humano en el circuito** | Decisiones operativas que modifican el mundo real con consecuencias legales, financieras o físicas. | Variables | Obligatorio |
## The Boris Tane Principle
Adoptamos la directiva de Boris Tane como ley arquitectónica interna:

> **"Separar la planificación de la ejecución es la decisión arquitectónica más importante que tomará en su agente."**

Cuando permitimos que un agente planifique y ejecute paso a paso sin control intermedio, el agente "olvida" el plan original a mitad de camino. Separar el Planificador del Ejecutor nos permite validar la ruta ANTES de que el sistema gaste dinero y tiempo en una ejecución defectuosa.

---
[Volver al índice](./README.md)