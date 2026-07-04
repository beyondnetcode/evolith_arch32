# Harness Recommendations by Runtime


---

## Node.js / TypeScript
El ecosistema JavaScript es el más maduro en marcos de soporte agente gracias a su asincronía y dinamismo naturales.

* **Marcos de arnés recomendados:**
 * **Vercel AI SDK:** Estándar para transmisión rápida y salida estructurada.
 * **LangChain.js/LangGraph:** Para flujos de gráficos de estado complejos.
 * **Mastra:** Recomendado para crear microagentes locales livianos con llamadas de herramientas optimizadas.
* **Llamada de herramientas:** Utilice el esquema JSON a través de Zod para definir las interfaces de entrada de la herramienta, garantizando una escritura segura (Type-Safety) desde el modelo hasta la ejecución del código.
* **Integración de AGENTS.md:** Consuma a través de Nx o scripts nativos de NPM.
* **Gobernanza:** Integración nativa con Husky para verificaciones instantáneas previas al compromiso.

---
## .NET / C#
El entorno .NET destaca por su robustez escrita y rendimiento en procesos en segundo plano de larga duración con supervisión agente.

* **Marcos de arnés recomendados:** 
 * **Microsoft Semantic Kernel:** La opción corporativa canónica para integrar modelos con código C# nativo.
 * **Microsoft AutoGen:** Para simulaciones experimentales de múltiples agentes.
* **Llamadas a herramientas:** Utilización de C# Reflection nativo y anotaciones/atributos (`[KernelFunction]`) para exponer métodos de dominio directamente al modelo sin envoltorios pesados.
* **Casos de uso típicos:** Procesamiento por lotes de archivos complejos, extracción de entidades en flujos heredados y validación inteligente de datos.
* **Ganchos:** Integración estricta con `dotnet test` y Roslyn Analyzers durante el compromiso previo.

---
## Android / Kotlin
El papel de la IA en los dispositivos móviles está limitado por el consumo de batería, la memoria y la latencia.

* **Alcance limitado:** los agentes de Android normalmente deben diseñarse como **clientes** que solicitan la orquestación de un agente robusto alojado en el backend. Se desaconsejan los bucles agentes recursivos y complejos en tiempo de ejecución local.
* **SDK recomendados:**
 * **Google AI SDK para Android:** Para inferencia directa con Gemini en tareas rápidas.
 * **Firebase Genkit:** Integración simplificada si el ecosistema de Firebase ya está implementado.
* **Casos de uso:**
 * UI generativa dinámica basada en el estado actual de la aplicación.
 * Asistentes de ayuda contextual sin conexión (si se utilizan AICore o modelos pequeños en el dispositivo).
 * Extracción de datos estructurados a partir de imágenes locales (OCR inteligente).

---
[Volver al índice](./README.md)