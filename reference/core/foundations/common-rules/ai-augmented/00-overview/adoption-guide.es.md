# Adoption Guide: AI-Augmented Architecture Models


---

## Adoption Levels

### Level 1 - AI-Assisted (Development Assisted)
El equipo adopta la IA estrictamente como acelerador en el proceso de construcción del software. El producto final no sufre alteraciones lógicas.
* **Impacto arquitectónico:** Cero.
* **Características:** Uso de Claude Code, Copilot o agentes terminales. Mantienen un archivo `AGENTS.md` en el repositorio como recurso mínimo.
* **Enfoque:** Incrementar la experiencia del desarrollador (DX).
### Level 2 - AI-Integrated (Functional Integrated)
El producto incorpora la capacidad de consultar modelos de lenguaje para enriquecer funcionalidades específicas y predecibles.
* **Impacto en la Arquitectura:** Medio (Invocaciones a servicios de inferencia externos).
* **Características:** Las llamadas estructuradas a LLM se implementan para clasificación de tickets, extracción de datos estructurados o resumen automático. Uso de MCP para estandarizar cómo los agentes internos consumen datos corporativos.
* **Enfoque:** Automatización de tareas cognitivas de bajo riesgo.
### Level 3 - AI-Orchestrated (Autonomous Orchestration)
El producto está liderado por un ciclo agente dinámico capaz de tomar decisiones y ejecutar planes de varios pasos.
* **Impacto en la arquitectura:** Alto (Marcos agenticos y máquinas de estados complejos).
* **Características:** Agentes autónomos que utilizan un catálogo de herramientas sólido. Emplea patrones de múltiples agentes, razonamiento recursivo y orquestadores deterministas con validaciones Human-in-the-Loop integradas.
* **Enfoque:** Autonomía operativa supervisada.

---
## Level Upgrade Criteria
Para avanzar al siguiente nivel de madurez, el equipo de arquitectura del producto debe validar:

1. **De L1 a L2**: 
 - Cobertura de pruebas unitarias > 70% en el dominio afectado.
 - Definición clara del caso de uso (evitando LLM como un martillo para todo).
 - Estimación inicial de token/coste registrada y validada.
2. **De L2 a L3**:
 - Implementada auditoría/trazabilidad de registros de llamadas LLM.
 - Flujo de trabajo funcional Human-in-the-Loop para acciones destructivas o financieras.
 - Definiciones de herramientas con 90% de idempotencia comprobada.
## General Prerequisites Checklist
Antes de iniciar cualquier iniciativa de agencia (incluso el Nivel 1):
- [] Tener un repositorio git con reglas de protección de sucursales.
- [] Automatizar linters y verificación de tipos en el ciclo de CI.
- [] Tener permisos corporativos autorizados para el uso del modelo (DPA firmado).
- [] Cree el archivo de arnés inicial `AGENTS.md` basado en el estándar corporativo.

---
[Volver al índice](./README.md)