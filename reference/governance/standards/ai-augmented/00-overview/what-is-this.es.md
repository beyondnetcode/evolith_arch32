# What is this section and how to use it


---

## Fundamental Difference: AI as a Tool vs AI as a Component
Es crucial distinguir entre dos formas de incorporar la Inteligencia Artificial a nuestro ecosistema:

1. **IA como herramienta de desarrollo:** El uso de copilotos (GitHub Copilot, Claude Code) durante el ciclo de vida del software para acelerar la escritura, refactorización o depuración del código. No se requieren cambios en la arquitectura del producto.
2. **IA Integrada en el Producto:** Cuando el producto incorpora agentes, llamadas de modelos o flujos de agentes para resolver problemas de negocio en tiempo de ejecución. Esto requiere una estricta supervisión arquitectónica.
## Why Harness Engineering Matters More Than the Model
A menudo se supone que la inteligencia de una solución agente depende 100% del modelo elegido. Los datos empíricos muestran lo contrario:

* **Caso LangChain:** Se logró mejorar el rendimiento del agente de **52,8% a 66,5%** únicamente cambiando el arnés, sin modificar el modelo subyacente.
* **Caso Can.ac (Hashline Benchmark, 2026):** Un investigador logró un aumento en la tasa de éxito del **6,7 % al 68,3 %** estrictamente alterando el formato de edición y validación proporcionado por el arnés.

El **arnés** es el entorno seguro y estructurado que le damos al modelo para operar: herramientas bien descritas, reglas claras, contextos acotados y sistemas de validación automatizados.
## The Evolution of Engineering with AI
El enfoque de la industria ha madurado rápidamente hacia entornos más deterministas:

| Fase | Periodo | Enfoque primario | Descripción |
| :--- | :--- | :--- | :--- |
| **Ingeniería rápida** | 20222024 | Instrucciones de optimización | "Preguntar bien" para obtener una respuesta aceptable en formato de texto. |
| **Ingeniería de contexto** | 2025 | Creación de ventanas contextuales | Uso de RAG, memoria dinámica y MCP para proporcionar los datos correctos en el momento adecuado. |
| **Ingeniería de arneses** | 2026 | Diseño del entorno de ejecución | Definición de restricciones arquitectónicas, ganchos de verificación, permisos y bucles de control deterministas. |
## When NOT to Adopt this Section
No todos los proyectos se benefician de la integración agente. Se desaconseja la adopción de esta arquitectura aumentada en los siguientes escenarios:

* **Equipos sin madurez base:** Si el equipo no ha implementado una pirámide de pruebas sólida, CI/CD o una arquitectura limpia, la IA multiplicará exponencialmente la deuda técnica.
* **Productos MVP no validados:** Los costos y la latencia de los flujos agentes generalmente ralentizan el ciclo inicial de validación del mercado.
* **Sistemas ultracríticos sin supervisión:** Operaciones o decisiones estrictas en tiempo real que afectan directamente vidas humanas sin un punto de control determinista o supervisión humana (Human-in-the-loop).

---
[Volver al índice](./README.md)